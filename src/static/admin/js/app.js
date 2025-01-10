/* eslint-disable no-param-reassign,no-undef */
var config = window.config = {};

// Config reference element
var $ref = $("#ref");

// Configure responsive bootstrap toolkit
config.ResponsiveBootstrapToolkitVisibilityDivs = {
	xs: $("<div class=\"device-xs 				  hidden-sm-up\"></div>"),
	sm: $("<div class=\"device-sm hidden-xs-down hidden-md-up\"></div>"),
	md: $("<div class=\"device-md hidden-sm-down hidden-lg-up\"></div>"),
	lg: $("<div class=\"device-lg hidden-md-down hidden-xl-up\"></div>"),
	xl: $("<div class=\"device-xl hidden-lg-down			  \"></div>")
};

ResponsiveBootstrapToolkit.use("Custom", config.ResponsiveBootstrapToolkitVisibilityDivs);

// validation configuration
config.validations = {
	errorClass: "has-error",
	validClass: "success",
	errorElement: "span",

	// add error class
	highlight: function(element, errorClass, validClass) {
		$("#error-message").hide();
		$(element).parents("div.form-group")
			.addClass(errorClass)
			.removeClass(validClass);
	},

	// add error class
	unhighlight: function(element, errorClass, validClass) {
		$("#error-message").hide();
		$(element).parents(".has-error")
			.removeClass(errorClass)
			.addClass(validClass);
	},

	// submit handler
	submitHandler: function(form) {
		form.submit();
	}
};

// delay time configuration
config.delayTime = 50;

// chart configurations
config.chart = {};
config.chart.colorPrimary = tinycolor($ref.find(".chart .color-primary").css("color"));
config.chart.colorSecondary = tinycolor($ref.find(".chart .color-secondary").css("color"));

$(function() {
	animate({
		name: "flipInY",
		selector: ".error-card > .error-title-block"
	});

	setTimeout(function() {
		var $el = $(".error-card > .error-container");

		animate({
			name: "fadeInUp",
			selector: $el
		});

		$el.addClass("visible");
	}, 1000);
});

function animate(options) {
	var animationName = "animated " + options.name;
	var animationEnd = "webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend";
	$(options.selector)
		.addClass(animationName)
		.one(animationEnd,
			function() {
				$(this).removeClass(animationName);
			}
		);
}

// Item Actions
$(function() {
	var $itemActions = $(".item-actions-dropdown");

	$(document).on("click", function(e) {
		if (!$(e.target).closest(".item-actions-dropdown").length) {
			$itemActions.removeClass("active");
		}
	});

	$(".item-actions-toggle-btn").on("click", function(e) {
		e.preventDefault();

		var $thisActionList = $(this).closest(".item-actions-dropdown");
		$itemActions.not($thisActionList).removeClass("active");
		$thisActionList.toggleClass("active");
	});
});

// NProgress Settings
var npSettings = {
	easing: "ease",
	speed: 500
};

NProgress.configure(npSettings);

$(function() {
	setSameHeights();

	var resizeTimer = null;

	$(window).resize(function() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(setSameHeights, 150);
	});
});

function setSameHeights($container) {
	$container = $container || $(".sameheight-container");
	var viewport = ResponsiveBootstrapToolkit.current();

	$container.each(function() {
		var $items = $(this).find(".sameheight-item");

		// Get max height of items in container
		var maxHeight = 0;

		$items.each(function() {
			$(this).css({ height: "auto" });
			maxHeight = Math.max(maxHeight, $(this).innerHeight());
		});

		// Set heights of items
		$items.each(function() {
			// Ignored viewports for item
			var excludedStr = $(this).data("exclude") || "";
			var excluded = excludedStr.split(",");

			// Set height of element if it's not excluded on
			if (excluded.indexOf(viewport) === -1) {
				$(this).innerHeight(maxHeight);
			}
		});
	});
}

