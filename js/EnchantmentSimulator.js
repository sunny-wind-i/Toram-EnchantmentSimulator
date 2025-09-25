import EnchantRecord from './modules/EnchantRecord.js';
import PropertyManager from './modules/PropertyManager.js';
import { attrNumToActualNum, calAttrMaxLimit, calAttrMinLimit } from './modules/PotentialCalculator.js';
import EquipmentType from './modules/EquipmentType.js';
import EnchantType from './modules/EnchantType.js';

// 全局变量
let enchantRecord = null;
let propertyManager = null;
let selectedProperties = [];
let currentViewMode = 'change'; // change, value, potential, material
let selectedCell = null;
let currentQuantity = 1;
let copiedStepData = null;
let enchantmentList = []; // 存储附魔列表
let currentEnchantmentIndex = 0; // 当前选中的附魔索引
const PM = new PropertyManager();

// 初始化
document.addEventListener('DOMContentLoaded', function () {
    propertyManager = new PropertyManager();

    // 初始化附魔记录
    initializeEnchantRecord();

    // 绑定事件
    bindEvents();

    // 更新显示
    // updateDisplay();
    // updateBasicInfoDisplay();
    // updatePropertyButtons();
    // updateTableHeader();

    // 更新选中属性
    updateSelectedPropertiesFromImport();
    // 更新显示
    updateDisplay();
    // 更新基础信息
    updateBasicInfoDisplay();
    // 更新表格表头
    updateTableHeader();
    // 更新附魔选择器
    updateEnchantmentSelector();

    console.log('ini\n', enchantRecord);

});

// 初始化附魔记录
function initializeEnchantRecord() {
    // 从本地存储加载附魔列表
    loadEnchantmentListFromStorage();

    // 如果有存储的附魔列表，加载当前选中的附魔
    if (enchantmentList.length > 0) {
        // 获取上次选中的附魔索引
        const lastSelectedIndex = localStorage.getItem('toram_enchant_last_selected');
        currentEnchantmentIndex = lastSelectedIndex !== null ? parseInt(lastSelectedIndex) : 0;
        currentEnchantmentIndex = Math.max(0, Math.min(currentEnchantmentIndex, enchantmentList.length - 1));

        // 加载选中的附魔
        const savedData = enchantmentList[currentEnchantmentIndex].data;
        try {
            enchantRecord = new EnchantRecord({});
            enchantRecord.importCustomData(savedData);
            // 更新选中属性
            updateSelectedPropertiesFromImport();
        } catch (e) {
            console.error('加载存储的附魔失败:', e);
            createNewEnchantRecord();
        }
    } else {
        // 创建新的附魔记录
        createNewEnchantRecord();
        // 保存到本地存储
        saveCurrentEnchantment();
    }

    // 更新附魔选择器，确保下拉框显示所有附魔
    updateEnchantmentSelector();
}

// 创建新的附魔记录
function createNewEnchantRecord() {
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
        },
        name: "自定义附魔1"
    };

    enchantRecord = new EnchantRecord(config);
}

// 从本地存储加载附魔列表
function loadEnchantmentListFromStorage() {
    const savedList = localStorage.getItem('toram_enchant_list');
    if (savedList) {
        try {
            enchantmentList = JSON.parse(savedList);
        } catch (e) {
            console.error('解析存储的附魔列表失败:', e);
            enchantmentList = [];
        }
    } else {
        enchantmentList = [];
    }
}

// 保存附魔列表到本地存储
function saveEnchantmentListToStorage() {
    try {
        localStorage.setItem('toram_enchant_list', JSON.stringify(enchantmentList));
    } catch (e) {
        console.error('保存附魔列表到本地存储失败:', e);
    }
}

// 保存当前附魔到本地存储
function saveCurrentEnchantment() {
    try {
        // 导出当前附魔数据
        const exportedData = enchantRecord.exportCustomData();
        const enchantName = enchantRecord.getName();

        // 如果当前索引有效，更新现有条目，否则添加新条目
        if (currentEnchantmentIndex >= 0 && currentEnchantmentIndex < enchantmentList.length) {
            enchantmentList[currentEnchantmentIndex] = {
                name: enchantName,
                data: exportedData
            };
        } else {
            // 添加到列表末尾
            enchantmentList.push({
                name: enchantName,
                data: exportedData
            });
            currentEnchantmentIndex = enchantmentList.length - 1;
        }

        // 保存列表和当前索引
        saveEnchantmentListToStorage();
        localStorage.setItem('toram_enchant_last_selected', currentEnchantmentIndex.toString());
    } catch (e) {
        console.error('保存当前附魔失败:', e);
    }
}

// 创建新的附魔
function createNewEnchantment() {
    // 确定新附魔的名称
    let newName = "自定义附魔1";
    let counter = 1;

    // 检查是否有重复名称
    while (enchantmentList.some(item => item.name === newName)) {
        counter++;
        newName = `自定义附魔${counter}`;
    }

    // 创建新的附魔记录
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
        },
        name: newName
    };

    enchantRecord = new EnchantRecord(config);

    // 添加到列表并保存
    enchantmentList.push({
        name: newName,
        data: enchantRecord.exportCustomData()
    });

    currentEnchantmentIndex = enchantmentList.length - 1;
    saveEnchantmentListToStorage();
    localStorage.setItem('toram_enchant_last_selected', currentEnchantmentIndex.toString());

    // 更新显示
    updateDisplay();
    updateBasicInfoDisplay();
    updateTableHeader();
    updateEnchantmentSelector();
}

// 删除当前附魔
function deleteCurrentEnchantment() {
    if (enchantmentList.length <= 1) {
        alert('至少需要保留一个附魔');
        return;
    }

    if (!confirm(`确定要删除附魔"${enchantRecord.getName()}"吗？`)) {
        return;
    }

    // 从列表中删除
    enchantmentList.splice(currentEnchantmentIndex, 1);

    // 调整当前索引
    if (currentEnchantmentIndex >= enchantmentList.length) {
        currentEnchantmentIndex = enchantmentList.length - 1;
    }

    // 加载新的当前附魔
    if (enchantmentList.length > 0) {
        const savedData = enchantmentList[currentEnchantmentIndex].data;
        try {
            enchantRecord = new EnchantRecord({});
            enchantRecord.importCustomData(savedData);
        } catch (e) {
            console.error('加载附魔失败:', e);
            createNewEnchantRecord();
            currentEnchantmentIndex = 0;
            enchantmentList = [{
                name: enchantRecord.getName(),
                data: enchantRecord.exportCustomData()
            }];
        }
    } else {
        createNewEnchantRecord();
        currentEnchantmentIndex = 0;
        enchantmentList = [{
            name: enchantRecord.getName(),
            data: enchantRecord.exportCustomData()
        }];
    }

    // 保存并更新显示
    saveEnchantmentListToStorage();
    localStorage.setItem('toram_enchant_last_selected', currentEnchantmentIndex.toString());
    updateDisplay();
    updateBasicInfoDisplay();
    updateTableHeader();
    updateEnchantmentSelector();
}

// 切换到指定附魔
function switchToEnchantment(index) {
    if (index < 0 || index >= enchantmentList.length) {
        return;
    }

    // 保存当前附魔
    saveCurrentEnchantment();

    // 切换到新附魔
    currentEnchantmentIndex = index;
    const savedData = enchantmentList[currentEnchantmentIndex].data;
    try {
        enchantRecord = new EnchantRecord({});
        enchantRecord.importCustomData(savedData);
        // 更新选中属性
        updateSelectedPropertiesFromImport();
    } catch (e) {
        console.error('加载附魔失败:', e);
        alert('加载附魔失败');
        return;
    }

    // 更新存储的当前索引
    localStorage.setItem('toram_enchant_last_selected', currentEnchantmentIndex.toString());

    // 更新选中属性
    updateSelectedPropertiesFromImport();
    // 更新显示
    updateDisplay();
    // 更新基础信息
    updateBasicInfoDisplay();
    // 更新表格表头
    updateTableHeader();
    // 更新附魔选择器
    updateEnchantmentSelector();
}

// 更新附魔选择器
function updateEnchantmentSelector() {
    const selector = document.getElementById('enchantmentSelector');
    if (!selector) return;

    // 清空现有选项
    selector.innerHTML = '';

    // 添加选项
    enchantmentList.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = item.name;
        if (index === currentEnchantmentIndex) {
            option.selected = true;
        }
        selector.appendChild(option);
    });

    // 绑定事件
    selector.addEventListener('change', function () {
        const newIndex = parseInt(this.value);
        switchToEnchantment(newIndex);
    });

    // 确保选中当前附魔
    selector.value = currentEnchantmentIndex;
}

