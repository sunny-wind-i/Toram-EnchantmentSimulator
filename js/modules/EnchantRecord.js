import PropertyManager from './PropertyManager.js';
import EquipmentType from './EquipmentType.js';
import EnchantType from './EnchantType.js';
import { calPostEnchantmentPotentialChanges } from './PotentialCalculator.js';
import { calSingleSuccessRate, calExpectedSuccessRate } from './SuccessCalculator.js';
import { calEnchantmentStepMaterialCost } from './MaterialCalculator.js';
import { calAttrMaxLimit, calAttrMinLimit } from './PotentialCalculator.js';

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
     * @param {number} [config.playerLevel=290] - 玩家等级
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
     * @param {Array} [config.enchantmentSteps=[]] - 附魔步骤数组
     * @param {Object} [config.finalTotalMaterialCosts] - 最终总材料消耗对象
     * @param {number} [config.finalTotalMaterialCosts.metal=0] - 金属材料总消耗
     * @param {number} [config.finalTotalMaterialCosts.cloth=0] - 布料材料总消耗
     * @param {number} [config.finalTotalMaterialCosts.beast=0] - 兽品材料总消耗
     * @param {number} [config.finalTotalMaterialCosts.wood=0] - 木材材料总消耗
     * @param {number} [config.finalTotalMaterialCosts.medicine=0] - 药品材料总消耗
     * @param {number} [config.finalTotalMaterialCosts.mana=0] - 魔素材料总消耗
     * @param {number} [config.finalRemainingPotential] - 最终剩余潜力值
     * @param {number} [config.finalSingleSuccessRate] - 最终单条成功率
     * @param {number} [config.finalExpectedSuccessRate] - 最终期望成功率
     */
    constructor(config = {}) {
        // 基础信息（只出现一次的固定数据）
        this.equipmentType = config.equipmentType || EquipmentType.EQUIPMENT_TYPE_WEAPON; // 装备类型
        this.playerLevel = config.playerLevel || 290; // 玩家等级，默认290
        this.equipmentPotential = config.equipmentPotential || 100; // 装备潜力值
        this.baseEquipmentPotential = config.baseEquipmentPotential || 1; // 装备基础潜力值
        this.smithingLevel = config.smithingLevel || 0; // 玩家锻冶熟练度
        this.anvilLevel = config.anvilLevel || 40; // 铁砧技能等级，默认为40
        this.masterEnhancement2Level = config.masterEnhancement2Level || 10; // 大师级强化技术2技能等级，默认为10

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
        this.finalSingleSuccessRate = null;
        this.finalExpectedSuccessRate = null;
    }

    /**
     * 添加一个附魔步骤
     * @param {Object} step - 附魔步骤对象
     * @param {string} step.id - 步骤ID（可选，自动生成）
     * @param {Array<Object>} step.enchantments - 该步骤的附魔属性数组
     * @param {Object} step.enchantments[].property - 属性对象
     * @param {string} step.enchantments[].propertyId - 属性ID（可选，如果提供了property则忽略此字段）
     * @param {number} step.enchantments[].value - 属性值变化量
     * @param {boolean} step.isIgnored - 是否忽略该步骤，默认为false
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
            // 添加ignored和valid属性，默认值分别为false和true
            isIgnored: step.isIgnored || false, // 用户可以设置是否忽略该步骤
            isValid: true, // 默认为有效步骤
            invalidReason: null, // 无效原因
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
        const potentialResult = calPostEnchantmentPotentialChanges(
            enchantmentStep,
            currentProperties,
            Object.keys(enchantedProperties).filter(key => enchantedProperties[key]),
            preEnchantmentPotential,
            this.equipmentType
        );

        // 潜力值变化量
        const potentialChange = potentialResult.potentialChange;
        // 各属性潜力值变化
        const propertyPotentialChanges = potentialResult.propertyChanges;
        // 附魔后潜力值
        const postEnchantmentPotential = preEnchantmentPotential + potentialChange;
        // 倍率
        const multiplier = potentialResult.multiplier;

        // 计算成功率
        const singleSuccessRate = calSingleSuccessRate(
            preEnchantmentPotential,
            postEnchantmentPotential,
            this.baseEquipmentPotential
        );

        // 计算期望成功率（暂时为空函数）
        const expectedSuccessRate = calExpectedSuccessRate(
            singleSuccessRate,
            currentProperties,
            enchantmentStep, // 传递当前步骤对象
            this.masterEnhancement2Level
        );

        // 检查该步骤是否有效
        this._checkStepValidity(enchantmentStep, preEnchantmentPotential, singleSuccessRate);

        // 完善附魔步骤对象，添加材料消耗、潜力值变化等信息
        enchantmentStep.materialCosts = materialCosts;
        enchantmentStep.propertyMaterialCosts = perPropertyMaterialCosts;
        enchantmentStep.postEnchantmentPotential = postEnchantmentPotential;
        enchantmentStep.propertyPotentialChanges = propertyPotentialChanges;
        enchantmentStep.potentialChange = potentialChange;
        enchantmentStep.multiplier = multiplier;
        enchantmentStep.singleSuccessRate = singleSuccessRate;
        enchantmentStep.expectedSuccessRate = expectedSuccessRate;

        // 将步骤添加到记录中
        this.enchantmentSteps.push(enchantmentStep);
        // 更新当前属性值
        this._updateCurrentProperties();
        // 更新总材料消耗等汇总信息
        this._updateSummaryInfo();
        return stepId;
    }

    /**
     * 检查步骤是否有效
     * @param {Object} step - 附魔步骤对象
     * @param {number} preEnchantmentPotential - 附魔前潜力值
     * @param {number} singleSuccessRate - 单次成功率
     * @private
     */
    _checkStepValidity(step, preEnchantmentPotential, singleSuccessRate) {
        // 如果步骤被用户忽略，则标记为无效，原因为用户忽略
        if (step.isIgnored) {
            step.isValid = false;
            step.invalidReason = '用户忽略';
            return;
        }

        // 获取前一步骤
        const previousStep = this.enchantmentSteps.length > 0 ?
            this.enchantmentSteps[this.enchantmentSteps.length - 1] : null;

        // 检查上一步是否无效
        if (previousStep && !previousStep.isValid) {
            step.isValid = false;
            step.invalidReason = '上一步无效';
            return;
        }

        // 检查身体装备上附属性觉醒，为无效步骤
        if (this.equipmentType === EquipmentType.EQUIPMENT_TYPE_ARMOR) {
            for (const enchantment of step.enchantments) {
                const property = enchantment.property;
                if (property && property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
                    step.isValid = false;
                    step.invalidReason = '身体装备不能附魔属性觉醒';
                    return;
                }
            }
        }

        // 获取已附魔的属性数量
        const enchantedPropertiesCount = this.enchantmentSteps.length > 0 ?
            Object.values(this.enchantmentSteps[this.enchantmentSteps.length - 1].enchantedProperties)
                .filter(isEnchanted => isEnchanted).length : 0;

        // 检查已附魔属性是否已满8条
        if (enchantedPropertiesCount >= 8) {
            step.isValid = false;
            step.invalidReason = '已附魔属性已达8条上限';
            return;
        }

        // 检查潜力值是否小于或等于0
        if (preEnchantmentPotential <= 0) {
            step.isValid = false;
            step.invalidReason = '附魔前潜力值小于或等于0';
            return;
        }

        // 检查单条成功率是否小于或等于0
        if (singleSuccessRate <= 0) {
            step.isValid = false;
            step.invalidReason = '单条成功率小于或等于0';
            return;
        }

        // 获取当前属性值（基于上一步的结果）
        const currentProperties = this.enchantmentSteps.length > 0 ?
            { ...this.enchantmentSteps[this.enchantmentSteps.length - 1].currentProperties } :
            this.getCurrentProperties();

        // 计算应用当前步骤附魔后的属性值
        const propertiesWithCurrentStep = { ...currentProperties };
        // 只有当步骤未被忽略时才应用附魔
        if (!step.isIgnored) {
            for (const enchantment of step.enchantments) {
                if (enchantment.property && propertiesWithCurrentStep.hasOwnProperty(enchantment.property.id)) {
                    propertiesWithCurrentStep[enchantment.property.id] += enchantment.value;
                }
            }
        }

        // 检查每个属性是否超出限制
        for (const propId in propertiesWithCurrentStep) {
            const property = PM.properties[propId];
            if (property) {
                const value = propertiesWithCurrentStep[propId];
                // 计算属性的上下限
                const maxLimit = calAttrMaxLimit(property, this.playerLevel);
                const minLimit = calAttrMinLimit(property, this.playerLevel);

                // 检查是否超出限制
                if (value > maxLimit || value < minLimit) {
                    step.isValid = false;
                    step.invalidReason = `属性${property.nameChsFull}超出限制范围`;
                    return;
                }
            }
        }

        // 检查是否同时存在"原属性"和"非原属性"
        let hasOriginProperty = false;
        let hasNonOriginProperty = false;

        for (const propId in propertiesWithCurrentStep) {
            const property = PM.properties[propId];
            if (property && propertiesWithCurrentStep[propId] !== 0) {
                // 判断是否为原属性（属性ID以_0结尾的为原属性）
                if (propId.endsWith('_0')) {
                    hasOriginProperty = true;
                } else {
                    // 检查是否存在对应的原属性且值不为0
                    const originPropId = propId.replace(/_[1-9]\d*$/, '_0');
                    if (PM.properties[originPropId] && propertiesWithCurrentStep[originPropId] !== 0) {
                        hasNonOriginProperty = true;
                    }
                }
            }
        }

        // 如果同时存在原属性和非原属性，则步骤无效
        if (hasOriginProperty && hasNonOriginProperty) {
            step.isValid = false;
            step.invalidReason = '同时存在原属性和非原属性';
            return;
        }

        // 检查原属性和非原属性是否减少（属性觉醒类型只能增加不能减少）
        for (const enchantment of step.enchantments) {
            const property = enchantment.property;
            if (property &&
                (property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION)) { // 属性觉醒类型
                // 获取该属性在上一步的值
                const previousValue = currentProperties[property.id] || 0;
                const currentValue = previousValue + enchantment.value;

                // 如果属性值减少，则步骤无效
                if (currentValue < previousValue) {
                    step.isValid = false;
                    step.invalidReason = `属性${property.nameChsFull}为属性觉醒类型，只能增加不能减少`;
                    return;
                }
            }
        }

        // 如果以上条件都不满足，则步骤有效
        step.isValid = true;
        step.invalidReason = null;
    }

    /**
     * 设置步骤是否被忽略
     * @param {string} stepId - 步骤ID
     * @param {boolean} isIgnored - 是否忽略
     */
    setStepIgnored(stepId, isIgnored) {
        const step = this.enchantmentSteps.find(step => step.id === stepId);
        if (step) {
            step.isIgnored = isIgnored;
            // 重新计算所有步骤
            this._recalculateAllSteps();
        }
    }

    /**
     * 获取步骤是否被忽略
     * @param {string} stepId - 步骤ID
     * @returns {boolean|null} 是否忽略，如果未找到步骤则返回null
     */
    isStepIgnored(stepId) {
        const step = this.enchantmentSteps.find(step => step.id === stepId);
        return step ? step.isIgnored : null;
    }

    /**
     * 获取步骤是否有效
     * @param {string} stepId - 步骤ID
     * @returns {boolean|null} 是否有效，如果未找到步骤则返回null
     */
    isStepValid(stepId) {
        const step = this.enchantmentSteps.find(step => step.id === stepId);
        return step ? step.isValid : null;
    }

    /**
     * 获取步骤无效原因
     * @param {string} stepId - 步骤ID
     * @returns {string|null} 无效原因，如果未找到步骤或步骤有效则返回null
     */
    getStepInvalidReason(stepId) {
        const step = this.enchantmentSteps.find(step => step.id === stepId);
        return step && !step.isValid ? step.invalidReason : null;
    }

    /**
     * 更新指定步骤
     * @param {string} stepId - 步骤ID
     * @param {Object} updatedStep - 更新后的步骤对象
     * @param {Array<Object>} updatedStep.enchantments - 该步骤的附魔属性数组
     * @param {Object} updatedStep.enchantments[].property - 属性对象
     * @param {string} updatedStep.enchantments[].propertyId - 属性ID（可选，如果提供了property则忽略此字段）
     * @param {number} updatedStep.enchantments[].value - 属性值变化量
     * @param {boolean} updatedStep.isIgnored - 是否忽略该步骤
     * @param {boolean} updatedStep.isValid - 是否有效
     * @param {string} updatedStep.invalidReason - 无效原因
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
                isIgnored: updatedStep.isIgnored !== undefined ? updatedStep.isIgnored : this.enchantmentSteps[stepIndex].isIgnored,
                isValid: updatedStep.isValid !== undefined ? updatedStep.isValid : true,
                invalidReason: updatedStep.invalidReason || null,

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
        // 保存从startIndex开始的所有步骤数据
        const stepsToRecalculate = this.enchantmentSteps.slice(startIndex).map(step => ({
            id: step.id,
            enchantments: step.enchantments.map(enchant => ({
                property: enchant.property,
                value: enchant.value
            })),
            isIgnored: step.isIgnored,
            isValid: step.isValid,
            invalidReason: step.invalidReason
        }));

        // 从startIndex开始删除所有步骤
        this.enchantmentSteps.splice(startIndex, this.enchantmentSteps.length - startIndex);

        // 重新添加并计算每个步骤
        for (let i = 0; i < stepsToRecalculate.length; i++) {
            const stepData = stepsToRecalculate[i];
            // 创建新的步骤对象，保持原有的ID和其他属性
            const newStep = {
                id: stepData.id,
                enchantments: stepData.enchantments,
                isIgnored: stepData.isIgnored !== undefined ? stepData.isIgnored : false,
                isValid: stepData.isValid !== undefined ? stepData.isValid : true,
                invalidReason: stepData.invalidReason || null
            };

            // 添加步骤并触发重新计算
            this.addEnchantmentStep(newStep);
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
     * @param {string} data.equipmentType - 装备类型
     * @param {number} data.playerLevel - 玩家等级
     * @param {number} data.equipmentPotential - 装备潜力值
     * @param {number} data.baseEquipmentPotential - 装备基础潜力值
     * @param {number} data.smithingLevel - 玩家锻冶熟练度
     * @param {number} data.anvilLevel - 铁砧技能等级
     * @param {number} data.masterEnhancement2Level - 大师级强化技术2技能等级
     * @param {Object} data.understandingSkills - 玩家理解技能等级对象
     * @param {Array} data.enchantmentSteps - 附魔步骤数组
     * @param {Object} data.finalTotalMaterialCosts - 最终总材料消耗
     * @param {number} data.finalRemainingPotential - 最终剩余潜力值
     * @param {number} data.finalSingleSuccessRate - 最终单条成功率
     * @param {number} data.finalExpectedSingleSuccessRate - 最终期望成功率
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
        this.masterEnhancement2Level = data.masterEnhancement2Level || 0; // 导入大师级强化技术2技能等级

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
                isIgnored: step.isIgnored !== undefined ? step.isIgnored : false,
                isValid: step.isValid !== undefined ? step.isValid : true,
                invalidReason: step.invalidReason || null,
                materialCosts: step.materialCosts,
                perPropertyMaterialCosts: step.perPropertyMaterialCosts,
                postEnchantmentPotential: step.postEnchantmentPotential,
                propertyPotentialChanges: step.propertyPotentialChanges,
                potentialChange: step.potentialChange,
                multiplier: step.multiplier,
                singleSuccessRate: step.singleSuccessRate,
                expectedSuccessRate: step.expectedSuccessRate,
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
     * @returns {string} return.equipmentType - 装备类型
     * @returns {number} return.playerLevel - 玩家等级
     * @returns {number} return.equipmentPotential - 装备潜力值
     * @returns {number} return.baseEquipmentPotential - 装备基础潜力值
     * @returns {number} return.smithingLevel - 玩家锻冶熟练度
     * @returns {number} return.anvilLevel - 铁砧技能等级
     * @returns {number} return.masterEnhancement2Level - 大师级强化技术2技能等级
     * @returns {Object} return.understandingSkills - 玩家理解技能等级对象
     * @returns {Array} return.enchantmentSteps - 附魔步骤数组
     * @returns {Object} return.finalTotalMaterialCosts - 最终总材料消耗
     * @returns {number} return.finalRemainingPotential - 最终剩余潜力值
     * @returns {number} return.finalSingleSuccessRate - 最终单条成功率
     * @returns {number} return.finalExpectedSingleSuccessRate - 最终期望成功率
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
            masterEnhancement2Level: this.masterEnhancement2Level, // 导出大师级强化技术2技能等级
            understandingSkills: { ...this.understandingSkills },
            enchantmentSteps: this.enchantmentSteps.map(step => ({
                id: step.id,
                enchantments: step.enchantments.map(enchant => ({
                    // 导出时保存属性ID而不是对象
                    propertyId: enchant.property?.id,
                    value: enchant.value
                })).filter(enchant => enchant.propertyId), // 过滤掉无效的属性
                isIgnored: step.isIgnored,
                isValid: step.isValid,
                invalidReason: step.invalidReason,
                materialCosts: step.materialCosts,
                perPropertyMaterialCosts: step.perPropertyMaterialCosts,
                postEnchantmentPotential: step.postEnchantmentPotential,
                propertyPotentialChanges: step.propertyPotentialChanges,
                potentialChange: step.potentialChange,
                multiplier: step.multiplier,
                singleSuccessRate: step.singleSuccessRate,
                expectedSuccessRate: step.expectedSuccessRate,
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

            // 检查步骤是否为空（所有属性值都为0）
            const isEmptyStep = step.enchantments.every(e => e.value === 0);

            // 只有当步骤有效且未被忽略且不为空时才应用附魔
            if (step.isValid && !step.isIgnored && !isEmptyStep) {
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

            // 如果是第一步，直接使用当前步骤的材料消耗（仅当步骤有效且未被忽略时）
            if (i === 0) {
                if (this.enchantmentSteps[i].isValid && !this.enchantmentSteps[i].isIgnored) {
                    this.enchantmentSteps[i].totalMaterialCosts.metal = this.enchantmentSteps[i].materialCosts?.metal || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.cloth = this.enchantmentSteps[i].materialCosts?.cloth || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.beast = this.enchantmentSteps[i].materialCosts?.beast || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.wood = this.enchantmentSteps[i].materialCosts?.wood || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.medicine = this.enchantmentSteps[i].materialCosts?.medicine || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.mana = this.enchantmentSteps[i].materialCosts?.mana || 0;
                }
            } else {
                // 否则，累加上一步的总材料消耗和当前步骤的材料消耗（仅当步骤有效且未被忽略时）
                this.enchantmentSteps[i].totalMaterialCosts.metal =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.metal || 0) +
                    ((this.enchantmentSteps[i].isValid && !this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.metal || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.cloth =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.cloth || 0) +
                    ((this.enchantmentSteps[i].isValid && !this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.cloth || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.beast =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.beast || 0) +
                    ((this.enchantmentSteps[i].isValid && !this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.beast || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.wood =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.wood || 0) +
                    ((this.enchantmentSteps[i].isValid && !this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.wood || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.medicine =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.medicine || 0) +
                    ((this.enchantmentSteps[i].isValid && !this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.medicine || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.mana =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.mana || 0) +
                    ((this.enchantmentSteps[i].isValid && !this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.mana || 0) : 0);
            }
        }

        // 更新最终总材料消耗（取最后一个有效且未被忽略步骤的结果）
        let lastValidStep = null;
        for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
            const step = this.enchantmentSteps[i];
            if (step.isValid && !step.isIgnored) {
                lastValidStep = step;
                break;
            }
        }

        if (lastValidStep) {
            this.finalTotalMaterialCosts = {
                metal: lastValidStep.totalMaterialCosts.metal,
                cloth: lastValidStep.totalMaterialCosts.cloth,
                beast: lastValidStep.totalMaterialCosts.beast,
                wood: lastValidStep.totalMaterialCosts.wood,
                medicine: lastValidStep.totalMaterialCosts.medicine,
                mana: lastValidStep.totalMaterialCosts.mana
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
        // 复用前面定义的lastValidStep变量
        if (lastValidStep) {
            this.finalRemainingPotential = lastValidStep.postEnchantmentPotential;
        } else {
            this.finalRemainingPotential = this.equipmentPotential;
        }

        // 计算最终单条成功率
        if (lastValidStep) {
            // 从最后一个有效且未被忽略的步骤获取成功率
            this.finalSingleSuccessRate = lastValidStep.singleSuccessRate;
        } else {
            // 如果没有有效步骤，返回null
            this.finalSingleSuccessRate = null;
        }

        // 计算最终期望成功率
        if (lastValidStep) {
            // 从最后一个有效且未被忽略的步骤获取期望成功率
            this.finalExpectedSuccessRate = lastValidStep.expectedSuccessRate;
        } else {
            // 如果没有有效步骤，返回null
            this.finalExpectedSuccessRate = null;
        }
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