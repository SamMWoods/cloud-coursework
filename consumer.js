const amqp = require('amqplib/callback_api');
const { AsyncResource } = require('async_hooks');
const CONN_URL = 'amqps://nxwlepfx:4E8Stppg8N5-UhepP2PuTCidUTn9hxy8@crow.rmq.cloudamqp.com/nxwlepfx';
// const CONN_URL = 'amqp://student:COMP30231@152.71.155.95';
const fsp = require('fs').promises;
const fs = require('fs').promises;
const axios = require('axios')

const Ajv = require("ajv")
const ajv = new Ajv()
const OWMkey = 'caf601039bdc2f250d3fb2782c5c694e'
const WWOKey = 'ce098e6abcee47558f1145919220401'

const offerSchema = {
  type: "object",
  properties: {
      messageId: { type: "string" },
      tripId: { type: "string" },
      creatorUserId: { type: "string" },
      longitude: { type: "string" },
      latitude: { type: "string" },
      date: { type: "string" }
  },
  required: ["messageId", "tripId", "creatorUserId", "longitude", "latitude", "date"]
};

const intentSchema = {
  type: "object",
  properties: {
      messageId: { type: "string" },
      tripId: { type: "string" },
      tripCreatorUserId: { type: "string" },
      userId: { type: "string" }
  },
  required: ["messageId", "tripId", "tripCreatorUserId", "userId"]
};

module.exports.consume = async () => {
  let offersFile = await fsp.readFile('offers.json')
  let offers = JSON.parse(offersFile)
  var offersCount = await Object.keys(offers.offers).length;

  let intentFile = await fsp.readFile('intent.json')
  let intent = JSON.parse(intentFile)
  var intentCount = await Object.keys(intent.intent).length;

  let coordsFile = await fsp.readFile('coords.json')
  let coordsJSON = JSON.parse(coordsFile)
  var coordsCount = await Object.keys(coordsJSON.coords).length;

  amqp.connect(CONN_URL, function (error0, conn) {
    if (error0) {
      throw error0;
    }
    conn.createChannel(async function (error1, channel) {
      if (error1) {
        throw error1;
      }
      var offersExchange = 'TRAVEL_OFFERS';
      var intentExchange = 'TRAVEL_INTENT';

      channel.assertExchange(offersExchange, "topic", {
        durable: false
      });
      channel.assertExchange(intentExchange, "topic", {
        durable: false
      });

      channel.assertQueue('', {
        exclusive: true
      }, function (error2, q) {
        if (error2) {
          throw error2;
        }
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
        channel.bindQueue(q.queue, offersExchange);
        channel.bindQueue(q.queue, intentExchange);

        channel.consume(q.queue, async function (msg) {
          if (msg.content) {
            let data = JSON.parse(msg.content)
            let intentMatch = false
            let offerMatch = false
            console.log(" [x] %s", msg.content);

            console.log('msg.fields.exchange', msg.fields.exchange)

            if (msg.fields.exchange == 'TRAVEL_OFFERS' && ajv.validate(offerSchema, data) === true) {
                offers.offers.map((orderNum, index) =>{
                  if((orderNum.messageId === data.messageId) || (orderNum.tripId === data.tripId)){
                    offerMatch = true
                  }
                })

                var coordState = false

                coordsJSON.coords.map((coord) => {
                  if(data.latitude === coord.latitude && data.longitude === coord.longitude){
                   coordState = true
                    console.log('coords found')
                  }
                })

                async function getWeather(city) {
                  let data = await fsp.readFile('weather.json')
                  let totalJson = JSON.parse(data)
              
                  if (totalJson[city] !== undefined) {
                    console.log("Weather is cached")
                    return
                  }
                
                  console.log("Weather is not cached")
                  try {
                    const response = await axios.get(`http://api.worldweatheronline.com/premium/v1/weather.ashx?key=${WWOKey}&q=${city}&&num_of_days=2&tp=3&format=JSON`);
              
                    totalJson[city] = response.data
                  fs.writeFile(`weather.json`,JSON.stringify(totalJson, null, 2) , errorHandling)
                    function errorHandling(error) {
                        console.log(error)
                    }
                  } catch (error) {
                    console.error(error);
                  }
                }  

                if(!coordState){
                  console.log('coords not found')
                  try {
                    const response = await axios.get(`http://api.openweathermap.org/geo/1.0/reverse?lat=${data.latitude}&lon=${data.longitude}&limit=1&appid=${OWMkey}`);
                    if(response.status === 200){    
                    let coords = {
                        cityName: response.data[0].name,
                        lon: response.data[0].lon.toString(),
                        lat: response.data[0].lat.toString()
                      }
            
                      coordsJSON.coords.map((coord) => {
                        if (coord == coords) {
                          console.log("City is cached")
                          coordState = true
                        }
                      })
            
                      if(coordState === false){
                        coordsJSON.coords[coordsCount] = coords
                        fs.writeFile(`coords.json`,JSON.stringify(coordsJSON, null, 2) , errorHandling)

                        data.latitude = response.data[0].lat.toString()
                        data.longitude = response.data[0].lon.toString()
                      }
            
            
                      function errorHandling(error) {
                          console.log(error)
                      }
                    }else{
                        offerMatch = true
                    }
                    await getWeather(response.data[0].name)
                  } catch (error) {
                    offerMatch = true
                    console.error(error);
                  }
                }

                if(offerMatch === false){
                  console.log(data)
      
                  offers.offers[offersCount] = data;
                  fs.writeFile(`offers.json`,JSON.stringify(offers, null, 1) , errorHandling)
                  offersCount++
                }
    
                function errorHandling(error) {
                    console.log(error)
                }
            }

            if (msg.fields.exchange == 'TRAVEL_INTENT' && ajv.validate(intentSchema, data) === true) {
              intent.intent.map((intentNum, index) =>{
                if((intentNum.messageId === data.messageId)){
                  console.log('NOT unqiue intent')
                  intentMatch = true
                }
              })

              if(intentMatch === false){
                console.log('unqiue intent')
                intent.intent[intentCount] = data;                
                fs.writeFile(`intent.json`,JSON.stringify(intent, null, 1) , errorHandling)
                intentCount++
              }
  
              function errorHandling(error) {
                  console.log(error)
              }
            }
          }
        }, {
          noAck: true
        });
      });
    });
  });
}