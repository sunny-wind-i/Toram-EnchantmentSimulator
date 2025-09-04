import EnchantType from "./modules/EnchantType.js";
import { attrNumToActualNum, calAttrMaxLimit, calAttrMinLimit, calDoublePotlAttain } from "./modules/PotentialCalculator.js";
import PropertyManager from "./modules/PropertyManager.js";
import EnchantProperties from "./modules/EnchantProperties.js";

// 默认玩家等级
let playerLevel = 260;

// 更新表格函数
function updateTable() {
    // 清空现有表格内容
    $('#properties-table tbody').empty();

    // 获取所有属性
    const properties = Object.values(EnchantProperties.getProperties());

    // 填充表格数据
    properties.forEach(property => {
        const $row = $('<tr>');

        // 第一列：属性中文全名
        $row.append($('<td>').text(property.nameChsFull + (property.isPercentage ? "%" : "")));

        // 第二列：属性类型中文全名
        $row.append($('<td>').text(property.enchantType.nameChsFull));

        // 第三列：基础潜力消耗
        $row.append($('<td>').text(property.basePotentialCost));

        // 第四列：属性上限
        const maxLimit = calAttrMaxLimit(property, playerLevel);
        const actualMaxLimit = attrNumToActualNum(property, maxLimit);
        $row.append($('<td>').text(actualMaxLimit));

        // 第五列：属性下限
        const minLimit = calAttrMinLimit(property, playerLevel);
        const actualMinLimit = attrNumToActualNum(property, minLimit);
        $row.append($('<td>').text(actualMinLimit));

        // 第六列：双倍退潜潜力值
        const doublePotl = calDoublePotlAttain(property, playerLevel);
        $row.append($('<td>').text(doublePotl !== null ? doublePotl : ''));

        $('#properties-table tbody').append($row);
    });
}

$(document).ready(function () {
    // 创建玩家等级输入区域
    const $levelContainer = $('<div>').addClass('level-container');

    const $levelLabel = $('<label>').addClass('level-label').text('玩家等级: ');

    const $levelInput = $('<input>').attr({
        'type': 'number',
        'id': 'player-level',
        'min': '200',
        'step': '10',
        'value': playerLevel
    }).addClass('level-input');

    $levelContainer.append($levelLabel);
    $levelContainer.append($levelInput);

    // 将等级输入区域添加到页面
    $('body').append($levelContainer);

    // 创建表格
    const $table = $('<table>').attr('id', 'properties-table');
    const $thead = $('<thead>');
    const $tbody = $('<tbody>');

    // 创建表头
    const $headerRow = $('<tr>');
    $headerRow.append($('<th>').text('属性中文全名'));
    $headerRow.append($('<th>').text('属性类型中文全名'));
    $headerRow.append($('<th>').text('基础潜力消耗'));
    $headerRow.append($('<th>').text('属性上限'));
    $headerRow.append($('<th>').text('属性下限'));
    $headerRow.append($('<th>').text('双倍退潜潜力值'));
    $thead.append($headerRow);

    // 组装表格
    $table.append($thead);
    $table.append($tbody);

    // 将表格添加到页面
    $('body').append($table);

    // 初始填充表格
    updateTable();

    // 监听输入框变化事件（包括上下键和直接输入）
    $levelInput.on('input change', function () {
        const newLevel = parseInt($levelInput.val());
        if (!isNaN(newLevel) && newLevel >= 200) {
            playerLevel = newLevel;
            updateTable();
        }
    });

    // 上下键步进
    $levelInput.on('keydown', function (e) {
        // 阻止默认行为，防止浏览器处理上下键
        if (e.which === 38 || e.which === 40) { // 上键或下键
            e.preventDefault();

            const currentVal = parseInt($levelInput.val()) || playerLevel;
            let newVal = currentVal;

            if (e.which === 38) { // 上键
                newVal = currentVal + 10;
            } else if (e.which === 40) { // 下键
                newVal = currentVal - 10;
            }

            // 确保值大于200
            if (newVal >= 200) {
                $levelInput.val(newVal);
                playerLevel = newVal;
                updateTable();
            }
        }
    });
});