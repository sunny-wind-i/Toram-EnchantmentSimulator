/**
 * 附魔公式文本解析器
 * 
 * 用于解析各种格式的附魔公式文本，支持：
 * 1. 布偶的标准公式格式
 * 2. 我的标准公式格式
 * 3. 其他常见公式格式
 * 
 * 解析策略：
 * - 只解析附魔需要用到的信息以及附魔步骤
 * - 素材消耗、成功率、最终附魔结果等可通过计算得到的数据不解析
 * - 理解素材等级、铁砧技能等级、大师II等级等条件是计算所需，需要解析
 * - 玩家等级通过附魔属性上限反推
 */

import EnchantProperties from './EnchantProperties.js';
import EnchantType from './EnchantType.js';
import EquipmentType from './EquipmentType.js';
import GameDefaults from './GameDefaults.js';
import PropertyManager from './PropertyManager.js';
import { attrNumToActualNum, calAttrMaxLimit, calculateMultiplier, calculateIncreasePotentialCost, calculateDecreasePotentialGain } from './PotentialCalculator.js';
import OpenCC from 'opencc-js';

export default class FormulaParser {
    constructor() {
        this.properties = EnchantProperties.getProperties();
        // 属性别名映射表：{ 别名 → 中文全名 }
        // 别名统一使用小写（英文）或简体中文
        this.aliasMap = {};
        // 繁简转换器（香港繁体 → 大陆简体）
        this._ccConverter = OpenCC.Converter({ from: 'hk', to: 'cn' });
        // 初始化别名映射
        this._initAliasMap();
    }

    /**
     * 初始化属性别名映射
     * 从 EnchantProperties 中读取 nameChsFull、nameChsAbbr、nameEnFull、nameEnAbbr 作为基础别名，
     * 再补充额外的常用别名（如"暴伤"、"物攻"等简称）
     * 所有别名映射到中文全名（nameChsFull），后续通过精确匹配确定属性ID
     * 用户后续可以自行添加其他别名
     */
    _initAliasMap() {
        // 从 EnchantProperties 中读取基础名称作为别名
        for (const [id, prop] of Object.entries(this.properties)) {
            // nameChsFull → 映射到自身的中文全名
            if (prop.nameChsFull && prop.nameChsFull !== "") {
                // 不检查重复，多个别名可以映射到同一个中文全名
                this.aliasMap[prop.nameChsFull] = prop.nameChsFull;
            }
            // nameChsAbbr → 映射到中文全名
            if (prop.nameChsAbbr && prop.nameChsAbbr !== "") {
                this.aliasMap[prop.nameChsAbbr] = prop.nameChsFull || prop.nameChsAbbr;
            }
            // nameEnFull → 转为小写后映射到中文全名
            if (prop.nameEnFull && prop.nameEnFull !== "") {
                this.aliasMap[prop.nameEnFull.toLowerCase()] = prop.nameChsFull || prop.nameEnFull;
            }
            // nameEnAbbr → 转为小写后映射到中文全名
            if (prop.nameEnAbbr && prop.nameEnAbbr !== "") {
                this.aliasMap[prop.nameEnAbbr.toLowerCase()] = prop.nameChsFull || prop.nameEnAbbr;
            }
        }

        // 元素属性名称列表（用于属性觉醒识别）
        // 布偶等附魔模拟器输出具体元素名（如"水属性"），需要根据剩余潜力值判断是原属性还是非原属性
        this.elementNames = ['火属性', '水属性', '地属性', '风属性', '光属性', '暗属性',
            '火', '水', '地', '风', '光', '暗'];

        // 补充额外的常用别名（所有 value 改为中文全名）
        const extraAliases = {
            // ===== 能力值 =====
            "str": "力量",
            "int": "智力",
            "vit": "耐力",
            "agi": "敏捷",
            "dex": "灵巧",

            // ===== HP/MP =====
            "体力值": "体力值上限",
            "hp": "体力值上限",
            "魔法值": "魔法值上限",
            "法力值": "魔法值上限",
            "mp": "魔法值上限",
            "hp回复": "体力自然回复",
            "hp自回": "体力自然回复",
            "hp自回复": "体力自然回复",
            "hp自然回复": "体力自然回复",
            "体力回复": "体力自然回复",
            "体力自回": "体力自然回复",
            "体力自回复": "体力自然回复",
            "mp回复": "魔法自然回复",
            "mp自回": "魔法自然回复",
            "mp自回复": "魔法自然回复",
            "mp自然回复": "魔法自然回复",
            "魔法回复": "魔法自然回复",
            "魔法自回": "魔法自然回复",
            "魔法自回复": "魔法自然回复",
            "法力回复": "法力自然回复",
            "法力自回": "法力自然回复",
            "法力自回复": "法力自然回复",

            // ===== 攻击 =====
            "物攻": "物理攻击",
            "atk": "物理攻击",
            "魔攻": "魔法攻击",
            "matk": "魔法攻击",
            "稳定": "稳定率",
            "stability": "稳定率",
            "物贯": "物理贯穿",
            "physical_pierce": "物理贯穿",
            "魔贯": "魔法贯穿",
            "magic_pierce": "魔法贯穿",

            // ===== 防御 =====
            "物防": "物理防御",
            "def": "物理防御",
            "魔防": "魔法防御",
            "mdef": "魔法防御",
            "物抗": "物理抗性",
            "physical_resistance": "物理抗性",
            "魔抗": "魔法抗性",
            "法抗": "魔法抗性",
            "法术抗性": "魔法抗性",
            "magic_resistance": "魔法抗性",

            // ===== 命中/回避 =====
            "accuracy": "命中",
            "dodge": "回避",

            // ===== 速度 =====
            "攻速": "攻击速度",
            "aspd": "攻击速度",
            "唱速": "咏唱速度",
            "cspd": "咏唱速度",

            // ===== 暴击 =====
            "暴击": "暴击率",
            "爆击": "暴击率",
            "爆击率": "暴击率",
            "critical_rate": "暴击率",
            "暴伤": "暴击伤害",
            "爆伤": "暴击伤害",
            "爆击伤害": "暴击伤害",
            "critical_damage": "暴击伤害",

            // ===== 属性伤害 =====
            "对火": "对火属性伤害",
            "对地": "对地属性伤害",
            "对风": "对风属性伤害",
            "对水": "对水属性伤害",
            "对光": "对光属性伤害",
            "对暗": "对暗属性伤害",

            // ===== 属性抗性 =====
            "抗火": "抗火属性",
            "抗地": "抗地属性",
            "抗风": "抗风属性",
            "抗水": "抗水属性",
            "抗光": "抗光属性",
            "抗暗": "抗暗属性",

            // ===== 特殊 =====
            "异抗": "异常抗性",
            "ailment_resistance": "异常抗性",
            "格挡率": "格挡回复",
            "guard_regenerate": "格挡回复",
            "guard_power": "格挡力",
            "闪躲率": "闪躲回复",
            "evasion_regenerate": "闪躲回复",
            "仇恨": "仇恨值",
            "恨意": "仇恨值",
            "恨意值": "仇恨值",
            "aggro": "仇恨值",
        };

        Object.assign(this.aliasMap, extraAliases);
    }