// 导出数据
function exportData() {
    try {
        const exportedData = enchantRecord.exportCustomData();
        // 复制到剪贴板
        navigator.clipboard.writeText(exportedData).then(() => {
            alert('导出数据已复制到剪贴板');
        }).catch(err => {
            // 如果复制失败，显示数据在弹窗中
            showExportData(exportedData);
        });
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

// 显示导出数据
function showExportData(data) {
    // 创建弹窗元素
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>导出数据</h2>
            <p>附魔名称: ${enchantRecord.getName()}</p>
            <p>请复制以下数据:</p>
            <textarea id="exportDataTextarea" rows="5" cols="50" readonly>${data}</textarea>
            <button id="copyExportDataBtn">复制</button>
        </div>
    `;

    document.body.appendChild(modal);

    // 显示弹窗
    modal.style.display = 'block';

    // 绑定关闭事件
    modal.querySelector('.close').onclick = () => {
        document.body.removeChild(modal);
    };

    // 绑定复制按钮事件
    modal.querySelector('#copyExportDataBtn').onclick = () => {
        const textarea = modal.querySelector('#exportDataTextarea');
        textarea.select();
        document.execCommand('copy');
        alert('已复制到剪贴板');
    };

    // 点击弹窗外部关闭
    window.onclick = (event) => {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// 导入数据
function importData() {
    // 创建导入弹窗
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>导入数据</h2>
            <p>请粘贴导出的数据:</p>
            <textarea id="importDataTextarea" rows="5" cols="50"></textarea>
            <button id="importDataBtn">导入</button>
        </div>
    `;

    document.body.appendChild(modal);

    // 显示弹窗
    modal.style.display = 'block';

    // 绑定关闭事件
    modal.querySelector('.close').onclick = () => {
        document.body.removeChild(modal);
    };

    // 绑定导入按钮事件
    modal.querySelector('#importDataBtn').onclick = () => {
        const textarea = modal.querySelector('#importDataTextarea');
        const data = textarea.value.trim();

        if (!data) {
            alert('请输入要导入的数据');
            return;
        }

        try {
            // 创建临时记录来解析名称
            const tempRecord = new EnchantRecord({});
            tempRecord.importCustomData(data);
            const importedName = tempRecord.getName();

            // 询问用户如何处理导入的数据
            const userChoice = prompt(`导入的附魔名称为: "${importedName}"\n请输入新名称，或留空使用原名称:`, importedName);
            if (userChoice === null) {
                // 用户取消导入
                return;
            }

            const finalName = userChoice.trim() || importedName;
            tempRecord.setName(finalName);

            // 导入数据到当前记录
            enchantRecord.importCustomData(tempRecord.exportCustomData());

            // 检查是否需要添加到列表
            const existingIndex = enchantmentList.findIndex(item => item.name === finalName);
            if (existingIndex >= 0) {
                // 更新现有条目
                enchantmentList[existingIndex].data = enchantRecord.exportCustomData();
                currentEnchantmentIndex = existingIndex;
            } else {
                // 添加新条目
                enchantmentList.push({
                    name: finalName,
                    data: enchantRecord.exportCustomData()
                });
                currentEnchantmentIndex = enchantmentList.length - 1;
            }

            // 更新选中属性
            updateSelectedPropertiesFromImport();

            // 更新显示
            updateDisplay();
            updateBasicInfoDisplay();

            // 注意：这里不需要手动调用updateTableHeader和updateEnchantmentSelector
            // 因为updateDisplay已经包含了这些操作

            // 保存到本地存储
            saveEnchantmentListToStorage();
            localStorage.setItem('toram_enchant_last_selected', currentEnchantmentIndex.toString());

            // 关闭弹窗
            document.body.removeChild(modal);

            alert('导入成功');
        } catch (error) {
            alert('导入失败: ' + error.message);
        }
    };

    // 点击弹窗外部关闭
    window.onclick = function (event) {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// 根据导入的数据更新选中属性
function updateSelectedPropertiesFromImport() {
    // 直接从EnchantRecord中获取选中的属性（保持顺序）
    selectedProperties = [...enchantRecord.getSelectedProperties()];

    // 同步更新属性选择弹窗中的复选框状态
    document.querySelectorAll('#propertyCategoryList input[type="checkbox"]').forEach(checkbox => {
        const propertyId = checkbox.dataset.propertyId;
        const isSelected = selectedProperties.some(prop => prop.id === propertyId);
        checkbox.checked = isSelected;
    });

    // 更新已选择属性显示
    updateSelectedPropertiesDisplay();

    // 更新表格头部
    updateTableHeader();
}

// 绑定事件
function bindEvents() {
    // 基础信息事件
    document.getElementById('equipmentType').addEventListener('change', onEquipmentTypeChange);
    document.getElementById('playerLevel').addEventListener('change', onPlayerLevelChange);
    document.getElementById('equipmentPotential').addEventListener('change', onEquipmentPotentialChange);
    document.getElementById('smithingLevel').addEventListener('change', onSmithingLevelChange);
    document.getElementById('enchantmentName').addEventListener('change', onEnchantmentNameChange);
    document.getElementById('enchantmentSelector').addEventListener('change', onEnchantmentSelectorChange);
    document.getElementById('newEnchantmentBtn').addEventListener('click', createNewEnchantment);
    document.getElementById('deleteEnchantmentBtn').addEventListener('click', deleteCurrentEnchantment);
    document.getElementById('saveEnchantmentBtn').addEventListener('click', saveCurrentEnchantment);

    // 更多配置事件
    document.getElementById('moreConfigBtn').addEventListener('click', showMoreConfig);
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);

    // 添加导出按钮事件监听器
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // 添加导入按钮事件监听器
    document.getElementById('importBtn').addEventListener('click', importData);

    // 关闭更多配置弹窗事件
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
    document.getElementById('enchantTable').addEventListener('contextmenu', onTableContextMenu);
    document.getElementById('enchantTable').addEventListener('dblclick', onTableDblClick);
    document.getElementById('enchantTable').addEventListener('touchstart', onTableTouchStart);
    document.getElementById('enchantTable').addEventListener('touchend', onTableTouchEnd);

    // 悬浮工具栏事件
    document.getElementById('addStepBtn').addEventListener('click', onAddStep);
    document.getElementById('subtractStepBtn').addEventListener('click', onSubtractStep);
    document.getElementById('editPropertyBtn').addEventListener('click', showEditPropertyModal);
    document.getElementById('operationMenuBtn').addEventListener('click', showOperationMenu);
    document.getElementById('switchViewBtn').addEventListener('click', switchViewMode);
    document.querySelector('#operationMenuModal .close').addEventListener('click', closeOperationMenu);

    // 绑定属性编辑弹窗事件
    document.querySelector('#editPropertyModal .close').addEventListener('click', closeEditPropertyModal);
    document.getElementById('minValueBtn').addEventListener('click', setMinValue);
    document.getElementById('decreaseValueBtn').addEventListener('click', decreaseValue);
    document.getElementById('increaseValueBtn').addEventListener('click', increaseValue);
    document.getElementById('maxValueBtn').addEventListener('click', setMaxValue);
    document.getElementById('deleteValueBtn').addEventListener('click', deleteValue);
    document.getElementById('propertyValueInput').addEventListener('input', onPropertyValueInput);
    document.getElementById('propertyValueInput').addEventListener('change', onPropertyValueChanged);
    document.getElementById('propertyValueSlider').addEventListener('input', onPropertyValueSliderChange);

    // 增加步骤选项事件
    document.getElementById('addStepMenuBtn').addEventListener('click', showAddStepOptions);
    document.getElementById('copyStepBtn').addEventListener('click', copyStep);
    document.getElementById('pasteStepBtn').addEventListener('click', showPasteStepOptions);
    document.getElementById('toggleIgnoreBtn').addEventListener('click', toggleIgnoreStep);

    // 操作菜单事件
    document.getElementById('undoBtn').addEventListener('click', undoStep);
    document.getElementById('clearBtn').addEventListener('click', showClearOptions);
    document.getElementById('addStepMenuBtn').addEventListener('click', showAddStepOptions);
    document.getElementById('copyStepBtn').addEventListener('click', copyStep);
    document.getElementById('pasteStepBtn').addEventListener('click', showPasteStepOptions);
    document.getElementById('toggleIgnoreBtn').addEventListener('click', toggleIgnoreStep);

    // 清空选项事件
    document.querySelector('#clearOptionsModal .close').addEventListener('click', closeClearOptions);
    document.getElementById('clearCellBtn').addEventListener('click', clearCell);
    document.getElementById('clearStepBtn').addEventListener('click', clearStepValues);
    document.getElementById('deleteStepBtn').addEventListener('click', deleteStep);
    document.getElementById('deleteEmptyStepsBtn').addEventListener('click', deleteEmptySteps);
    document.getElementById('deleteAllStepsBtn').addEventListener('click', deleteAllSteps);

    // 增加步骤选项事件
    document.querySelector('#addStepOptionsModal .close').addEventListener('click', closeAddStepOptions);
    document.getElementById('addStepAboveBtn').addEventListener('click', addStepAbove);
    document.getElementById('addStepBelowBtn').addEventListener('click', addStepBelow);

    // 粘贴步骤选项事件
    document.querySelector('#pasteStepOptionsModal .close').addEventListener('click', closePasteStepOptions);
    document.getElementById('pasteStepAboveBtn').addEventListener('click', pasteStepAbove);
    document.getElementById('pasteStepBelowBtn').addEventListener('click', pasteStepBelow);

    // 点击模态框外部关闭
    document.addEventListener('click', function (event) {
        const operationMenuModal = document.getElementById('operationMenuModal');
        const clearOptionsModal = document.getElementById('clearOptionsModal');
        const addStepOptionsModal = document.getElementById('addStepOptionsModal');
        const pasteStepOptionsModal = document.getElementById('pasteStepOptionsModal');
        const propertySelectionModal = document.getElementById('propertySelectionModal');
        const viewModeModal = document.getElementById('viewModeModal');
        const editPropertyModal = document.getElementById('editPropertyModal');

        if (event.target === operationMenuModal) {
            closeOperationMenu();
        } else if (event.target === clearOptionsModal) {
            closeClearOptions();
        } else if (event.target === addStepOptionsModal) {
            closeAddStepOptions();
        } else if (event.target === pasteStepOptionsModal) {
            closePasteStepOptions();
        } else if (event.target === propertySelectionModal) {
            closePropertySelection();
        } else if (event.target === viewModeModal) {
            viewModeModal.classList.add('hidden');
        } else if (event.target === editPropertyModal) {
            closeEditPropertyModal();
        }
    });

    // 结果展示事件
    document.getElementById('copyResultBtn').addEventListener('click', copyResult);

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

                // 添加点击事件，使点击整个属性项都能切换复选框状态
                propertyItem.addEventListener('click', function (e) {
                    // 如果点击的是复选框本身或标签，则不处理（避免重复处理）
                    if (e.target === this.querySelector('input[type="checkbox"]') ||
                        e.target === this.querySelector('label')) {
                        return;
                    }

                    const checkbox = this.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;

                    // 手动触发change事件
                    const event = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(event);

                    // 阻止事件冒泡
                    e.stopPropagation();
                });
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
            // 同时更新EnchantRecord中的selectedProperties
            enchantRecord.addSelectedProperty(property);
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
            // 同时更新EnchantRecord中的selectedProperties
            enchantRecord.removeSelectedProperty(property);
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
        isIgnored: step.isIgnored, // 保存忽略状态
        enchantments: step.enchantments.map(enchant => ({
            propertyId: enchant.property.id,
            value: enchant.value
        }))
    }))));

    // 更新EnchantRecord中的selectedProperties
    enchantRecord.setSelectedProperties(selectedProperties);

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
                isIgnored: stepData.isIgnored, // 恢复忽略状态
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

    // 保存到本地存储
    saveCurrentEnchantment();

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
    console.log('dip\n', enchantRecord);
}

// 检查两个步骤是否具有相同的附魔变化值
function areStepsEqual(step1, step2) {
    // 检查步骤忽略状态，如果忽略状态不同，则不视为重复步骤
    if (step1.isIgnored !== step2.isIgnored) {
        return false;
    }

    // 如果步骤数量不同，则不相等
    if (step1.enchantments.length !== step2.enchantments.length) {
        return false;
    }

    // 检查步骤有效性，如果有效性不同，则不视为重复步骤
    if (step1.isValid !== step2.isValid) {
        return false;
    }

    // 检查是否为空步骤（所有属性值都为0）
    const isStep1Empty = step1.enchantments.every(enchant => enchant.value === 0);
    const isStep2Empty = step2.enchantments.every(enchant => enchant.value === 0);

    // 如果其中一个是空步骤，则不视为重复步骤
    if (isStep1Empty || isStep2Empty) {
        return false;
    }

    // 检查每个附魔属性的值是否相同
    for (let i = 0; i < step1.enchantments.length; i++) {
        const enchant1 = step1.enchantments[i];
        const enchant2 = step2.enchantments[i];

        // 检查属性ID和值是否都相同
        if (enchant1.property.id !== enchant2.property.id || enchant1.value !== enchant2.value) {
            return false;
        }
    }

    return true;
}

// 将连续的重复步骤分组
function groupRepeatedSteps(steps) {
    if (steps.length === 0) return [];

    const groupedSteps = [];
    let currentGroup = [steps[0]];

    for (let i = 1; i < steps.length; i++) {
        // 检查当前步骤是否与前一个步骤相同
        if (areStepsEqual(steps[i], steps[i - 1])) {
            // 相同则添加到当前组
            currentGroup.push(steps[i]);
        } else {
            // 不同则结束当前组，开始新组
            groupedSteps.push({
                steps: currentGroup,
                isRepeated: currentGroup.length > 1,
                count: currentGroup.length
            });
            currentGroup = [steps[i]];
        }
    }

    // 添加最后一组
    groupedSteps.push({
        steps: currentGroup,
        isRepeated: currentGroup.length > 1,
        count: currentGroup.length
    });

    return groupedSteps;
}

