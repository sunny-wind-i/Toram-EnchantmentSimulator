import MaterialType from "./MaterialType.js";

/**
 * 计算单个附魔步骤的材料消耗
 * @param {Object} enchantmentStep - 附魔步骤对象
 * @param {Object} preEnchantmentProperties - 附魔前各属性值状态
 * @param {number} smithingLevel - 玩家锻冶熟练度
 * @param {Object} understandingSkills - 存储六种理解技能等级的对象
 * @returns {Object} 包含总材料消耗和每条属性材料消耗的对象
 */
export function calEnchantmentStepMaterialCost(enchantmentStep, preEnchantmentProperties, smithingLevel, understandingSkills) {
    // 初始化六种材料的消耗量
    // TODO: 验证铁砧技能对素材的影响
    const materialCosts = {
        [MaterialType.MATERIAL_TYPE_METAL.id]: 0,
        [MaterialType.MATERIAL_TYPE_CLOTH.id]: 0,
        [MaterialType.MATERIAL_TYPE_BEAST.id]: 0,
        [MaterialType.MATERIAL_TYPE_WOOD.id]: 0,
        [MaterialType.MATERIAL_TYPE_MEDICINE.id]: 0,
        [MaterialType.MATERIAL_TYPE_MANA.id]: 0
    };

    // 存储每条属性的材料消耗
    const propertyMaterialCosts = {};

    // 遍历该步骤的所有附魔属性
    for (const enchantment of enchantmentStep.enchantments) {
        const property = enchantment.property;
        const propertyId = property.id;
        const preValue = preEnchantmentProperties[propertyId] || 0;
        const postValue = preValue + enchantment.value;

        // 计算该属性的材料消耗并累加到总消耗中
        const propertyCosts = calSinglePropertyMaterialCost(
            property, preValue, postValue, smithingLevel, understandingSkills
        );

        // 将各材料消耗累加
        for (const materialId in propertyCosts) {
            materialCosts[materialId] += propertyCosts[materialId];
        }

        // 保存每条属性的材料消耗
        propertyMaterialCosts[propertyId] = {
            metal: propertyCosts[MaterialType.MATERIAL_TYPE_METAL.id],
            cloth: propertyCosts[MaterialType.MATERIAL_TYPE_CLOTH.id],
            beast: propertyCosts[MaterialType.MATERIAL_TYPE_BEAST.id],
            wood: propertyCosts[MaterialType.MATERIAL_TYPE_WOOD.id],
            medicine: propertyCosts[MaterialType.MATERIAL_TYPE_MEDICINE.id],
            mana: propertyCosts[MaterialType.MATERIAL_TYPE_MANA.id]
        };
    }

    // 将返回值从ID键改为材料名称键
    return {
        total: {
            metal: materialCosts[MaterialType.MATERIAL_TYPE_METAL.id],
            cloth: materialCosts[MaterialType.MATERIAL_TYPE_CLOTH.id],
            beast: materialCosts[MaterialType.MATERIAL_TYPE_BEAST.id],
            wood: materialCosts[MaterialType.MATERIAL_TYPE_WOOD.id],
            medicine: materialCosts[MaterialType.MATERIAL_TYPE_MEDICINE.id],
            mana: materialCosts[MaterialType.MATERIAL_TYPE_MANA.id]
        },
        perProperty: propertyMaterialCosts
    };
}

/**
 * 计算单个属性从附魔前到附魔后的材料消耗
 * @param {Object} property - 附魔属性对象
 * @param {number} preValue - 附魔前属性值
 * @param {number} postValue - 附魔后属性值
 * @param {number} smithingLevel - 玩家锻冶熟练度
 * @param {Object} understandingSkills - 理解技能等级对象
 * @returns {Object} 六种材料的素材消耗对象
 */