    /**
     * 添加属性别名
     * @param {string} alias - 别名（不区分大小写，英文建议小写）
     * @param {string} chineseFullName - 对应的属性中文全名（如"物理攻击"、"暴击伤害"等）
     */
    addAlias(alias, chineseFullName) {
        this.aliasMap[alias.toLowerCase()] = chineseFullName;
    }

    /**
     * 批量添加属性别名
     * @param {Object} aliases - 别名映射对象 { alias: chineseFullName, ... }
     *                         alias 不区分大小写，value 应为属性中文全名
     */
    addAliases(aliases) {
        for (const [alias, fullName] of Object.entries(aliases)) {
            this.aliasMap[alias.toLowerCase()] = fullName;
        }
    }

    /**
     * 尝试解析附魔公式文本
     * @param {string} text - 附魔公式文本
     * @returns {Object|null} 解析结果，失败返回null
     */
    parse(text) {
        if (!text || text.trim().length === 0) return null;

        try {
            // 清理文本：移除多余空行，统一换行符
            const cleanText = this._cleanText(text);

            // 解析结果对象
            const result = {
                equipmentType: null,
                playerLevel: null,
                equipmentPotential: null,
                baseEquipmentPotential: null,
                smithingLevel: null,
                anvilLevel: null,
                masterEnhancement2Level: null,
                understandingSkills: null,
                steps: [],
                // 记录解析到的属性及其最终值，用于反推玩家等级
                finalPropertyValues: {},
                // 标记是否有未解决的元素觉醒问题
                unresolvedElementAwakening: false
            };

            // 分步解析
            this._parseBasicInfo(cleanText, result);
            this._parseUnderstandingSkills(cleanText, result);
            this._parseAnvilAndMasterLevels(cleanText, result);
            this._parseSteps(cleanText, result);

            // 反推玩家等级
            this._inferPlayerLevel(result);

            // 解析后处理：通过剩余潜力值判断元素觉醒类型
            this._resolveElementAwakening(result);

            // 验证解析结果
            if (result.steps.length === 0) {
                return null;
            }

            return result;
        } catch (e) {
            console.error('公式文本解析失败:', e);
            return null;
        }
    }

    /**
     * 清理文本
     * @param {string} text 
     * @returns {string}
     */
    _cleanText(text) {
        // 统一换行符
        let cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // 移除多余空行（保留单个空行作为分隔）
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        // 移除首尾空白
        cleaned = cleaned.trim();
        return cleaned;
    }

