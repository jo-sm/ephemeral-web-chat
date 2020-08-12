import * as express from "express";
import * as WebSocket from "ws";
import * as http from "http";
import * as url from "url";
import { Socket } from "net";

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

const rooms = new Map<string, Set<WebSocket>>();

wss.on("connection", function (ws, request) {
  const roomId = getRoomIdFromRequest(request);

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  const conns: Set<WebSocket> = rooms.get(roomId);

  conns.add(ws);

  ws.on("message", (data) => {
    // We don't do anything with the data, just broadcast to others in the room
    broadcastExceptSelf(roomId, ws, data);
  });

  ws.on("close", () => onLeave(ws, roomId));
  ws.on("terminate", () => onLeave(ws, roomId));
});

server.on("upgrade", function upgrade(
  request: http.IncomingMessage,
  socket: Socket,
  head: Buffer
) {
  const roomId = getRoomIdFromRequest(request);

  if (!roomId) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit("connection", ws, request);
  });
});

server.listen(9000, () => {
  console.log("Listening on 0.0.0.0:9000");
});

/**
 * Returns the room ID from a request, if the room ID is valid. Returns null otherwise.
 *
 * A valid URL structure is like `/ws/room/<roomId>`, where `roomId` is base64 encoded data
 * (in the case of the client application, an ArrayBuffer).
 * @param request
 */
function getRoomIdFromRequest(request: http.IncomingMessage): string | null {
  const { pathname } = url.parse(request.url);
  const splitPath = pathname.split("/").slice(1); // Ignore the first slash

  if (splitPath.length !== 3) {
    return null;
  }

  // A valid path is like /ws/room/<id>
  const [init, prefix, roomId] = splitPath;

  if (init !== "ws") {
    return null;
  }

  if (prefix !== "room") {
    return null;
  }

  return roomId;
}

/**
 * Broadcast arbitrary data to all connections in a given room except to the one who sent the data
 * @param roomId Room ID in URL
 * @param ws "self" WebSocket connection
 * @param data
 */
function broadcastExceptSelf(
  roomId: string,
  ws: WebSocket,
  data: WebSocket.Data
) {
  const conns: Set<WebSocket> = rooms.get(roomId);

  conns.forEach((conn) => {
    if (conn === ws) {
      return;
    }

    conn.send(data);
  });
}

/**
 * Handles when a connection closes or terminates
 * @param ws
 * @param roomId
 */
function onLeave(ws: WebSocket, roomId: string) {
  const conns: Set<WebSocket> = rooms.get(roomId);

  conns.delete(ws);

  if (conns.size === 0) {
    // If this person was the last in the room, delete it
    rooms.delete(roomId);
  }
}
