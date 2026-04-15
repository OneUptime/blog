# How to Use ClickHouse with Laravel PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Laravel, PHP, Database, Analytics, Eloquent

Description: Connect Laravel to ClickHouse using the smi2/phpClickHouse client and a custom service provider to run analytical queries alongside your primary MySQL or PostgreSQL database.

---

Laravel applications can connect to ClickHouse for analytical workloads while keeping MySQL or PostgreSQL for their primary Eloquent models. ClickHouse does not support transactions, foreign keys, or UPDATE in the traditional sense, so the cleanest integration uses a dedicated service class rather than an Eloquent driver.

## Installation

```bash
composer require smi2/phpclickhouse
```

## Environment Configuration

```text
# .env

CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_TIMEOUT=30
```

## Configuration File

Create the config file manually:

```php
<?php
// config/clickhouse.php

return [
    'host'     => env('CLICKHOUSE_HOST', 'localhost'),
    'port'     => env('CLICKHOUSE_PORT', '8123'),
    'user'     => env('CLICKHOUSE_USER', 'default'),
    'password' => env('CLICKHOUSE_PASSWORD', ''),
    'database' => env('CLICKHOUSE_DATABASE', 'analytics'),
    'timeout'  => (int) env('CLICKHOUSE_TIMEOUT', 30),
];
```

## Service Provider

```php
<?php
// app/Providers/ClickHouseServiceProvider.php

namespace App\Providers;

use ClickHouseDB\Client;
use Illuminate\Support\ServiceProvider;

class ClickHouseServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Client::class, function ($app) {
            $config = $app['config']['clickhouse'];

            $client = new Client([
                'host'     => $config['host'],
                'port'     => $config['port'],
                'username' => $config['user'],
                'password' => $config['password'],
            ]);

            $client->database($config['database']);
            $client->setTimeout($config['timeout']);
            $client->setConnectTimeOut(10);
            $client->ping(); // Fail fast on misconfiguration

            return $client;
        });
    }

    public function provides(): array
    {
        return [Client::class];
    }
}
```

Register in `config/app.php`:

```php
'providers' => [
    // ...
    App\Providers\ClickHouseServiceProvider::class,
],
```

## ClickHouse Schema

```sql
CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE analytics.events
(
    event_id    UUID        DEFAULT generateUUIDv4(),
    user_id     UInt64,
    session_id  String,
    event_type  LowCardinality(String),
    page        String,
    properties  String      DEFAULT '{}',
    ts          DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, user_id, ts);
```

## Analytics Repository

```php
<?php
// app/Repositories/AnalyticsRepository.php

namespace App\Repositories;

use ClickHouseDB\Client;

class AnalyticsRepository
{
    public function __construct(private readonly Client $client) {}

    public function insert(array $data): void
    {
        $this->client->insert(
            'analytics.events',
            [array_values($data)],
            array_keys($data)
        );
    }

    public function insertBatch(array $rows): void
    {
        $values  = [];
        $columns = ['user_id', 'session_id', 'event_type', 'page', 'properties', 'ts'];

        foreach ($rows as $row) {
            $values[] = [
                $row['user_id'],
                $row['session_id'] ?? '',
                $row['event_type'],
                $row['page'],
                json_encode($row['properties'] ?? []),
                $row['ts'] ?? date('Y-m-d H:i:s'),
            ];
        }

        $this->client->insert('analytics.events', $values, $columns);
    }

    public function summary(int $days = 7): array
    {
        $result = $this->client->select(
            'SELECT event_type, count() AS total, uniq(user_id) AS unique_users
             FROM analytics.events
             WHERE ts >= now() - INTERVAL :days DAY
             GROUP BY event_type
             ORDER BY total DESC',
            ['days' => $days]
        );

        return $result->rows();
    }

    public function timeseries(string $eventType, int $hours = 24): array
    {
        $result = $this->client->select(
            'SELECT toStartOfHour(ts) AS bucket, count() AS count
             FROM analytics.events
             WHERE event_type = :event_type
               AND ts >= now() - INTERVAL :hours HOUR
             GROUP BY bucket
             ORDER BY bucket',
            ['event_type' => $eventType, 'hours' => $hours]
        );

        return $result->rows();
    }

    public function topPages(int $days = 7, int $limit = 10): array
    {
        $result = $this->client->select(
            'SELECT page, count() AS views, uniq(user_id) AS unique_users
             FROM analytics.events
             WHERE event_type = \'page_view\'
               AND ts >= now() - INTERVAL :days DAY
             GROUP BY page
             ORDER BY views DESC
             LIMIT :limit',
            ['days' => $days, 'limit' => $limit]
        );

        return $result->rows();
    }

    public function retentionCohorts(): array
    {
        $result = $this->client->select(
            'SELECT
                cohort_week,
                week_number,
                count(DISTINCT user_id) AS retained
             FROM (
                 SELECT
                     a.user_id,
                     c.cohort_week,
                     dateDiff(\'week\', c.cohort_week, toStartOfWeek(a.ts)) AS week_number
                 FROM analytics.events AS a
                 INNER JOIN (
                     SELECT user_id, toStartOfWeek(min(ts)) AS cohort_week
                     FROM analytics.events
                     WHERE ts >= today() - 90
                     GROUP BY user_id
                 ) AS c ON a.user_id = c.user_id
                 WHERE a.ts >= today() - 90
             )
             GROUP BY cohort_week, week_number
             ORDER BY cohort_week, week_number'
        );

        return $result->rows();
    }

    public function dailyActiveUsers(int $days = 30): array
    {
        $result = $this->client->select(
            'SELECT toDate(ts) AS day, uniq(user_id) AS dau
             FROM analytics.events
             WHERE ts >= today() - :days
             GROUP BY day
             ORDER BY day',
            ['days' => $days]
        );

        return $result->rows();
    }
}
```