    /**
     * 解析基础信息（装备类型、初始潜力、基础潜力、锻冶熟练度等）
     */
    _parseBasicInfo(text, result) {
        const lines = text.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // 移除 ✩ 前缀
            const cleanLine = trimmed.replace(/^✩\s*/, '');

            // 装备类型
            const equipTypeMatch = cleanLine.match(/装备类型[｜|]\s*(.+)/);
            if (equipTypeMatch) {
                const type = equipTypeMatch[1].trim();
                result.equipmentType = this._parseEquipmentType(type);
                continue;
            }

            // 直接匹配 "身体防具" 或 "武器" 等
            const directEquipMatch = cleanLine.match(/^(身体防具|身体装备|武器|追加装备|特殊装备)$/);
            if (directEquipMatch) {
                result.equipmentType = this._parseEquipmentType(directEquipMatch[1]);
                continue;
            }

            // 初始潜力 / 装备初始潜力值
            const potentialMatch = cleanLine.match(/(?:初始潜力|装备初始潜力值|初始潜力值)[｜|]\s*(\d+)/);
            if (potentialMatch) {
                result.equipmentPotential = parseInt(potentialMatch[1]);
                continue;
            }

            // 基础潜力
            const basePotentialMatch = cleanLine.match(/基础潜力[｜|]\s*(\d+)/);
            if (basePotentialMatch) {
                result.baseEquipmentPotential = parseInt(basePotentialMatch[1]);
                continue;
            }

            // 锻冶熟练度 / 基础锻造熟练度
            const smithingMatch = cleanLine.match(/(?:锻冶熟练度|基础锻造熟练度)[｜|]\s*(\d+)/);
            if (smithingMatch) {
                result.smithingLevel = parseInt(smithingMatch[1]);
                continue;
            }

            // 装备潜力（简写）
            const equipPotMatch = cleanLine.match(/装备潜力[｜|]\s*(\d+)/);
            if (equipPotMatch && result.equipmentPotential === null) {
                result.equipmentPotential = parseInt(equipPotMatch[1]);
                continue;
            }

            // 潜力需求（某些公式写法）
            const potReqMatch = cleanLine.match(/潜力需求[：:]\s*(\d+)/);
            if (potReqMatch && result.equipmentPotential === null) {
                result.equipmentPotential = parseInt(potReqMatch[1]);
                continue;
            }
        }
    }

    /**
     * 解析装备类型字符串
     */
    _parseEquipmentType(type) {
        if (type.includes('身体') || type.includes('防具') || type.includes('armor') || type.includes('Armor')) {
            return EquipmentType.EQUIPMENT_TYPE_ARMOR;
        } else if (type.includes('武器') || type.includes('weapon') || type.includes('Weapon')) {
            return EquipmentType.EQUIPMENT_TYPE_WEAPON;
        } else if (type.includes('追加') || type.includes('special') || type.includes('Special')) {
            return EquipmentType.EQUIPMENT_TYPE_ADDITIONAL;
        }
        return null;
    }

    /**
     * 解析理解素材/了解素材技能等级
     */
    _parseUnderstandingSkills(text, result) {
        const skills = {
            metal: 0,
            cloth: 0,
            beast: 0,
            wood: 0,
            medicine: 0,
            mana: 0
        };

        const lines = text.split('\n');
        let foundUnderstandingLine = false;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed) continue;

            // 移除 ✩ 前缀
            const cleanLine = trimmed.replace(/^✩\s*/, '');

            // 匹配理解素材/了解素材行（可能后面没有｜分隔符，素材等级在下一行）
            const understandingMatch = cleanLine.match(/^(?:理解素材|了解素材技能等级|了解素材)/);
            if (understandingMatch) {
                foundUnderstandingLine = true;
                // 检查当前行是否有素材等级内容（有｜分隔符）
                const inlineMatch = cleanLine.match(/^(?:理解素材|了解素材技能等级|了解素材)[｜|]\s*(.+)/);
                if (inlineMatch) {
                    this._parseMaterialLevels(inlineMatch[1], skills);
                } else {
                    // 素材等级可能在下一行
                    if (i + 1 < lines.length) {
                        const nextLine = lines[i + 1].trim().replace(/^✩\s*/, '');
                        this._parseMaterialLevels(nextLine, skills);
                    }
                }
                break;
            }
        }

        // 如果没有找到明确的理解素材行，尝试在文本中搜索各素材等级
        if (!foundUnderstandingLine) {
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // 移除 ✩ 前缀
                const cleanLine = trimmed.replace(/^✩\s*/, '');

                // 检查是否包含多个素材等级信息
                const hasMetal = /金属Lv\.?\d+/i.test(cleanLine);
                const hasBeast = /兽品Lv\.?\d+/i.test(cleanLine);
                const hasWood = /木材Lv\.?\d+/i.test(cleanLine);
                const hasCloth = /布料Lv\.?\d+/i.test(cleanLine);
                const hasMedicine = /药品Lv\.?\d+/i.test(cleanLine);
                const hasMana = /魔素Lv\.?\d+/i.test(cleanLine);

                // 如果一行中包含至少3个素材等级，认为这是素材等级行
                const count = [hasMetal, hasBeast, hasWood, hasCloth, hasMedicine, hasMana].filter(Boolean).length;
                if (count >= 3) {
                    this._parseMaterialLevels(cleanLine, skills);
                    break;
                }
            }
        }

        result.understandingSkills = skills;
    }

    /**
     * 解析素材等级字符串
     */
    _parseMaterialLevels(content, skills) {
        // 匹配各种格式: 金属Lv.9, 金属 Lv.9, 金属Lv9, 金属9
        const materialPatterns = [
            { key: 'metal', patterns: [/金属\s*Lv\.?\s*(\d+)/i, /金属\s*(\d+)/] },
            { key: 'beast', patterns: [/兽品\s*Lv\.?\s*(\d+)/i, /兽品\s*(\d+)/] },
            { key: 'wood', patterns: [/木材\s*Lv\.?\s*(\d+)/i, /木材\s*(\d+)/] },
            { key: 'cloth', patterns: [/布料\s*Lv\.?\s*(\d+)/i, /布料\s*(\d+)/] },
            { key: 'medicine', patterns: [/药品\s*Lv\.?\s*(\d+)/i, /药品\s*(\d+)/] },
            { key: 'mana', patterns: [/魔素\s*Lv\.?\s*(\d+)/i, /魔素\s*(\d+)/] }
        ];

        for (const { key, patterns } of materialPatterns) {
            for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match) {
                    skills[key] = parseInt(match[1]);
                    break;
                }
            }
        }
    }

    /**
     * 解析铁砧技能总等级和大师级强化技术II等级
     */
    _parseAnvilAndMasterLevels(text, result) {
        const lines = text.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // 移除 ✩ 前缀
            const cleanLine = trimmed.replace(/^✩\s*/, '');

            // 铁砧技能总等级
            const anvilMatch = cleanLine.match(/铁砧技能总等级[｜|]\s*Lv\.?\s*(\d+)/i);
            if (anvilMatch) {
                result.anvilLevel = parseInt(anvilMatch[1]);
                continue;
            }

            // 大师级强化技术II
            const masterMatch = cleanLine.match(/大师级强化技术II[｜|]\s*Lv\.?\s*(\d+)/i);
            if (masterMatch) {
                result.masterEnhancement2Level = parseInt(masterMatch[1]);
                continue;
            }
        }
    }

    /**
     * 解析附魔步骤
     */
    _parseSteps(text, result) {
        const lines = text.split('\n');
        const steps = [];
        let stepSectionStarted = false;
        let stepNumberPattern = /^\s*(\d+)\.\s*/;

        // 收集所有步骤行
        const stepLines = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // 跳过明显不是步骤的行
            if (/^(?:附魔结果|装备类型|初始潜力|基础潜力|锻冶熟练度|铁砧技能|大师级|理解素材|了解素材|素材消耗|素材耗量|单项成功率|期望成功率|步骤数|✩|｜cy-grimoire|单条成功率|成功率)/.test(trimmed)) {
                continue;
            }

            // 检查是否是步骤行（以数字开头）
            if (stepNumberPattern.test(trimmed)) {
                stepSectionStarted = true;
                stepLines.push(trimmed);
            } else if (stepSectionStarted && /^分次附/.test(trimmed)) {
                stepLines.push(trimmed);
            } else if (stepSectionStarted && /^每次附/.test(trimmed)) {
                stepLines.push(trimmed);
            }
        }

        // 用于跟踪每个属性的当前累积值（内部值）
        const currentValues = {};

        // 解析每个步骤行
        for (const stepLine of stepLines) {
            const step = this._parseSingleStep(stepLine, result, currentValues);
            if (step) {
                steps.push(step);
                // 更新当前累积值
                for (const enchant of step.enchantments) {
                    if (!currentValues[enchant.propertyId]) {
                        currentValues[enchant.propertyId] = 0;
                    }
                    currentValues[enchant.propertyId] += enchant.value;
                }
            }
        }

        result.steps = steps;
    }

    /**
     * 解析单个步骤行
     */
    _parseSingleStep(line, result, currentValues) {
        // 移除步骤编号
        let content = line.replace(/^\s*\d+\.\s*/, '').trim();

        // 提取剩余潜力值（格式：｜-156pt 或 |-156pt 在行尾）
        let remainingPotential = null;
        const ptMatch = content.match(/[｜|]\s*(-?\d+)pt\s*$/);
        if (ptMatch) {
            remainingPotential = parseInt(ptMatch[1]);
            // 移除末尾的｜-156pt部分，保留附魔内容
            content = content.substring(0, ptMatch.index);
        }

        // 检查是否是分次附步骤
        const repeatMatch = content.match(/^(?:分次附[、，,]\s*)?每次附\s*(.+?)(?:[、，,]\s*直到|，直到|直到)(.+?)$/);
        if (repeatMatch) {
            const stepResult = this._parseRepeatedStep(repeatMatch[1], repeatMatch[2], result, currentValues);
            if (stepResult) {
                stepResult.remainingPotential = remainingPotential;
            }
            return stepResult;
        }

        // 检查是否是普通步骤（附 xxx，附字后面可能有空格也可能没有）
        const normalMatch = content.match(/^附\s*(.+)$/);
        if (normalMatch) {
            const stepResult = this._parseNormalStep(normalMatch[1], result, currentValues);
            if (stepResult) {
                stepResult.remainingPotential = remainingPotential;
            }
            return stepResult;
        }

        // 尝试直接解析（没有"附"前缀的步骤）
        const directMatch = content.match(/^(.+)$/);
        if (directMatch) {
            const stepResult = this._parseNormalStep(directMatch[1], result, currentValues);
            if (stepResult) {
                stepResult.remainingPotential = remainingPotential;
            }
            return stepResult;
        }

        return null;
    }

    /**
     * 解析分次附步骤
     * 步长部分（每次附xxx）表示每次增加的量
     * 目标部分（直到yyy）表示"附到yyy"，即目标值，需要减去当前累积值得到最终需要达到的目标
     */
    _parseRepeatedStep(stepContent, targetContent, result, currentValues) {
        const stepEnchantments = this._parseEnchantments(stepContent, true);
        if (stepEnchantments.length === 0) return null;

        const targetEnchantments = this._parseEnchantments(targetContent, false);
        if (targetEnchantments.length === 0) return null;

        const enchantments = [];
        for (let i = 0; i < stepEnchantments.length; i++) {
            const stepEnchant = stepEnchantments[i];
            const targetEnchant = targetEnchantments.find(e => e.propertyId === stepEnchant.propertyId);

            if (!targetEnchant) continue;

            const stepSize = Math.abs(stepEnchant.value);
            // 目标值是"附到"的值，需要减去当前累积值得到本次分次附需要达到的最终值
            const currentAccumulated = currentValues[stepEnchant.propertyId] || 0;
            const targetValue = targetEnchant.value - currentAccumulated;
            let currentValue = 0;

            while (true) {
                const nextValue = currentValue + stepEnchant.value;

                if ((stepEnchant.value > 0 && nextValue >= targetValue) ||
                    (stepEnchant.value < 0 && nextValue <= targetValue)) {
                    const diff = targetValue - currentValue;
                    if (diff !== 0) {
                        enchantments.push({
                            propertyId: stepEnchant.propertyId,
                            value: diff,
                            isRepeated: true,
                            stepSize: stepSize
                        });
                    }
                    break;
                }

                enchantments.push({
                    propertyId: stepEnchant.propertyId,
                    value: stepEnchant.value,
                    isRepeated: true,
                    stepSize: stepSize
                });
                currentValue = nextValue;
            }
        }

        return {
            type: 'repeated',
            enchantments: enchantments
        };
    }

    /**
     * 解析普通步骤
     * 公式中的属性值表示"附到xxx"，即目标值，需要减去当前累积值得到变化值
     */
    _parseNormalStep(content, result, currentValues) {
        const targetEnchantments = this._parseEnchantments(content, false);
        if (targetEnchantments.length === 0) return null;

        // 将目标值转换为变化值（目标值 - 当前累积值）
        const enchantments = targetEnchantments.map(enchant => {
            const currentValue = currentValues[enchant.propertyId] || 0;
            const changeValue = enchant.value - currentValue;
            return {
                ...enchant,
                value: changeValue
            };
        });

        return {
            type: 'normal',
            enchantments: enchantments
        };
    }

    /**
     * 解析附魔属性列表
     */
    _parseEnchantments(content, isStepValue) {
        const enchantments = [];

        // 按分隔符拆分（支持｜、|、 、,等）
        const parts = content.split(/[｜|、，,\s]+/).filter(p => p.trim());

        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            const enchant = this._parseSingleEnchantment(trimmed, isStepValue);
            if (enchant) {
                enchantments.push(enchant);
            }
        }

        return enchantments;
    }

    /**
     * 解析单个附魔属性
     * 
     * 处理流程：
     * 1. 先检查是否是元素觉醒文本（没有数值的属性觉醒）
     * 2. 检测百分号位置，分情况提取属性名、符号、数值、hasPercent
     * 3. 英文转小写，繁体中文转简体
     * 4. 调用 _findPropertyId 查找属性ID
     * 
     * 百分号规则：
     * - 0个百分号：标准格式，hasPercent=false
     * - 1个百分号：
     *   - 在属性名中（如 "Str%+10"）：去掉%，hasPercent=true
     *   - 在数值后（如 "Str+10%"）：正常分割，hasPercent=true
     * - 2个及以上百分号：格式错误，返回null
     */
    _parseSingleEnchantment(text, isStepValue) {
        // 先检查是否是元素觉醒文本（没有数值的属性觉醒）
        const elementAwakeningCheck = this._tryParseElementAwakening(text);
        if (elementAwakeningCheck) {
            return elementAwakeningCheck;
        }

        // 检测百分号数量和位置
        const percentCount = (text.match(/%/g) || []).length;
        if (percentCount > 1) return null; // 多个%视为格式错误

        let name, sign, value, hasPercent;

        if (percentCount === 0) {
            // 无百分号：标准格式 "属性名+数值"
            const match = text.match(/^(.+?)\s*([+-])\s*(\d+)\s*$/);
            if (!match) return null;
            name = match[1].trim();
            sign = match[2];
            value = parseInt(match[3]);
            hasPercent = false;
        } else {
            // 有1个百分号：判断位置
            const percentIndex = text.indexOf('%');

            // 尝试匹配 %在数值后："属性名+数值%"
            const suffixMatch = text.match(/^(.+?)\s*([+-])\s*(\d+)\s*%\s*$/);
            if (suffixMatch) {
                name = suffixMatch[1].trim();
                sign = suffixMatch[2];
                value = parseInt(suffixMatch[3]);
                hasPercent = true;
            } else {
                // 尝试匹配 %在属性名中："属性名%+数值"
                const prefixMatch = text.match(/^(.+?)%\s*([+-])\s*(\d+)\s*$/);
                if (prefixMatch) {
                    name = prefixMatch[1].trim();
                    sign = prefixMatch[2];
                    value = parseInt(prefixMatch[3]);
                    hasPercent = true;
                } else {
                    // 百分号在其他位置，格式错误
                    return null;
                }
            }
        }

        // 统一处理：英文转小写，繁体中文转简体
        name = name.toLowerCase();
        name = this._traditionalToSimplified(name);

        const propertyId = this._findPropertyId(name, hasPercent);
        if (!propertyId) return null;

        const property = this.properties[propertyId];
        if (!property) return null;

        let internalValue = this._displayValueToInternal(property, value, sign === '+' ? 1 : -1, isStepValue);

        return {
            propertyId: propertyId,
            value: internalValue,
            displayName: name,
            displayValue: sign === '+' ? value : -value,
            hasPercent: hasPercent
        };
    }

    /**
     * 尝试解析元素觉醒文本
     * 元素觉醒没有数值，文本如"原属性"、"非原属性"、"水属性"、"光属性"等
     * 
     * @param {string} text - 要解析的文本
     * @returns {Object|null} 解析结果或null
     */
    _tryParseElementAwakening(text) {
        const trimmed = text.trim();
        if (!trimmed) return null;

        // 检查是否是"原属性"或"非原属性"
        if (trimmed === "原属性") {
            return {
                propertyId: "OriginalElement",
                value: 1,
                displayName: "原属性",
                displayValue: 1,
                hasPercent: false,
                isElementAwakening: true,
                elementAwakeningResolved: true
            };
        }
        if (trimmed === "非原属性") {
            return {
                propertyId: "OtherElement",
                value: 1,
                displayName: "非原属性",
                displayValue: 1,
                hasPercent: false,
                isElementAwakening: true,
                elementAwakeningResolved: true
            };
        }

        // 检查是否是具体的元素名称（不带数值）
        // 格式：火属性, 水属性, 地属性, 风属性, 光属性, 暗属性
        // 或简写：火, 水, 地, 风, 光, 暗
        const elementMatch = trimmed.match(/^(火属性|水属性|地属性|风属性|光属性|暗属性|火|水|地|风|光|暗)$/);
        if (elementMatch) {
            return {
                propertyId: null, // 暂时未知，需要在解析后通过剩余潜力值判断
                value: 1,
                displayName: elementMatch[1],
                displayValue: 1,
                hasPercent: false,
                isElementAwakening: true,
                elementAwakeningResolved: false,
                elementName: elementMatch[1] // 记录元素名，用于后续判断
            };
        }

        return null;
    }

    /**
     * 繁体中文转简体中文
     * @param {string} text - 输入文本
     * @returns {string} 转换后的简体文本
     */
    _traditionalToSimplified(text) {
        if (!text) return text;
        try {
            return this._ccConverter(text);
        } catch (e) {
            console.warn('繁简转换失败:', e);
            return text;
        }
    }

    /**
     * 查找属性ID（重构版）
     * 
     * 匹配策略（按顺序执行）：
     * 第2步：别名映射 — 整个字符串精确匹配 aliasMap，替换为中文全名
     * 第3步：精确匹配 — 在 PM 中精确匹配 nameChsFull/nameChsAbbr/nameEnFull/nameEnAbbr
     * 第4步：模糊匹配 — 在 PM 中按包含关系匹配，长名称优先
     * 第5步：别名替换重试 — 替换 name 中的最长匹配子串后，执行第4步
     * 
     * @param {string} name - 已转小写+简体的属性名
     * @param {boolean} hasPercent - 是否有百分号
     * @returns {string|null} 属性ID或null
     */
    _findPropertyId(name, hasPercent) {
        // ===== 第2步：别名映射（整个字符串精确匹配） =====
        let mappedName = name;
        if (this.aliasMap[name]) {
            mappedName = this.aliasMap[name];
        }

        // ===== 第3步：精确匹配（在 PM 中精确匹配四种名称之一） =====
        const exactResult = this._exactMatch(mappedName, hasPercent);
        if (exactResult) return exactResult;

        // ===== 第4步：模糊匹配（包含关系，长名称优先） =====
        const fuzzyResult = this._fuzzyMatch(mappedName, hasPercent);
        if (fuzzyResult) return fuzzyResult;

        // ===== 第5步：别名替换重试（替换最长匹配子串后，执行第4步） =====
        if (mappedName !== name) {
            // 如果第2步已经做过整串替换，且精确/模糊匹配都失败，则不再尝试
            // 因为整串替换后的结果已经是最优的了
            return null;
        }

        // 在 aliasMap 中查找 name 的最长匹配子串
        const replacedName = this._aliasSubstringReplace(name);
        if (replacedName && replacedName !== name) {
            // 用替换后的名称重新执行第4步（模糊匹配）
            const retryResult = this._fuzzyMatch(replacedName, hasPercent);
            if (retryResult) return retryResult;
        }

        return null;
    }

    /**
     * 第3步：精确匹配
     * 在 PM 中精确匹配 nameChsFull/nameChsAbbr/nameEnFull/nameEnAbbr
     */
    _exactMatch(name, hasPercent) {
        for (const [id, prop] of Object.entries(this.properties)) {
            if (prop.isPercentage !== hasPercent) continue;

            // 检查四种名称
            if (prop.nameChsFull && prop.nameChsFull !== "" && prop.nameChsFull === name) {
                return id;
            }
            if (prop.nameChsAbbr && prop.nameChsAbbr !== "" && prop.nameChsAbbr === name) {
                return id;
            }
            if (prop.nameEnFull && prop.nameEnFull !== "") {
                // 英文名在预处理时已转小写，PM中的英文名也要转小写比较
                const enFullLower = prop.nameEnFull.toLowerCase();
                if (enFullLower === name) return id;
            }
            if (prop.nameEnAbbr && prop.nameEnAbbr !== "") {
                const enAbbrLower = prop.nameEnAbbr.toLowerCase();
                if (enAbbrLower === name) return id;
            }
        }
        return null;
    }

    /**
     * 第4步：模糊匹配
     * 在 PM 中按包含关系匹配（name 包含属性名 或 属性名包含 name）
     * 按名称长度降序排列，取最长的匹配
     */
    _fuzzyMatch(name, hasPercent) {
        const matches = [];

        for (const [id, prop] of Object.entries(this.properties)) {
            if (prop.isPercentage !== hasPercent) continue;

            // 检查 nameChsFull
            if (prop.nameChsFull && prop.nameChsFull !== "") {
                if (prop.nameChsFull.includes(name) || name.includes(prop.nameChsFull)) {
                    matches.push({ id, length: prop.nameChsFull.length, priority: 0 });
                    continue; // 同一个属性只匹配一次，优先用 nameChsFull
                }
            }

            // 检查 nameChsAbbr
            if (prop.nameChsAbbr && prop.nameChsAbbr !== "") {
                if (prop.nameChsAbbr.includes(name) || name.includes(prop.nameChsAbbr)) {
                    matches.push({ id, length: prop.nameChsAbbr.length, priority: 1 });
                    continue;
                }
            }

            // 检查 nameEnFull
            if (prop.nameEnFull && prop.nameEnFull !== "") {
                const enFullLower = prop.nameEnFull.toLowerCase();
                if (enFullLower.includes(name) || name.includes(enFullLower)) {
                    matches.push({ id, length: enFullLower.length, priority: 2 });
                    continue;
                }
            }

            // 检查 nameEnAbbr
            if (prop.nameEnAbbr && prop.nameEnAbbr !== "") {
                const enAbbrLower = prop.nameEnAbbr.toLowerCase();
                if (enAbbrLower.includes(name) || name.includes(enAbbrLower)) {
                    matches.push({ id, length: enAbbrLower.length, priority: 3 });
                    continue;
                }
            }
        }

        if (matches.length > 0) {
            // 按 priority（nameChsFull > nameChsAbbr > nameEnFull > nameEnAbbr）和长度降序排序
            matches.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return b.length - a.length;
            });
            return matches[0].id;
        }

        return null;
    }

    /**
     * 第5步：别名替换（子串替换）
     * 在 name 中查找 aliasMap 的**最长匹配子串**，替换为对应的中文全名
     * 仅进行一次替换
     * 
     * @param {string} name - 输入名称
     * @returns {string} 替换后的名称，如果没有匹配则返回原名称
     */
    _aliasSubstringReplace(name) {
        // 收集所有能匹配 name 子串的别名，按长度降序排列
        const candidates = [];

        for (const [alias, fullName] of Object.entries(this.aliasMap)) {
            if (alias === fullName) continue; // 跳过自身映射（如 "力量"→"力量"）
            if (name.includes(alias)) {
                candidates.push({ alias, fullName, length: alias.length });
            }
        }

        if (candidates.length === 0) return name;

        // 按别名长度降序排列（长别名优先）
        candidates.sort((a, b) => b.length - a.length);

        // 取最长的匹配，仅替换一次
        const best = candidates[0];
        const replacedName = name.replace(best.alias, best.fullName);

        return replacedName;
    }

    /**
     * 将显示值转换为系统内部值
     */
    _displayValueToInternal(property, displayValue, sign, isStepValue) {
        if (property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) {
            return sign;
        }

        if (property.isNegativePossible === false) {
            return displayValue * sign;
        }

        if (property.upperLimitIncreaseInterval === null) {
            return Math.round(displayValue / property.preAttenuationIncrement) * sign;
        }

        if (isStepValue) {
            return Math.round(displayValue / property.preAttenuationIncrement) * sign;
        }

        const absDisplayValue = Math.abs(displayValue);
        const thresholdDisplayValue = property.attenuationThreshold * property.preAttenuationIncrement;

        if (absDisplayValue <= thresholdDisplayValue) {
            return Math.round(absDisplayValue / property.preAttenuationIncrement) * sign;
        } else {
            const excessDisplay = absDisplayValue - thresholdDisplayValue;
            const excessInternal = Math.round(excessDisplay / property.postAttenuationIncrement);
            return (property.attenuationThreshold + excessInternal) * sign;
        }
    }

    // ==================== 元素觉醒（Element Awakening）解析 ====================

    /**
     * 解析后处理：通过剩余潜力值判断布偶格式的元素觉醒类型
     * 
     * 布偶（或其他格式）的属性不会显式说明是原属性还是非原属性，
     * 需要通过该步执行之后的剩余潜力值来判断。
     * 
     * 判断方法：
     * 1. 计算如果用原属性（OriginalElement）执行后，剩余潜力值是多少
     * 2. 计算如果用非原属性（OtherElement）执行后，剩余潜力值是多少
     * 3. 哪个匹配给定的剩余潜力值，就是哪个
     * 4. 如果都不匹配，标记为 unresolvedElementAwakening
     */
    _resolveElementAwakening(result) {
        // 检查是否有任何步骤有未解析的元素觉醒
        let hasUnresolved = false;
        for (const step of result.steps) {
            for (const enchant of step.enchantments) {
                if (enchant.isElementAwakening && !enchant.elementAwakeningResolved) {
                    hasUnresolved = true;
                }
            }
        }

        if (!hasUnresolved) return;

        // 需要先有玩家等级、装备类型等信息
        // 如果玩家等级未知，使用默认值
        const playerLevel = result.playerLevel || GameDefaults.PLAYER_LEVEL;
        const equipmentType = result.equipmentType || EquipmentType.EQUIPMENT_TYPE_WEAPON;

        // 获取原属性和非原属性的配置
        const originalElementProp = EnchantProperties.getPropertyById('OriginalElement');
        const otherElementProp = EnchantProperties.getPropertyById('OtherElement');

        if (!originalElementProp || !otherElementProp) {
            // 如果没有找到属性配置，无法判断
            for (const step of result.steps) {
                for (const enchant of step.enchantments) {
                    if (enchant.isElementAwakening && !enchant.elementAwakeningResolved) {
                        enchant.elementAwakeningResolved = true;
                        // 默认使用非原属性
                        enchant.propertyId = 'OtherElement';
                    }
                }
            }
            return;
        }

        // 模拟执行每一步，计算每一步后的累计变化
        let currentPotential = result.equipmentPotential || GameDefaults.EQUIPMENT_POTENTIAL;
        const allEnchantedIds = [];

        for (const step of result.steps) {
            // 收集这一步中所有非元素觉醒的属性ID（用于倍率计算）
            const currentStepIds = [];
            for (const enchant of step.enchantments) {
                if (!enchant.isElementAwakening && enchant.propertyId) {
                    currentStepIds.push(enchant.propertyId);
                }
            }

            // 合并到总列表
            const stepAllIds = [...new Set([...allEnchantedIds, ...currentStepIds])];

            for (const enchant of step.enchantments) {
                if (enchant.isElementAwakening && !enchant.elementAwakeningResolved) {
                    if (step.remainingPotential !== null) {
                        // 获取本步执行前所有属性值
                        const preValues = this._getPreStepPropertyValues(result, step);

                        // 计算整步分别使用原属性/非原属性时的潜力变化
                        const originalStepChange = this._calcStepPotentialChange(
                            step, 'OriginalElement', preValues, allEnchantedIds, equipmentType
                        );
                        const otherStepChange = this._calcStepPotentialChange(
                            step, 'OtherElement', preValues, allEnchantedIds, equipmentType
                        );

                        const originalRemaining = currentPotential + originalStepChange;
                        const otherRemaining = currentPotential + otherStepChange;

                        // 判断哪个匹配给定的剩余潜力值
                        const originalDiff = Math.abs(originalRemaining - step.remainingPotential);
                        const otherDiff = Math.abs(otherRemaining - step.remainingPotential);

                        const tolerance = 1; // 允许1点误差

                        if (originalDiff <= tolerance && otherDiff > tolerance) {
                            // 原属性匹配
                            enchant.propertyId = 'OriginalElement';
                            enchant.elementAwakeningResolved = true;
                        } else if (otherDiff <= tolerance && originalDiff > tolerance) {
                            // 非原属性匹配
                            enchant.propertyId = 'OtherElement';
                            enchant.elementAwakeningResolved = true;
                        } else if (originalDiff <= tolerance && otherDiff <= tolerance) {
                            // 都匹配，默认使用原属性（消耗更少）
                            enchant.propertyId = 'OriginalElement';
                            enchant.elementAwakeningResolved = true;
                        } else {
                            // 都不匹配
                            enchant.elementAwakeningResolved = false;
                            result.unresolvedElementAwakening = true;
                        }
                    } else {
                        // 没有剩余潜力值信息，无法判断
                        enchant.elementAwakeningResolved = false;
                        result.unresolvedElementAwakening = true;
                    }
                }
            }

            // 更新 allEnchantedIds（合并已解析的属性ID，无论是否元素觉醒）
            for (const enchant of step.enchantments) {
                if (enchant.propertyId) {
                    if (!allEnchantedIds.includes(enchant.propertyId)) {
                        allEnchantedIds.push(enchant.propertyId);
                    }
                }
            }

            // 更新当前潜力值
            // 如果有步骤提供了剩余潜力值，直接使用；否则按已解析结果估算
            if (step.remainingPotential !== null) {
                currentPotential = step.remainingPotential;
            }
        }

        // 检查是否有未解析的元素觉醒
        for (const step of result.steps) {
            for (const enchant of step.enchantments) {
                if (enchant.isElementAwakening && !enchant.elementAwakeningResolved) {
                    result.unresolvedElementAwakening = true;
                }
            }
        }
    }

    /**
     * 获取某步骤执行前的属性值
     */
    _getPreStepPropertyValues(result, targetStep) {
        const values = {};
        for (const step of result.steps) {
            if (step === targetStep) break;
            for (const enchant of step.enchantments) {
                if (!enchant.propertyId) continue;
                if (!values[enchant.propertyId]) {
                    values[enchant.propertyId] = 0;
                }
                values[enchant.propertyId] += enchant.value;
            }
        }
        return values;
    }

    /**
     * 计算某一步骤在指定元素觉醒类型下的潜力变化
     * @param {Object} step - 步骤对象
     * @param {string} elementPropertyId - 用于替换未解析元素觉醒的属性ID ('OriginalElement' 或 'OtherElement')
     * @param {Object} preValues - 步骤执行前的各属性值
     * @param {Array} allEnchantedIds - 到目前为止所有已附魔的属性ID（含本步非元素部分）
     * @param {Object} equipmentType - 装备类型
     * @returns {number} 潜力变化值（正=获得，负=消耗）
     */
    _calcStepPotentialChange(step, elementPropertyId, preValues, allEnchantedIds, equipmentType) {
        // 构建本步所有属性ID集合
        const stepIds = [];
        for (const enchant of step.enchantments) {
            if (enchant.isElementAwakening && !enchant.elementAwakeningResolved) {
                stepIds.push(elementPropertyId);
            } else if (enchant.propertyId) {
                stepIds.push(enchant.propertyId);
            }
        }

        // 合并到总列表
        const mergedIds = [...new Set([...allEnchantedIds, ...stepIds])];
        const multiplier = calculateMultiplier(mergedIds);

        let totalChange = 0;

        for (const enchant of step.enchantments) {
            if (!enchant.propertyId && !enchant.isElementAwakening) continue;

            let propId = enchant.propertyId;
            if (enchant.isElementAwakening && !enchant.elementAwakeningResolved) {
                propId = elementPropertyId;
            }

            const prop = this.properties[propId];
            if (!prop) continue;

            const preValue = preValues[propId] || 0;
            const postValue = preValue + enchant.value;

            let change = 0;
            if (postValue > preValue) {
                change = -calculateIncreasePotentialCost(prop, preValue, postValue, equipmentType);
            } else if (postValue < preValue) {
                change = calculateDecreasePotentialGain(prop, preValue, postValue, equipmentType);
            }

            totalChange += change;
        }

        return Math.trunc((totalChange * multiplier).toFixed(2));
    }

    /**
     * 计算某一步骤在已解析完成的情况下的潜力变化
     */
    _calcStepPotentialChangeResolved(step, preValues, allEnchantedIds, equipmentType) {
        const multiplier = calculateMultiplier(allEnchantedIds);

        let totalChange = 0;

        for (const enchant of step.enchantments) {
            if (!enchant.propertyId) continue;

            const prop = this.properties[enchant.propertyId];
            if (!prop) continue;

            const preValue = preValues[enchant.propertyId] || 0;
            const postValue = preValue + enchant.value;

            let change = 0;
            if (postValue > preValue) {
                change = -calculateIncreasePotentialCost(prop, preValue, postValue, equipmentType);
            } else if (postValue < preValue) {
                change = calculateDecreasePotentialGain(prop, preValue, postValue, equipmentType);
            }

            totalChange += change;
        }

        return Math.trunc((totalChange * multiplier).toFixed(2));
    }

    /**
     * 反推玩家等级
     */
    _inferPlayerLevel(result) {
        const finalValues = {};
        const currentValues = {};

        for (const step of result.steps) {
            for (const enchant of step.enchantments) {
                if (!currentValues[enchant.propertyId]) {
                    currentValues[enchant.propertyId] = 0;
                }
                currentValues[enchant.propertyId] += enchant.value;
            }
        }

        for (const [propId, value] of Object.entries(currentValues)) {
            if (value !== 0) {
                finalValues[propId] = value;
            }
        }

        result.finalPropertyValues = finalValues;

        if (Object.keys(finalValues).length === 0) {
            result.playerLevel = GameDefaults.PLAYER_LEVEL;
            return;
        }

        let minRequiredLevel = 200;

        for (const [propId, value] of Object.entries(finalValues)) {
            const property = this.properties[propId];
            if (!property) continue;

            if (property.upperLimitIncreaseInterval === null) continue;
            if (property.enchantType === EnchantType.ENCHANT_TYPE_ELEMENT_ADDITION) continue;
            if (property.isNegativePossible === false) continue;

            const absValue = Math.abs(value);

            if (absValue > property.attenuationThreshold) {
                const levelNeeded = 200 + (absValue - property.attenuationThreshold) * property.upperLimitIncreaseInterval;
                if (levelNeeded > minRequiredLevel) {
                    minRequiredLevel = levelNeeded;
                }
            }
        }

        result.playerLevel = Math.ceil(minRequiredLevel / 10) * 10;

        if (result.playerLevel < 200) {
            result.playerLevel = 200;
        }
    }

    /**
     * 将解析结果转换为 EnchantRecord 可用的格式
     */
    convertToConfig(parseResult) {
        const config = {
            equipmentType: parseResult.equipmentType || EquipmentType.EQUIPMENT_TYPE_WEAPON,
            playerLevel: parseResult.playerLevel || GameDefaults.PLAYER_LEVEL,
            equipmentPotential: parseResult.equipmentPotential || GameDefaults.EQUIPMENT_POTENTIAL,
            baseEquipmentPotential: parseResult.baseEquipmentPotential || GameDefaults.BASE_EQUIPMENT_POTENTIAL,
            smithingLevel: parseResult.smithingLevel || GameDefaults.SMITHING_LEVEL,
            anvilLevel: parseResult.anvilLevel || GameDefaults.ANVIL_LEVEL,
            masterEnhancement2Level: parseResult.masterEnhancement2Level || GameDefaults.MASTER_ENHANCEMENT_2_LEVEL,
            understandingSkills: parseResult.understandingSkills || {
                metal: GameDefaults.UNDERSTANDING_SKILL_LEVEL,
                cloth: GameDefaults.UNDERSTANDING_SKILL_LEVEL,
                beast: GameDefaults.UNDERSTANDING_SKILL_LEVEL,
                wood: GameDefaults.UNDERSTANDING_SKILL_LEVEL,
                medicine: GameDefaults.UNDERSTANDING_SKILL_LEVEL,
                mana: GameDefaults.UNDERSTANDING_SKILL_LEVEL
            },
            stepData: []
        };

        for (const step of parseResult.steps) {
            if (step.type === 'repeated') {
                for (const enchant of step.enchantments) {
                    config.stepData.push({
                        enchantments: [{
                            propertyId: enchant.propertyId,
                            value: enchant.value
                        }]
                    });
                }
            } else if (step.type === 'normal') {
                config.stepData.push({
                    enchantments: step.enchantments.map(enchant => ({
                        propertyId: enchant.propertyId,
                        value: enchant.value
                    }))
                });
            }
        }

        return config;
    }
}
