import EnchantType from "./EnchantType.js"
import PropertyManager from "./PropertyManager.js"
import EquipmentType from "./EquipmentType.js"

const PM = new PropertyManager();
const PMProperties = PM.properties;

/**
 * 将玩家等级标准化为10的倍数
 * @param {number} playerLevel - 玩家等级
 * @returns {number} 标准化后的等级（10的倍数）
 */
export const levelToStandardLevel = function (playerLevel) {
    // 使用取模运算避免浮点数精度问题
    return playerLevel - (playerLevel % 10);
}

/**
 * 将内部数据用数值转化为外部展示实际数值
 * @param {Object} enchantProperty - 属性配置对象
 * @param {Object} enchantProperty.enchantType - 属性类型
 * @param {number} enchantProperty.isNegativePossible - 是否允许负数
 * @param {number} enchantProperty.upperLimitIncreaseInterval - 超过200版本多少级增长一次，如果不增长填null
 * @param {number} enchantProperty.attenuationThreshold - 衰减阈值
 * @param {number} enchantProperty.preAttenuationIncrement - 衰减阈值前增长
 * @param {number} enchantProperty.postAttenuationIncrement - 衰减阈值后增长
 * @param {number} num - 需要转化的内部数据
 * @returns {number} 计算后的实际数值
 */
export const attrNumToActualNum = function (enchantProperty, num) {
    // 属性觉醒类型直接返回原值
    if (enchantProperty.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
        return num
    }
    // 伤害减轻类型(不允许负数)直接返回原值
    else if (enchantProperty.isNegativePossible === false) {
        return num
    }
    // 没有等级增长机制的属性类型
    else if (enchantProperty.upperLimitIncreaseInterval === null) {
        return num * enchantProperty.preAttenuationIncrement
    }
    // 有等级增长机制的属性类型(需要分正负和是否超过衰减阈值处理)
    else {
        // 正数情况
        if (num >= 0) {
            // 未超过衰减阈值
            if (num <= enchantProperty.attenuationThreshold) {
                return num * enchantProperty.preAttenuationIncrement
            }
            // 超过衰减阈值
            else {
                return enchantProperty.attenuationThreshold * enchantProperty.preAttenuationIncrement +
                    (num - enchantProperty.attenuationThreshold) * enchantProperty.postAttenuationIncrement
            }
        }
        // 负数情况
        else {
            // 未超过衰减阈值(注意负数比较逻辑)
            if (num > -enchantProperty.attenuationThreshold) {
                return num * enchantProperty.preAttenuationIncrement
            }
            // 超过衰减阈值
            else {
                return -enchantProperty.attenuationThreshold * enchantProperty.preAttenuationIncrement -
                    (-enchantProperty.attenuationThreshold - num) * enchantProperty.postAttenuationIncrement
            }
        }
    }
}

/**
 * 计算属性最大值
 * @param {Object} enchantProperty - 属性配置对象
 * @param {Object} enchantProperty.enchantType - 属性类型
 * @param {number} enchantProperty.isNegativePossible - 是否允许负数
 * @param {number} enchantProperty.upperLimitIncreaseInterval - 超过200版本多少级增长一次，如果不增长填null
 * @param {number} enchantProperty.attenuationThreshold - 衰减阈值
 * @param {number} playerLevel - 玩家等级
 * @returns {number} 计算后的最大值(内部数值，未考虑步进变化)
 */
export const calAttrMaxLimit = function (enchantProperty, playerLevel) {
    // 使用标准化等级
    const standardLevel = levelToStandardLevel(playerLevel);

    // 属性觉醒类型最大值为1
    if (enchantProperty.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
        return 1
    }
    // 伤害减轻类型(不允许负数)
    else if (enchantProperty.isNegativePossible === false) {
        // 使用toFixed防止浮点数精度问题，然后向下取整
        return Math.floor(((standardLevel - 200) / enchantProperty.upperLimitIncreaseInterval).toFixed(2))
    }
    // 没有等级增长机制的属性类型
    else if (enchantProperty.upperLimitIncreaseInterval === null) {
        return enchantProperty.attenuationThreshold
    }
    // 有等级增长机制的属性类型
    else {
        return enchantProperty.attenuationThreshold +
            Math.floor(((standardLevel - 200) / enchantProperty.upperLimitIncreaseInterval).toFixed(2))
    }
}

