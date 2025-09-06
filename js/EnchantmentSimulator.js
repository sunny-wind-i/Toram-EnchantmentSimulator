import EnchantRecord from "./modules/EnchantRecord.js";
import PropertyManager from "./modules/PropertyManager.js";
import EquipmentType from "./modules/EquipmentType.js";
import { calPostEnchantmentPotential } from "./modules/PotentialCalculator.js";

const PM = new PropertyManager();
const PMProperties = PM.properties;

const record = new EnchantRecord({
    equipmentType: EquipmentType.EQUIPMENT_TYPE_WEAPON,
    playerLevel: 290,
    equipmentPotential: 114,
    baseEquipmentPotential: 1,
    smithingLevel: 75,
    understandingSkills: {
        metal: 5,
        cloth: 3,
        beast: 8,
        wood: 2,
        medicine: 4,
        mana: 6
    }
});

let potential = 114

// 暴击伤害+1% 力量+10% 暴击伤害+22 暴击率+28 ATK+14% MP自然回复-14 HP自然回复-28 回避-20
const steps = [
    // 步骤1: 附暴击伤害+1% 力量+9% =14
    {
        enchantments: [
            { property: PMProperties.CriticalDmgRate, value: 1 },
            { property: PMProperties.StrRate, value: 9 }
        ]
    },
    // 步骤2: 分次附、每次附暴击伤害+1、直到暴击伤害+4 =2
    {
        enchantments: [
            { property: PMProperties.CriticalDmg, value: 1 }
        ]
    },
    {
        enchantments: [
            { property: PMProperties.CriticalDmg, value: 1 }
        ]
    },
    {
        enchantments: [
            { property: PMProperties.CriticalDmg, value: 1 }
        ]
    },
    {
        enchantments: [
            { property: PMProperties.CriticalDmg, value: 1 }
        ]
    },
    // 步骤3: 附暴击率+1 =1
    {
        enchantments: [
            { property: PMProperties.Critical, value: 1 }
        ]
    },
    // 步骤4: 附MP自然回复-14 HP自然回复-28 回避-20 =367
    {
        enchantments: [
            { property: PMProperties.MpRecovery, value: -14 },
            { property: PMProperties.HpRecovery, value: -28 },
            { property: PMProperties.Flee, value: -15 }
        ]
    },
    // 步骤5: 每次附暴击率+1、直到暴击率+20 =348
    ...Array(19).fill().map(() => ({
        enchantments: [
            { property: PMProperties.Critical, value: 1 }
        ]
    })),
    // 步骤6: 附物理攻击+14% 力量+1% 暴击率+28 暴击伤害+22 =-90
    {
        enchantments: [
            { property: PMProperties.AtkRate, value: 14 },
            { property: PMProperties.StrRate, value: 1 },
            { property: PMProperties.Critical, value: 8 },
            { property: PMProperties.CriticalDmg, value: 18 }
        ]
    }
];


steps.forEach((step, index) => {
    potential = cal(record, step, potential);
    console.log(`Step ${index + 1}:`, potential);
    record.addEnchantmentStep(step);
});

function cal(records, step, prePotential) {
    return calPostEnchantmentPotential(
        step,
        records.getCurrentProperties(),
        records.getEnchantedProperties(),
        prePotential,
        EquipmentType.EQUIPMENT_TYPE_WEAPON
    )
}


// 导出数据
const data = record.exportData();
console.log(data);

console.log(record);

// // 导入数据
// const newRecord = new EnchantRecord();
// newRecord.importData(data);