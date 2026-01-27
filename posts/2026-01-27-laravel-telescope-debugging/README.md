# How to Use Laravel Telescope for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Laravel, PHP, Telescope, Debugging, Monitoring

Description: Learn how to use Laravel Telescope for debugging your applications, including request monitoring, database queries, exceptions, and queue jobs.

---

> Laravel Telescope is a powerful debugging assistant that provides deep insight into your application's requests, exceptions, database queries, queued jobs, and more. It transforms debugging from guesswork into a data-driven process.

Telescope is an official Laravel package that gives you a dashboard to monitor everything happening in your application during development and optionally in production. This guide walks you through installation, configuration, and effective use of all its watchers.

---

## Prerequisites

Before we begin, ensure you have:
- PHP 8.1 or higher
- Laravel 9.x or higher
- Composer for package management
- A running Laravel application

---

## Installing Laravel Telescope

Installation is straightforward using Composer. The package requires a database table to store its data:

```bash
# Install Telescope via Composer
composer require laravel/telescope

# Publish Telescope's assets and configuration
php artisan telescope:install

# Run migrations to create the required tables
php artisan migrate
```

After installation, Telescope is available at the `/telescope` route in your application.

### Development-Only Installation

For development-only installation, add Telescope to your dev dependencies:

```bash
# Install as a dev dependency to exclude from production
composer require laravel/telescope --dev
```

Then modify your `AppServiceProvider` to conditionally register Telescope:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Only register Telescope in local environment
        // This prevents Telescope from loading in production
        if ($this->app->environment('local')) {
            $this->app->register(\Laravel\Telescope\TelescopeServiceProvider::class);
            $this->app->register(TelescopeServiceProvider::class);
        }
    }
}
```

---

## Configuration

The main configuration file is located at `config/telescope.php`. Here are the key settings:

```php
<?php

// config/telescope.php
return [
    // Path where Telescope will be accessible
    // Change this if /telescope conflicts with your routes
    'path' => 'telescope',

    // Storage driver - database is the default
    // Telescope stores all recorded data in your database
    'driver' => env('TELESCOPE_DRIVER', 'database'),

    // Enable or disable Telescope entirely
    // Useful for toggling via environment variables
    'enabled' => env('TELESCOPE_ENABLED', true),

    // Prune entries older than this many hours
    // Prevents database from growing indefinitely
    'prune' => [
        'hours' => 24,
    ],

    // Configure which watchers are active
    // Disable watchers you don't need to reduce overhead
    'watchers' => [
        \Laravel\Telescope\Watchers\CacheWatcher::class => true,
        \Laravel\Telescope\Watchers\CommandWatcher::class => true,
        \Laravel\Telescope\Watchers\DumpWatcher::class => true,
        \Laravel\Telescope\Watchers\EventWatcher::class => true,
        \Laravel\Telescope\Watchers\ExceptionWatcher::class => true,
        \Laravel\Telescope\Watchers\GateWatcher::class => true,
        \Laravel\Telescope\Watchers\JobWatcher::class => true,
        \Laravel\Telescope\Watchers\LogWatcher::class => true,
        \Laravel\Telescope\Watchers\MailWatcher::class => true,
        \Laravel\Telescope\Watchers\ModelWatcher::class => true,
        \Laravel\Telescope\Watchers\NotificationWatcher::class => true,
        \Laravel\Telescope\Watchers\QueryWatcher::class => true,
        \Laravel\Telescope\Watchers\RedisWatcher::class => true,
        \Laravel\Telescope\Watchers\RequestWatcher::class => true,
        \Laravel\Telescope\Watchers\ScheduleWatcher::class => true,
        \Laravel\Telescope\Watchers\ViewWatcher::class => true,
    ],
];
```

---

## Monitoring Requests and Responses

The Request Watcher captures every HTTP request to your application. Access it via the Requests tab in the Telescope dashboard.

### What Gets Captured

Each request entry includes:
- Request method and URL
- Request headers and payload
- Response status code and body
- Session data
- Authenticated user
- Duration in milliseconds

### Filtering Requests

You can filter which requests get recorded in your `TelescopeServiceProvider`:

```php
<?php

