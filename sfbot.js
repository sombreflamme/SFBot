process.title = "SFBot";
var version = require("./package.json").version;

// Chargement de la configuration
var Config = require("./config/config.json");
var cmdPrefix = Config.cmdPrefix;
var adminIDs = Config.adminID;
var opIDs = Config.opIDs;
var sfbotMsg = require("./config/msg.json");

var Auth = require("./config/auth.json"); // Token d'identification

// Chargement des plugins
var Discord = require("discord.js");
var Mysql = require("node-mysql");

// Chargement des loggers
var Logger = require("./plugins/logger.js").Logger;
var ChatLog = require("./plugins/logger.js").ChatLog;

Logger.info(sfbotMsg.bootConfigMsg);

var maintenance = false;

/********************************
          Commandes
********************************/
var commands = {
	"kill": {
		name: "kill",
		description: sfbotMsg.killDesc,
		extendHelp: sfbotMsg.killExtHelp,
		adminOnly: true,
		process: function(sfbot, msg) {
			var killMsg = sfbotMsg.killMsg;
			var killBy = sfbotMsg.killBy;
			sfbot.sendMessage(msg.channel, killMsg, function() {
				Logger.warn(killBy + msg.author.username + "(" + msg.author + ") :'(");
				sfbot.logout();
				process.exit(0);
			});
		}
	},
	"maintenance": {
		name: "maintenance",
		description: sfbotMsg.maintenanceDesc,
		extendHelp: sfbotMsg.maintenanceExtHelp,
		usage: "<on|off>",
		opOnly: true,
		process: function(sfbot, msg, suffix) {
			if (suffix && suffix === "on") {
				if (!maintenance) {
					sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceMsgOn);
					maintenance = true;
					Logger.info(msg.author.username + sfbotMsg.maintenanceLogOn);
				}
				else {
					sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceMsgOnErr);
				}
			}
			else if (suffix && suffix === "off") {
				if (maintenance) {
					Logger.info(msg.author.username + sfbotMsg.maintenanceLogOff);
                                        sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceMsgOff);
                                        maintenance = false;
				}
				else {
					sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceMsgOffErr);
				}
			}
			else {
				sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceErr);
			}
		}
	},
	"ping": {
		name: "ping",
		description: sfbotMsg.pingDesc,
		extendHelp: sfbotMsg.pingExtHelp,
		process: function(sfbot, msg) {
			sfbot.sendMessage(msg.channel, msg.author + ", Pong !");
		}
	},
	"dice": {
		name: "dice",
		description: sfbotMsg.diceDesc,
		extendHelp: sfbotMsg.diceExtHelp,
		usage: "<faces>",
		process: function(sfbot, msg, suffix) {
			var diceMsg = sfbotMsg.diceMsg;
			var dice;
			if (suffix && (parseFloat(suffix) == parseInt(suffix) && !isNaN(suffix))) dice = suffix;
			else dice = 100;
			var roll = Math.floor((Math.random() * dice) + 0);
			sfbot.sendMessage(msg.channel, msg.author + diceMsg.substring(0, 20) + dice + diceMsg.substring(19, 36) + roll + diceMsg.substring(36, 40));
		}
	}
};

/********************************
	Fin des commandes
********************************/
Logger.info(sfbotMsg.bootCmdMsg);

var sfbot = new Discord.Client();

sfbot.on("ready", function() {
	var servers = (sfbot.servers.length > 1) ? sfbot.servers.length + " serveurs" : sfbot.servers.length + " serveur";
	Logger.info(sfbotMsg.readyMsg1);
	Logger.info(sfbotMsg.readyMsg2.substring(0, 12) + servers + sfbotMsg.readyMsg2.substring(11, 20) + sfbot.channels.length + sfbotMsg.readyMsg2.substring(19, 26));
        Logger.info(sfbotMsg.readyMsg3);
});

sfbot.on("disconnect", function() {
	Logger.error(sfbotMsg.disconnectedMsg);
	process.exit(0);
});

/********************************
	Interpréteur de
	   commandes
********************************/

