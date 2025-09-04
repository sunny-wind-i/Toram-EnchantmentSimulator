import PropertyManager from "./modules/PropertyManager.js";

const PM = new PropertyManager();
console.log(PM.getAllProperties());
console.log(PM.searchProperties("ab"));

