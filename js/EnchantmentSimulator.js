import EnchantRecord from "./modules/EnchantRecord.js";
import PropertyManager from "./modules/PropertyManager.js";
import EquipmentType from "./modules/EquipmentType.js";
import EnchantType from "./modules/EnchantType.js";

// 全局变量
let enchantRecord = null;
let propertyManager = null;
let selectedProperties = [];
let currentViewMode = 'change'; // change, value, potential, material
let selectedCell = null;
let currentQuantity = 1;
let copiedStep = null;

// 初始化
document.addEventListener('DOMContentLoaded', function () {
    propertyManager = new PropertyManager();

    // 初始化附魔记录
    initializeEnchantRecord();

    // 绑定事件
    bindEvents();

    // 更新显示
    updateDisplay();
});

// 初始化附魔记录
function initializeEnchantRecord() {
    const config = {
        equipmentType: EquipmentType.EQUIPMENT_TYPE_WEAPON,
        playerLevel: 290,
        equipmentPotential: 100,
        baseEquipmentPotential: 1,
        smithingLevel: 0,
        anvilLevel: 40,
        masterEnhancement2Level: 10,
        understandingSkills: {
            metal: 0,
            cloth: 0,
            beast: 0,
            wood: 0,
            medicine: 0,
            mana: 0
        }
    };

    enchantRecord = new EnchantRecord(config);
}

// 绑定事件
function bindEvents() {
    // 基础信息事件
    document.getElementById('equipmentType').addEventListener('change', onEquipmentTypeChange);
    document.getElementById('playerLevel').addEventListener('change', onPlayerLevelChange);
    document.getElementById('equipmentPotential').addEventListener('change', onEquipmentPotentialChange);
    document.getElementById('smithingLevel').addEventListener('change', onSmithingLevelChange);

    // 更多配置事件
    document.getElementById('moreConfigBtn').addEventListener('click', showMoreConfig);
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
    document.querySelector('#moreConfigModal .close').addEventListener('click', closeMoreConfig);

    // 属性选择事件
    document.getElementById('selectPropertiesBtn').addEventListener('click', showPropertySelection);
    document.getElementById('confirmPropertiesBtn').addEventListener('click', confirmProperties);
    document.querySelector('#propertySelectionModal .close').addEventListener('click', closePropertySelection);

    // 属性分类展开/收起和复选框事件
    document.querySelectorAll('#propertyCategoryList .property-category-header').forEach(header => {
        header.addEventListener('click', function () {
            const categoryContent = this.nextElementSibling;
            categoryContent.classList.toggle('expanded');
            const toggleSymbol = this.querySelector('span:last-child');
            toggleSymbol.textContent = categoryContent.classList.contains('expanded') ? '−' : '+';
        });
    });

    // 为复选框添加事件监听器
    document.querySelectorAll('#propertyCategoryList input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', onPropertyCheckboxChange);
    });

    // 表格事件
    document.getElementById('enchantTable').addEventListener('click', onTableClick);

    // 悬浮工具栏事件
    document.getElementById('addStepBtn').addEventListener('click', onAddStep);
    document.getElementById('subtractStepBtn').addEventListener('click', onSubtractStep);
    document.getElementById('quantity1Btn').addEventListener('click', () => setQuantity(1));
    document.getElementById('quantity5Btn').addEventListener('click', () => setQuantity(5));
    document.getElementById('quantityMaxBtn').addEventListener('click', () => setQuantity('max'));
    document.getElementById('operationMenuBtn').addEventListener('click', showOperationMenu);
    document.getElementById('switchViewBtn').addEventListener('click', switchViewMode);
    document.querySelector('#operationMenuModal .close').addEventListener('click', closeOperationMenu);

    // 操作菜单事件
    document.getElementById('undoBtn').addEventListener('click', undoStep);
    document.getElementById('clearBtn').addEventListener('click', clearStep);
    document.getElementById('addStepMenuBtn').addEventListener('click', addStepMenu);
    document.getElementById('copyStepBtn').addEventListener('click', copyStep);
    document.getElementById('pasteStepBtn').addEventListener('click', pasteStep);

    // 结果展示事件
    document.getElementById('copyResultBtn').addEventListener('click', copyResult);

    // 点击非模态框区域关闭模态框
    window.addEventListener('click', function (event) {
        const moreConfigModal = document.getElementById('moreConfigModal');
        const operationMenuModal = document.getElementById('operationMenuModal');

        if (event.target === moreConfigModal) {
            closeMoreConfig();
        }

        if (event.target === operationMenuModal) {
            closeOperationMenu();
        }
    });
}

