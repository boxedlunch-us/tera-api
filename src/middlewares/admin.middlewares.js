"use strict";

/**
 * @typedef {import("express").RequestHandler} RequestHandler
 * @typedef {import("../models/report.model").reportModel} reportModel
 */

const helpers = require("../utils/helpers");
const databaseLogger = require("../utils/logger").createLogger("Database");

/**
 * @param {Response} res
 */
const resultJson = (res, code, params = {}) => res.json({
	result_code: code, ...params
});

module.exports.validationHandler = logger =>
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		if (!helpers.validationResultLog(req, logger).isEmpty()) {
			return resultJson(res, 2, { msg: "invalid parameter" });
		}

		next();
	}
;

/**
 * @type {RequestHandler}
 */
module.exports.apiAccessHandler = (req, res, next) => {
	if (req.isAuthenticated()) {
		res.locals.user = req.user;

		next();
	} else {
		resultJson(res, 3, { msg: "access denied" });
	}
};

/**
 * @type {RequestHandler}
 */
module.exports.accessFunctionHandler = (req, res, next) => {
	if (req.isAuthenticated()) {
		res.locals.user = req.user;

		let path = req.path.split("/");

		if (path.length > 3) {
			path = path.slice(0, 3);
		}

		if (req.user.type === "steer" &&
			!Object.values(req.user.functions).includes(path.join("/"))
		) {
			const msg = `${encodeURI(res.locals.__("Function access denied"))}: ${req.path}`;
			return res.redirect(`/logout?msg=${msg}`);
		}

		next();
	} else {
		res.redirect(`/login?msg=${encodeURI(res.locals.__("The session has expired."))}&url=${req.url}`);
	}
};

/**
 * @param {reportModel} reportModel
 */
module.exports.writeOperationReport = (reportModel, params = {}) =>
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		reportModel.adminOp.create({
			userSn: req?.user?.userSn,
			userId: req?.user?.login,
			userType: req?.user?.type,
			userTz: req?.user?.tz,
			ip: req.ip,
			function: req.path,
			payload: JSON.stringify([req.query, req.body]),
			reportType: params.reportType || 1
		}).catch(err => {
			databaseLogger.error(err);
		});

		next();
	}
;

module.exports.resultJson = resultJson;