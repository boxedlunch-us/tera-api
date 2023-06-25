"use strict";

/**
 * @typedef {import("../app").modules} modules
 * @typedef {import("express").RequestHandler} RequestHandler
 */

const moment = require("moment-timezone");
const Op = require("sequelize").Op;
const { query, body } = require("express-validator");
const helpers = require("../utils/helpers");
const PromoCodeActions = require("../actions/promoCode.actions");
const ItemClaim = require("../actions/handlers/itemClaim");
const ServiceItem = require("../utils/boxHelper").ServiceItem;

const { validationHandler, authSessionHandler, shopStatusHandler, resultJson } = require("../middlewares/portalShop.middlewares");

/**
 * @param {modules} modules
 */
module.exports.Auth = ({ passport }) => [
	shopStatusHandler,
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		if (req.isAuthenticated()) {
			return res.redirect("ShopMain");
		}

		passport.authenticate("custom", (error, user) => {
			if (error) {
				return res.status(401).send(error);
			}

			req.login(user, () => {
				res.redirect("ShopMain");
			});
		})(req, res, next);
	}
];

/**
 * @param {modules} modules
 */
module.exports.DisabledHtml = () => [
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		res.render("shopDisabled");
	}
];

/**
 * @param {modules} modules
 */
module.exports.MainHtml = () => [
	shopStatusHandler,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		res.render("shopMain");
	}
];

/**
 * @param {modules} modules
 */
