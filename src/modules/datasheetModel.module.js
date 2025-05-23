"use strict";

/**
 * @typedef {object} datasheetModel
 * @property {Map<string, import("../models/datasheet/strSheetAccountBenefit.model")>?} strSheetAccountBenefit
 * @property {Map<string, import("../models/datasheet/strSheetDungeon.model")>?} strSheetDungeon
 * @property {Map<string, import("../models/datasheet/strSheetCreature.model")>?} strSheetCreature
 * @property {Map<string, import("../models/datasheet/itemConversion.model")>?} itemConversion
 * @property {Map<string, import("../models/datasheet/itemData.model")>?} itemData
 * @property {Map<string, import("../models/datasheet/skillIconData.model")>?} skillIconData
 * @property {Map<string, import("../models/datasheet/strSheetItem.model")>?} strSheetItem
 *
 * @typedef {import("../app").modules} modules
 */

const fs = require("fs");
const path = require("path");

const env = require("../utils/env");
const { createLogger } = require("../utils/logger");
const { getRevision } = require("../utils/helpers");
const CacheManager = require("../utils/cacheManager");
const DatasheetLoader = require("../lib/datasheetLoader");

/**
 * @param {modules} modules
 */
module.exports = async ({ gcCollect, checkComponent, pluginsLoader, localization }) => {
	/**
	 * @param {logger} logger
	 */
	const loadDatasheetModelSync = (logger, datasheetModel, directory, region, locale, useBinary) => {
		const cacheManager = new CacheManager(
			path.join(__dirname, "../../data/cache"), "dc",
			createLogger("Cache Manager", { colors: { debug: "gray" } })
		);

		const datasheetLoader = new DatasheetLoader(logger);
		let cacheRevision = null;

		if (useBinary) {
			const filePath = path.join(directory, `DataCenter_Final_${region}.dat`);

			cacheRevision = getRevision(filePath);
			datasheetLoader.fromBinary(filePath,
				env.string("DATASHEET_DATACENTER_KEY"),
				env.string("DATASHEET_DATACENTER_IV"),
				{
					isCompressed: env.bool("DATASHEET_DATACENTER_IS_COMPRESSED"),
					hasPadding: env.bool("DATASHEET_DATACENTER_HAS_PADDING")
				}
			);
		} else {
			const directoryPath = path.join(directory, locale);

			cacheRevision = getRevision(directoryPath);
			datasheetLoader.fromXml(directoryPath);
		}

		const addModel = section => {
			const model = require(`../models/datasheet/${section}.model`);

			if (datasheetModel[section] === undefined) {
				datasheetModel[section] = new Map();
			}

			const instance = new model();
			const cache = cacheManager.read(`${locale}-${section}`, cacheRevision); // read cache

			if (cache !== null && typeof instance.import === "function") {
				instance.import(cache);
				datasheetModel[section].set(locale, instance);

				datasheetLoader.logger.info(`Model loaded from cache: ${section} (${locale})`);
			} else {
				datasheetModel[section].set(locale, datasheetLoader.addModel(instance));
			}
		};

		pluginsLoader.loadComponent("datasheetModel.before", addModel);

		if (checkComponent("admin_panel")) {
			addModel("skillIconData");
			addModel("strSheetAccountBenefit");
			addModel("strSheetDungeon");
			addModel("strSheetCreature");
		}

		if (checkComponent("admin_panel") || checkComponent("portal_api")) {
			addModel("itemConversion");
		}

		if (checkComponent("admin_panel") || checkComponent("portal_api") || checkComponent("arbiter_api")) {
			addModel("itemData");
			addModel("strSheetItem");
		}

		pluginsLoader.loadComponent("datasheetModel.after", addModel);

		let dirty = false;

		if (datasheetLoader.loader.sections.length !== 0) {
			datasheetLoader.load();

			for (const [section, locales] of Object.entries(datasheetModel)) {
				const instance = locales.get(locale);

				if (typeof instance.export === "function") {
					cacheManager.save(`${locale}-${section}`, instance.export(), cacheRevision); // save cache

					datasheetLoader.logger.info(`Model saved to cache: ${section} (${locale})`);
				}
			}

			dirty = true;
		}

		for (const [section, locales] of Object.entries(datasheetModel)) {
			if (!locales.has("en") && locales.has("us")) {
				locales.set("en", locales.get("us"));

				datasheetLoader.logger.debug(`Model linked: ${section} (en) -> ${section} (us)`);
			}
		}

		return dirty;
	};

	const datasheetLogger = createLogger("Datasheet", { colors: { debug: "gray" } });
	const useBinary = env.bool("DATASHEET_USE_BINARY");
	const directory = path.join(__dirname, "../../data/datasheets");
	const datasheetModel = {};
	const variants = [];

	try {
		if (useBinary) {
			fs.readdirSync(directory).forEach(file => {
				const match = file.match(/_([A-Z]+)\.dat$/);

				if (match) {
					variants.push({ region: match[1], locale: localization.getLanguageByRegion(match[1]) });
				}
			});
		} else {
			fs.readdirSync(directory).forEach(file => {
				const stats = fs.statSync(path.join(directory, file));

				if (stats.isDirectory()) {
					variants.push({ region: localization.getRegionByLanguage(file), locale: file });
				}
			});
		}

		for (const { region, locale } of variants) {
			if (loadDatasheetModelSync(datasheetLogger, datasheetModel, directory, region, locale, useBinary)) {
				gcCollect();
			}
		}
	} catch (err) {
		datasheetLogger.error(err);
		throw "";
	}

	return datasheetModel;
};