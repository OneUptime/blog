# Validation Summary: How to Use Dapr Actors with PHP SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr PHP SDK (`dapr/php-sdk`)
- PHP 8 (attributes syntax)
- Dapr Virtual Actors
- Dapr Timers and Reminders

## Sources Consulted
- Dapr PHP SDK source code on GitHub: https://github.com/dapr/php-sdk
- Dapr PHP SDK `src/lib/Actors/` directory (IActor.php, Actor.php, ActorTrait.php, ActorState.php, ActorProxy.php, Timer.php, Reminder.php)
- Dapr PHP SDK `src/lib/Actors/Attributes/DaprType.php`
- Dapr PHP SDK examples directory
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/php/

## Issues Found

### 1. State management pattern completely wrong
**What was wrong:** The post used `$this->stateManager->tryGet('count', 0)` and `$this->stateManager->set('count', $value)` to manage actor state. The PHP SDK does not have a `stateManager` property with `tryGet`/`set` methods.
**What was changed:** Replaced with the correct pattern: a dedicated `ActorState` subclass (`CounterState`) with typed public properties. State is injected via the actor constructor and accessed directly as `$this->state->count`. Added a new "Defining the Actor State" section.
**Why:** The PHP SDK uses typed state classes extending `Dapr\Actors\ActorState` with magic property access, not key-value state managers.

### 2. Lifecycle method name incorrect
**What was wrong:** Used `onActivate()` (camelCase).
**What was changed:** Changed to `on_activation()` (snake_case).
**Why:** The PHP SDK consistently uses snake_case for all method names. The correct lifecycle methods are `on_activation()` and `on_deactivation()`.

### 3. Actor ID access incorrect
**What was wrong:** Used `$this->id->id` to access the actor ID.
**What was changed:** Changed to `$this->get_id()`.
**Why:** The `Actor` base class provides `get_id()` method to retrieve the actor identifier.

### 4. Interface method names used camelCase
**What was wrong:** `getCount()` used camelCase.
**What was changed:** Changed to `get_count()` (snake_case) throughout the interface and implementation.
**Why:** The PHP SDK follows snake_case conventions.

### 5. Actor registration method incorrect
**What was wrong:** Used `$app->register_actor(Counter::class)` which does not exist.
**What was changed:** Replaced with the correct DI container configuration pattern: `App::create(configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions(['dapr.actors' => [Counter::class]]))`.
**Why:** The Dapr PHP SDK registers actors through the DI container configuration, not via a method on the App class.

### 6. Timer creation API completely wrong
**What was wrong:** Used `$this->registerTimer(name: ..., callback: ..., due_time: ..., period: ...)` with individual named parameters.
**What was changed:** Changed to `$this->create_timer(new Timer(name: ..., due_time: ..., period: ..., callback: ...))` using a `Timer` value object.
**Why:** The SDK uses `create_timer()` which accepts a `Dapr\Actors\Timer` object, not individual parameters.

### 7. Reminder creation API completely wrong
**What was wrong:** Used `$this->registerReminder(name: ..., data: ..., due_time: ..., period: ...)` with individual parameters.
**What was changed:** Changed to `$this->create_reminder(new Reminder(name: ..., due_time: ..., data: ..., period: ...))` using a `Reminder` value object.
**Why:** The SDK uses `create_reminder()` which accepts a `Dapr\Actors\Reminder` object.

### 8. Reminder callback signature incorrect
**What was wrong:** Used `receiveReminder(string $reminderName, mixed $data)`.
**What was changed:** Changed to `remind(string $name, Reminder $data)`.
**Why:** The `IActor` interface defines the callback as `remind(string $name, Reminder $data)` where the second parameter is a `Reminder` object, not `mixed`.

### 9. ActorProxy usage completely wrong
**What was wrong:** Used `ActorProxy::create(CounterInterface::class, 'counter-1')` as a static factory.
**What was changed:** Changed to use DI-injected `ActorProxy` with `$actorProxy->get(CounterInterface::class, 'counter-1')` inside `$app->run()`.
**Why:** `ActorProxy` is not used statically. It is a service retrieved from the DI container, and the method to get a proxy is `get()`, not `create()`.

### 10. Actor constructor not defined
**What was wrong:** The actor class had no constructor, relying on a non-existent `stateManager`.
**What was changed:** Added explicit constructor `__construct(string $id, private CounterState $state)` with parent call.
**Why:** The state object must be injected through the constructor for the DI container to provide it.

## Review Notes
- The `dapr run` command shown for running the actor app is syntactically valid but uses PHP's built-in development server (`php -S`). The official PHP SDK examples use PHP-FPM with Caddy behind Docker Compose. The built-in server approach works for development but is not production-ready. This was left as-is since it is valid for a tutorial context.
- The post's overall structure and explanations of actor concepts (single-threaded, stateful, unique ID) are accurate.
- The `DaprType` attribute usage is correct.
- The `composer require dapr/php-sdk` and `dapr init` prerequisites are correct.
