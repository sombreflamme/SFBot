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
var request = require("request").defaults({ encoding: null });

// Chargement des loggers
var Logger = require("./plugins/logger.js").Logger;
var ChatLog = require("./plugins/logger.js").ChatLog;

Logger.info(sfbotMsg.bootConfigMsg);

var maintenance = false;
var chooseList = [];
var play = false;

/********************************
          Commandes
********************************/
var commands = {
	"kill": {
		// Tue le bot.
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
		// Passe le bot en mode "maintenance" pour qu'il n'accepte plus aucune commande sauf la désactivation du mode maintenance.
		name: "maintenance",
		description: sfbotMsg.maintenanceDesc,
		extendHelp: sfbotMsg.maintenanceExtHelp,
		usage: "<on|off>",
		opOnly: true,
		process: function(sfbot, msg, suffix) {
			// Si on demande l'activation du mode "maintenance".
			if (suffix && suffix === "on") {
				// On l'active s'il ne l'est pas déjà.
				if (!maintenance) {
					sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceMsgOn);
					maintenance = true;
					Logger.info(msg.author.username + sfbotMsg.maintenanceLogOn);
				}
				// On indique qu'il est déjà en mode "maintenance" si c'est le cas.
				else {
					sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceMsgOnErr);
				}
			}
			// Si on demande la désactivation du monde "maintenance".
			else if (suffix && suffix === "off") {
				// On le désactive s'il est bien activé.
				if (maintenance) {
					Logger.info(msg.author.username + sfbotMsg.maintenanceLogOff);
                                        sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceMsgOff);
                                        maintenance = false;
				}
				// On indique qu'il n'est pas encore en mode "maintenance" si c'est le cas.
				else {
					sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceMsgOffErr);
				}
			}
			// S'il n'y a pas "on" ou "off".
			else {
				sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.maintenanceErr);
			}
		}
	},
	"ping": {
		// Ping le bot, qui répond par Pong.
		name: "ping",
		description: sfbotMsg.pingDesc,
		extendHelp: sfbotMsg.pingExtHelp,
		process: function(sfbot, msg) {
			sfbot.sendMessage(msg.channel, msg.author + ", Pong !");
		}
	},
	"dice": {
		// Lance X dés de Y faces. Par défaut : d100.
		name: "dice",
		description: sfbotMsg.diceDesc,
		extendHelp: sfbotMsg.diceExtHelp,
		usage: "<faces>",
		process: function(sfbot, msg, suffix) {
			// On split la demande.
			var diceSplit = suffix.split("d");
			// Si il n'y a qu'une seule entrée après le split, on vérifie que c'est un nombre entier compris entre 3 et 10000.
			if (diceSplit && diceSplit.length == 1 && (parseFloat(diceSplit[0]) == parseInt(diceSplit[0]) && !isNaN(diceSplit[0])) && diceSplit[0] >= 3 && diceSplit[0] <= 10000) dice = "d" + diceSplit[0];
			// Si il y a deux entrées après le split, on vérifie que ce sont des nombres entiers, que le nombre de dés est entre 1 et 20, et que le nombre de faces est entre 2 et 10000.
			else if (diceSplit && diceSplit.length == 2 &&  (parseFloat(diceSplit[0]) == parseInt(diceSplit[0]) && !isNaN(diceSplit[0])) && (parseFloat(diceSplit[1]) == parseInt(diceSplit[1]) && !isNaN(diceSplit[1])) && diceSplit[0] >= 1 && diceSplit[0] <= 20 && diceSplit[1] >= 2 && diceSplit[1] <= 10000) dice = suffix;
			// Sinon, on lance un dé à 100 faces
			else dice = "d100";
			request("https://rolz.org/api/?" + dice + ".json", function(error, response, body) {
				// Si le site a bien répondu, on affiche le résultat.
				if (!error && response.statusCode == 200) {
					var diceMsg = sfbotMsg.diceMsg;
					var roll = JSON.parse(body);
					sfbot.sendMessage(msg.channel, msg.author + diceMsg.substring(0, 15) + roll.input + diceMsg.substring(14, 25) + roll.result + diceMsg.substring(25, 29) + " " + roll.details.replace(new RegExp(" ", "g"), ""));
				}
				// Si le site n'a pas répondu ou a renvoyé une erreur, on indique le message et on log l'erreur.
				else {
					sfbot.sendMessage(msg.channel, sfbotMsg.diceErr);
					Logger.warn(error);
				}
			});	
		}
	},
	"say": {
		// Fait parler le bot dans le channel indiqué (ID complet).
		name: "say",
		description: sfbotMsg.sayDesc,
		extendHelp: sfbotMsg.sayExtHelp,
		usage: "<channelID> <phrase>",
		adminOnly: true,
		process: function(sfbot, msg, suffix) {
			// On récupère l'ID du channel désiré
			var chanID = suffix.split(" ")[0];
			var message = suffix.substring(19);
			// On affiche le message si ce n'est pas l'ID d'un message privé
			if (!msg.channel.server) {
				sfbot.sendMessage(chanID, message);
			} 
		}
	},
	"info": {
		// Demande les informations du bot.
		name: "info",
		description: sfbotMsg.infoDesc,
		extendHelp: sfbotMsg.infoExtHelp,
		process: function(sfbot, msg) {
			var msgArray = [];
			msgArray.push(sfbotMsg.infoMsg1.substring(0, 18) + sfbot.user.username + sfbotMsg.infoMsg1.substring(18));
			msgArray.push(sfbotMsg.infoMsg2.substring(0, 38) + version + sfbotMsg.infoMsg2.substring(38));
			msgArray.push(sfbotMsg.infoMsg3);
			msgArray.push(sfbotMsg.infoMsg4.substring(0, 80) + cmdPrefix + sfbotMsg.infoMsg4.substring(80));
			msgArray.push(sfbotMsg.infoMsg5.substring(0, 100) + adminIDs[0] + sfbotMsg.infoMsg5.substring(100));
			sfbot.sendMessage(msg.author, msgArray);
		}
	},
	"avatar": {
		// Change l'avatar du bot.
		name: "avatar",
		description: sfbotMsg.avatarDesc,
		extendHelp: sfbotMsg.avatarExtHelp,
		usage: "<Direct URL of avatar>",
		adminOnly: true,
		process: function(sfbot, msg, suffix) {
			// S'il n'y a pas de suffix.
			if (!suffix) {
				sfbot.sendMessage(msg.channel, sfbotMsg.avatarMsgImg);
			}
			// Sinon on traite la demande.
			else {
				// On récupère l'image avec l'URL en suffix.
				request.get(suffix, function(error, response, body) {
					// Si l'URL a bien répondu, on continue de traiter.
					if (!error && response.statusCode == 200) {
						// On récupère l'extension de l'image
						var url = suffix.split(".");
						var ext = url[url.length-1];
						// On encore l'image en base64 et on la rentre dans une variable pour lancer la commande de modification de l'avatar.
						var avatar = "data:image/" + ext + ";base64," + new Buffer(body).toString("base64");
						sfbot.setAvatar(avatar, function(error) {
							// S'il y a une erreur dans le changement d'avatar, on log.
							if (error) Logger.debug(error);
							// Sinon on indique la réussite.
							else {
								sfbot.sendMessage(msg.channel, sfbotMsg.avatarMsgOK);
								Logger.info(sfbotMsg.avatarMsgLog + msg.author);
							}
						});
					}
					// Si l'URL ne répond pas ou qu'il y a un problème à la récupération, on l'indique et on log l'erreur.
					else {
						sfbot.sendMessage(msg.channel, sfbotMsg.avatarMsgErr);
						Logger.debug(error);
					}
				});
			}
		}
	},
	"chooseme": {
		// S'enregistrer pour le prochain tirage au sort qui aura lieu avec la commande choose.
		name: "chooseme",
		description: sfbotMsg.choosemeDesc,
		extendHelp: sfbotMsg.choosemeExtHelp,
		process: function (sfbot, msg) {
			// Ajoute l'auteur du message dans la liste et envoie une confirmation s'il n'y est pas déjà.
			if (chooseList.indexOf(msg.author) == -1) {
				chooseList.push(msg.author);
				sfbot.sendMessage(msg.channel, msg.author +  sfbotMsg.choosemeMsg);
				Logger.info(msg.author.username + sfbotMsg.choosemeLog);
			}
			else {
				sfbot.sendMessage(msg.channel, msg.author + sfbotMsg.choosemeTriche);
			}
		}
	},

	"choose": {
		// Choisie une personne au hasard dans la liste des inscrits avec chooseme.
		name: "choose",
		description: sfbotMsg.chooseDesc,
		extendHelp: sfbotMsg.chooseExtHelp,
		process: function (sfbot, msg) {
			// On vérifie qu'il y ait plus d'une personne dans la liste.
			if (chooseList.length == 0) {
				sfbot.sendMessage(msg.channel, sfbotMsg.chooseErr);
				return;
			}
			// On choisit une personne au hasard dans la liste.
			var chosenOne = chooseList[Math.floor((Math.random() * (chooseList.length - 1)) + 0)];
			// On affiche le grand gagnant.
			sfbot.sendMessage(msg.channel, sfbotMsg.chosenOne + chosenOne + " !");
			Logger.info(sfbotMsg.chosenOne + chosenOne);
			// On vide la liste.
			chooseList = [];
		}

	},
	"playing": {
		// Indique le jeu auquel joue le bot.
		name: "playing",
		description: sfbotMsg.playingDesc,
		extendHelp: sfbotMsg.playingExtHelp,
		usage: "<[game]|stop>",
		adminOnly: true,
		process: function (sfbot, msg, suffix) {
			if (!suffix || suffix === "stop") {
				if (!play) {
					sfbot.sendMessage(msg.channel, sfbotMsg.playingStopNoPlay);
					return;
				}
				sfbot.setPlayingGame(null, function(error) {
					if (error) {
						sfbot.sendMessage(msg.channel, sfbotMsg.playingStopErr);
						Logger.warn(error);
					}
					else {
						play = false;
						sfbot.sendMessage(msg.channel, sfbotMsg.playingStopOK);
						Logger.info(msg.author.username + sfbotMsg.playingStopLog);
					}
				});
			}
			else {
				sfbot.setPlayingGame(suffix, function(error) {
					if (error) {
						sfbot.sendMessage(msg.channel, sfbotMsg.playingGoErr);
						Logger.warn(error);
					}					
					else {
						play = true;
						sfbot.sendMessage(msg.channel, sfbotMsg.playingGoOK.substring(0,38) + suffix + sfbotMsg.playingGoOK.substring(38));
						Logger.info(msg.author.username + sfbotMsg.playingGoLog + suffix);
					}
				});
			}
		}
	}
};

