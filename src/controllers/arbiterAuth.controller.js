"use strict";

/**
 * @typedef {import("../app").modules} modules
 * @typedef {import("express").RequestHandler} RequestHandler
 */

const body = require("express-validator").body;
const Op = require("sequelize").Op;

const { validationHandler, resultJson } = require("../middlewares/arbiterAuth.middlewares");

const ipFromLauncher = /^true$/i.test(process.env.API_ARBITER_USE_IP_FROM_LAUNCHER);

/**
 * endpoint: /systemApi/RequestAPIServerStatusAvailable
 * @param {modules} modules
 */
module.exports.RequestAPIServerStatusAvailable = ({ logger, serverModel }) => [
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		serverModel.info.update({ isAvailable: 0, usersOnline: 0 }, {
			where: { isEnabled: 1 }
		}).then(() =>
			res.json({ Return: true })
		).catch(err => {
			logger.error(err);
			res.json({ Return: false });
		});
	}
];

/**
 * endpoint: /authApi/RequestAuthkey
 * @param {modules} modules
 */
module.exports.RequestAuthkey = ({ logger, accountModel }) => [
	[body("clientIP").notEmpty(), body("userNo").isNumeric()],
	validationHandler(logger),
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { clientIP, userNo } = req.body;

		accountModel.info.findOne({ where: { accountDBID: userNo } }).then(account => {
			if (account === null) {
				return resultJson(res, 50000, "account not exist");
			}

			resultJson(res, 0, "success", {
				Tokken: account.get("authKey")
			});
		}).catch(err => {
			logger.error(err);
			resultJson(res, 1, "internal error");
		});
	}
];

/**
 * endpoint: /authApi/GameAuthenticationLogin
 * @param {modules} modules
 */
module.exports.GameAuthenticationLogin = ({ logger, sequelize, accountModel }) => [
	[body("authKey").notEmpty(), body("userNo").isNumeric()],
	validationHandler(logger),
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { authKey, clientIP, userNo } = req.body;

		accountModel.info.findOne({
			where: { accountDBID: userNo },
			include: [{
				as: "banned",
				model: accountModel.bans,
				where: {
					active: 1,
					startTime: { [Op.lt]: sequelize.fn("NOW") },
					endTime: { [Op.gt]: sequelize.fn("NOW") }
				},
				required: false
			}]
		}).then(account => {
			if (account === null) {
				return resultJson(res, 50000, "account not exist");
			}

			if (account.get("authKey") !== authKey) {
				return resultJson(res, 50011, "authkey mismatch");
			}

			const ip = ipFromLauncher ? account.get("lastLoginIP") : clientIP;

			return accountModel.bans.findOne({
				where: {
					active: 1,
					ip: { [Op.like]: `%"${ip}"%` },
					startTime: { [Op.lt]: sequelize.fn("NOW") },
					endTime: { [Op.gt]: sequelize.fn("NOW") }
				}
			}).then(bannedByIp => {
				if (account.get("banned") !== null || bannedByIp !== null) {
					return resultJson(res, 50012, "account banned");
				}

				resultJson(res, 0, "success");
			});
		}).catch(err => {
			logger.error(err);
			resultJson(res, 1, "internal error");
		});
	}
];