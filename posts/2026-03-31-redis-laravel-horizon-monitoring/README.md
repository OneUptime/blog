# How to Use Laravel Horizon for Redis Queue Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Laravel, Horizon, Queue, PHP

Description: Install and configure Laravel Horizon to monitor, balance, and manage Redis queue workers with a real-time dashboard and supervisor-style process management.

---

Laravel Horizon is a queue dashboard and manager built specifically for Redis queues. It provides real-time metrics, worker auto-balancing, job retry management, and a web UI - all without leaving your Laravel application.

## Install Horizon

```bash
composer require laravel/horizon
php artisan horizon:install
```

This publishes the Horizon config and assets.

## Configure Horizon

`config/horizon.php`:

```php
return [
    'use' => 'default',

    'prefix' => env('HORIZON_PREFIX', 'horizon:'),

    'middleware' => ['web'],

    'waits' => ['redis:default' => 60],

    'trim' => [
        'recent' => 60,     // minutes to keep recent jobs
        'pending' => 60,
        'completed' => 60,
        'failed' => 10080,  // 7 days for failed jobs
    ],

    'environments' => [
        'production' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue' => ['high', 'default', 'low'],
                'balance' => 'auto',
                'autoScalingStrategy' => 'time',
                'maxProcesses' => 20,
                'minProcesses' => 1,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
                'tries' => 3,
                'timeout' => 90,
            ],
        ],

        'local' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue' => ['high', 'default', 'low'],
                'balance' => 'simple',
                'maxProcesses' => 3,
                'tries' => 3,
            ],
        ],
    ],
];
```

`balance => 'auto'` dynamically shifts workers to queues with the most wait time.

## Start Horizon

```bash
php artisan horizon
```

For production, use a process supervisor:

```ini
# /etc/supervisor/conf.d/horizon.conf
[program:horizon]
process_name=%(program_name)s
command=php /var/www/artisan horizon
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/storage/logs/horizon.log
stopwaitsecs=3600
```

```bash
supervisorctl reread && supervisorctl update && supervisorctl start horizon
```

## Dispatch Jobs to Queues

```php
// Dispatch to specific queue
ProcessOrder::dispatch($order)->onQueue('high');
SendEmail::dispatch($user)->onQueue('default');
GenerateReport::dispatch()->onQueue('low');
```

## Protect the Dashboard

In `config/horizon.php`:

```php
'middleware' => ['web', 'auth'],
```

Or use Horizon's gate in `app/Providers/HorizonServiceProvider.php`:

```php
Horizon::auth(function ($request) {
    return in_array($request->user()?->email, [
        'admin@example.com',
    ]);
});
```

## Access the Dashboard

```text
http://localhost/horizon
```

The dashboard shows queue throughput, job wait times, failed jobs, and worker counts per queue.

## Pause and Resume Workers

```bash
php artisan horizon:pause
php artisan horizon:continue
php artisan horizon:terminate  # graceful stop
```

## Summary

Laravel Horizon transforms Redis queue management from guesswork into an observable, self-balancing system. Auto-balancing assigns workers to congested queues automatically, the dashboard surfaces wait times and failure rates in real-time, and Supervisor keeps Horizon running in production. Failed jobs are retained for inspection and manual retry without any additional tooling.
