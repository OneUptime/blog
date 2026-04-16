# How to Use ClickHouse with Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Laravel, PHP, Analytics, Database, Query Builder

Description: Connect Laravel to ClickHouse using a community driver to run analytical queries, insert events, and build reporting features in PHP applications.

---

Laravel is the most popular PHP web framework. While it is designed for transactional databases, you can connect it to ClickHouse for analytical workloads using community packages that integrate with Laravel's database layer.

## Installing the ClickHouse Driver

```bash
composer require smi2/phpclickhouse
```

Or use the Laravel-specific wrapper:

```bash
composer require bavix/laravel-clickhouse
```

## Configuring the Connection

Add a ClickHouse connection to `config/database.php`:

```php
'connections' => [
    // ... existing connections

    'clickhouse' => [
        'driver'   => 'clickhouse',
        'host'     => env('CLICKHOUSE_HOST', 'localhost'),
        'port'     => env('CLICKHOUSE_PORT', '8123'),
        'database' => env('CLICKHOUSE_DATABASE', 'default'),
        'username' => env('CLICKHOUSE_USERNAME', 'default'),
        'password' => env('CLICKHOUSE_PASSWORD', ''),
    ],
],
```

Add to `.env`:

```text
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=default
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=
```

## Running Raw Queries

Using `smi2/phpclickhouse` directly:

```php
use ClickHouseDB\Client;

$client = new Client([
    'host'     => config('database.connections.clickhouse.host'),
    'port'     => config('database.connections.clickhouse.port'),
    'username' => config('database.connections.clickhouse.username'),
    'password' => config('database.connections.clickhouse.password'),
]);
$client->database(config('database.connections.clickhouse.database'));
$client->ping();

$result = $client->select(
    'SELECT page, count() AS views FROM page_views GROUP BY page ORDER BY views DESC LIMIT 10'
);

foreach ($result->rows() as $row) {
    echo $row['page'] . ': ' . $row['views'] . PHP_EOL;
}
```

## Inserting Data

```php
$client->insert('events', [
    ['user_123', 'click', '/home', date('Y-m-d H:i:s')],
    ['user_456', 'view', '/about', date('Y-m-d H:i:s')],
], ['user_id', 'event_type', 'page', 'created_at']);
```

## Creating a Service Class

Wrap ClickHouse in a Laravel service for cleaner code:

```php
namespace App\Services;

use ClickHouseDB\Client;

class AnalyticsService
{
    protected Client $client;

    public function __construct()
    {
        $this->client = new Client([
            'host'     => config('database.connections.clickhouse.host'),
            'port'     => config('database.connections.clickhouse.port'),
            'username' => config('database.connections.clickhouse.username'),
            'password' => config('database.connections.clickhouse.password'),
        ]);
        $this->client->database(
            config('database.connections.clickhouse.database')
        );
    }

    public function getTopPages(int $days = 7): array
    {
        $result = $this->client->select(
            "SELECT page, count() AS views
             FROM page_views
             WHERE created_at >= now() - INTERVAL :days DAY
             GROUP BY page ORDER BY views DESC LIMIT 10",
            ['days' => $days]
        );
        return $result->rows();
    }
}
```

## Registering in a Controller

```php
use App\Services\AnalyticsService;

class DashboardController extends Controller
{
    public function index(AnalyticsService $analytics)
    {
        $topPages = $analytics->getTopPages(7);
        return view('dashboard', compact('topPages'));
    }
}
```

## Summary

While Laravel does not natively support ClickHouse, the `smi2/phpclickhouse` library provides a full-featured PHP client. Wrapping it in a Laravel service class gives you a clean integration that fits naturally into your application architecture, letting you serve fast analytical data alongside your transactional MySQL or PostgreSQL database.
