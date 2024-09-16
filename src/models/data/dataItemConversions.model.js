"use strict";

/**
* @typedef {import("../data.model").Sequelize} Sequelize
* @typedef {import("../data.model").DataTypes} DataTypes
*/

/**
* @param {Sequelize} sequelize
* @param {DataTypes} DataTypes
*/
module.exports = (sequelize, DataTypes) =>
	sequelize.define("data_item_conversions", {
		itemTemplateId: {
			type: DataTypes.BIGINT(20),
			primaryKey: true,
			allowNull: false
		},
		fixedItemTemplateId: {
			type: DataTypes.BIGINT(20),
			primaryKey: true,
			allowNull: false
		},
		class: {
			type: DataTypes.STRING(50)
		},
		race: {
			type: DataTypes.STRING(50)
		},
		gender: {
			type: DataTypes.STRING(50)
		}
	}, {
		indexes: [
			{
				name: "class",
				unique: false,
				fields: ["class"]
			},
			{
				name: "race",
				unique: false,
				fields: ["race"]
			},
			{
				name: "gender",
				unique: false,
				fields: ["gender"]
			}
		]
	})
;