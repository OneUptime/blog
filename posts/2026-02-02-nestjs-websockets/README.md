# How to Implement WebSockets in NestJS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, NestJS, WebSockets, Real-time, Socket.io

Description: Learn how to implement WebSockets in NestJS using gateways, including event handling, rooms, authentication, and scaling considerations.

---

NestJS makes building WebSocket applications straightforward with its gateway-based architecture. If you're coming from Express with Socket.io, you'll find that NestJS provides a clean, decorator-driven approach that fits naturally into its dependency injection system. This guide walks through implementing WebSockets from basic setup to production-ready patterns.

## Installing Dependencies

NestJS supports both Socket.io and plain WebSockets. We'll use Socket.io since it handles reconnection, fallbacks, and rooms out of the box.

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

## Creating Your First Gateway

Gateways are the NestJS equivalent of controllers, but for WebSocket events. They handle incoming messages and emit responses.

```typescript
// chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Port 3001 keeps WebSocket traffic separate from your HTTP API
// CORS config allows browser connections from your frontend
@WebSocketGateway(3001, {
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // Server instance for broadcasting to all clients
  @WebSocketServer()
  server: Server;

  // Called automatically when a client connects
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  // Called automatically when a client disconnects
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Listen for 'message' events from clients
  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { text: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast to all clients except the sender
    client.broadcast.emit('message', {
      ...data,
      timestamp: new Date().toISOString(),
    });

    // Return value is sent back to the sender as acknowledgment
    return { success: true };
  }
}
```

Register the gateway in your module:

```typescript
// chat.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Module({
  providers: [ChatGateway],
})
export class ChatModule {}
```

## Gateway Decorators Reference

| Decorator | Purpose |
|-----------|---------|
| `@WebSocketGateway()` | Marks a class as a WebSocket gateway |
| `@WebSocketServer()` | Injects the underlying server instance |
| `@SubscribeMessage('event')` | Listens for specific events from clients |
| `@MessageBody()` | Extracts the message payload |
| `@ConnectedSocket()` | Injects the client socket instance |

## Working with Namespaces

Namespaces let you separate concerns on a single connection. Think of them as different "channels" - you might have `/chat` for messaging and `/notifications` for alerts.

```typescript
// notifications.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Namespace keeps notification logic separate from chat
@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  // Send notification to a specific user
  notifyUser(userId: string, notification: any) {
    // Emit to all sockets in user's room
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, userId: string) {
    // Join user-specific room for targeted notifications
    client.join(`user:${userId}`);
    return { subscribed: true };
  }
}
```

Client connection to a namespace:

```typescript
// Connect specifically to the notifications namespace
const notificationSocket = io('http://localhost:3001/notifications');
```

## Room-Based Messaging

Rooms are perfect for group chats, document collaboration, or any feature where messages go to a subset of users.

```typescript
// room.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(3001)
export class RoomGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    // Add client to the specified room
    client.join(roomId);

    // Notify others in the room
    client.to(roomId).emit('userJoined', {
      userId: client.id,
      roomId,
    });

    return { joined: roomId };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(roomId);
    client.to(roomId).emit('userLeft', { userId: client.id });
    return { left: roomId };
  }

  @SubscribeMessage('roomMessage')
  handleRoomMessage(
    @MessageBody() data: { roomId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Check if user is actually in the room before allowing message
    if (!client.rooms.has(data.roomId)) {
      return { error: 'Not a member of this room' };
    }

    // Broadcast to all room members including sender
    this.server.to(data.roomId).emit('roomMessage', {
      userId: client.id,
      message: data.message,
      timestamp: new Date().toISOString(),
    });

    return { sent: true };
  }
}
```

## Authentication with Guards

NestJS guards work with WebSocket gateways just like they do with HTTP controllers. You can verify JWT tokens before allowing connections.

```typescript
// ws-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth.token ||
                  client.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new WsException('Missing authentication token');
    }

    try {
      // Verify token and attach user to socket data
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      return true;
    } catch (error) {
      throw new WsException('Invalid token');
    }
  }
}
```

Apply the guard to your gateway:

```typescript
// secure-chat.gateway.ts
import { UseGuards } from '@nestjs/common';
import { WebSocketGateway, SubscribeMessage, ConnectedSocket } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthGuard } from './ws-auth.guard';

@WebSocketGateway(3001)
@UseGuards(WsAuthGuard)  // Applies to all handlers in this gateway
export class SecureChatGateway {
  @SubscribeMessage('privateMessage')
  handlePrivateMessage(@ConnectedSocket() client: Socket) {
    // Access authenticated user from socket data
    const user = client.data.user;
    console.log(`Message from user: ${user.sub}`);
    return { from: user.sub };
  }
}
```

Client-side authentication:

```typescript
const socket = io('http://localhost:3001', {
  auth: {
    token: localStorage.getItem('jwt'),
  },
});

socket.on('connect_error', (err) => {
  if (err.message === 'Invalid token') {
    // Handle token refresh or redirect to login
  }
});
```

## Error Handling

Use exception filters to catch and transform WebSocket errors into client-friendly responses.

```typescript
// ws-exception.filter.ts
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client: Socket = host.switchToWs().getClient();

    // Transform exception into structured error
    const error = exception instanceof WsException
      ? exception.getError()
      : { message: 'Internal server error' };

    // Send error event to the client
    client.emit('error', {
      status: 'error',
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
```

Apply globally or per-gateway:

```typescript
@WebSocketGateway(3001)
@UseFilters(new WsExceptionFilter())
export class ChatGateway {
  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: any) {
    if (!data.text) {
      throw new WsException('Message text is required');
    }
    // Process message
  }
}
```

## Scaling with Redis Adapter

When running multiple server instances, clients on different servers can't communicate directly. The Redis adapter solves this by relaying messages through Redis pub/sub.

```bash
npm install @socket.io/redis-adapter redis
```

```typescript
// redis-io.adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
```

Configure in main.ts:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  await app.listen(3000);
}
bootstrap();
```

## Injecting Services into Gateways

Gateways are providers, so you can inject any service using standard dependency injection.

```typescript
// chat.gateway.ts
import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { MessageDto } from './dto/message.dto';

@WebSocketGateway(3001)
export class ChatGateway {
  // Inject your service like any other NestJS provider
  constructor(private chatService: ChatService) {}

  @SubscribeMessage('message')
  async handleMessage(@MessageBody() data: MessageDto) {
    // Use injected service to persist message
    const saved = await this.chatService.saveMessage(data);
    return { id: saved.id };
  }
}
```

## Summary

| Feature | Approach |
|---------|----------|
| Basic gateway | `@WebSocketGateway()` decorator with lifecycle hooks |
| Event handling | `@SubscribeMessage()` with `@MessageBody()` and `@ConnectedSocket()` |
| Namespaces | Configure in `@WebSocketGateway({ namespace: 'name' })` |
| Rooms | Use `client.join()` and `server.to()` for group messaging |
| Authentication | Guards with `WsException` for token validation |
| Error handling | Exception filters with `@UseFilters()` |
| Scaling | Redis adapter for multi-instance deployments |

NestJS provides a solid foundation for building real-time applications. The decorator-based approach keeps your WebSocket code organized and testable, while integration with the DI system means your gateways can use any service in your application. Start with a simple gateway, add authentication, then scale with Redis when you need multiple server instances.
