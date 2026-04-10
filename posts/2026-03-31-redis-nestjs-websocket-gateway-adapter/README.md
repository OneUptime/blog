# How to Build NestJS WebSocket Gateway with Redis Adapter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, NestJS, WebSocket, Gateway, Socket.IO

Description: Scale NestJS WebSocket gateways across multiple instances using the Socket.io Redis adapter so events reach all connected clients regardless of server.

---

A NestJS WebSocket gateway using Socket.io sends events only to clients connected to the same instance. Adding the Redis adapter routes events through Redis Pub/Sub so all instances can reach all clients.

## Install Dependencies

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io @socket.io/redis-adapter redis
```

## Configure the Redis Adapter

`main.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const adapter = new RedisIoAdapter(app);
  await adapter.connectToRedis();
  app.useWebSocketAdapter(adapter);
  await app.listen(3000);
}
bootstrap();
```

## Create the WebSocket Gateway

```typescript
// chat/chat.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: { origin: "*" } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join-room")
  handleJoinRoom(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    client.join(room);
    client.to(room).emit("user-joined", { userId: client.id });
  }

  @SubscribeMessage("send-message")
  handleMessage(
    @MessageBody() payload: { room: string; message: string },
    @ConnectedSocket() client: Socket
  ) {
    // Broadcast to ALL instances via Redis adapter
    this.server.to(payload.room).emit("new-message", {
      from: client.id,
      message: payload.message,
      timestamp: Date.now(),
    });
  }
}
```

## Emit from a REST Controller

```typescript
@Controller("notifications")
export class NotificationsController {

  constructor(private readonly chatGateway: ChatGateway) {}

  @Post("broadcast")
  broadcast(@Body() body: { room: string; message: string }) {
    this.chatGateway.server.to(body.room).emit("notification", body.message);
    return { sent: true };
  }
}
```

With the Redis adapter, this emit reaches clients on all server instances.

## Verify Redis Pub/Sub Channels

```bash
redis-cli pubsub channels "socket.io*"
```

## Summary

NestJS WebSocket gateways scale horizontally by swapping the default IoAdapter for a `RedisIoAdapter` that routes Socket.io events through Redis Pub/Sub. The gateway code remains unchanged - only the adapter configuration differs. This enables REST endpoints and gateway events to reach clients connected to any instance in the cluster. Note that sticky sessions are still required for Socket.io's default HTTP long-polling transport; you can avoid them only by forcing WebSocket-only connections on the client (`transports: ['websocket']`).
