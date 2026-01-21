# How to Integrate Redis with Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Laravel, PHP, Caching, Sessions, Queues, Horizon

Description: A comprehensive guide to integrating Redis with Laravel applications, covering cache, sessions, queues, broadcasting, and Laravel Horizon for queue monitoring.

---

Laravel provides first-class Redis support out of the box. This guide covers everything from basic configuration to advanced patterns using Laravel's cache, session, queue, and broadcasting features with Redis.

## Installation and Configuration

### Install Redis Extension

```bash
# Install phpredis extension (recommended)
pecl install redis

# Or use predis package
composer require predis/predis
```

### Configuration

```php
// config/database.php

'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'), // or 'predis'

    'options' => [
        'cluster' => env('REDIS_CLUSTER', 'redis'),
        'prefix' => env('REDIS_PREFIX', 'laravel:'),
    ],

    'default' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_DB', '0'),
    ],

    'cache' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_CACHE_DB', '1'),
    ],

    'session' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_SESSION_DB', '2'),
    ],
],
```

### Environment Configuration

```env
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1
REDIS_SESSION_DB=2

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

## Caching with Redis

### Basic Cache Operations

```php
use Illuminate\Support\Facades\Cache;

// Store a value
Cache::put('key', 'value', $seconds);
Cache::put('key', 'value', now()->addMinutes(10));

// Store forever
Cache::forever('key', 'value');

// Retrieve a value
$value = Cache::get('key');
$value = Cache::get('key', 'default');

// Check existence
if (Cache::has('key')) {
    // Key exists
}

// Retrieve and delete
$value = Cache::pull('key');

// Delete
Cache::forget('key');

// Increment/Decrement
Cache::increment('counter');
Cache::increment('counter', 5);
Cache::decrement('counter');

// Store if not exists
Cache::add('key', 'value', $seconds);

// Get or store
$value = Cache::remember('users', $seconds, function () {
    return DB::table('users')->get();
});

// Get or store forever
$value = Cache::rememberForever('users', function () {
    return DB::table('users')->get();
});
```

### Cache Tags

```php
// Store with tags
Cache::tags(['users', 'profiles'])->put('user:1', $user, $seconds);
Cache::tags(['users', 'profiles'])->put('user:2', $user, $seconds);

// Retrieve tagged items
$user = Cache::tags(['users', 'profiles'])->get('user:1');

// Flush by tag
Cache::tags(['users'])->flush();
Cache::tags(['profiles'])->flush();
```

### Cache Locking

```php
use Illuminate\Support\Facades\Cache;

// Atomic locks
$lock = Cache::lock('processing', 10);

if ($lock->get()) {
    // Lock acquired for 10 seconds
    try {
        // Do exclusive work
    } finally {
        $lock->release();
    }
}

// Block until lock is available
$lock = Cache::lock('processing', 10);

$lock->block(5, function () {
    // Lock acquired within 5 seconds
});

// Using lock helper
Cache::lock('processing')->get(function () {
    // Lock acquired and auto-released
});
```

### Cache in Controllers

```php
namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    public function index()
    {
        $products = Cache::remember('products:all', 3600, function () {
            return Product::with('category')->get();
        });

        return view('products.index', compact('products'));
    }

    public function show($id)
    {
        $product = Cache::remember("product:{$id}", 3600, function () use ($id) {
            return Product::with(['category', 'reviews'])->findOrFail($id);
        });

        return view('products.show', compact('product'));
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $product->update($request->validated());

        // Invalidate cache
        Cache::forget("product:{$id}");
        Cache::tags(['products'])->flush();

        return redirect()->route('products.show', $id);
    }
}
```

## Session Storage with Redis

### Configure Sessions

```php
// config/session.php