// 用于跟踪展开的重复步骤组
let expandedGroups = {};

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

    // 对步骤进行分组，将连续的重复步骤合并
    const groupedSteps = groupRepeatedSteps(enchantRecord.enchantmentSteps);

    let displayedIndex = 0; // 用于显示的索引
    let actualIndex = 0; // 实际步骤索引

    // 遍历分组后的步骤
    groupedSteps.forEach((group, groupIndex) => {
        if (group.isRepeated) {
            // 为重复步骤组添加控制行
            const controlRow = document.createElement('tr');
            controlRow.classList.add('repeat-control-row');

            // 检查组内是否有无效步骤或被忽略的步骤
            const hasInvalidStep = group.steps.some(step => !step.isValid);
            const hasIgnoredStep = group.steps.some(step => step.isIgnored);

            // 如果组内有无效步骤，添加无效类
            if (hasInvalidStep) {
                controlRow.classList.add('invalid');
            }

            // 如果组内有被忽略的步骤，添加特殊类
            if (hasIgnoredStep) {
                controlRow.classList.add('has-ignored-steps');
            }

            // 控制行的单元格
            const controlCell = document.createElement('td');
            controlCell.colSpan = selectedProperties.length + 1;
            controlCell.classList.add('repeat-control-cell');
            controlCell.style.textAlign = 'center';
            controlCell.style.cursor = 'pointer';
            controlCell.style.backgroundColor =
                hasIgnoredStep ? '#cccccc' :
                    hasInvalidStep ? '#ff9999' : '#d0e6ff';
            controlCell.style.color = hasInvalidStep ? '#cc0000' : '';
            controlCell.style.fontWeight = 'bold';
            controlCell.dataset.groupIndex = groupIndex;

            // 检查是否展开显示
            const isExpanded = !!expandedGroups[groupIndex];

            // 设置初始状态文本
            if (isExpanded) {
                controlCell.textContent = `↑ 以下步骤重复${group.count}次 (点击折叠)`;
            } else {
                controlCell.textContent = `↓ 以下步骤重复${group.count}次 (点击展开)`;
            }

            // 添加点击事件来切换展开/折叠状态
            controlCell.addEventListener('click', function (e) {
                e.stopPropagation();
                const groupIdx = this.dataset.groupIndex;

                // 切换展开状态
                if (expandedGroups[groupIdx]) {
                    delete expandedGroups[groupIdx];
                    this.textContent = `↓ 以下步骤重复${group.count}次 (点击展开)`;
                } else {
                    expandedGroups[groupIdx] = true;
                    this.textContent = `↑ 以下步骤重复${group.count}次 (点击折叠)`;
                }

                updateTableContent(); // 重新渲染表格
            });

            controlRow.appendChild(controlCell);
            tbody.appendChild(controlRow);

            if (isExpanded) {
                // 展开状态 - 显示所有重复步骤
                group.steps.forEach((step, indexInGroup) => {
                    const row = document.createElement('tr');

                    // 添加忽略/无效步骤的样式类
                    if (step.isIgnored) {
                        row.classList.add('ignored');
                    } else if (!step.isValid) {
                        row.classList.add('invalid');
                    }

                    // 潜力值列
                    const potentialCell = document.createElement('td');
                    if (step.isIgnored) {
                        potentialCell.textContent = 'N/A';
                    } else {
                        potentialCell.textContent = step.postEnchantmentPotential;
                    }
                    potentialCell.dataset.stepIndex = actualIndex; // 使用实际索引
                    potentialCell.dataset.actualIndex = actualIndex; // 保存实际索引
                    potentialCell.dataset.columnType = 'potential';
                    row.appendChild(potentialCell);

                    // 属性列
                    selectedProperties.forEach(property => {
                        const cell = document.createElement('td');
                        cell.dataset.stepIndex = actualIndex; // 使用实际索引
                        cell.dataset.actualIndex = actualIndex; // 保存实际索引
                        cell.dataset.propertyId = property.id;

                        switch (currentViewMode) {
                            case 'change':
                                // 显示属性变化值
                                const enchantment = step.enchantments.find(e => e.property.id === property.id);
                                // 只有当属性值不为0时才显示
                                if (enchantment && enchantment.value !== 0) {
                                    const value = enchantment.value;
                                    // 属性觉醒类型特殊处理
                                    if (property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
                                        cell.textContent = property.nameChsAbbr;
                                    } else {
                                        // 正数显示+号
                                        cell.textContent = value >= 0 ? `+${value}` : value.toString();
                                    }
                                } else {
                                    cell.textContent = '';
                                }
                                break;
                            case 'value':
                                // 显示附魔后的属性值
                                if (step.isIgnored) {
                                    cell.textContent = 'N/A';
                                } else {
                                    const currentValue = step.currentProperties[property.id] || 0;
                                    // 获取上一步的属性值
                                    let previousValue = 0;
                                    const stepIndexInRecord = enchantRecord.enchantmentSteps.findIndex(s => s.id === step.id);
                                    if (stepIndexInRecord > 0) {
                                        const previousStep = enchantRecord.enchantmentSteps[stepIndexInRecord - 1];
                                        previousValue = previousStep.currentProperties[property.id] || 0;
                                    }

                                    // 只有当属性值发生变化时才显示
                                    if (currentValue !== previousValue) {
                                        // 属性觉醒类型特殊处理
                                        if (property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
                                            cell.textContent = property.nameChsAbbr;
                                        } else {
                                            // 使用attrNumToActualNum转化数值，直接显示附魔后的值
                                            const actualCurrentValue = attrNumToActualNum(property, currentValue);
                                            // 正数显示+号
                                            const sign = actualCurrentValue >= 0 ? '+' : '';
                                            cell.textContent = `${sign}${actualCurrentValue}${property.isPercentage ? '%' : ''}`;
                                        }
                                    } else {
                                        cell.textContent = '';
                                    }
                                }
                                break;
                            case 'potential':
                                // 显示各属性消耗潜力
                                if (step.isIgnored) {
                                    cell.textContent = 'N/A';
                                } else {
                                    const potentialChange = step.propertyPotentialChanges[property.id] || 0;
                                    // 只有当潜力变化不为0时才显示
                                    if (potentialChange !== 0) {
                                        cell.textContent = potentialChange > 0 ? `+${potentialChange}` : potentialChange.toString();
                                    } else {
                                        // 潜力无变化时，根据属性值变化显示-0或+0
                                        const enchantment = step.enchantments.find(e => e.property.id === property.id);
                                        if (enchantment && enchantment.value !== 0) {
                                            // 属性值有变化但潜力无变化
                                            if (enchantment.value > 0) {
                                                cell.textContent = '-0'; // 消耗0点潜力但属性值增加
                                            } else {
                                                cell.textContent = '+0'; // 返还0点潜力但属性值减少
                                            }
                                        } else {
                                            cell.textContent = '';
                                        }
                                    }
                                }
                                break;
                            case 'material':
                                // 显示各属性消耗素材
                                if (step.isIgnored) {
                                    cell.textContent = 'N/A';
                                } else {
                                    const materialCost = step.propertyMaterialCosts[property.id] || 0;
                                    // 只有当素材消耗不为0时才显示
                                    if (materialCost !== 0) {
                                        // 如果是对象，提取其中的值显示
                                        if (typeof materialCost === 'object') {
                                            const materialValues = [];
                                            for (const key in materialCost) {
                                                if (materialCost[key] !== 0) {
                                                    // 使用中文表示素材类型
                                                    let materialName = key;
                                                    switch (key) {
                                                        case 'metal':
                                                            materialName = '金属';
                                                            break;
                                                        case 'cloth':
                                                            materialName = '布料';
                                                            break;
                                                        case 'beast':
                                                            materialName = '兽品';
                                                            break;
                                                        case 'wood':
                                                            materialName = '木材';
                                                            break;
                                                        case 'medicine':
                                                            materialName = '药品';
                                                            break;
                                                        case 'mana':
                                                            materialName = '魔素';
                                                            break;
                                                    }
                                                    materialValues.push(`${materialName} ${materialCost[key]}`);
                                                }
                                            }
                                            cell.textContent = materialValues.length > 0 ? materialValues.join(', ') : '';
                                        } else {
                                            cell.textContent = materialCost;
                                        }
                                    } else {
                                        cell.textContent = '';
                                    }
                                }
                                break;
                        }

                        row.appendChild(cell);
                    });

                    tbody.appendChild(row);
                    displayedIndex++;
                    actualIndex++; // 增加实际索引
                });
            } else {
                // 折叠状态 - 显示一行汇总信息
                const firstStep = group.steps[0];
                const lastStep = group.steps[group.steps.length - 1];
                const row = document.createElement('tr');
                row.classList.add('repeated-steps');
                row.classList.add('collapsed'); // 添加折叠样式

                // 如果组内有被忽略的步骤，添加特殊类
                if (hasIgnoredStep) {
                    row.classList.add('has-ignored-steps');
                }

                // 如果组内有无效步骤，添加无效类（优先级更高）
                if (hasInvalidStep) {
                    row.classList.add('invalid');
                }

                row.dataset.groupIndex = groupIndex;

                // 潜力值列 - 显示最后一个步骤的潜力值
                const potentialCell = document.createElement('td');
                if (lastStep.isIgnored) {
                    potentialCell.textContent = 'N/A';
                } else {
                    potentialCell.textContent = lastStep.postEnchantmentPotential;
                }
                potentialCell.dataset.groupIndex = groupIndex;
                potentialCell.dataset.columnType = 'potential';
                // 保存第一个和最后一个步骤的实际索引
                potentialCell.dataset.firstIndex = actualIndex;
                potentialCell.dataset.lastIndex = actualIndex + group.steps.length - 1;
                row.appendChild(potentialCell);

                // 属性列 - 根据不同视图模式显示信息
                selectedProperties.forEach(property => {
                    const cell = document.createElement('td');
                    cell.dataset.groupIndex = groupIndex;
                    // 保存第一个和最后一个步骤的实际索引
                    cell.dataset.firstIndex = actualIndex;
                    cell.dataset.lastIndex = actualIndex + group.steps.length - 1;

                    switch (currentViewMode) {
                        case 'change':
                            // 显示属性变化值和重复次数
                            const enchantment = firstStep.enchantments.find(e => e.property.id === property.id);
                            if (enchantment && enchantment.value !== 0) {
                                const value = enchantment.value;
                                cell.textContent = `${value > 0 ? `+${value}` : value.toString()} (×${group.count})`;
                            } else {
                                cell.textContent = '';
                            }
                            break;
                        case 'value':
                            // 显示附魔后的属性值
                            const currentValue = lastStep.currentProperties[property.id] || 0;
                            if (currentValue !== 0) {
                                const actualValue = attrNumToActualNum(property, currentValue);
                                cell.textContent = actualValue;
                            } else {
                                cell.textContent = '';
                            }
                            break;
                        case 'potential':
                            // 显示各属性消耗潜力和重复次数
                            if (firstStep.isIgnored) {
                                // 如果是忽略的步骤，显示N/A
                                cell.textContent = 'N/A';
                            } else {
                                let totalGroupPotentialChange = 0;
                                let individualPotentialChanges = [];

                                // 计算所有步骤的潜力变化总和
                                group.steps.forEach(step => {
                                    const stepPotentialChange = step.propertyPotentialChanges[property.id] || 0;
                                    totalGroupPotentialChange += stepPotentialChange;
                                    if (stepPotentialChange !== 0) {
                                        individualPotentialChanges.push(stepPotentialChange);
                                    }
                                });

                                if (totalGroupPotentialChange !== 0) {
                                    if (individualPotentialChanges.length > 0 && individualPotentialChanges.every(change => change === individualPotentialChanges[0])) {
                                        // 如果所有步骤的潜力消耗相同
                                        const potentialChange = individualPotentialChanges[0];
                                        // cell.textContent = `${potentialChange > 0 ? `+${potentialChange}` : potentialChange.toString()} (×${group.count}, 总计: ${totalGroupPotentialChange > 0 ? `+${totalGroupPotentialChange}` : totalGroupPotentialChange.toString()})`;
                                        cell.textContent = `${totalGroupPotentialChange > 0 ? `+${totalGroupPotentialChange}` : totalGroupPotentialChange.toString()}`;
                                    } else {
                                        // 如果步骤间的潜力消耗不同
                                        // cell.textContent = `总计: ${totalGroupPotentialChange > 0 ? `+${totalGroupPotentialChange}` : totalGroupPotentialChange.toString()}`;
                                        cell.textContent = `${totalGroupPotentialChange > 0 ? `+${totalGroupPotentialChange}` : totalGroupPotentialChange.toString()}`;
                                    }
                                } else {
                                    // 潜力无变化时，检查每一步的潜力变化情况
                                    // 收集所有步骤的潜力变化值（包括0值）
                                    const allPotentialChanges = group.steps.map(step =>
                                        step.propertyPotentialChanges[property.id] || 0
                                    );

                                    // 检查所有步骤的潜力变化值是否相同
                                    if (allPotentialChanges.every(change => change === allPotentialChanges[0])) {
                                        // 所有步骤的潜力变化相同（都为0），检查属性值变化
                                        const enchantment = firstStep.enchantments.find(e => e.property.id === property.id);
                                        if (enchantment && enchantment.value !== 0) {
                                            // 属性值有变化但潜力无变化
                                            if (enchantment.value > 0) {
                                                cell.textContent = `-0 (×${group.count})`; // 消耗0点潜力但属性值增加
                                            } else {
                                                cell.textContent = `+0 (×${group.count})`; // 返还0点潜力但属性值减少
                                            }
                                        } else {
                                            cell.textContent = '';
                                        }
                                    } else {
                                        // 步骤间的潜力变化不同（虽然总和为0），显示总计信息
                                        cell.textContent = `-0`;
                                    }
                                }
                            }
                            break;
                        case 'material':
                            // 显示各属性消耗素材和重复次数
                            // 修复：计算所有折叠步骤的素材消耗总和，而不是简单乘以firstStep的消耗
                            let totalGroupMaterialCost = 0;
                            let materialCostDetails = {};
                            let hasVaryingMaterialCosts = false;

                            // 计算所有步骤的素材消耗总和
                            group.steps.forEach(step => {
                                const stepMaterialCost = step.propertyMaterialCosts[property.id] || 0;
                                if (typeof stepMaterialCost === 'object') {
                                    // 累加对象类型的素材消耗
                                    for (const key in stepMaterialCost) {
                                        if (stepMaterialCost[key] !== 0) {
                                            if (!materialCostDetails[key]) {
                                                materialCostDetails[key] = [];
                                            }
                                            materialCostDetails[key].push(stepMaterialCost[key]);
                                            totalGroupMaterialCost += stepMaterialCost[key];
                                        }
                                    }
                                } else if (stepMaterialCost !== 0) {
                                    // 累加数值类型的素材消耗
                                    totalGroupMaterialCost += stepMaterialCost;
                                }
                            });

                            // 检查是否有不同的素材消耗
                            for (const key in materialCostDetails) {
                                if (materialCostDetails[key].length > 0) {
                                    const firstValue = materialCostDetails[key][0];
                                    if (!materialCostDetails[key].every(value => value === firstValue)) {
                                        hasVaryingMaterialCosts = true;
                                        break;
                                    }
                                }
                            }

                            // 显示素材消耗
                            if (totalGroupMaterialCost !== 0) {
                                if (Object.keys(materialCostDetails).length > 0) {
                                    // 处理对象类型的素材消耗
                                    const materialValues = [];
                                    for (const key in materialCostDetails) {
                                        if (materialCostDetails[key].length > 0) {
                                            // 使用中文表示素材类型
                                            let materialName = key;
                                            switch (key) {
                                                case 'metal':
                                                    materialName = '金属';
                                                    break;
                                                case 'cloth':
                                                    materialName = '布料';
                                                    break;
                                                case 'beast':
                                                    materialName = '兽品';
                                                    break;
                                                case 'wood':
                                                    materialName = '木材';
                                                    break;
                                                case 'medicine':
                                                    materialName = '药品';
                                                    break;
                                                case 'mana':
                                                    materialName = '魔素';
                                                    break;
                                            }

                                            const totalForKey = materialCostDetails[key].reduce((sum, val) => sum + val, 0);
                                            if (hasVaryingMaterialCosts) {
                                                materialValues.push(`${materialName} ${totalForKey}`);
                                            } else {
                                                const firstValue = materialCostDetails[key][0];
                                                // materialValues.push(`${materialName} ${firstValue} (×${group.count}, 总计: ${totalForKey})`);
                                                materialValues.push(`${materialName} ${totalForKey}`);
                                            }
                                        }
                                    }
                                    cell.textContent = materialValues.length > 0 ? materialValues.join(', ') : '';
                                } else {
                                    // 处理数值类型的素材消耗
                                    cell.textContent = `${totalGroupMaterialCost}`;
                                }
                            } else {
                                cell.textContent = '';
                            }
                            break;
                    }

                    row.appendChild(cell);
                });

                tbody.appendChild(row);
                displayedIndex++;
                actualIndex += group.steps.length; // 增加实际索引
            }
        } else {
            // 处理普通步骤（非重复步骤）
            group.steps.forEach((step, indexInGroup) => {
                const row = document.createElement('tr');

                // 添加忽略/无效步骤的样式类
                if (step.isIgnored) {
                    row.classList.add('ignored');
                } else if (!step.isValid) {
                    row.classList.add('invalid');
                }

                // 潜力值列
                const potentialCell = document.createElement('td');
                if (step.isIgnored) {
                    potentialCell.textContent = 'N/A';
                } else {
                    potentialCell.textContent = step.postEnchantmentPotential;
                }
                potentialCell.dataset.stepIndex = actualIndex; // 使用实际索引
                potentialCell.dataset.actualIndex = actualIndex; // 保存实际索引
                potentialCell.dataset.columnType = 'potential';
                row.appendChild(potentialCell);

                // 属性列
                selectedProperties.forEach(property => {
                    const cell = document.createElement('td');
                    cell.dataset.stepIndex = actualIndex; // 使用实际索引
                    cell.dataset.actualIndex = actualIndex; // 保存实际索引
                    cell.dataset.propertyId = property.id;

                    switch (currentViewMode) {
                        case 'change':
                            // 显示属性变化值
                            const enchantment = step.enchantments.find(e => e.property.id === property.id);
                            // 只有当属性值不为0时才显示
                            if (step.isIgnored) {
                                // 对于被忽略的步骤，在属性变化视图下仍然显示变化值，以便用户知道被忽略的值是多少
                                if (enchantment && enchantment.value !== 0) {
                                    const value = enchantment.value;
                                    cell.textContent = value > 0 ? `+${value}` : value.toString();
                                } else {
                                    cell.textContent = '';
                                }
                            } else if (enchantment && enchantment.value !== 0) {
                                const value = enchantment.value;
                                cell.textContent = value > 0 ? `+${value}` : value.toString();
                            } else {
                                cell.textContent = '';
                            }
                            break;
                        case 'value':
                            // 显示附魔后的属性值
                            if (step.isIgnored) {
                                cell.textContent = 'N/A';
                            } else {
                                const currentValue = step.currentProperties[property.id] || 0;
                                // 获取上一步的属性值
                                let previousValue = 0;
                                const stepIndexInRecord = enchantRecord.enchantmentSteps.findIndex(s => s.id === step.id);
                                if (stepIndexInRecord > 0) {
                                    const previousStep = enchantRecord.enchantmentSteps[stepIndexInRecord - 1];
                                    previousValue = previousStep.currentProperties[property.id] || 0;
                                }

                                // 只有当属性值发生变化时才显示
                                if (currentValue !== previousValue) {
                                    // 使用attrNumToActualNum转化数值，直接显示附魔后的值
                                    const actualCurrentValue = attrNumToActualNum(property, currentValue);
                                    cell.textContent = actualCurrentValue;
                                } else {
                                    cell.textContent = '';
                                }
                            }
                            break;
                        case 'potential':
                            // 显示各属性消耗潜力
                            if (step.isIgnored) {
                                cell.textContent = 'N/A';
                            } else {
                                const potentialChange = step.propertyPotentialChanges[property.id] || 0;
                                // 只有当潜力变化不为0时才显示
                                if (potentialChange !== 0) {
                                    cell.textContent = potentialChange > 0 ? `+${potentialChange}` : potentialChange.toString();
                                } else {
                                    // 潜力无变化时，根据属性值变化显示-0或+0
                                    const enchantment = step.enchantments.find(e => e.property.id === property.id);
                                    if (enchantment && enchantment.value !== 0) {
                                        // 属性值有变化但潜力无变化
                                        if (enchantment.value > 0) {
                                            cell.textContent = '-0'; // 消耗0点潜力但属性值增加
                                        } else {
                                            cell.textContent = '+0'; // 返还0点潜力但属性值减少
                                        }
                                    } else {
                                        cell.textContent = '';
                                    }
                                }
                            }
                            break;
                        case 'material':
                            // 显示各属性消耗素材
                            if (step.isIgnored) {
                                cell.textContent = 'N/A';
                            } else {
                                const materialCost = step.propertyMaterialCosts[property.id] || 0;
                                // 只有当素材消耗不为0时才显示
                                if (materialCost !== 0) {
                                    // 如果是对象，提取其中的值显示
                                    if (typeof materialCost === 'object') {
                                        const materialValues = [];
                                        for (const key in materialCost) {
                                            if (materialCost[key] !== 0) {
                                                // 使用中文表示素材类型
                                                let materialName = key;
                                                switch (key) {
                                                    case 'metal':
                                                        materialName = '金属';
                                                        break;
                                                    case 'cloth':
                                                        materialName = '布料';
                                                        break;
                                                    case 'beast':
                                                        materialName = '兽品';
                                                        break;
                                                    case 'wood':
                                                        materialName = '木材';
                                                        break;
                                                    case 'medicine':
                                                        materialName = '药品';
                                                        break;
                                                    case 'mana':
                                                        materialName = '魔素';
                                                        break;
                                                }
                                                materialValues.push(`${materialName} ${materialCost[key]}`);
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
                    }

                    row.appendChild(cell);
                });

                tbody.appendChild(row);
                displayedIndex++;
                actualIndex++; // 增加实际索引
            });
        }
    });

    // 添加新步骤按钮行（移到最后）
    const addRow = document.createElement('tr');
    const addCell = document.createElement('td');
    addCell.colSpan = selectedProperties.length + 1;
    addCell.textContent = '+ 添加新步骤';
    addCell.style.textAlign = 'center';
    addCell.style.cursor = 'pointer';
    addCell.addEventListener('click', addNewStepAtEnd);
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
        const rate = Math.round(enchantRecord.finalSingleSuccessRate);
        if (rate > 999) {
            successRateElement.textContent = '>999';
        } else {
            successRateElement.textContent = rate;
        }
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

    // 顶部属性总览（使用中文简写名）
    // 按照用户选择的属性顺序显示
    const finalProperties = enchantRecord.getFinalProperties();
    let propertyOverview = '附魔结果';
    for (const property of selectedProperties) {
        const value = finalProperties[property.id];

        // 只显示非零属性
        if (value !== 0) {
            const actualValue = attrNumToActualNum(property, value);
            // 属性觉醒类型直接显示"原属性"或"非原属性"
            if (property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
                propertyOverview += `｜${property.nameChsAbbr}`;
            } else {
                // 其他属性显示实际值，正数加+号
                const sign = actualValue > 0 ? '+' : '';
                propertyOverview += `｜${property.nameChsAbbr}${sign}${actualValue}${property.isPercentage ? '%' : ''}`;
            }
        }
    }
    resultText += propertyOverview + '\n\n';

    // 基础信息
    resultText += `装备类型｜${enchantRecord.equipmentType.nameChsFull}\n`;
    resultText += `初始潜力｜${enchantRecord.equipmentPotential}\n`;

    // 只有非默认值才显示
    if (enchantRecord.baseEquipmentPotential !== 1) {
        resultText += `基础潜力｜${enchantRecord.baseEquipmentPotential}\n`;
    }

    if (enchantRecord.smithingLevel !== 0) {
        resultText += `锻冶熟练度｜${enchantRecord.smithingLevel}\n`;
    }

    // 理解技能等级（只有非默认值才显示）
    const understandingSkills = enchantRecord.understandingSkills;
    let understandingText = '';
    if (understandingSkills.metal !== 0) {
        understandingText += `金属Lv.${understandingSkills.metal}｜`;
    }
    if (understandingSkills.beast !== 0) {
        understandingText += `兽品Lv.${understandingSkills.beast}｜`;
    }
    if (understandingSkills.wood !== 0) {
        understandingText += `木材Lv.${understandingSkills.wood}｜`;
    }
    if (understandingSkills.cloth !== 0) {
        understandingText += `布料Lv.${understandingSkills.cloth}｜`;
    }
    if (understandingSkills.medicine !== 0) {
        understandingText += `药品Lv.${understandingSkills.medicine}｜`;
    }
    if (understandingSkills.mana !== 0) {
        understandingText += `魔素Lv.${understandingSkills.mana}｜`;
    }

    if (understandingText) {
        // 去掉末尾的"｜"
        understandingText = understandingText.slice(0, -1);
        resultText += `理解素材｜${understandingText}\n`;
    }

    if (enchantRecord.anvilLevel !== 40) {
        resultText += `铁砧等级｜${enchantRecord.anvilLevel}\n`;
    }

    if (enchantRecord.masterEnhancement2Level !== 10) {
        resultText += `大师级强化技术II等级｜${enchantRecord.masterEnhancement2Level}\n`;
    }

    resultText += '\n';

    // 素材消耗
    resultText += '素材消耗';
    const totalMaterialCosts = enchantRecord.finalTotalMaterialCosts;
    if (totalMaterialCosts.metal > 0) resultText += `｜金属${totalMaterialCosts.metal}`;
    if (totalMaterialCosts.beast > 0) resultText += `｜兽品${totalMaterialCosts.beast}`;
    if (totalMaterialCosts.wood > 0) resultText += `｜木材${totalMaterialCosts.wood}`;
    if (totalMaterialCosts.cloth > 0) resultText += `｜布料${totalMaterialCosts.cloth}`;
    if (totalMaterialCosts.medicine > 0) resultText += `｜药品${totalMaterialCosts.medicine}`;
    if (totalMaterialCosts.mana > 0) resultText += `｜魔素${totalMaterialCosts.mana}`;
    resultText += '\n\n';

    // 附魔步骤
    let validStepIndex = 1;

    // 使用预读方式处理步骤显示，解决重复步骤聚合问题
    let i = 0;
    while (i < enchantRecord.enchantmentSteps.length) {
        const currentStep = enchantRecord.enchantmentSteps[i];

        // 跳过空步骤、无效步骤和被忽略的步骤
        if (!currentStep.isValid || currentStep.enchantments.every(e => e.value === 0) || currentStep.isIgnored) {
            i++;
            continue;
        }

        // 预读后续步骤，查找连续的重复步骤
        let repeatCount = 1;
        let j = i + 1;

        // 查找连续的重复步骤
        while (j < enchantRecord.enchantmentSteps.length) {
            const nextStep = enchantRecord.enchantmentSteps[j];

            // 跳过空步骤、无效步骤和被忽略的步骤
            if (!nextStep.isValid || nextStep.enchantments.every(e => e.value === 0) || nextStep.isIgnored) {
                j++;
                continue;
            }

            // 检查是否与当前步骤具有相同的附魔属性
            if (areStepsEqual(currentStep, nextStep)) {
                repeatCount++;
                j++;
            } else {
                break;
            }
        }

        // 如果有重复步骤，显示为分次附
        if (repeatCount > 1) {
            // 显示重复步骤组
            resultText += `${validStepIndex}. 分次附、每次附`;

            // 获取当前步骤的附魔属性（所有重复步骤应该相同）
            const enchantments = currentStep.enchantments.filter(enchant => enchant.value !== 0);

            // 显示每次附的属性变化值
            const enchantmentText = enchantments
                .map(enchant => {
                    const property = enchant.property;
                    const actualValue = attrNumToActualNum(property, enchant.value);

                    // 属性觉醒类型特殊处理
                    if (property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
                        return `${property.nameChsAbbr}`;
                    } else {
                        // 正数显示+号
                        const sign = actualValue >= 0 ? '+' : '';
                        return `${property.nameChsAbbr}${sign}${actualValue}${property.isPercentage ? '%' : ''}`;
                    }
                })
                .join('、');

            resultText += enchantmentText;

            // 显示直到的最终结果
            resultText += `、直到`;

            // 显示最终属性值（取最后一个重复步骤）
            const lastStep = enchantRecord.enchantmentSteps[i + repeatCount - 1];
            const finalEnchantments = enchantments
                .map(enchant => {
                    const property = enchant.property;
                    // 获取最终步骤该属性的值
                    const finalValue = lastStep.currentProperties[property.id] || 0;
                    const actualFinalValue = attrNumToActualNum(property, finalValue);

                    // 属性觉醒类型特殊处理
                    if (property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
                        return `${property.nameChsAbbr}`;
                    } else {
                        // 正数显示+号
                        const sign = actualFinalValue >= 0 ? '+' : '';
                        return `${property.nameChsAbbr}${sign}${actualFinalValue}${property.isPercentage ? '%' : ''}`;
                    }
                })
                .join('、');

            resultText += finalEnchantments;

            // 显示结束时的剩余潜力值
            resultText += `｜${lastStep.postEnchantmentPotential}pt\n`;
            validStepIndex++;

            // 跳过已处理的重复步骤
            i = j;
        } else {
            // 单个步骤，当作普通步骤处理
            resultText += `${validStepIndex}. 附 `;

            // 显示该步骤附魔后的当前总属性（而非变化值）
            const enchantments = currentStep.enchantments.filter(enchant => enchant.value !== 0);
            const enchantmentText = enchantments
                .map(enchant => {
                    const property = enchant.property;
                    // 获取当前步骤该属性的值（附魔后的总属性）
                    const currentValue = currentStep.currentProperties[property.id] || 0;
                    const actualCurrentValue = attrNumToActualNum(property, currentValue);

                    // 属性觉醒类型特殊处理
                    if (property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
                        return `${property.nameChsAbbr}`;
                    } else {
                        // 正数显示+号
                        const sign = actualCurrentValue >= 0 ? '+' : '';
                        return `${property.nameChsAbbr}${sign}${actualCurrentValue}${property.isPercentage ? '%' : ''}`;
                    }
                })
                .join('｜');

            resultText += enchantmentText;

            // 显示结束时的剩余潜力值
            resultText += `｜${currentStep.postEnchantmentPotential}pt\n`;
            validStepIndex++;

            // 处理下一个步骤
            i++;
        }
    }

    resultText += '\n';

    // 成功率
    if (enchantRecord.finalSingleSuccessRate !== null) {
        let singleRateText = Math.round(enchantRecord.finalSingleSuccessRate);
        if (singleRateText > 999) {
            singleRateText = '>999';
        }
        resultText += `单条成功率｜${singleRateText}%\n`;
    } else {
        resultText += `单条成功率｜N/A\n`;
    }

    if (enchantRecord.finalExpectedSuccessRate !== null) {
        // 保留2位小数
        let expectedRateText = parseFloat(enchantRecord.finalExpectedSuccessRate.toFixed(2));
        resultText += `期望成功率｜${expectedRateText}%\n`;
    } else {
        resultText += `期望成功率｜N/A\n`;
    }

    resultDisplay.textContent = resultText;
}

// 事件处理函数
function onEquipmentTypeChange(event) {
    const type = event.target.value;
    enchantRecord.setEquipmentType(
        type === 'armor' ? EquipmentType.EQUIPMENT_TYPE_ARMOR : EquipmentType.EQUIPMENT_TYPE_WEAPON
    );
    enchantRecord._recalculateAllSteps();
    updateDisplay();
    saveCurrentEnchantment(); // 保存到本地存储
}

function onPlayerLevelChange(event) {
    const level = parseInt(event.target.value);
    if (!isNaN(level) && level >= 200) {
        enchantRecord.playerLevel = level;
        enchantRecord._recalculateAllSteps();
        updateDisplay();
        saveCurrentEnchantment(); // 保存到本地存储
    }
}

function onEquipmentPotentialChange(event) {
    const potential = parseInt(event.target.value);
    if (!isNaN(potential) && potential > 0) {
        enchantRecord.equipmentPotential = potential;
        enchantRecord._recalculateAllSteps();
        updateDisplay();
        saveCurrentEnchantment(); // 保存到本地存储
    }
}

function onSmithingLevelChange(event) {
    const level = parseInt(event.target.value);
    if (!isNaN(level) && level >= 0) {
        enchantRecord.smithingLevel = level;
        enchantRecord._recalculateAllSteps();
        updateDisplay();
        saveCurrentEnchantment(); // 保存到本地存储
    }
}

// 附魔名称更改事件
function onEnchantmentNameChange() {
    const newName = document.getElementById('enchantmentName').value.trim() || '未命名附魔';
    enchantRecord.setName(newName);

    // 更新列表中的名称
    if (currentEnchantmentIndex >= 0 && currentEnchantmentIndex < enchantmentList.length) {
        enchantmentList[currentEnchantmentIndex].name = newName;
        updateEnchantmentSelector();
    }

    // 保存到本地存储
    saveCurrentEnchantment();
}

// 附魔选择器更改事件
function onEnchantmentSelectorChange() {
    const selectedIndex = parseInt(document.getElementById('enchantmentSelector').value);
    switchToEnchantment(selectedIndex);
}

// // 更新基础信息
// function updateBasicInfo() {
//     const equipmentType = document.getElementById('equipmentType').value === 'weapon' ?
//         EquipmentType.EQUIPMENT_TYPE_WEAPON : EquipmentType.EQUIPMENT_TYPE_ARMOR;
//     const playerLevel = parseInt(document.getElementById('playerLevel').value) || 290;
//     const equipmentPotential = parseInt(document.getElementById('equipmentPotential').value) || 100;
//     const smithingLevel = parseInt(document.getElementById('smithingLevel').value) || 0;

//     enchantRecord.equipmentType = equipmentType;
//     enchantRecord.playerLevel = playerLevel;
//     enchantRecord.equipmentPotential = equipmentPotential;
//     enchantRecord.smithingLevel = smithingLevel;

//     // 更新显示
//     updateDisplay();
// }


// 更新基础信息显示
function updateBasicInfoDisplay() {
    document.getElementById('equipmentType').value = enchantRecord.equipmentType === EquipmentType.EQUIPMENT_TYPE_WEAPON ? 'weapon' : 'armor';
    document.getElementById('playerLevel').value = enchantRecord.playerLevel;
    document.getElementById('equipmentPotential').value = enchantRecord.equipmentPotential;
    document.getElementById('smithingLevel').value = enchantRecord.smithingLevel;
    document.getElementById('enchantmentName').value = enchantRecord.getName();

    // 更新更多配置显示
    document.getElementById('baseEquipmentPotential').value = enchantRecord.baseEquipmentPotential;
    document.getElementById('anvilLevel').value = enchantRecord.anvilLevel;
    document.getElementById('masterEnhancement2Level').value = enchantRecord.masterEnhancement2Level;
    document.getElementById('understandingMetal').value = enchantRecord.understandingSkills.metal;
    document.getElementById('understandingCloth').value = enchantRecord.understandingSkills.cloth;
    document.getElementById('understandingBeast').value = enchantRecord.understandingSkills.beast;
    document.getElementById('understandingWood').value = enchantRecord.understandingSkills.wood;
    document.getElementById('understandingMedicine').value = enchantRecord.understandingSkills.medicine;
    document.getElementById('understandingMana').value = enchantRecord.understandingSkills.mana;

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
    const oldConfig = {
        baseEquipmentPotential: enchantRecord.baseEquipmentPotential,
        anvilLevel: enchantRecord.anvilLevel,
        masterEnhancement2Level: enchantRecord.masterEnhancement2Level,
        understandingSkills: { ...enchantRecord.understandingSkills }
    };

    enchantRecord.baseEquipmentPotential = parseInt(document.getElementById('baseEquipmentPotential').value);
    enchantRecord.anvilLevel = parseInt(document.getElementById('anvilLevel').value);
    enchantRecord.masterEnhancement2Level = parseInt(document.getElementById('masterEnhancement2Level').value);
    enchantRecord.understandingSkills.metal = parseInt(document.getElementById('understandingMetal').value);
    enchantRecord.understandingSkills.cloth = parseInt(document.getElementById('understandingCloth').value);
    enchantRecord.understandingSkills.beast = parseInt(document.getElementById('understandingBeast').value);
    enchantRecord.understandingSkills.wood = parseInt(document.getElementById('understandingWood').value);
    enchantRecord.understandingSkills.medicine = parseInt(document.getElementById('understandingMedicine').value);
    enchantRecord.understandingSkills.mana = parseInt(document.getElementById('understandingMana').value);

    // 检查配置是否发生变化
    const configChanged =
        oldConfig.baseEquipmentPotential !== enchantRecord.baseEquipmentPotential ||
        oldConfig.anvilLevel !== enchantRecord.anvilLevel ||
        oldConfig.masterEnhancement2Level !== enchantRecord.masterEnhancement2Level ||
        oldConfig.understandingSkills.metal !== enchantRecord.understandingSkills.metal ||
        oldConfig.understandingSkills.cloth !== enchantRecord.understandingSkills.cloth ||
        oldConfig.understandingSkills.beast !== enchantRecord.understandingSkills.beast ||
        oldConfig.understandingSkills.wood !== enchantRecord.understandingSkills.wood ||
        oldConfig.understandingSkills.medicine !== enchantRecord.understandingSkills.medicine ||
        oldConfig.understandingSkills.mana !== enchantRecord.understandingSkills.mana;

    if (configChanged) {
        enchantRecord._recalculateAllSteps();
    }

    closeMoreConfig();
    updateDisplay();
    saveCurrentEnchantment(); // 保存到本地存储
}

// 表格点击事件处理
function onTableClick(event) {
    const cell = event.target;
    if (cell.tagName !== 'TD') return;

    // 检查是否是折叠步骤的单元格
    const row = cell.parentElement;
    if (row.classList.contains('repeated-steps') || row.classList.contains('repeat-control-row')) {
        // 不允许选择折叠步骤的单元格进行编辑
        showMessage('折叠状态下的步骤无法直接编辑，请先展开再编辑');
        return;
    }

    // 移除之前选中的样式
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }

    // 添加选中样式
    cell.classList.add('selected');
    selectedCell = cell;

    // 更新忽略按钮文本
    updateIgnoreButton();
}

// 表格右键菜单事件处理
function onTableContextMenu(event) {
    const cell = event.target;
    if (cell.tagName !== 'TD') return;

    // 阻止默认右键菜单
    event.preventDefault();

    // 检查是否是折叠步骤的单元格
    const row = cell.parentElement;
    if (row.classList.contains('repeated-steps') || row.classList.contains('repeat-control-row')) {
        // 不允许选择折叠步骤的单元格进行编辑
        showMessage('折叠状态下的步骤无法直接编辑，请先展开再编辑');
        return;
    }

    // 移除之前选中的样式
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }

    // 添加选中样式
    cell.classList.add('selected');
    selectedCell = cell;

    // 更新忽略按钮文本
    updateIgnoreButton();

    // 显示操作菜单
    showOperationMenu();
}

// 用于检测双击的变量
let lastTap = 0;
let lastTapCell = null;
// 用于检测长按的变量
let longPressTimer = null;
const longPressDuration = 500; // 长按持续时间（毫秒）

// 表格双击事件处理
function onTableDblClick(event) {
    const cell = event.target;
    if (cell.tagName !== 'TD') return;

    // 检查是否是折叠步骤的单元格
    const row = cell.parentElement;
    if (row.classList.contains('repeated-steps') || row.classList.contains('repeat-control-row')) {
        // 不允许选择折叠步骤的单元格进行编辑
        showMessage('折叠状态下的步骤无法直接编辑，请先展开再编辑');
        return;
    }

    // 移除之前选中的样式
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }

    // 添加选中样式
    cell.classList.add('selected');
    selectedCell = cell;

    // 更新忽略按钮文本
    updateIgnoreButton();

    // 如果是属性单元格，则打开属性编辑弹窗
    if (selectedCell.dataset.propertyId !== undefined) {
        showEditPropertyModal();
    }
}

// 表格触摸事件处理（用于移动端双击和长按支持）
function onTableTouchStart(event) {
    const cell = event.target;
    if (cell.tagName !== 'TD') return;

    // 清除之前的定时器
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    // 设置长按定时器
    longPressTimer = setTimeout(() => {
        // 检查是否是折叠步骤的单元格
        const row = cell.parentElement;
        if (row.classList.contains('repeated-steps') || row.classList.contains('repeat-control-row')) {
            // 不允许选择折叠步骤的单元格进行编辑
            showMessage('折叠状态下的步骤无法直接编辑，请先展开再编辑');
            return;
        }

        // 移除之前选中的样式
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }

        // 添加选中样式
        cell.classList.add('selected');
        selectedCell = cell;

        // 更新忽略按钮文本
        updateIgnoreButton();

        // 显示操作菜单
        showOperationMenu();
    }, longPressDuration);
}

