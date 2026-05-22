import EnchantRecord from './EnchantRecord.js';
import PropertyManager from './PropertyManager.js';
import EquipmentType from './EquipmentType.js';
import { calPostEnchantmentPotentialChanges } from './PotentialCalculator.js';
import { calSingleSuccessRate, calExpectedSuccessRate } from './SuccessCalculator.js';
import { calEnchantmentStepMaterialCost } from './MaterialCalculator.js';
import { calAttrMaxLimit, calAttrMinLimit } from './PotentialCalculator.js';

const PM = new PropertyManager();

/**
 * 附魔优化器
 * 
 * 输入目标属性及基础配置，自动搜索最优附魔方案。
 * 输出为 EnchantRecord 类型的附魔记录，包含所有附魔步骤。
 * 
 * ===== 输入 =====
 * 
 * 1. config (Object) - 基础配置，与 EnchantRecord 构造参数完全一致：
 *    {
 *        equipmentType: EquipmentType,          // 装备类型
 *        playerLevel: number,                   // 玩家等级（默认300）
 *        equipmentPotential: number,            // 装备潜力值
 *        baseEquipmentPotential: number,        // 装备基础潜力值
 *        smithingLevel: number,                 // 锻冶熟练度
 *        anvilLevel: number,                    // 铁砧技能等级（默认40）
 *        masterEnhancement2Level: number,       // 大师级强化技术2（默认10）
 *        understandingSkills: {                 // 理解技能等级
 *            metal: number,
 *            cloth: number,
 *            beast: number,
 *            wood: number,
 *            medicine: number,
 *            mana: number
 *        },
 *        selectedProperties: Array,             // 已选属性列表（保持顺序）
 *        name: string                           // 附魔名称
 *    }
 * 
 * 2. targetProperties (Object) - 目标属性，格式与 EnchantRecord.finalProperties 一致：
 *    { propertyId: targetValue, ... }
 *    例如: { "ATK_0": 7, "STR_0": 7, "CD_0": 7, "CR_0": 7 }
 *    注意：未指定的属性默认为0
 * 
 * 3. options (Object) - 搜索选项：
 *    {
 *        strategy: 'greedy' | 'branch_bound',  // 搜索策略
 *        maxSteps: number,                      // 最大步骤数限制
 *        timeout: number                        // 搜索超时时间(ms)
 *    }
 * 
 * ===== 输出 =====
 * 
 * EnchantRecord 实例，包含：
 *   - 所有基础配置（equipmentType, playerLevel 等）
 *   - enchantmentSteps: 所有附魔步骤（每步包含属性、值、潜力变化、成功率、材料消耗等完整计算数据）
 *   - finalProperties: 最终属性值
 *   - finalRemainingPotential: 最终剩余潜力
 *   - finalSingleSuccessRate: 最终单条成功率
 *   - finalExpectedSuccessRate: 最终期望成功率
 *   - finalTotalMaterialCosts: 最终总材料消耗
 * 
 * ===== 使用示例 =====
 * 
 * const optimizer = new EnchantOptimizer({
 *     equipmentType: EquipmentType.EQUIPMENT_TYPE_WEAPON,
 *     equipmentPotential: 100,
 *     baseEquipmentPotential: 1,
 *     anvilLevel: 40,
 *     selectedProperties: [PM.properties["ATK_0"], PM.properties["STR_0"]]
 * });
 * 
 * const result = optimizer.findOptimal(
 *     { "ATK_0": 7, "STR_0": 7 },
 *     { timeout: 5000 }
 * );
 * 
 * // result 为 EnchantRecord 实例，可直接用于 UI 展示
 */
