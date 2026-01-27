# How to Use Laravel Events and Listeners

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Laravel, PHP, Events, Listeners, Architecture, Design Patterns

Description: Learn how to use Laravel's event system for decoupled application architecture, including event creation, listeners, subscribers, and queue integration.

---

> Events let you decouple parts of your application so that when something happens in one place, other parts can react without knowing about each other. This is the foundation of maintainable, scalable Laravel applications.

Laravel's event system provides a simple observer pattern implementation that allows you to subscribe and listen to events in your application. Events serve as a great way to decouple various aspects of your application since a single event can have multiple listeners that do not depend on each other.

## What Are Events and Listeners?

**Events** represent something that happened in your application - a user registered, an order was placed, a payment was processed. They are simple classes that hold data about what occurred.

**Listeners** are classes that handle events. When an event is dispatched, all registered listeners for that event are executed. A single event can have multiple listeners, and listeners can be queued for asynchronous processing.

```php
// The flow: Action -> Event -> Listener(s) -> Side effects
// User registers -> UserRegistered event -> SendWelcomeEmail listener -> Email sent
```

## Creating Events

Generate an event class using Artisan:

```bash
php artisan make:event OrderPlaced
```

This creates a new event in `app/Events`:

```php
<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderPlaced
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    // Public properties are automatically available to listeners
    public Order $order;
    public float $total;

    /**
     * Create a new event instance.
     * Pass all relevant data the listeners will need.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
        $this->total = $order->calculateTotal();
    }
}
```

## Creating Listeners

Generate a listener for your event:

```bash
php artisan make:listener SendOrderConfirmation --event=OrderPlaced
```

This creates a listener in `app/Listeners`:

```php
<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Mail\OrderConfirmation;
use Illuminate\Support\Facades\Mail;

class SendOrderConfirmation
{
    /**
     * Handle the event.
     * Access event data via the $event parameter.
     */
    public function handle(OrderPlaced $event): void
    {
        // Access the order from the event
        $order = $event->order;

        // Send confirmation email to customer
        Mail::to($order->customer->email)
            ->send(new OrderConfirmation($order));
    }
}
```

## Registering Events and Listeners

Register your events and listeners in `app/Providers/EventServiceProvider`:

```php
<?php

namespace App\Providers;

use App\Events\OrderPlaced;
use App\Events\PaymentProcessed;
use App\Listeners\SendOrderConfirmation;
use App\Listeners\UpdateInventory;
use App\Listeners\NotifyWarehouse;
use App\Listeners\SendPaymentReceipt;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     * One event can have multiple listeners.
     */
    protected $listen = [
        OrderPlaced::class => [
            SendOrderConfirmation::class,
            UpdateInventory::class,
            NotifyWarehouse::class,
        ],
        PaymentProcessed::class => [
            SendPaymentReceipt::class,
        ],
    ];
}
```

## Dispatching Events

Dispatch events from anywhere in your application:

```php
<?php

namespace App\Services;

use App\Events\OrderPlaced;
use App\Models\Order;

class OrderService
{
    public function createOrder(array $data): Order
    {
        // Create the order
        $order = Order::create($data);

        // Dispatch the event - all registered listeners will be triggered
        OrderPlaced::dispatch($order);

        // Alternative syntax using the event() helper
        // event(new OrderPlaced($order));

        return $order;
    }
}
```

## Event Subscribers

Event subscribers are classes that can subscribe to multiple events from within the class itself. This is useful when you have related event handling logic:

```php
<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Events\OrderShipped;
use App\Events\OrderDelivered;
use Illuminate\Events\Dispatcher;

class OrderEventSubscriber
{
    /**
     * Handle order placed events.
     */
    public function handleOrderPlaced(OrderPlaced $event): void
    {
        // Log the new order
        logger()->info('Order placed', ['order_id' => $event->order->id]);
    }

    /**
     * Handle order shipped events.
     */
    public function handleOrderShipped(OrderShipped $event): void
    {
        // Update tracking information
        logger()->info('Order shipped', ['order_id' => $event->order->id]);
    }

    /**
     * Handle order delivered events.
     */
    public function handleOrderDelivered(OrderDelivered $event): void
    {
        // Mark order as complete
        logger()->info('Order delivered', ['order_id' => $event->order->id]);
    }

    /**
     * Register the listeners for the subscriber.
     * Maps events to methods within this class.
     */
    public function subscribe(Dispatcher $events): void
    {
        $events->listen(
            OrderPlaced::class,
            [OrderEventSubscriber::class, 'handleOrderPlaced']
        );

        $events->listen(
            OrderShipped::class,
            [OrderEventSubscriber::class, 'handleOrderShipped']
        );

        $events->listen(
            OrderDelivered::class,
            [OrderEventSubscriber::class, 'handleOrderDelivered']
        );
    }
}
```

