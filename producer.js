const amqp = require('amqplib/callback_api');
// const CONN_URL = 'amqps://auerqbem:TPEwUg1r2MJ_jXFfAx6neKIz4v1ZNvD4@rattlesnake.rmq.cloudamqp.com/auerqbem';
const CONN_URL = 'amqp://student:COMP30231@152.71.155.95';

let ch = null;
amqp.connect(CONN_URL, function (error0, conn) {
   if (error0) {
      console.log('dan1')
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