/********************************
	Fin des commandes
********************************/
Logger.info(sfbotMsg.bootCmdMsg);

// Création du client Discord.
var sfbot = new Discord.Client();

// Lorsque le bot est prêt.
sfbot.on("ready", function() {
	var servers = (sfbot.servers.length > 1) ? sfbot.servers.length + " serveurs" : sfbot.servers.length + " serveur";
	Logger.info(sfbotMsg.readyMsg1);
	Logger.info(sfbotMsg.readyMsg2.substring(0, 12) + servers + sfbotMsg.readyMsg2.substring(11, 20) + sfbot.channels.length + sfbotMsg.readyMsg2.substring(19, 26));
        Logger.info(sfbotMsg.readyMsg3);
	if (sfbot.user.game != null) {
		if (sfbot.user.game.name != null) play = true;
	}	
});

// Lorsque le bot est déconnecté, on le reconnecte.
sfbot.on("disconnect", function() {
	Logger.error(sfbotMsg.disconnectedMsg);
	sfbot.loginWithToken(Auth.token);
});

/********************************
	Interpréteur de
	   commandes
********************************/

// Quand un message est détecté, on l'analyse.
sfbot.on("message", function(msg) {
	// ChatLog du message si c'est activé.
	if (Config.chatLog === true && msg.channel.server) {
		var d = new Date();
		var date = d.toUTCString();
		ChatLog.info(date + " - " + msg.channel.server.name + ", " + msg.channel.name + "> " + msg.author.username + ": " + msg.content);
	}

	// Si le bot est l'auteur du message, on ne fait rien d'autre.
	if (msg.author.equals(sfbot.user)) {
		return;
	}
	// Si c'est une commande.
	if (msg.author.id != sfbot.user.id && (msg.content[0] === cmdPrefix)) {
		
		// On récupère la commande lancée et le suffixe.
		var cmdTxt = msg.content.split(" ")[0].substring(1).toLowerCase();
		var suffix = msg.content.substring(cmdTxt.length + 2);

		// Si en mode maintenance, et que la commande entrée n'est pas "maintenance", on arrête.
		if (maintenance && cmdTxt != "maintenance") {
			sfbot.sendMessage(msg.channel, sfbotMsg.maintenanceMsg);
			return;
		}

		// Si la commande est help.
		if (cmdTxt === "help") {
			var msgArray = [];
			// S'il n'y a pas de suffixe, on affiche l'aide de base avec la liste des commandes disponibles.
			if (!suffix) {
				var commandsNames = [];
				for (index in commands) {
					// Si on a les droits d'utiliser la commande, on l'affiche.
					if ((commands[index].adminOnly && isAdmin(msg.author.id)) || (commands[index].opOnly && isOp(msg.author.id)) ) {
						commandsNames.push("`" + commands[index].name + "`");
					}
					// Si aucune restriction n'est indiqué, on affiche la commande.
					if (!commands[index].hasOwnProperty("adminOnly") && !commands[index].hasOwnProperty("opOnly")) {
						commandsNames.push("`" + commands[index].name + "`");
					}
				}
				msgArray.push(sfbotMsg.helpMsg1.substring(0, 71) + cmdPrefix + sfbotMsg.helpMsg1.substring(71, 140));
				msgArray.push("");
				msgArray.push(commandsNames.join(", "));
				msgArray.push("");
				msgArray.push(sfbotMsg.helpMsg2.substring(0, 119) + adminIDs[0] + sfbotMsg.helpMsg2.substring(119, 120));
				Logger.info(msg.author.username + sfbotMsg.helpLog);
				sfbot.sendMessage(msg.author, msgArray);
			}
			// S'il y a un suffixe on vérifie que c'est bien un nom de commande existante, puis on affiche l'aide de cette commande.
			else {
				var command = commands[suffix];
				var restrict = canProcessCmd(command, cmdTxt, msg.author.id, msg)
				if (command && restrict.isAllow) {
					msgArray.push("**Nom** : " + command.name);
					if (command.hasOwnProperty("usage")) {
						msgArray.push("**Utilisation** : `" + cmdPrefix + command.name + " " +command.usage + "`");
					}
					msgArray.push("**Description** : " + command.description);
					msgArray.push(command.extendHelp);
					if (command.hasOwnProperty("adminOnly")) {
						msgArray.push("**Restriction** : " + sfbotMsg.helpAdminOnly);
					}
					if (command.hasOwnProperty("opOnly")) {
						msgArray.push("**Restriction** : " + sfbotMsg.helpOpOnly);
					}
					sfbot.sendMessage(msg.author, msgArray);
				}
				else {
					sfbot.sendMessage(msg.channel, sfbotMsg.helpCmdErr);
				}
			}
		}

		// Si la commande existe, on vérifie que le demandeur a le droit de la lancer, et on exécute.
		var command = commands[cmdTxt];
		if (command) {
			// Logger la commande et le lanceur
			Logger.info(msg.author.username + sfbotMsg.cmdExecBy + "<" + msg.content + ">");
			var cmdCheckSpec = canProcessCmd(command, cmdTxt, msg.author.id, msg);
			if (cmdCheckSpec.isAllow) {
				command.process(sfbot, msg, suffix);
			}
			else {
				sfbot.sendMessage(msg.channel, sfbotMsg.cmdNotAllowed.substring(0, 4) + msg.author + sfbotMsg.cmdNotAllowed.substring(4));
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
	}
	if (command.hasOwnProperty("adminOnly") && command.adminOnly && !isAdmin(userID)) {
		isAllowResult = false;
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