// LoginForm validation
$(function() {
	if (!$(".form-control").length) {
		return false;
	}

	$(".form-control").focus(function() {
		$(this).siblings(".input-group-addon").addClass("focus");
	});

	$(".form-control").blur(function() {
		$(this).siblings(".input-group-addon").removeClass("focus");
	});
});

$(function() {
	// set sortable options
	var sortable = new Sortable($(".images-container").get(0), {
		animation: 150,
		handle: ".control-btn.move",
		draggable: ".image-container",
		onMove: function(evt) {
			var $relatedElem = $(evt.related);

			if ($relatedElem.hasClass("add-image")) {
				return false;
			}
		}
	});

	$controlsButtons = $(".controls");
	$controlsButtonsStar = $controlsButtons.find(".star");
	$controlsButtonsRemove = $controlsButtons.find(".remove");
	$controlsButtonsStar.on("click", function(e) {
		e.preventDefault();
		$controlsButtonsStar.removeClass("active");
		$controlsButtonsStar.parents(".image-container").removeClass("main");

		$(this).addClass("active");
		$(this).parents(".image-container").addClass("main");
	});
});

// Sidebar menu
$(function() {
	$("#sidebar-menu, #customize-menu").metisMenu({
		activeClass: "open"
	});

	$("#sidebar-collapse-btn").on("click", function(event) {
		event.preventDefault();
		$("#app").toggleClass("sidebar-open");
	});

	$("#sidebar-overlay").on("click", function() {
		$("#app").removeClass("sidebar-open");
	});

	if ($.browser.mobile) {
		var $appContainer = $("#app ");
		var $mobileHandle = $("#sidebar-mobile-menu-handle ");

		$mobileHandle.swipe({
			swipeLeft: function() {
				if ($appContainer.hasClass("sidebar-open")) {
					$appContainer.removeClass("sidebar-open");
				}
			},
			swipeRight: function() {
				if (!$appContainer.hasClass("sidebar-open")) {
					$appContainer.addClass("sidebar-open");
				}
			},
			// excludedElements: "button, input, select, textarea, .noSwipe, table",
			triggerOnTouchEnd: false
		});
	}
});

/*
var modalMedia = {
	$el: $("#modal-media"),
	result: {},
	options: {},
	open: function(options) {
		options = options || {};
		this.options = options;

		this.$el.modal("show");
	},
	close: function() {
		if ($.isFunction(this.options.beforeClose)) {
			this.options.beforeClose(this.result);
		}

		this.$el.modal("hide");

		if ($.isFunction(this.options.afterClose)) {
			this.options.beforeClose(this.result);
		}
	}
};
*/

$.fn.loadInputData = function(endpoint, fnResultFormat) {
	this.each(function() {
		var input = $(this);

		if (!input.val() || input.closest("form").hasClass("form-inline")) {
			return;
		}

		$.ajax({
			url: endpoint + "?value=" + input.val(),
			method: "get",
			async: false,
			success: function(data) {
				if (data.result_code !== 0 || data.suggestions.length === 0) {
					return;
				}

				var suggestion = data.suggestions[0];
				var result = fnResultFormat(suggestion);

				input.after(result);

				if (input.attr("disabled")) {
					return input.next().addClass("autocomplete-disabled");
				}
				input.next().click(function() {
					$(this).prev().focus();
					$(this).hide();
				});
				input.change(function() {
					$(this).next().remove();
				});
				input.focusout(function() {
					$(this).next().show();
				});
			}
		});
	});
};

$.fn.addAutocomplete = function(endpoint, fnFormatResult, fnFormatOnSelect) {
	this.autocomplete({
		serviceUrl: endpoint,
		width: 400,
		forceFixPosition: true,
		preventBadQueries: false,
		triggerSelectOnValidInput: false,
		appendTo: ".content",
		formatResult: function(suggestion, currentValue) {
			return fnFormatResult(suggestion, currentValue);
		},
		onSelect: function(suggestion) {
			if ($(this).closest("form").hasClass("form-inline")) {
				return;
			}
			var input = $(this);
			var result = fnFormatOnSelect(suggestion);

			input.change();
			input.after(result);

			result.click(function() {
				$(this).prev().focus();
				$(this).hide();
			});
			input.change(function() {
				$(this).next().remove();
			});
			input.focusout(function() {
				$(this).next().show();
			});
		}
	});
};