function onTableTouchEnd(event) {
    const cell = event.target;
    if (cell.tagName !== 'TD') return;

    // 清除长按定时器
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    // 检查是否为同一单元格且时间间隔小于300ms
    if (lastTapCell === cell && tapLength < 300 && tapLength > 0) {
        // 触发双击事件
        event.preventDefault();

        // 检查是否是折叠步骤的单元格
        const row = cell.parentElement;
        if (row.classList.contains('repeated-steps') || row.classList.contains('repeat-control-row')) {
            // 不允许选择折叠步骤的单元格进行编辑
            showMessage('折叠状态下的步骤无法直接编辑，请先展开再编辑');
            return;
        }

        // 移除之前选中的样式
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }

        // 添加选中样式
        cell.classList.add('selected');
        selectedCell = cell;

        // 更新忽略按钮文本
        updateIgnoreButton();

        // 如果是属性单元格，则打开属性编辑弹窗
        if (selectedCell.dataset.propertyId !== undefined) {
            showEditPropertyModal();
        }

        // 重置计时器
        lastTap = 0;
        lastTapCell = null;
    } else {
        // 单击处理
        lastTap = currentTime;
        lastTapCell = cell;

        // 检查是否是折叠步骤的单元格
        const row = cell.parentElement;
        if (row.classList.contains('repeated-steps') || row.classList.contains('repeat-control-row')) {
            // 不允许选择折叠步骤的单元格进行编辑
            showMessage('折叠状态下的步骤无法直接编辑，请先展开再编辑');
            return;
        }

        // 移除之前选中的样式
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }

        // 添加选中样式
        cell.classList.add('selected');
        selectedCell = cell;

        // 更新忽略按钮文本
        updateIgnoreButton();
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
    // 更新忽略/取消忽略按钮文本
    updateIgnoreButton();
    document.getElementById('operationMenuModal').classList.remove('hidden');
}