namespace App\Providers;

use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    public function register(): void
    {
        Telescope::night();

        $this->hideSensitiveRequestDetails();

        // Filter which entries get recorded
        Telescope::filter(function (IncomingEntry $entry) {
            // Always record in local environment
            if ($this->app->environment('local')) {
                return true;
            }

            // In other environments, only record specific types
            return $entry->isReportableException() ||
                   $entry->isFailedRequest() ||    // 4xx and 5xx responses
                   $entry->isFailedJob() ||
                   $entry->isScheduledTask() ||
                   $entry->hasMonitoredTag();
        });
    }

    protected function hideSensitiveRequestDetails(): void
    {
        // Hide sensitive data from request recordings
        // These fields will be replaced with asterisks
        Telescope::hideRequestParameters([
            'password',
            'password_confirmation',
            'credit_card',
            'api_key',
            'secret',
        ]);

        // Hide sensitive headers
        Telescope::hideRequestHeaders([
            'Authorization',
            'X-API-Key',
            'Cookie',
        ]);
    }
}
```

---

## Tracking Database Queries

The Query Watcher records every database query, making it invaluable for identifying N+1 problems and slow queries.

### Viewing Queries

Each query entry shows:
- The SQL statement with bindings
- Execution time in milliseconds
- Connection name
- The file and line that triggered the query

### Configuring Slow Query Threshold

Set a threshold to highlight slow queries:

```php
<?php

// config/telescope.php
'watchers' => [
    \Laravel\Telescope\Watchers\QueryWatcher::class => [
        'enabled' => true,
        // Queries taking longer than 100ms will be flagged as slow
        // Adjust based on your performance requirements
        'slow' => 100,
    ],
],
```

### Identifying N+1 Queries

Telescope makes N+1 problems visible by showing query counts per request. Here's how to fix a common N+1 issue:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\JsonResponse;

class PostController extends Controller
{
    // Bad: This causes N+1 queries
    // Telescope will show 1 query for posts + N queries for authors
    public function indexBad(): JsonResponse
    {
        $posts = Post::all();

        // Each iteration triggers a new query for the author
        return response()->json($posts->map(function ($post) {
            return [
                'title' => $post->title,
                'author' => $post->author->name,  // N+1 here!
            ];
        }));
    }

    // Good: Eager load the relationship
    // Telescope will show only 2 queries total
    public function indexGood(): JsonResponse
    {
        // with() eager loads the author relationship
        $posts = Post::with('author')->get();

        return response()->json($posts->map(function ($post) {
            return [
                'title' => $post->title,
                'author' => $post->author->name,  // No extra query
            ];
        }));
    }
}
```

---

## Viewing Exceptions and Logs

### Exception Watcher

Every exception thrown in your application is captured with full stack traces:

```php
<?php

namespace App\Http\Controllers;

use App\Exceptions\PaymentFailedException;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    public function __construct(
        private PaymentService $paymentService
    ) {}

    public function process(string $orderId): JsonResponse
    {
        try {
            // Attempt payment processing
            $result = $this->paymentService->charge($orderId);

            return response()->json(['status' => 'success', 'result' => $result]);

        } catch (PaymentFailedException $e) {
            // This exception will appear in Telescope's Exceptions tab
            // with full context including the order ID
            report($e);

            return response()->json([
                'status' => 'failed',
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
```

### Log Watcher

