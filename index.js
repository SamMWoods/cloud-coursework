const fs = require('fs');
const express = require('express')

const axios = require('axios')

const app = express()
const port = 1111
const OWMkey = 'caf601039bdc2f250d3fb2782c5c694e'
const WWOKey = 'ce098e6abcee47558f1145919220401'
const fsp = require('fs').promises;
var moment = require('moment'); // require

app.use(express.json())

const { publishToQueue } = require('./producer.js')
const { consume } = require('./consumer.js');

let userID = undefined

async function makeUserID(){
  try {
    // const res = await axios.get(`https://www.random.org/integers/?num=1&min=1000&max=999999&col=1&base=10&format=plain&rnd=new`);
    // var data = {
    //   userID: res.data
    // }

    // random numbers

    var data = {
      userID: Math.floor(Math.random() * 999999),
    }

    fs.writeFile(`userID.json`,JSON.stringify(data, null, 1) , errorHandling)
    function errorHandling(error) {
        console.log(error)
    }
  } catch (error) {
    console.log(error)
  }
}

app.get('/offers', async (req, res) => {
  fs.readFile('./offers.json', 'utf-8', function (err, data) {
    return res.json(JSON.parse(data))
  });
})

app.get('/weather', async (req, res) => {
  fs.readFile('./weather.json', 'utf-8', function (err, data) {
    return res.json(JSON.parse(data))
  });
})

app.get('/intent', async (req, res) => {
  fs.readFile('./intent.json', 'utf-8', function (err, data) {
    return res.json(JSON.parse(data))
  });
})

app.get('/coords', async (req, res) => {
  fs.readFile('./coords.json', 'utf-8', function (err, data) {
    return res.json(JSON.parse(data))
  });
})

app.get('/userid', async (req, res) => {
  fs.readFile('./userID.json', 'utf-8', function (err, data) {
    return res.json(JSON.parse(data))
  });
})

// weather API
app.get('/', async(req, res) => {
  if(userID == undefined){
    userID = await makeUserID()
  }

  console.log("userID",userID)

  fs.readFile('./index.html', 'utf8', (err, html) => {
    if (err){
      res.status(500).send('sorry, out of order')
    }

    res.send(html);
  })

})

app.post('/schema', async(req, res) => {
  console.log(req,'bobob')

  let userInput = req.body.Exchange;
  let city = req.body.locationInput;
  
  let offerSchema 
  let cityName

  if(city != undefined){
    cityName = city.toLowerCase()
  } else{
    cityName = undefined
  }

  if(userID == undefined){
    userID = await makeUserID()
  }


    if(userInput == "TRAVEL_OFFERS"){
      let newUserID = req.body.creatorUserId
      let Offerlongitude = req.body.longitude
      let Offerlatitude = req.body.latitude

      let coords = await getCoords(cityName, Offerlatitude, Offerlongitude)

      console.log('sent cord',coords[0],coords[1])

      if(coords === null){
        return res.sendStatus(400)
      }

      var currentDate = moment().format("YYYY-MM-DD");  

      offerSchema = {
        messageId: await getNum(),
        tripId: await getNum(),
        creatorUserId: newUserID.toString(),
        longitude: coords[0],
        latitude: coords[1],
        date: currentDate,
      }
    }

    if(userInput == "TRAVEL_INTENT"){
      let tripID = req.body.tripId
      let CreatorTripUserId = req.body.tripCreatorUserId
      let intentUserID = req.body.userId

      offerSchema = {
          messageId: await getNum(),
          tripId: tripID,
          tripCreatorUserId: CreatorTripUserId,
          userId: intentUserID.toString()
      }
    }

    console.log(offerSchema)
    offerSchema = JSON.stringify(offerSchema)
    await publishToQueue(offerSchema, userInput);
    return res.sendStatus(200)

})

async function getNum(){
  await createNum()
  let numberFile = await fsp.readFile('number.json')
  let numbers = await JSON.parse(numberFile)
  
  let returnNumber = numbers.numberId.shift()
  returnNumber = returnNumber.id

  fs.writeFile(`number.json`,JSON.stringify(numbers, null, 1) , errorHandling)

    function errorHandling(error) {
      console.log(error)
  }

  return returnNumber
}

