# How to Use Dapr PHP App for HTTP Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PHP, HTTP, Service Invocation, Microservice

Description: Learn how to build a Dapr-enabled PHP HTTP service that handles service invocations, registers subscriptions, and integrates with other Dapr microservices.

---

## Introduction

A Dapr PHP HTTP service is a standard PHP application that exposes endpoints following the Dapr protocol. Dapr's sidecar handles service discovery, retries, and mTLS while forwarding requests to your PHP application. This guide builds a complete PHP HTTP service with service invocation and pub/sub integration.

## Prerequisites

```bash
composer require dapr/php-sdk guzzlehttp/guzzle
dapr init
```

## Application Structure

```text
php-service/
  public/
    index.php
  src/
    Router.php
    OrderHandler.php
  components/
    statestore.yaml
    pubsub.yaml
  composer.json
```

## The Router

```php
<?php
// src/Router.php
namespace App;

class Router {
    private array $routes = [];

    public function get(string $path, callable $handler): void {
        $this->routes['GET'][$path] = $handler;
    }

    public function post(string $path, callable $handler): void {
        $this->routes['POST'][$path] = $handler;
    }

    public function dispatch(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        $path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $handler = $this->routes[$method][$path] ?? null;

        if ($handler) {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            $response = $handler($body);
            header('Content-Type: application/json');
            echo json_encode($response);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Not found']);
        }
    }
}
```

## The Order Handler

```php
<?php
// src/OrderHandler.php
namespace App;

use Dapr\Client\DaprClient;

class OrderHandler {
    private DaprClient $dapr;

    public function __construct() {
        $this->dapr = DaprClient::clientBuilder()->build();
    }

    public function create(array $body): array {
        $orderId = $body['id'] ?? uniqid('ORD-');
        $this->dapr->saveState('statestore', $orderId, $body);
        $this->dapr->publishEvent('pubsub', 'orders', $body);
        return ['order_id' => $orderId, 'status' => 'created'];
    }

    public function get(string $orderId): array {
        $state = $this->dapr->getState('statestore', $orderId, 'array');
        return $state ?? ['error' => 'not found'];
    }

    public function subscribe(): array {
        return [[
            'pubsubname' => 'pubsub',
            'topic'      => 'order-updates',
            'route'      => '/order-update'
        ]];
    }

    public function handleUpdate(array $body): array {
        $order = $body['data'] ?? [];
        echo "Order updated: " . json_encode($order) . "\n";
        return ['status' => 'SUCCESS'];
    }
}
```

## Entry Point

```php
<?php
// public/index.php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Router;
use App\OrderHandler;

$router  = new Router();
$handler = new OrderHandler();

$router->get('/dapr/subscribe', fn() => $handler->subscribe());
$router->post('/orders', fn($body) => $handler->create($body));
$router->post('/order-update', fn($body) => $handler->handleUpdate($body));

$router->dispatch();
```

## Running the Service

```bash
dapr run \
  --app-id order-php-service \
  --app-port 8080 \
  --resources-path ./components \
  -- php -S 0.0.0.0:8080 public/index.php
```

## Invoking from Another Service

```bash
dapr invoke \
  --app-id order-php-service \
  --method orders \
  --verb POST \
  --data '{"id":"ORD-42","item":"gadget","qty":2}'
```

## Invoking via DaprClient in Another PHP Service

```php
<?php
use Dapr\Client\DaprClient;
use Dapr\Client\AppId;

$client = DaprClient::clientBuilder()->build();
$response = $client->invokeMethod('POST', new AppId('order-php-service'), 'orders', [
    'id'   => 'ORD-43',
    'item' => 'doohickey'
]);
echo $response->getBody();
```

## Summary

A Dapr PHP HTTP service follows the same pattern as any other Dapr service: expose the `/dapr/subscribe` endpoint for topic registration, and implement route handlers for service invocations and pub/sub events. The Dapr sidecar handles all networking, discovery, and security concerns, keeping your PHP code focused on business logic.
