export default class MaterialType {
    static MATERIAL_TYPE_METAL = new MaterialType(0, "metal", "金属", "")
    static MATERIAL_TYPE_CLOTH = new MaterialType(1, "cloth", "布料", "")
    static MATERIAL_TYPE_BEAST = new MaterialType(2, "beast", "兽品", "")
    static MATERIAL_TYPE_WOOD = new MaterialType(3, "wood", "木材", "")
    static MATERIAL_TYPE_MEDICINE = new MaterialType(4, "medicine", "药品", "")
    static MATERIAL_TYPE_MANA = new MaterialType(5, "mana", "魔素", "")
    static arr = [this.MATERIAL_TYPE_METAL, this.MATERIAL_TYPE_CLOTH, this.MATERIAL_TYPE_BEAST, this.MATERIAL_TYPE_WOOD, this.MATERIAL_TYPE_MEDICINE, this.MATERIAL_TYPE_MANA]

    constructor(id, name, nameChsFull, nameEnFull) {
        this.id = id
        this.name = name
        this.nameChsFull = nameChsFull
        this.nameEnFull = nameEnFull
    }

    toString() {
        return `MATERIAL_TYPE_${this.id}`
    }

    static getByName(name) {
        switch (name) {
            case 'metal':
                return this.MATERIAL_TYPE_METAL;
            case 'cloth':
                return this.MATERIAL_TYPE_CLOTH;
            case 'beast':
                return this.MATERIAL_TYPE_BEAST;
            case 'wood':
                return this.MATERIAL_TYPE_WOOD;
            case 'medicine':
                return this.MATERIAL_TYPE_MEDICINE;
            case 'mana':
                return this.MATERIAL_TYPE_MANA;
            default:
                return null;
        }
    }

    static getAllMaterialTypes() {
        return this.arr;
    }
}