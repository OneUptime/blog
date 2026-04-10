# How to Use Redis in Dart for Flutter Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Dart, Flutter, Caching, Backend

Description: Learn how to use Redis from Dart in server-side and Flutter backend contexts using the resp_client package for caching, sessions, and real-time data.

---

Redis is not used directly in Flutter apps (which are client-side), but Dart backend servers - including those built with Shelf, Dart Frog, or plain Dart - can integrate Redis for caching, sessions, and queues. This guide uses the `resp_client` package.

## Setup

For a Dart backend project:

```yaml
# pubspec.yaml
dependencies:
  resp_client: ^1.1.0
```

## Connecting to Redis

```dart
import 'package:resp_client/resp_client.dart';
import 'package:resp_client/resp_commands.dart';
import 'package:resp_client/resp_server.dart';

Future<void> main() async {
  final server = await connectSocket('localhost', port: 6379);
  final client = RespClient(server);
  final commands = RespCommandsTier2(client);

  print('Connected to Redis');
  await commands.set('greeting', 'Hello from Dart');
  final value = await commands.get('greeting');
  print('Value: $value');

  await server.close();
}
```

## Basic Operations

```dart
Future<void> redisExamples(RespClient client) async {
  final commands = RespCommandsTier0(client);

  // String operations
  await commands.execute(['SET', 'counter', '0']);
  final result = await commands.execute(['INCR', 'counter']);
  print('Counter: $result');

  // Set with expiry (SETEX)
  await commands.execute(['SETEX', 'session:abc', '3600', 'user:42']);

  // Hash
  await commands.execute(['HSET', 'user:1', 'name', 'Alice', 'email', 'alice@example.com']);
  final name = await commands.execute(['HGET', 'user:1', 'name']);
  print('Name: $name');

  // List
  await commands.execute(['RPUSH', 'queue', 'task1', 'task2', 'task3']);
  final task = await commands.execute(['LPOP', 'queue']);
  print('Task: $task');
}
```

## Caching Pattern for a Dart Backend

This pattern is common in Dart Frog or Shelf API servers:

```dart
Future<Map<String, dynamic>> getCachedUser(
  RespClient client,
  String userId,
  Future<Map<String, dynamic>> Function() fetchFromDb,
) async {
  final redis = RespCommandsTier2(client);
  final raw = RespCommandsTier0(client);
  final cacheKey = 'user:$userId:data';
  final cached = await redis.get(cacheKey);

  if (cached != null) {
    return {'source': 'cache', 'data': jsonDecode(cached)};
  }

  final data = await fetchFromDb();
  await raw.execute(['SET', cacheKey, jsonEncode(data), 'EX', '300']);
  return {'source': 'db', 'data': data};
}
```

## Using Redis as a Pub/Sub Bridge

Flutter apps can receive real-time updates via a Dart backend that subscribes to Redis channels and forwards messages over WebSocket:

```dart
Future<void> subscribeToPubSub(RespClient client) async {
  final commands = RespCommandsTier0(client);

  // Send SUBSCRIBE command
  await commands.execute(['SUBSCRIBE', 'app_events']);

  // Listen to incoming messages
  await for (final message in client.outputStream) {
    if (message is RespArray) {
      final parts = message.payload.cast<RespBulkString>();
      if (parts[0].payload == 'message') {
        final channel = parts[1].payload;
        final payload = parts[2].payload;
        print('[$channel] $payload');
      }
    }
  }
}
```

## Flutter App Architecture

```text
Flutter App (Dart/Client)
        |
        v
  WebSocket / HTTP
        |
        v
  Dart Backend Server (Shelf/Dart Frog)
        |
        v
     Redis
```

Redis lives in the backend layer. Flutter communicates with the Dart server, which reads/writes Redis. This keeps Redis off the public network.

## Summary

Dart backends use `resp_client` to communicate with Redis for caching, session storage, and Pub/Sub bridging. The package provides tiered command classes: `RespCommandsTier2` for convenient high-level operations like `set` and `get`, and `RespCommandsTier0` for executing raw Redis commands. Flutter apps themselves do not connect to Redis directly - instead, a Dart server acts as the intermediary, using Redis for fast state sharing and the Flutter app consuming data via HTTP or WebSocket.