sfbot.on("message", function(msg) {
	// ChatLogger le message
	if (Config.chatLog === true && msg.channel.server) {
		var d = new Date();
		var date = d.toUTCString();
		ChatLog.info(date + " - " + msg.channel.server.name + ", " + msg.channel.name + "> " + msg.author.username + ": " + msg.content);
	}

	// Si le bot est l'auteur du message, on ne fait rien d'autre
	if (msg.author.equals(sfbot.user)) {
		return;
	}
	// Vérification si c'est une commande
	if (msg.author.id != sfbot.user.id && (msg.content[0] === cmdPrefix)) {
		// Logger la commande et le lanceur
		Logger.info(msg.author.username + sfbotMsg.cmdExecBy + "<" + msg.content + ">");

		var cmdTxt = msg.content.split(" ")[0].substring(1).toLowerCase();
		var suffix = msg.content.substring(cmdTxt.length + 2);

		// Si en mode maintenance
		if (maintenance && cmdTxt != "maintenance") {
			sfbot.sendMessage(msg.channel, sfbotMsg.maintenanceMsg);
			return;
		}

		// Si la commande est help
		if (cmdTxt === "help") {
			var msgArray = [];
			if (!suffix) {
				var commandsNames = [];
				for (index in commands) {
					commandsNames.push("`" + commands[index].name + "`");
				}
				msgArray.push(sfbotMsg.helpMsg1.substring(0, 71) + cmdPrefix + sfbotMsg.helpMsg1.substring(71, 140));
				msgArray.push("");
				msgArray.push(commandsNames.join(", "));
				msgArray.push("");
				msgArray.push(sfbotMsg.helpMsg2.substring(0, 119) + adminIDs[0] + sfbotMsg.helpMsg2.substring(119, 120));
				Logger.info(msg.author.username + sfbotMsg.helpLog);
				sfbot.sendMessage(msg.author, msgArray);
			}
			else {
				var command = commands[suffix];
				if (command) {
					msgArray.push("**Nom** : " + command.name);
					if (command.hasOwnProperty("usage")) {
						msgArray.push("**Utilisation** : `" + cmdPrefix + command.name + " " +command.usage + "`");
					}
					msgArray.push("**Description** : " + command.description);
					msgArray.push(command.extendHelp);
					if (command.hasOwnProperty("adminOnly")) {
						msgArray.push("**Restriction** : Seul mon administrateur peut exécuter cette commande.");
					}
					if (command.hasOwnProperty("opOnly")) {
						msgArray.push("**Restriction** : Seuls les officiers peuvent exécuter cette commande.");
					}
					sfbot.sendMessage(msg.author, msgArray);
				}
				else {
					sfbot.sendMessage(msg.channel, sfbotMsg.helpCmdErr);
				}
			}
		}

		var command = commands[cmdTxt];
		if (command) {
			var cmdCheckSpec = canProcessCmd(command, cmdTxt, msg.author.id, msg);
			if (cmdCheckSpec.isAllow) {
				command.process(sfbot, msg, suffix);
			}
		}
	}
});

/********************************
	   Fonctions
********************************/

// Vérification si l'ID en paramètre est Admin
function isAdmin(id) {
	return (adminIDs.indexOf(id) > -1);
}

// Vérification si l'ID en paramètre est Opérateur
function isOp(id) {
	return (opIDs.indexOf(id) > -1);
}

// Vérification si la commande peut être lancée
// La fonction vérifie le droit de l'utilisateur qui a lancé la commande
function canProcessCmd(command, cmdTxt, userID, msg) {
	var isAllowResult = true;
	var errorMessage = "";
	if (command.hasOwnProperty("opOnly") && command.opOnly && !isOp(userID)) {
		isAllowResult = false;
		sfbot.sendMessage(msg.channel, sfbotMsg.cmdNotAllowed.substring(0, 4) + msg.author + sfbotMsg.cmdNotAllowed.substring(4));
	}
	if (command.hasOwnProperty("adminOnly") && command.adminOnly && !isAdmin(userID)) {
		isAllowResult = false;
		sfbot.sendMessage(msg.channel, sfbotMsg.cmdNotAllowed.substring(0, 4) + msg.author + sfbotMsg.cmdNotAllowed.substring(4));
	}
	
	if (isAllowResult) Logger.info(sfbotMsg.cmdExecResult1.substring(0, 9) + "<" + msg.content + ">" + sfbotMsg.cmdExecResult1.substring(8, 22) + msg.author.username + sfbotMsg.cmdExecResult2.substring(0, 10));
	else Logger.info(sfbotMsg.cmdExecResult1.substring(0, 9) + "<" + msg.content + ">" + sfbotMsg.cmdExecResult1.substring(8, 22) + msg.author.username + sfbotMsg.cmdExecResult2.substring(10, 19));

	return {
		isAllow: isAllowResult,
		errMsg: errorMessage
	}
}

Logger.info(sfbotMsg.loadBotMsg);

// GO !!!

sfbot.loginWithToken(Auth.token);
