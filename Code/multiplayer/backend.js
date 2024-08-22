// back end
const express = require('express')
const app = express()

const http = require('http')
// combine express with the http server
const server = http.createServer(app)
// get Server class
const { Server } = require('socket.io')
// socket.io(http(express))
// if 3 pings don't pass, call timeout
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const port = 3000

// make any of files in '/public' to be public
app.use(express.static('public'))

app.get('/', (req, res) => {
    console.log(__dirname);
    res.sendFile(__dirname + '/public/index.html')
})

// an object is better than an array
const backEndPlayers = {}
// const canvas = document.getElementById('canvas')
const speed=5

io.on('connection', (socket) => {
    console.log('a user connected');
    // name is socket.id
    backEndPlayers[socket.id]={
        x:20 * Math.random() + 500,
        y:20 * Math.random() + 500,
        color: `hsl(${360*Math.random()}, 100%, 50%)`,
        sequenceNumber: 0
    }

    // create player
    io.emit('updatePlayers', backEndPlayers)

    // socket.emit is for a single player
    // io.emit is for a broadcast

    // console.log(players)

    socket.on('keydown', ({keycode: keycode, sequenceNumber: sequenceNumber}) => {

        backEndPlayers[socket.id].sequenceNumber = sequenceNumber
        switch(keycode) {
            case 'KeyD': backEndPlayers[socket.id].x += speed; break;
            case 'KeyA': backEndPlayers[socket.id].x -= speed; break;
            case 'KeyS': backEndPlayers[socket.id].y += speed; break;
            case 'KeyW': backEndPlayers[socket.id].y -= speed; break;
        }
    })

    // called automatically on timeouts
    socket.on('disconnect', (reason) => {
        console.log(reason)
        delete backEndPlayers[socket.id]
        io.emit('updatePlayers', backEndPlayers)
    })
})

// update players
setInterval(()=> {io.emit('updatePlayers',backEndPlayers)}, 100)

server.listen(port, () => {
    console.log(`listening on port ${port}`)
})