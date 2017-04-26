'use strict'

const fs = require('fs')
const {join} = require('path')
const crypto = require('crypto')
const Router = require('koa-router')

const router = new Router()

function broadcast(data, wss) {
	wss.clients.forEach(client => {
		client.send(data)
	})
}

function home(ctx) {
	ctx.type = 'text/html'
	ctx.body = fs.createReadStream(join(__dirname, '..', 'public', 'index.html'), 'utf8')
}

function payload(wss) {
	return ctx => {
		const d = ctx.request.body
		broadcast(`${JSON.stringify(ctx.request.headers)}\n${JSON.stringify(d)}`, wss)
		ctx.body = {success: true}
	}
}

function verifySignature(ctx, next) {
	const signature = ctx.request.headers['x-teleport-signature']
	const payload = JSON.stringify(ctx.request.body)
	const hmac = crypto.createHmac('sha1', 'segredo')
	const verify = `sha1=${hmac.update(payload).digest('hex')}`
	if (verify === signature) {
		return next()
	}
	ctx.throw(401)
}

function routing(app, wss) {
	router.get('/', home)
	router.post('/payload', payload(wss))
	router.post('/payload-secure', verifySignature, payload(wss))

	app
		.use(router.routes())
		.use(router.allowedMethods({
			throw: true
		}))
}

module.exports = routing
