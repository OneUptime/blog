# How to Connect to MongoDB from PHP Using the PHP Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PHP, Driver, Connection, PECL

Description: Learn how to install the MongoDB PHP Driver and extension, create a client, and connect to MongoDB from a PHP application.

---

## Overview

MongoDB provides two layers for PHP:
1. **ext-mongodb** - a PECL C extension that handles the low-level driver communication.
2. **mongodb/mongodb** - a higher-level PHP library built on top of the extension.

Both are needed for most applications.

## Installation

Install the PECL extension:

```bash
pecl install mongodb
```

Add to `php.ini`:

```ini
extension=mongodb.so
```

Install the PHP library via Composer:

```bash
composer require mongodb/mongodb
```

## Basic Connection

```php
<?php
require 'vendor/autoload.php';

use MongoDB\Client;

// Connect to local MongoDB
$client = new Client('mongodb://localhost:27017');

// With credentials
$client = new Client(
    'mongodb://admin:secret@localhost:27017/shopdb?authSource=admin'
);

// MongoDB Atlas
$client = new Client(
    'mongodb+srv://user:password@cluster0.example.mongodb.net/shopdb'
);

echo "Connected to MongoDB\n";
```

## Selecting a Database and Collection

```php
// Get a database
$db = $client->shopdb;

// Alternative syntax
$db = $client->selectDatabase('shopdb');

// Get a collection
$products = $db->products;

// Alternative
$products = $db->selectCollection('products');
```

## Advanced Connection Options

```php
$client = new Client('mongodb://localhost:27017', [
    'connectTimeoutMS'         => 5000,
    'socketTimeoutMS'          => 30000,
    'serverSelectionTimeoutMS' => 5000,
    'readPreference'           => 'secondaryPreferred',
    'w'                        => 'majority',
]);
```

## Testing the Connection

```php
try {
    $result = $client->selectDatabase('admin')
        ->command(['ping' => 1]);
    echo "Ping OK: " . json_encode($result->toArray()[0]) . "\n";
} catch (\Exception $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
```

## Environment-Based Configuration

```php
// .env
// MONGODB_URI=mongodb://localhost:27017
// MONGODB_DB=shopdb

$client = new Client($_ENV['MONGODB_URI']);
$db = $client->selectDatabase($_ENV['MONGODB_DB']);
```

## Type Map Configuration

By default, documents are returned as BSON objects. Use a type map to get PHP arrays or objects:

```php
// Return documents as PHP arrays
$client = new Client('mongodb://localhost:27017', [], [
    'typeMap' => [
        'array'    => 'array',
        'document' => 'array',
        'root'     => 'array',
    ],
]);

// Return documents as BSONDocument objects (default)
$client = new Client('mongodb://localhost:27017', [], [
    'typeMap' => [
        'array'    => 'MongoDB\Model\BSONArray',
        'document' => 'MongoDB\Model\BSONDocument',
        'root'     => 'MongoDB\Model\BSONDocument',
    ],
]);
```

## Mapping to Custom Classes

```php
use MongoDB\BSON\Unserializable;

class Product implements Unserializable {
    public string $name;
    public float $price;
    public string $category;

    public function bsonUnserialize(array $data): void {
        $this->name = $data['name'];
        $this->price = (float) $data['price'];
        $this->category = $data['category'];
    }
}

$collection = $client->shopdb->selectCollection('products', [
    'typeMap' => ['root' => Product::class, 'document' => 'array'],
]);

$product = $collection->findOne(['name' => 'Wireless Keyboard']);
echo $product->name; // typed access
```

## Connection in a Laravel or Symfony App

Use a service container singleton to ensure one client per process:

```php
// Laravel AppServiceProvider
$this->app->singleton(Client::class, function () {
    return new Client(config('database.connections.mongodb.dsn'));
});
```

## Summary

Connecting to MongoDB from PHP requires the `ext-mongodb` PECL extension and the `mongodb/mongodb` Composer library. Create a `MongoDB\Client` with your URI, optionally pass a URI options array to configure timeouts and read/write preferences, and a driver options array to set the type map. Always create the client once (singleton) and share it across requests. Use the type map to control whether documents are returned as BSON objects, PHP arrays, or custom PHP classes.
