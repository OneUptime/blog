# How to Use Dapr Actors with PHP SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PHP, Actor, Distributed Computing, State Management

Description: Learn how to implement Dapr Virtual Actors in PHP using the PHP SDK, including actor interfaces, state persistence, timers, and reminders.

---

## Introduction

Dapr Virtual Actors implement the actor model for distributed systems. Each actor is a single-threaded, stateful object identified by a unique ID. The Dapr PHP SDK provides interfaces and traits to implement actors that can be invoked from any Dapr-enabled service. This guide builds a simple counter actor with state, timers, and reminders.

## Prerequisites

```bash
composer require dapr/php-sdk
dapr init
```

## Defining the Actor Interface

```php
<?php
// src/Actors/CounterInterface.php
namespace App\Actors;

interface CounterInterface extends \Dapr\Actors\IActor {
    public function increment(): int;
    public function decrement(): int;
    public function get_count(): int;
    public function reset(): void;
}
```

## Defining the Actor State

```php
<?php
// src/Actors/CounterState.php
namespace App\Actors;

use Dapr\Actors\ActorState;

class CounterState extends ActorState {
    public int $count = 0;
}
```

## Implementing the Actor

```php
<?php
// src/Actors/Counter.php
namespace App\Actors;

use Dapr\Actors\Actor;
use Dapr\Actors\Attributes\DaprType;

#[DaprType('Counter')]
class Counter extends Actor implements CounterInterface {

    public function __construct(string $id, private CounterState $state) {
        parent::__construct($id);
    }

    public function on_activation(): void {
        echo "Counter {$this->get_id()} activated with count={$this->state->count}\n";
    }

    public function increment(): int {
        return $this->state->count += 1;
    }

    public function decrement(): int {
        $this->state->count = max(0, $this->state->count - 1);
        return $this->state->count;
    }

    public function get_count(): int {
        return $this->state->count;
    }

    public function reset(): void {
        $this->state->count = 0;
    }
}
```

## Registering the Actor

```php
<?php
// src/app.php
use Dapr\App;
use App\Actors\Counter;

$app = App::create(
    configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions([
        'dapr.actors' => [Counter::class],
    ])
);
$app->start();
```

## Adding Timers and Reminders

```php
<?php
// Inside the Counter actor class

use Dapr\Actors\Timer;
use Dapr\Actors\Reminder;

public function startTimer(): void {
    $this->create_timer(new Timer(
        name: 'log-timer',
        due_time: new \DateInterval('PT5S'),
        period: new \DateInterval('PT30S'),
        callback: 'logCount'
    ));
}

public function logCount(): void {
    echo "Timer fired - current count: {$this->state->count}\n";
}

public function startReminder(): void {
    $this->create_reminder(new Reminder(
        name: 'daily-reset',
        due_time: new \DateInterval('P1D'),
        data: null,
        period: new \DateInterval('P1D')
    ));
}

public function remind(string $name, Reminder $data): void {
    if ($name === 'daily-reset') {
        $this->reset();
        echo "Counter reset by daily reminder\n";
    }
}
```

## Invoking the Actor from Another Service

```php
<?php
use Dapr\Actors\ActorProxy;
use App\Actors\CounterInterface;

// ActorProxy is retrieved from the DI container
$app = \Dapr\App::create();
$app->run(function(ActorProxy $actorProxy) {
    $counter = $actorProxy->get(CounterInterface::class, 'counter-1');
    $value = $counter->increment();
    echo "New count: {$value}\n";

    $current = $counter->get_count();
    echo "Current count: {$current}\n";
});
```

## Running the Actor App

```bash
dapr run \
  --app-id counter-actors \
  --app-port 8080 \
  -- php -S 0.0.0.0:8080 src/app.php
```

## Summary

Dapr Virtual Actors in PHP provide a simple programming model for stateful distributed objects. Each actor handles one request at a time, eliminating race conditions. State is automatically persisted to the configured state store, and reminders survive actor deactivation. The PHP SDK's actor proxy lets any service invoke actor methods transparently across the cluster.
