export default class EquipmentType {
    static EQUIPMENT_TYPE_WEAPON = new EquipmentType(0, "武器", "weapon")
    static EQUIPMENT_TYPE_ARMOR = new EquipmentType(1, "身体装备", "armor")

    constructor(id, nameChsFull, nameEnFull) {
        this.id = id
        // 中文全名
        this.nameChsFull = nameChsFull
        // 英文全名
        this.nameEnFull = nameEnFull
    }

    toString() {
        return `EQUIPMENT_TYPE_${this.id}`
    }
}