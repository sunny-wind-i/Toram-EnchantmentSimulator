import EnchantType from "./EnchantType.js"

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
        let min = Math.abs(calAttrMinLimit(enchantProperty, playerLevel))
        // 计算公式: |最小值| * 基础耗潜 * 0.305 * 2
        return Math.floor(((min * enchantProperty.basePotentialCost) * 0.305 * 2).toFixed(2))
    }
    // 有等级增长机制的属性类型(需要分段计算)
    else {
        // 获取最小值的绝对值
        let min = Math.abs(calAttrMinLimit(enchantProperty, playerLevel))
        // 分段计算公式: (衰减阈值 * 基础耗潜 + (|最小值| - 衰减阈值) * 基础耗潜 / 2) * 0.305 * 2
        return Math.floor(((enchantProperty.attenuationThreshold * enchantProperty.basePotentialCost +
            (min - enchantProperty.attenuationThreshold) * enchantProperty.basePotentialCost / 2) * 0.305 * 2).toFixed(2))
    }
}