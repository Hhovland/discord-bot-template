const axios = require("axios")
const sessionURL = "https://us-central1-isoft-web-services.cloudfunctions.net/OnSIP_Session_Handler"
const subscriptionURL = "https://us-central1-isoft-web-services.cloudfunctions.net/OnSIP_Subscription_Handler"

module.exports = {
	name: "restartbothooks",
	category: "dev",
	adminOnly: true,
	description: "Restarts the session/subscription of the OnSIP Webhooks when they turn off.",
	run: async bot => {
		await axios({
			method: 'post',
			url: sessionURL,
			data: {},
		})
		setTimeout(5000)
		await axios({
			method: 'post',
			url: subscriptionURL,
			data: {},
		})

		var { client, message, f } = bot
		const msg = await message.channel.send(`Main bot Pinging...`)
		msg.edit(`Pong! \nAPI: \`${Math.round(client.ws.ping)}\`ms\nBot: \`${msg.createdAt - message.createdAt}\`ms.\nUptime: ${client.functions.get("functions").formatTime(client.uptime)}`)
	},
}

