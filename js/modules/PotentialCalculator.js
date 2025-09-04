import EnchantType from "./EnchantType.js"

/**
 * 将内部数据用数值转化为外部展示实际数值
 * @param {Object} enchantProperty - 属性配置对象
 * @param {Object} enchantProperty.enchantType - 属性类型
 * @param {string} enchantProperty.nameChsFull - 中文全名
 * @param {string} enchantProperty.nameChsAbbr - 中文简称
 * @param {string} enchantProperty.nameEnFull - 英文全名
 * @param {string} enchantProperty.nameEnAbbr - 英文简称
 * @param {number} enchantProperty.isPercentage - 是否有百分号
 * @param {number} enchantProperty.isNegativePossible - 是否允许负数
 * @param {number} enchantProperty.upperLimitIncreaseInterval - 超过200版本多少级增长一次，如果不增长填null
 * @param {number} enchantProperty.lowerLimitIncreaseInterval - 同上，负方向
 * @param {number} enchantProperty.attenuationThreshold - 衰减阈值
 * @param {number} enchantProperty.basePotentialCost - 基础耗潜
 * @param {boolean} enchantProperty.isWeaponDoublePotential - 是否武器双倍耗潜
 * @param {boolean} enchantProperty.isArmorDoublePotential - 是否防具双倍耗潜
 * @param {number} enchantProperty.preAttenuationIncrement - 衰减阈值前增长
 * @param {number} enchantProperty.postAttenuationIncrement - 衰减阈值后增长
 * @param {number} enchantProperty.baseMaterial - 基础耗材
 * @param {Object} enchantProperty.materialType - 消耗材料类型
 * @param {number} num - 需要转化的内部数据
 * @returns {number} 计算后的实际数值
 */
export const attrNumToActualNum = function (enchantProperty, num) {
    //将内部数据用数值转化为外部展示实际数值，需要两个步进值
    //此外属性觉醒和伤害减轻这两个不能退，单独考虑，不用判断步进值
    // 验证enchantProperty的合法性
    if (!enchantProperty || !enchantProperty.enchantType) {
        throw new Error("Invalid enchantProperty");
    }
    if (enchantProperty.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
        // 属性觉醒
        return num
    }
    else if (enchantProperty.isNegativePossible === false) {
        // 伤害类型减轻
        return num
    }
    else if (enchantProperty.upperLimitIncreaseInterval === null) {
        //没有超过200版本属性的，直接乘以步进值
        return num * enchantProperty.preAttenuationIncrement
    }
    else {
        //剩下的是超过200版本的，可能发生变化
        //正负分开来做
        if (num >= 0) {
            //正数
            if (num <= enchantProperty.attenuationThreshold) {
                // 没越界的话，直接乘
                return num * enchantProperty.preAttenuationIncrement
            }
            else {
                // 越界的话先乘前面步进，再乘后面步进
                return enchantProperty.attenuationThreshold * enchantProperty.preAttenuationIncrement + (num - enchantProperty.attenuationThreshold) * enchantProperty.postAttenuationIncrement
            }
        }
        else {
            //负数
            if (num > -enchantProperty.attenuationThreshold) {
                // 没越界的话，直接乘
                return num * enchantProperty.preAttenuationIncrement
            }
            else {
                // 越界的话先乘前面步进，再乘后面步进
                return - enchantProperty.attenuationThreshold * enchantProperty.preAttenuationIncrement - (-enchantProperty.attenuationThreshold - num) * enchantProperty.postAttenuationIncrement
            }
        }
    }
}

/**
 * 计算最大值 输入附魔类型，以及玩家等级
 * @param {Object} enchantProperty - 属性配置对象
 * @param {Object} enchantProperty.enchantType - 属性类型
 * @param {string} enchantProperty.nameChsFull - 中文全名
 * @param {string} enchantProperty.nameChsAbbr - 中文简称
 * @param {string} enchantProperty.nameEnFull - 英文全名
 * @param {string} enchantProperty.nameEnAbbr - 英文简称
 * @param {number} enchantProperty.isPercentage - 是否有百分号
 * @param {number} enchantProperty.isNegativePossible - 是否允许负数
 * @param {number} enchantProperty.limitUpperIncreaseStep - 超过200版本多少级增长一次，如果不增长填null
 * @param {number} enchantProperty.limitLowerIncreaseStep - 同上，负方向
 * @param {number} enchantProperty.attenuationThreshold - 衰减阈值
 * @param {number} enchantProperty.basePotentialCost - 基础耗潜
 * @param {boolean} enchantProperty.isWeaponDoublePotential - 是否武器双倍耗潜
 * @param {boolean} enchantProperty.isArmorDoublePotential - 是否防具双倍耗潜
 * @param {number} enchantProperty.preAttenuationIncrement - 衰减阈值前增长
 * @param {number} enchantProperty.postAttenuationIncrement - 衰减阈值后增长
 * @param {number} enchantProperty.baseMaterial - 基础耗材
 * @param {Object} enchantProperty.materialType - 消耗材料类型
 * @param {number} playerLevel - 玩家等级
 * @returns {number} 计算后的实际数值
 */
export const calAttrMaxLimit = function (enchantProperty, playerLevel) {
    // 注意此处的输出是不考虑步进变化的值
    // 单独考虑：伤害类型减轻、属性觉醒
    // TODO:之后要做一张表检查是否有问题
    if (enchantProperty.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
        // 属性觉醒
        return 1
    }
    else if (enchantProperty.isNegativePossible === false) {
        // 伤害类型减轻
        // tofixed防精度丢失
        return Math.floor(((playerLevel - 200) / enchantProperty.upperLimitIncreaseInterval).toFixed(2))
    }
    else if (enchantProperty.upperLimitIncreaseInterval === null) {
        //没有超过200版本属性的
        return enchantProperty.attenuationThreshold
    }
    else {
        return enchantProperty.attenuationThreshold + Math.floor(((playerLevel - 200) / enchantProperty.upperLimitIncreaseInterval).toFixed(2))
    }
}


