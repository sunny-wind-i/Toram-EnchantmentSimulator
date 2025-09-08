/**
 * 计算成功率
 * @param {number} prePotential - 剩余潜力
 * @param {number} basePotential - 基础潜力
 * @param {number} postPotential - 最终潜力
 * @returns {number} 成功率（整数）
 */
export const calSuccessRate = function (prePotential, postPotential, basePotential) {
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