/**
 * 计算属性最小值
 * @param {Object} enchantProperty - 属性配置对象
 * @param {Object} enchantProperty.enchantType - 属性类型
 * @param {number} enchantProperty.isNegativePossible - 是否允许负数
 * @param {number} enchantProperty.upperLimitIncreaseInterval - 超过200版本多少级增长一次，如果不增长填null
 * @param {number} enchantProperty.lowerLimitIncreaseInterval - 负方向等级增长间隔
 * @param {number} enchantProperty.attenuationThreshold - 衰减阈值
 * @param {number} playerLevel - 玩家等级
 * @returns {number} 计算后的最小值(内部数值，未考虑步进变化)
 */
export const calAttrMinLimit = function (enchantProperty, playerLevel) {
    // 使用标准化等级
    const standardLevel = levelToStandardLevel(playerLevel);

    // 属性觉醒类型最小值为0
    if (enchantProperty.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
        return 0
    }
    // 伤害减轻类型(不允许负数)最小值为0
    else if (enchantProperty.isNegativePossible === false) {
        return 0
    }
    // 没有等级增长机制的属性类型
    else if (enchantProperty.lowerLimitIncreaseInterval === null) {
        return -enchantProperty.attenuationThreshold
    }
    // 有等级增长机制的属性类型
    else {
        return -enchantProperty.attenuationThreshold -
            Math.floor(((standardLevel - 200) / enchantProperty.lowerLimitIncreaseInterval).toFixed(2))
    }
}

/**
 * 计算双倍退潜潜力值
 * @param {Object} enchantProperty - 属性配置对象
 * @param {Object} enchantProperty.enchantType - 属性类型
 * @param {number} enchantProperty.isNegativePossible - 是否允许负数
 * @param {number} enchantProperty.upperLimitIncreaseInterval - 超过200版本多少级增长一次，如果不增长填null
 * @param {number} enchantProperty.lowerLimitIncreaseInterval - 负方向等级增长间隔
 * @param {number} enchantProperty.attenuationThreshold - 衰减阈值
 * @param {number} enchantProperty.basePotentialCost - 基础耗潜
 * @param {boolean} enchantProperty.isWeaponDoublePotential - 是否武器双倍耗潜
 * @param {boolean} enchantProperty.isArmorDoublePotential - 是否防具双倍耗潜
 * @param {number} playerLevel - 玩家等级
 * @returns {number|null} 计算后的双倍退潜潜力值，不支持双倍退潜的属性返回null
 */
export const calDoublePotlAttain = function (enchantProperty, playerLevel) {
    // 使用标准化等级
    const standardLevel = levelToStandardLevel(playerLevel);

    // 属性觉醒类型不支持双倍退潜
    if (enchantProperty.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
        return null
    }
    // 伤害减轻类型(不允许负数)不支持双倍退潜
    else if (enchantProperty.isNegativePossible === false) {
        return null
    }
    // 非双倍退潜属性不支持双倍退潜
    else if (!(enchantProperty.isWeaponDoublePotential || enchantProperty.isArmorDoublePotential)) {
        return null
    }
    // 没有等级增长机制的属性类型
    else if (enchantProperty.lowerLimitIncreaseInterval === null) {
        // 获取最小值的绝对值
        let min = Math.abs(calAttrMinLimit(enchantProperty, standardLevel))
        // 计算公式: |最小值| * 基础耗潜 * 0.305 * 2
        return Math.floor(((min * enchantProperty.basePotentialCost) * 0.305 * 2).toFixed(2))
    }
    // 有等级增长机制的属性类型(需要分段计算)
    else {
        // 获取最小值的绝对值
        let min = Math.abs(calAttrMinLimit(enchantProperty, standardLevel))
        // 分段计算公式: (衰减阈值 * 基础耗潜 + (|最小值| - 衰减阈值) * 基础耗潜 / 2) * 0.305 * 2
        return Math.floor(((enchantProperty.attenuationThreshold * enchantProperty.basePotentialCost +
            (min - enchantProperty.attenuationThreshold) * enchantProperty.basePotentialCost / 2) * 0.305 * 2).toFixed(2))
    }
}