// 加载属性分类列表
function loadPropertyCategoryList() {
    const categoryList = document.getElementById('propertyCategoryList');
    categoryList.innerHTML = '';

    // 获取所有附魔类型
    const enchantTypes = [
        EnchantType.ENCHANT_TYPE_ABILITY,
        EnchantType.ENCHANT_TYPE_HPMP,
        EnchantType.ENCHANT_TYPE_ATK,
        EnchantType.ENCHANT_TYPE_DEF,
        EnchantType.ENCHANT_TYPE_HIT,
        EnchantType.ENCHANT_TYPE_FLEE,
        EnchantType.ENCHANT_TYPE_SPEED,
        EnchantType.ENCHANT_TYPE_CRITICAL,
        EnchantType.ENCHANT_TYPE_ELEMENT,
        EnchantType.ENCHANT_TYPE_SPECIAL,
        EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION
    ];

    const allProperties = propertyManager.getAllProperties();

    enchantTypes.forEach(type => {
        // 筛选出该类型的所有属性
        const propertiesOfType = allProperties.filter(prop => prop.enchantType.id === type.id);

        if (propertiesOfType.length > 0) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'property-category';

            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'property-category-header';
            categoryHeader.innerHTML = `
                <span>${type.nameChsFull}</span>
                <span>+</span>
            `;

            const categoryContent = document.createElement('div');
            categoryContent.className = 'property-category-content';

            const propertyList = document.createElement('div');
            propertyList.className = 'property-list';

            propertiesOfType.forEach(property => {
                const propertyItem = document.createElement('div');
                propertyItem.className = 'property-item';
                propertyItem.innerHTML = `
                    <input type="checkbox" id="prop_${property.id}" data-property-id="${property.id}">
                    <label for="prop_${property.id}">${property.nameChsFull}${property.isPercentage ? '(%)' : ''}</label>
                `;
                propertyList.appendChild(propertyItem);
            });

            categoryContent.appendChild(propertyList);
            categoryDiv.appendChild(categoryHeader);
            categoryDiv.appendChild(categoryContent);
            categoryList.appendChild(categoryDiv);

            // 绑定展开/收起事件
            categoryHeader.addEventListener('click', function () {
                categoryContent.classList.toggle('expanded');
                const toggleSymbol = this.querySelector('span:last-child');
                toggleSymbol.textContent = categoryContent.classList.contains('expanded') ? '−' : '+';
            });
        }
    });

    // 绑定复选框事件
    setTimeout(() => {
        document.querySelectorAll('#propertyCategoryList input[type="checkbox"]').forEach(checkbox => {
            checkbox.removeEventListener('change', onPropertyCheckboxChange);
            checkbox.addEventListener('change', onPropertyCheckboxChange);
        });
    }, 0);
}

// 属性复选框变化事件
function onPropertyCheckboxChange(event) {
    const checkbox = event.target;
    const propertyId = checkbox.dataset.propertyId;
    const property = propertyManager.getProperty(propertyId);

    if (checkbox.checked) {
        // 检查属性是否已经选择
        const isAlreadySelected = selectedProperties.some(p => p.id === propertyId);

        // 添加到已选择属性
        if (!isAlreadySelected && selectedProperties.length < 8) {
            selectedProperties.push(property);
        } else if (!isAlreadySelected) {
            // 超过8个，取消选择
            checkbox.checked = false;
            alert('最多只能选择8个属性');
            return;
        }
    } else {
        // 从已选择属性中移除
        const index = selectedProperties.findIndex(p => p.id === propertyId);
        if (index !== -1) {
            selectedProperties.splice(index, 1);
        }
    }

    // 更新已选择属性显示
    updateSelectedPropertiesDisplay();
}

