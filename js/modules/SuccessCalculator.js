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
 * @private
 * @param {number} successRate - 单次成功率
 * @param {Object} enchantmentStep - 附魔步骤对象
 * @returns {number} 期望成功率
 */
export const calExpectedSuccessRate = (successRate, enchantmentStep) => {
    // TODO: 实现期望成功率计算逻辑
    // 这里暂时返回单次成功率，后续需要根据具体需求完善
    return successRate;
}