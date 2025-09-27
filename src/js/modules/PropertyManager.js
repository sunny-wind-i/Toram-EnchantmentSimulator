import EnchantProperties from "./EnchantProperties.js";

export default class PropertyManager {
    constructor() {
        this.properties = EnchantProperties.getProperties();
    }

    // 获取所有属性
    getAllProperties() {
        return Object.values(this.properties);
    }

    // 根据ID获取属性
    getProperty(id) {
        return this.properties[id];
    }

    // 根据类别获取属性
    getPropertiesByCategory(category) {
        return this.getAllProperties().filter(prop => prop.category === category);
    }

    // 搜索属性
    searchProperties(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAllProperties().filter(prop =>
            prop.nameChsFull.toLowerCase().includes(lowerQuery) ||
            prop.nameEnFull.toLowerCase().includes(lowerQuery) ||
            prop.nameChsAbbr.toLowerCase().includes(lowerQuery) ||
            prop.nameEnAbbr.toLowerCase().includes(lowerQuery) ||
            prop.description.toLowerCase().includes(lowerQuery)
        );
    }

    // 计算潜力值消耗（简化示例）
    calculatePotentialCost(propertyId, currentLevel) {
        const property = this.getProperty(propertyId);
        if (!property) return 0;

        // 简化算法：基础消耗 * (当前等级 + 1)
        return property.basePotentialCost * (currentLevel + 1);
    }
}