// 更新表格头部
function updateTableHeader() {
    const thead = document.querySelector('#enchantTable thead tr');
    thead.innerHTML = '<th>潜力</th>';

    selectedProperties.forEach(property => {
        const th = document.createElement('th');
        th.textContent = `${property.nameChsAbbr}${property.isPercentage ? '(%)' : ''}`;
        thead.appendChild(th);
    });
}

// 显示属性选择弹窗
function showPropertySelection() {
    // 加载属性分类列表
    loadPropertyCategoryList();

    // 恢复之前的选择状态
    setTimeout(() => {
        restorePreviousSelections();
    }, 10);

    // 显示弹窗
    document.getElementById('propertySelectionModal').classList.remove('hidden');
}

// 关闭属性选择弹窗
function closePropertySelection() {
    document.getElementById('propertySelectionModal').classList.add('hidden');
}

// 恢复之前的选择状态
function restorePreviousSelections() {
    // 为已选择的属性勾选复选框
    selectedProperties.forEach(property => {
        const checkbox = document.querySelector(`#prop_${property.id}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });

    // 更新已选择属性显示
    updateSelectedPropertiesDisplay();
}

// 确认属性选择
function confirmProperties() {
    // 保存当前步骤数据
    const previousSteps = JSON.parse(JSON.stringify(enchantRecord.enchantmentSteps.map(step => ({
        id: step.id,
        enchantments: step.enchantments.map(enchant => ({
            propertyId: enchant.property.id,
            value: enchant.value
        }))
    }))));
    
    // 更新表格头部
    updateTableHeader();

    // 重新创建步骤，保持原有数据
    if (previousSteps.length > 0) {
        // 清空现有步骤
        while (enchantRecord.enchantmentSteps.length > 0) {
            const lastStep = enchantRecord.enchantmentSteps[enchantRecord.enchantmentSteps.length - 1];
            enchantRecord.removeEnchantmentStep(lastStep.id);
        }
        
        // 重新添加步骤
        previousSteps.forEach(stepData => {
            const newStep = {
                id: stepData.id,
                enchantments: selectedProperties.map(property => {
                    // 查找原有数据
                    const existingEnchant = stepData.enchantments.find(e => e.propertyId === property.id);
                    return {
                        property: property,
                        value: existingEnchant ? existingEnchant.value : 0
                    };
                })
            };
            enchantRecord.addEnchantmentStep(newStep);
        });
    }

    // 更新显示
    updateDisplay();

    // 关闭弹窗
    closePropertySelection();
}

// 更新已选择属性显示
function updateSelectedPropertiesDisplay() {
    const selectedCountElement = document.getElementById('selectedCount');
    const selectedPropertiesDisplay = document.getElementById('selectedPropertiesDisplay');

    selectedCountElement.textContent = selectedProperties.length;

    selectedPropertiesDisplay.innerHTML = '';
    selectedProperties.forEach((property, index) => {
        const tag = document.createElement('div');
        tag.className = 'selected-property-tag';
        tag.innerHTML = `
            ${property.nameChsFull}${property.isPercentage ? '(%)' : ''}
            <span class="move-property-left" data-index="${index}">◀</span>
            <span class="move-property-right" data-index="${index}">▶</span>
            <span class="remove-property" data-property-id="${property.id}">×</span>
        `;
        selectedPropertiesDisplay.appendChild(tag);
    });

    // 绑定移除事件
    document.querySelectorAll('.remove-property').forEach(button => {
        button.addEventListener('click', function () {
            const propertyId = this.dataset.propertyId;
            // 取消对应的复选框选择
            const checkbox = document.querySelector(`#prop_${propertyId}`);
            if (checkbox) {
                checkbox.checked = false;
            }

            // 从已选择属性中移除
            const index = selectedProperties.findIndex(p => p.id === propertyId);
            if (index !== -1) {
                selectedProperties.splice(index, 1);
                updateSelectedPropertiesDisplay();
            }
        });
    });

    // 绑定左移事件
    document.querySelectorAll('.move-property-left').forEach(button => {
        button.addEventListener('click', function () {
            const index = parseInt(this.dataset.index);
            if (index > 0) {
                // 交换位置
                [selectedProperties[index], selectedProperties[index - 1]] =
                    [selectedProperties[index - 1], selectedProperties[index]];
                updateSelectedPropertiesDisplay();
            }
        });
    });

    // 绑定右移事件
    document.querySelectorAll('.move-property-right').forEach(button => {
        button.addEventListener('click', function () {
            const index = parseInt(this.dataset.index);
            if (index < selectedProperties.length - 1) {
                // 交换位置
                [selectedProperties[index], selectedProperties[index + 1]] =
                    [selectedProperties[index + 1], selectedProperties[index]];
                updateSelectedPropertiesDisplay();
            }
        });
    });
}

