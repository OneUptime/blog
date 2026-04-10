# How to Use Redis Pub/Sub in PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PHP, Pub/Sub, Messaging, Predis

Description: Learn how to implement Redis Pub/Sub in PHP using Predis and phpredis to build real-time messaging and event notification systems.

---

Redis Pub/Sub allows processes to publish messages to channels and subscribe to receive them. It is useful for broadcasting events, sending notifications, and decoupling services that run independently.

## Publishing Messages

The publisher sends messages to a channel and does not need to know who is listening:

```php
// publisher.php
use Predis\Client;

$client = new Client();
$channel = 'notifications';

$message = json_encode([
    'event' => 'order.placed',
    'order_id' => 1042,
    'user_id' => 7,
    'timestamp' => time(),
]);

$subscribers = $client->publish($channel, $message);
echo "Message delivered to $subscribers subscriber(s)\n";
```

## Subscribing with Predis

```php
// subscriber.php
use Predis\Client;

$client = new Client();

$client->pubSubLoop(['subscribe' => 'notifications'], function ($loop, $message) {
    if ($message->kind === 'message') {
        $data = json_decode($message->payload, true);
        echo "Received: {$data['event']} for order {$data['order_id']}\n";

        // Unsubscribe after a condition
        if ($data['event'] === 'shutdown') {
            $loop->unsubscribe();
        }
    }
});
```

## Subscribing with phpredis

```php
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$redis->subscribe(['notifications'], function (Redis $redis, string $channel, string $message) {
    $data = json_decode($message, true);
    echo "[$channel] {$data['event']}\n";

    if ($data['event'] === 'shutdown') {
        $redis->unsubscribe();
    }
});
```

## Pattern Subscriptions

Subscribe to multiple channels matching a pattern:

```php
// phpredis
$redis->psubscribe(['orders:*', 'users:*'], function (
    Redis $redis,
    string $pattern,
    string $channel,
    string $message
) {
    echo "Pattern: $pattern | Channel: $channel\n";
    echo "Message: $message\n";
});
```

```php
// Predis
$client->pubSubLoop(['psubscribe' => 'orders:*'], function ($loop, $message) {
    if ($message->kind === 'pmessage') {
        echo "Channel: {$message->channel} | Payload: {$message->payload}\n";
    }
});
```

## Running Publisher and Subscriber

Pub/Sub subscribers block while listening. Run them as separate processes or background workers:

```bash
php subscriber.php &
php publisher.php
```

## Important Limitations

A connection in subscribe mode cannot issue regular Redis commands. Use a separate connection for publishing:

```php
// Separate connections for pub and sub
$publisher = new Client();
$subscriber = new Client();

$subscriber->pubSubLoop(['subscribe' => 'events'], function ($loop, $message) {
    if ($message->kind === 'message') {
        echo $message->payload . PHP_EOL;
    }
});

// In another process or thread:
$publisher->publish('events', 'hello');
```

## Real-World Use Cases

```php
// Notify all workers about a config change
$client->publish('config:reload', json_encode(['key' => 'feature_flags']));

// Broadcast a new chat message
$client->publish("chat:room:{$roomId}", json_encode([
    'user' => $username,
    'text' => $messageText,
]));
```

## Summary

Redis Pub/Sub in PHP enables lightweight real-time messaging between decoupled processes. Predis and phpredis both offer subscribe loops with pattern support. Keep subscriber connections dedicated to listening and use separate connections for publishing.
