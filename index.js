const WebSocket = require('ws');
const {checkToken} = require('./authControl.js');
const UserControllers = require('./controllers/user.controllers.js');
const {deviceControllers} = require('./controllers/device.controllers.js');
const {mqttServer, emitter} = require('./mqtt.js')
const port = 8080;
const wsServer = new WebSocket.Server({port: port});

const WSClients = {}
wsServer.on('connection', onConnect);

function onConnect(wsClient) {
    console.log("New client");

    wsClient.on('message', async function(rawMessage) {
        const message = JSON.parse(rawMessage)
        const result = await answer(wsClient, message)
        if (result) {
            if (result.id) {
                wsClient.id = result.id
                console.log('ID: ', wsClient.id)
                if (WSClients[user.id]) {
                    WSClients[result.id].push(this)
                } else {
                    WSClients[result.id] = [this]
                }
            }

            wsClient.send(JSON.stringify(result.data))
        }
    })

    wsClient.on('close', function(ws) {
        console.log(ws)
        console.log(this.id)
        // console.log(wsClient.id)
        console.log('Пользователь отключился');
        if (wsClient.id) {
            i = WSClients[this.id].indexOf(this);
            if(i >= 0) {
                WSClients[this.id].splice(i,1);
            }
            console.log('array cleaned')
        }
    })
}


async function answer(ws, message) {
    const {token, type} = message
    user = await checkToken(token)
    let data
    let id
    if (!user && type != "SIGN IN" && type != "REGISTRATION") {
        data = {error: "Token invalid"}
    } else {
        switch (type) {
            case "CONNECTED":
                id = user.id
                data = await deviceControllers.getStatus(user.id)
                break

            case "SIGN IN":
                data = await UserControllers.getUser(message.login, message.password)
                break

            case "REGISTRATION":
                data = await UserControllers.createUser(message.login, message.password, message.email, message.phone_number)
                break

            case "GET STATUS":
                data = await deviceControllers.getStatus(user.id)
                break

            case "ADD STATION":
                data = await deviceControllers.addStation(user.id, message.key)
                break

            case "SET BRIGHTNESS":
                data = await deviceControllers.setBrightness(user.id, message.brightness)
                break

            default:
                data = {error: "Bad request"}
                break
        }
        return {id, data}
    }
}

emitter.eventBus.on('Updated status', 
    async function (id){
        try {
            if (WSClients[user.id]) {
            const data = JSON.stringify(await deviceControllers.getStatus(id))
            WSClients[id].forEach((ws) => {
                ws.send(data)
            })
            }
        } catch (e) {
            console.log(e)
        }
    }
)

wsServer.on('listening', () => {console.log(`Сервер запущен на ${port} порту`)});
mqttServer.runMQTT()