async function createNum() {
  let numberFile = await fsp.readFile('number.json')
  let numbers = JSON.parse(numberFile)

  let offersFile = await fsp.readFile('offers.json')
  let offers = JSON.parse(offersFile)

  let intentFile = await fsp.readFile('intent.json')
  let intent = JSON.parse(intentFile)

  var count = await Object.keys(numbers.numberId).length;
    if(count<=5){
    try {
      // const resp = await axios.get(`https://www.random.org/integers/?num=10&min=1000&max=999999&col=1&base=10&format=plain&rnd=new`);

      let data = []

      for (let index = 0; index < 1000; index++){
        data += Math.floor(Math.random() * 999999) + '\n';
      }
        console.log(data)
        // if(resp.status === 200){
            offers.offers.map((tripNum, index) =>{
              if(data === tripNum.messageId && tripNum.tripId && intent.messageId && intent.tripId){
                return 'ID Match'
              }
            })

            let numbersArray = data.split('\n')
            numbersArray.pop()
            let newId = []
            numbersArray.map((num, index) => {
              newId[index-1]= {
                id: num
              }  
            })
            

            numbers.numberId = newId;
            fs.writeFile(`number.json`,JSON.stringify(numbers, null, 1) , errorHandling)

            function errorHandling(error) {
                console.log(error)
            }
            return
        // }
    } catch (error) {
          console.log(error) 
    }
  } else {
    return 'ID Match'
  }
}

  async function getWeather(city) {
    let data = await fsp.readFile('weather.json')
    let totalJson = JSON.parse(data)

    if (totalJson[city] !== undefined) {
      console.log("Weather is cacheds")
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

  async function getCoords(city, latitude, longitude){
    let data = await fsp.readFile('coords.json')
    let coordsJSON = JSON.parse(data)
    var coordsCount = await Object.keys(coordsJSON.coords).length;

    console.log("coordsCount",coordsCount)

    let coordState = false
    let returnData = null

    console.log("City is not cached")

    if(city !== undefined){
    try {
      const response = await axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OWMkey}`);
      let coords = {
        cityName: city,
        lon: response.data[0].lon.toString(),
        lat: response.data[0].lat.toString()
      }


      coordsJSON.coords.map((coord, ) => {
        if (coord.cityName === response.data[0].name) {
          console.log("City is cached")
          coordState = true
          returnData = [coord.lon, coord.lat]
        }
      })

      if(coordState === false){
        coordsJSON.coords[coordsCount] = coords
        fs.writeFile(`coords.json`,JSON.stringify(coordsJSON, null, 2) , errorHandling)
        returnData = [response.data[0].lon.toString(), response.data[0].lat.toString()]
      }

      console.log(response.data[0].name.toLowerCase())

      await getWeather(response.data[0].name.toLowerCase())

      function errorHandling(error) {
          console.log(error)
      }
    } catch (error) {
      console.error(error);
    }

    }

    if(city === undefined){
      try {
        const response = await axios.get(`http://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${OWMkey}`);
        if(response.status === 200){    
        let coords = {
            cityName: response.data[0].name,
            lon: response.data[0].lon.toString(),
            lat: response.data[0].lat.toString()
          }

          coordsJSON.coords.map((coord, ) => {
            if (coord.cityName === response.data[0].name) {
              console.log("City is cached")
              coordState = true
              returnData = [coord.lon, coord.lat]
            }
          })

          if(coordState === false){
            coordsJSON.coords[coordsCount] = coords
            fs.writeFile(`coords.json`,JSON.stringify(coordsJSON, null, 2) , errorHandling)
            returnData = [response.data[0].lon.toString(), response.data[0].lat.toString()]
          }

          console.log(response.data[0].name.toLowerCase())

          await getWeather(response.data[0].name.toLowerCase())

          function errorHandling(error) {
              console.log(error)
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    console.log('returnData',returnData)

    return returnData
  }



  app.listen(port, () => {
        consume()
    console.log(`Example app listening at http://localhost:${port}`)
  })
  


//   axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${key}`).then(resp => {
//     if(resp.status === 200){
//         var cachedData = JSON.stringify(resp.data, null, 2);
        
//         var lat = resp.data[0].lat

//         var lon = resp.data[0].lon

//         fs.writeFile('weather.json', cachedData, errorHandler)

//         function errorHandler(err){
//             console.log(err)
//         }

//         res.send(`the latitude is ${lat} and longitude is ${lon} for the city of ${city}`)
//     }
// });

