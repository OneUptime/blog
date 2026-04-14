# Validation Summary: How to Build Dapr Actors with PHP SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr PHP SDK (`dapr/php-sdk`)
- Dapr Actors (virtual actor model)
- PHP 8.x (attributes, named arguments, constructor promotion)
- Composer (dependency management)
- Dapr HTTP API for actor invocation

## Sources Consulted
- Dapr PHP SDK source code on GitHub: https://github.com/dapr/php-sdk
- Dapr PHP SDK `Actor` base class, `ActorState`, `ActorProxy`, `Reminder`, `Timer` source files
- Dapr Actors documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/
- Dapr HTTP API reference for actors: https://docs.dapr.io/reference/api/actors_api/

## Issues Found

### 1. Actor state management pattern was completely wrong
**What was wrong:** The post used a fabricated `$this->stateManager->get()` / `$this->stateManager->set()` API that does not exist in the Dapr PHP SDK. The SDK does not have a `stateManager` property on actors.
**What was changed:** Replaced with the correct `ActorState` subclass pattern. Added a `CounterState` class extending `ActorState` with public properties (`$count`, `$history`) that are automatically persisted via PHP magic methods. Actor methods now access state through `$this->state->count` and `$this->state->history`.

### 2. Actor lifecycle method names were wrong (camelCase vs snake_case)
**What was wrong:** `onActivate()` and `onDeactivate()` do not exist. The SDK uses snake_case.
**What was changed:** Renamed to `on_activation()` and `on_deactivation()`.

### 3. Actor constructor was missing
**What was wrong:** The actor class had no constructor. In the Dapr PHP SDK, actors must accept `string $id` and their `ActorState` subclass via the constructor, and call `parent::__construct($id)`.
**What was changed:** Added proper constructor with `string $id` and `CounterState $state` injection using PHP constructor promotion.

### 4. `App::create()` parameters were wrong
**What was wrong:** Used `configuration: []` and `register: function(...)` named parameters, which don't exist. The actual parameter is `configure`.
**What was changed:** Fixed to `configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions([...])`.

### 5. Actor registration method was wrong
**What was wrong:** `$app->register_actor(CounterActor::class)` does not exist. Actors are registered via the DI container.
**What was changed:** Actors are now registered through the `'dapr.actors'` DI container definition inside the `configure` callback.

### 6. Actor proxy retrieval was wrong
**What was wrong:** `$app->get_actor_proxy()` does not exist on the `App` class.
**What was changed:** Replaced with `ActorProxy` injected via DI into route callbacks, using `$actorProxy->get(InterfaceName::class, $actorId)`.

### 7. Timer and Reminder APIs were completely wrong
**What was wrong:** Used `createReminder()`, `createTimer()`, `deleteTimer()` (camelCase) with array arguments and string time formats like `'0h30m0s'`. These methods don't exist.
**What was changed:** Replaced with `create_reminder(new Reminder(...))`, `create_timer(new Timer(...))`, and `delete_timer(...)` using `DateInterval` objects for time values.

### 8. Reminder handler method was wrong
**What was wrong:** Used `receiveReminder(string $reminderName, mixed $data)`. This method doesn't exist.
**What was changed:** Replaced with `remind(string $name, Reminder $data)`.

### 9. Missing state class for SessionActor example
**What was wrong:** The SessionActor used the fabricated `$this->stateManager` pattern.
**What was changed:** Added `SessionState extends ActorState` class with `$last_activity` and `$status` properties, and updated SessionActor to use constructor injection and property access.

### 10. Project structure was missing CounterState.php
**What was wrong:** The file listing didn't include the required state class file.
**What was changed:** Added `CounterState.php` to the project structure listing.

### 11. Unused import
**What was wrong:** `use Dapr\Actors\ActorState;` was imported but never used in CounterActor.
**What was changed:** Removed the unused import (ActorState is used in the separate CounterState class).

## Review Notes
- The Dapr HTTP API examples (curl commands) for invoking actor methods and managing actor state are correct and match the official Dapr API reference.
- The `dapr run` command syntax is correct.
- The Composer package name `dapr/php-sdk` and version constraint `^1.1` are valid.
- The `#[DaprType('CounterActor')]` attribute usage on both the interface and class is correct.
- The Dapr PHP SDK's last stable release is v1.2.0. The `main` branch requires PHP 8.4+, but the published version works with PHP 8.0+.
- The `ActorState` magic property pattern means array append operations (`$this->state->history[] = [...]`) won't trigger `__set`. The corrected code reads the array into a local variable, appends, and writes it back.