return [
    'driver' => env('SESSION_DRIVER', 'redis'),
    'connection' => env('SESSION_CONNECTION', 'session'),
    'lifetime' => env('SESSION_LIFETIME', 120),
    'expire_on_close' => false,
    'encrypt' => false,
    'cookie' => env('SESSION_COOKIE', 'laravel_session'),
    'domain' => env('SESSION_DOMAIN'),
    'path' => '/',
    'secure' => env('SESSION_SECURE_COOKIE'),
    'http_only' => true,
    'same_site' => 'lax',
];
```

### Using Sessions

```php
// In controllers or middleware
public function login(Request $request)
{
    // Store in session
    $request->session()->put('user_id', $user->id);
    $request->session()->put('preferences', ['theme' => 'dark']);

    // Flash data (available only for next request)
    $request->session()->flash('status', 'Login successful!');

    // Retrieve
    $userId = $request->session()->get('user_id');
    $theme = $request->session()->get('preferences.theme', 'light');

    // Check existence
    if ($request->session()->has('user_id')) {
        // Exists and not null
    }

    // Remove
    $request->session()->forget('user_id');

    // Clear all
    $request->session()->flush();

    // Regenerate session ID
    $request->session()->regenerate();
}
```

## Queue System with Redis

### Configure Queues

```php
// config/queue.php

'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 90,
        'block_for' => null,
        'after_commit' => false,
    ],
],
```

### Creating Jobs

```php
// app/Jobs/ProcessOrder.php

namespace App\Jobs;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessOrder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = [60, 120, 300];
    public $timeout = 120;

    public function __construct(
        public Order $order
    ) {}

    public function handle(): void
    {
        // Process the order
        $this->order->process();
    }

    public function failed(\Throwable $exception): void
    {
        // Handle failure
        \Log::error("Order processing failed: {$this->order->id}", [
            'exception' => $exception->getMessage()
        ]);
    }
}
```

### Dispatching Jobs

```php
use App\Jobs\ProcessOrder;

// Dispatch to default queue
ProcessOrder::dispatch($order);

// Dispatch to specific queue
ProcessOrder::dispatch($order)->onQueue('orders');

// Delay execution
ProcessOrder::dispatch($order)->delay(now()->addMinutes(10));

// Chain jobs
Bus::chain([
    new ProcessOrder($order),
    new SendOrderConfirmation($order),
    new NotifyWarehouse($order),
])->dispatch();

// Batch jobs
Bus::batch([
    new ProcessOrder($order1),
    new ProcessOrder($order2),
    new ProcessOrder($order3),
])->then(function (Batch $batch) {
    // All jobs completed
})->catch(function (Batch $batch, Throwable $e) {
    // First failure
})->finally(function (Batch $batch) {
    // Batch finished
})->dispatch();
```

### Running Queue Workers

```bash
# Start worker
php artisan queue:work redis --queue=high,default,low

# With configuration
php artisan queue:work redis --queue=orders --tries=3 --timeout=60

# Process single job
php artisan queue:work redis --once

# Restart workers gracefully
php artisan queue:restart
```

## Laravel Horizon

### Installation

```bash
composer require laravel/horizon
php artisan horizon:install
```

### Configuration

```php
// config/horizon.php

return [
    'environments' => [
        'production' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue' => ['default', 'emails', 'orders'],
                'balance' => 'auto',
                'processes' => 10,
                'tries' => 3,
                'timeout' => 60,
            ],
            'supervisor-2' => [
                'connection' => 'redis',
                'queue' => ['high-priority'],
                'balance' => 'simple',
                'processes' => 3,
                'tries' => 1,
                'timeout' => 30,
            ],
        ],

        'local' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue' => ['default'],
                'balance' => 'simple',
                'processes' => 3,
                'tries' => 3,
            ],
        ],
    ],
];
```

### Running Horizon

```bash
# Start Horizon
php artisan horizon

# Pause/Continue
php artisan horizon:pause
php artisan horizon:continue

# Terminate
php artisan horizon:terminate
```

## Broadcasting with Redis

### Configuration

```php
// config/broadcasting.php

'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
    ],
],
```

```env
BROADCAST_DRIVER=redis
```

### Creating Events

```php
// app/Events/OrderStatusUpdated.php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class OrderStatusUpdated implements ShouldBroadcast
{
    use InteractsWithSockets;

    public function __construct(
        public Order $order
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('orders.' . $this->order->user_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'status' => $this->order->status,
            'updated_at' => $this->order->updated_at,
        ];
    }

    public function broadcastAs(): string
    {
        return 'order.updated';
    }
}
```

### Broadcasting Events

```php
use App\Events\OrderStatusUpdated;