function updateIgnoreButton() {
    const toggleIgnoreBtn = document.getElementById('toggleIgnoreBtn');
    if (!selectedCell) {
        toggleIgnoreBtn.style.display = 'none';
        return;
    }

    toggleIgnoreBtn.style.display = 'block';
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const step = enchantRecord.enchantmentSteps[stepIndex];

    if (step) {
        if (step.isIgnored) {
            toggleIgnoreBtn.textContent = '取消忽略此步骤';
        } else {
            toggleIgnoreBtn.textContent = '忽略此步骤';
        }
    }
}

function closeOperationMenu() {
    document.getElementById('operationMenuModal').classList.add('hidden');
}

function closeClearOptions() {
    document.getElementById('clearOptionsModal').classList.add('hidden');
}

function closeAddStepOptions() {
    document.getElementById('addStepOptionsModal').classList.add('hidden');
}

function closePasteStepOptions() {
    document.getElementById('pasteStepOptionsModal').classList.add('hidden');
}

function undoStep() {
    // 检查是否有步骤可以撤销
    if (enchantRecord.enchantmentSteps.length === 0) {
        showMessage('没有可以撤销的步骤');
        closeOperationMenu();
        return;
    }

    // 获取最后一个步骤
    const lastStep = enchantRecord.enchantmentSteps[enchantRecord.enchantmentSteps.length - 1];

    // 删除最后一个步骤
    enchantRecord.removeEnchantmentStep(lastStep.id);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closeOperationMenu();
}

