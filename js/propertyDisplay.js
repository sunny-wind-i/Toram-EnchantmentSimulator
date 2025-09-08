import { attrNumToActualNum, calAttrMaxLimit, calAttrMinLimit, calDoublePotlAttain } from "./modules/PotentialCalculator.js";
import PropertyManager from "./modules/PropertyManager.js";

// 默认玩家等级
let playerLevel = 290;
const PM = new PropertyManager();

// 更新表格函数
function updateTable() {
    // 清空现有表格内容
    $('#properties-table tbody').empty();

    // 获取所有属性
    const properties = PM.getAllProperties();

    // 用于跟踪当前附魔类型，以便交替背景色
    let currentEnchantType = null;
    let isLightBackground = true;

    // 填充表格数据
    properties.forEach(property => {
        const $row = $('<tr>');
        // 1 $headerRow.append($('<th>').text('附魔类型'));
        // 2 $headerRow.append($('<th>').text('中文全名'));
        // 3 $headerRow.append($('<th>').text('属性下限'));
        // 4 $headerRow.append($('<th>').text('属性上限'));
        // 5 $headerRow.append($('<th>').text('衰减阈值'));
        // 6 $headerRow.append($('<th>').text('步进1'));
        // 7 $headerRow.append($('<th>').text('步进2'));
        // 8 $headerRow.append($('<th>').text('基础耗潜'));
        // 9 $headerRow.append($('<th>').text('双倍潜力'));
        // 10 $headerRow.append($('<th>').text('双倍退潜值'));
        // 11 $headerRow.append($('<th>').text('基础耗材'));
        // 12 $headerRow.append($('<th>').text('素材类型'));

        // 检查附魔类型是否改变，如果改变则切换背景色
        if (currentEnchantType !== property.enchantType.nameChsFull) {
            currentEnchantType = property.enchantType.nameChsFull;
            isLightBackground = !isLightBackground;
        }

        // 根据附魔类型设置不同的背景颜色
        if (isLightBackground) {
            $row.addClass('light-background');
        } else {
            $row.addClass('dark-background');
        }

        // 第一列：附魔类型
        $row.append($('<td>').text(property.enchantType.nameChsFull));

        // 第二列：属性类型中文全名
        $row.append($('<td>').text(property.nameChsFull + (property.isPercentage ? "%" : "")));

        // 第三列：属性下限
        const minLimit = calAttrMinLimit(property, playerLevel);
        const actualMinLimit = attrNumToActualNum(property, minLimit);
        $row.append($('<td>').text(actualMinLimit));

        // 第四列：属性上限
        const maxLimit = calAttrMaxLimit(property, playerLevel);
        const actualMaxLimit = attrNumToActualNum(property, maxLimit);
        $row.append($('<td>').text(actualMaxLimit));

        // 第五列：衰减阈值
        const actualAttenuationThreshold = attrNumToActualNum(property, property.attenuationThreshold);
        $row.append($('<td>').text(actualAttenuationThreshold));

        // 第六列：200级以下步进值
        $row.append($('<td>').text(property.preAttenuationIncrement));

        // 第七列：200级以上步进值
        $row.append($('<td>').text(property.postAttenuationIncrement));

        // 第八列：基础潜力消耗
        $row.append($('<td>').text(property.basePotentialCost));

        // 第九列：双倍耗潜部位
        $row.append($('<td>').text(property.isWeaponDoublePotential ? "武器" : property.isArmorDoublePotential ? "身体装备" : ""));

        // 第十列：双倍退潜潜力值
        const doublePotl = calDoublePotlAttain(property, playerLevel);
        $row.append($('<td>').text(doublePotl !== null ? doublePotl : ''));

        // 第十一列：基础耗材
        $row.append($('<td>').text(property.baseMaterialCost));

        // 第十二列：素材类型
        $row.append($('<td>').text(property.materialType.nameChsFull));

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
    $headerRow.append($('<th>').text('附魔类型'));
    $headerRow.append($('<th>').text('中文全名'));
    $headerRow.append($('<th>').text('属性下限'));
    $headerRow.append($('<th>').text('属性上限'));
    $headerRow.append($('<th>').text('衰减阈值'));
    $headerRow.append($('<th>').text('步进1'));
    $headerRow.append($('<th>').text('步进2'));
    $headerRow.append($('<th>').text('基础耗潜'));
    $headerRow.append($('<th>').text('双倍潜力'));
    $headerRow.append($('<th>').text('双倍退潜值'));
    $headerRow.append($('<th>').text('基础耗材'));
    $headerRow.append($('<th>').text('素材类型'));
    $thead.append($headerRow);

    // 组装表格
    $table.append($thead);
    $table.append($tbody);

    // 将表格添加到页面
    $('body').append($table);

    // 添加CSS样式用于区分不同附魔类型的背景色
    $('<style>').prop('type', 'text/css').html(`
        .light-background {
            background-color: #f8f9fa;
        }
        .dark-background {
            background-color: #e9ecef;
        }
        #properties-table {
            border-collapse: collapse;
            width: 100%;
        }
        .level-container {
            margin-bottom: 20px;
        }
        .level-label {
            margin-right: 10px;
        }
        .level-input {
            padding: 5px;
        }
    `).appendTo('head');

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