function calSinglePropertyMaterialCost(property, preValue, postValue, smithingLevel, understandingSkills) {
    // 初始化六种材料的消耗量
    const materialCosts = {
        [MaterialType.MATERIAL_TYPE_METAL.id]: 0,
        [MaterialType.MATERIAL_TYPE_CLOTH.id]: 0,
        [MaterialType.MATERIAL_TYPE_BEAST.id]: 0,
        [MaterialType.MATERIAL_TYPE_WOOD.id]: 0,
        [MaterialType.MATERIAL_TYPE_MEDICINE.id]: 0,
        [MaterialType.MATERIAL_TYPE_MANA.id]: 0
    };

    // 获取该属性对应的材料类型
    const materialType = property.materialType;

    // 获取基础材料消耗
    const baseMaterialCost = property.baseMaterialCost;

    // 计算锻冶熟练度减少的百分比 (每10级-1%，每50级再-1%)
    const smithingReduction = Math.floor(smithingLevel / 10) + Math.floor(smithingLevel / 50);

    // 获取对应理解技能的等级 (默认为10级)
    const understandingLevel = getUnderstandingLevelByMaterialType(understandingSkills, materialType);

    // 处理不同的附魔情况：正到正、负到负、正到负、负到正
    if (preValue >= 0 && postValue >= 0) {
        // 正到正：preValue -> postValue
        const startLevel = preValue;
        const endLevel = postValue;

        if (endLevel > startLevel) {
            // 正向增长
            for (let level = startLevel + 1; level <= endLevel; level++) {
                const layerCost = calculateLayerMaterialCost(
                    baseMaterialCost, level, smithingReduction, understandingLevel
                );
                materialCosts[materialType.id] += layerCost;
            }
        } else if (endLevel < startLevel) {
            // 负向减少
            for (let level = startLevel - 1; level >= endLevel; level--) {
                const layerCost = calculateLayerMaterialCost(
                    baseMaterialCost, level + 1, smithingReduction, understandingLevel
                );
                materialCosts[materialType.id] += layerCost;
            }
        }
        // 如果相等，则没有消耗

    } else if (preValue <= 0 && postValue <= 0) {
        // 负到负：preValue -> postValue
        const startLevel = Math.abs(preValue);
        const endLevel = Math.abs(postValue);

        if (endLevel > startLevel) {
            // 负向增长（变得更负）
            for (let level = startLevel + 1; level <= endLevel; level++) {
                const layerCost = calculateLayerMaterialCost(
                    baseMaterialCost, level, smithingReduction, understandingLevel
                );
                materialCosts[materialType.id] += layerCost;
            }
        } else if (endLevel < startLevel) {
            // 负向减少（接近0）
            for (let level = startLevel - 1; level >= endLevel; level--) {
                const layerCost = calculateLayerMaterialCost(
                    baseMaterialCost, level + 1, smithingReduction, understandingLevel
                );
                materialCosts[materialType.id] += layerCost;
            }
        }
        // 如果相等，则没有消耗

    } else if (preValue >= 0 && postValue <= 0) {
        // 正到负：preValue -> 0 -> postValue
        // 第一部分：preValue -> 0
        const startLevel = preValue;
        for (let level = startLevel - 1; level >= 0; level--) {
            const layerCost = calculateLayerMaterialCost(
                baseMaterialCost, level + 1, smithingReduction, understandingLevel
            );
            materialCosts[materialType.id] += layerCost;
        }

        // 第二部分：0 -> postValue
        const endLevel = Math.abs(postValue);
        for (let level = 1; level <= endLevel; level++) {
            const layerCost = calculateLayerMaterialCost(
                baseMaterialCost, level, smithingReduction, understandingLevel
            );
            materialCosts[materialType.id] += layerCost;
        }

    } else if (preValue <= 0 && postValue >= 0) {
        // 负到正：preValue -> 0 -> postValue
        // 第一部分：preValue -> 0
        const startLevel = Math.abs(preValue);
        for (let level = startLevel - 1; level >= 0; level--) {
            const layerCost = calculateLayerMaterialCost(
                baseMaterialCost, level + 1, smithingReduction, understandingLevel
            );
            materialCosts[materialType.id] += layerCost;
        }

        // 第二部分：0 -> postValue
        const endLevel = postValue;
        for (let level = 1; level <= endLevel; level++) {
            const layerCost = calculateLayerMaterialCost(
                baseMaterialCost, level, smithingReduction, understandingLevel
            );
            materialCosts[materialType.id] += layerCost;
        }
    }

    return materialCosts;
}

/**
 * 计算单层材料消耗
 * @param {number} baseMaterialCost - 基础材料消耗
 * @param {number} level - 层数
 * @param {number} smithingReduction - 锻冶熟练度减少百分比
 * @param {number} understandingLevel - 理解技能等级
 * @returns {number} 该层的材料消耗
 */
function calculateLayerMaterialCost(baseMaterialCost, level, smithingReduction, understandingLevel) {
    // 1. 计算原素材消耗 = [n * x^2]
    const originalCost = Math.floor((baseMaterialCost * level * level).toFixed(2));

    // 2. 计算理解素材减少后的消耗 = 原素材消耗 - [原素材消耗 * 理解技能减少百分比]
    const understandingReduction = understandingLevel * 1; // 每级减少1%
    const costAfterUnderstanding = originalCost - Math.floor((originalCost * understandingReduction / 100).toFixed(2));

    // 3. 计算锻冶熟练度减少后的消耗 = [理解素材后消耗 * (1 - 锻冶减少百分比)]
    const finalCost = Math.floor((costAfterUnderstanding * (100 - smithingReduction) / 100).toFixed(2));

    return finalCost;
}

/**
 * 根据材料类型获取对应的理解技能等级
 * @param {Object} understandingSkills - 理解技能等级对象
 * @param {Object} materialType - 材料类型
 * @returns {number} 对应的理解技能等级
 */
function getUnderstandingLevelByMaterialType(understandingSkills, materialType) {
    switch (materialType.id) {
        case MaterialType.MATERIAL_TYPE_METAL.id:
            return understandingSkills.metal || 0;
        case MaterialType.MATERIAL_TYPE_CLOTH.id:
            return understandingSkills.cloth || 0;
        case MaterialType.MATERIAL_TYPE_BEAST.id:
            return understandingSkills.beast || 0;
        case MaterialType.MATERIAL_TYPE_WOOD.id:
            return understandingSkills.wood || 0;
        case MaterialType.MATERIAL_TYPE_MEDICINE.id:
            return understandingSkills.medicine || 0;
        case MaterialType.MATERIAL_TYPE_MANA.id:
            return understandingSkills.mana || 0;
        default:
            return 0;
    }
}