// @flow
require('flow-remove-types/register')({ excludes: '' })

const http = require('http');
const events = require('events');
const amqp = require('amqp-connection-manager');
const { logger } = require('@amazeeio/lagoon-commons/src/local-logging');
const { createReqHandler } = require('./createReqHandler');

import type { ChannelWrapper } from './types';


const rabbitmqHost = process.env.RABBITMQ_HOST || "rabbitmq"
const rabbitmqUsername = process.env.RABBITMQ_USERNAME || "guest"
const rabbitmqPassword = process.env.RABBITMQ_PASSWORD || "guest"
const port = process.env.PORT || 3000
const connection = amqp.connect([`amqp://${rabbitmqUsername}:${rabbitmqPassword}@${rabbitmqHost}`], { json: true });

connection.on('connect', ({ url }) => logger.verbose('Connected to %s', url, { action: 'connected', url }));
connection.on('disconnect', params => logger.error('Not connected, error: %s', params.err.code, { action: 'disconnected', reason: params }));

// Cast any to ChannelWrapper to get type-safetiness through our own code
const channelWrapperWebhooks: ChannelWrapper = connection.createChannel({
	setup: channel => {
		return Promise.all([
			channel.assertExchange('amazeeio-webhooks', 'direct', { durable: true }),
		]);
	}
});

const handler = createReqHandler({ path: '/', channelWrapperWebhooks });

http.createServer((req, res) => {
  const { method, url, headers } = req;

	logger.verbose('New %s request to %s', method, url, {
    action: 'new-request',
    method,
    url,
    headers,
  });

	handler(req, res, logger, (err) => {
		res.statusCode = 404
		res.end('no such location')
	});
}).listen(port);