function showClearOptions() {
    closeClearOptions();
    document.getElementById('clearOptionsModal').classList.remove('hidden');
}

function clearCell() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        closeClearOptions();
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const propertyId = selectedCell.dataset.propertyId;

    // 检查是否是属性单元格
    if (propertyId === undefined) {
        showMessage('请选择一个属性单元格');
        closeClearOptions();
        return;
    }

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        showMessage('未找到选中的步骤');
        closeClearOptions();
        return;
    }

    // 查找对应的附魔属性
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    if (!enchantment) {
        showMessage('未找到选中的属性');
        closeClearOptions();
        return;
    }

    // 清空单元格值
    enchantment.value = 0;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closeClearOptions();
}

function clearStepValues() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        closeClearOptions();
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        showMessage('未找到选中的步骤');
        closeClearOptions();
        return;
    }

    // 清空步骤中所有属性值
    step.enchantments.forEach(enchantment => {
        enchantment.value = 0;
    });

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closeClearOptions();
}

function deleteStep() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        closeClearOptions();
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        showMessage('未找到选中的步骤');
        closeClearOptions();
        return;
    }

    // 删除步骤
    enchantRecord.removeEnchantmentStep(step.id);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closeClearOptions();
}

function deleteEmptySteps() {
    // 过滤掉所有空白步骤（所有属性值都为0的步骤）
    const emptySteps = enchantRecord.enchantmentSteps.filter(step =>
        step.enchantments.every(enchant => enchant.value === 0)
    );

    if (emptySteps.length === 0) {
        showMessage('没有空白步骤');
        closeClearOptions();
        return;
    }

    // 删除所有空白步骤
    emptySteps.forEach(step => {
        enchantRecord.removeEnchantmentStep(step.id);
    });

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closeClearOptions();
}

function deleteAllSteps() {
    // 确认是否删除所有步骤
    if (!confirm('确定要删除所有步骤吗？此操作无法撤销！')) {
        closeClearOptions();
        return;
    }

    // 删除所有步骤
    while (enchantRecord.enchantmentSteps.length > 0) {
        const lastStep = enchantRecord.enchantmentSteps[enchantRecord.enchantmentSteps.length - 1];
        enchantRecord.removeEnchantmentStep(lastStep.id);
    }

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closeClearOptions();
}

function showAddStepOptions() {
    closeAddStepOptions();
    document.getElementById('addStepOptionsModal').classList.remove('hidden');
}

function addStepAbove() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        closeAddStepOptions();
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);

    // 创建一个新的附魔步骤
    const newStep = {
        enchantments: selectedProperties.map(property => ({
            property: property,
            value: 0
        }))
    };

    // 在指定位置插入新步骤
    const steps = enchantRecord.enchantmentSteps;
    steps.splice(stepIndex, 0, newStep);

    // 重新添加所有步骤以触发重新计算
    const stepsData = steps.map(step => ({
        enchantments: step.enchantments.map(enchant => ({
            property: enchant.property,
            value: enchant.value
        }))
    }));

    // 清空现有步骤
    while (enchantRecord.enchantmentSteps.length > 0) {
        const lastStep = enchantRecord.enchantmentSteps[enchantRecord.enchantmentSteps.length - 1];
        enchantRecord.removeEnchantmentStep(lastStep.id);
    }

    // 重新添加步骤
    stepsData.forEach(stepData => {
        enchantRecord.addEnchantmentStep(stepData);
    });

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closeAddStepOptions();
}

