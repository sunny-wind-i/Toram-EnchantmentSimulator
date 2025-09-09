import PropertyManager from './PropertyManager.js';
import EquipmentType from './EquipmentType.js';
import { calPostEnchantmentPotential } from './PotentialCalculator.js';
import { calSingleSuccessRate, calExpectedSuccessRate } from './SuccessCalculator.js';
import { calEnchantmentStepMaterialCost } from './MaterialCalculator.js';

/**
 * 附魔模拟类，用于管理整个附魔过程的数据结构
 * 包括装备基本信息、玩家信息以及每一步附魔操作记录
 */

const PM = new PropertyManager();

export default class EnchantRecord {
    /**
     * 创建一个新的附魔模拟实例
     * @param {Object} config - 配置对象
     * @param {Object} config.equipmentType - 装备类型 (EquipmentType.EQUIPMENT_TYPE_WEAPON 或 EquipmentType.EQUIPMENT_TYPE_ARMOR)
     * @param {number} config.playerLevel - 玩家等级
     * @param {number} config.equipmentPotential - 装备潜力值
     * @param {number} config.baseEquipmentPotential - 装备基础潜力值
     * @param {number} config.smithingLevel - 玩家锻冶熟练度
     * @param {number} config.anvilLevel - 铁砧技能等级，默认为40
     * @param {Object} config.understandingSkills - 玩家理解技能等级对象
     * @param {number} config.understandingSkills.metal - 理解金属技能等级
     * @param {number} config.understandingSkills.cloth - 理解布料技能等级
     * @param {number} config.understandingSkills.beast - 理解兽品技能等级
     * @param {number} config.understandingSkills.wood - 理解木材技能等级
     * @param {number} config.understandingSkills.medicine - 理解药品技能等级
     * @param {number} config.understandingSkills.mana - 理解魔素技能等级
     */
    constructor(config = {}) {
        // 基础信息（只出现一次的固定数据）
        this.equipmentType = config.equipmentType || EquipmentType.EQUIPMENT_TYPE_WEAPON; // 装备类型
        this.playerLevel = config.playerLevel || 290; // 玩家等级
        this.equipmentPotential = config.equipmentPotential || 0; // 装备潜力值
        this.baseEquipmentPotential = config.baseEquipmentPotential || 1; // 装备基础潜力值
        this.smithingLevel = config.smithingLevel || 0; // 玩家锻冶熟练度
        this.anvilLevel = config.anvilLevel || 40; // 铁砧技能等级，默认为40

        // 玩家"理解xx"技能等级（减少对应素材消耗量）
        this.understandingSkills = {
            metal: config.understandingSkills?.metal || 0,      // 理解金属
            cloth: config.understandingSkills?.cloth || 0,      // 理解布料
            beast: config.understandingSkills?.beast || 0,      // 理解兽品
            wood: config.understandingSkills?.wood || 0,        // 理解木材
            medicine: config.understandingSkills?.medicine || 0, // 理解药品
            mana: config.understandingSkills?.mana || 0         // 理解魔素
        };

        // 附魔操作步骤记录
        this.enchantmentSteps = [];

        // 初始化汇总信息
        this.finalTotalMaterialCosts = {
            metal: 0,
            cloth: 0,
            beast: 0,
            wood: 0,
            medicine: 0,
            mana: 0
        };
        this.finalRemainingPotential = this.equipmentPotential;
        this.finalSingleSuccessRate = -1;
        this.finalExpectedSuccessRate = this._calculateFinalExpectedSuccessRate();
    }

