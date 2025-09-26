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
     * @param {Array} [config.selectedProperties=[]] - 选中的属性数组，保持选择顺序
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
     * @param {Object} [config.finalProperties] - 最终属性值对象
     * @param {string} [config.name="自定义附魔1"] - 附魔名称
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

        // 附魔名称
        this.name = config.name || "自定义附魔1";

        // 玩家"理解xx"技能等级（减少对应素材消耗量）
        this.understandingSkills = {
            metal: config.understandingSkills?.metal || 0,      // 理解金属
            cloth: config.understandingSkills?.cloth || 0,      // 理解布料
            beast: config.understandingSkills?.beast || 0,      // 理解兽品
            wood: config.understandingSkills?.wood || 0,        // 理解木材
            medicine: config.understandingSkills?.medicine || 0, // 理解药品
            mana: config.understandingSkills?.mana || 0         // 理解魔素
        };

        // 选中的属性，保持选择顺序，最多8个
        this.selectedProperties = config.selectedProperties || [];

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
        this.finalProperties = {};

        // 初始化finalProperties
        const properties = PM.properties;
        for (const propId in properties) {
            this.finalProperties[propId] = 0;
        }
    }

    /**
     * 获取附魔名称
     * @returns {string} 附魔名称
     */
    getName() {
        return this.name;
    }

    /**
     * 设置附魔名称
     * @param {string} name - 新的附魔名称
     */
    setName(name) {
        this.name = name;
    }

    /**
     * 添加一个附魔步骤
     * @param {Object} step - 附魔步骤对象
     * @param {string} step.id - 步骤ID（可选，自动生成）
     * @param {Array<Object>} step.enchantments - 该步骤的附魔属性数组
     * @param {Object} step.enchantments[].property - 属性对象
     * @param {string} step.enchantments[].propertyId - 属性ID（可选，如果提供了property则忽略此字段）
     * @param {number} step.enchantments[].value - 属性值变化量
     * @param {boolean} [step.isIgnored=false] - 是否忽略该步骤
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
            isIgnored: step.isIgnored !== undefined ? step.isIgnored : false, // 用户可以设置是否忽略该步骤
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

        // 计算该步骤附魔前的潜力值（基于上一个非忽略步骤）
        let preEnchantmentPotential = this.equipmentPotential;
        let previousProperties = this.getCurrentProperties();
        let previousEnchantedProperties = {};
        
        // 初始化默认属性状态
        const properties = PM.properties;
        for (const propId in properties) {
            previousEnchantedProperties[propId] = false;
        }

        if (this.enchantmentSteps.length > 0) {
            // 寻找上一个非忽略且有效的步骤
            let lastValidStep = null;
            for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
                if (!this.enchantmentSteps[i].isIgnored && this.enchantmentSteps[i].isValid) {
                    lastValidStep = this.enchantmentSteps[i];
                    break;
                }
            }
            
            if (lastValidStep) {
                preEnchantmentPotential = lastValidStep.postEnchantmentPotential;
                previousProperties = { ...lastValidStep.currentProperties };
                previousEnchantedProperties = { ...lastValidStep.enchantedProperties };
            }
        }

        // 计算该步骤的材料消耗
        const materialCostsResult = calEnchantmentStepMaterialCost(
            enchantmentStep,
            previousProperties,
            this.smithingLevel,
            this.understandingSkills
        );

        // 提取总材料消耗
        const materialCosts = materialCostsResult.total;

        // 提取每条属性的材料消耗
        const perPropertyMaterialCosts = materialCostsResult.perProperty;

        // 计算该步骤附魔后的潜力值和潜力变化值
        const potentialResult = calPostEnchantmentPotentialChanges(
            enchantmentStep,
            previousProperties,
            Object.keys(previousEnchantedProperties).filter(key => previousEnchantedProperties[key]),
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

        // 计算期望成功率
        const expectedSuccessRate = calExpectedSuccessRate(
            singleSuccessRate,
            previousProperties, // 使用正确命名的变量
            enchantmentStep, // 传递当前步骤对象
            this.masterEnhancement2Level
        );

        // 检查该步骤是否有效
        this._checkStepValidity(enchantmentStep, preEnchantmentPotential, singleSuccessRate);

        // 只有当步骤未被忽略时才进行后续的属性更新计算
        if (!enchantmentStep.isIgnored && enchantmentStep.isValid) {
            // 更新当前属性值和已附魔属性
            const newCurrentProperties = { ...previousProperties };
            const newEnchantedProperties = { ...previousEnchantedProperties };

            // 应用当前步骤的附魔
            for (const enchantment of enchantmentStep.enchantments) {
                if (enchantment.property && newCurrentProperties.hasOwnProperty(enchantment.property.id)) {
                    // 如果有附魔值变化，则标记该属性为已附魔
                    if (enchantment.value !== 0) {
                        newEnchantedProperties[enchantment.property.id] = true;
                    }
                    newCurrentProperties[enchantment.property.id] += enchantment.value;
                }
            }

            // 将更新后的属性值添加到步骤中
            enchantmentStep.currentProperties = newCurrentProperties;
            enchantmentStep.enchantedProperties = newEnchantedProperties;
        } else {
            // 对于被忽略或无效的步骤，仍然需要设置属性值（但不应用变化）
            enchantmentStep.currentProperties = { ...previousProperties };
            enchantmentStep.enchantedProperties = { ...previousEnchantedProperties };
        }

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
        // 获取前一步骤（忽略被用户忽略的步骤）
        let previousStep = null;
        for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
            if (!this.enchantmentSteps[i].isIgnored) {
                previousStep = this.enchantmentSteps[i];
                break;
            }
        }

        // 检查上一步是否无效（忽略被用户忽略的步骤）
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

        // 获取已附魔的属性数量（基于上一个非忽略步骤）
        let enchantedPropertiesCount = 0;
        if (previousStep) {
            enchantedPropertiesCount = Object.values(previousStep.enchantedProperties)
                .filter(isEnchanted => isEnchanted).length;
        }

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

        // 获取当前属性值（基于上一个非忽略步骤的结果）
        let currentProperties = this.getCurrentProperties();
        if (previousStep) {
            currentProperties = { ...previousStep.currentProperties };
        }

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
            const wasIgnored = step.isIgnored;
            step.isIgnored = isIgnored;
            // 如果忽略状态发生变化，则重新计算所有步骤
            if (wasIgnored !== isIgnored) {
                // 重新计算所有步骤以更新依赖数据
                this._recalculateAllSteps();
                // 触发UI重新渲染和分组逻辑
                if (typeof saveCurrentEnchantment === 'function') {
                    saveCurrentEnchantment();
                }
            }
            return true;
        }
        return false;
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
            // 保存原始的isIgnored状态（如果未提供新值）
            const isIgnored = updatedStep.isIgnored !== undefined 
                ? updatedStep.isIgnored 
                : this.enchantmentSteps[stepIndex].isIgnored;

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
                isIgnored: isIgnored,
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
            this._updateSummaryInfo();
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
     * 生成步骤ID
     * @private
     * @returns {string} 唯一的步骤ID
     */
    _generateStepId() {
        // 基于时间戳和随机数生成唯一ID
        return 'step_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }

    /**
     * 获取选中的属性
     * @returns {Array} 选中的属性数组
     */
    getSelectedProperties() {
        return this.selectedProperties;
    }

    /**
     * 设置选中的属性
     * @param {Array} properties - 选中的属性数组
     */
    setSelectedProperties(properties) {
        // 限制最多8个属性
        this.selectedProperties = properties.slice(0, 8);
    }

    /**
     * 添加选中的属性
     * @param {Object} property - 要添加的属性对象
     */
    addSelectedProperty(property) {
        // 检查是否已存在
        const exists = this.selectedProperties.some(prop => prop.id === property.id);
        
        // 如果不存在且未达到上限，则添加
        if (!exists && this.selectedProperties.length < 8) {
            this.selectedProperties.push(property);
        }
    }

    /**
     * 移除选中的属性
     * @param {Object} property - 要移除的属性对象
     */
    removeSelectedProperty(property) {
        this.selectedProperties = this.selectedProperties.filter(prop => prop.id !== property.id);
    }

    /**
     * 清空选中的属性
     */
    clearSelectedProperties() {
        this.selectedProperties = [];
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

            // 如果是第一步，直接使用当前步骤的材料消耗（仅当步骤未被忽略时）
            if (i === 0) {
                if (!this.enchantmentSteps[i].isIgnored) {
                    this.enchantmentSteps[i].totalMaterialCosts.metal = this.enchantmentSteps[i].materialCosts?.metal || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.cloth = this.enchantmentSteps[i].materialCosts?.cloth || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.beast = this.enchantmentSteps[i].materialCosts?.beast || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.wood = this.enchantmentSteps[i].materialCosts?.wood || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.medicine = this.enchantmentSteps[i].materialCosts?.medicine || 0;
                    this.enchantmentSteps[i].totalMaterialCosts.mana = this.enchantmentSteps[i].materialCosts?.mana || 0;
                }
            } else {
                // 否则，累加上一步的总材料消耗和当前步骤的材料消耗（仅当步骤未被忽略时）
                this.enchantmentSteps[i].totalMaterialCosts.metal =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.metal || 0) +
                    ((!this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.metal || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.cloth =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.cloth || 0) +
                    ((!this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.cloth || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.beast =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.beast || 0) +
                    ((!this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.beast || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.wood =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.wood || 0) +
                    ((!this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.wood || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.medicine =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.medicine || 0) +
                    ((!this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.medicine || 0) : 0);

                this.enchantmentSteps[i].totalMaterialCosts.mana =
                    (this.enchantmentSteps[i - 1].totalMaterialCosts?.mana || 0) +
                    ((!this.enchantmentSteps[i].isIgnored) ?
                        (this.enchantmentSteps[i].materialCosts?.mana || 0) : 0);
            }
        }

        // 更新最终总材料消耗（取最后一个未被忽略且有效的步骤的结果）
        let lastValidStep = null;
        for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
            const step = this.enchantmentSteps[i];
            if (!step.isIgnored && step.isValid) {
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
            // 从最后一个未被忽略且有效的步骤获取成功率
            this.finalSingleSuccessRate = lastValidStep.singleSuccessRate;
        } else {
            // 如果没有有效步骤，返回null
            this.finalSingleSuccessRate = null;
        }

        // 计算最终期望成功率
        if (lastValidStep) {
            // 从最后一个未被忽略且有效的步骤获取期望成功率
            this.finalExpectedSuccessRate = lastValidStep.expectedSuccessRate;
        } else {
            // 如果没有有效步骤，返回null
            this.finalExpectedSuccessRate = null;
        }

        // 更新最终属性值
        if (lastValidStep) {
            this.finalProperties = { ...lastValidStep.currentProperties };
        } else {
            // 重置为默认属性值
            const properties = PM.properties;
            this.finalProperties = {};
            for (const propId in properties) {
                this.finalProperties[propId] = 0;
            }
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
            })),
            isIgnored: step.isIgnored
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
        // 查找最后一个未被忽略的步骤
        let lastUnignoredStep = null;
        for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
            if (!this.enchantmentSteps[i].isIgnored) {
                lastUnignoredStep = this.enchantmentSteps[i];
                break;
            }
        }

        // 如果有未被忽略的步骤，返回该步骤的属性值，否则返回空对象
        if (lastUnignoredStep) {
            return { ...lastUnignoredStep.currentProperties };
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
     * 获取最终所有属性值（取自最后一个未被忽略且有效的步骤）
     * @returns {Object} 最终属性值对象
     */
    getFinalProperties() {
        // 查找最后一个未被忽略且有效的步骤
        let lastValidStep = null;
        for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
            const step = this.enchantmentSteps[i];
            if (!step.isIgnored && step.isValid) {
                lastValidStep = step;
                break;
            }
        }

        // 如果有未被忽略且有效的步骤，返回该步骤的属性值，否则返回空对象
        if (lastValidStep) {
            return { ...lastValidStep.currentProperties };
        }

        // 返回默认属性值
        const properties = PM.properties;
        const finalProperties = {};
        for (const propId in properties) {
            finalProperties[propId] = 0;
        }
        return finalProperties;
    }

    /**
     * 获取最终指定属性值（取自最后一个未被忽略且有效的步骤）
     * @param {Object} property - 属性对象
     * @returns {number} 最终属性值
     */
    getFinalProperty(property) {
        // 返回指定属性的最终值，如果不存在则返回null
        const finalProperties = this.getFinalProperties();
        return finalProperties[property.id] || null;
    }

    /**
     * 获取所有曾经被附魔过的属性
     * @returns {Array} 曾经被附魔过的属性ID数组
     */
    getEnchantedProperties() {
        // 从最后一个步骤开始向前查找，找到最后一个有效的步骤
        for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
            const step = this.enchantmentSteps[i];
            if (!step.isIgnored && step.isValid) {
                const enchantedProperties = step.enchantedProperties;
                return Object.keys(enchantedProperties).filter(propId => enchantedProperties[propId]);
            }
        }
        
        // 如果没有找到有效的步骤，查找最后一个非忽略步骤
        for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
            const step = this.enchantmentSteps[i];
            if (!step.isIgnored) {
                const enchantedProperties = step.enchantedProperties;
                return Object.keys(enchantedProperties).filter(propId => enchantedProperties[propId]);
            }
        }
        
        // 如果所有步骤都被忽略，或者没有步骤，返回空数组
        return [];
    }

    /**
     * 检查属性是否曾经被附魔过
     * @param {Object} property - 属性对象
     * @returns {boolean} 如果属性曾经被附魔过返回true，否则返回false
     */
    isPropertyEnchanted(property) {
        // 从最后一个步骤开始向前查找，找到最后一个有效的步骤
        for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
            const step = this.enchantmentSteps[i];
            if (!step.isIgnored && step.isValid) {
                const enchantedProperties = step.enchantedProperties;
                return enchantedProperties[property.id] || false;
            }
        }
        
        // 如果没有找到有效的步骤，查找最后一个非忽略步骤
        for (let i = this.enchantmentSteps.length - 1; i >= 0; i--) {
            const step = this.enchantmentSteps[i];
            if (!step.isIgnored) {
                const enchantedProperties = step.enchantedProperties;
                return enchantedProperties[property.id] || false;
            }
        }
        
        // 如果所有步骤都被忽略，或者没有步骤，返回false
        return false;
    }

    /**
     * 导出数据为自定义编码格式
     * @returns {string} 编码后的数据字符串
     */
    exportCustomData() {
        // 版本号 - 使用字符'A'表示版本1
        let versionPrefix = 'A';
        
        let data = '';

        // 附魔名称长度 (1字节)
        const nameLength = Math.min(this.name.length, 255);
        data += String.fromCharCode(nameLength);

        // 附魔名称
        for (let i = 0; i < nameLength; i++) {
            data += String.fromCharCode(this.name.charCodeAt(i));
        }

        // 装备类型 (1字节)
        data += String.fromCharCode(this.equipmentType === EquipmentType.EQUIPMENT_TYPE_WEAPON ? 0 : 1);

        // 玩家等级 (2字节)
        const playerLevel = Math.min(Math.max(this.playerLevel, 0), 65535);
        data += String.fromCharCode((playerLevel >> 8) & 0xFF);
        data += String.fromCharCode(playerLevel & 0xFF);

        // 装备潜力 (1字节)
        const equipmentPotential = Math.min(Math.max(this.equipmentPotential, 0), 255);
        data += String.fromCharCode(equipmentPotential);

        // 锻冶熟练度 (1字节)
        const smithingLevel = Math.min(Math.max(this.smithingLevel, 0), 255);
        data += String.fromCharCode(smithingLevel);

        // 装备基础潜力 (1字节)
        const baseEquipmentPotential = Math.min(Math.max(this.baseEquipmentPotential, 0), 255);
        data += String.fromCharCode(baseEquipmentPotential);

        // 铁砧技能等级 (1字节)
        const anvilLevel = Math.min(Math.max(this.anvilLevel, 0), 255);
        data += String.fromCharCode(anvilLevel);

        // 大师级强化技术II技能等级 (1字节)
        const masterEnhancement2Level = Math.min(Math.max(this.masterEnhancement2Level, 0), 255);
        data += String.fromCharCode(masterEnhancement2Level);

        // 理解素材技能等级 (6字节)
        data += String.fromCharCode(Math.min(Math.max(this.understandingSkills.metal, 0), 255));
        data += String.fromCharCode(Math.min(Math.max(this.understandingSkills.cloth, 0), 255));
        data += String.fromCharCode(Math.min(Math.max(this.understandingSkills.beast, 0), 255));
        data += String.fromCharCode(Math.min(Math.max(this.understandingSkills.wood, 0), 255));
        data += String.fromCharCode(Math.min(Math.max(this.understandingSkills.medicine, 0), 255));
        data += String.fromCharCode(Math.min(Math.max(this.understandingSkills.mana, 0), 255));

        // 导出选中的属性列表（保持顺序）
        // 选中属性数量 (1字节)
        const selectedPropertiesCount = Math.min(this.selectedProperties.length, 8);
        data += String.fromCharCode(selectedPropertiesCount);
        
        // 选中属性ID
        for (let i = 0; i < selectedPropertiesCount; i++) {
            const propId = this.selectedProperties[i].id;
            data += String.fromCharCode(this._getPropertyIdCode(propId) & 0xFF);
        }

        // 对附魔步骤进行分组，将连续的重复步骤合并以减少数据大小
        const groupedSteps = this._groupRepeatedSteps(this.enchantmentSteps);

        // 附魔步骤组数量 (1字节)
        const groupCount = Math.min(groupedSteps.length, 255);
        data += String.fromCharCode(groupCount);

        // 附魔步骤组数据
        for (let i = 0; i < groupCount; i++) {
            const group = groupedSteps[i];
            
            // 组类型和属性数量:
            // Bit 7: 是否为重复组 (1=重复组, 0=单步组)
            // Bit 6: 是否忽略步骤
            // Bit 5-0: 属性数量 (最多63个)
            const isRepeatedGroup = group.isRepeated ? 1 : 0;
            const isIgnored = group.steps[0].isIgnored ? 1 : 0; // 使用组内第一个步骤的忽略状态
            const enchantmentCount = Math.min(group.enchantments.length, 63);
            data += String.fromCharCode((isRepeatedGroup << 7) | (isIgnored << 6) | enchantmentCount);
            
            // 如果是重复组，记录重复次数 (1字节)
            if (isRepeatedGroup) {
                const repeatCount = Math.min(group.count, 255);
                data += String.fromCharCode(repeatCount);
            }

            // 记录属性数据
            for (let j = 0; j < enchantmentCount; j++) {
                const enchant = group.enchantments[j];
                // 属性在选中列表中的索引 (1字节)
                const propertyIndex = this.selectedProperties.findIndex(prop => prop.id === enchant.property.id);
                data += String.fromCharCode(propertyIndex & 0xFF);

                // 属性值编码 (2字节，支持负数)
                const value = Math.min(Math.max(enchant.value, -32768), 32767);
                data += String.fromCharCode((value >> 8) & 0xFF);
                data += String.fromCharCode(value & 0xFF);
            }
        }

        // 使用自定义Base64编码，包含版本前缀
        return versionPrefix + this._customBase64Encode(data);
    }

    /**
     * 将连续的重复步骤分组
     * @param {Array} steps - 附魔步骤数组
     * @returns {Array} 分组后的步骤组数组
     * @private
     */
    _groupRepeatedSteps(steps) {
        if (steps.length === 0) return [];

        const groupedSteps = [];
        
        // 检查两个步骤是否具有相同的附魔变化值
        const areStepsEqual = (step1, step2) => {
            // 检查步骤忽略状态，如果忽略状态不同，则不视为重复步骤
            if (step1.isIgnored !== step2.isIgnored) {
                return false;
            }

            // 如果步骤数量不同，则不相等
            if (step1.enchantments.length !== step2.enchantments.length) {
                return false;
            }

            // 检查步骤有效性，如果有效性不同，则不视为重复步骤
            if (step1.isValid !== step2.isValid) {
                return false;
            }

            // 检查是否为空步骤（所有属性值都为0）
            const isStep1Empty = step1.enchantments.every(enchant => enchant.value === 0);
            const isStep2Empty = step2.enchantments.every(enchant => enchant.value === 0);

            // 如果其中一个是空步骤，则不视为重复步骤
            if (isStep1Empty || isStep2Empty) {
                return false;
            }

            // 检查每个附魔属性的值是否相同
            for (let i = 0; i < step1.enchantments.length; i++) {
                const enchant1 = step1.enchantments[i];
                const enchant2 = step2.enchantments[i];

                // 检查属性ID和值是否都相同
                if (enchant1.property.id !== enchant2.property.id || enchant1.value !== enchant2.value) {
                    return false;
                }
            }

            return true;
        };

        let currentGroup = {
            steps: [steps[0]],
            enchantments: steps[0].enchantments.filter(enchant => enchant.value !== 0),
            isRepeated: false,
            count: 1
        };

        for (let i = 1; i < steps.length; i++) {
            // 检查当前步骤是否与前一个步骤相同
            if (areStepsEqual(steps[i], steps[i - 1])) {
                // 相同则添加到当前组
                currentGroup.steps.push(steps[i]);
                currentGroup.count++;
                currentGroup.isRepeated = currentGroup.count > 1;
            } else {
                // 不同则结束当前组，开始新组
                groupedSteps.push(currentGroup);
                
                currentGroup = {
                    steps: [steps[i]],
                    enchantments: steps[i].enchantments.filter(enchant => enchant.value !== 0),
                    isRepeated: false,
                    count: 1
                };
            }
        }

        // 添加最后一组
        groupedSteps.push(currentGroup);

        return groupedSteps;
    }

    /**
     * 从自定义编码格式导入数据
     * @param {string} encodedData - 编码后的数据字符串
     */
    importCustomData(encodedData) {
        try {
            // 检查版本号
            if (!encodedData || encodedData.length < 1) {
                throw new Error('导入数据格式错误');
            }
            
            const version = encodedData.charAt(0);
            let data;
            
            // 根据版本号处理数据
            switch (version) {
                case 'A': // 版本A
                    // 使用自定义Base64解码，跳过版本号字符
                    data = this._customBase64Decode(encodedData.substring(1));
                    break;
                default:
                    throw new Error('不支持的数据版本');
            }
            
            let offset = 0;

            // 附魔名称长度
            const nameLength = data.charCodeAt(offset++);

            // 附魔名称
            this.name = '';
            for (let i = 0; i < nameLength; i++) {
                this.name += String.fromCharCode(data.charCodeAt(offset++));
            }

            // 装备类型
            const equipmentTypeCode = data.charCodeAt(offset++);
            this.equipmentType = equipmentTypeCode === 0 ?
                EquipmentType.EQUIPMENT_TYPE_WEAPON :
                EquipmentType.EQUIPMENT_TYPE_ARMOR;

            // 玩家等级
            const playerLevelHigh = data.charCodeAt(offset++);
            const playerLevelLow = data.charCodeAt(offset++);
            this.playerLevel = (playerLevelHigh << 8) | playerLevelLow;

            // 装备潜力
            this.equipmentPotential = data.charCodeAt(offset++);

            // 锻冶熟练度
            this.smithingLevel = data.charCodeAt(offset++);

            // 装备基础潜力
            this.baseEquipmentPotential = data.charCodeAt(offset++);

            // 铁砧技能等级
            this.anvilLevel = data.charCodeAt(offset++);

            // 大师级强化技术II技能等级
            this.masterEnhancement2Level = data.charCodeAt(offset++);

            // 理解素材技能等级
            this.understandingSkills = {
                metal: data.charCodeAt(offset++),
                cloth: data.charCodeAt(offset++),
                beast: data.charCodeAt(offset++),
                wood: data.charCodeAt(offset++),
                medicine: data.charCodeAt(offset++),
                mana: data.charCodeAt(offset++)
            };

            // 导入选中的属性列表（保持顺序）
            const selectedPropertiesCount = data.charCodeAt(offset++);
            this.selectedProperties = [];
            
            // 创建一个临时数组存储属性ID，稍后转换为属性对象
            const selectedPropertyIds = [];
            for (let i = 0; i < selectedPropertiesCount; i++) {
                const propertyIdCode = data.charCodeAt(offset++);
                const propertyId = this._getPropertyIdFromCode(propertyIdCode);
                if (propertyId !== 'Unknown') {
                    selectedPropertyIds.push(propertyId);
                }
            }

            // 将属性ID转换为属性对象
            for (const propId of selectedPropertyIds) {
                const property = PM.properties[propId];
                if (property) {
                    this.selectedProperties.push(property);
                }
            }

            // 附魔步骤组数量
            const groupCount = data.charCodeAt(offset++);

            // 附魔步骤组数据
            this.enchantmentSteps = [];
            for (let i = 0; i < groupCount; i++) {
                // 组类型和属性数量
                const groupFlag = data.charCodeAt(offset++);
                const isRepeatedGroup = (groupFlag & 128) !== 0;
                const isIgnored = (groupFlag & 64) !== 0;
                const enchantmentCount = groupFlag & 63;
                
                // 如果是重复组，读取重复次数
                let repeatCount = 1;
                if (isRepeatedGroup) {
                    repeatCount = data.charCodeAt(offset++);
                }

                // 读取属性数据构建模板步骤
                const templateStepEnchantments = [];
                for (let j = 0; j < enchantmentCount; j++) {
                    // 属性在选中列表中的索引
                    const propertyIndex = data.charCodeAt(offset++);
                    // 属性值
                    const valueHigh = data.charCodeAt(offset++);
                    const valueLow = data.charCodeAt(offset++);
                    const value = (valueHigh << 8) | valueLow;
                    // 处理负数
                    const signedValue = (value & 0x8000) ? value - 0x10000 : value;

                    // 更新对应属性的值
                    if (propertyIndex < this.selectedProperties.length) {
                        const property = this.selectedProperties[propertyIndex];
                        templateStepEnchantments.push({
                            propertyId: property.id,
                            value: signedValue
                        });
                    }
                }

                // 根据模板步骤和重复次数创建实际步骤
                for (let r = 0; r < repeatCount; r++) {
                    const step = {
                        id: this._generateStepId(),
                        enchantments: [],
                        isIgnored: isIgnored,
                        isValid: true,
                        invalidReason: null,
                        totalMaterialCosts: {
                            metal: 0,
                            cloth: 0,
                            beast: 0,
                            wood: 0,
                            medicine: 0,
                            mana: 0
                        }
                    };

                    // 初始化所有选中属性，值默认为0
                    for (const property of this.selectedProperties) {
                        step.enchantments.push({
                            property: property,
                            value: 0
                        });
                    }

                    // 应用模板步骤的属性值
                    for (const templateEnchant of templateStepEnchantments) {
                        const enchant = step.enchantments.find(e => e.property.id === templateEnchant.propertyId);
                        if (enchant) {
                            enchant.value = templateEnchant.value;
                        }
                    }

                    this.enchantmentSteps.push(step);
                }
            }

            // 重新计算所有步骤
            this._recalculateAllSteps();
        } catch (error) {
            console.error('导入自定义数据失败:', error);
            throw new Error('导入数据格式错误');
        }
    }

    /**
     * 将属性ID转换为简化代码
     * @param {string} propertyId - 属性ID
     * @returns {number} 属性ID的简化代码
     * @private
     */
    _getPropertyIdCode(propertyId) {
        // 动态生成属性ID到代码的映射
        const propertyMap = {};

        let index = 1;
        for (const id in PM.properties) {
            propertyMap[id] = index++;
        }

        return propertyMap[propertyId] || 0;
    }

    /**
     * 根据简化代码获取属性ID
     * @param {number} code - 属性ID的简化代码
     * @returns {string} 属性ID
     * @private
     */
    _getPropertyIdFromCode(code) {
        // 动态生成代码到属性ID的映射
        const codeMap = {};

        let index = 1;
        for (const id in PM.properties) {
            codeMap[index++] = id;
        }

        return codeMap[code] || 'Unknown';
    }

    /**
     * 自定义Base64编码
     * @param {string} data - 要编码的数据
     * @returns {string} 编码后的字符串
     * @private
     */
    _customBase64Encode(data) {
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;

        while (i < data.length) {
            const byte1 = data.charCodeAt(i++) & 0xFF;
            const byte2 = i < data.length ? data.charCodeAt(i++) & 0xFF : 0;
            const byte3 = i < data.length ? data.charCodeAt(i++) & 0xFF : 0;

            const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;

            result += base64Chars.charAt((bitmap >> 18) & 63);
            result += base64Chars.charAt((bitmap >> 12) & 63);
            result += (i - 1 < data.length) ? base64Chars.charAt((bitmap >> 6) & 63) : '=';
            result += (i - 2 < data.length) ? base64Chars.charAt(bitmap & 63) : '=';
        }

        return result;
    }

    /**
     * 自定义Base64编码
     * @param {string} data - 要编码的数据
     * @returns {string} 编码后的字符串
     * @private
     */
    _customBase64Encode(data) {
        // 先将字符串转换为UTF-8编码的字节数组
        const utf8Bytes = this._stringToUTF8Bytes(data);

        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;

        while (i < utf8Bytes.length) {
            const byte1 = utf8Bytes[i++];
            const byte2 = i < utf8Bytes.length ? utf8Bytes[i++] : 0;
            const byte3 = i < utf8Bytes.length ? utf8Bytes[i++] : 0;

            const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;

            result += base64Chars.charAt((bitmap >> 18) & 63);
            result += base64Chars.charAt((bitmap >> 12) & 63);
            result += (i - 1 < utf8Bytes.length) ? base64Chars.charAt((bitmap >> 6) & 63) : '=';
            result += (i - 2 < utf8Bytes.length) ? base64Chars.charAt(bitmap & 63) : '=';
        }

        return result;
    }

    /**
     * 自定义Base64解码
     * @param {string} data - 要解码的数据
     * @returns {string} 解码后的字符串
     * @private
     */
    _customBase64Decode(data) {
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;

        // 移除填充字符
        data = data.replace(/=/g, '');

        const bytes = [];
        while (i < data.length) {
            const char1 = base64Chars.indexOf(data.charAt(i++));
            const char2 = base64Chars.indexOf(data.charAt(i++));
            const char3 = (i < data.length) ? base64Chars.indexOf(data.charAt(i++)) : 0;
            const char4 = (i < data.length) ? base64Chars.indexOf(data.charAt(i++)) : 0;

            const bitmap = (char1 << 18) | (char2 << 12) | (char3 << 6) | char4;

            bytes.push((bitmap >> 16) & 0xFF);
            if (char3 !== -1) bytes.push((bitmap >> 8) & 0xFF);
            if (char4 !== -1) bytes.push(bitmap & 0xFF);
        }

        // 将UTF-8字节转换回字符串
        return this._utf8BytesToString(bytes);
    }

    /**
     * 将字符串转换为UTF-8字节数组
     * @param {string} str - 要转换的字符串
     * @returns {Array<number>} UTF-8字节数组
     * @private
     */
    _stringToUTF8Bytes(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            let charCode = str.charCodeAt(i);

            if (charCode < 0x80) {
                // 单字节字符 (0x00-0x7F)
                bytes.push(charCode);
            } else if (charCode < 0x800) {
                // 双字节字符 (0x80-0x7FF)
                bytes.push(0xC0 | (charCode >> 6));
                bytes.push(0x80 | (charCode & 0x3F));
            } else if (charCode < 0x10000) {
                // 三字节字符 (0x800-0xFFFF)
                bytes.push(0xE0 | (charCode >> 12));
                bytes.push(0x80 | ((charCode >> 6) & 0x3F));
                bytes.push(0x80 | (charCode & 0x3F));
            } else {
                // 四字节字符 (0x10000-0x10FFFF)
                bytes.push(0xF0 | (charCode >> 18));
                bytes.push(0x80 | ((charCode >> 12) & 0x3F));
                bytes.push(0x80 | ((charCode >> 6) & 0x3F));
                bytes.push(0x80 | (charCode & 0x3F));
            }
        }
        return bytes;
    }

    /**
     * 将UTF-8字节数组转换为字符串
     * @param {Array<number>} bytes - UTF-8字节数组
     * @returns {string} 转换后的字符串
     * @private
     */
    _utf8BytesToString(bytes) {
        let str = '';
        let i = 0;

        while (i < bytes.length) {
            const byte1 = bytes[i++];

            if ((byte1 & 0x80) === 0) {
                // 单字节字符
                str += String.fromCharCode(byte1);
            } else if ((byte1 & 0xE0) === 0xC0) {
                // 双字节字符
                const byte2 = bytes[i++];
                const charCode = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
                str += String.fromCharCode(charCode);
            } else if ((byte1 & 0xF0) === 0xE0) {
                // 三字节字符
                const byte2 = bytes[i++];
                const byte3 = bytes[i++];
                const charCode = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
                str += String.fromCharCode(charCode);
            } else if ((byte1 & 0xF8) === 0xF0) {
                // 四字节字符
                const byte2 = bytes[i++];
                const byte3 = bytes[i++];
                const byte4 = bytes[i++];
                let charCode = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);

                // 处理代理对
                if (charCode > 0xFFFF) {
                    charCode -= 0x10000;
                    const highSurrogate = 0xD800 | (charCode >> 10);
                    const lowSurrogate = 0xDC00 | (charCode & 0x3FF);
                    str += String.fromCharCode(highSurrogate, lowSurrogate);
                } else {
                    str += String.fromCharCode(charCode);
                }
            }
        }

        return str;
    }
}