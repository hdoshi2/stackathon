const router = require('express').Router()
const {Item, Transaction} = require('../db/models')
var plaid = require('plaid')

module.exports = router

var ACCESS_TOKEN = null
var PUBLIC_TOKEN = null

var client = new plaid.Client(
  process.env.PLAID_CLIENT_ID,
  process.env.PLAID_SECRET,
  process.env.PLAID_PUBLIC_KEY,
  plaid.environments.sandbox
)

// Accept the public_token sent from Link
router.post('/get_access_token', function(request, response, next) {
  try {
    PUBLIC_TOKEN = request.body.public_token

    client.exchangePublicToken(PUBLIC_TOKEN, async function(
      error,
      tokenResponse
    ) {
      if (error !== null) {
        console.log('Could not exchange public_token!' + '\n' + error)
        return request.json(error)
      }
      ACCESS_TOKEN = tokenResponse.access_token
      const ITEM_ID = tokenResponse.item_id

      console.log('Access Token: ' + ACCESS_TOKEN)
      console.log('Item ID: ' + ITEM_ID)
      console.log('response.body---------', tokenResponse)

      // response.json({error: false})

      const objectToSend = await Item.create({
        item_id: ITEM_ID,
        access_token: ACCESS_TOKEN,
        userId: request.user.id,
        lastRequested: new Date().toJSON()
      })

      client.getTransactions(
        ACCESS_TOKEN,
        '2019-01-01',
        '2019-06-01',
        {
          count: 50,
          offset: 0
        },
        (err, result) => {
          // Handle err
          if (err !== null) {
            console.log('Could not exchange public_token!' + '\n' + error)
            return request.json(error)
          }
          const transcations = result.transactions

          const addToItems = transcations.map(async transaction => {
            console.log('address', transaction && transaction.location)

            await Transaction.create({
              account_id: transaction.account_id,
              name: transaction.name,
              amount: transaction.amount,
              category1: transaction.category[0],
              category2: transaction.category[1],
              date: transaction.date,
              address: transaction.location.address,
              city: transaction.location.city,
              region: transaction.location.region,
              postal_code: transaction.location.postal_code,
              country: transaction.location.country,
              lat: transaction.location.lat,
              lon: transaction.location.long
            })
          })
        }
      )
    })
  } catch (err) {
    next(err)
  }
})

// router.get('/auth', function(request, response, next) {
//   client.getAuth(ACCESS_TOKEN, function(error, authResponse) {
//     if (error != null) {
//       prettyPrintResponse(error)
//       return response.json({
//         error: error
//       })
//     }
//     prettyPrintResponse(authResponse)
//     response.json({error: null, auth: authResponse})
//   })
// })
