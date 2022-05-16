const Discord = require("discord.js")
const { MessageEmbed } = require('discord.js')
const client = new Discord.Client({ disableMentions: "everyone" }) //remove the parameters being passed into

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const PORT = 8080
const jsonParser = bodyParser.json()

const botChannelId = "973236937404080129"
const serverId = "483076478251171851"

const messageCache = new Map()
const statusCache = new Map()
const timeCache = new Map()

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
		const { body } = req
		const { streamId, type } = body
		await msgStatusMaper(streamId, type)
		await messageSend(body)
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

async function createEditedEmbed({ type: id, streamId, payload, type }) {
	const { toUri, fromUri } = payload
	try {
		let supportTarget = OnSIPMap.get(toUri) || toUri
		let customerTarget = OnSIPMap.get(fromUri) || fromUri
		await timeMapper(streamId, type, timeCache.get(streamId))
		const newEmbed = new Discord.MessageEmbed()
			.setColor(callStatusMap.get(statusCache.get(streamId)).color)
			.setTitle(`Call From: ${customerTarget}`)
			.setDescription(`Id: ${streamId}`)
			.addFields(
				{
					name: "Call Directed At", value: supportTarget, inline: true,
				},
				{
					name: "Timestamps", value: timeCache.get(streamId),
				},
			)
		return newEmbed
	} catch (err) {
		console.error(err)
	}
}

async function createNewEmbed({ type: id, streamId, payload, type }) {
	const { toUri, fromUri } = payload
	try {
		let supportTarget = OnSIPMap.get(toUri) || toUri
		let customerTarget = OnSIPMap.get(fromUri) || fromUri
		await timeMapper(streamId, type)
		const newEmbed = new MessageEmbed()
			.setColor(callStatusMap.get(statusCache.get(streamId)).color)
			.setTitle(`Call From: ${customerTarget}`)
			.setDescription(`Id: ${streamId}`)
			.addFields(
				{
					name: "Call Directed At", value: supportTarget, inline: true,
				},
				{
					name: "Timestamps", value: timeCache.get(streamId),
				},
			)
		return newEmbed
	} catch (err) {
		console.error(err)
	}
}

async function messageSend(body) {
	const channel = await client.channels.fetch(botChannelId)
	const guild = client.guilds.cache.get(serverId)
	const serverChannel = guild.channels.cache.find(c => c.id === botChannelId && c.type === 'text')
	const { streamId } = body
	if (!channel) {
		return
	} // if the channel is not in the cache return and do nothing
	var embed
	if (messageCache.has(streamId)) {
		embed = await createEditedEmbed(body)
		serverChannel.messages.fetch(messageCache.get(streamId)).then(message => {
			message.edit(embed)
		}).catch(err => {
			console.error(err)
		})
	} else {
		embed = await createNewEmbed(body)
		return channel.send(embed).then(sent => {
			let id = sent.id
			messageCache.set(streamId, id)
		}).catch(err => {
			console.error(err)
		})
	}
	cacheDeleteCondition(streamId, body.type)
}

function dateTime() {
	var datum = +new Date()
	return new Date(datum)
}

function msgStatusMaper(streamId, callStatus) {
	if (callStatus == "call.dialog.terminated") {
		return statusCache.set(streamId, callStatus)
	} else if (callStatus == "call.dialog.failed") {
		return statusCache.set(streamId, callStatus)
	} else if (callStatus == "call.dialog.confirmed") {
		return statusCache.set(streamId, callStatus)
	} else if (callStatus == "call.dialog.created") {
		return statusCache.set(streamId.callStatus)
	}
}

function timeMapper(streamId, callStatus, times = [ "Created: ", "Confirmed: ", "Terminated: ", "Failed:" ]) {
	if (callStatus == "call.dialog.terminated") {
		times[2] = times[2] + dateTime()
		return timeCache.set(streamId, times)
	} else if (callStatus == "call.dialog.failed") {
		times[3] = times[3] + dateTime()
		return timeCache.set(streamId, times)
	} else if (callStatus == "call.dialog.confirmed") {
		times[1] = times[1] + dateTime()
		return timeCache.set(streamId, times)
	} else if (callStatus == "call.dialog.created") {
		times[0] = times[0] + dateTime()
		return timeCache.set(streamId, times)
	}
}

function cacheDeleteCondition(streamId, callStatus) {
	if (callStatus == "call.dialog.terminated") {
		statusCache.delete(streamId)
		timeCache.delete(streamId)
		messageCache.delete(streamId)
	} else if (callStatus == "call.dialog.failed") {
		statusCache.delete(streamId)
		timeCache.delete(streamId)
		messageCache.delete(streamId)
	}
}

app.listen(PORT, function() {
	console.log('Express server listening on port ', PORT)
})
