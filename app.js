'use strict'
const express = require("express")
const bodyParser = require("body-parser")
const PORT = process.env.PORT || 3000
const _ = require("lodash")
const mongoose = require("mongoose")
// mod.cjs
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express()

const subscriptions = ["MARVEL COMICS", "DC COMICS", "IMAGE COMICS"]

let data = []
let eventData = {}
let publish = false

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static("public"))

mongoose.connect("mongodb+srv://admin-pratik:test123@cluster0.dzvmk.mongodb.net/subscriberDB",{useNewUrlParser: true});

const subscriberSchema = new mongoose.Schema(
    {
        id:{
            type: Number,
            required: true
        },
        content:{
            type: Object,
            required: false
        },
        subscriptions:{
            type: Array,
            require: false
        }
    }
)

const Subscriber = mongoose.model("Subscriber", subscriberSchema)

app.get("/", (req, res) => {
    res.send("Welcome")
})

app.post("/generateClient", (req, res) => {
    const clientId = Math.floor(Math.random()*10)
    const client = new Subscriber({
        id: clientId
    })

    client.save(client)
    res.send("Client generated and saved")
})

app.post("/subscribe/:clientId/:subscriptionId", (req, res)=>{
    const subscription = req.params.subscriptionId-1<=subscriptions.length? subscriptions[req.params.subscriptionId-1]: null
    const clientId = Number(req.params.clientId)

    let r = subscribe(clientId, subscription)
    if(r){
      res.send("Subscribed successfully")
    }else{
      res.send("Subscription failed")
  }
})

app.post("/unsubscribe/:clientId/:subscriptionId", (req, res)=>{
  const subscription = req.params.subscriptionId-1<=subscriptions.length? subscriptions[req.params.subscriptionId]: null

  const clientId = Number(req.params.clientId)

  let r = unsubscribe(clientId, subscription)
  if(r){
    res.send("Unubscribed successfully")
  }else{
    res.send("Unsubscription failed")
  }
})

function subscribe(clientId, subscription){
  const filter = {id: clientId}
  const update = {$push:{subscriptions: subscription}}

  if(subscription!=null){
      updateClient(filter, update)
      return true
  }else{
      return false
  }
}

function unsubscribe(clientId, subscription){
  const filter = {id: clientId}
  const update = {$pull:{subscriptions: subscription}}

  if(subscription){
    updateClient(filter, update)
    res.send("Unsubscribed Successfully")
  }else{
    res.send("Unsubscription failed")
  }
}

async function updateClient(filter, update){
  console.log("called update")
  await Subscriber.findOneAndUpdate(filter, update)
 }

app.get("/initPublisher", (req, res)=>{
    res.send('Publisher Initialized')
    publisher()
    console.log("Publisher Initializd")
})

function publisher(){
  //runs once every day
  setInterval(()=>{
    fetchData();
  }, 5000)
}

function filter() {
    console.log("filtering the data")
    subscriptions.forEach((e) => {
      let fData = []
        data.comics.map((i) => {
          if(i.publisher == e){
            fData.push(i.title)
          }
        })
        if(eventData[e] != fData){
          eventData[e]= fData
          publish = true
        }
    })
    console.log(eventData)
  }

async function fetchData() {
    console.log("fetching ...")
    let res = await fetch('https://api.shortboxed.com/comics/v1/new')
    data = await res.json()
    // console.log(data)
    filter();
  }

async function notify(){
  console.log("----Notifying----")
  let allClients= await Subscriber.find({})
  console.log("All clients: ", allClients)
  allClients.forEach((client)  => {
    if(eventData!=null){
      console.log("Data found")
      client.subscriptions.forEach((sub) => {
        console.log("First event: ", sub)
        if(eventData.hasOwnProperty(sub)){
          console.log(eventData[sub])
          const filter = {id: client.id}
          const update = {$set:{[`content.${sub}`]: eventData[sub]}} 
          updateClient(filter, update)
        }
      })
    }
  })
  publish = !publish
}

setInterval(() => {
  console.log("Checking publish")
  if(publish){
    console.log("Updating subscriber record")
    notify()
  }
},2500)

app.listen(PORT, function() {
    console.log("Server started on port 3000");
  });
  