    /**
     * 添加一个附魔步骤
     * @param {Object} step - 附魔步骤对象
     * @param {string} step.id - 步骤ID（可选，自动生成）
     * @param {Array<Object>} step.enchantments - 该步骤的附魔属性数组
     * @param {Object} step.enchantments[].property - 属性对象
     * @param {string} step.enchantments[].propertyId - 属性ID（可选，如果提供了property则忽略此字段）
     * @param {number} step.enchantments[].value - 属性值变化量
     * @returns {string} 步骤ID
     */
    addEnchantmentStep(step) {
        // 生成步骤ID（如果未提供）
        const stepId = step.id || this._generateStepId();

        // 创建附魔步骤对象
        const enchantmentStep = {
            id: stepId,
            enchantments: step.enchantments.map(enchant => {
                // 如果提供了property对象，则直接使用；否则根据propertyId获取属性对象
                const property = enchant.property || PM.properties[enchant.propertyId];
                return {
                    property: property,
                    value: enchant.value
                };
            }),
            totalMaterialCosts: {
                metal: 0,
                cloth: 0,
                beast: 0,
                wood: 0,
                medicine: 0,
                mana: 0
            }
        };

        // 计算该步骤的材料消耗
        const materialCostsResult = calEnchantmentStepMaterialCost(
            enchantmentStep,
            this.enchantmentSteps.length > 0 ?
                this.enchantmentSteps[this.enchantmentSteps.length - 1].currentProperties :
                this.getCurrentProperties(),
            this.smithingLevel,
            this.understandingSkills
        );

        // 提取总材料消耗
        const materialCosts = materialCostsResult.total;

        // 提取每条属性的材料消耗
        const perPropertyMaterialCosts = materialCostsResult.perProperty;

        // 计算该步骤附魔前的潜力值
        const preEnchantmentPotential = this.enchantmentSteps.length > 0 ?
            this.enchantmentSteps[this.enchantmentSteps.length - 1].postEnchantmentPotential :
            this.equipmentPotential;

        // 获取当前属性值和已附魔属性
        const currentProperties = this.enchantmentSteps.length > 0 ?
            this.enchantmentSteps[this.enchantmentSteps.length - 1].currentProperties :
            this.getCurrentProperties();
        const enchantedProperties = this.enchantmentSteps.length > 0 ?
            this.enchantmentSteps[this.enchantmentSteps.length - 1].enchantedProperties :
            this.getEnchantedProperties();

        // 计算该步骤附魔后的潜力值和潜力变化值
        const potentialResult = calPostEnchantmentPotential(
            enchantmentStep,
            currentProperties,
            Object.keys(enchantedProperties).filter(key => enchantedProperties[key]),
            preEnchantmentPotential,
            this.equipmentType
        );

        const postEnchantmentPotential = potentialResult.postEnchantmentPotential;
        const potentialChange = potentialResult.potentialChange;
        const multiplier = potentialResult.multiplier; // 从计算结果中获取倍率

        // 计算该步骤每条属性对潜力值的变化
        const propertyPotentialChanges = this._calculatePropertyPotentialChanges(
            enchantmentStep,
            preEnchantmentPotential,
            this.equipmentType
        );

        // 计算成功率
        const singleSuccessRate = calSingleSuccessRate(
            preEnchantmentPotential,
            postEnchantmentPotential,
            this.baseEquipmentPotential
        );

        // 计算期望成功率（暂时为空函数）
        const expectedSingleSuccessRate = calExpectedSuccessRate(
            singleSuccessRate,
            enchantmentStep
        );

        // 完善附魔步骤对象，添加材料消耗、潜力值变化等信息
        enchantmentStep.materialCosts = materialCosts;
        enchantmentStep.perPropertyMaterialCosts = perPropertyMaterialCosts;
        enchantmentStep.postEnchantmentPotential = postEnchantmentPotential;
        enchantmentStep.propertyPotentialChanges = propertyPotentialChanges;
        enchantmentStep.potentialChange = potentialChange;
        enchantmentStep.multiplier = multiplier;
        enchantmentStep.singleSuccessRate = singleSuccessRate;
        enchantmentStep.expectedSingleSuccessRate = expectedSingleSuccessRate;

        // 将步骤添加到记录中
        this.enchantmentSteps.push(enchantmentStep);
        // 更新当前属性值
        this._updateCurrentProperties();
        // 更新总材料消耗等汇总信息
        this._updateSummaryInfo();
        return stepId;
    }