module.exports.PartialMenuHtml = ({ i18n, logger, shopModel }) => [
	shopStatusHandler,
	authSessionHandler(logger),
	[query("active").optional().isNumeric()],
	validationHandler(logger),
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { active } = req.query;

		shopModel.categories.findAll({
			where: { active: 1 },
			include: [{
				as: "strings",
				model: shopModel.categoryStrings,
				where: { language: i18n.getLocale() },
				required: false
			}],
			order: [
				["sort", "DESC"]
			]
		}).then(categories =>
			res.render("partials/shopMenu", { categories, active })
		).catch(err => {
			logger.error(err);
			res.status(500).send();
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.PartialCatalogHtml = ({ i18n, logger, sequelize, shopModel, dataModel }) => [
	shopStatusHandler,
	authSessionHandler(logger),
	[
		body("category").optional().isNumeric(),
		body("search").optional().trim().isLength({ max: 128 })
	],
	validationHandler(logger),
	/**
	 * @type {RequestHandler}
	 */
	async (req, res) => {
		const { category, search } = req.body;

		try {
			if (search !== undefined && search.length < 3) {
				return res.render("partials/shopErrorSearch", {
					message: i18n.__("Enter a search keyword that is at least 3 letters long.")
				});
			}

			const products = new Map();

			const whereProduct = {
				active: 1,
				validAfter: { [Op.lt]: sequelize.fn("NOW") },
				validBefore: { [Op.gt]: sequelize.fn("NOW") },
				...category ? { categoryId: category } : {}
			};

			const searchParts = search ? search.replace(/[-_+:\\"\\']/g, " ").split(" ") : [];
			const whereSearch = searchParts.length !== 0 ? {
				[Op.or]: [
					{ [Op.and]: searchParts.map(s => sequelize.where(sequelize.fn("lower", sequelize.col("strings.title")), Op.like, `%${s}%`)) },
					{ id: { [Op.in]: (await shopModel.products.findAll({
						where: whereProduct,
						attributes: ["id"],
						include: [{
							as: "item",
							model: shopModel.productItems,
							attributes: [],
							include: [{
								as: "strings",
								model: dataModel.itemStrings,
								attributes: [],
								where: [
									{ [Op.and]: searchParts.map(s => sequelize.where(sequelize.fn("lower", sequelize.col("string")), Op.like, `%${s}%`)) },
									{ language: { [Op.eq]: i18n.getLocale() } }
								]
							}],
							required: true
						}]
					})).map(item => item.get("id")) } }
				]
			} : {};

			(await shopModel.products.findAll({
				where: { ...whereProduct, ...whereSearch },
				include: [
					{
						as: "strings",
						model: shopModel.productStrings,
						where: { language: i18n.getLocale() },
						required: false
					},
					{
						as: "item",
						model: shopModel.productItems,
						include: [
							{
								as: "template",
								model: dataModel.itemTemplates,
								required: true
							},
							{
								as: "strings",
								model: dataModel.itemStrings,
								where: { language: i18n.getLocale() },
								required: false
							}
						]
					}
				],
				order: [
					["sort", "DESC"],
					["id", "ASC"],
					[{ as: "item", model: shopModel.productItems }, "createdAt", "ASC"]
				]
			})).forEach(product => {
				const productInfo = {
					price: product.get("price"),
					title: product.get("strings")[0]?.get("title"),
					description: product.get("strings")[0]?.get("description"),
					icon: product.get("icon"),
					rareGrade: product.get("rareGrade"),
					itemsCount: product.get("itemsCount"),
					itemCount: product.get("item").length
				};

				product.get("item").forEach(productItem => {
					if (!productInfo.title) {
						productInfo.title = productItem.get("strings")[0]?.get("string");
					}
					if (!productInfo.description) {
						productInfo.description = productItem.get("strings")[0]?.get("toolTip");
					}
					if (!productInfo.icon) {
						productInfo.icon = productItem.get("template").get("icon");
					}
					if (productInfo.rareGrade === null) {
						productInfo.rareGrade = productItem.get("template").get("rareGrade");
					}
					if (!productInfo.itemCount) {
						productInfo.itemCount = productItem.get("boxItemCount");
					}
				});

				if (productInfo.icon && (!search || (search && productInfo.title))) {
					products.set(product.get("id"), productInfo);
				}
			});

			res.render("partials/shopCatalog", { helpers, products, search: search || "" });
		} catch (err) {
			logger.error(err);
			res.status(500).send();
		}
	}
];

/**
 * @param {modules} modules
 */
module.exports.PartialProductHtml = ({ i18n, logger, sequelize, shopModel, dataModel }) => [
	shopStatusHandler,
	authSessionHandler(logger),
	[
		body("id").isNumeric(),
		body("search").optional()
	],
	validationHandler(logger),
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { id, search, back } = req.body;

		shopModel.products.findOne({
			where: {
				id,
				active: 1,
				validAfter: { [Op.lt]: sequelize.fn("NOW") },
				validBefore: { [Op.gt]: sequelize.fn("NOW") }
			},
			include: [{
				as: "strings",
				model: shopModel.productStrings,
				where: { language: i18n.getLocale() },
				required: false
			}]
		}).then(product => {
			if (product === null) {
				return res.status(500).send();
			}

			const productObj = {
				id: product.get("id"),
				categoryId: product.get("categoryId"),
				price: product.get("price"),
				title: product.get("strings")[0]?.get("title"),
				description: product.get("strings")[0]?.get("description"),
				icon: product.get("icon"),
				rareGrade: product.get("rareGrade")
			};

			return shopModel.productItems.findAll({
				where: { productId: product.get("id") },
				include: [
					{
						as: "template",
						model: dataModel.itemTemplates
					},
					{
						as: "strings",
						model: dataModel.itemStrings,
						where: { language: i18n.getLocale() },
						required: false
					}
				],
				order: [
					["createdAt", "ASC"]
				]
			}).then(async items => {
				if (items.length === 0) {
					return res.status(500).send();
				}

				const firstItem = items[0];
				const conversions = [];
				const promises = [];

				items.forEach(item => {
					promises.push(dataModel.itemConversions.findAll({
						where: { itemTemplateId: item.get("itemTemplateId") },
						include: [
							{
								as: "template",
								model: dataModel.itemTemplates
							},
							{
								as: "strings",
								model: dataModel.itemStrings,
								where: { language: i18n.getLocale() },
								required: false
							}
						]
					}));
				});

				(await Promise.all(promises)).forEach(ItemConversion =>
					ItemConversion.forEach(conversion => conversions.push(conversion))
				);

				if (!productObj.title) {
					productObj.title = firstItem.get("strings")[0]?.get("string");
				}

				if (!productObj.description) {
					productObj.description = firstItem.get("strings")[0]?.get("toolTip");
				}

				if (!productObj.icon) {
					productObj.icon = firstItem.get("template").get("icon");
				}

				if (!productObj.rareGrade) {
					productObj.rareGrade = firstItem.get("template").get("rareGrade");
				}

				productObj.requiredLevel = firstItem.get("template").get("requiredLevel");
				productObj.requiredClass = firstItem.get("template").get("requiredClass")?.split(";") || [];
				productObj.requiredGender = firstItem.get("template").get("requiredGender");
				productObj.requiredRace = (firstItem.get("template").get("requiredRace")?.split(";") || [])
					.map(race => (race === "popori" && productObj.requiredGender === "female" ? "elin" : race));

				productObj.tradable = firstItem.get("template").get("tradable");
				productObj.warehouseStorable = firstItem.get("template").get("warehouseStorable");

				res.render("partials/shopProduct", { helpers, product: productObj, items, conversions, search, back });
			});
		}).catch(err => {
			logger.error(err);
			res.status(500).send();
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.PartialWelcomeHtml = ({ logger, accountModel, serverModel }) => [
	shopStatusHandler,
	authSessionHandler(logger),
	/**
	 * @type {RequestHandler}
	 */
	async (req, res) => {
		try {
			const server = await serverModel.info.findOne({
				where: { serverId: req.user.lastLoginServer }
			});

			const benefits = await accountModel.benefits.findAll({
				where: { accountDBID: req.user.accountDBID }
			});

			res.render("partials/shopWelcome", {
				moment,
				server,
				benefits,
				shopConfig: helpers.requireReload("../../config/shop")
			});
		} catch (err) {
			logger.error(err);
			res.status(500).send();
		}
	}
];

/**
 * @param {modules} modules
 */
module.exports.PartialPromoCodeHtml = ({ i18n, logger, shopModel }) => [
	shopStatusHandler,
	authSessionHandler(logger),
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { tzOffset } = req.query;

		return shopModel.promoCodeActivated.findAll({
			where: { accountDBID: req.user.accountDBID },
			include: [
				{
					as: "info",
					model: shopModel.promoCodes
				},
				{
					as: "strings",
					model: shopModel.promoCodeStrings,
					where: { language: i18n.getLocale() },
					required: false
				}
			],
			order: [
				["createdAt", "DESC"]
			]
		}).then(promoCodesAcrivated => {
			res.render("partials/shopPromoCode", { moment, promoCodesAcrivated, tzOffset: Number(tzOffset) });
		}).catch(err => {
			logger.error(err);
			res.status(500).send();
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.PartialErrorHtml = () => [
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		res.render("partials/shopError");
	}
];

/**
 * @param {modules} modules
 */
module.exports.GetAccountInfo = ({ logger, shopModel }) => [
	shopStatusHandler,
	authSessionHandler(logger),
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		shopModel.accounts.findOne({
			where: { accountDBID: req.user.accountDBID }
		}).then(shopAccount =>
			resultJson(res, 0, "success", {
				userNo: req.user.accountDBID,
				userName: req.user.userName,
				shopBalance: shopAccount !== null ?
					shopAccount.get("balance") : 0
			})
		).catch(err => {
			logger.error(err);
			resultJson(res, 1, "internal error");
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.PurchaseAction = modules => [
	shopStatusHandler,
	authSessionHandler(modules.logger),
	[body("productId").notEmpty().isNumeric()],
	validationHandler(modules.logger),
	/**
	 * @type {RequestHandler}
	 */
	async (req, res) => {
		const { productId } = req.body;
		const serviceItem = new ServiceItem(modules);

		try {
			/*
			const payLog = await reportModel.shopPay.findOne({ // buying rate limits
				where: {
					accountDBID: req.user.accountDBID,
					status: "completed",
					updatedAt: { [Op.gt]: sequelize.literal("NOW() - INTERVAL 5 second") }
				}
			});

			if (payLog !== null) {
				return resultJson(res, 1010, "denied");
			}
			*/

			const shopProduct = await modules.shopModel.products.findOne({
				where: {
					id: productId,
					active: 1,
					validAfter: { [Op.lt]: modules.sequelize.fn("NOW") },
					validBefore: { [Op.gt]: modules.sequelize.fn("NOW") }
				},
				include: [{
					as: "item",
					model: modules.shopModel.productItems,
					include: [{
						// all locales
						as: "strings",
						model: modules.dataModel.itemStrings,
						required: false
					}]
				}]
			});

			if (shopProduct === null) {
				return resultJson(res, 2000, "product not exists");
			}

			const shopAccount = await modules.shopModel.accounts.findOne({
				where: { accountDBID: req.user.accountDBID, active: 1 }
			});

			if (shopAccount === null || shopAccount.get("balance") < shopProduct.get("price")) {
				return resultJson(res, 1000, "low balance");
			}

			const logResult = await modules.reportModel.shopPay.create({
				accountDBID: req.user.accountDBID,
				serverId: req.user.lastLoginServer,
				ip: req.user.lastLoginIP,
				productId: shopProduct.get("id"),
				price: shopProduct.get("price"),
				status: "deposit"
			});

			if (logResult === null) {
				return resultJson(res, 1, "internal error");
			}

			const promises = [];
			const items = [];

			shopProduct.get("item").forEach(item =>
				promises.push(serviceItem.checkCreate(
					item.get("boxItemId"),
					item.get("itemTemplateId"),
					item.get("strings")[0]?.get("string"),
					helpers.formatStrsheet(item.get("strings")[0]?.get("toolTip")),
					0
				).then(boxItemId => {
					items.push({
						item_id: boxItemId,
						item_count: item.get("boxItemCount"),
						item_template_id: item.get("itemTemplateId")
					});

					if (boxItemId != item.get("boxItemId")) {
						return modules.shopModel.productItems.update({ boxItemId }, {
							where: { id: item.get("id") }
						});
					}
				}))
			);

			await Promise.all(promises);

			if (items.length === 0) {
				return resultJson(res, 3000, "items not exists");
			}

			await modules.sequelize.transaction(async () => {
				await modules.shopModel.accounts.decrement({
					balance: shopProduct.get("price")
				}, {
					where: { accountDBID: shopAccount.get("accountDBID") }
				});

				const boxId = await (new ItemClaim(
					modules,
					req.user.accountDBID,
					req.user.lastLoginServer,
					{
						logType: 3,
						logId: logResult.get("id")
					}
				)).makeBox({
					title: modules.i18n.__("_box_title_"),
					content: modules.i18n.__("_box_content_"),
					icon: "GiftBox02.bmp",
					days: 3650,
					items
				});

				return await modules.reportModel.shopPay.update({
					boxId,
					status: "completed"
				}, {
					where: { id: logResult.get("id") }
				});
			});

			resultJson(res, 0);
		} catch (err) {
			modules.logger.error(err);
			resultJson(res, 1, "internal error");
		}
	}
];

/**
 * @param {modules} modules
 */
module.exports.PromoCodeAction = modules => [
	shopStatusHandler,
	authSessionHandler(modules.logger, modules.accountModel),
	[body("promoCode").trim().notEmpty()],
	validationHandler(modules.logger),
	/**
	 * @type {RequestHandler}
	 */
	async (req, res) => {
		const { promoCode } = req.body;

		try {
			const promocode = await modules.shopModel.promoCodes.findOne({
				where: {
					promoCode: promoCode,
					active: 1,
					validAfter: { [Op.lt]: modules.sequelize.fn("NOW") },
					validBefore: { [Op.gt]: modules.sequelize.fn("NOW") }
				}
			});

			if (promocode === null) {
				return resultJson(res, 1000, { msg: "invalid promocode" });
			}

			const promocodeActivated = await modules.shopModel.promoCodeActivated.findOne({
				where: {
					accountDBID: req.user.accountDBID,
					promoCodeId: promocode.get("promoCodeId")
				}
			});

			if (promocodeActivated !== null) {
				return resultJson(res, 1010, { msg: "invalid promocode" });
			}

			await modules.sequelize.transaction(async () => {
				const actions = new PromoCodeActions(
					modules,
					req.user.lastLoginServer,
					req.user.accountDBID
				);

				await modules.shopModel.promoCodeActivated.create({
					promoCodeId: promocode.get("promoCodeId"),
					accountDBID: req.user.accountDBID
				});

				return actions.execute(promocode.get("function"), promocode.get("promoCodeId"));
			});

			resultJson(res, 0, "success");
		} catch (err) {
			modules.logger.error(err);
			resultJson(res, 1, "internal error");
		}
	}
];