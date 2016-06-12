var Winston = require("winston");
var path = require("path");
var Config = require("../config/config.json");
var logFile = Config.logFile;
var loggerLvl = Config.loggerLvl;
var chatLogFile = Config.chatLogFile;

exports.Logger = new Winston.Logger({
	colors: {
		error: "red",
		warn: "yellow",
		info: "green",
		verbose: "cyan",
		debug: "blue"
	},
	transports: [
		new Winston.transports.Console({
			handleExceptions: true,
			humanReadableUnhandledException: true,
			level: loggerLvl,
			colorize: true,
			json: false
		}),
		new Winston.transports.File({
			filename: __dirname + "/../" + logFile,
			handleExceptions: true,
			humanReadableUnhandledException: true,
			level: "debug",
			colorize: true,
			json: false
		})
	]
});

exports.ChatLog = new Winston.Logger({
	transports: [
		new Winston.transports.File({
			handleExceptions: false,
			filename: __dirname + "/../" + chatLogFile,
			formatter: function(args) { return args.message; },
			level: "info",
			json: false
		})
	]
});
