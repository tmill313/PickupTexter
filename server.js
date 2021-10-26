const http = require('http');
const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const bodyParser = require('body-parser');
const { google } = require("googleapis");
const dotenv = require('dotenv');
dotenv.config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = require('twilio')(accountSid, authToken);
const cron = require('node-cron');
const port = process.env.PORT || 3000;

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

const trueFalseMap = {
    'yes': 'Yes',
    'y': 'Yes',
    'no': 'No',
    'n': 'No'
}

const sendMondayMessages = async () => {

    const auth = new google.auth.GoogleAuth({
        keyFile: "google-credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    })

    const client = await auth.getClient()
    const googleSheets = google.sheets({version: "v4", auth: client})
    const spreadsheetId = "1R6eVcbvLk6cjbcBsEJzEDrinbZzUcsn-k5xoL1EYOyE"

    const getNumberRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Availability!A:A"
    })

    const scrubbedRows = await getNumberRows.data.values.map(number => number[0]).filter(num => num !== undefined && num.length === 10)
    Promise.all(
    scrubbedRows.map(number => {
        console.log(number)
        return twilioClient.messages
        .create({
           body: 'Are you playing Daybreak basketball on Tuesday or Thursday? Respond “yes yes” if you’re playing both days, “yes no” if only playing Tuesday, or some similar combination. You may override a previous selection by sending another text. Link to sheet -> https://docs.google.com/spreadsheets/d/1R6eVcbvLk6cjbcBsEJzEDrinbZzUcsn-k5xoL1EYOyE/',
           from: process.env.TWILIO_PHONE_NUMBER,
           to: `+1${number}`
         })
        .then(message => console.log(message.sid));
    })
    ).catch(err => console.log(err))

}

const sendAnnouncementMessages = async ({message}) => {
    console.log(message)

    const auth = new google.auth.GoogleAuth({
        keyFile: "google-credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    })

    const client = await auth.getClient()
    const googleSheets = google.sheets({version: "v4", auth: client})
    const spreadsheetId = "1R6eVcbvLk6cjbcBsEJzEDrinbZzUcsn-k5xoL1EYOyE"

    const getNumberRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Availability!A:A"
    })
    const testArray = ['8016781687']
    const scrubbedRows = await getNumberRows.data.values.map(number => number[0]).filter(num => num !== undefined && num.length === 10)
    Promise.all(
    testArray.map(number => {
        console.log(number)
        return twilioClient.messages
        .create({
           body: message,
           from: process.env.TWILIO_PHONE_NUMBER,
           to: `+1${number}`
         })
        .then(message => console.log(message.sid));
    })
    ).catch(err => console.log(err))

}

const sendFollowUpMessages = async (range) => {

    const auth = new google.auth.GoogleAuth({
        keyFile: "google-credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    })

    const client = await auth.getClient()
    const googleSheets = google.sheets({version: "v4", auth: client})
    const spreadsheetId = "1R6eVcbvLk6cjbcBsEJzEDrinbZzUcsn-k5xoL1EYOyE"

    const getNumberRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Availability!A:A"
    })

    const getThursdayRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: `Availability!${range}`
    })

    const scrubbedThursdayRows = await getThursdayRows.data.values.map(response => response[0])

    let indexes = [], i;
    for(i = 0; i < scrubbedThursdayRows.length; i++) {
        if(scrubbedThursdayRows[i] === undefined) {
            indexes.push(i + 1)
        }
    }

    const scrubbedNumbers = await getNumberRows.data.values.map(number => number[0]).filter((number, index) => number !== undefined && indexes.includes(index + 1))

    Promise.all(
        scrubbedNumbers.map(number => {
            console.log(number)
            return twilioClient.messages
            .create({
               body: 'Hey! I noticed you never responded about daybreak basketball.  If you are coming tomorrow, respond with your availibility for Tuesday first then Thursday which will look like some combo of "yes yes" or "no yes".',
               from: process.env.TWILIO_PHONE_NUMBER,
               to: `+1${number}`
             })
            .then(message => console.log(message.sid));
        })
        ).catch(err => console.log(err))

}

