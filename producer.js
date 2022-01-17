const amqp = require('amqplib/callback_api');
const CONN_URL = 'amqps://nxwlepfx:4E8Stppg8N5-UhepP2PuTCidUTn9hxy8@crow.rmq.cloudamqp.com/nxwlepfx';
// const CONN_URL = 'amqp://student:COMP30231@152.71.155.95';

let ch = null;
amqp.connect(CONN_URL, function (error0, conn) {
   if (error0) {
      console.log(error0)
      throw error0;
    }
    conn.createChannel(function(error1, channel) {
      if (error1) {
        console.log('dan2')
        throw error1;
      }
      ch = channel
      var offersExchange = 'TRAVEL_OFFERS';
      var intentExchange = 'TRAVEL_INTENT';
  
      channel.assertExchange(offersExchange, "topic", {
        durable: false
      });
      channel.assertExchange(intentExchange, "topic", {
         durable: false
       });
      // console.log(" [x] Sent %s", msg);
    });
});

module.exports.publishToQueue = async (data, userInput) => {
  console.log('sam', data, userInput)
   ch.publish(userInput, '', Buffer.from(data));
  }

process.on('exit', (code) => {
   ch.close();
   console.log(`Closing rabbitmq channel`);
});