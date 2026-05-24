/**
 * 游戏默认值配置
 * 
 * 集中管理所有游戏相关的默认值，方便版本更新时快速修改。
 * 所有模块应从此文件读取默认值，而非硬编码。
 */

const GameDefaults = {
    /** 玩家等级 */
    PLAYER_LEVEL: 300,

    /** 装备潜力值 */
    EQUIPMENT_POTENTIAL: 100,

    /** 装备基础潜力值 */
    BASE_EQUIPMENT_POTENTIAL: 1,

    /** 锻冶熟练度 */
    SMITHING_LEVEL: 0,

    /** 铁砧技能等级 */
    ANVIL_LEVEL: 40,

    /** 大师级强化技术2技能等级 */
    MASTER_ENHANCEMENT_2_LEVEL: 10,

    /** 理解技能默认等级（实际附魔计算用） */
    UNDERSTANDING_SKILL_LEVEL: 10,

    /** 导入预览中理解素材的默认等级（未解析到时使用，表示未点技能） */
    IMPORT_UNDERSTANDING_SKILL_LEVEL: 0,

    /** 装备类型（默认武器） */
    EQUIPMENT_TYPE: null, // 由调用方根据 EquipmentType 设置

    /** 附魔名称 */
    ENCHANTMENT_NAME: "自定义附魔1",
};

export default GameDefaults;
