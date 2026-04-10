# How to Use Redis for Laravel Broadcasting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Laravel, Broadcasting, WebSocket, Real-Time, PHP

Description: Configure Laravel broadcasting with Redis as the driver to push real-time events to frontend clients via Laravel Echo and a WebSocket server.

---

## Introduction

Laravel Broadcasting lets you push server-side events to browser clients in real time. The broadcast driver sends events to a Redis channel, and a WebSocket server (like Laravel Reverb or Soketi) listens to Redis and forwards events to connected clients. This guide walks through the complete setup.

## Installation

```bash
composer require predis/predis
npm install --save-dev laravel-echo pusher-js
```

## Environment Configuration

```text
BROADCAST_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## Enable Broadcasting

Run the broadcasting installation command:

```bash
php artisan install:broadcasting
```

This creates the `config/broadcasting.php` configuration file and the `routes/channels.php` file for channel authorization.

## Creating a Broadcastable Event

```bash
php artisan make:event OrderShipped
```

```php
// app/Events/OrderShipped.php
namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderShipped implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Order $order
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("orders.{$this->order->user_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'order.shipped';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id'  => $this->order->id,
            'status'    => $this->order->status,
            'shipped_at' => $this->order->shipped_at,
        ];
    }
}
```

## Channel Authorization

In `routes/channels.php`:

```php
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('orders.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});
```

## Dispatching Events from Controllers

```php
use App\Events\OrderShipped;
use App\Models\Order;

class OrderController extends Controller
{
    public function ship(Order $order)
    {
        $order->update(['status' => 'shipped', 'shipped_at' => now()]);

        // Broadcast the event via Redis
        event(new OrderShipped($order));

        return response()->json(['message' => 'Order shipped']);
    }
}
```

## Setting Up Laravel Reverb (WebSocket Server)

```bash
composer require laravel/reverb
php artisan reverb:install
php artisan reverb:start
```

## Frontend with Laravel Echo

```javascript
import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: "reverb",
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  wssPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ["ws", "wss"],
});

// Listen on a private channel
echo.private(`orders.${userId}`)
  .listen(".order.shipped", (event) => {
    console.log("Order shipped:", event.order_id);
    updateOrderStatus(event.order_id, event.status);
  });
```

## Public Channel Broadcasting

```php
// For public channels accessible without authentication
class StockPriceUpdated implements ShouldBroadcast
{
    public function __construct(
        public readonly string $symbol,
        public readonly float $price
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel('stock-prices')];
    }
}
```

```javascript
// Subscribe without authentication
echo.channel("stock-prices")
  .listen(".StockPriceUpdated", ({ symbol, price }) => {
    console.log(`${symbol}: $${price}`);
  });
```

## Summary

Laravel broadcasting with Redis works by publishing events to a Redis channel from your PHP application and having a WebSocket server (such as Laravel Reverb or Soketi) relay those messages to subscribed frontend clients. Events implement `ShouldBroadcast`, define their channels, and are dispatched like regular Laravel events. The frontend listens using Laravel Echo, which handles WebSocket connection management and channel subscriptions transparently.
