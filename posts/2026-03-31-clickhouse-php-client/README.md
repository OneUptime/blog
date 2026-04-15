# How to Use ClickHouse PHP Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PHP, smi2/phpclickhouse, HTTP Interface, Data Ingestion

Description: Learn how to connect to ClickHouse from PHP using the smi2/phpclickhouse library to run queries and insert data over the HTTP interface.

---

PHP applications can interact with ClickHouse via HTTP. The `smi2/phpclickhouse` library is the most popular PHP client - it wraps the HTTP interface and provides a fluent API for queries, inserts, and bulk loading.

## Installation

```bash
composer require smi2/phpclickhouse
```

## Connecting

```php
<?php
require 'vendor/autoload.php';

use ClickHouseDB\Client;

$db = new Client([
    'host'     => '127.0.0.1',
    'port'     => '8123',
    'username' => 'default',
    'password' => '',
]);
$db->database('default');
$db->setTimeout(1.5);
$db->setConnectTimeOut(5);
```

## Running a SELECT Query

```php
$statement = $db->select('SELECT number, number * 2 AS doubled FROM numbers(5)');
foreach ($statement->rows() as $row) {
    echo $row['number'] . ' -> ' . $row['doubled'] . PHP_EOL;
}
```

## Parameterized Queries

Pass bindings as the second argument to avoid SQL injection:

```php
$statement = $db->select(
    'SELECT * FROM events WHERE event_type = :type AND event_date >= :date',
    ['type' => 'pageview', 'date' => '2024-01-01']
);
```

## Inserting Rows

```php
$db->insert('events', [
    [1, '2024-01-01', 'pageview'],
    [2, '2024-01-02', 'click'],
], ['id', 'event_date', 'event_type']);
```

## Bulk Insert with Files

For large datasets, stream a CSV file directly:

```php
$db->insertBatchFiles(
    'events',
    ['/path/to/data.csv'],
    ['id', 'event_date', 'event_type']
);
```

## Creating Tables

```php
$db->write('
    CREATE TABLE IF NOT EXISTS events (
        id         UInt64,
        event_date Date,
        event_type String
    ) ENGINE = MergeTree()
    ORDER BY (event_date, id)
');
```

## Async Queries

Send multiple queries in parallel using async mode:

```php
$queries = [
    $db->selectAsync('SELECT count() FROM events WHERE event_type = :t', ['t' => 'pageview']),
    $db->selectAsync('SELECT count() FROM events WHERE event_type = :t', ['t' => 'click']),
];
$db->executeAsync();

foreach ($queries as $q) {
    echo $q->fetchOne('count()') . PHP_EOL;
}
```

## Summary

The `smi2/phpclickhouse` PHP client provides a clean API over ClickHouse's HTTP interface. Use `select()` with parameter bindings for safe queries, `insert()` for row-by-row inserts, and `insertBatchFiles()` for high-throughput CSV imports. Async mode lets you fire multiple queries in parallel to maximize throughput.
