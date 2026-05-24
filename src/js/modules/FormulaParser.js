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
import { attrNumToActualNum, calAttrMaxLimit } from './PotentialCalculator.js';

export default class FormulaParser {
    constructor() {
        this.properties = EnchantProperties.getProperties();
        // 属性别名映射表（包含所有属性的中文全称、中文简称、英文名等）
        this.aliasMap = {

        };
        // 初始化别名映射
        this._initAliasMap();
    }

    /**
     * 初始化属性别名映射
     * 从 EnchantProperties 中读取 nameChsFull、nameChsAbbr、nameEnFull、nameEnAbbr 作为基础别名，
     * 再补充额外的常用别名（如"暴伤"、"物攻"等简称）
     * 带百分号和不带百分号的属性分开处理
     * 用户后续可以自行添加其他别名
     */
    _initAliasMap() {
        // 从 EnchantProperties 中读取基础名称作为别名
        // 注意：nameChsFull 和 nameChsAbbr 可能在不同属性间重复（如 Str 和 StrRate 都是"力量"），
        // 这些重复的名称由 _findPropertyId 中的精确匹配步骤处理，不写入 aliasMap
        const seenNames = new Set();
        for (const [id, prop] of Object.entries(this.properties)) {
            // nameChsFull（仅当不与其他属性重复时才加入别名映射）
            if (prop.nameChsFull && prop.nameChsFull !== "") {
                if (!seenNames.has(prop.nameChsFull)) {
                    seenNames.add(prop.nameChsFull);
                    this.aliasMap[prop.nameChsFull] = id;
                }
            }
            // nameChsAbbr（仅当不与其他属性重复时才加入别名映射）
            if (prop.nameChsAbbr && prop.nameChsAbbr !== "") {
                if (!seenNames.has(prop.nameChsAbbr)) {
                    seenNames.add(prop.nameChsAbbr);
                    this.aliasMap[prop.nameChsAbbr] = id;
                }
            }
            // nameEnFull
            if (prop.nameEnFull && prop.nameEnFull !== "") {
                this.aliasMap[prop.nameEnFull] = id;
            }
            // nameEnAbbr
            if (prop.nameEnAbbr && prop.nameEnAbbr !== "") {
                this.aliasMap[prop.nameEnAbbr] = id;
            }
        }

        // 补充额外的常用别名（简称、英文名等，不区分大小写）
        const extraAliases = {
            // ===== 能力值 =====
            "str": "Str",
            "str%": "StrRate",
            "int": "Int",
            "int%": "IntRate",
            "vit": "Vit",
            "vit%": "VitRate",
            "agi": "Agi",
            "agi%": "AgiRate",
            "dex": "Dex",
            "dex%": "DexRate",

            // ===== HP/MP =====
            "hp": "MaxHp",
            "max_hp": "MaxHp",
            "hp%": "MaxHpRate",
            "max_hp%": "MaxHpRate",
            "mp": "MaxMp",
            "max_mp": "MaxMp",
            "hp回复": "HpRecovery",
            "hp自然回复": "HpRecovery",
            "natural_hp_regen": "HpRecovery",
            "hp回复%": "HpRecoveryRate",
            "hp自然回复%": "HpRecoveryRate",
            "natural_hp_regen%": "HpRecoveryRate",
            "mp回复": "MpRecovery",
            "mp自然回复": "MpRecovery",
            "natural_mp_regen": "MpRecovery",
            "mp回复%": "MpRecoveryRate",
            "mp自然回复%": "MpRecoveryRate",
            "natural_mp_regen%": "MpRecoveryRate",

            // ===== 攻击 =====
            "物攻": "Atk",
            "atk": "Atk",
            "物攻%": "AtkRate",
            "atk%": "AtkRate",
            "魔攻": "Matk",
            "matk": "Matk",
            "魔攻%": "MatkRate",
            "matk%": "MatkRate",
            "稳定": "Sta",
            "stability": "Sta",
            "物贯": "DefBreaker",
            "physical_pierce": "DefBreaker",
            "魔贯": "MdefBreaker",
            "magic_pierce": "MdefBreaker",

            // ===== 防御 =====
            "物防": "Def",
            "def": "Def",
            "物防%": "DefRate",
            "def%": "DefRate",
            "魔防": "Mdef",
            "mdef": "Mdef",
            "魔防%": "MdefRate",
            "mdef%": "MdefRate",
            "物抗": "PowerResist",
            "physical_resistance": "PowerResist",
            "魔抗": "MagicResist",
            "magic_resistance": "MagicResist",

            // ===== 命中/回避 =====
            "accuracy": "Hit",
            "accuracy%": "HitRate",
            "dodge": "Flee",
            "dodge%": "FleeRate",

            // ===== 速度 =====
            "攻速": "Aspd",
            "aspd": "Aspd",
            "攻速%": "AspdRate",
            "aspd%": "AspdRate",
            "唱速": "Cspd",
            "cspd": "Cspd",
            "唱速%": "CspdRate",
            "cspd%": "CspdRate",

            // ===== 暴击 =====
            "暴击": "Critical",
            "critical_rate": "Critical",
            "暴击%": "CriticalRate",
            "critical_rate%": "CriticalRate",
            "暴伤": "CriticalDmg",
            "critical_damage": "CriticalDmg",
            "暴伤%": "CriticalDmgRate",
            "critical_damage%": "CriticalDmgRate",

            // ===== 属性伤害 =====
            "对火": "FireKiller",
            "对地": "EarthKiller",
            "对风": "WindKiller",
            "对水": "WaterKiller",
            "对光": "LightKiller",
            "对暗": "DarkKiller",

            // ===== 属性抗性 =====
            "抗火": "FireShield",
            "抗地": "EarthShield",
            "抗风": "WindShield",
            "抗水": "WaterShield",
            "抗光": "LightShield",
            "抗暗": "DarkShield",

            // ===== 特殊 =====
            "异抗": "AntiVirus",
            "ailment_resistance": "AntiVirus",
            "guard_regenerate": "Guard",
            "guard_power": "GardPower",
            "evasion_regenerate": "Avoid",
            "仇恨": "Hate",
            "aggro": "Hate",
        };

        Object.assign(this.aliasMap, extraAliases);
    }

