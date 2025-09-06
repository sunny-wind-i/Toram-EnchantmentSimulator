import PropertyManager from './PropertyManager.js';
import EquipmentType from './EquipmentType.js';
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
        this.playerLevel = config.playerLevel || 1; // 玩家等级
        this.equipmentPotential = config.equipmentPotential || 0; // 装备潜力值
        this.baseEquipmentPotential = config.baseEquipmentPotential || 0; // 装备基础潜力值
        this.smithingLevel = config.smithingLevel || 0; // 玩家锻冶熟练度

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

        // 当前各属性的实际值
        this.currentProperties = {};

        // 附魔历史记录，跟踪哪些属性曾经被附魔过
        this.enchantedProperties = {};

        // 初始化属性值
        const properties = PM.properties;
        for (const propId in properties) {
            this.currentProperties[propId] = 0;
            this.enchantedProperties[propId] = false;
        }
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
            })
        };

        // 将步骤添加到记录中
        this.enchantmentSteps.push(enchantmentStep);
        // 更新当前属性值
        this._updateCurrentProperties();
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
                })
            };
            // 更新当前属性值
            this._updateCurrentProperties();
        }
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
     * 获取当前所有属性值
     * @returns {Object} 当前属性值对象
     */
    getCurrentProperties() {
        // 返回当前属性值的副本
        return { ...this.currentProperties };
    }

    /**
     * 获取当前指定属性值
     * @param {Object} property - 属性对象
     * @returns {number} 属性值
     */
    getProperty(property) {
        // 返回指定属性的当前值，如果不存在则返回0
        return this.currentProperties[property.id] || 0;
    }

    /**
     * 检查属性是否曾经被附魔过
     * @param {Object} property - 属性对象
     * @returns {boolean} 如果属性曾经被附魔过返回true，否则返回false
     */
    isPropertyEnchanted(property) {
        return this.enchantedProperties[property.id] || false;
    }

    /**
     * 获取所有曾经被附魔过的属性
     * @returns {Array} 曾经被附魔过的属性ID数组
     */
    getEnchantedProperties() {
        return Object.keys(this.enchantedProperties).filter(propId => this.enchantedProperties[propId]);
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
            understandingSkills: { ...this.understandingSkills },
            enchantmentSteps: this.enchantmentSteps.map(step => ({
                id: step.id,
                enchantments: step.enchantments.map(enchant => ({
                    // 导出时保存属性ID而不是对象
                    propertyId: enchant.property?.id,
                    value: enchant.value
                })).filter(enchant => enchant.propertyId) // 过滤掉无效的属性
            }))
        };
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
                }).filter(enchant => enchant.property) // 过滤掉无效的属性
            }));
        }

        // 更新当前属性值
        this._updateCurrentProperties();
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
     * 根据附魔步骤更新当前属性值
     * @private
     */
    _updateCurrentProperties() {
        // 重置属性值
        const properties = PM.properties;
        for (const propId in properties) {
            this.currentProperties[propId] = 0;
        }

        // 根据所有步骤累加属性值，并更新附魔历史
        for (const step of this.enchantmentSteps) {
            for (const enchantment of step.enchantments) {
                // 检查属性对象是否存在
                if (enchantment.property && this.currentProperties.hasOwnProperty(enchantment.property.id)) {
                    // 如果有附魔值变化，则标记该属性为已附魔
                    if (enchantment.value !== 0) {
                        this.enchantedProperties[enchantment.property.id] = true;
                    }
                    
                    this.currentProperties[enchantment.property.id] += enchantment.value;
                }
            }
        }
    }
}