## Controller

```php
<?php
// app/Http/Controllers/AnalyticsController.php

namespace App\Http\Controllers;

use App\Repositories\AnalyticsRepository;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsRepository $analytics
    ) {}

    public function summary(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 7);
        return response()->json($this->analytics->summary($days));
    }

    public function timeseries(Request $request): JsonResponse
    {
        $eventType = $request->query('event_type', 'page_view');
        $hours     = (int) $request->query('hours', 24);
        return response()->json($this->analytics->timeseries($eventType, $hours));
    }

    public function topPages(Request $request): JsonResponse
    {
        $days  = (int) $request->query('days', 7);
        $limit = min((int) $request->query('limit', 10), 100);
        return response()->json($this->analytics->topPages($days, $limit));
    }

    public function retention(): JsonResponse
    {
        return response()->json($this->analytics->retentionCohorts());
    }

    public function dau(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);
        return response()->json($this->analytics->dailyActiveUsers($days));
    }

    public function ingest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id'    => 'required|integer',
            'event_type' => 'required|string|max:64',
            'page'       => 'required|string',
            'session_id' => 'nullable|string',
            'properties' => 'nullable|array',
        ]);

        $this->analytics->insert([
            'user_id'    => $validated['user_id'],
            'session_id' => $validated['session_id'] ?? '',
            'event_type' => $validated['event_type'],
            'page'       => $validated['page'],
            'properties' => json_encode($validated['properties'] ?? []),
            'ts'         => now()->format('Y-m-d H:i:s.v'),
        ]);

        return response()->json(['status' => 'accepted'], 201);
    }
}
```

## Routes

```php
<?php
// routes/api.php

use App\Http\Controllers\AnalyticsController;
use Illuminate\Support\Facades\Route;

Route::prefix('analytics')->middleware('auth:sanctum')->group(function () {
    Route::get('summary',    [AnalyticsController::class, 'summary']);
    Route::get('timeseries', [AnalyticsController::class, 'timeseries']);
    Route::get('top-pages',  [AnalyticsController::class, 'topPages']);
    Route::get('retention',  [AnalyticsController::class, 'retention']);
    Route::get('dau',        [AnalyticsController::class, 'dau']);
    Route::post('events',    [AnalyticsController::class, 'ingest']);
});
```

## Queued Event Tracking

For high-frequency events, queue writes so they do not slow down HTTP responses:

```php
<?php
// app/Jobs/TrackEventJob.php

namespace App\Jobs;

use App\Repositories\AnalyticsRepository;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

class TrackEventJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        private readonly array $event
    ) {}

    public function handle(AnalyticsRepository $analytics): void
    {
        $analytics->insert($this->event);
    }
}
```

Dispatch from a controller or middleware:

```php
TrackEventJob::dispatch([
    'user_id'    => auth()->id(),
    'session_id' => session()->getId(),
    'event_type' => 'page_view',
    'page'       => request()->path(),
    'properties' => '{}',
    'ts'         => now()->format('Y-m-d H:i:s.v'),
]);
```

## Artisan Command for Backfill

```php
<?php
// app/Console/Commands/BackfillOrderEvents.php

namespace App\Console\Commands;

use App\Models\Order;
use App\Repositories\AnalyticsRepository;
use Illuminate\Console\Command;

class BackfillOrderEvents extends Command
{
    protected $signature   = 'analytics:backfill-orders';
    protected $description = 'Backfill historical orders into ClickHouse';

    public function handle(AnalyticsRepository $analytics): int
    {
        $bar = $this->output->createProgressBar(Order::count());

        Order::with('user')->chunkById(1000, function ($orders) use ($analytics, $bar) {
            $rows = $orders->map(fn ($order) => [
                $order->user_id,
                '',
                'order_placed',
                '/checkout',
                json_encode(['amount' => $order->total]),
                $order->created_at->format('Y-m-d H:i:s.v'),
            ])->toArray();

            $analytics->insertBatch(array_map(fn ($r) => [
                'user_id'    => $r[0],
                'session_id' => $r[1],
                'event_type' => $r[2],
                'page'       => $r[3],
                'properties' => $r[4],
                'ts'         => $r[5],
            ], $rows));

            $bar->advance(count($rows));
        });

        $bar->finish();
        $this->newLine();
        $this->info('Backfill complete.');
        return Command::SUCCESS;
    }
}
```

Run the command:

```bash
php artisan analytics:backfill-orders
```

## Summary

Laravel connects to ClickHouse through a service provider that binds the `smi2/phpClickHouse` client as a singleton. Inject the client into repository classes, use parameterized queries for all variable inputs, and dispatch event inserts through Laravel queues to keep your HTTP response times low. This approach keeps ClickHouse isolated from Eloquent while fully leveraging Laravel's dependency injection, validation, and queue systems.