// 更新显示
function updateDisplay() {
    updateTableContent();
    updateSuccessRate();
    updateResultDisplay();
}

// 更新表格内容
function updateTableContent() {
    // 保存当前选中的单元格信息
    let selectedCellInfo = null;
    if (selectedCell) {
        selectedCellInfo = {
            stepIndex: selectedCell.dataset.stepIndex,
            propertyId: selectedCell.dataset.propertyId,
            columnType: selectedCell.dataset.columnType
        };
    }

    const tbody = document.querySelector('#enchantTable tbody');
    tbody.innerHTML = '';

    // 现有步骤行
    enchantRecord.enchantmentSteps.forEach((step, index) => {
        const row = document.createElement('tr');

        // 潜力值列
        const potentialCell = document.createElement('td');
        potentialCell.textContent = step.postEnchantmentPotential;
        potentialCell.dataset.stepIndex = index;
        potentialCell.dataset.columnType = 'potential';
        row.appendChild(potentialCell);

        // 属性列
        selectedProperties.forEach(property => {
            const cell = document.createElement('td');
            cell.dataset.stepIndex = index;
            cell.dataset.propertyId = property.id;

            switch (currentViewMode) {
                case 'change':
                    // 显示属性变化值
                    const enchantment = step.enchantments.find(e => e.property.id === property.id);
                    // 只有当属性值不为0时才显示
                    if (enchantment && enchantment.value !== 0) {
                        const value = enchantment.value;
                        cell.textContent = value > 0 ? `+${value}` : value.toString();
                    } else {
                        cell.textContent = '';
                    }
                    break;
                case 'value':
                    // 显示附魔后的属性值
                    const currentValue = step.currentProperties[property.id] || 0;
                    // 只有当属性值不为0时才显示
                    if (currentValue !== 0) {
                        cell.textContent = currentValue;
                    } else {
                        cell.textContent = '';
                    }
                    break;
                case 'potential':
                    // 显示各属性消耗潜力
                    const potentialChange = step.propertyPotentialChanges[property.id] || 0;
                    // 只有当潜力变化不为0时才显示
                    if (potentialChange !== 0) {
                        cell.textContent = potentialChange > 0 ? `+${potentialChange}` : potentialChange.toString();
                    } else {
                        cell.textContent = '';
                    }
                    break;
                case 'material':
                    // 显示各属性消耗素材
                    const materialCost = step.propertyMaterialCosts[property.id] || 0;
                    // 只有当素材消耗不为0时才显示
                    if (materialCost !== 0) {
                        // 如果是对象，提取其中的值显示
                        if (typeof materialCost === 'object') {
                            const materialValues = [];
                            for (const key in materialCost) {
                                if (materialCost[key] !== 0) {
                                    materialValues.push(`${key}:${materialCost[key]}`);
                                }
                            }
                            cell.textContent = materialValues.length > 0 ? materialValues.join(', ') : '';
                        } else {
                            cell.textContent = materialCost;
                        }
                    } else {
                        cell.textContent = '';
                    }
                    break;
            }

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    // 添加新步骤按钮行（移到最后）
    const addRow = document.createElement('tr');
    const addCell = document.createElement('td');
    addCell.colSpan = selectedProperties.length + 1;
    addCell.textContent = '+ 添加新步骤';
    addCell.style.textAlign = 'center';
    addCell.style.cursor = 'pointer';
    addCell.addEventListener('click', addNewStep);
    addRow.appendChild(addCell);
    tbody.appendChild(addRow);

    // 恢复选中状态
    if (selectedCellInfo) {
        const cells = tbody.querySelectorAll('td');
        cells.forEach(cell => {
            if (cell.dataset.stepIndex === selectedCellInfo.stepIndex &&
                ((cell.dataset.propertyId === selectedCellInfo.propertyId && selectedCellInfo.propertyId) || 
                (cell.dataset.columnType === selectedCellInfo.columnType && !selectedCellInfo.propertyId))) {
                cell.classList.add('selected');
                selectedCell = cell;
            }
        });
    }
}

// 更新成功率显示
function updateSuccessRate() {
    const successRateElement = document.getElementById('successRateValue');
    if (enchantRecord.finalSingleSuccessRate !== null) {
        successRateElement.textContent = enchantRecord.finalSingleSuccessRate.toFixed(2);
    } else {
        successRateElement.textContent = 'N/A';
    }
}

// 更新结果展示
function updateResultDisplay() {
    const resultDisplay = document.getElementById('resultDisplay');

    // 如果没有步骤，显示默认信息
    if (enchantRecord.enchantmentSteps.length === 0) {
        resultDisplay.textContent = '暂无附魔结果';
        return;
    }

    // 构建结果文本
    let resultText = '';

    // 1. 最终附魔的属性状态总览
    resultText += '=== 最终属性状态 ===\n';
    const finalProperties = enchantRecord.getCurrentProperties();
    for (const propId in finalProperties) {
        const property = propertyManager.getProperty(propId);
        const value = finalProperties[propId];

        // 只显示非零属性
        if (value !== 0) {
            resultText += `${property.nameChsFull}: ${value}${property.isPercentage ? '%' : ''}\n`;
        }
    }

    resultText += '\n';

    // 2. 基础信息
    resultText += '=== 基础信息 ===\n';
    resultText += `装备类型: ${enchantRecord.equipmentType.nameChsFull}\n`;
    resultText += `装备潜力: ${enchantRecord.equipmentPotential}\n`;
    resultText += `锻冶熟练度: ${enchantRecord.smithingLevel}\n`;

    // 只有非默认值才显示
    if (enchantRecord.baseEquipmentPotential !== 1) {
        resultText += `基础潜力: ${enchantRecord.baseEquipmentPotential}\n`;
    }

    if (enchantRecord.anvilLevel !== 40) {
        resultText += `铁砧技能等级: ${enchantRecord.anvilLevel}\n`;
    }

    if (enchantRecord.masterEnhancement2Level !== 10) {
        resultText += `大师II等级: ${enchantRecord.masterEnhancement2Level}\n`;
    }

    // 理解技能等级
    const understandingSkills = enchantRecord.understandingSkills;
    let hasUnderstandingSkills = false;
    let understandingText = '';

    if (understandingSkills.metal !== 0) {
        understandingText += `理解金属: ${understandingSkills.metal} `;
        hasUnderstandingSkills = true;
    }

    if (understandingSkills.cloth !== 0) {
        understandingText += `理解布料: ${understandingSkills.cloth} `;
        hasUnderstandingSkills = true;
    }

    if (understandingSkills.beast !== 0) {
        understandingText += `理解兽品: ${understandingSkills.beast} `;
        hasUnderstandingSkills = true;
    }

    if (understandingSkills.wood !== 0) {
        understandingText += `理解木材: ${understandingSkills.wood} `;
        hasUnderstandingSkills = true;
    }

    if (understandingSkills.medicine !== 0) {
        understandingText += `理解药品: ${understandingSkills.medicine} `;
        hasUnderstandingSkills = true;
    }

    if (understandingSkills.mana !== 0) {
        understandingText += `理解魔素: ${understandingSkills.mana} `;
        hasUnderstandingSkills = true;
    }

    if (hasUnderstandingSkills) {
        resultText += `理解技能: ${understandingText.trim()}\n`;
    }

    resultText += '\n';

    // 3. 附魔总素材消耗
    resultText += '=== 总素材消耗 ===\n';
    const totalMaterialCosts = enchantRecord.finalTotalMaterialCosts;
    if (totalMaterialCosts.metal > 0) resultText += `金属: ${totalMaterialCosts.metal}\n`;
    if (totalMaterialCosts.cloth > 0) resultText += `布料: ${totalMaterialCosts.cloth}\n`;
    if (totalMaterialCosts.beast > 0) resultText += `兽品: ${totalMaterialCosts.beast}\n`;
    if (totalMaterialCosts.wood > 0) resultText += `木材: ${totalMaterialCosts.wood}\n`;
    if (totalMaterialCosts.medicine > 0) resultText += `药品: ${totalMaterialCosts.medicine}\n`;
    if (totalMaterialCosts.mana > 0) resultText += `魔素: ${totalMaterialCosts.mana}\n`;

    if (Object.values(totalMaterialCosts).every(cost => cost === 0)) {
        resultText += '无素材消耗\n';
    }

    resultText += '\n';

    // 4. 附魔的所有步骤展示
    resultText += '=== 附魔步骤 ===\n';
    enchantRecord.enchantmentSteps.forEach((step, index) => {
        resultText += `${index + 1}. 潜力: ${step.postEnchantmentPotential}\n`;

        // 显示该步骤的属性变化
        step.enchantments.forEach(enchantment => {
            const property = enchantment.property;
            const value = enchantment.value;

            // 只显示非零变化
            if (value !== 0) {
                resultText += `   ${property.nameChsFull}: ${value > 0 ? '+' : ''}${value}${property.isPercentage ? '%' : ''}\n`;
            }
        });

        resultText += '\n';
    });

    resultDisplay.textContent = resultText;
}

// 事件处理函数
function onEquipmentTypeChange(event) {
    const type = event.target.value;
    enchantRecord.setEquipmentType(
        type === 'armor' ? EquipmentType.EQUIPMENT_TYPE_ARMOR : EquipmentType.EQUIPMENT_TYPE_WEAPON
    );
    updateDisplay();
}

function onPlayerLevelChange(event) {
    const level = parseInt(event.target.value);
    if (!isNaN(level) && level >= 200) {
        enchantRecord.playerLevel = level;
        updateDisplay();
    }
}

function onEquipmentPotentialChange(event) {
    const potential = parseInt(event.target.value);
    if (!isNaN(potential) && potential > 0) {
        enchantRecord.equipmentPotential = potential;
        updateDisplay();
    }
}

function onSmithingLevelChange(event) {
    const level = parseInt(event.target.value);
    if (!isNaN(level) && level >= 0) {
        enchantRecord.smithingLevel = level;
        updateDisplay();
    }
}

function showMoreConfig() {
    // 填充当前配置值
    document.getElementById('baseEquipmentPotential').value = enchantRecord.baseEquipmentPotential;
    document.getElementById('anvilLevel').value = enchantRecord.anvilLevel;
    document.getElementById('masterEnhancement2Level').value = enchantRecord.masterEnhancement2Level;
    document.getElementById('understandingMetal').value = enchantRecord.understandingSkills.metal;
    document.getElementById('understandingCloth').value = enchantRecord.understandingSkills.cloth;
    document.getElementById('understandingBeast').value = enchantRecord.understandingSkills.beast;
    document.getElementById('understandingWood').value = enchantRecord.understandingSkills.wood;
    document.getElementById('understandingMedicine').value = enchantRecord.understandingSkills.medicine;
    document.getElementById('understandingMana').value = enchantRecord.understandingSkills.mana;

    document.getElementById('moreConfigModal').classList.remove('hidden');
}

function closeMoreConfig() {
    document.getElementById('moreConfigModal').classList.add('hidden');
}

function saveConfig() {
    // 保存配置
    enchantRecord.baseEquipmentPotential = parseInt(document.getElementById('baseEquipmentPotential').value);
    enchantRecord.anvilLevel = parseInt(document.getElementById('anvilLevel').value);
    enchantRecord.masterEnhancement2Level = parseInt(document.getElementById('masterEnhancement2Level').value);
    enchantRecord.understandingSkills.metal = parseInt(document.getElementById('understandingMetal').value);
    enchantRecord.understandingSkills.cloth = parseInt(document.getElementById('understandingCloth').value);
    enchantRecord.understandingSkills.beast = parseInt(document.getElementById('understandingBeast').value);
    enchantRecord.understandingSkills.wood = parseInt(document.getElementById('understandingWood').value);
    enchantRecord.understandingSkills.medicine = parseInt(document.getElementById('understandingMedicine').value);
    enchantRecord.understandingSkills.mana = parseInt(document.getElementById('understandingMana').value);

    closeMoreConfig();
    updateDisplay();
}

function onTableClick(event) {
    const cell = event.target;

    // 如果点击的是表格单元格
    if (cell.tagName === 'TD' && cell.dataset.stepIndex !== undefined) {
        // 取消之前选中的单元格
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }

        // 选中当前单元格
        selectedCell = cell;
        cell.classList.add('selected');
    } else if (cell.tagName !== 'TD') {
        // 如果点击的不是表格单元格，取消选中
        if (selectedCell) {
            selectedCell.classList.remove('selected');
            selectedCell = null;
        }
    }
}

function setQuantity(quantity) {
    currentQuantity = quantity;

    // 更新按钮状态
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (quantity === 1) {
        document.getElementById('quantity1Btn').classList.add('active');
    } else if (quantity === 5) {
        document.getElementById('quantity5Btn').classList.add('active');
    } else if (quantity === 'max') {
        document.getElementById('quantityMaxBtn').classList.add('active');
    }
}

function showOperationMenu() {
    document.getElementById('operationMenuModal').classList.remove('hidden');
}

function closeOperationMenu() {
    document.getElementById('operationMenuModal').classList.add('hidden');
}

function onAddStep() {
    if (!selectedCell) {
        alert('请先选择一个单元格');
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const propertyId = selectedCell.dataset.propertyId;

    // 检查是否是属性单元格
    if (propertyId === undefined) {
        alert('请选择一个属性单元格');
        return;
    }

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        alert('未找到选中的步骤');
        return;
    }

    // 查找对应的附魔属性
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    if (!enchantment) {
        alert('未找到选中的属性');
        return;
    }

    // 根据当前数量模式更新属性值
    if (currentQuantity === 'max') {
        // TODO: 实现max逻辑，暂时增加10作为示例
        enchantment.value += 10;
    } else {
        enchantment.value += currentQuantity;
    }

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示并保持选中状态
    updateDisplay();
    
    // 重新选中单元格
    setTimeout(() => {
        const tbody = document.querySelector('#enchantTable tbody');
        const cells = tbody.querySelectorAll('td');
        cells.forEach(cell => {
            if (cell.dataset.stepIndex === stepIndex.toString() && 
                cell.dataset.propertyId === propertyId) {
                cell.classList.add('selected');
                selectedCell = cell;
            }
        });
    }, 0);
}

function onSubtractStep() {
    if (!selectedCell) {
        alert('请先选择一个单元格');
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const propertyId = selectedCell.dataset.propertyId;

    // 检查是否是属性单元格
    if (propertyId === undefined) {
        alert('请选择一个属性单元格');
        return;
    }

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        alert('未找到选中的步骤');
        return;
    }

    // 查找对应的附魔属性
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    if (!enchantment) {
        alert('未找到选中的属性');
        return;
    }

    // 根据当前数量模式更新属性值
    if (currentQuantity === 'max') {
        // TODO: 实现max逻辑，暂时减少10作为示例
        enchantment.value -= 10;
    } else {
        enchantment.value -= currentQuantity;
    }

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示并保持选中状态
    updateDisplay();
    
    // 重新选中单元格
    setTimeout(() => {
        const tbody = document.querySelector('#enchantTable tbody');
        const cells = tbody.querySelectorAll('td');
        cells.forEach(cell => {
            if (cell.dataset.stepIndex === stepIndex.toString() && 
                cell.dataset.propertyId === propertyId) {
                cell.classList.add('selected');
                selectedCell = cell;
            }
        });
    }, 0);
}

function switchViewMode() {
    // 显示视图模式选择弹窗
    const modal = createViewModeModal();
    modal.classList.remove('hidden');
}

/**
 * 创建视图模式选择弹窗
 * @returns {HTMLDivElement}
 */
function createViewModeModal() {
    // 如果弹窗已存在，先移除
    const existingModal = document.getElementById('viewModeModal');
    if (existingModal) {
        existingModal.remove();
    }

    // 创建弹窗元素
    const modal = document.createElement('div');
    modal.id = 'viewModeModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content view-mode-modal">
            <span class="close">&times;</span>
            <h2>选择显示模式</h2>
            <ul>
                <li data-mode="change">各属性变化值</li>
                <li data-mode="value">附魔完后的属性值</li>
                <li data-mode="potential">各属性消耗潜力</li>
                <li data-mode="material">各属性消耗素材</li>
            </ul>
        </div>
    `;

    document.body.appendChild(modal);

    // 绑定关闭事件
    modal.querySelector('.close').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // 点击模态框外部关闭
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // 绑定选项点击事件
    modal.querySelectorAll('li').forEach(item => {
        item.addEventListener('click', () => {
            currentViewMode = item.dataset.mode;
            updateDisplay();
            modal.classList.add('hidden');
        });
    });

    return modal;
}

function addNewStep() {
    // 创建一个新的附魔步骤
    const newStep = {
        enchantments: selectedProperties.map(property => ({
            property: property,
            value: 0
        }))
    };

    // 添加步骤到附魔记录中
    enchantRecord.addEnchantmentStep(newStep);

    // 更新显示
    updateDisplay();
}

function undoStep() {
    // 检查是否有步骤可以撤销
    if (enchantRecord.enchantmentSteps.length === 0) {
        alert('没有可以撤销的步骤');
        closeOperationMenu();
        return;
    }

    // 获取最后一个步骤
    const lastStep = enchantRecord.enchantmentSteps[enchantRecord.enchantmentSteps.length - 1];

    // 删除最后一个步骤
    enchantRecord.removeEnchantmentStep(lastStep.id);

    // 更新显示
    updateDisplay();

    closeOperationMenu();
}

function clearStep() {
    // TODO: 实现清空步骤逻辑
    alert('清空步骤功能待实现');
    closeOperationMenu();
}

function addStepMenu() {
    // TODO: 实现增加步骤菜单逻辑
    alert('增加步骤菜单功能待实现');
    closeOperationMenu();
}

function copyStep() {
    if (!selectedCell) {
        alert('请先选择一个单元格');
        closeOperationMenu();
        return;
    }

    // TODO: 实现复制步骤逻辑
    alert('复制步骤功能待实现');
    closeOperationMenu();
}

function pasteStep() {
    if (!selectedCell) {
        alert('请先选择一个单元格');
        closeOperationMenu();
        return;
    }

    // TODO: 实现粘贴步骤逻辑
    alert('粘贴步骤功能待实现');
    closeOperationMenu();
}

function copyResult() {
    const resultDisplay = document.getElementById('resultDisplay');

    // 创建一个临时的textarea元素用于复制
    const textarea = document.createElement('textarea');
    textarea.value = resultDisplay.textContent;
    document.body.appendChild(textarea);

    // 选择并复制文本
    textarea.select();
    document.execCommand('copy');

    // 移除临时元素
    document.body.removeChild(textarea);

    // 提示用户
    alert('结果已复制到剪贴板');
}