$(function() {
	/*
	$(".data-table").DataTable(dataTablesSettings);

	$(".data-table-desc").DataTable($.extend({}, dataTablesSettings, {
		order: [[0, "desc"]]
	}));

	$(".data-table-nosort").DataTable($.extend({}, dataTablesSettings, {
		columnDefs: [
			{ orderable: false, targets: -1 }
		]
	}));

	$(".data-table-desc-nosort").DataTable($.extend({}, dataTablesSettings, {
		order: [[0, "desc"]],
		columnDefs: [
			{ orderable: false, targets: -1 }
		]
	}));
	*/

	$("#sidebar-menu a").on("click", function() {
		$(".data-table, .data-table-desc, .data-table-desc-nosort, .data-table-nosort, .data-table-json").DataTable().state.clear();
	});

	$("form").on("submit", function() {
		$(".data-table, .data-table-desc, .data-table-desc-nosort, .data-table-nosort, .data-table-json").DataTable().state.clear();
	});

	$(".change-submit").change(function() {
		$(".data-table, .data-table-desc, .data-table-desc-nosort, .data-table-nosort, .data-table-json").DataTable().state.clear();
		$(this).closest("form").submit();
	});
});

$(function() {
	loadNotifications();
	setInterval(loadNotifications, 60000);

	$("#notifications-dropdown").click(function() {
		loadNotifications();
	});
});

function loadNotifications() {
	$.ajax({
		url: "/api/notifications",
		method: "get",
		async: false,
		success: function(data) {
			if (data.result_code === 0) {
				$("#counter").html(data.count);
				$("#counter").removeClass("text-danger");
				$("#notifications-container").empty().hide();

				if (data.count > 0) {
					$("#counter").addClass("text-danger");

					data.items.forEach(function(item) {
						$("#notifications-container").append(
							"<li><a href=\"/tasks\" class=\"notification-item\">" +
							"<div class=\"body-col\"><span class=\"" + item.class + "\"><i class=\"fa " + item.icon + "\"></i> " + item.message + "</span></div>" +
							"</a></li>"
						);
					});

					$("#notifications-container").show();
				}
			}
		}
	});
}

$(function() {
	$("input[name='accountDBID'][type='text']").loadInputData("/api/getAccounts",
		function(suggestion) {
			var value = suggestion.value + " - " + suggestion.data.userName;

			if (suggestion.data.email != "") {
				value += " (" + suggestion.data.email + ")";
			}

			return $("<div class='autocomplete-result'><span>" + value + "</span></div>");
		}
	);

	$("input[name='characterId'][type='text']").loadInputData("/api/getCharacters",
		function(suggestion) {
			return $("<div class='autocomplete-result'><span>" + suggestion.value + " - " + suggestion.data.name +
				" (" + suggestion.data.accountDBID + ", " + suggestion.data.serverId + ")" + "</span></div>");
		}
	);

	$("input[name='itemTemplateIds\\[\\]'][type='text']").loadInputData("/api/getItems",
		function(suggestion) {
			// icon for additional info in shop ptoduct
			var icons = $("#itemIcons");
			for (var icon of suggestion.data.icons) {
				if (icons.find("img[data-value='" + icon + "']").length === 0) {
					icons.append("<label data-id='" + suggestion.value + "'><span><img src='/static/images/tera-icons/" + icon + ".png' class='item-icon-form item-icon-grade-0 itemIcon' data-value='" + icon + "'></span></label>");
				}
			}
			function selectIcon() {
				$(".itemIcon").each(function() {
					if ($(this).css("border", "0").data("value") == $("input[name='icon']").val()) {
						$(this).css("border", "2px solid #0075FF");
					}
				});
			}
			selectIcon();
			$(".itemIcon").click(function() {
				$("input[name='icon']").val($(this).data("value"));
				selectIcon();
			});
			return $("<div class='autocomplete-result'>" +
				"<div class='item-icon-input'>" +
					"<img src='/static/images/tera-icons/" + suggestion.data.icon + ".png' class='item-icon-grade-" + suggestion.data.rareGrade + " item-icon'>" +
					"<img src='/static/images/icons/icon_grade_" + suggestion.data.rareGrade + ".png' class='item-icon-grade'>" +
				"</div>" +
				"<small class='item-grade-" + suggestion.data.rareGrade + "'>(" + suggestion.value + ") " + suggestion.data.title + "</small></div>");
		}
	);

	// bind autocomplete hooks
	addAutocomplete();
});