Register the subscriber in `EventServiceProvider`:

```php
protected $subscribe = [
    OrderEventSubscriber::class,
];
```

## Queued Listeners for Async Processing

For time-consuming tasks like sending emails or processing payments, queue your listeners:

```php
<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Mail\OrderConfirmation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

// Implement ShouldQueue to make the listener asynchronous
class SendOrderConfirmation implements ShouldQueue
{
    use InteractsWithQueue;

    // Specify which queue connection to use
    public $connection = 'redis';

    // Specify which queue to use
    public $queue = 'emails';

    // Number of seconds before the job times out
    public $timeout = 60;

    // Number of times to attempt the job
    public $tries = 3;

    /**
     * Handle the event asynchronously.
     */
    public function handle(OrderPlaced $event): void
    {
        Mail::to($event->order->customer->email)
            ->send(new OrderConfirmation($event->order));
    }

    /**
     * Determine whether the listener should be queued.
     * Return false to process synchronously for specific conditions.
     */
    public function shouldQueue(OrderPlaced $event): bool
    {
        // Only queue if the customer wants email notifications
        return $event->order->customer->email_notifications;
    }

    /**
     * Handle a job failure.
     */
    public function failed(OrderPlaced $event, \Throwable $exception): void
    {
        // Log the failure for investigation
        logger()->error('Failed to send order confirmation', [
            'order_id' => $event->order->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

## Model Events and Observers

Laravel models fire several events during their lifecycle. Use observers to listen to these events:

```bash
php artisan make:observer UserObserver --model=User
```

```php
<?php

namespace App\Observers;

use App\Models\User;
use App\Services\AuditService;

class UserObserver
{
    public function __construct(
        private AuditService $auditService
    ) {}

    /**
     * Handle the User "created" event.
     * Fires after a new user is saved to the database.
     */
    public function created(User $user): void
    {
        $this->auditService->log('user_created', $user);
    }

    /**
     * Handle the User "updated" event.
     * Fires after an existing user is updated.
     */
    public function updated(User $user): void
    {
        // Check what changed
        $changes = $user->getChanges();

        if (isset($changes['email'])) {
            // Email was changed - verify the new one
            $user->sendEmailVerificationNotification();
        }

        $this->auditService->log('user_updated', $user, $changes);
    }

    /**
     * Handle the User "deleted" event.
     */
    public function deleted(User $user): void
    {
        $this->auditService->log('user_deleted', $user);
    }

    /**
     * Handle the User "forceDeleted" event.
     * Only fires when using forceDelete() on soft-deletable models.
     */
    public function forceDeleted(User $user): void
    {
        // Clean up related data that was not cascade deleted
        $this->auditService->log('user_force_deleted', $user);
    }
}
```

Register the observer in `AppServiceProvider`:

```php
<?php

namespace App\Providers;

use App\Models\User;
use App\Observers\UserObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Register the observer
        User::observe(UserObserver::class);
    }
}
```

## Broadcasting Events for Real-Time Features

Broadcast events to your frontend for real-time updates using WebSockets:

```php
<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

