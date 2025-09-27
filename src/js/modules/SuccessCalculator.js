/**
 * 计算成功率
 * @param {number} prePotential - 剩余潜力
 * @param {number} postPotential - 最终潜力
 * @param {number} basePotential - 基础潜力
 * @returns {number} 成功率（整数）
 */
export const calSingleSuccessRate = function (prePotential, postPotential, basePotential) {
    let successRate;

    // 判断剩余潜力是否小于基础潜力
    if (prePotential < basePotential) {
        // 情况2: 剩余潜力＜基础潜力
        successRate = 160 + 230 / basePotential * postPotential;
    } else {
        // 情况1: 正常情况
        successRate = 160 + 230 / prePotential * postPotential;
    }

    // 结果取整数
    return Math.floor(successRate);
}

/**
 * 计算期望成功率
 * @param {number} singleSuccessRate - 单次成功率（百分号前的数字）
 * @param {Object} currentProperties - 当前所有属性值
 * @param {Object} enchantmentStep - 当前附魔步骤
 * @param {number} masterEnhancement2Level - 大师级强化技术2等级
 * @returns {number} 期望成功率（百分号前的数字，需要乘以100输出）
 */
export const calExpectedSuccessRate = (singleSuccessRate, currentProperties, enchantmentStep, masterEnhancement2Level) => {
    // 创建包含当前步骤属性的完整属性列表
    const propertiesWithCurrentStep = { ...currentProperties };

    // 只有当步骤有效且未被忽略时才应用附魔
    if (enchantmentStep.isValid && !enchantmentStep.isIgnored) {
        for (const enchantment of enchantmentStep.enchantments) {
            if (enchantment.property && propertiesWithCurrentStep.hasOwnProperty(enchantment.property.id)) {
                propertiesWithCurrentStep[enchantment.property.id] += enchantment.value;
            }
        }
    }

    // 统计所有正属性和负属性的数量
    let positiveCount = 0;
    let negativeCount = 0;

    for (const propId in propertiesWithCurrentStep) {
        const value = propertiesWithCurrentStep[propId];
        if (value > 0) {
            positiveCount++;
        } else if (value <= 0) {
            negativeCount++;
        }
    }

    // 特殊情况：如果没有正属性且存在负属性（所有属性都是负属性或者0值属性），期望成功率为100%
    if (positiveCount === 0 && negativeCount > 0) {
        return 100;
    }

    // 如果没有正属性且没有负属性（全是0值属性），期望成功率为0
    if (positiveCount === 0) {
        return 0;
    }

    // 处理大师级强化技术2技能等级为10的情况（第一条正属性必定强制成功）
    let calculatedPositiveCount = positiveCount;
    if (masterEnhancement2Level === 10) {
        // 第一条正属性必定成功，所以只需要计算剩下的正属性
        calculatedPositiveCount = Math.max(0, positiveCount - 1);
    }

    // 将单条成功率从百分号前的数字转换为小数形式
    const singleSuccessRateDecimal = singleSuccessRate / 100;

    // 期望成功率 = (单条成功率)^正属性条数
    const expectedSuccessRateDecimal = Math.pow(singleSuccessRateDecimal, calculatedPositiveCount);

    // 转换回百分号前的数字形式并返回
    // 如果大于100，则取100
    return Math.min(100, expectedSuccessRateDecimal * 100);
}