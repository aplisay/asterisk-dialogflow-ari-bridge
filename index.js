const ariClient = require('ari-client');
const config = require('config');
const Pino = require('pino');
const log = new Pino({
    name: 'Asterisk-Dialogflow-ARI-Bridge',
});
const Bridge = require('./lib/Bridge');
const mqtt = require('async-mqtt');

let channels = new Map();

log.info('Starting');

async function main() {
    try {
        let mqttClient = null;

        if (config.get('mqtt.url')) {
            log.info('trying to connect to mqtt');
            mqttClient = await mqtt.connectAsync(config.get('mqtt.url'))
            log.info('connected to mqtt');

            mqttClient.on('message', async (topic, message) => {
                const payload = JSON.parse(message.toString());
                log.info({topic, payload}, 'got a message');
                if (topic.includes('events')) {
                    let channelId = topic.replace(`${config.get('mqtt.topicPrefix')}/`, '').split('/')[0];//this is super bodge
                    let bridge = channels.get(channelId);
                    bridge.receivedDialogFlowEvent(payload);
                }
            });
        }

        const ariConfig = config.get('ari');

        client = await ariClient.connect(ariConfig.url, ariConfig.username, ariConfig.password);
        log.info('connected to ari websocket');

        client.on('StasisStart', async (event, channel) => {

            let onStreamEnd = false;

            if (event.channel.name.includes('UnicastRTP')) {
                return;
            }

            let logger = log.child({id: channel.id});
            logger.info({event}, 'channel entered our application');

            if(config.has('asterisk.playback')){
                let playback = client.Playback();
                let playbackFinished = new Promise (resolve => playback.once('PlaybackFinished', resolve));
                channel.play({ media:`sound:${config.get('asterisk.playback')}` }, playback);
                await playbackFinished;
            }

            let bridge = new Bridge(client, log);

            channels.set(channel.id, bridge);

            bridge.on('empty', async () => {
                await mqttClient.unsubscribe(`${config.get('mqtt.topicPrefix')}/${channel.id}/events`);
                await bridge.destroy();
            });

            if (mqttClient) {
                bridge.on('newStream', async (data) => {
                    await mqttClient.publish(`${config.get('mqtt.topicPrefix')}/newStream`, JSON.stringify({
                        roomName: data.roomName,
                        port: data.port,
                        callerName: data.callerName,
                        callerNumber: data.callerNumber,
                        channelId: data.channelId
                    }));
                });

                bridge.on('streamEnded', async (data) => {
                    await mqttClient.publish(`${config.get('mqtt.topicPrefix')}/streamEnded`, JSON.stringify({
                        name: data.roomName,
                        port: data.port,
                        callerName: data.callerName,
                        callerNumber: data.callerNumber,
                        channelId: data.channelId
                    }));
                });

                bridge.on('dialogFlowEvent', async (data) => {
                    if (data.intent && data.intent.intent && data.intent.intent.endInteraction) {
                        onStreamEnd = async () => {
                          await client.channels.continueInDialplan({ channelId: channel.id });
                          log.info('Closed connection');
                        }
                        log.info('Will close connection on next stream end');
                    }
                    if (data.frames && data.ended)
                      onStreamEnd = onStreamEnd && await onStreamEnd() && false;
                });

                await mqttClient.subscribe(`${config.get('mqtt.topicPrefix')}/${channel.id}/events`);
            }

            await bridge.create();

            await channel.answer();

            await bridge.addChannel(channel);

        });

        client.on('StasisEnd', (event, channel) => {

        });

        await client.start(ariConfig.appName);
        log.info('ari started');
        return;
    } catch (err) {
        throw err;
    }
};

function startApp(retry = 1000) {
    main()
        .catch(err => {
            log.error({ err, retry }, 'Startup error');
            setTimeout(() => startApp(retry + 1000), retry);
        });
}

startApp();