// Implement ShouldBroadcast to push to WebSocket server
class NewMessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Message $message
    ) {}

    /**
     * Get the channels the event should broadcast on.
     * PrivateChannel requires authentication.
     */
    public function broadcastOn(): array
    {
        return [
            // Only the conversation participants can receive this
            new PrivateChannel('conversation.' . $this->message->conversation_id),
        ];
    }

    /**
     * The event's broadcast name.
     * This is what the frontend listens for.
     */
    public function broadcastAs(): string
    {
        return 'message.received';
    }

    /**
     * Get the data to broadcast.
     * Only include what the frontend needs.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'content' => $this->message->content,
            'sender' => [
                'id' => $this->message->sender->id,
                'name' => $this->message->sender->name,
            ],
            'sent_at' => $this->message->created_at->toISOString(),
        ];
    }
}
```

Listen for the broadcast on the frontend:

```javascript
// Using Laravel Echo on the frontend
Echo.private(`conversation.${conversationId}`)
    .listen('.message.received', (data) => {
        // Add the new message to the UI
        console.log('New message:', data);
        addMessageToChat(data);
    });
```

## Event Discovery (Auto-Registration)

Laravel can automatically discover and register events and listeners. Enable this in `EventServiceProvider`:

```php
<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * Enable event discovery.
     * Laravel will scan the Listeners directory and auto-register.
     */
    public function shouldDiscoverEvents(): bool
    {
        return true;
    }

    /**
     * Get the directories to scan for events.
     */
    protected function discoverEventsWithin(): array
    {
        return [
            $this->app->path('Listeners'),
        ];
    }
}
```

With discovery enabled, Laravel uses the type-hint in the listener's `handle` method:

```php
// This listener will automatically be registered for OrderPlaced events
class SendOrderConfirmation
{
    public function handle(OrderPlaced $event): void  // <-- Auto-discovered via type-hint
    {
        // ...
    }
}
```

Cache discovered events in production for performance:

```bash
php artisan event:cache
```

## Testing Events and Listeners

Laravel provides helpers to test events without triggering actual listeners:

```php
<?php

namespace Tests\Feature;

use App\Events\OrderPlaced;
use App\Listeners\SendOrderConfirmation;
use App\Models\Order;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class OrderTest extends TestCase
{
    public function test_order_placed_event_is_dispatched(): void
    {
        // Fake all events - listeners will not run
        Event::fake();

        // Perform the action
        $order = Order::factory()->create();
        OrderPlaced::dispatch($order);

        // Assert the event was dispatched
        Event::assertDispatched(OrderPlaced::class);

        // Assert with specific data
        Event::assertDispatched(OrderPlaced::class, function ($event) use ($order) {
            return $event->order->id === $order->id;
        });
    }

    public function test_only_fake_specific_events(): void
    {
        // Only fake specific events - others work normally
        Event::fake([
            OrderPlaced::class,
        ]);

        // OrderPlaced will be faked, but other events fire normally
    }

    public function test_listener_handles_event_correctly(): void
    {
        // Test the listener in isolation
        $order = Order::factory()->create();
        $event = new OrderPlaced($order);

        $listener = new SendOrderConfirmation();
        $listener->handle($event);

        // Assert the listener did its job
        $this->assertDatabaseHas('email_logs', [
            'order_id' => $order->id,
            'type' => 'order_confirmation',
        ]);
    }

    public function test_event_has_correct_listeners(): void
    {
        // Assert specific listeners are attached to an event
        Event::assertListening(
            OrderPlaced::class,
            SendOrderConfirmation::class
        );
    }
}
```

## Best Practices Summary

1. **Keep events simple** - Events should only contain data, not logic. They are data transfer objects.

2. **Name events in past tense** - Use `OrderPlaced`, `UserRegistered`, `PaymentFailed` to indicate something that already happened.

3. **Queue heavy listeners** - Email sending, API calls, and file processing should always be queued.

4. **Use subscribers for related events** - Group related event handlers together for better organization.

5. **Test events separately from listeners** - Fake events when testing business logic, test listeners in isolation.

6. **Avoid circular dependencies** - Do not dispatch events from within listeners of the same event chain.

7. **Document your events** - Events form a contract between parts of your application. Document what data they contain.

8. **Use model observers sparingly** - They can hide important logic. Consider explicit events for critical business processes.

9. **Cache event discovery in production** - Run `php artisan event:cache` during deployment.

10. **Handle listener failures gracefully** - Implement the `failed` method on queued listeners for error handling.

---

Events and listeners are essential for building maintainable Laravel applications. They let different parts of your system communicate without tight coupling, making your code easier to test, extend, and reason about.

For monitoring your Laravel application's events and ensuring your queued listeners are processing reliably, check out [OneUptime](https://oneuptime.com) - a comprehensive observability platform that helps you track application performance and catch issues before they affect users.