/**
 * 计算倍率
 * @param {Array} allEnchantedProperties - 所有附魔过的属性ID数组
 * @returns {number} 倍率值
 */
export const calculateMultiplier = function (allEnchantedProperties) {
    // 根据所有附魔属性，按属性类型分组
    // enchantTypeGroups对象用于存储按enchantType分类的属性ID数组
    // 键为enchantType（转换为字符串），值为具有相同enchantType的属性ID数组
    const enchantTypeGroups = {};

    // 遍历所有附魔过的属性ID
    for (const propId of allEnchantedProperties) {
        // 获取属性详细信息
        const property = PMProperties[propId];
        // 确保属性存在
        if (property) {
            // 将属性的enchantType转换为字符串作为分组键
            const enchantType = property.enchantType.toString();
            // 如果该enchantType分组还不存在，则初始化为空数组
            if (!enchantTypeGroups[enchantType]) {
                enchantTypeGroups[enchantType] = [];
            }
            // 将当前属性ID添加到对应enchantType分组中
            enchantTypeGroups[enchantType].push(propId);
        }
    }

    // 计算倍率: 1 + 0.05 × 第1组同类项属性个数^2 + 0.05 × 第2组同类项属性个数^2 + ...
    // 初始倍率为1（基础值）
    let multiplier = 1;
    // 遍历所有enchantType分组
    for (const enchantType in enchantTypeGroups) {
        // 获取当前分组中的属性数量
        const groupSize = enchantTypeGroups[enchantType].length;
        // 只有当组内属性个数大于1时才计入倍率计算
        // 单个属性不产生倍率加成，只有相同类型的属性达到2个或以上才会产生倍率效果
        if (groupSize > 1) {
            // 倍率计算公式：每组同类型属性贡献 0.05 * (属性个数)^2 的加成
            multiplier += 0.05 * Math.pow(groupSize, 2);
        }
    }

    // console.log('倍率:', multiplier);

    return multiplier;
}

/**
 * 计算属性增加值消耗的潜力
 * @param {Object} property - 属性对象
 * @param {number} preValue - 附魔前属性值
 * @param {number} postValue - 附魔后属性值
 * @param {Object} equipmentType - 装备类型
 * @returns {number} 消耗的潜力值
 */
export const calculateIncreasePotentialCost = function (property, preValue, postValue, equipmentType) {
    // 确保是增加值的情况
    if (postValue <= preValue) return 0;

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
    return Math.trunc(cost.toFixed(2));
}

/**
 * 计算属性减少值获得的潜力
 * @param {Object} property - 属性对象
 * @param {number} preValue - 附魔前属性值
 * @param {number} postValue - 附魔后属性值
 * @param {Object} equipmentType - 装备类型
 * @returns {number} 获得的潜力值
 */
export const calculateDecreasePotentialGain = function (property, preValue, postValue, equipmentType) {
    // 确保是减少值的情况
    if (postValue >= preValue) return 0;

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
    return Math.trunc(gain.toFixed(2));
}

/**
 * 计算附魔后的潜力值
 * @param {Object} enchantmentStep - 本步附魔的内容
 * @param {Object} preEnchantmentProperties - 附魔前各属性值状态
 * @param {Object} enchantedProperties - 之前所有附过魔的属性
 * @param {number} preEnchantmentPotential - 附魔前潜力值
 * @param {Object} equipmentType - 装备类型
 * @returns {Object} 包含附魔后潜力值、潜力变化值、倍率和每条属性对潜力值的变化的对象
 */
