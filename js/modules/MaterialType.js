export class MaterialType {
    static MATERIAL_TYPE_METAL = new MaterialType(0, "金属", "")
    static MATERIAL_TYPE_CLOTH = new MaterialType(1, "布料", "")
    static MATERIAL_TYPE_BEAST = new MaterialType(2, "兽品", "")
    static MATERIAL_TYPE_WOOD = new MaterialType(3, "木材", "")
    static MATERIAL_TYPE_MEDICINE = new MaterialType(4, "药品", "")
    static MATERIAL_TYPE_MANA = new MaterialType(5, "魔素", "")
    static arr = [this.MATERIAL_TYPE_METAL, this.MATERIAL_TYPE_CLOTH, this.MATERIAL_TYPE_BEAST, this.MATERIAL_TYPE_WOOD, this.MATERIAL_TYPE_MEDICINE, this.MATERIAL_TYPE_MANA]

    constructor(id, nameChsFull, nameEnFull) {
        this.id = id
        this.nameChsFull = nameChsFull
        this.nameEnFull = nameEnFull
    }

    toString() {
        return `MATERIAL_TYPE_${this.id}`
    }
}
