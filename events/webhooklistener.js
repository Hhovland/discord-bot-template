const Discord = require("discord.js")
const express = require('express')
const app = express()

const PORT = process.env.PORT || 80

class WebhookListener {
	listen() {
		app.post('/', (req, res) =>{
			const data = req.body.data
			const { message, timestamp } = data

			res.send({ status: 'OK' })
		})

		app.listen(PORT)
	}
}

const listener = new WebhookListener()
listener.listen()

module.exports = listener
