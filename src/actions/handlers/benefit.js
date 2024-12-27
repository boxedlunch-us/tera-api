"use strict";

/**
 * @typedef {import("../../app").modules} modules
 */

const moment = require("moment-timezone");

class Benefit {
	/**
	 * @param {modules} modules
	 */
	constructor(modules, userId, serverId = null, params = {}) {
		this.modules = modules;
		this.userId = userId;
		this.serverId = serverId;
		this.params = params;
	}

	addBenefit(benefitId, days) {
		return this.modules.accountModel.benefits.findOne({
			attributes: ["availableUntil", [this.modules.sequelize.fn("NOW"), "dateNow"]],
			where: { accountDBID: this.userId, benefitId }
		}).then(benefit => {
			let promise = null;

			if (benefit === null) {
				promise = this.modules.accountModel.benefits.create({
					accountDBID: this.userId,
					benefitId,
					availableUntil: this.modules.sequelize.fn("ADDDATE",
						this.modules.sequelize.fn("NOW"), days)
				});
			} else {
				const currentDate = moment(benefit.get("dateNow")).isAfter(benefit.get("availableUntil")) ?
					this.modules.sequelize.fn("NOW") :
					this.modules.sequelize.col("availableUntil");

				promise = this.modules.accountModel.benefits.update({
					availableUntil: this.modules.sequelize.fn("ADDDATE", currentDate, days)
				}, {
					where: { accountDBID: this.userId, benefitId }
				});
			}

			return promise.then(() => {
				let totalDays = days;

				if (benefit !== null) {
					totalDays += Math.round(
						moment.duration(moment(benefit.get("availableUntil"))
							.diff(moment(benefit.get("dateNow"))))
							.asDays()
					);
				}

				if (this.serverId !== null) {
					this.modules.hub.addBenefit(this.serverId, this.userId, benefitId, totalDays * 86400).catch(err =>
						this.modules.logger.warn(err.toString())
					);
				}

				return Promise.resolve();
			});
		});
	}
}

module.exports = Benefit;