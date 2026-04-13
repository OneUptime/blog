# How to Use MongoDB with Laravel (MongoDB Package)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Laravel, PHP, Eloquent, MongoDB Laravel Package

Description: Learn how to configure the official MongoDB Laravel package, define Eloquent models backed by MongoDB, and perform queries using familiar Laravel syntax.

---

## Overview

The official `mongodb/laravel-mongodb` package extends Laravel's Eloquent ORM to work with MongoDB. You can use familiar Eloquent syntax for querying and relationships while taking advantage of MongoDB's flexible document model.

## Installation

```bash
composer require mongodb/laravel-mongodb
```

Make sure the PHP MongoDB extension is installed:

```bash
pecl install mongodb
```

Add `extension=mongodb` to your `php.ini` if not already enabled.

## Configuration

Add a MongoDB connection to `config/database.php`:

```php
'connections' => [
    // ... existing connections ...

    'mongodb' => [
        'driver'   => 'mongodb',
        'dsn'      => env('MONGODB_URI', 'mongodb://localhost:27017'),
        'database' => env('MONGODB_DATABASE', 'myapp'),
    ],
],
```

Set the default connection or use it per model:

```php
// .env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=myapp
```

## Defining an Eloquent Model

```php
<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class User extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'users';

    protected $fillable = [
        'name',
        'email',
        'role',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
        'created_at' => 'datetime',
    ];
}
```

## Basic CRUD Operations

```php
use App\Models\User;

// Create
$user = User::create([
    'name'  => 'Alice',
    'email' => 'alice@example.com',
    'role'  => 'admin',
    'active' => true,
]);

// Read
$user = User::where('email', 'alice@example.com')->first();
$activeUsers = User::where('active', true)->get();

// Update
User::where('email', 'alice@example.com')
    ->update(['role' => 'superadmin']);

// Delete
User::where('active', false)->delete();
```

## MongoDB-Specific Query Operators

The package exposes MongoDB operators directly:

```php
// $regex query
$users = User::where('email', 'regex', '/^admin/i')->get();

// $in query
$users = User::whereIn('role', ['admin', 'moderator'])->get();

// $elemMatch for arrays
$users = User::where('tags', 'elemMatch', ['$eq' => 'mongodb'])->get();

// $exists
$users = User::where('deletedAt', 'exists', false)->get();

// $near for geospatial
$locations = Location::where('coordinates', 'near', [
    '$geometry' => ['type' => 'Point', 'coordinates' => [-73.97, 40.77]],
    '$maxDistance' => 1000
])->get();
```

## Working with Embedded Documents

```php
// Push to an array field
$user->push('tags', 'mongodb');

// Pull from an array field
$user->pull('tags', 'php');

// Embed subdocuments
$user->update([
    'address' => [
        'street' => '123 Main St',
        'city'   => 'New York',
        'zip'    => '10001',
    ]
]);

// Query on embedded fields
$users = User::where('address.city', 'New York')->get();
```

## Relationships

```php
// User has many Orders (cross-collection)
class User extends Model
{
    public function orders()
    {
        return $this->hasMany(Order::class, 'userId');
    }
}

class Order extends Model
{
    public function user()
    {
        return $this->belongsTo(User::class, 'userId');
    }
}

// Usage
$user = User::find($id);
$orders = $user->orders()->where('status', 'pending')->get();
```

## Aggregation with Raw Pipeline

```php
use App\Models\User;

$results = User::raw(function ($collection) {
    return $collection->aggregate([
        ['$match'  => ['active' => true]],
        ['$group'  => ['_id' => '$role', 'count' => ['$sum' => 1]]],
        ['$sort'   => ['count' => -1]],
    ]);
})->toArray();
```

## Creating Indexes via Migration

```php
use Illuminate\Database\Migrations\Migration;
use MongoDB\Laravel\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateUsersCollection extends Migration
{
    public function up()
    {
        Schema::connection('mongodb')->create('users', function (Blueprint $collection) {
            $collection->unique('email');
            $collection->index('active');
            $collection->index(['role' => 1, 'createdAt' => -1]);
        });
    }

    public function down()
    {
        Schema::connection('mongodb')->drop('users');
    }
}
```

## Summary

The `mongodb/laravel-mongodb` package brings MongoDB support to Laravel's Eloquent ORM with minimal friction. Define models by extending `MongoDB\Laravel\Eloquent\Model`, configure the connection in `config/database.php`, and use familiar `where()`, `create()`, and `update()` methods enhanced with MongoDB-specific operators like `elemMatch`, `push`, and `pull`. For complex queries, use `raw()` to pass an aggregation pipeline directly to the driver.