export const calPostEnchantmentPotentialChanges = function (enchantmentStep, preEnchantmentProperties, enchantedProperties, preEnchantmentPotential, equipmentType) {
    const propertyChanges = {};

    // 获取当前步骤中所有附魔的属性ID
    const currentEnchantedPropertyIds = enchantmentStep.enchantments
        .filter(enchant => enchant.property && enchant.value !== 0)
        .map(enchant => enchant.property.id);

    // 合并之前附魔过的属性和当前步骤附魔的属性，使用Set去重
    const allEnchantedPropertyIds = [...new Set([
        ...enchantedProperties,
        ...currentEnchantedPropertyIds
    ])];

    // 计算倍率：根据所有同类项属性计算倍率
    const multiplier = calculateMultiplier(allEnchantedPropertyIds);

    // 计算总消耗/获得的潜力值
    let totalPotentialChange = 0;

    // 初始化每条属性的潜力变化值为0
    for (const propId in PM.properties) {
        propertyChanges[propId] = 0;
    }

    // 遍历当前步骤的所有附魔
    for (const enchantment of enchantmentStep.enchantments) {
        const { property, value } = enchantment;

        // 跳过无效属性或值为0的属性
        if (!property || value === 0) continue;

        // 获取附魔前该属性的值
        const preValue = preEnchantmentProperties[property.id] || 0;
        // 计算附魔后该属性的值
        const postValue = preValue + value;

        if (postValue > preValue) {
            // 属性值增加，消耗潜力
            const cost = calculateIncreasePotentialCost(property, preValue, postValue, equipmentType);
            propertyChanges[property.id] = -cost;
            totalPotentialChange -= cost;
        } else if (postValue < preValue) {
            // 属性值减少，获得潜力
            const gain = calculateDecreasePotentialGain(property, preValue, postValue, equipmentType);
            propertyChanges[property.id] = gain;
            totalPotentialChange += gain;
        }
        // 如果postValue === preValue，则没有变化，不处理
    }

    // 应用倍率并去除小数部分
    const finalPotentialChange = Math.trunc((totalPotentialChange * multiplier).toFixed(2));

    // 将propertyChanges之中各属性的潜力变化值直接乘以倍率
    for (const propId in propertyChanges) {
        propertyChanges[propId] = Math.floor((propertyChanges[propId] * multiplier) * 100 + 0.5) / 100;
    }


    // 返回附魔后潜力值、潜力变化值和倍率
    return {
        potentialChange: finalPotentialChange,
        multiplier: multiplier,
        propertyChanges: propertyChanges
    };
}


// /**
//  * 计算每条属性对潜力值的变化
//  * @param {Object} enchantmentStep - 附魔步骤对象
//  * @param {number} preEnchantmentPotential - 附魔前潜力值
//  * @param {Object} equipmentType - 装备类型
//  * @returns {Object} 每条属性对潜力值的变化
//  */
// export const calculatePropertyPotentialChanges = function (enchantmentStep, preEnchantmentPotential, equipmentType) {
//     const propertyChanges = {};

//     // 直接使用附魔步骤中已计算的倍率
//     const multiplier = enchantmentStep.multiplier;

//     // 计算每条属性的潜力变化
//     for (const enchantment of enchantmentStep.enchantments) {
//         const { property, value } = enchantment;

//         if (!property || value === 0) continue;

//         const preValue = (this.enchantmentSteps.length > 0 ?
//             this.enchantmentSteps[this.enchantmentSteps.length - 1].currentProperties :
//             this.getCurrentProperties())[property.id] || 0;
//         const postValue = preValue + value;

//         let potentialChange = 0;

//         // 根据属性值变化情况计算潜力变化
//         if (postValue > preValue) {
//             // 属性值增加，消耗潜力
//             const cost = this._calculateIncreasePotentialCost(property, preValue, postValue, equipmentType);
//             potentialChange = -cost;
//         } else if (postValue < preValue) {
//             // 属性值减少，获得潜力
//             const gain = this._calculateDecreasePotentialGain(property, preValue, postValue, equipmentType);
//             potentialChange = gain;
//         }

//         // 应用倍率
//         potentialChange = Math.trunc(potentialChange * multiplier);

//         propertyChanges[property.id] = potentialChange;
//     }

//     return propertyChanges;
// }