/**
 * 计算最小值 输入附魔类型，以及玩家等级
 * @param {Object} enchantProperty - 属性配置对象
 * @param {Object} enchantProperty.enchantType - 属性类型
 * @param {string} enchantProperty.nameChsFull - 中文全名
 * @param {string} enchantProperty.nameChsAbbr - 中文简称
 * @param {string} enchantProperty.nameEnFull - 英文全名
 * @param {string} enchantProperty.nameEnAbbr - 英文简称
 * @param {number} enchantProperty.isPercentage - 是否有百分号
 * @param {number} enchantProperty.isNegativePossible - 是否允许负数
 * @param {number} enchantProperty.upperLimitIncreaseInterval - 超过200版本多少级增长一次，如果不增长填null
 * @param {number} enchantProperty.lowerLimitIncreaseInterval - 同上，负方向
 * @param {number} enchantProperty.attenuationThreshold - 衰减阈值
 * @param {number} enchantProperty.basePotentialCost - 基础耗潜
 * @param {boolean} enchantProperty.isWeaponDoublePotential - 是否武器双倍耗潜
 * @param {boolean} enchantProperty.isArmorDoublePotential - 是否防具双倍耗潜
 * @param {number} enchantProperty.preAttenuationIncrement - 衰减阈值前增长
 * @param {number} enchantProperty.postAttenuationIncrement - 衰减阈值后增长
 * @param {number} enchantProperty.baseMaterial - 基础耗材
 * @param {Object} enchantProperty.materialType - 消耗材料类型
 * @param {number} playerLevel - 玩家等级
 * @returns {number} 计算后的实际数值
 */
export const calAttrMinLimit = function (enchantProperty, playerLevel) {
    // 计算最小值 输入附魔类型，以及玩家等级
    // 注意此处的输出是不考虑步进变化的值
    // 单独考虑：伤害类型减轻、属性觉醒
    if (enchantProperty.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
        // 属性觉醒
        return 0
    }
    else if (enchantProperty.isNegativePossible === false) {
        // 伤害类型减轻
        return 0
    }
    else if (enchantProperty.lowerLimitIncreaseInterval === null) {
        //没有超过200版本属性的
        return - enchantProperty.attenuationThreshold
    }
    else {
        return - enchantProperty.attenuationThreshold - Math.floor(((playerLevel - 200) / enchantProperty.lowerLimitIncreaseInterval).toFixed(2))
    }
}

/**
 * 计算双倍退潜潜力值
 * @param {Object} enchantProperty - 属性配置对象
 * @param {Object} enchantProperty.enchantType - 属性类型
 * @param {string} enchantProperty.nameChsFull - 中文全名
 * @param {string} enchantProperty.nameChsAbbr - 中文简称
 * @param {string} enchantProperty.nameEnFull - 英文全名
 * @param {string} enchantProperty.nameEnAbbr - 英文简称
 * @param {number} enchantProperty.isPercentage - 是否有百分号
 * @param {number} enchantProperty.isNegativePossible - 是否允许负数
 * @param {number} enchantProperty.upperLimitIncreaseInterval - 超过200版本多少级增长一次，如果不增长填null
 * @param {number} enchantProperty.lowerLimitIncreaseInterval - 同上，负方向
 * @param {number} enchantProperty.attenuationThreshold - 衰减阈值
 * @param {number} enchantProperty.basePotentialCost - 基础耗潜
 * @param {boolean} enchantProperty.isWeaponDoublePotential - 是否武器双倍耗潜
 * @param {boolean} enchantProperty.isArmorDoublePotential - 是否防具双倍耗潜
 * @param {number} enchantProperty.preAttenuationIncrement - 衰减阈值前增长
 * @param {number} enchantProperty.postAttenuationIncrement - 衰减阈值后增长
 * @param {number} enchantProperty.baseMaterial - 基础耗材
 * @param {Object} enchantProperty.materialType - 消耗材料类型
 * @param {number} playerLevel - 玩家等级
 * @returns {number} 计算后的实际数值
 */
export const calDoublePotlAttain = function (enchantProperty, playerLevel) {
    // 计算双倍退潜潜力值
    // 单独考虑：伤害类型减轻、属性觉醒
    if (enchantProperty.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
        // 属性觉醒
        return null
    }
    else if (enchantProperty.isNegativePossible === false) {
        // 伤害类型减轻
        return null
    }
    else if (!(enchantProperty.isWeaponDoublePotential || enchantProperty.isArmorDoublePotential)) {
        // 不是双倍耗潜/退潜的的，
        return null
    }
    else if (enchantProperty.lowerLimitIncreaseInterval === null) {
        //没有超过200版本属性的，直接乘基础耗潜
        let min = Math.abs(calAttrMinLimit(enchantProperty, playerLevel))
        return Math.floor(((min * enchantProperty.basePotentialCost) * 0.305 * 2).toFixed(2))
    }
    else {
        //超过200版本属性的，分段计算
        let min = Math.abs(calAttrMinLimit(enchantProperty, playerLevel))
        return Math.floor(((enchantProperty.attenuationThreshold * enchantProperty.basePotentialCost + (min - enchantProperty.attenuationThreshold) * enchantProperty.basePotentialCost / 2) * 0.305 * 2).toFixed(2))
    }
}