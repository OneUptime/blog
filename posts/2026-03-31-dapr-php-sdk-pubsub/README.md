# How to Use Dapr PHP SDK for Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PHP, Pub/Sub, Messaging, Event-Driven

Description: Learn how to publish and subscribe to events in PHP applications using the Dapr PHP SDK, with attribute-based topic registration and event handling.

---

## Introduction

Dapr Pub/Sub enables PHP microservices to communicate asynchronously through a message broker. The Dapr PHP SDK provides attributes and a routing mechanism to register topic subscriptions and publish events using the `DaprClient`. This guide covers both publishing and subscribing patterns.

## Prerequisites

```bash
composer require dapr/php-sdk
dapr init
```

## Publishing an Event

Use `DaprClient::publishEvent` to publish to any configured pubsub component:

```php
<?php
require_once 'vendor/autoload.php';

use Dapr\Client\DaprClient;

$client = DaprClient::clientBuilder()->build();

$orderPayload = [
    'order_id' => 'ORD-001',
    'item'     => 'widget',
    'quantity' => 5,
    'amount'   => 49.95
];

$client->publishEvent(
    pubsubName: 'pubsub',
    topicName: 'orders',
    data: $orderPayload
);

echo "Published order ORD-001\n";
```

## Subscribing with the SDK's App Class

The PHP SDK provides an `App` class that handles subscription registration and routing via the DI container. Configure subscriptions using `Subscription` objects:

```php
<?php
require_once 'vendor/autoload.php';

use Dapr\App;
use Dapr\PubSub\Subscription;

$app = App::create(configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions([
    'dapr.subscriptions' => [
        new Subscription('pubsub', 'orders', '/handle-order'),
    ],
]));

$app->post('/handle-order', function () {
    $body = json_decode(file_get_contents('php://input'), true);
    $order = $body['data'] ?? [];
    echo "Received order: " . $order['order_id'] . "\n";
    echo "Processing item: " . $order['item'] . " x" . $order['quantity'] . "\n";
    return ['status' => 'SUCCESS'];
});

$app->start();
```

The handler returns `['status' => 'SUCCESS']` to acknowledge the message. You can also return `['status' => 'RETRY']` to requeue or `['status' => 'DROP']` to discard it.

## Manual Subscription Registration

For frameworks without attribute support, register subscriptions via the `/dapr/subscribe` endpoint:

```php
<?php
// router.php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($path === '/dapr/subscribe' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json');
    echo json_encode([
        [
            'pubsubname' => 'pubsub',
            'topic'      => 'orders',
            'route'      => '/handle-order'
        ]
    ]);
    exit;
}

if ($path === '/handle-order' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $order = $body['data'] ?? [];
    echo "Processing: " . json_encode($order) . "\n";
    header('Content-Type: application/json');
    echo json_encode(['status' => 'SUCCESS']);
    exit;
}
```

## Dead Letter Topics

Configure a dead letter topic for failed messages:

```php
<?php
// Registration with dead letter
$subscriptions = [
    [
        'pubsubname'      => 'pubsub',
        'topic'           => 'orders',
        'route'           => '/handle-order',
        'deadLetterTopic' => 'orders-dlq'
    ]
];
```

## Running the PHP App

```bash
dapr run \
  --app-id php-pubsub \
  --app-port 8080 \
  --components-path ./components \
  -- php -S 0.0.0.0:8080 router.php
```

## Testing Pub/Sub

```bash
dapr publish \
  --publish-app-id php-pubsub \
  --pubsub pubsub \
  --topic orders \
  --data '{"order_id":"ORD-001","item":"widget","quantity":5}'
```

## Summary

The Dapr PHP SDK supports both programmatic (via the `App` class and `Subscription` objects) and manual subscription registration. Publishing events requires only a `DaprClient` instance and a call to `publishEvent`. The SUCCESS/RETRY/DROP status responses control message acknowledgment behavior, giving you fine-grained control over message processing semantics.
