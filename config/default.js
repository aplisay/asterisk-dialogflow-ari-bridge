module.exports = {
  ari: {
    url: 'http://asterisk:8080',
    username: process.env.ARI_USER,
    password: process.env.ARI_PASSWORD,
    appName: process.env.ARI_APPLICATION
  },
  rtpServer: {
    // This needs a bit of care as it is the hostname give *to* Asterisk via ARI which tells it where to
    //  send it's audio. Needs to resolve *in DNS* to the IP address of the audioserver component 
    host: 'localhost',
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