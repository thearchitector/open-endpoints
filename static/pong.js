/**
 * PolyPong
 * (c) 2023 Elias Gabriel under MIT license
 *
 * There is one host and 3 clients. The host is the source of truth for the
 * balls's location, and disseminates the location of all paddles to all clients.
 * Each client is the source of truth for their own paddle.
 */

const {
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
} = kontra;
const { canvas, context } = init();

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

// game logic
const scene = Scene({
  id: "arena",
  objects: [...paddles, flash],
});
const loop = GameLoop({
  blur: true,
  update: (_) => {
    // update ball position
    ball.advance();

    // check for paddle collisions
    let collided = false;
    paddles.forEach((paddle, index) => {
      if (collides(paddle, ball)) {
        collided = true;
        if (index % 2 == 0) ball.dy = -ball.dy;
        else ball.dx = -ball.dx;
      }
    });

    // check of wall collisions
    if (
      !collided &&
      // top
      (ball.y < paddles[0].y + paddleB ||
        // right
        ball.x + ballSize > paddles[1].x ||
        // bottom
        ball.y + ballSize > paddles[2].y ||
        // left
        ball.x < paddles[3].x + paddleB)
    ) {
      // reset the ball and give it a random heading
      ball.x = (width - ballSize) / 2;
      ball.y = (height - ballSize) / 2;
      randomizeBallHeading();
    }

    // send the ball and other client data to all clients
    // clients is empty unless this is the host
    Object.entries(clients).forEach(([paddleKey, conn]) => {
      // get the paddle locations of every client except the one we're sending to
      // (we don't need to send a client's paddle location to itself)
      let others = Object.keys(clients)
        .filter((p) => p != paddleKey)
        .map((p) => {
          let paddle = paddles[p];
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
    });
  },
  render: () => scene.render(),
});

/* connection logic */

let peer;
let assignedPaddle = 0;
let takenPaddles = 1;
let clients = {};

function randomizeBallHeading() {
  let direction = degToRad(randInt(0, 365));
  ball.dx = ballSpeed * Math.sin(direction);
  ball.dy = ballSpeed * Math.cos(direction);
}

function sendPaddlePosition(conn, paddle, ordinate) {
  if (ordinate == "x") data = { x: paddle.x };
  else data = { y: paddle.y };
  conn.send(data);
}

function hostGame() {
  // create a webrtc peer with a human-readable UUID
  peer = new Peer(crypto.randomUUID().split("-")[0]);
  document.getElementById("menu").innerHTML =
    "<span>Game ID: <span id='clientID'>&lt;creating...&gt;</span></span>";

  // when the connection broker is connected
  peer.on("open", (id) => {
    document.getElementById("clientID").textContent = id;
    paddles[assignedPaddle].color = paddleColorSelf;
    loop.render();
  });

  // whenever another client connects to this game
  peer.on("connection", (conn) => {
    // if there are no paddles available, disconnect them (with no error message!)
    // also send a message to all the other clients that the game has begun
    console.log("connected to", conn.peer);
    if (takenPaddles >= 4) {
      conn.close();
      return;
    }

    // keep track of the connection and assign the client a paddle
    // if they are the last paddle, indicate the game has started
    let paddleKey = takenPaddles;
    clients[paddleKey] = conn;
    conn.on("data", (data) => updateServer(paddleKey, data));
    takenPaddles += 1;
  });

  // setup controls
  initInput();
  onInput("arrowleft", (_) => (paddles[0].x -= paddleSpeed));
  onInput("arrowright", (_) => (paddles[0].x += paddleSpeed));
}

function joinGame() {
  let gameID = document.getElementById("gameID").value;

  if (gameID.length != 8) {
    alert("Invalid game id");
    return;
  }

  document.getElementById("menu").innerHTML =
    "<span>Status: <span id='clientID'>&lt;connecting...&gt;</span></span>";

  // establish a connection to the host
  // if a connection is established, setup the data listener
  peer = new Peer();
  peer.on("open", () => {
    document.getElementById("clientID").innerHTML =
      "&lt;waiting for assignment...&gt;";

    let conn = peer.connect(gameID);
    conn.on("open", () => {
      console.log("connected to server");
      conn.on("data", (data) => updateClient(conn, data));
      conn.send({ ready: true });
    });
  });
}

function updateClient(conn, data) {
  // initial startup
  if ("paddleAssignment" in data) {
    assignedPaddle = data["paddleAssignment"];
    let paddle = paddles[assignedPaddle];
    paddle.color = paddleColorSelf;

    // setup controls
    initInput();

    if (assignedPaddle % 2 == 0) {
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
    loop.render();
  }

  if ("start" in data && data["start"]) {
    scene.remove(flash);
    scene.add(ball);
    loop.start();
  }

  if ("flash" in data) {
    flash.text = data["flash"];
    loop.context.clearRect(0, 0, width, height);
    loop.render();
  }

  // update the ball's location
  if ("bx" in data && "by" in data) {
    ball.x = data["bx"];
    ball.y = data["by"];
  }

  // update the location of the other paddles
  if ("others" in data) {
    data["others"].forEach((pd) => {
      let paddle = paddles[pd["assignedPaddle"]];
      paddle.x = pd["x"];
      paddle.y = pd["y"];
    });
  }
}

function updateServer(paddleKey, data) {
  // assign the client a paddle
  if ("ready" in data && data["ready"]) {
    clients[paddleKey].send({
      paddleAssignment: paddleKey,
    });

    // if this is the last client, start the game
    if (paddleKey == 3) {
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
    let clientPaddle = paddles[paddleKey];
    if ("x" in data) clientPaddle.x = data["x"];
    else clientPaddle.y = data["y"];
  }
}
