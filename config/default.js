module.exports = {
  ari: {
    url: 'http://asterisk:8080',
    username: process.env.ARI_USER,
    password: process.env.ARI_PASSWORD,
    appName: process.env.ARI_APPLICATION
  },
  rtpServer: {
    host: 'audioserver',
    port: 7777,
    format: 'slin16'
  },
  mqtt: {
    url: 'mqtt://mqtt',
    topicPrefix: 'dialogflow-asterisk'
  },
  asterisk: {
    // If set then Playback the Asterisk sound file specified before bridging to the dialogflow media.
    // Useful for debug and breaking media stand-offs.
    playback: 'silence/1'
  },
}