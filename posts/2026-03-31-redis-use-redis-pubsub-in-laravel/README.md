# How to Use Redis Pub/Sub in Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Laravel, Pub/Sub, Real-Time, PHP

Description: Use Redis Pub/Sub in Laravel to publish messages to channels and subscribe to them in background processes for real-time inter-service communication.

---

## Introduction

Redis Pub/Sub is a messaging pattern where publishers send messages to named channels and subscribers receive them. In Laravel, this is useful for inter-process communication, triggering background actions, or broadcasting events between microservices. This guide covers direct Redis Pub/Sub usage in Laravel beyond the broadcasting abstraction.

## Prerequisites

Configure Redis in `.env`:

```text
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## Publishing Messages

Use the Laravel Redis facade to publish messages:

```php
use Illuminate\Support\Facades\Redis;

class NotificationService
{
    public function notifyUser(int $userId, string $type, array $data): void
    {
        $message = json_encode([
            'user_id'   => $userId,
            'type'      => $type,
            'data'      => $data,
            'timestamp' => now()->toISOString(),
        ]);

        Redis::publish("user-notifications:{$userId}", $message);
    }

    public function broadcastSystemAlert(string $message): void
    {
        Redis::publish('system-alerts', json_encode([
            'message'   => $message,
            'severity'  => 'info',
            'timestamp' => now()->toISOString(),
        ]));
    }
}
```

## Creating an Artisan Command Subscriber

Create a long-running Artisan command that subscribes to Redis channels:

```bash
php artisan make:command RedisSubscriber
```

```php
// app/Console/Commands/RedisSubscriber.php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

class RedisSubscriber extends Command
{
    protected $signature = 'redis:subscribe {channel=system-alerts}';
    protected $description = 'Subscribe to a Redis Pub/Sub channel';

    public function handle(): void
    {
        $channel = $this->argument('channel');
        $this->info("Subscribing to channel: {$channel}");

        Redis::subscribe([$channel], function (string $message, string $channel) {
            $data = json_decode($message, true);
            $this->processMessage($channel, $data);
        });
    }

    private function processMessage(string $channel, array $data): void
    {
        $this->line("[{$channel}] Received: " . json_encode($data));

        match ($data['type'] ?? 'unknown') {
            'email'      => $this->handleEmailNotification($data),
            'push'       => $this->handlePushNotification($data),
            'audit'      => $this->logAuditEvent($data),
            default      => $this->line("Unknown message type"),
        };
    }

    private function handleEmailNotification(array $data): void
    {
        // Process email notification
        $this->info("Processing email for user {$data['user_id']}");
    }

    private function handlePushNotification(array $data): void
    {
        $this->info("Push notification for user {$data['user_id']}");
    }

    private function logAuditEvent(array $data): void
    {
        \Log::info('Audit event', $data);
    }
}
```

## Pattern Subscriptions

Subscribe to multiple channels using glob patterns:

```php
Redis::psubscribe(['user-notifications:*'], function (string $message, string $channel) {
    $userId = explode(':', $channel)[1] ?? null;
    $data = json_decode($message, true);

    \Log::info("Message for user {$userId}", $data);
});
```

## Publishing from a Controller

```php
use App\Services\NotificationService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications
    ) {}

    public function ship(Request $request, int $orderId)
    {
        $order = Order::findOrFail($orderId);
        $order->update(['status' => 'shipped']);

        // Publish to Redis Pub/Sub
        $this->notifications->notifyUser($order->user_id, 'email', [
            'order_id' => $orderId,
            'message'  => 'Your order has been shipped.',
        ]);

        return response()->json(['success' => true]);
    }
}
```

## Running the Subscriber

```bash
# Start subscriber in the background
php artisan redis:subscribe system-alerts &

# Subscribe to multiple channels
php artisan redis:subscribe user-events
```

For production, use Supervisor to keep the subscriber running:

```text
[program:redis-subscriber]
command=php /var/www/html/artisan redis:subscribe system-alerts
autostart=true
autorestart=true
user=www-data
stdout_logfile=/var/www/html/storage/logs/subscriber.log
```

## Summary

Redis Pub/Sub in Laravel is accessed through the Redis facade's `publish()` and `subscribe()` methods. Publishers call `Redis::publish(channel, message)` from any part of the application, while subscribers run as long-lived Artisan commands managed by Supervisor. Pattern subscriptions with `psubscribe` allow subscribing to entire channel namespaces. This approach is well-suited for loosely coupled real-time communication between application components or microservices.
