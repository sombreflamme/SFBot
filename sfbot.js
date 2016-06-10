process.title = "SFBot";
var version = require("./package.json").version;

// Chargement de la configuration
var Config = require("./config/config.json");
var cmd = Config.cmd;
var adminIDs = Config.adminID;
var opIDs = Config.opIDs;

var Auth = require("./config/auth.json"); // Token d'identification

// Chargement des plugins
var Discord = require("discord.js");
var Mysql = require("node-mysql");

// Chargement des loggers
var Logger = require("./plugins/logger.js").Logger;
var ChatLog = require("./plugins/logger.js").ChatLog;

/********************************
          Commandes
********************************/
var commands = {
	"kill": {
		name: "kill",
		description: "Tue le petit robot en lui demandant de se suicider proprement.",
		extendHelp: "Le robot se déconnectera et le processus s'arrêtera.",
		adminOnly: true,
		process : function(sfbot, msg) {
			killMsg = Config.killMsg;
			sfbot.sendMessage(msg.channel, killMsg);
			sfbot.sendMessage(msg.channel, "À bientôt... ", function() {
				sfbot.logout();
				process.exit(0);
			});
			//Logger.log("warn", "Déconnecté par un meurtre");
		}
	},
	"ping": {
		name: "ping",
		description: "On joue au Ping-Pong ? :heart_eyes:",
		extendHelp: "Le robot répond à votre demande de ping, ce qui permet de savoir s'il est toujours présent et apte à répondre aux commandes.",
		process : function(sfbot, msg) {
			sfbot.sendMessage(msg.channel, msg.sender + ", Pong !");
		}
	}
};

/********************************
	Fin des commandes
********************************/

var sfbot = new Discord.Client();

sfbot.on("ready", function() {
	//Logger.log("info", "Prêt à sévir !")
	//Logger.log("info", "Présent sur " + sfbot.servers.length + " serveurs et dans " + sfbot.channels.length + " chans.");
	console.log("Près à sévir !");
	console.log("Présent sur " + sfbot.servers.length + " serveurs et dans " + sfbot.channels.length + " chans.");
});

sfbot.on("disconnect", function() {
	//Logger.log("error", "Déconnecté !");
	console.log("Déconnecté !");
	process.exit(0);
});

/********************************
	Interpréteur de
	   commandes
********************************/

sfbot.on("message", function(msg) {
	// Logger le message
	// Si le bot est l'auteur du message, on ne fait rien d'autre
	if (msg.author == sfbot.user) {
		return;
	}
	// Vérification si c'est une commande
	if (msg.author.id != sfbot.user.id && (msg.content[0] === cmd)) {
		// Si le bot est en maintenance
		
		// Logger la commande et le lanceur

		var cmdTxt = msg.content.split(" ")[0].substring(1).toLowerCase();
		var suffix = msg.content.substring(cmdTxt.length + 2);

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
		sfbot.sendMessage(msg.channel, Config.cmdNotAllowed.substring(0, 4) + msg.sender + Config.cmdNotAllowed.substring(4));
	}
	if (command.hasOwnProperty("adminOnly") && command.adminOnly && !isAdmin(userID)) {
		isAllowResult = false;
		sfbot.sendMessage(msg.channel, Config.cmdNotAllowed.substring(0, 4) + msg.sender + Config.cmdNotAllowed.substring(4));
	}

	return {
		isAllow: isAllowResult,
		errMsg: errorMessage
	}
}

// GO !!!

sfbot.loginWithToken(Auth.token);
