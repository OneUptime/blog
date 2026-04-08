# How to Perform CRUD Operations with the MongoDB PHP Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PHP, CRUD, Library, Driver

Description: Learn how to insert, find, update, and delete documents in MongoDB using the official MongoDB PHP Library with practical examples.

---

## Setup

```bash
composer require mongodb/mongodb
```

```php
<?php
require 'vendor/autoload.php';

use MongoDB\Client;
use MongoDB\BSON\ObjectId;

$client = new Client('mongodb://localhost:27017');
$products = $client->shopdb->products;
```

## Create - Insert Documents

```php
// Insert one document
$result = $products->insertOne([
    'name'     => 'Wireless Keyboard',
    'price'    => 49.99,
    'category' => 'electronics',
    'stock'    => 100,
]);

echo "Inserted ID: " . $result->getInsertedId() . "\n";
echo "Inserted count: " . $result->getInsertedCount() . "\n";

// Insert many documents
$result = $products->insertMany([
    ['name' => 'Mouse',   'price' => 29.99, 'category' => 'electronics', 'stock' => 200],
    ['name' => 'Monitor', 'price' => 299.99,'category' => 'electronics', 'stock' => 50],
]);

echo "Inserted: " . $result->getInsertedCount() . " documents\n";
```

## Read - Find Documents

```php
// Find one
$keyboard = $products->findOne(['name' => 'Wireless Keyboard']);
if ($keyboard) {
    echo "Found: {$keyboard['name']} at \${$keyboard['price']}\n";
}

// Find many
$electronics = $products->find(
    ['category' => 'electronics'],
    ['sort' => ['price' => 1], 'limit' => 10]
);

foreach ($electronics as $product) {
    echo "{$product['name']}: \${$product['price']}\n";
}

// Find with comparison operators
$affordable = $products->find([
    'category' => 'electronics',
    'price'    => ['$lte' => 100],
    'stock'    => ['$gt' => 0],
]);

// Find by ObjectId
$id = new ObjectId('507f1f77bcf86cd799439011');
$byId = $products->findOne(['_id' => $id]);
```

## Projection and Options

```php
$summaries = $products->find(
    ['category' => 'electronics'],
    [
        'projection' => ['name' => 1, 'price' => 1, '_id' => 0],
        'sort'       => ['price' => -1],
        'skip'       => 0,
        'limit'      => 20,
    ]
);
```

## Update - Modify Documents

```php
// Update one
$result = $products->updateOne(
    ['name' => 'Wireless Keyboard'],
    [
        '$set' => ['price' => 44.99],
        '$inc' => ['stock' => -1],
    ]
);

echo "Matched: {$result->getMatchedCount()}, "
   . "Modified: {$result->getModifiedCount()}\n";

// Update many
$products->updateMany(
    ['stock' => 0],
    ['$set' => ['available' => false]]
);

// Replace entire document
$products->replaceOne(
    ['name' => 'Wireless Keyboard'],
    ['name' => 'Wireless Keyboard Pro', 'price' => 59.99, 'category' => 'electronics', 'stock' => 75]
);

// Upsert
$products->updateOne(
    ['name' => 'New Product'],
    [
        '$setOnInsert' => ['name' => 'New Product'],
        '$set'         => ['price' => 19.99, 'stock' => 50],
    ],
    ['upsert' => true]
);
```

## Delete - Remove Documents

```php
// Delete one
$result = $products->deleteOne(['name' => 'Wireless Keyboard']);
echo "Deleted: {$result->getDeletedCount()}\n";

// Delete many
$products->deleteMany(['category' => 'discontinued']);
```

## Find and Modify (Atomic)

```php
// findOneAndUpdate - returns the document after modification
$updated = $products->findOneAndUpdate(
    ['name' => 'Wireless Keyboard'],
    ['$inc' => ['stock' => -1]],
    ['returnDocument' => MongoDB\Operation\FindOneAndUpdate::RETURN_DOCUMENT_AFTER]
);

echo "New stock: {$updated['stock']}\n";

// findOneAndDelete
$deleted = $products->findOneAndDelete(['name' => 'Old Product']);
```

## Counting Documents

```php
// Exact count with filter
$count = $products->countDocuments(['category' => 'electronics']);
echo "Electronics: $count\n";

// Fast estimated count (uses collection metadata)
$total = $products->estimatedDocumentCount();
echo "Total: $total\n";
```

## Distinct Values

```php
$categories = $products->distinct('category', []);
print_r($categories);

// Distinct with filter
$pricePoints = $products->distinct('price', ['category' => 'electronics']);
```

## Summary

The MongoDB PHP Library provides a clean, expressive API for all CRUD operations. Use `insertOne`/`insertMany` for creates, `find`/`findOne` with filter arrays for reads (using the same operator syntax as MongoDB query documents), `updateOne`/`updateMany` with `$set`, `$inc`, and other update operators for updates, and `deleteOne`/`deleteMany` for removes. Use `findOneAndUpdate` for atomic read-modify operations.