    /**
     * 更新指定步骤
     * @param {string} stepId - 步骤ID
     * @param {Object} updatedStep - 更新后的步骤对象
     */
    updateEnchantmentStep(stepId, updatedStep) {
        // 查找要更新的步骤索引
        const stepIndex = this.enchantmentSteps.findIndex(step => step.id === stepId);
        if (stepIndex !== -1) {
            // 更新步骤数据
            this.enchantmentSteps[stepIndex] = {
                id: stepId,
                enchantments: updatedStep.enchantments.map(enchant => {
                    // 如果提供了property对象，则直接使用；否则根据propertyId获取属性对象
                    const property = enchant.property || PM.properties[enchant.propertyId];
                    return {
                        property: property,
                        value: enchant.value
                    };
                }),
                totalMaterialCosts: {
                    metal: 0,
                    cloth: 0,
                    beast: 0,
                    wood: 0,
                    medicine: 0,
                    mana: 0
                }
            };

            // 重新计算所有后续步骤
            this._recalculateStepsFrom(stepIndex);
        }
    }

    /**
     * 从指定步骤开始重新计算所有后续步骤
     * @private
     * @param {number} startIndex - 开始重新计算的步骤索引
     */
    _recalculateStepsFrom(startIndex) {
        // 保存当前附魔步骤（不包括计算结果）
        const steps = this.enchantmentSteps.map(step => ({
            id: step.id,
            enchantments: step.enchantments.map(enchant => ({
                property: enchant.property,
                value: enchant.value
            }))
        }));

        // 清除当前所有步骤
        this.enchantmentSteps = [];

        // 重新添加每个步骤，触发重新计算
        for (let i = 0; i <= startIndex; i++) {
            this.addEnchantmentStep(steps[i]);
        }

        // 更新每个步骤中的累计材料消耗
        for (let i = 0; i < this.enchantmentSteps.length; i++) {
            // 初始化当前步骤的总材料消耗
            this.enchantmentSteps[i].totalMaterialCosts = {
                metal: 0,
                cloth: 0,
                beast: 0,
                wood: 0,
                medicine: 0,
                mana: 0
            };

            // 如果是第一步，直接使用当前步骤的材料消耗
            if (i === 0) {
                this.enchantmentSteps[i].totalMaterialCosts.metal = this.enchantmentSteps[i].materialCosts?.metal || 0;
                this.enchantmentSteps[i].totalMaterialCosts.cloth = this.enchantmentSteps[i].materialCosts?.cloth || 0;
                this.enchantmentSteps[i].totalMaterialCosts.beast = this.enchantmentSteps[i].materialCosts?.beast || 0;
                this.enchantmentSteps[i].totalMaterialCosts.wood = this.enchantmentSteps[i].materialCosts?.wood || 0;
                this.enchantmentSteps[i].totalMaterialCosts.medicine = this.enchantmentSteps[i].materialCosts?.medicine || 0;
                this.enchantmentSteps[i].totalMaterialCosts.mana = this.enchantmentSteps[i].materialCosts?.mana || 0;
            } else {
                // 否则，累加上一步的总材料消耗和当前步骤的材料消耗
                this.enchantmentSteps[i].totalMaterialCosts.metal =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.metal || 0) +
                    (this.enchantmentSteps[i].materialCosts?.metal || 0);

                this.enchantmentSteps[i].totalMaterialCosts.cloth =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.cloth || 0) +
                    (this.enchantmentSteps[i].materialCosts?.cloth || 0);

                this.enchantmentSteps[i].totalMaterialCosts.beast =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.beast || 0) +
                    (this.enchantmentSteps[i].materialCosts?.beast || 0);

