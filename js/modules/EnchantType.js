export default class EnchantType {
    static ENCHANT_TYPE_ABILITY = new EnchantType(0, "能力数值", "")
    static ENCHANT_TYPE_HPMP = new EnchantType(1, "体力值·魔法值", "")
    static ENCHANT_TYPE_ATK = new EnchantType(2, "攻击力", "")
    static ENCHANT_TYPE_DEF = new EnchantType(3, "防御力", "")
    static ENCHANT_TYPE_HIT = new EnchantType(4, "命中", "")
    static ENCHANT_TYPE_FLEE = new EnchantType(5, "回避", "")
    static ENCHANT_TYPE_SPEED = new EnchantType(6, "速度", "")
    static ENCHANT_TYPE_CRITICAL = new EnchantType(7, "暴击", "")
    static ENCHANT_TYPE_ELEMENT = new EnchantType(8, "属性", "")
    static ENCHANT_TYPE_SPECIAL = new EnchantType(9, "特殊强化", "")
    static ENCHANT_TYPE_ELEMENT_ADDITION = new EnchantType(10, "属性觉醒", "")

    constructor(id, nameChsFull, nameEnFull) {
        this.id = id
        this.nameChsFull = nameChsFull
        this.nameEnFull = nameEnFull
    }

    toString() {
        return `ENCHANT_TYPE_${this.id}`
    }
}