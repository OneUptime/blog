# How to Use Eloquent-Style Queries with Laravel MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Laravel, Eloquent, Query, Driver

Description: Learn how to use Eloquent-style queries with the Laravel MongoDB package to interact with MongoDB using familiar Laravel ORM syntax.

---

## Introduction

Laravel developers are accustomed to Eloquent, the expressive ORM that ships with the framework. When switching to MongoDB, you don't have to abandon that familiarity. The `mongodb/laravel-mongodb` package (formerly `jenssegers/mongodb`) brings full Eloquent support to MongoDB, letting you write fluent queries against document collections just as you would against relational tables.

## Installing the Package

```bash
composer require mongodb/laravel-mongodb
```

Register the service provider in `config/app.php` if you are on an older Laravel version, or let auto-discovery handle it. Then add a MongoDB connection in `config/database.php`:

```php
'mongodb' => [
    'driver'   => 'mongodb',
    'host'     => env('MONGODB_HOST', '127.0.0.1'),
    'port'     => env('MONGODB_PORT', 27017),
    'database' => env('MONGODB_DATABASE', 'myapp'),
    'username' => env('MONGODB_USERNAME', ''),
    'password' => env('MONGODB_PASSWORD', ''),
    'options'  => [
        'appname' => 'myapp',
    ],
],
```

## Defining a MongoDB Model

Extend `MongoDB\Laravel\Eloquent\Model` instead of the standard `Illuminate\Database\Eloquent\Model`:

```php
<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Product extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'products';

    protected $fillable = ['name', 'price', 'category', 'in_stock'];
}
```

## Running Eloquent-Style Queries

All standard Eloquent query builder methods work out of the box:

```php
// Retrieve all products in a category
$electronics = Product::where('category', 'electronics')
    ->where('in_stock', true)
    ->orderBy('price', 'asc')
    ->get();

// Find by primary key
$product = Product::find('64a1f2c3d4e5f6a7b8c9d0e1');

// First matching document
$cheap = Product::where('price', '<', 50)->first();

// Count
$count = Product::where('category', 'books')->count();
```

## Creating and Updating Documents

```php
// Create a new document
Product::create([
    'name'     => 'Wireless Headphones',
    'price'    => 79.99,
    'category' => 'electronics',
    'in_stock' => true,
]);

// Update matching documents
Product::where('category', 'electronics')
    ->update(['in_stock' => false]);

// updateOrCreate
Product::updateOrCreate(
    ['name' => 'Wireless Headphones'],
    ['price' => 69.99, 'in_stock' => true]
);
```

## Using MongoDB-Specific Operators

The package exposes MongoDB operators through the query builder:

```php
// $elemMatch - check array element conditions
$orders = Order::where('items', 'elemMatch', ['qty' => ['$gt' => 5]])->get();

// whereIn on arrays stored in documents
$featured = Product::whereIn('tags', ['sale', 'new'])->get();

// Exists check
$withRating = Product::where('rating', 'exists', true)->get();
```

## Soft Deletes

Add the `SoftDeletes` trait just as you would in a standard model:

```php
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;
    // ...
}
```

Deleted documents get a `deleted_at` field and are automatically excluded from queries unless you call `withTrashed()`.

## Monitoring Your MongoDB Application

Production Laravel applications benefit from observability. [OneUptime](https://oneuptime.com) provides open-source monitoring that can alert you when query latency spikes or error rates increase - integrating easily with your existing infrastructure.

## Summary

The `mongodb/laravel-mongodb` package lets you interact with MongoDB using familiar Eloquent syntax. You can define models, run fluent where-clauses, create and update documents, use MongoDB-specific operators, and apply soft deletes - all without learning a separate query API. This makes adopting MongoDB in Laravel projects straightforward for teams already comfortable with Eloquent.