function addStepBelow() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        closeAddStepOptions();
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);

    // 创建一个新的附魔步骤
    const newStep = {
        enchantments: selectedProperties.map(property => ({
            property: property,
            value: 0
        }))
    };

    // 在指定位置插入新步骤（下方）
    const steps = enchantRecord.enchantmentSteps;
    steps.splice(stepIndex + 1, 0, newStep);

    // 重新添加所有步骤以触发重新计算
    const stepsData = steps.map(step => ({
        enchantments: step.enchantments.map(enchant => ({
            property: enchant.property,
            value: enchant.value
        }))
    }));

    // 清空现有步骤
    while (enchantRecord.enchantmentSteps.length > 0) {
        const lastStep = enchantRecord.enchantmentSteps[enchantRecord.enchantmentSteps.length - 1];
        enchantRecord.removeEnchantmentStep(lastStep.id);
    }

    // 重新添加步骤
    stepsData.forEach(stepData => {
        enchantRecord.addEnchantmentStep(stepData);
    });

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closeAddStepOptions();
}

function addNewStepAtEnd() {
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

    // 保存到本地存储
    saveCurrentEnchantment();
}

function copyStep() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        closeOperationMenu();
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        showMessage('未找到选中的步骤');
        closeOperationMenu();
        return;
    }

    // 保存步骤数据用于粘贴，包括 isIgnored 状态
    copiedStepData = {
        enchantments: step.enchantments.map(enchant => ({
            propertyId: enchant.property.id,
            value: enchant.value
        })),
        isIgnored: step.isIgnored
    };

    showMessage('步骤已复制');
    closeOperationMenu();
}

function showPasteStepOptions() {
    if (!copiedStepData) {
        showMessage('没有复制的步骤数据');
        closeOperationMenu();
        return;
    }

    closeOperationMenu();
    document.getElementById('pasteStepOptionsModal').classList.remove('hidden');
}

function pasteStepAbove() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        closePasteStepOptions();
        return;
    }

    if (!copiedStepData) {
        showMessage('没有复制的步骤数据');
        closePasteStepOptions();
        return;
    }

    // 获取粘贴次数
    const pasteCount = parseInt(document.getElementById('pasteCount').value);
    if (isNaN(pasteCount) || pasteCount <= 0) {
        showMessage('粘贴次数必须为正整数');
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);

    // 获取现有步骤
    const steps = enchantRecord.enchantmentSteps;

    // 创建要粘贴的步骤数据
    const stepsToPaste = [];
    for (let i = 0; i < pasteCount; i++) {
        const newStep = {
            enchantments: selectedProperties.map(property => {
                const copiedEnchant = copiedStepData.enchantments.find(e => e.propertyId === property.id);
                return {
                    property: property,
                    value: copiedEnchant ? copiedEnchant.value : 0
                };
            })
        };
        stepsToPaste.push(newStep);
    }

    // 在指定位置插入新步骤
    steps.splice(stepIndex, 0, ...stepsToPaste);

    // 重新添加所有步骤以触发重新计算
    const stepsData = steps.map(step => ({
        enchantments: step.enchantments.map(enchant => ({
            property: enchant.property,
            value: enchant.value
        }))
    }));

    // 清空现有步骤
    while (enchantRecord.enchantmentSteps.length > 0) {
        const lastStep = enchantRecord.enchantmentSteps[enchantRecord.enchantmentSteps.length - 1];
        enchantRecord.removeEnchantmentStep(lastStep.id);
    }

    // 重新添加步骤
    stepsData.forEach(stepData => {
        enchantRecord.addEnchantmentStep(stepData);
    });

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closePasteStepOptions();
}

function pasteStepBelow() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        closePasteStepOptions();
        return;
    }

    if (!copiedStepData) {
        showMessage('没有复制的步骤数据');
        closePasteStepOptions();
        return;
    }

    // 获取粘贴次数
    const pasteCount = parseInt(document.getElementById('pasteCount').value);
    if (isNaN(pasteCount) || pasteCount <= 0) {
        showMessage('粘贴次数必须为正整数');
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);

    // 获取现有步骤
    const steps = enchantRecord.enchantmentSteps;

    // 创建要粘贴的步骤数据
    const stepsToPaste = [];
    for (let i = 0; i < pasteCount; i++) {
        const newStep = {
            enchantments: selectedProperties.map(property => {
                const copiedEnchant = copiedStepData.enchantments.find(e => e.propertyId === property.id);
                return {
                    property: property,
                    value: copiedEnchant ? copiedEnchant.value : 0
                };
            }),
            isIgnored: copiedStepData.isIgnored || false // 使用复制的忽略状态，默认为 false
        };
        stepsToPaste.push(newStep);
    }

    // 在指定位置插入新步骤（下方）
    steps.splice(stepIndex + 1, 0, ...stepsToPaste);

    // 重新添加所有步骤以触发重新计算
    const stepsData = steps.map(step => ({
        enchantments: step.enchantments.map(enchant => ({
            property: enchant.property,
            value: enchant.value
        })),
        isIgnored: step.isIgnored // 保留步骤的忽略状态
    }));

    // 清空现有步骤
    while (enchantRecord.enchantmentSteps.length > 0) {
        const lastStep = enchantRecord.enchantmentSteps[enchantRecord.enchantmentSteps.length - 1];
        enchantRecord.removeEnchantmentStep(lastStep.id);
    }

    // 重新添加步骤
    stepsData.forEach(stepData => {
        enchantRecord.addEnchantmentStep(stepData);
    });

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    closePasteStepOptions();
}

function toggleIgnoreStep() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        closeOperationMenu();
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        showMessage('未找到选中的步骤');
        closeOperationMenu();
        return;
    }

    // 切换忽略状态
    const result = enchantRecord.setStepIgnored(step.id, !step.isIgnored);

    if (!result) {
        showMessage('设置忽略状态失败');
        closeOperationMenu();
        return;
    }

    // 提示用户操作结果
    showMessage(step.isIgnored ? '已忽略该步骤' : '已取消忽略该步骤');

    // 更新显示
    updateDisplay();

    // 更新按钮文本
    updateIgnoreButton();

    // 保存到本地存储
    saveCurrentEnchantment();

    closeOperationMenu();
}

function onAddStep() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const propertyId = selectedCell.dataset.propertyId;

    // 检查是否是属性单元格
    if (propertyId === undefined) {
        showMessage('请选择一个属性单元格');
        return;
    }

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        showMessage('未找到选中的步骤');
        return;
    }

    // 查找对应的附魔属性
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    if (!enchantment) {
        showMessage('未找到选中的属性');
        return;
    }

    // 增加属性值1
    enchantment.value += 1;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示并保持选中状态
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

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
        showMessage('请先选择一个单元格');
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const propertyId = selectedCell.dataset.propertyId;

    // 检查是否是属性单元格
    if (propertyId === undefined) {
        showMessage('请选择一个属性单元格');
        return;
    }

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        showMessage('未找到选中的步骤');
        return;
    }

    // 查找对应的附魔属性
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    if (!enchantment) {
        showMessage('未找到选中的属性');
        return;
    }

    // 减少属性值1
    enchantment.value -= 1;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示并保持选中状态
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

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
            <h2>选择视图</h2>
            <ul>
                <li data-mode="change">属性变化</li>
                <li data-mode="value">属性</li>
                <li data-mode="potential">潜力</li>
                <li data-mode="material">素材</li>
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

// 显示消息提示函数
function showMessage(message) {
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.top = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.backgroundColor = '#333';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.zIndex = '1000';
    messageElement.style.opacity = '0';
    messageElement.style.transition = 'opacity 0.3s';

    // 添加到页面
    document.body.appendChild(messageElement);

    // 显示消息
    setTimeout(() => {
        messageElement.style.opacity = '1';
    }, 10);

    // 3秒后移除消息
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, 300);
    }, 3000);
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

// 显示属性编辑弹窗
function showEditPropertyModal() {
    if (!selectedCell) {
        showMessage('请先选择一个单元格');
        return;
    }

    // 获取选中单元格的信息
    const stepIndex = parseInt(selectedCell.dataset.actualIndex !== undefined ?
        selectedCell.dataset.actualIndex :
        selectedCell.dataset.stepIndex);
    const propertyId = selectedCell.dataset.propertyId;

    // 检查是否是属性单元格
    if (propertyId === undefined) {
        showMessage('请选择一个属性单元格');
        return;
    }

    // 检查步骤索引是否有效
    if (isNaN(stepIndex)) {
        showMessage('无法编辑折叠状态下的步骤，请先展开再编辑');
        return;
    }

    // 获取当前步骤
    const step = enchantRecord.enchantmentSteps[stepIndex];
    if (!step) {
        showMessage('未找到选中的步骤');
        return;
    }

    // 查找对应的附魔属性
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    if (!enchantment) {
        showMessage('未找到选中的属性');
        return;
    }

    // 获取当前属性
    const property = enchantment.property;

    // 设置输入框的值
    const valueInput = document.getElementById('propertyValueInput');
    // 从currentProperties中获取对应属性的值作为默认值
    const currentPropertyValue = step.currentProperties[propertyId] || 0;
    valueInput.value = currentPropertyValue;

    // 设置滑块的值和范围
    const valueSlider = document.getElementById('propertyValueSlider');
    valueSlider.value = currentPropertyValue;

    // 根据属性类型设置最大值和最小值（使用calAttrMaxLimit和calAttrMinLimit函数）
    const minValue = calAttrMinLimit(property, enchantRecord.playerLevel);
    const maxValue = calAttrMaxLimit(property, enchantRecord.playerLevel);

    valueSlider.min = minValue;
    valueSlider.max = maxValue;

    // 设置滑块标签
    document.getElementById('minSliderValue').textContent = minValue;
    document.getElementById('maxSliderValue').textContent = maxValue;

    // 显示变化量范围
    // 获取上一步的属性值
    let previousPropertyValue = 0;
    if (stepIndex > 0) {
        const previousStep = enchantRecord.enchantmentSteps[stepIndex - 1];
        previousPropertyValue = previousStep.currentProperties[propertyId] || 0;
    }

    // 获取当前步骤的目标属性值
    const targetPropertyValue = step.currentProperties[propertyId] || 0;

    document.getElementById('actualValueDisplay').textContent =
        `${property.nameChsFull}${property.isPercentage ? '(%)' : ''} ${previousPropertyValue} → ${targetPropertyValue}`;

    // 显示弹窗
    document.getElementById('editPropertyModal').classList.remove('hidden');
}

// 关闭属性编辑弹窗
function closeEditPropertyModal() {
    document.getElementById('editPropertyModal').classList.add('hidden');
}

// 设置最小值
function setMinValue() {
    const valueInput = document.getElementById('propertyValueInput');
    const valueSlider = document.getElementById('propertyValueSlider');
    const propertyId = selectedCell.dataset.propertyId;

    // 获取当前步骤和属性
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const step = enchantRecord.enchantmentSteps[stepIndex];
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    const property = enchantment.property;

    // 根据属性类型设置最小值（使用calAttrMinLimit函数）
    const minValue = calAttrMinLimit(property, enchantRecord.playerLevel);

    valueInput.value = minValue;
    valueSlider.value = minValue;

    // 更新实际属性值显示
    const actualValue = attrNumToActualNum(property, minValue);
    // 获取上一步的属性值（用于显示和计算变化值）
    let previousStepPropertyValue = 0;
    if (stepIndex > 0) {
        const previousStep = enchantRecord.enchantmentSteps[stepIndex - 1];
        previousStepPropertyValue = previousStep.currentProperties[propertyId] || 0;
    }
    const actualPreviousStepValue = attrNumToActualNum(property, previousStepPropertyValue);
    document.getElementById('actualValueDisplay').textContent =
        `${property.nameChsFull}${property.isPercentage ? '(%)' : ''} ${actualPreviousStepValue} → ${actualValue}`;

    // 计算属性变化值（目标值 - 上一步中该属性的值）
    const valueChange = minValue - previousStepPropertyValue;
    // 实时更新属性值
    enchantment.value = valueChange;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();
}

