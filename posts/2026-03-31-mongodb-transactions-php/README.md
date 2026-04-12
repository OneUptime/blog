# How to Use Transactions with MongoDB PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PHP, Transaction, ACID, Session

Description: Learn how to use multi-document ACID transactions in MongoDB from PHP using sessions and the transactional callback pattern.

---

## Overview

MongoDB supports multi-document ACID transactions on replica sets and sharded clusters (4.0+). The PHP Library provides session-based transactions through `startSession()` on the `MongoDB\Client`. All operations that pass the session object participate in the same transaction.

## Prerequisites

- MongoDB 4.0+ replica set or sharded cluster.

```bash
composer require mongodb/mongodb
```

## Basic Transaction

```php
<?php
require 'vendor/autoload.php';

use MongoDB\Client;

$client = new Client('mongodb://localhost:27017');
$db = $client->shopdb;
$accounts = $db->accounts;

$session = $client->startSession();
$session->startTransaction([
    'readConcern'  => new \MongoDB\Driver\ReadConcern('snapshot'),
    'writeConcern' => new \MongoDB\Driver\WriteConcern('majority'),
]);

try {
    // Debit account A
    $accounts->updateOne(
        ['accountId' => 'A'],
        ['$inc' => ['balance' => -200]],
        ['session' => $session]
    );

    // Credit account B
    $accounts->updateOne(
        ['accountId' => 'B'],
        ['$inc' => ['balance' => 200]],
        ['session' => $session]
    );

    $session->commitTransaction();
    echo "Transfer committed successfully\n";
} catch (\Exception $e) {
    $session->abortTransaction();
    echo "Transaction aborted: " . $e->getMessage() . "\n";
    throw $e;
} finally {
    $session->endSession();
}
```

## Using the Transactional Callback (Recommended)

The `MongoDB\with_transaction()` function handles starting, committing, and retrying transactions automatically:

```php
use MongoDB\Driver\Session;
use function MongoDB\with_transaction;

function transferFunds(Client $client, string $from, string $to, float $amount): void
{
    $accounts = $client->shopdb->accounts;
    $session = $client->startSession();

    $callback = function (Session $session) use ($accounts, $from, $to, $amount): void {
        $accounts->updateOne(
            ['accountId' => $from],
            ['$inc' => ['balance' => -$amount]],
            ['session' => $session]
        );

        $accounts->updateOne(
            ['accountId' => $to],
            ['$inc' => ['balance' => $amount]],
            ['session' => $session]
        );
    };

    with_transaction($session, $callback, [
        'readConcern'  => new \MongoDB\Driver\ReadConcern('snapshot'),
        'writeConcern' => new \MongoDB\Driver\WriteConcern('majority'),
    ]);
}

transferFunds($client, 'A', 'B', 200.0);
```

## Cross-Collection Transaction

```php
$session = $client->startSession();
$session->startTransaction();

try {
    $orders = $client->shopdb->orders;
    $inventory = $client->shopdb->inventory;

    // Create order
    $orders->insertOne([
        'customerId' => 'cust-001',
        'productId'  => 'prod-001',
        'quantity'   => 2,
        'status'     => 'CONFIRMED',
    ], ['session' => $session]);

    // Decrement inventory
    $result = $inventory->updateOne(
        [
            'productId' => 'prod-001',
            'quantity'  => ['$gte' => 2],
        ],
        ['$inc' => ['quantity' => -2]],
        ['session' => $session]
    );

    if ($result->getModifiedCount() === 0) {
        throw new \RuntimeException('Insufficient inventory');
    }

    $session->commitTransaction();
    echo "Order placed\n";
} catch (\Exception $e) {
    $session->abortTransaction();
    echo "Failed: " . $e->getMessage() . "\n";
} finally {
    $session->endSession();
}
```

## Transaction Options

```php
$session->startTransaction([
    'readConcern'  => new \MongoDB\Driver\ReadConcern('snapshot'),
    'writeConcern' => new \MongoDB\Driver\WriteConcern('majority'),
    'readPreference' => new \MongoDB\Driver\ReadPreference(
        \MongoDB\Driver\ReadPreference::PRIMARY),
    'maxCommitTimeMS' => 5000,
]);
```

## Summary

MongoDB PHP transactions use a `MongoDB\Driver\Session` created via `$client->startSession()`. Pass the session in the options array to every operation that should participate in the transaction. Use `MongoDB\with_transaction()` to automatically handle retries on `TransientTransactionError` and `UnknownTransactionCommitResult` error labels. When managing transactions manually, always call `$session->endSession()` in a `finally` block, and pass `'session' => $session` to every collection operation inside the transaction.