function addAutocomplete() {
	$("input[name='accountDBID'][type='text']").addAutocomplete("/api/getAccounts",
		function(suggestion, currentValue) {
			var value = suggestion.value + " - " + suggestion.data.userName;

			if (suggestion.data.email != "") {
				value += " (" + suggestion.data.email + ")";
			}
			if (suggestion.data.character != "") {
				value += " [" + suggestion.data.character + "]";
			}

			return $.Autocomplete.defaults.formatResult({ value: value }, currentValue);
		},
		function(suggestion) {
			var value = suggestion.value + " - " + suggestion.data.userName;

			if (suggestion.data.email != "") {
				value += " (" + suggestion.data.email + ")";
			}

			return $("<div class='autocomplete-result'><span>" + value + "</span></div>");
		}
	);

	$("input[name='characterId'][type='text']").addAutocomplete("/api/getCharacters",
		function(suggestion, currentValue) {
			var value = suggestion.value + " - " + suggestion.data.name + " (" + suggestion.data.accountDBID + ", " + suggestion.data.serverId + ")";

			return $.Autocomplete.defaults.formatResult({ value: value }, currentValue);
		},
		function(suggestion) {
			return $("<div class='autocomplete-result'><span>" + suggestion.value + " - " + suggestion.data.name +
				" (" + suggestion.data.accountDBID + ", " + suggestion.data.serverId + ")" + "</span></div>");
		}
	);

	$("input[name='itemTemplateIds\\[\\]'][type='text']").addAutocomplete("/api/getItems",
		function(suggestion, currentValue) {
			var value = suggestion.data.title + " (" + suggestion.value + ")";

			return "<div class='item-icon-input'>" +
				"<img src='/static/images/tera-icons/" + suggestion.data.icon + ".png' class='item-icon-grade-" + suggestion.data.rareGrade + " item-icon'>" +
				"<img src='/static/images/icons/icon_grade_" + suggestion.data.rareGrade + ".png' class='item-icon-grade'>" +
			"</div>" +
			"<small class='item-grade-" + suggestion.data.rareGrade + "'>" + $.Autocomplete.defaults.formatResult({ value: value }, currentValue) + "</small>";
		},
		function(suggestion) {
			// icon for additional info in shop ptoduct
			var icons = $("#itemIcons");
			for (var icon of suggestion.data.icons) {
				if (icons.find("img[data-value='" + icon + "']").length === 0) {
					icons.append("<label data-id='" + suggestion.value + "'><span><img src='/static/images/tera-icons/" + icon + ".png' class='item-icon-form item-icon-grade-0 itemIcon' data-value='" + icon + "'></span></label>");
				}
			}
			function selectIcon() {
				$(".itemIcon").each(function() {
					if ($(this).css("border", "0").data("value") == $("input[name='icon']").val()) {
						$(this).css("border", "2px solid #0075FF");
					}
				});
			}
			selectIcon();
			$(".itemIcon").click(function() {
				$("input[name='icon']").val($(this).data("value"));
				selectIcon();
			});
			$("input[name='icon']").change(selectIcon);
			return $("<div class='autocomplete-result'>" +
				"<div class='item-icon-input'>" +
					"<img src='/static/images/tera-icons/" + suggestion.data.icon + ".png' class='item-icon-grade-" + suggestion.data.rareGrade + " item-icon'>" +
					"<img src='/static/images/icons/icon_grade_" + suggestion.data.rareGrade + ".png' class='item-icon-grade'>" +
				"</div>" +
				"<small class='item-grade-" + suggestion.data.rareGrade + "'>(" + suggestion.value + ") " + suggestion.data.title + "</small></div>");
		}
	);
}