                this.enchantmentSteps[i].totalMaterialCosts.wood =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.wood || 0) +
                    (this.enchantmentSteps[i].materialCosts?.wood || 0);

                this.enchantmentSteps[i].totalMaterialCosts.medicine =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.medicine || 0) +
                    (this.enchantmentSteps[i].materialCosts?.medicine || 0);

                this.enchantmentSteps[i].totalMaterialCosts.mana =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.mana || 0) +
                    (this.enchantmentSteps[i].materialCosts?.mana || 0);
            }
        }

        // 更新汇总信息
        this._updateSummaryInfo();
    }

    /**
     * 删除指定步骤
     * @param {string} stepId - 步骤ID
     */
    removeEnchantmentStep(stepId) {
        // 查找要删除的步骤索引
        const stepIndex = this.enchantmentSteps.findIndex(step => step.id === stepId);
        if (stepIndex !== -1) {
            // 从数组中删除该步骤
            this.enchantmentSteps.splice(stepIndex, 1);
            // 更新当前属性值
            this._updateCurrentProperties();
        }
    }

    /**
     * 获取装备类型
     * @returns {Object} 装备类型对象
     */
    getEquipmentType() {
        return this.equipmentType;
    }

    /**
     * 设置装备类型
     * @param {Object} equipmentType - 装备类型对象 (EquipmentType.EQUIPMENT_TYPE_WEAPON 或 EquipmentType.EQUIPMENT_TYPE_ARMOR)
     */
    setEquipmentType(equipmentType) {
        this.equipmentType = equipmentType;
    }

    /**
     * 从JSON对象导入模拟数据
     * @param {Object} data - 导入的数据对象
     */
    importData(data) {
        // 导入基础信息
        // 根据装备类型的英文名称确定装备类型对象
        if (data.equipmentType === 'armor') {
            this.equipmentType = EquipmentType.EQUIPMENT_TYPE_ARMOR;
        } else {
            this.equipmentType = EquipmentType.EQUIPMENT_TYPE_WEAPON;
        }

        this.playerLevel = data.playerLevel || 1;
        this.equipmentPotential = data.equipmentPotential || 0;
        this.baseEquipmentPotential = data.baseEquipmentPotential || 0;
        this.smithingLevel = data.smithingLevel || 0;
        this.anvilLevel = data.anvilLevel || 40; // 导入铁砧技能等级，默认为40

        // 导入理解技能数据
        if (data.understandingSkills) {
            this.understandingSkills = { ...data.understandingSkills };
        }

        // 导入附魔步骤数据
        if (data.enchantmentSteps) {
            this.enchantmentSteps = data.enchantmentSteps.map(step => ({
                id: step.id,
                enchantments: step.enchantments.map(enchant => {
                    // 导入时根据属性ID获取属性对象
                    const property = PM.properties[enchant.propertyId];
                    return {
                        property: property,
                        value: enchant.value
                    };
                }).filter(enchant => enchant.property), // 过滤掉无效的属性
                materialCosts: step.materialCosts,
                perPropertyMaterialCosts: step.perPropertyMaterialCosts,
                postEnchantmentPotential: step.postEnchantmentPotential,
                propertyPotentialChanges: step.propertyPotentialChanges,
                potentialChange: step.potentialChange,
                multiplier: step.multiplier,
                singleSuccessRate: step.singleSuccessRate,
                expectedSingleSuccessRate: step.expectedSingleSuccessRate,
                totalMaterialCosts: step.totalMaterialCosts || {
                    metal: 0,
                    cloth: 0,
                    beast: 0,
                    wood: 0,
                    medicine: 0,
                    mana: 0
                }
            }));
        }

        // 导入汇总信息
        this.finalTotalMaterialCosts = data.finalTotalMaterialCosts || {
            metal: 0,
            cloth: 0,
            beast: 0,
            wood: 0,
            medicine: 0,
            mana: 0
        };
        this.finalRemainingPotential = data.finalRemainingPotential !== undefined ? data.finalRemainingPotential : this.equipmentPotential;
        this.finalSingleSuccessRate = data.finalSingleSuccessRate || 0;
        this.finalExpectedSingleSuccessRate = data.finalExpectedSingleSuccessRate || 0;

        // 重新计算所有步骤
        this._recalculateAllSteps();
    }

    /**
     * 导出模拟数据为JSON对象
     * @returns {Object} 可序列化的模拟数据对象
     */
    exportData() {
        // 返回包含所有必要数据的对象
        return {
            equipmentType: this.equipmentType.nameEnFull, // 导出时保存装备类型的英文名称
            playerLevel: this.playerLevel,
            equipmentPotential: this.equipmentPotential,
            baseEquipmentPotential: this.baseEquipmentPotential,
            smithingLevel: this.smithingLevel,
            anvilLevel: this.anvilLevel, // 导出铁砧技能等级
            understandingSkills: { ...this.understandingSkills },
            enchantmentSteps: this.enchantmentSteps.map(step => ({
                id: step.id,
                enchantments: step.enchantments.map(enchant => ({
                    // 导出时保存属性ID而不是对象
                    propertyId: enchant.property?.id,
                    value: enchant.value
                })).filter(enchant => enchant.propertyId), // 过滤掉无效的属性
                materialCosts: step.materialCosts,
                perPropertyMaterialCosts: step.perPropertyMaterialCosts,
                postEnchantmentPotential: step.postEnchantmentPotential,
                propertyPotentialChanges: step.propertyPotentialChanges,
                potentialChange: step.potentialChange,
                multiplier: step.multiplier,
                singleSuccessRate: step.singleSuccessRate,
                expectedSingleSuccessRate: step.expectedSingleSuccessRate,
                totalMaterialCosts: step.totalMaterialCosts
            })),
            // 导出汇总信息
            finalTotalMaterialCosts: this.finalTotalMaterialCosts,
            finalRemainingPotential: this.finalRemainingPotential,
            finalSingleSuccessRate: this.finalSingleSuccessRate,
            finalExpectedSingleSuccessRate: this.finalExpectedSingleSuccessRate
        };
    }

    /**
     * 生成步骤ID
     * @private
     * @returns {string} 唯一的步骤ID
     */
    _generateStepId() {
        // 基于时间戳和随机数生成唯一ID
        return 'step_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }

    /**
     * 计算每条属性对潜力值的变化
     * @private
     * @param {Object} enchantmentStep - 附魔步骤对象
     * @param {number} preEnchantmentPotential - 附魔前潜力值
     * @param {Object} equipmentType - 装备类型
     * @returns {Object} 每条属性对潜力值的变化
     */
    _calculatePropertyPotentialChanges(enchantmentStep, preEnchantmentPotential, equipmentType) {
        const propertyChanges = {};

        // 直接使用附魔步骤中已计算的倍率
        const multiplier = enchantmentStep.multiplier;

        // 计算每条属性的潜力变化
        for (const enchantment of enchantmentStep.enchantments) {
            const { property, value } = enchantment;

            if (!property || value === 0) continue;

            const preValue = (this.enchantmentSteps.length > 0 ?
                this.enchantmentSteps[this.enchantmentSteps.length - 1].currentProperties :
                this.getCurrentProperties())[property.id] || 0;
            const postValue = preValue + value;

            let potentialChange = 0;

            // 根据属性值变化情况计算潜力变化
            if (postValue > preValue) {
                // 属性值增加，消耗潜力
                const cost = this._calculateIncreasePotentialCost(property, preValue, postValue, equipmentType);
                potentialChange = -cost;
            } else if (postValue < preValue) {
                // 属性值减少，获得潜力
                const gain = this._calculateDecreasePotentialGain(property, preValue, postValue, equipmentType);
                potentialChange = gain;
            }

            // 应用倍率
            potentialChange = Math.trunc(potentialChange * multiplier);

            propertyChanges[property.id] = potentialChange;
        }

        return propertyChanges;
    }

    /**
     * 计算属性增加值消耗的潜力（简化版）
     * @private
     * @param {Object} property - 属性对象
     * @param {number} preValue - 附魔前属性值
     * @param {number} postValue - 附魔后属性值
     * @param {Object} equipmentType - 装备类型
     * @returns {number} 消耗的潜力值
     */
    _calculateIncreasePotentialCost(property, preValue, postValue, equipmentType) {
        // 检查是否需要双倍耗潜
        const isDoublePotential = (equipmentType === EquipmentType.EQUIPMENT_TYPE_WEAPON && property.isWeaponDoublePotential) ||
            (equipmentType === EquipmentType.EQUIPMENT_TYPE_ARMOR && property.isArmorDoublePotential);

        let cost = 0;

        // 如果衰减阈值为null，则不考虑衰减
        if (property.attenuationThreshold === null) {
            cost = (postValue - preValue) * property.basePotentialCost;
        } else {
            // 衰减阈值逻辑：只有超过正的衰减阈值部分，需要额外消耗潜力
            // 分别计算附魔前和附魔后在衰减阈值内外的部分

            // 附魔前部分消耗
            if (preValue <= property.attenuationThreshold) {
                // 附魔前值在衰减阈值内
                if (postValue <= property.attenuationThreshold) {
                    // 附魔后值也在衰减阈值内，全部是正常消耗
                    cost = (postValue - preValue) * property.basePotentialCost;
                } else {
                    // 附魔后值超过衰减阈值，分段计算
                    const normalPart = property.attenuationThreshold - preValue;
                    const extraPart = postValue - property.attenuationThreshold;
                    cost = normalPart * property.basePotentialCost + extraPart * property.basePotentialCost * 2;
                }
            } else {
                // 附魔前值已经超过衰减阈值，全部是额外消耗
                cost = (postValue - preValue) * property.basePotentialCost * 2;
            }
        }

        // 应用双倍耗潜
        if (isDoublePotential) {
            cost *= 2;
        }

        // 去除小数部分（直接截断）
        return Math.trunc(cost);
    }

    /**
     * 计算属性减少值获得的潜力（简化版）
     * @private
     * @param {Object} property - 属性对象
     * @param {number} preValue - 附魔前属性值
     * @param {number} postValue - 附魔后属性值
     * @param {Object} equipmentType - 装备类型
     * @returns {number} 获得的潜力值
     */
    _calculateDecreasePotentialGain(property, preValue, postValue, equipmentType) {
        // 退潜倍率
        let gain = 0;

        // 检查是否需要双倍耗潜（负属性获得潜力翻倍）
        const isDoublePotential = (equipmentType === EquipmentType.EQUIPMENT_TYPE_WEAPON && property.isWeaponDoublePotential) ||
            (equipmentType === EquipmentType.EQUIPMENT_TYPE_ARMOR && property.isArmorDoublePotential);

        // 如果衰减阈值为null，则不考虑衰减
        if (property.attenuationThreshold === null) {
            gain = (preValue - postValue) * property.basePotentialCost * 0.305;
        } else {
            // 衰减阈值逻辑：只有小于负的衰减阈值时，超过部分获得的潜力值减半
            // 分别计算附魔前和附魔后在衰减阈值内外的部分

            // 附魔前部分获得
            if (preValue >= -property.attenuationThreshold) {
                // 附魔前值在衰减阈值内（>= -attenuationThreshold）
                if (postValue >= -property.attenuationThreshold) {
                    // 附魔后值也在衰减阈值内，全部是正常获得
                    gain = (preValue - postValue) * property.basePotentialCost * 0.305;
                } else {
                    // 附魔后值小于负的衰减阈值，分段计算
                    const normalPart = preValue - (-property.attenuationThreshold);
                    const extraPart = -property.attenuationThreshold - postValue;
                    gain = normalPart * property.basePotentialCost * 0.305 + extraPart * property.basePotentialCost * 0.305 * 0.5;
                }
            } else {
                // 附魔前值已经小于负的衰减阈值，全部是减半获得
                gain = (preValue - postValue) * property.basePotentialCost * 0.305 * 0.5;
            }
        }

        // 应用双倍耗潜（负属性获得潜力翻倍）
        if (isDoublePotential) {
            gain *= 2;
        }

        // 去除小数部分（直接截断）
        return Math.trunc(gain);
    }

    /**
     * 根据附魔步骤更新当前属性值
     * @private
     */
    _updateCurrentProperties() {
        // 如果没有步骤，不需要更新
        if (this.enchantmentSteps.length === 0) {
            // 更新汇总信息
            this._updateSummaryInfo();
            return;
        }

        // 重置属性值（仅用于第一步）
        const properties = PM.properties;
        const defaultProperties = {};
        const defaultEnchantedProperties = {};

        for (const propId in properties) {
            defaultProperties[propId] = 0;
            defaultEnchantedProperties[propId] = false;
        }

        // 处理每一步骤，基于前一步骤的结果进行计算
        for (let i = 0; i < this.enchantmentSteps.length; i++) {
            const step = this.enchantmentSteps[i];

            // 获取基准属性值（前一步的currentProperties）
            let currentProperties, enchantedProperties;
            if (i === 0) {
                // 第一步使用默认值
                currentProperties = { ...defaultProperties };
                enchantedProperties = { ...defaultEnchantedProperties };
            } else {
                // 后续步骤使用前一步的结果
                currentProperties = { ...this.enchantmentSteps[i - 1].currentProperties };
                enchantedProperties = { ...this.enchantmentSteps[i - 1].enchantedProperties };
            }

            // 应用当前步骤的附魔
            for (const enchantment of step.enchantments) {
                // 检查属性对象是否存在
                if (enchantment.property && currentProperties.hasOwnProperty(enchantment.property.id)) {
                    // 如果有附魔值变化，则标记该属性为已附魔
                    if (enchantment.value !== 0) {
                        enchantedProperties[enchantment.property.id] = true;
                    }

                    currentProperties[enchantment.property.id] += enchantment.value;
                }
            }

            // 更新步骤中的属性值和附魔历史
            step.currentProperties = currentProperties;
            step.enchantedProperties = enchantedProperties;
        }

        // 更新汇总信息
        this._updateSummaryInfo();
    }

    /**
     * 更新汇总信息（总材料消耗、最终剩余潜力值、最终单条成功率、最终期望成功率）
     * @private
     */
    _updateSummaryInfo() {
        // 更新每个步骤中的累计材料消耗
        for (let i = 0; i < this.enchantmentSteps.length; i++) {
            // 初始化当前步骤的总材料消耗
            this.enchantmentSteps[i].totalMaterialCosts = {
                metal: 0,
                cloth: 0,
                beast: 0,
                wood: 0,
                medicine: 0,
                mana: 0
            };

            // 如果是第一步，直接使用当前步骤的材料消耗
            if (i === 0) {
                this.enchantmentSteps[i].totalMaterialCosts.metal = this.enchantmentSteps[i].materialCosts?.metal || 0;
                this.enchantmentSteps[i].totalMaterialCosts.cloth = this.enchantmentSteps[i].materialCosts?.cloth || 0;
                this.enchantmentSteps[i].totalMaterialCosts.beast = this.enchantmentSteps[i].materialCosts?.beast || 0;
                this.enchantmentSteps[i].totalMaterialCosts.wood = this.enchantmentSteps[i].materialCosts?.wood || 0;
                this.enchantmentSteps[i].totalMaterialCosts.medicine = this.enchantmentSteps[i].materialCosts?.medicine || 0;
                this.enchantmentSteps[i].totalMaterialCosts.mana = this.enchantmentSteps[i].materialCosts?.mana || 0;
            } else {
                // 否则，累加上一步的总材料消耗和当前步骤的材料消耗
                this.enchantmentSteps[i].totalMaterialCosts.metal =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.metal || 0) +
                    (this.enchantmentSteps[i].materialCosts?.metal || 0);

                this.enchantmentSteps[i].totalMaterialCosts.cloth =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.cloth || 0) +
                    (this.enchantmentSteps[i].materialCosts?.cloth || 0);

                this.enchantmentSteps[i].totalMaterialCosts.beast =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.beast || 0) +
                    (this.enchantmentSteps[i].materialCosts?.beast || 0);

                this.enchantmentSteps[i].totalMaterialCosts.wood =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.wood || 0) +
                    (this.enchantmentSteps[i].materialCosts?.wood || 0);

                this.enchantmentSteps[i].totalMaterialCosts.medicine =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.medicine || 0) +
                    (this.enchantmentSteps[i].materialCosts?.medicine || 0);

                this.enchantmentSteps[i].totalMaterialCosts.mana =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.mana || 0) +
                    (this.enchantmentSteps[i].materialCosts?.mana || 0);
            }
        }

        // 更新最终总材料消耗（取最后一个步骤的结果）
        if (this.enchantmentSteps.length > 0) {
            this.finalTotalMaterialCosts = {
                metal: this.enchantmentSteps[this.enchantmentSteps.length - 1].totalMaterialCosts.metal,
                cloth: this.enchantmentSteps[this.enchantmentSteps.length - 1].totalMaterialCosts.cloth,
                beast: this.enchantmentSteps[this.enchantmentSteps.length - 1].totalMaterialCosts.beast,
                wood: this.enchantmentSteps[this.enchantmentSteps.length - 1].totalMaterialCosts.wood,
                medicine: this.enchantmentSteps[this.enchantmentSteps.length - 1].totalMaterialCosts.medicine,
                mana: this.enchantmentSteps[this.enchantmentSteps.length - 1].totalMaterialCosts.mana
            };
        } else {
            this.finalTotalMaterialCosts = {
                metal: 0,
                cloth: 0,
                beast: 0,
                wood: 0,
                medicine: 0,
                mana: 0
            };
        }

        // 计算最终剩余潜力值
        if (this.enchantmentSteps.length > 0) {
            this.finalRemainingPotential = this.enchantmentSteps[this.enchantmentSteps.length - 1].postEnchantmentPotential;
        } else {
            this.finalRemainingPotential = this.equipmentPotential;
        }

        // 计算最终单条成功率
        if (this.enchantmentSteps.length > 0) {
            // 直接从最后一步获取已经计算好的成功率
            this.finalSingleSuccessRate = this.enchantmentSteps[this.enchantmentSteps.length - 1].singleSuccessRate;
        } else {
            // 如果没有步骤，返回-1
            this.finalSingleSuccessRate = -1
        }

        // 计算最终期望成功率
        if (this.enchantmentSteps.length > 0) {
            // 直接从最后一步获取已经计算好的期望成功率
            this.finalExpectedSuccessRate = this.enchantmentSteps[this.enchantmentSteps.length - 1].expectedSingleSuccessRate;
        } else {
            // 如果没有步骤，返回-1
            this.finalExpectedSuccessRate = -1;
        }
    }

    /**
     * 计算最终期望成功率
     * @private
     * @returns {number} 最终期望成功率
     */
    _calculateFinalExpectedSuccessRate() {
        // TODO: 实现最终期望成功率计算逻辑
        // 这里暂时返回最终单次成功率，后续需要根据具体需求完善
        return this.finalSingleSuccessRate || 0;
    }

    /**
     * 重新计算所有步骤的数据
     * @private
     */
    _recalculateAllSteps() {
        // 保存当前的附魔步骤（不包括计算结果）
        const steps = this.enchantmentSteps.map(step => ({
            id: step.id,
            enchantments: step.enchantments.map(enchant => ({
                property: enchant.property,
                value: enchant.value
            }))
        }));

        // 清空当前步骤
        this.enchantmentSteps = [];

        // 重新添加每个步骤，触发重新计算
        for (const step of steps) {
            this.addEnchantmentStep(step);
        }

        // 更新汇总信息
        this._updateSummaryInfo();
    }

    /**
     * 获取当前所有属性值
     * @returns {Object} 当前属性值对象
     */
    getCurrentProperties() {
        // 如果有步骤，返回最后一步的属性值，否则返回空对象
        if (this.enchantmentSteps.length > 0) {
            return { ...this.enchantmentSteps[this.enchantmentSteps.length - 1].currentProperties };
        }

        // 返回默认属性值
        const properties = PM.properties;
        const currentProperties = {};
        for (const propId in properties) {
            currentProperties[propId] = 0;
        }
        return currentProperties;
    }

    /**
     * 获取当前指定属性值
     * @param {Object} property - 属性对象
     * @returns {number} 属性值
     */
    getProperty(property) {
        // 返回指定属性的当前值，如果不存在则返回null
        const currentProperties = this.getCurrentProperties();
        return currentProperties[property.id] || null;
    }

    /**
     * 获取所有曾经被附魔过的属性
     * @returns {Array} 曾经被附魔过的属性ID数组
     */
    getEnchantedProperties() {
        if (this.enchantmentSteps.length > 0) {
            const enchantedProperties = this.enchantmentSteps[this.enchantmentSteps.length - 1].enchantedProperties;
            return Object.keys(enchantedProperties).filter(propId => enchantedProperties[propId]);
        }
        return [];
    }

    /**
     * 检查属性是否曾经被附魔过
     * @param {Object} property - 属性对象
     * @returns {boolean} 如果属性曾经被附魔过返回true，否则返回false
     */
    isPropertyEnchanted(property) {
        if (this.enchantmentSteps.length > 0) {
            const enchantedProperties = this.enchantmentSteps[this.enchantmentSteps.length - 1].enchantedProperties;
            return enchantedProperties[property.id] || false;
        }
        return false;
    }
}