export default class EnchantOptimizer {
    /**
     * @param {Object} config - 基础配置（与 EnchantRecord 构造参数一致）
     * @param {Object} config.equipmentType - 装备类型 (EquipmentType.EQUIPMENT_TYPE_WEAPON 或 EquipmentType.EQUIPMENT_TYPE_ARMOR)
     * @param {number} [config.playerLevel=300] - 玩家等级
     * @param {number} [config.equipmentPotential=100] - 装备潜力值
     * @param {number} [config.baseEquipmentPotential=1] - 装备基础潜力值
     * @param {number} [config.smithingLevel=0] - 玩家锻冶熟练度
     * @param {number} [config.anvilLevel=40] - 铁砧技能等级
     * @param {number} [config.masterEnhancement2Level=10] - 大师级强化技术2技能等级
     * @param {Object} config.understandingSkills - 玩家理解技能等级对象
     * @param {number} [config.understandingSkills.metal=0] - 理解金属技能等级
     * @param {number} [config.understandingSkills.cloth=0] - 理解布料技能等级
     * @param {number} [config.understandingSkills.beast=0] - 理解兽品技能等级
     * @param {number} [config.understandingSkills.wood=0] - 理解木材技能等级
     * @param {number} [config.understandingSkills.medicine=0] - 理解药品技能等级
     * @param {number} [config.understandingSkills.mana=0] - 理解魔素技能等级
     * @param {Array} [config.selectedProperties=[]] - 选中的属性数组，保持选择顺序
     * @param {string} [config.name="自定义附魔1"] - 附魔名称
     */
    constructor(config = {}) {
        // 基础信息
        this.config = config;
        this.equipmentType = config.equipmentType ?? EquipmentType.EQUIPMENT_TYPE_WEAPON; // 装备类型
        this.playerLevel = config.playerLevel ?? 300; // 玩家等级，默认300
        this.equipmentPotential = config.equipmentPotential ?? 100; // 装备潜力值
        this.baseEquipmentPotential = config.baseEquipmentPotential ?? 1; // 装备基础潜力值
        this.masterEnhancement2Level = config.masterEnhancement2Level ?? 10; // 大师级强化技术2技能等级，默认为10
    }

    /**
     * 搜索最优附魔方案
     * 
     * @param {Object} targetProperties - 目标属性 { propertyId: targetValue, ... }
     *        格式与 EnchantRecord.finalProperties 一致，未指定的属性默认为0
     * @param {number} [options.timeout=5000] - 搜索超时时间(ms)
     * @returns {EnchantRecord} 包含所有附魔步骤的 EnchantRecord 实例
     */
    findOptimal(targetProperties, options = {}) {
        const timeout = options.timeout ?? 5000;
        // 根据策略选择搜索方法
        let steps;
        steps = this._Search(targetProperties, timeout);
        // 将步骤序列写入 EnchantRecord
        return this._buildEnchantRecord(steps);
    }


    /**
     * 搜索策略
     * TODO: 
     * 
     * @private
     */
    _Search(targetProperties, timeout) {
        throw new Error('搜索算法尚未实现');
    }

    /**
     * 将步骤序列构建为 EnchantRecord
     * 
     * @param {Array} steps - 步骤数组，每项格式为 { property, value, stepData? }
     * @returns {EnchantRecord}
     * @private
     */
    _buildEnchantRecord(steps) {
        const record = new EnchantRecord(this.config);

        // 设置选中的属性
        const selectedProperties = [];
        for (const step of steps) {
            if (step.property && !selectedProperties.some(p => p.id === step.property.id)) {
                selectedProperties.push(step.property);
            }
        }
        record.setSelectedProperties(selectedProperties);

        // 添加步骤
        for (const step of steps) {
            if (step.stepData) {
                // 如果已经有计算好的步骤数据，直接添加
                record.addEnchantmentStep({
                    enchantments: step.stepData.enchantments,
                    isIgnored: step.stepData.isIgnored
                });
            } else {
                // 否则创建新的步骤
                record.addEnchantmentStep({
                    enchantments: [{
                        property: step.property,
                        value: step.value
                    }]
                });
            }
        }

        return record;
    }
}
