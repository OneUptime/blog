# How to Build Microservices with Dapr and PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PHP, Microservice, Architecture, Service Invocation

Description: Learn how to build a PHP microservices system with Dapr, covering service invocation, pub/sub communication, and shared state between PHP services.

---

## Introduction

Dapr enables PHP developers to build microservices without directly managing service discovery, load balancing, or message broker connectivity. This guide builds two PHP services - an order service and a notification service - that communicate through Dapr service invocation and pub/sub.

## Architecture

- `order-service` (port 8081) - creates orders, saves state, publishes events
- `notification-service` (port 8082) - subscribes to order events, sends notifications

## Order Service

```php
<?php
// order-service/index.php
require_once __DIR__ . '/vendor/autoload.php';

use Dapr\Client\DaprClient;

$client = DaprClient::clientBuilder()->build();
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if ($path === '/orders' && $method === 'POST') {
    $order    = json_decode(file_get_contents('php://input'), true);
    $orderId  = $order['id'] ?? uniqid('ORD-');

    // Persist the order
    $client->saveState('statestore', $orderId, $order);

    // Notify other services
    $client->publishEvent('pubsub', 'order-created', array_merge($order, [
        'order_id'   => $orderId,
        'created_at' => date('c')
    ]));

    header('Content-Type: application/json');
    echo json_encode(['order_id' => $orderId, 'status' => 'created']);
    exit;
}

if ($path === '/orders' && $method === 'GET') {
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $orderId = $params['id'] ?? '';
    $state   = $client->getState('statestore', $orderId, 'array');
    header('Content-Type: application/json');
    echo json_encode($state ?? ['error' => 'not found']);
    exit;
}

// Service invocation - get order status
if (preg_match('#^/orders/([^/]+)/status$#', $path, $m)) {
    $orderId = $m[1];
    $state   = $client->getState('statestore', $orderId, 'array');
    header('Content-Type: application/json');
    echo json_encode(['order_id' => $orderId, 'status' => $state['status'] ?? 'unknown']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'not found']);
```

## Notification Service

```php
<?php
// notification-service/index.php
require_once __DIR__ . '/vendor/autoload.php';

$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if ($path === '/dapr/subscribe' && $method === 'GET') {
    header('Content-Type: application/json');
    echo json_encode([
        ['pubsubname' => 'pubsub', 'topic' => 'order-created', 'route' => '/notify']
    ]);
    exit;
}

if ($path === '/notify' && $method === 'POST') {
    $body  = json_decode(file_get_contents('php://input'), true);
    $order = $body['data'] ?? [];
    $id    = $order['order_id'] ?? 'unknown';
    $item  = $order['item'] ?? 'item';

    // In real usage: send email/SMS/Slack notification
    error_log("NOTIFICATION: Order {$id} created for {$item}");

    header('Content-Type: application/json');
    echo json_encode(['status' => 'SUCCESS']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'not found']);
```

## Running Both Services

```bash
# Terminal 1
dapr run --app-id order-service --app-port 8081 \
  -- php -S 0.0.0.0:8081 order-service/index.php

# Terminal 2
dapr run --app-id notification-service --app-port 8082 \
  -- php -S 0.0.0.0:8082 notification-service/index.php
```

## Service-to-Service Invocation

```bash
dapr invoke \
  --app-id order-service \
  --method orders \
  --verb POST \
  --data '{"id":"ORD-100","item":"laptop","qty":1}'
```

## Checking Notification Logs

```bash
# The notification service will log something like:
# NOTIFICATION: Order ORD-100 created for laptop
```

## Summary

Dapr removes the infrastructure complexity from PHP microservices. The order service uses `DaprClient` to persist state and publish events, while the notification service subscribes via the standard Dapr HTTP protocol. Both services are independent PHP processes, each with its own Dapr sidecar, and they communicate without direct network dependencies.
