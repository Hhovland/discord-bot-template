const Discord = require("discord.js")
const client = new Discord.Client({ disableMentions: "everyone" }) //remove the parameters being passed into

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const PORT = 8080
const jsonParser = bodyParser.json()

const botChannelId = "973236937404080129"
const botChannel = client.channels.cache.get(botChannelId)

const callStatusMap = new Map([
	[ 'call.dialog.confirmed', { result: 'Call Answered', color: 60928 } ],
	[ 'call.dialog.created', { result: 'Incoming Call', color: 255 } ],
	[ 'call.dialog.terminated', { result: 'Call Ended', color: 30 } ],
	[ 'call.dialog.failed', { result: 'Call not Answered', color: 16711680 } ],
])

const ISoftNum = "4024353850"
const OnSIPMap = new Map([
	[ "sip:isoft.menu@isoftdata.onsip.com", "Call Menu" ],
	[ `${ISoftNum }107`, "Justin Wheeler" ],
	[ `${ISoftNum }121`, "Holly Heffelbower" ],
	[ "ghagemoser@isoftdata.onsip.com", "Gibran Hagemoser" ],
	[ `${ISoftNum }130`, "James Woody" ],
	[ "sip:ajones@isoftdata.onsip.com", "Alex Jones" ],
	[ `${ISoftNum }100`, "Emily Moore" ],
	[ `${ISoftNum }101`, "Matthew Wegener" ],
	[ "sip:eepperson@isoftdata.onsip.com", "Emily Epperson" ],
	[ `${ISoftNum }111`, "Tony Merritt" ],
	[ `${ISoftNum }119`, "Gwyn Evans" ],
	[ `${ISoftNum }301`, "Voicemail" ],
	[ `${ISoftNum }102`, "Dayton Lowell" ],
	[ `${ISoftNum }105`, "Dillon Sadofsky" ],
	[ `${ISoftNum }108`, "Mark Hardisty" ],
	[ `${ISoftNum }202`, "Web Dev" ],
	[ `${ISoftNum }113`, "Brian Roy" ],
	[ `${ISoftNum }118`, "Jordan Bonge" ],
	[ "sip:vm.jchristensen@isoftdata.onsip.com", "Jake Christensen" ],
	[ "sip:eehuntgroup@isoftdata.onsip.com", "EEhuntGroup" ],
	[ "sip:htp.support.hunt.group@isoftdata.onsip.com", "Support Hunt Group" ],
	[ "sip:vm.elowell@isoftdata.onsip.com", "E Lowell" ],
	[ "sip:default.hunt@isoftdata.onsip.com", "Default Hunt" ],
	[ "sip:vm.nfryzek@isoftdata.onsip.com", "N Fryzek" ],
	[ "sip:presage.menu@isoftdata.onsip.com", "Presage Menu" ],
	[ "sip:tech.support@isoftdata.onsip.com", "Tech Support" ],
])

const config = require("./config.js")
const { prefix, token } = require("./config.js")
const fs = require("fs")

client.once('ready', ()=> {
	console.log('Ready!')
})

let bot = { client, config, prefix }

client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()
client.events = new Discord.Collection()
client.functions = new Discord.Collection()
client.categories = fs.readdirSync("./commands/")

app.post("/", jsonParser, async function(req, res) {
	try {
		console.log("Pong")
		const { body } = req
		console.log("Body Read in.")
		console.log(body.streamId)
		var Exists = await embedChecker(body)
		console.log("Exists read in.")
		if (Exists != 0) { //EmbedChecker is a future function that checks previous postes in the bot channel (Last 50 messages) to see if the stream id exists.
			await replaceEmbed(Exists, body)//Backtraces and edits an embed (Add logic that if you are replacing with a previous call step don't instead just record the original time)
		} else {
			await newEmbed(body) //Posts a new embed.
		}
		console.log("Message Posted")
		res.status(200).send("Webhook Recieved")
	} catch (err) {
		console.log("It broke somewhere")
		res.status(500).send(err)
	}
})

client.loadCmds = (client, reload) => require(`./handlers/command`)(client, reload)
client.loadFunctions = (client, reload) => require(`./handlers/function`)(client, reload)
client.loadEvents = (client, reload) => require("./handlers/event.js")(client, reload, bot)
client.loadCmds(client, false)
client.loadFunctions(client, false)
client.loadEvents(client, false)

module.exports = bot
client.login(token)

function embedChecker(body) {
	console.log("Embed Check start")
	Discord.channels.fetch(botChannelId).then(messages => {
		console.log(`Received ${messages.size} messages`)
		//Iterate through the messages here with the variable "messages".
		messages.forEach(message => {
			if (message.fields.streamId == body.streamId) {
				console.log("ID")
				return message.id
			} else {
				console.log("0")
				return 0
			}
		})
	})
}

function replaceEmbed(MessageId, { type: callStatus, id, streamId, payload }) {
	const { toUri, fromUri, createdAt } = payload
	let oldMessage = ""
	try {
		botChannel.messages.fetch(MessageId).then(message => {
			oldMessage = message
		})
		let supportTarget = OnSIPMap.get(toUri) || toUri
		let customerTarget = OnSIPMap.get(fromUri) || fromUri

		const newEmbed = new Discord.MessageEmbed()
			.setColor(callStatusMap.get(callStatus).color)
			.setTitle(`Call From: ${customerTarget}`)
			.setDescription(`Id: ${id}`)
			.setTimestamp(createdAt)
			.addFields(
				{
					name: "streamId", value: streamId, inline: true,
				},
				{
					name: "Call Status", value: callStatusMap.get(callStatus).result, inline: true,
				},
				{
					name: "Call Directed At", value: supportTarget, inline: true,
				},
				{
					name: "Timestamps", value: oldMessage.embeds.timestamp,
				},
			)
		botChannel.messages.fetch(MessageId).then(message => {
			message.delete()
		})
		botChannel.send({ embeds: [ newEmbed ] })
	} catch (err) {
		console.error(err)
	}
}

function newEmbed({ type: callStatus, id, streamId, payload }) {
	const { toUri, fromUri, createdAt } = payload
	try {
		let supportTarget = OnSIPMap.get(toUri) || toUri
		let customerTarget = OnSIPMap.get(fromUri) || fromUri

		const newEmbed = new Discord.MessageEmbed()
			.setColor(callStatusMap.get(callStatus).color)
			.setTitle(`Call From: ${customerTarget}`)
			.setDescription(`Id: ${id}`)
			.setTimestamp(createdAt)
			.addFields(
				{
					name: "streamId", value: streamId, inline: true,
				},
				{
					name: "Call Status", value: callStatusMap.get(callStatus).result, inline: true,
				},
				{
					name: "Call Directed At", value: supportTarget, inline: true,
				},
			)
		botChannel.send({ embeds: [ newEmbed ] })
	} catch (err) {
		console.error(err)
	}
}

app.listen(PORT, function() {
	console.log('Express server listening on port ', PORT); // eslint-disable-line
})
