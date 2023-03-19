/**
 * @license
 * PolyPong
 * (c) 2023 Elias Gabriel under MIT license
 */
import {
  init,
  Scene,
  Sprite,
  GameLoop,
  collides,
  randInt,
  degToRad,
  initInput,
  onInput,
  Text,
} from "kontra";
import { Peer } from "peerjs";

/**
 * constants
 */

// webrtc config
const peerConfig = {
  secure: true,
};
const connectionConfig = {
  // safari doesn't support binary over webrtc
  serialization: "json",
};

// board dimensions
const width = 1024;
const height = 576;

// ball props
const ballSize = 15;
const ballSpeed = 3;

// paddle props
const paddleOffset = 45;
const paddleA = 125;
const paddleB = 20;
const paddleColor = "white";
const paddleColorSelf = "green";
const paddleSpeed = ballSpeed * 2;

// game objects
const flash = Text({
  text: "Waiting for 3 players...",
  font: "28px monospace",
  color: "white",
  x: width / 2,
  y: height / 2,
  anchor: { x: 0.5, y: 0.5 },
  textAlign: "center",
});
const ball = Sprite({
  x: (width - ballSize) / 2,
  y: (height - ballSize) / 2,
  width: ballSize,
  height: ballSize,
  color: paddleColor,
});
const paddles = [
  // top
  Sprite({
    x: (width - paddleA) / 2,
    y: paddleOffset,
    width: paddleA,
    height: paddleB,
    color: paddleColor,
  }),
  // right
  Sprite({
    x: width - (paddleOffset + paddleB),
    y: (height - paddleA) / 2,
    width: paddleB,
    height: paddleA,
    color: paddleColor,
  }),
  // bottom
  Sprite({
    x: (width - paddleA) / 2,
    y: height - (paddleOffset + paddleB),
    width: paddleA,
    height: paddleB,
    color: paddleColor,
  }),
  // left
  Sprite({
    x: paddleOffset,
    y: (height - paddleA) / 2,
    width: paddleB,
    height: paddleA,
    color: paddleColor,
  }),
];

const scene = Scene({
  id: "arena",
  objects: [...paddles, flash],
});

/**
 * game logic
 *
 * - There is one host and 3 clients. The clients connect to the host, not each other.
 * - The host is the source of truth for the ball's location and the scores.
 * - Each client is the source of truth for their own paddle.
 * - The host disseminates the location of all paddles to all other clients.
 * - The host determines if a client's paddle hits the ball.
 */

let peer;
const clients = {};
let assignedPaddle = 0;
const paddlesKeys = [0, 1, 2, 3];
let takenPaddles = 1;
let lastPaddle = -1;

const loop = GameLoop({
  blur: true,
  update: (_) => {
    // game logic happens only on the host
    if (assignedPaddle === 0) {
      // update ball position
      ball.advance();

      // check for paddle collisions
      for (let index = 0; index < takenPaddles; index++) {
        if (collides(paddles[index], ball)) {
          if (index % 2 === 0) ball.dy = -ball.dy;
          else ball.dx = -ball.dx;
          lastPaddle = index;
          break;
        }
      }

      // check of wall collisions and award points (if earned)
      // to avoid complications with the AABB collision check, the ball
      // must be behind the paddle to count as a wall hit
      if (
        // top
        ball.y < paddles[0].y ||
        // right
        ball.x + ballSize > paddles[1].x + paddleB ||
        // bottom
        ball.y + ballSize > paddles[2].y + paddleB ||
        // left
        ball.x < paddles[3].x
      ) {
        // give a point to the client last responsible for hitting the ball
        // and send that point to all clients
        if (lastPaddle !== -1) {
          awardPoint(lastPaddle);
          Object.values(clients).forEach((conn) =>
            conn.send({ pointTo: lastPaddle })
          );
        }

        // reset the ball and give it a random heading
        ball.x = (width - ballSize) / 2;
        ball.y = (height - ballSize) / 2;
        randomizeBallHeading();
      }

      // send the ball and other client data to all clients
      for (let paddleKey = 1; paddleKey < takenPaddles; paddleKey++) {
        const conn = clients[paddleKey];
        // get the paddle locations of every client except the one we're sending to
        // (we don't need to send a client's paddle location to itself)
        const others = paddlesKeys
          .filter((p) => p != paddleKey)
          .map((p) => {
            const paddle = paddles[p];
            return {
              assignedPaddle: p,
              x: paddle.x,
              y: paddle.y,
            };
          });
        // also append this (the server host's) paddle
        others.push({
          assignedPaddle: 0,
          x: paddles[0].x,
          y: paddles[0].y,
        });

        conn.send({ bx: ball.x, by: ball.y, others: others });
      }
    }
  },
  render: () => scene.render(),
});

function awardPoint(scoringPaddle) {
  let scoreID = "canada";
  if (scoringPaddle === 1) scoreID = "nyc";
  else if (scoringPaddle === 2) scoreID = "austin";
  else if (scoringPaddle === 3) scoreID = "sanfran";
  document.getElementById(scoreID).innerText -= -1; // wtf
}

function randomizeBallHeading() {
  const direction = degToRad(randInt(0, 365));
  ball.dx = ballSpeed * Math.sin(direction);
  ball.dy = ballSpeed * Math.cos(direction);
  lastPaddle = -1;
}