    /**
     * 添加属性别名
     * @param {string} alias - 别名
     * @param {string} propertyId - 属性ID
     */
    addAlias(alias, propertyId) {
        this.aliasMap[alias] = propertyId;
    }

    /**
     * 批量添加属性别名
     * @param {Object} aliases - 别名映射对象 { alias: propertyId, ... }
     */
    addAliases(aliases) {
        Object.assign(this.aliasMap, aliases);
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
                finalPropertyValues: {}
            };

            // 分步解析
            this._parseBasicInfo(cleanText, result);
            this._parseUnderstandingSkills(cleanText, result);
            this._parseAnvilAndMasterLevels(cleanText, result);
            this._parseSteps(cleanText, result);

            // 反推玩家等级
            this._inferPlayerLevel(result);

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

        // 检查是否是分次附步骤
        const repeatMatch = content.match(/^(?:分次附[、，,]\s*)?每次附\s*(.+?)(?:[、，,]\s*直到|，直到|直到)(.+?)(?:[｜|]\s*-?\d+pt)?$/);
        if (repeatMatch) {
            return this._parseRepeatedStep(repeatMatch[1], repeatMatch[2], result, currentValues);
        }

        // 检查是否是普通步骤（附 xxx，附字后面可能有空格也可能没有）
        const normalMatch = content.match(/^附\s*(.+?)(?:[｜|]\s*-?\d+pt)?$/);
        if (normalMatch) {
            return this._parseNormalStep(normalMatch[1], result, currentValues);
        }

        // 尝试直接解析（没有"附"前缀的步骤）
        const directMatch = content.match(/^(.+?)(?:[｜|]\s*-?\d+pt)?$/);
        if (directMatch) {
            return this._parseNormalStep(directMatch[1], result, currentValues);
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
     */
    _parseSingleEnchantment(text, isStepValue) {
        const match = text.match(/^(.+?)([+-])(\d+)(%)?$/);
        if (!match) return null;

        const name = match[1].trim();
        const sign = match[2];
        const value = parseInt(match[3]);
        const hasPercent = match[4] !== undefined;

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
     * 查找属性ID
     * 匹配策略：别名映射（不区分大小写）> 精确匹配 > 包含匹配（按名称长度降序，长名称优先）
     */
    _findPropertyId(name, hasPercent) {
        // 1. 先检查别名映射（精确匹配），同时检查百分比匹配
        if (this.aliasMap[name]) {
            const propId = this.aliasMap[name];
            const prop = this.properties[propId];
            if (prop && prop.isPercentage === hasPercent) {
                return propId;
            }
            // 百分比不匹配，继续到精确匹配
        }

        // 2. 别名映射（不区分大小写匹配），同时检查百分比匹配
        const lowerName = name.toLowerCase();
        for (const [alias, propId] of Object.entries(this.aliasMap)) {
            if (alias.toLowerCase() === lowerName) {
                const prop = this.properties[propId];
                if (prop && prop.isPercentage === hasPercent) {
                    return propId;
                }
                // 百分比不匹配，继续到精确匹配
                break;
            }
        }

        // 3. 精确匹配
        for (const [id, prop] of Object.entries(this.properties)) {
            if (prop.nameChsFull === name) {
                if (hasPercent && prop.isPercentage) return id;
                if (!hasPercent && !prop.isPercentage) return id;
            }
            if (prop.nameChsAbbr === name) {
                if (hasPercent && prop.isPercentage) return id;
                if (!hasPercent && !prop.isPercentage) return id;
            }
        }

        // 4. 包含匹配（按名称长度降序，长名称优先匹配）
        // 收集所有匹配的属性，按名称长度排序
        const matches = [];
        for (const [id, prop] of Object.entries(this.properties)) {
            // 检查 name 是否包含属性名，或属性名是否包含 name
            // 对于 nameChsFull，使用 includes 匹配
            if (prop.nameChsFull && prop.nameChsFull !== "") {
                if (prop.nameChsFull.includes(name) || name.includes(prop.nameChsFull)) {
                    if (hasPercent && prop.isPercentage) {
                        matches.push({ id, length: prop.nameChsFull.length, priority: 0 });
                    } else if (!hasPercent && !prop.isPercentage) {
                        matches.push({ id, length: prop.nameChsFull.length, priority: 0 });
                    }
                }
            }
            // 对于 nameChsAbbr，要求 name 以简称开头或简称以 name 开头（更严格的匹配）
            if (prop.nameChsAbbr && prop.nameChsAbbr !== "") {
                if (name.startsWith(prop.nameChsAbbr) || prop.nameChsAbbr.startsWith(name)) {
                    if (hasPercent && prop.isPercentage) {
                        matches.push({ id, length: prop.nameChsAbbr.length, priority: 1 });
                    } else if (!hasPercent && !prop.isPercentage) {
                        matches.push({ id, length: prop.nameChsAbbr.length, priority: 1 });
                    }
                }
            }
        }

        // 按优先级（full优先于abbr）和名称长度降序排序
        if (matches.length > 0) {
            matches.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return b.length - a.length;
            });
            return matches[0].id;
        }

        return null;
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
