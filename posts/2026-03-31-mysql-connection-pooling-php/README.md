# How to Implement Connection Pooling for MySQL in PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection Pool, PHP, PDO, Performance

Description: Learn how to implement MySQL connection pooling in PHP using PDO persistent connections, PgBouncer-style proxies, and framework-level pool management.

---

## Introduction

PHP has a per-request execution model where each request creates new connections by default. True long-lived connection pools require PHP-FPM with persistent connections or an external pooler like ProxySQL. This guide covers the available options and their trade-offs.

## Option 1: PDO Persistent Connections

PDO's `ATTR_PERSISTENT` keeps connections open in the web server process pool:

```php
<?php

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $dsn = 'mysql:host=localhost;port=3306;dbname=mydb;charset=utf8mb4';
            self::$instance = new PDO($dsn, 'root', 'password', [
                PDO::ATTR_PERSISTENT         => true,
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            ]);
        }
        return self::$instance;
    }
}
```

With PHP-FPM, each worker process maintains its own persistent connection, effectively creating a pool sized to `pm.max_children`.

## Using Persistent PDO for Queries

```php
<?php

function getAffordableProducts(float $maxPrice): array
{
    $db = Database::getConnection();
    $stmt = $db->prepare(
        'SELECT id, name, price, stock FROM products WHERE price <= :max AND stock > 0 ORDER BY price'
    );
    $stmt->execute([':max' => $maxPrice]);
    return $stmt->fetchAll();
}

function insertProduct(string $name, float $price, int $stock, int $categoryId): int
{
    $db = Database::getConnection();
    $stmt = $db->prepare(
        'INSERT INTO products (name, price, stock, category_id) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$name, $price, $stock, $categoryId]);
    return (int) $db->lastInsertId();
}
```

## Option 2: MySQLi with Persistent Connections

Using `p:` prefix in the host string to enable persistence:

```php
<?php

$mysqli = new mysqli('p:localhost', 'root', 'password', 'mydb');
$mysqli->set_charset('utf8mb4');

if ($mysqli->connect_error) {
    throw new RuntimeException('MySQL connection failed: ' . $mysqli->connect_error);
}

$maxPrice = 500.00;
$stmt = $mysqli->prepare('SELECT id, name FROM products WHERE price <= ?');
$stmt->bind_param('d', $maxPrice);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    echo $row['name'] . PHP_EOL;
}
$stmt->close();
```

## Option 3: ProxySQL as a Connection Pooler

For high-traffic PHP-FPM setups, ProxySQL provides true connection multiplexing:

```bash
# Install ProxySQL
sudo apt install proxysql

# Configure ProxySQL to route to MySQL
mysql -u admin -padmin -h 127.0.0.1 -P6032 <<'SQL'
INSERT INTO mysql_servers (hostgroup_id, hostname, port) VALUES (0, '127.0.0.1', 3306);
INSERT INTO mysql_users (username, password, default_hostgroup) VALUES ('root', 'password', 0);
LOAD MYSQL SERVERS TO RUNTIME;
LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
SAVE MYSQL USERS TO DISK;
SQL
```

Then point PHP to ProxySQL (port 6033):

```php
<?php
$dsn = 'mysql:host=127.0.0.1;port=6033;dbname=mydb;charset=utf8mb4';
$pdo = new PDO($dsn, 'root', 'password', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);
```

## PHP-FPM Pool Configuration

Configure PHP-FPM workers to match your MySQL connection budget:

```ini
; /etc/php/8.2/fpm/pool.d/www.conf
[www]
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
```

With persistent connections, MySQL will see at most `pm.max_children` connections.

## Summary

PHP connection pooling relies on PDO persistent connections with PHP-FPM workers acting as the pool. Each FPM worker holds one persistent connection, so size `pm.max_children` to stay within MySQL's `max_connections`. For higher concurrency requirements, ProxySQL provides true connection multiplexing at the proxy layer, allowing more PHP workers than MySQL connections.