// Broadcast event
event(new OrderStatusUpdated($order));

// Or broadcast directly
broadcast(new OrderStatusUpdated($order));

// Broadcast to others (exclude current user)
broadcast(new OrderStatusUpdated($order))->toOthers();
```

## Direct Redis Operations

### Using Redis Facade

```php
use Illuminate\Support\Facades\Redis;

// Basic operations
Redis::set('key', 'value');
$value = Redis::get('key');

// With expiration
Redis::setex('key', 3600, 'value');

// Hash operations
Redis::hset('user:1', 'name', 'John');
Redis::hset('user:1', 'email', 'john@example.com');
$user = Redis::hgetall('user:1');

// List operations
Redis::lpush('queue', 'item1');
Redis::rpush('queue', 'item2');
$item = Redis::lpop('queue');

// Set operations
Redis::sadd('tags', 'php', 'laravel', 'redis');
$tags = Redis::smembers('tags');

// Sorted set operations
Redis::zadd('leaderboard', 100, 'player1');
Redis::zadd('leaderboard', 200, 'player2');
$top = Redis::zrevrange('leaderboard', 0, 9, 'WITHSCORES');

// Pipeline
Redis::pipeline(function ($pipe) {
    $pipe->set('key1', 'value1');
    $pipe->set('key2', 'value2');
    $pipe->incr('counter');
});

// Transactions
Redis::transaction(function ($redis) {
    $redis->set('key1', 'value1');
    $redis->incr('counter');
});

// Pub/Sub - Publishing
Redis::publish('channel', json_encode(['message' => 'Hello']));

// Pub/Sub - Subscribing (usually in a command)
Redis::subscribe(['channel'], function ($message) {
    echo $message;
});
```

### Connection to Specific Database

```php
// Use specific connection
Redis::connection('cache')->set('key', 'value');

// Use connection method
$redis = Redis::connection('session');
$redis->get('key');
```

## Rate Limiting with Redis

### Configure Rate Limiter

```php
// app/Providers/RouteServiceProvider.php

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

protected function configureRateLimiting(): void
{
    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });

    RateLimiter::for('uploads', function (Request $request) {
        return $request->user()->isPremium()
            ? Limit::none()
            : Limit::perMinute(10)->by($request->user()->id);
    });

    // Multiple limits
    RateLimiter::for('global', function (Request $request) {
        return [
            Limit::perMinute(500),
            Limit::perDay(10000)->by($request->user()?->id ?: $request->ip()),
        ];
    });
}
```

### Apply Rate Limiting

```php
// In routes
Route::middleware(['throttle:api'])->group(function () {
    Route::get('/users', [UserController::class, 'index']);
});

// Custom rate limiter
Route::post('/upload', [UploadController::class, 'store'])
    ->middleware('throttle:uploads');
```

### Manual Rate Limiting

```php
use Illuminate\Support\Facades\RateLimiter;

$executed = RateLimiter::attempt(
    'send-email:' . $user->id,
    5, // 5 attempts
    function () use ($user) {
        // Send email
    },
    60 // Per minute
);

if (!$executed) {
    return response('Too many attempts', 429);
}

// Check remaining attempts
$remaining = RateLimiter::remaining('send-email:' . $user->id, 5);

// Clear limiter
RateLimiter::clear('send-email:' . $user->id);
```

## Best Practices

1. **Use separate databases** for cache, sessions, and queues
2. **Configure connection pooling** for high-traffic applications
3. **Use cache tags** for easier invalidation
4. **Implement proper queue retry logic**
5. **Monitor with Horizon** in production
6. **Set appropriate TTLs** to prevent memory issues

## Conclusion

Laravel's Redis integration provides comprehensive support for:

- Caching with tags and atomic locks
- Session storage with Redis backend
- Queue system with Horizon monitoring
- Broadcasting for real-time features
- Direct Redis access for custom operations

By following these patterns, you can build high-performance Laravel applications that leverage Redis for caching, queuing, and real-time features.
