// front end
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const devicePixelRatio = window.devicePixelRatio || 1;
canvas.width = innerWidth * devicePixelRatio;
canvas.height = innerHeight * devicePixelRatio;

// we get this from the script tag in the html
var socket = io();

window.requestAnimationFrame(gameloop);

const keys={}
const namesize=50
const playerradius=10*window.devicePixelRatio
const fontsize=namesize/2 + "px roman"

class player {

    x=0;
    y=0;
    color=""
    // speed=5
    name=""
    keys={
        w: false,
        a: false,
        s: false,
        d: false,
    }

    constructor ({x, y, color="red", name="john"}) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.name = name;
    }


    draw () {

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, playerradius, 0, 2*Math.PI)
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.arc(this.x, this.y, playerradius, 0, 2*Math.PI)
        ctx.stroke();
        ctx.closePath();

        ctx.fillStyle = "black"
        ctx.font = fontsize
        ctx.fillText(this.name,this.x-namesize/2, this.y-playerradius-5, namesize)

    }
}

const frontEndPlayers = {}

socket.on('updatePlayers', (backEndPlayers) => {

    for (const id in backEndPlayers) {

        const backendPlayer = backEndPlayers[id]
        
        if (!frontEndPlayers[id]) { // if doesn't exist in frontend
            // create if doesn't exist
            frontEndPlayers[id] = new player({x: backendPlayer.x, y: backendPlayer.y, color: backendPlayer.color});
        
        } else { // if exists
            
            // if local player
            if (id === socket.id) {

                frontEndPlayers[id].x = backendPlayer.x;
                frontEndPlayers[id].y = backendPlayer.y;

                // apply missing packets, O(n^2) because we do it over again for every packet missed. that will updatePlayers
                const lastBackendInputIndex = playerInputs.findIndex((input) => {
                    return backendPlayer.sequenceNumber === input.sequenceNumber
                })

                // get the last backend response index
                if (lastBackendInputIndex > -1)
                    playerInputs.splice(0, lastBackendInputIndex+1)

                // for each packet that has yet to arrive, apply it manually
                playerInputs.forEach((input) => {
                    frontEndPlayers[id].x += input.dx
                    frontEndPlayers[id].y += input.dy
                })

            } else {
                // frontEndPlayers[id].x = backendPlayer.x;
                // frontEndPlayers[id].y = backendPlayer.y;

                // duration is the server's tick rate
                gsap.to(frontEndPlayers[id], {
                    x: backendPlayer.x,
                    y: backendPlayer.y,
                    duration: 0.015,
                    ease: 'linear'
                })
            }
        }
    }

    // does front end player exist that is not in the back end
    for (const id in frontEndPlayers) {
        if (!backEndPlayers[id]) {
            delete frontEndPlayers[id]
        }
    }
    // console.log(players)
})

window.addEventListener("keydown", (key) => {

    if (!frontEndPlayers[socket.id]) return;

    switch(key.code) {
        case 'KeyD': keys.d=true; break;
        case 'KeyA': keys.a=true; break;
        case 'KeyS': keys.s=true; break;
        case 'KeyW': keys.w=true; break;
    }
});

window.addEventListener("keyup", (key) => {

    if (!frontEndPlayers[socket.id]) return;

    switch(key.code) {
        case 'KeyD': keys.d=false; break;
        case 'KeyA': keys.a=false; break;
        case 'KeyS': keys.s=false; break;
        case 'KeyW': keys.w=false; break;
    }
});

function gameloop () {

    ctx.fillStyle="white"
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="black"
    ctx.beginPath()
    ctx.rect(1,1,canvas.width-2,canvas.height-2);
    ctx.stroke();

    for (const id in frontEndPlayers) {
        const player = frontEndPlayers[id]
        player.draw()
    }

    window.requestAnimationFrame(gameloop);
}

let sequenceNumber = 0
const playerInputs = []

setInterval(() => {

    if (keys.d) { sequenceNumber++; playerInputs.push({ sequenceNumber, dx: 5,  dy: 0 }); frontEndPlayers[socket.id].x += 5; socket.emit('keydown', { keycode: 'KeyD', sequenceNumber }); }
    if (keys.a) { sequenceNumber++; playerInputs.push({ sequenceNumber, dx: -5, dy: 0 }); frontEndPlayers[socket.id].x -= 5; socket.emit('keydown', { keycode: 'KeyA', sequenceNumber }); }
    if (keys.s) { sequenceNumber++; playerInputs.push({ sequenceNumber, dx: 0,  dy: 5 }); frontEndPlayers[socket.id].y += 5; socket.emit('keydown', { keycode: 'KeyS', sequenceNumber }); }
    if (keys.w) { sequenceNumber++; playerInputs.push({ sequenceNumber, dx: 0,  dy:-5 }); frontEndPlayers[socket.id].y -= 5; socket.emit('keydown', { keycode: 'KeyW', sequenceNumber }); }

}, 15)