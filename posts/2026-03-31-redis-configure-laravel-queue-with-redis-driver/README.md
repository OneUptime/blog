# How to Configure Laravel Queue with Redis Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Laravel, Queue, Job, PHP

Description: Configure Laravel's queue system to use Redis as the driver, enabling reliable background job processing with configurable queues and retry logic.

---

## Introduction

Laravel's queue system allows you to defer time-consuming tasks like sending emails, processing uploads, or calling external APIs to background workers. Using Redis as the queue driver is faster than database queues and more lightweight than a dedicated message broker like RabbitMQ. This guide covers the complete setup.

## Installation

Install the Predis PHP client or use the phpredis extension:

```bash
composer require predis/predis
```

Or, if using phpredis, install the PHP extension:

```bash
pecl install redis
```

## Environment Configuration

In `.env`:

```text
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

## Queue Configuration

In `config/queue.php`, the Redis connection is already defined:

```php
'connections' => [
    'redis' => [
        'driver'      => 'redis',
        'connection'  => 'default',
        'queue'       => env('REDIS_QUEUE', 'default'),
        'retry_after' => 90,
        'block_for'   => null,
        'after_commit' => false,
    ],
],
```

## Creating a Job

```bash
php artisan make:job SendWelcomeEmail
```

```php
// app/Jobs/SendWelcomeEmail.php
namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;

    public function __construct(
        private readonly User $user
    ) {}

    public function handle(): void
    {
        Mail::to($this->user->email)
            ->send(new \App\Mail\WelcomeMail($this->user));
    }

    public function failed(\Throwable $exception): void
    {
        \Log::error("SendWelcomeEmail failed for user {$this->user->id}: {$exception->getMessage()}");
    }
}
```

## Dispatching Jobs

```php
// Dispatch to default queue
SendWelcomeEmail::dispatch($user);

// Dispatch to specific queue with delay
SendWelcomeEmail::dispatch($user)
    ->onQueue('emails')
    ->delay(now()->addMinutes(5));

// Dispatch after database transaction commits
SendWelcomeEmail::dispatch($user)->afterCommit();
```

## Multiple Queue Configuration

Configure different Redis queues in `config/queue.php`:

```php
'connections' => [
    'redis-high' => [
        'driver'     => 'redis',
        'connection' => 'default',
        'queue'      => 'high',
        'retry_after' => 90,
    ],
    'redis-low' => [
        'driver'     => 'redis',
        'connection' => 'default',
        'queue'      => 'low',
        'retry_after' => 300,
    ],
],
```

## Running Workers

```bash
# Process default queue
php artisan queue:work redis

# Process with priority order
php artisan queue:work redis --queue=high,default,low

# Process with specific retry and sleep settings
php artisan queue:work redis --queue=emails --sleep=3 --tries=3

# Run with a timeout (production)
php artisan queue:work redis --timeout=60
```

## Supervisor Configuration for Production

```text
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/html/artisan queue:work redis --queue=high,default --sleep=3 --tries=3 --timeout=60
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/html/storage/logs/worker.log
```

## Summary

Configuring Laravel queues with Redis requires setting `QUEUE_CONNECTION=redis` in your `.env` file and optionally tuning the queue configuration in `config/queue.php`. Jobs implementing `ShouldQueue` are automatically serialized and pushed to Redis when dispatched. Workers process jobs from the queue and can be managed with Supervisor for reliability in production. Redis queues are significantly faster than database-backed queues for high-throughput applications.