const sendResults = async (range) => {
    const auth = new google.auth.GoogleAuth({
        keyFile: "google-credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    })

    const client = await auth.getClient()
    const googleSheets = google.sheets({version: "v4", auth: client})
    const spreadsheetId = "1R6eVcbvLk6cjbcBsEJzEDrinbZzUcsn-k5xoL1EYOyE"

    const getNumberRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Availability!A:A"
    })

    const getTuesdayRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: `Availability!${range}`
    })

    const scrubbedTuesdayRows = await getTuesdayRows.data.values.map(response => response[0])

    let indexes = [], i;
    for(i = 0; i < scrubbedTuesdayRows.length; i++) {
        if(scrubbedTuesdayRows[i] === "Yes") {
            indexes.push(i + 1)
        }
    }

    const scrubbedNumbers = await getNumberRows.data.values.map(number => number[0]).filter((number, index) => number !== undefined && indexes.includes(index + 1))
    const attendingCount = indexes.length

    const arePlaying = attendingCount >= 10

    const isEnoughMessage = `Hey! It is on for tomorrow at 6AM.  We currently have ${attendingCount} committed.  So don't bail on us and feel free to shame anyone who does. Link to sheet -> https://docs.google.com/spreadsheets/d/1R6eVcbvLk6cjbcBsEJzEDrinbZzUcsn-k5xoL1EYOyE/`
    const isNotEnoughMessage = `Hey! Looks like we don't have enough, so we won't be playing tomorrow.  Only ${attendingCount} brave souls committed & you are one of them.  See you next time! Link to sheet -> https://docs.google.com/spreadsheets/d/1R6eVcbvLk6cjbcBsEJzEDrinbZzUcsn-k5xoL1EYOyE/`

    const message = arePlaying ? isEnoughMessage : isNotEnoughMessage

    Promise.all(
        scrubbedNumbers.map(number => {
            console.log(number)
            return twilioClient.messages
            .create({
               body: message,
               from: process.env.TWILIO_PHONE_NUMBER,
               to: `+1${number}`
             })
            .then(message => console.log(message.sid));
        })
        ).catch(err => console.log(err))
}



// Send out texts every monday at 9AM
cron.schedule('32 20 * * Sunday', () => {
    sendMondayMessages()
  }, {
      timezone: "America/Denver"
  });

// Send follow up texts for people who havent responded on Monday
  cron.schedule('0 10 * * Monday', () => {
    sendFollowUpMessages("C:C")
  }, {
      timezone: "America/Denver"
  });

// Send follow up texts for people who havent responded on Wednesday
  cron.schedule('0 10 * * Wednesday', () => {
    sendFollowUpMessages("D:D")
  }, {
      timezone: "America/Denver"
  });

// Send text confirming if we are playing with how many have confirmed on Monday night
  cron.schedule('30 20 * * Monday', () => {
    sendResults("C:C")
  }, {
      timezone: "America/Denver"
  });

// Send text confirming if we are playing with how many have confirmed on Wednesday night
  cron.schedule('30 21 * * Wednesday', () => {
    sendResults("D:D")
  }, {
      timezone: "America/Denver"
  });

  setInterval(function() {
    http.get("http://pickup-texter.herokuapp.com");
  }, 1000 * 60 * 20); // every 20 minutes


  app.post('/sms', async (req, res) => {

    const auth = new google.auth.GoogleAuth({
        keyFile: "google-credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    })

    const client = await auth.getClient()
    const googleSheets = google.sheets({version: "v4", auth: client})
    const spreadsheetId = "1R6eVcbvLk6cjbcBsEJzEDrinbZzUcsn-k5xoL1EYOyE"

    const reqBody = req.body.Body.toLowerCase()

    // Here to trigger results if they may have changed.  Format should be "trigger tuesday" or "trigger thursday"
    if (reqBody.includes("trigger")) {
        const bodyArray = reqBody.split(' ')
        if(bodyArray[1] === "tuesday") {
            sendResults("C:C")
        } else if(bodyArray[1] === 'thursday') {
            sendResults("D:D")
        } else {
            return
        }
    } else if (reqBody.includes("announce")) {
        const bodyArray = reqBody.split(' ')
        bodyArray.shift()
        bodyArray.join(' ')
        console.log(bodyArray)
        sendAnnouncementMessages(bodyArray)
    }
     else {
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Availability!A:A"
    })

    const findRowByPhoneNumber = async (rows, phoneNumber) => {
        return rows.data.values.map(number => `+1${number[0]}`).indexOf(phoneNumber) + 1
    }

    const writeValues = async (thisRange, newValues) => {
        await googleSheets.spreadsheets.values.update({
            auth,
            spreadsheetId,
            range: thisRange,
            valueInputOption: "USER_ENTERED",
            resource: {
                // needs to be values: [[firstRow, secondRow], [firstRow, secondRow]]
                values: newValues
            }
        })
    } 

    // Split text into an array
    const requestArray = req.body.Body.toLowerCase().split(' ')
    // Get the number it was sent from
    const number = req.body.From
    // Find the index of the row with the number the text was sent from
    const rowIndex = await findRowByPhoneNumber(getRows, number)
    // Make sure the responses are in the correct format = "Yes" or "No"
    const responseValues = requestArray.map(a => trueFalseMap[a])
    // select the correct range
    const currentUserRange = await `Availability!C:D${rowIndex}`
    writeValues(currentUserRange, [responseValues])

     const twiml = new MessagingResponse();

//   twiml.message('The Robots are coming! Head for the hills!');

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
     }
});

app.get('/', async (req, res) => {
    res.send("AWAKE")
})



  http.createServer(app).listen(port, () => {
    console.log(`Express server listening on port ${port}`);
  });
