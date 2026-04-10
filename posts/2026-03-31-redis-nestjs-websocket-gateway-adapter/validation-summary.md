# Validation Summary: How to Build NestJS WebSocket Gateway with Redis Adapter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NestJS (`@nestjs/websockets`, `@nestjs/platform-socket.io`)
- Socket.IO (`socket.io`, `@socket.io/redis-adapter`)
- Redis (node-redis v4+, Redis Pub/Sub)
- TypeScript

## Sources Consulted
- NestJS WebSocket Gateways documentation — https://docs.nestjs.com/websockets/gateways
- NestJS WebSocket Adapter documentation — https://docs.nestjs.com/websockets/adapter
- Socket.IO Redis adapter documentation — https://socket.io/docs/v4/redis-adapter/
- Socket.IO using multiple nodes documentation — https://socket.io/docs/v4/using-multiple-nodes/
- NestJS GitHub Issue #1148 (request for injectable WebSocket server) — https://github.com/nestjs/nest/issues/1148
- NestJS GitHub Issue #682 (injecting WebSocket server into services) — https://github.com/nestjs/nest/issues/682
- node-redis documentation — https://github.com/redis/node-redis

## Issues Found

### 1. Fabricated `@InjectWebSocketServer()` decorator
- **What was wrong:** The "Emit from a REST Controller" section used `@InjectWebSocketServer()` to inject the Socket.IO server into a controller. This decorator does not exist in NestJS. There is no such export from `@nestjs/websockets` or any official NestJS package.
- **What was changed:** Replaced with the correct approach: injecting the `ChatGateway` class via standard NestJS dependency injection and accessing `this.chatGateway.server`.
- **Why:** The `@WebSocketServer()` decorator only works inside `@WebSocketGateway()` classes. To access the server from a controller or service, you must inject the gateway itself.

### 2. Incorrect "without sticky sessions" claim
- **What was wrong:** The summary stated the Redis adapter enables scaling "without sticky sessions." This is incorrect per the official Socket.IO documentation, which explicitly states sticky sessions are required even when using the Redis adapter.
- **What was changed:** Replaced the claim with an accurate explanation: sticky sessions are still required for Socket.IO's default HTTP long-polling transport, and can only be avoided by forcing WebSocket-only connections on the client.
- **Why:** The Redis adapter handles broadcasting events across nodes via Pub/Sub, but it does not solve the HTTP long-polling routing problem. During the initial connection phase (which uses long-polling by default), multiple HTTP requests from the same client must reach the same server, which requires sticky sessions.

## Review Notes
- The Redis adapter configuration code (`RedisIoAdapter` class) correctly follows the pattern from the official NestJS documentation and is accurate for `@socket.io/redis-adapter` v7+ with node-redis v4+.
- The WebSocket gateway code uses correct NestJS decorators and Socket.IO APIs.
- The `redis-cli pubsub channels "socket.io*"` verification command is correct — the `@socket.io/redis-adapter` creates channels prefixed with `socket.io#`.
- The REST controller section does not show import statements. After the fix, it requires importing `ChatGateway` from its module and ensuring the gateway's module exports it. This is a minor omission typical of blog post snippets.
