const ip = require("ip")
const puppeteer = require('puppeteer')
const select = require('puppeteer-select')
var internetAvailable = require("internet-available")

const bodyParser = require("body-parser")
const express = require("express")
const app = express()

// global variables/config
const port = 3000
const thisApiUrl = `http://${ip.address()}:${port}`

// middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

////////
async function checkStatus() {
    console.log('checking hotspot connection now')
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    })
    const page = await browser.newPage()
    await page.goto("http://192.168.128.1", {
        waitUntil: 'networkidle2'
    })
    const status = await page.evaluate(() => document.querySelector('.block-connect_button').innerText)
    browser.close()
    return status === "Disconnect" ? "connected" : "disconnected"
}

async function disconnect() {
    console.log('disconnecting hotspot connection now')
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    })
    const page = await browser.newPage()
    await page.goto("http://192.168.128.1", {
        waitUntil: 'networkidle2'
    })
    // document.querySelector('.block-connect_button').innerText
    const toggleOff = await select(page).getElement('button:contains(Disconnect)');
    await toggleOff.click()
    browser.close()
}

async function connect() {
    console.log('connecting hotspot connection now')
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    })
    const page = await browser.newPage()
    await page.goto("http://192.168.128.1", {
        waitUntil: 'networkidle2'
    })
    const toggleOn = await select(page).getElement('button:contains(Connect)')
    await toggleOn.click()
    browser.close()
}

async function checkInternet() {
    return internetAvailable({
        timeout: 5000,
        retries: 5
    }).then(() => {
        console.log("Internet available")
        return true
    }).catch(() => {
        console.log("No internet")
        return false
    })
}

async function run() {
    setTimeout(async () => {
        console.log('checking hotspot connection every 15 minutes')
        setInterval(async function () {
            console.log('checking internet...')
            let online = await checkInternet()
            if (!online) {
                let status = await checkStatus()
                if (status === 'disconnected') {
                    await connect()
                }
                if (status === 'connected' && online === false) {
                    await disconnect()
                    setTimeout(() => {
                        connect()
                    }, 15000)
                }
                console.log(status)
            }
        }, 900 * 1000) // 900 * 1000 milsec = 15min
    }, 10000)
}

// routes
app.listen(port, async function () {
    console.log("Api running")
    console.log("   ", thisApiUrl)
    run()
    // console.log(await checkInternet())
})


app.get("/", async (req, res) => {
    let status = await checkStatus()
    let online = await checkInternet()
    res.status(200).send({
        hotspot: online === true ? 'connected' : status,
        online
    })
})