function sendPaddlePosition(conn, paddle, ordinate) {
  const data = {};
  if (ordinate === "x") data["x"] = paddle.x;
  else data["y"] = paddle.y;
  conn.send(data);
}

function updateClient(conn, data) {
  // initialization
  if ("paddleAssignment" in data) {
    assignedPaddle = data["paddleAssignment"];
    const paddle = paddles[assignedPaddle];
    paddle.color = paddleColorSelf;

    // setup controls
    initInput();

    if (assignedPaddle % 2 === 0) {
      onInput("arrowleft", (_) => {
        paddle.x -= paddleSpeed;
        sendPaddlePosition(conn, paddle, "x");
      });
      onInput("arrowright", (_) => {
        paddle.x += paddleSpeed;
        sendPaddlePosition(conn, paddle, "x");
      });
    } else {
      onInput("arrowdown", (_) => {
        paddle.y += paddleSpeed;
        sendPaddlePosition(conn, paddle, "y");
      });
      onInput("arrowup", (_) => {
        paddle.y -= paddleSpeed;
        sendPaddlePosition(conn, paddle, "y");
      });
    }

    document.getElementById("clientID").innerHTML = "Connected! ✔";
    document.getElementById("menu").className = "menu";
    document.getElementById("scores").className = "";
    loop.render();
  }
  if ("flash" in data) {
    flash.text = data["flash"];
    loop.context.clearRect(0, 0, width, height);
    loop.render();
  }

  // game start
  if ("start" in data && data["start"]) {
    scene.remove(flash);
    scene.add(ball);
    loop.start();
  }

  // update the ball's location
  if ("bx" in data && "by" in data) {
    ball.x = data["bx"];
    ball.y = data["by"];
  }

  // update the location of the other paddles
  if ("others" in data) {
    data["others"].forEach((pd) => {
      const paddle = paddles[pd["assignedPaddle"]];
      paddle.x = pd["x"];
      paddle.y = pd["y"];
    });
  }

  // someone earned a point
  if ("pointTo" in data) awardPoint(data["pointTo"]);
}

function updateServer(paddleKey, data) {
  // assign the client a paddle
  if ("ready" in data && data["ready"]) {
    clients[paddleKey].send({
      paddleAssignment: paddleKey,
    });

    // if this is the last client, start the game
    if (paddleKey === 3) {
      Object.values(clients).forEach((conn) => conn.send({ start: true }));

      // give the ball a random heading
      randomizeBallHeading();
      scene.add(ball);

      scene.remove(flash);
      loop.start();
    } else {
      flash.text = `Waiting for ${3 - paddleKey} player(s)...`;
      Object.values(clients).forEach((conn) =>
        conn.send({ flash: flash.text })
      );
      loop.context.clearRect(0, 0, width, height);
      loop.render();
    }
  } else if ("x" in data || "y" in data) {
    // locally update the client paddle position
    const clientPaddle = paddles[paddleKey];
    if ("x" in data) clientPaddle.x = data["x"];
    else clientPaddle.y = data["y"];
  }
}

/**
 * initialization
 */

document.getElementById("hostGame").addEventListener("click", () => {
  // create a webrtc peer with a human-readable UUID
  peer = new Peer(crypto.randomUUID().split("-")[0], peerConfig);
  const menu = document.getElementById("menu");

  menu.innerHTML =
    "<span>Game ID: <span id='clientID'>&lt;creating...&gt;</span></span>";

  // when the connection broker is connected
  peer.on("open", (id) => {
    document.getElementById("clientID").textContent = id;
    paddles[assignedPaddle].color = paddleColorSelf;
    menu.className = "menu";
    document.getElementById("scores").className = "";
    loop.render();
  });

  // whenever another client connects to this game
  peer.on("connection", (conn) => {
    // if there are no paddles available, disconnect them (with no error message!)
    // also send a message to all the other clients that the game has begun
    console.log("connected to", conn.peer);
    if (takenPaddles >= 4) {
      console.log("too many players, evicting", conn.peer);
      conn.close();
      return;
    }

    // keep track of the connection and assign the client a paddle
    // if they are the last paddle, indicate the game has started
    const paddleKey = takenPaddles;
    clients[paddleKey] = conn;
    conn.on("data", (data) => updateServer(paddleKey, data));
    takenPaddles += 1;
  });

  // setup controls
  initInput();
  onInput("arrowleft", (_) => (paddles[0].x -= paddleSpeed));
  onInput("arrowright", (_) => (paddles[0].x += paddleSpeed));
});

document.getElementById("joinGame").addEventListener("click", () => {
  const gameID = document.getElementById("gameID").value;

  if (gameID.length != 8) {
    alert("Invalid game id");
    return;
  }

  document.getElementById("menu").innerHTML =
    "<span>Status: <span id='clientID'>&lt;connecting...&gt;</span></span>";

  // establish a connection to the host
  // if a connection is established, setup the data listener
  peer = new Peer(peerConfig);
  peer.on("open", () => {
    document.getElementById("clientID").innerHTML =
      "&lt;waiting for assignment...&gt;";

    const conn = peer.connect(gameID, connectionConfig);
    conn.on("open", () => {
      console.log("connected to server");
      conn.on("data", (data) => updateClient(conn, data));
      conn.send({ ready: true });
    });
  });
});

init();