// 减少值
function decreaseValue() {
    const valueInput = document.getElementById('propertyValueInput');
    const valueSlider = document.getElementById('propertyValueSlider');
    const propertyId = selectedCell.dataset.propertyId;

    // 获取当前步骤和属性
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const step = enchantRecord.enchantmentSteps[stepIndex];
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    const property = enchantment.property;

    // 获取上一步的属性值
    let previousStepPropertyValue = 0;
    if (stepIndex > 0) {
        const previousStep = enchantRecord.enchantmentSteps[stepIndex - 1];
        previousStepPropertyValue = previousStep.currentProperties[propertyId] || 0;
    }

    // 获取输入框中的当前值
    let inputValue = parseInt(valueInput.value);
    // 正确处理输入框值为0的情况
    let targetValue = (isNaN(inputValue)) ? previousStepPropertyValue : inputValue;

    // 对输入框中的值进行减一操作
    targetValue -= currentQuantity;

    // 根据属性类型限制范围（使用calAttrMaxLimit和calAttrMinLimit函数）
    const minValue = calAttrMinLimit(property, enchantRecord.playerLevel);
    const maxValue = calAttrMaxLimit(property, enchantRecord.playerLevel);
    targetValue = Math.max(targetValue, minValue);
    targetValue = Math.min(targetValue, maxValue);

    valueInput.value = targetValue;
    valueSlider.value = targetValue;

    // 更新实际属性值显示
    const actualValue = attrNumToActualNum(property, targetValue);
    const actualPreviousStepValue = attrNumToActualNum(property, previousStepPropertyValue);
    document.getElementById('actualValueDisplay').textContent =
        `${property.nameChsFull}${property.isPercentage ? '(%)' : ''} ${actualPreviousStepValue} → ${actualValue}`;

    // 计算属性变化值（目标值 - 上一步中该属性的值）
    const valueChange = targetValue - previousStepPropertyValue;
    // 实时更新属性值
    enchantment.value = valueChange;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();
}

// 增加值
function increaseValue() {
    const valueInput = document.getElementById('propertyValueInput');
    const valueSlider = document.getElementById('propertyValueSlider');
    const propertyId = selectedCell.dataset.propertyId;

    // 获取当前步骤和属性
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const step = enchantRecord.enchantmentSteps[stepIndex];
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    const property = enchantment.property;

    // 获取上一步的属性值
    let previousStepPropertyValue = 0;
    if (stepIndex > 0) {
        const previousStep = enchantRecord.enchantmentSteps[stepIndex - 1];
        previousStepPropertyValue = previousStep.currentProperties[propertyId] || 0;
    }

    // 获取输入框中的当前值
    let inputValue = parseInt(valueInput.value);
    // 正确处理输入框值为0的情况
    let targetValue = (isNaN(inputValue)) ? previousStepPropertyValue : inputValue;

    // 对输入框中的值进行加一操作
    targetValue += currentQuantity;

    // 根据属性类型限制范围（使用calAttrMaxLimit和calAttrMinLimit函数）
    const minValue = calAttrMinLimit(property, enchantRecord.playerLevel);
    const maxValue = calAttrMaxLimit(property, enchantRecord.playerLevel);
    targetValue = Math.max(targetValue, minValue);
    targetValue = Math.min(targetValue, maxValue);

    valueInput.value = targetValue;
    valueSlider.value = targetValue;

    // 更新实际属性值显示
    const actualValue = attrNumToActualNum(property, targetValue);
    const actualPreviousStepValue = attrNumToActualNum(property, previousStepPropertyValue);
    document.getElementById('actualValueDisplay').textContent =
        `${property.nameChsFull}${property.isPercentage ? '(%)' : ''} ${actualPreviousStepValue} → ${actualValue}`;

    // 计算属性变化值（目标值 - 上一步中该属性的值）
    const valueChange = targetValue - previousStepPropertyValue;
    // 实时更新属性值
    enchantment.value = valueChange;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();
}

// 设置最大值
function setMaxValue() {
    const valueInput = document.getElementById('propertyValueInput');
    const valueSlider = document.getElementById('propertyValueSlider');
    const propertyId = selectedCell.dataset.propertyId;

    // 获取当前步骤和属性
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const step = enchantRecord.enchantmentSteps[stepIndex];
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    const property = enchantment.property;

    // 根据属性类型设置最大值（使用calAttrMaxLimit函数）
    const maxValue = calAttrMaxLimit(property, enchantRecord.playerLevel);

    valueInput.value = maxValue;
    valueSlider.value = maxValue;

    // 更新实际属性值显示
    const actualValue = attrNumToActualNum(property, maxValue);
    // 获取上一步的属性值（用于显示和计算变化值）
    let previousStepPropertyValue = 0;
    if (stepIndex > 0) {
        const previousStep = enchantRecord.enchantmentSteps[stepIndex - 1];
        previousStepPropertyValue = previousStep.currentProperties[propertyId] || 0;
    }
    const actualPreviousStepValue = attrNumToActualNum(property, previousStepPropertyValue);
    document.getElementById('actualValueDisplay').textContent =
        `${property.nameChsFull}${property.isPercentage ? '(%)' : ''} ${actualPreviousStepValue} → ${actualValue}`;

    // 计算属性变化值（目标值 - 上一步中该属性的值）
    const valueChange = maxValue - previousStepPropertyValue;
    // 实时更新属性值
    enchantment.value = valueChange;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();
}

// 删除属性值（还原为上一步结束后的属性值）
function deleteValue() {
    const propertyId = selectedCell.dataset.propertyId;

    // 获取当前步骤和属性
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const step = enchantRecord.enchantmentSteps[stepIndex];
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);

    // 获取上一步的属性值
    let previousStepPropertyValue = 0;
    if (stepIndex > 0) {
        const previousStep = enchantRecord.enchantmentSteps[stepIndex - 1];
        previousStepPropertyValue = previousStep.currentProperties[propertyId] || 0;
    }

    // 将属性值设置为0（表示没有变化）
    enchantment.value = 0;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();

    // 关闭弹窗
    closeEditPropertyModal();
}

// 输入框输入事件处理
function onPropertyValueInput(event) {
    const valueInput = event.target;
    const valueSlider = document.getElementById('propertyValueSlider');
    const propertyId = selectedCell.dataset.propertyId;

    // 获取当前步骤和属性
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const step = enchantRecord.enchantmentSteps[stepIndex];
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    const property = enchantment.property;

    // 获取输入的值
    let targetValue = parseInt(valueInput.value);

    // 根据属性类型限制范围（使用calAttrMaxLimit和calAttrMinLimit函数）
    const minValue = calAttrMinLimit(property, enchantRecord.playerLevel);
    const maxValue = calAttrMaxLimit(property, enchantRecord.playerLevel);
    targetValue = Math.max(targetValue, minValue);
    targetValue = Math.min(targetValue, maxValue);

    valueInput.value = targetValue;
    valueSlider.value = targetValue;

    // 更新实际属性值显示
    const actualValue = attrNumToActualNum(property, targetValue);
    // 获取上一步的属性值（用于显示和计算变化值）
    let previousStepPropertyValue = 0;
    if (stepIndex > 0) {
        const previousStep = enchantRecord.enchantmentSteps[stepIndex - 1];
        previousStepPropertyValue = previousStep.currentProperties[propertyId] || 0;
    }
    const actualPreviousStepValue = attrNumToActualNum(property, previousStepPropertyValue);
    document.getElementById('actualValueDisplay').textContent =
        `${property.nameChsFull}${property.isPercentage ? '(%)' : ''} ${actualPreviousStepValue} → ${actualValue}`;

    // 计算属性变化值（目标值 - 上一步中该属性的值）
    const valueChange = targetValue - previousStepPropertyValue;
    // 实时更新属性值
    enchantment.value = valueChange;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();
}

// 输入框变化事件处理
function onPropertyValueChanged(event) {
    const valueInput = event.target;
    const valueSlider = document.getElementById('propertyValueSlider');
    const propertyId = selectedCell.dataset.propertyId;

    // 获取当前步骤和属性
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const step = enchantRecord.enchantmentSteps[stepIndex];
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    const property = enchantment.property;

    // 获取输入的值
    let targetValue = parseInt(valueInput.value);

    // 根据属性类型限制范围（使用calAttrMaxLimit和calAttrMinLimit函数）
    const minValue = calAttrMinLimit(property, enchantRecord.playerLevel);
    const maxValue = calAttrMaxLimit(property, enchantRecord.playerLevel);
    targetValue = Math.max(targetValue, minValue);
    targetValue = Math.min(targetValue, maxValue);

    valueInput.value = targetValue;
    valueSlider.value = targetValue;

    // 更新实际属性值显示
    const actualValue = attrNumToActualNum(property, targetValue);
    // 获取上一步的属性值（用于显示和计算变化值）
    let previousStepPropertyValue = 0;
    if (stepIndex > 0) {
        const previousStep = enchantRecord.enchantmentSteps[stepIndex - 1];
        previousStepPropertyValue = previousStep.currentProperties[propertyId] || 0;
    }
    const actualPreviousStepValue = attrNumToActualNum(property, previousStepPropertyValue);
    document.getElementById('actualValueDisplay').textContent =
        `${property.nameChsFull}${property.isPercentage ? '(%)' : ''} ${actualPreviousStepValue} → ${actualValue}`;

    // 计算属性变化值（目标值 - 上一步中该属性的值）
    const valueChange = targetValue - previousStepPropertyValue;
    // 实时更新属性值
    enchantment.value = valueChange;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();
}

// 滑块变化事件处理
function onPropertyValueSliderChange(event) {
    const valueSlider = event.target;
    const valueInput = document.getElementById('propertyValueInput');
    const propertyId = selectedCell.dataset.propertyId;

    // 获取当前步骤和属性
    const stepIndex = parseInt(selectedCell.dataset.stepIndex);
    const step = enchantRecord.enchantmentSteps[stepIndex];
    const enchantment = step.enchantments.find(e => e.property.id === propertyId);
    const property = enchantment.property;

    // 获取滑块的值
    let targetValue = parseInt(valueSlider.value);

    // 根据属性类型限制范围（使用calAttrMaxLimit和calAttrMinLimit函数）
    const minValue = calAttrMinLimit(property, enchantRecord.playerLevel);
    const maxValue = calAttrMaxLimit(property, enchantRecord.playerLevel);
    targetValue = Math.max(targetValue, minValue);
    targetValue = Math.min(targetValue, maxValue);

    valueInput.value = targetValue;
    valueSlider.value = targetValue;

    // 更新实际属性值显示
    const actualValue = attrNumToActualNum(property, targetValue);
    // 获取上一步的属性值（用于显示和计算变化值）
    let previousStepPropertyValue = 0;
    if (stepIndex > 0) {
        const previousStep = enchantRecord.enchantmentSteps[stepIndex - 1];
        previousStepPropertyValue = previousStep.currentProperties[propertyId] || 0;
    }
    const actualPreviousStepValue = attrNumToActualNum(property, previousStepPropertyValue);
    document.getElementById('actualValueDisplay').textContent =
        `${property.nameChsFull}${property.isPercentage ? '(%)' : ''} ${actualPreviousStepValue} → ${actualValue}`;

    // 计算属性变化值（目标值 - 上一步中该属性的值）
    const valueChange = targetValue - previousStepPropertyValue;
    // 实时更新属性值
    enchantment.value = valueChange;

    // 重新计算步骤
    enchantRecord.updateEnchantmentStep(step.id, step);

    // 更新显示
    updateDisplay();

    // 保存到本地存储
    saveCurrentEnchantment();
}