All log entries are captured and displayed:

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class OrderService
{
    public function processOrder(array $orderData): void
    {
        // Info logs appear in Telescope's Logs tab
        Log::info('Starting order processing', [
            'order_id' => $orderData['id'],
            'items_count' => count($orderData['items']),
        ]);

        // Process the order...

        // Debug logs help trace execution flow
        Log::debug('Order validation passed', [
            'order_id' => $orderData['id'],
        ]);

        // Warning logs highlight potential issues
        if ($orderData['total'] > 10000) {
            Log::warning('High value order detected', [
                'order_id' => $orderData['id'],
                'total' => $orderData['total'],
            ]);
        }
    }
}
```

---

## Monitoring Queue Jobs

The Job Watcher tracks all queued jobs, showing their payload, status, and execution details.

### Job Tracking Example

```php
<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\ShippingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessOrderShipment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Number of retry attempts - visible in Telescope
    public int $tries = 3;

    // Timeout in seconds - helps identify stuck jobs
    public int $timeout = 120;

    public function __construct(
        public Order $order
    ) {}

    public function handle(ShippingService $shippingService): void
    {
        // This log entry will be linked to the job in Telescope
        Log::info('Processing shipment', ['order_id' => $this->order->id]);

        // Create shipment label
        $label = $shippingService->createLabel($this->order);

        // Update order with tracking info
        $this->order->update([
            'tracking_number' => $label->trackingNumber,
            'shipped_at' => now(),
        ]);

        Log::info('Shipment processed', [
            'order_id' => $this->order->id,
            'tracking' => $label->trackingNumber,
        ]);
    }

    // Failed job handler - exception visible in Telescope
    public function failed(\Throwable $exception): void
    {
        Log::error('Shipment processing failed', [
            'order_id' => $this->order->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

### Dispatching Jobs with Tags

Add tags to make jobs easier to find in Telescope:

```php
<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessOrderShipment;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Laravel\Telescope\Telescope;

class OrderController extends Controller
{
    public function ship(Order $order): JsonResponse
    {
        // Add custom tags to the job for easy filtering in Telescope
        Telescope::tag(function () use ($order) {
            return [
                'order:' . $order->id,
                'customer:' . $order->customer_id,
            ];
        });

        ProcessOrderShipment::dispatch($order);

        return response()->json(['status' => 'queued']);
    }
}
```

---

## Schedule Watcher

Monitor your scheduled tasks and their execution:

```php
<?php

// app/Console/Kernel.php
namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        // This task will appear in Telescope's Schedule tab
        $schedule->command('orders:process-pending')
            ->hourly()
            ->withoutOverlapping()
            ->runInBackground();

        // Closures are also tracked
        $schedule->call(function () {
            // Clean up temporary files
            // Execution details visible in Telescope
        })->daily()->description('Clean temporary files');

        // Jobs dispatched on schedule
        $schedule->job(new \App\Jobs\SendDailyReport)
            ->dailyAt('09:00')
            ->description('Send daily report to admins');
    }
}
```

---

## Mail and Notification Watchers

### Mail Watcher

Captures all outgoing emails with their content:

```php
<?php

namespace App\Http\Controllers;

use App\Mail\OrderConfirmation;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class OrderController extends Controller
{
    public function confirm(Order $order): JsonResponse
    {
        // This email will be captured by Telescope
        // You can preview the rendered HTML in the dashboard
        Mail::to($order->customer->email)
            ->send(new OrderConfirmation($order));

        return response()->json(['status' => 'confirmation_sent']);
    }
}
```

### Notification Watcher

Tracks all notifications across all channels:

```php
<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\SlackMessage;
use Illuminate\Notifications\Notification;

class OrderShipped extends Notification
{
    use Queueable;

    public function __construct(
        public Order $order
    ) {}

    // Each channel will be logged separately in Telescope
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'slack'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Order Has Shipped')
            ->line('Order #' . $this->order->id . ' is on its way!')
            ->action('Track Order', url('/orders/' . $this->order->id));
    }

    public function toSlack(object $notifiable): SlackMessage
    {
        return (new SlackMessage)
            ->content('Order #' . $this->order->id . ' has shipped');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'tracking_number' => $this->order->tracking_number,
        ];
    }
}
```

---

## Cache Operations

The Cache Watcher tracks all cache interactions:

```php
<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\Cache;

class ProductService
{
    public function getProduct(int $id): ?Product
    {
        // This cache operation appears in Telescope
        // Shows hit/miss status and the cached value
        return Cache::remember(
            "product:{$id}",
            now()->addHours(1),
            function () use ($id) {
                // Cache miss - query will also appear in Telescope
                return Product::find($id);
            }
        );
    }

    public function updateProduct(int $id, array $data): Product
    {
        $product = Product::findOrFail($id);
        $product->update($data);

        // Cache invalidation is tracked
        // Useful for debugging stale data issues
        Cache::forget("product:{$id}");

        // Tag-based cache clearing also tracked
        Cache::tags(['products', "product:{$id}"])->flush();

        return $product->fresh();
    }
}
```

---

## Gate and Policy Checks

The Gate Watcher records authorization checks, helping debug access control issues:

```php
<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    // All policy checks appear in Telescope's Gates tab
    // Shows the result (allowed/denied) and the user

    public function view(User $user, Post $post): bool
    {
        // Public posts can be viewed by anyone
        if ($post->is_public) {
            return true;
        }

        // Private posts only by author
        return $user->id === $post->user_id;
    }

    public function update(User $user, Post $post): bool
    {
        // Only the author can update
        return $user->id === $post->user_id;
    }

    public function delete(User $user, Post $post): bool
    {
        // Authors and admins can delete
        return $user->id === $post->user_id || $user->is_admin;
    }
}
```

Using gates in controllers:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class PostController extends Controller
{
    public function update(Post $post): JsonResponse
    {
        // This gate check will be recorded in Telescope
        // Shows: user, ability, result, and arguments
        if (Gate::denies('update', $post)) {
            abort(403, 'You cannot edit this post');
        }

        // Or use authorize() - also tracked
        $this->authorize('update', $post);

        // Update logic...
        return response()->json(['status' => 'updated']);
    }
}
```

---

## Customizing Watchers and Filtering Data

### Custom Watcher Configuration

Fine-tune individual watchers for your needs:

```php
<?php

// config/telescope.php
'watchers' => [
    // Query watcher with slow query threshold
    \Laravel\Telescope\Watchers\QueryWatcher::class => [
        'enabled' => true,
        'slow' => 100,  // Milliseconds
    ],

    // Model watcher - track specific events
    \Laravel\Telescope\Watchers\ModelWatcher::class => [
        'enabled' => true,
        'events' => ['eloquent.created*', 'eloquent.updated*'],
        // Hydrations can be noisy - disable if needed
        'hydrations' => false,
    ],

    // Event watcher - ignore specific events
    \Laravel\Telescope\Watchers\EventWatcher::class => [
        'enabled' => true,
        'ignore' => [
            // Framework events that create noise
            \Illuminate\Auth\Events\Authenticated::class,
            \Illuminate\Queue\Events\JobProcessed::class,
        ],
    ],

    // Request watcher - configure size limits
    \Laravel\Telescope\Watchers\RequestWatcher::class => [
        'enabled' => true,
        // Limit response size to prevent large payloads
        'size_limit' => 64,  // KB
    ],
],
```

### Tagging Entries

Add custom tags to make entries easier to find:

```php
<?php

namespace App\Providers;

use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    public function register(): void
    {
        Telescope::night();

        // Add custom tags to entries based on their content
        Telescope::tag(function (IncomingEntry $entry) {
            // Tag all entries for the current user
            if ($user = auth()->user()) {
                return [
                    'user:' . $user->id,
                    'role:' . $user->role,
                ];
            }

            return [];
        });
    }
}
```

### Conditional Recording

Control when Telescope records based on conditions:

```php
<?php

namespace App\Providers;

use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    public function register(): void
    {
        Telescope::night();

        Telescope::filter(function (IncomingEntry $entry) {
            // Always record in local environment
            if ($this->app->environment('local')) {
                return true;
            }

            // In staging/production, be selective
            return $entry->isReportableException() ||
                   $entry->isFailedRequest() ||
                   $entry->isFailedJob() ||
                   $entry->type === 'query' && $entry->content['slow'] ||
                   $this->hasMonitoredTag($entry);
        });
    }

    private function hasMonitoredTag(IncomingEntry $entry): bool
    {
        // Record entries with specific tags
        $monitoredTags = ['critical', 'payment', 'high-priority'];

        foreach ($entry->tags as $tag) {
            if (in_array($tag, $monitoredTags)) {
                return true;
            }
        }

        return false;
    }
}
```

---

## Production Considerations

### Authorization

Restrict access to Telescope in production:

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    protected function gate(): void
    {
        // Define who can access Telescope in non-local environments
        Gate::define('viewTelescope', function ($user) {
            // Only allow specific users or admins
            return in_array($user->email, [
                'admin@example.com',
                'developer@example.com',
            ]) || $user->is_admin;
        });
    }
}
```

### Data Pruning

Prevent the database from growing indefinitely:

```php
<?php

// config/telescope.php
'prune' => [
    // Delete entries older than 24 hours
    // Adjust based on your debugging needs and storage capacity
    'hours' => 24,
],
```

Schedule the prune command:

```php
<?php

// app/Console/Kernel.php
protected function schedule(Schedule $schedule): void
{
    // Run pruning daily to keep database size manageable
    $schedule->command('telescope:prune')->daily();

    // Or prune more aggressively with a custom hours value
    $schedule->command('telescope:prune --hours=12')->hourly();
}
```

### Performance Considerations

```php
<?php

// config/telescope.php
return [
    // Disable Telescope entirely via environment variable
    // Set TELESCOPE_ENABLED=false in production if not needed
    'enabled' => env('TELESCOPE_ENABLED', true),

    // Disable heavy watchers in production
    'watchers' => [
        // Disable dump watcher in production
        \Laravel\Telescope\Watchers\DumpWatcher::class =>
            env('TELESCOPE_DUMP_WATCHER', false),

        // Query watcher can impact performance
        \Laravel\Telescope\Watchers\QueryWatcher::class => [
            'enabled' => env('TELESCOPE_QUERY_WATCHER', true),
            'slow' => 100,
        ],

        // Model watcher creates many entries
        \Laravel\Telescope\Watchers\ModelWatcher::class => [
            'enabled' => env('TELESCOPE_MODEL_WATCHER', false),
        ],
    ],
];
```

---

## Best Practices Summary

1. **Use tags generously** - Tag entries by user, feature, or priority to make filtering easier
2. **Set slow query thresholds** - Identify performance issues early by flagging slow queries
3. **Hide sensitive data** - Always configure hidden request parameters and headers
4. **Prune regularly** - Schedule the prune command to prevent database bloat
5. **Filter in production** - Only record exceptions, failed jobs, and slow queries in production
6. **Restrict access** - Use the gate to limit who can view Telescope in production
7. **Disable unnecessary watchers** - Turn off watchers you do not need to reduce overhead
8. **Use environment variables** - Control Telescope behavior via environment for easy toggling

---

## Conclusion

Laravel Telescope transforms debugging from a frustrating experience into a systematic process. By providing visibility into requests, queries, jobs, mail, and more, it helps you identify and fix issues quickly.

Key takeaways:
- Start with default settings and customize as needed
- Use slow query thresholds to identify performance bottlenecks
- Tag entries for easy filtering in complex applications
- Be selective about what you record in production
- Always hide sensitive data from recordings

With Telescope in your toolkit, you will spend less time guessing and more time building.

---

*Looking for a complete observability solution for your Laravel applications? [OneUptime](https://oneuptime.com) provides monitoring, alerting, and incident management that complements your local debugging with production-grade observability.*
