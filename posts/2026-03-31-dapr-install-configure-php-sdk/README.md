# How to Install and Configure the Dapr PHP SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PHP, SDK, Installation, Configuration

Description: Learn how to install the Dapr PHP SDK using Composer, configure the client, and connect your PHP application to the Dapr sidecar for state and pub/sub.

---

## Introduction

The Dapr PHP SDK (`dapr/php-sdk`) lets PHP applications use Dapr building blocks including state management, pub/sub, service invocation, and actors. This guide covers installation, basic configuration, and your first Dapr-enabled PHP application.

## Prerequisites

- PHP 8.4 or higher
- Composer
- Dapr CLI installed

```bash
dapr init
```

## Installing the SDK

```bash
composer require dapr/php-sdk
```

## Project Structure

```text
my-dapr-app/
  src/
    app.php
  components/
    statestore.yaml
    pubsub.yaml
  composer.json
```

## Configuring the Dapr Client

The PHP SDK reads the Dapr sidecar address from environment variables or defaults to `localhost:3500`:

```php
<?php
// src/app.php
require_once __DIR__ . '/../vendor/autoload.php';

use Dapr\Client\DaprClient;

// Default: connects to http://127.0.0.1:3500
$client = DaprClient::clientBuilder()->build();

echo "Dapr client created successfully\n";
```

## Using Dependency Injection with PHP-DI

The SDK supports PHP-DI for injecting the Dapr runtime:

```php
<?php
use Dapr\App;
use Dapr\Client\DaprClient;

$app = App::create();
$client = $app->run(fn(DaprClient $client) => $client);
```

## Saving and Reading State

```php
<?php
use Dapr\Client\DaprClient;

$client = DaprClient::clientBuilder()->build();

// Save state
$client->saveState(
    storeName: 'statestore',
    key: 'user-001',
    value: ['name' => 'Alice', 'email' => 'alice@example.com']
);

// Read state
$state = $client->getState(
    storeName: 'statestore',
    key: 'user-001',
    asType: 'array'
);
echo "Name: " . $state->value['name'] . "\n";
```

## Component Configuration

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: redisPassword
      value: ""
```

## Running the PHP App with Dapr

```bash
dapr run \
  --app-id php-app \
  --app-port 8080 \
  --components-path ./components \
  -- php -S 0.0.0.0:8080 src/app.php
```

## Verifying the Connection

```bash
# Check Dapr sidecar is running
dapr list

# Test state via Dapr HTTP API directly
curl http://localhost:3500/v1.0/state/statestore/user-001
```

## Environment Variable Configuration

```bash
# Override Dapr sidecar port
export DAPR_HTTP_PORT=3500

# App token for Dapr API auth
export APP_API_TOKEN=your-token
```

## Summary

Installing the Dapr PHP SDK requires Composer and a running Dapr sidecar. The `DaprClient` connects automatically using the standard Dapr port conventions. Once configured, your PHP application gains access to all Dapr building blocks through a clean, typed API that works identically across all environments.