function showFormErrors(errors) {
	var errorsContainer = $("#errors");
	errorsContainer.empty();

	if (Array.isArray(errors)) {
		var errorList = $("<ul class='mb-0'></ul>");
		for (var error of errors) {
			var listItem = $("<li></li>").text(error.msg);
			errorList.append(listItem);
		}

		errorsContainer.append(errorList);
	} else {
		errorsContainer.append("<i class='fa fa-warning'></i> " + errors);
	}

	errorsContainer.show();
	$(".main-wrapper").animate({ scrollTop: 0 }, "fast");
}

function onFormSubmit(postUrl) {
	$.ajax({
		type: "POST",
		url: postUrl,
		data: $("#form").serialize(),
		success: function(reply) {
			if (reply.result_code === 0) {
				location.replace(reply.success_url || location);
			} else if (reply.errors && reply.errors.length !== 0) {
				showFormErrors(reply.errors);
			} else {
				showFormErrors(reply.msg);
			}
		},
		fail: function(err) {
			showFormErrors(err);
		}
	});
}

$(function() {
	$(".form-panel-collapse").on("show.bs.collapse", function() {
		$(this).siblings(".form-panel-heading").addClass("active");
	});

	$(".form-panel-collapse").on("hide.bs.collapse", function() {
		$(this).siblings(".form-panel-heading").removeClass("active");
	});

	if (sessionStorage.getItem("changeScroll")) {
		if ($(".history-back").length == 0) {
			$(".main-wrapper").animate({ scrollTop: sessionStorage.getItem("scrollTop") }, 10);
			sessionStorage.removeItem("changeScroll");
		}
	}

	$("#confirm-modal, #confirm-del-modal").on("show.bs.modal", function(event) {
		$(this).find(".modal-yes").click(function() {
			sessionStorage.setItem("changeScroll", true);
			if ($(event.relatedTarget).attr("href")) {
				window.location.href = $(event.relatedTarget).attr("href");
			} else if ($(event.relatedTarget).is("form")) {
				$(event.relatedTarget).submit();
			}
		});
		$(this).find(".modal-no").click(function() {
			if ($(event.relatedTarget).is("form")) {
				$(event.relatedTarget).trigger("reset");
			}
		});
	});

	if ($(".history-back").length == 0) {
		sessionStorage.setItem("locationHref", location.href);
		sessionStorage.setItem("scrollTop", $(this).scrollTop());

		$(".main-wrapper").scroll(function() {
			sessionStorage.setItem("scrollTop", $(this).scrollTop());
		});
	} else {
		$(".history-back").click(function(e) {
			e.preventDefault();

			if (location.href != sessionStorage.getItem("locationHref")) {
				sessionStorage.setItem("changeScroll", true);
				location.href = sessionStorage.getItem("locationHref");
			}
		});

		$("form").submit(function() {
			sessionStorage.setItem("changeScroll", true);
		});
	}

	$("#quick-action").change(function() {
		if ($(this).val()) {
			location.href = $(this).val();
		}
	});

	$("span.datetime-local-reset i").click(function() {
		$(this).closest("span").prev().val("");
	});
});

$(function() {
	$("body").addClass("loaded");
});

// NProgress Settings

// start load bar
NProgress.start();

// end loading bar
NProgress.done();