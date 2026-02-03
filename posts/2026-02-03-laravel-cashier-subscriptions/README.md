# How to Use Laravel Cashier for Subscriptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PHP, Laravel, Cashier, Stripe, Subscriptions, Payments

Description: Learn how to implement subscription billing in Laravel with Cashier. This guide covers Stripe integration, subscription management, and webhook handling.

---

Managing subscriptions in web applications used to require writing hundreds of lines of boilerplate code to handle recurring payments, trial periods, cancellations, and invoices. Laravel Cashier abstracts all of this complexity away, giving you a clean API to manage Stripe subscriptions with just a few method calls.

This guide walks through everything you need to build a production-ready subscription system: from initial setup through advanced features like metered billing, proration, and webhook handling.

## Why Laravel Cashier?

Before diving into code, here is why Cashier makes sense for Laravel applications:

- **Native Eloquent integration** - Subscription data lives alongside your user models
- **Stripe API abstraction** - No need to memorize Stripe's extensive API
- **Built-in webhook handling** - Automatically processes Stripe events
- **Invoice generation** - PDF invoices ready for download
- **Trial period management** - Both generic and subscription-specific trials
- **Multiple subscriptions** - Users can have different subscription types simultaneously

## Prerequisites

Before starting, you will need:

- Laravel 10.x or later
- PHP 8.1 or later
- A Stripe account (test mode works fine for development)
- Composer installed

## Installation

### Step 1: Install the Package

Install Cashier via Composer:

```bash
composer require laravel/cashier
```

### Step 2: Run Migrations

Cashier includes migrations that add several columns to your users table and create a subscriptions table:

```bash
php artisan migrate
```

This creates the following database structure:

```sql
-- Added to users table
ALTER TABLE users ADD COLUMN stripe_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN pm_type VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN pm_last_four VARCHAR(4) NULL;
ALTER TABLE users ADD COLUMN trial_ends_at TIMESTAMP NULL;

-- New subscriptions table
CREATE TABLE subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(255) NOT NULL,
    stripe_id VARCHAR(255) NOT NULL,
    stripe_status VARCHAR(255) NOT NULL,
    stripe_price VARCHAR(255) NULL,
    quantity INT NULL,
    trial_ends_at TIMESTAMP NULL,
    ends_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- New subscription_items table for multi-plan subscriptions
CREATE TABLE subscription_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT UNSIGNED NOT NULL,
    stripe_id VARCHAR(255) NOT NULL,
    stripe_product VARCHAR(255) NOT NULL,
    stripe_price VARCHAR(255) NOT NULL,
    quantity INT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);
```

### Step 3: Configure the Billable Model

Add the `Billable` trait to your User model:

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Cashier\Billable;

class User extends Authenticatable
{
    use Billable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'stripe_id',           // Hide Stripe ID from API responses
        'pm_type',
        'pm_last_four',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'trial_ends_at' => 'datetime',
    ];
}
```

### Step 4: Set Up Stripe API Keys

Add your Stripe credentials to your `.env` file:

```bash
# Get these from https://dashboard.stripe.com/apikeys
STRIPE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET=sk_test_your_secret_key_here

# Webhook secret for verifying Stripe events
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Optional: Set the currency (default is USD)
CASHIER_CURRENCY=usd
```

Then publish the Cashier configuration:

```bash
php artisan vendor:publish --tag="cashier-config"
```

This creates `config/cashier.php` where you can customize behavior:

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Stripe Keys
    |--------------------------------------------------------------------------
    |
    | The Stripe publishable key and secret key give you access to Stripe's
    | API. The "publishable" key is typically used when interacting with
    | Stripe.js while the "secret" key accesses private API endpoints.
    |
    */

    'key' => env('STRIPE_KEY'),

    'secret' => env('STRIPE_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Cashier Path
    |--------------------------------------------------------------------------
    |
    | This is the base URI path where Cashier's views, such as the payment
    | confirmation screen, will be available from. You are free to change
    | this path to anything you like.
    |
    */

    'path' => env('CASHIER_PATH', 'stripe'),

    /*
    |--------------------------------------------------------------------------
    | Stripe Webhooks
    |--------------------------------------------------------------------------
    |
    | Your Stripe webhook secret is used to prevent unauthorized requests to
    | your Stripe webhook handling controllers. The tolerance setting will
    | check the drift between the current time and the signed request's.
    |
    */

    'webhook' => [
        'secret' => env('STRIPE_WEBHOOK_SECRET'),
        'tolerance' => env('STRIPE_WEBHOOK_TOLERANCE', 300),
    ],

    /*
    |--------------------------------------------------------------------------
    | Currency
    |--------------------------------------------------------------------------
    |
    | This is the default currency that will be used when generating charges
    | from your application. Of course, you are free to use any of the
    | various world currencies that are currently supported via Stripe.
    |
    */

    'currency' => env('CASHIER_CURRENCY', 'usd'),

    /*
    |--------------------------------------------------------------------------
    | Currency Locale
    |--------------------------------------------------------------------------
    |
    | This is the default locale in which your money values are formatted for
    | display. To utilize other locales besides the default en locale verify
    | you have the ext-intl PHP extension installed on your system.
    |
    */

    'currency_locale' => env('CASHIER_CURRENCY_LOCALE', 'en'),

    /*
    |--------------------------------------------------------------------------
    | Invoice Paper Size
    |--------------------------------------------------------------------------
    |
    | This option specifies the default paper size for invoices generated by
    | Cashier. You are free to customize this to one of the supported sizes
    | which are: 'letter', 'legal', 'tabloid', 'ledger', 'a0' through 'a6'.
    |
    */

    'paper' => env('CASHIER_PAPER', 'letter'),

    /*
    |--------------------------------------------------------------------------
    | Stripe Logger
    |--------------------------------------------------------------------------
    |
    | This setting defines which logging channel will be used by the Stripe
    | library to write log messages. You are free to specify any of your
    | logging channels listed inside the "logging" configuration file.
    |
    */

    'logger' => env('CASHIER_LOGGER'),
];
```

## Setting Up Stripe Products and Prices

Before creating subscriptions, you need products and prices in Stripe. You can create these via the Stripe Dashboard or programmatically.

### Creating Products via Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Click "Add Product"
3. Enter product details (name, description, images)
4. Add pricing - select "Recurring" for subscriptions
5. Set the billing interval (monthly, yearly, etc.)
6. Save and note the Price ID (starts with `price_`)

### Creating Products Programmatically

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Stripe\StripeClient;

class SetupStripeProducts extends Command
{
    protected $signature = 'stripe:setup-products';
    protected $description = 'Create Stripe products and prices for subscriptions';

    public function handle(): int
    {
        $stripe = new StripeClient(config('cashier.secret'));

        // Create the Basic plan product
        $basicProduct = $stripe->products->create([
            'name' => 'Basic Plan',
            'description' => 'Essential features for small teams',
            'metadata' => [
                'features' => json_encode([
                    '5 team members',
                    '10 projects',
                    'Basic support',
                ]),
            ],
        ]);

        $this->info("Created Basic product: {$basicProduct->id}");

        // Create monthly price for Basic plan
        $basicMonthly = $stripe->prices->create([
            'product' => $basicProduct->id,
            'unit_amount' => 999,  // $9.99 in cents
            'currency' => 'usd',
            'recurring' => [
                'interval' => 'month',
            ],
            'metadata' => [
                'plan_type' => 'basic',
                'billing_cycle' => 'monthly',
            ],
        ]);

        $this->info("Created Basic monthly price: {$basicMonthly->id}");

        // Create yearly price for Basic plan (with discount)
        $basicYearly = $stripe->prices->create([
            'product' => $basicProduct->id,
            'unit_amount' => 9990,  // $99.90 in cents (2 months free)
            'currency' => 'usd',
            'recurring' => [
                'interval' => 'year',
            ],
            'metadata' => [
                'plan_type' => 'basic',
                'billing_cycle' => 'yearly',
            ],
        ]);

        $this->info("Created Basic yearly price: {$basicYearly->id}");

        // Create the Pro plan product
        $proProduct = $stripe->products->create([
            'name' => 'Pro Plan',
            'description' => 'Advanced features for growing teams',
            'metadata' => [
                'features' => json_encode([
                    'Unlimited team members',
                    'Unlimited projects',
                    'Priority support',
                    'Advanced analytics',
                    'Custom integrations',
                ]),
            ],
        ]);

        $this->info("Created Pro product: {$proProduct->id}");

        // Create monthly price for Pro plan
        $proMonthly = $stripe->prices->create([
            'product' => $proProduct->id,
            'unit_amount' => 2999,  // $29.99 in cents
            'currency' => 'usd',
            'recurring' => [
                'interval' => 'month',
            ],
            'metadata' => [
                'plan_type' => 'pro',
                'billing_cycle' => 'monthly',
            ],
        ]);

        $this->info("Created Pro monthly price: {$proMonthly->id}");

        // Create yearly price for Pro plan
        $proYearly = $stripe->prices->create([
            'product' => $proProduct->id,
            'unit_amount' => 29990,  // $299.90 in cents
            'currency' => 'usd',
            'recurring' => [
                'interval' => 'year',
            ],
            'metadata' => [
                'plan_type' => 'pro',
                'billing_cycle' => 'yearly',
            ],
        ]);

        $this->info("Created Pro yearly price: {$proYearly->id}");

        $this->newLine();
        $this->info('Add these price IDs to your config or .env file:');
        $this->table(
            ['Plan', 'Billing Cycle', 'Price ID'],
            [
                ['Basic', 'Monthly', $basicMonthly->id],
                ['Basic', 'Yearly', $basicYearly->id],
                ['Pro', 'Monthly', $proMonthly->id],
                ['Pro', 'Yearly', $proYearly->id],
            ]
        );

        return Command::SUCCESS;
    }
}
```

Store the price IDs in your configuration:

```php
<?php
// config/subscriptions.php

return [
    'plans' => [
        'basic' => [
            'monthly' => env('STRIPE_PRICE_BASIC_MONTHLY', 'price_xxx'),
            'yearly' => env('STRIPE_PRICE_BASIC_YEARLY', 'price_xxx'),
        ],
        'pro' => [
            'monthly' => env('STRIPE_PRICE_PRO_MONTHLY', 'price_xxx'),
            'yearly' => env('STRIPE_PRICE_PRO_YEARLY', 'price_xxx'),
        ],
    ],
];
```

## Creating Subscriptions

### Basic Subscription Creation

The simplest way to create a subscription:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SubscriptionController extends Controller
{
    /**
     * Create a new subscription for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'payment_method' => 'required|string',
            'plan' => 'required|string|in:basic,pro',
            'billing_cycle' => 'required|string|in:monthly,yearly',
        ]);

        $user = $request->user();
        $priceId = config("subscriptions.plans.{$request->plan}.{$request->billing_cycle}");

        // Create or update the Stripe customer with the payment method
        $user->createOrGetStripeCustomer();
        $user->updateDefaultPaymentMethod($request->payment_method);

        // Create the subscription
        $subscription = $user->newSubscription('default', $priceId)->create($request->payment_method);

        return response()->json([
            'message' => 'Subscription created successfully',
            'subscription' => [
                'id' => $subscription->id,
                'status' => $subscription->stripe_status,
                'current_period_end' => $subscription->asStripeSubscription()->current_period_end,
            ],
        ], 201);
    }
}
```

### Using Stripe Checkout (Recommended)

Stripe Checkout handles payment UI, 3D Secure, and PCI compliance for you:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class CheckoutController extends Controller
{
    /**
     * Redirect user to Stripe Checkout for subscription.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function checkout(Request $request): RedirectResponse
    {
        $request->validate([
            'plan' => 'required|string|in:basic,pro',
            'billing_cycle' => 'required|string|in:monthly,yearly',
        ]);

        $priceId = config("subscriptions.plans.{$request->plan}.{$request->billing_cycle}");

        return $request->user()
            ->newSubscription('default', $priceId)
            ->checkout([
                'success_url' => route('subscription.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('subscription.cancel'),
            ]);
    }

    /**
     * Handle successful checkout.
     *
     * @param Request $request
     * @return \Illuminate\View\View
     */
    public function success(Request $request)
    {
        $sessionId = $request->get('session_id');

        if ($sessionId) {
            // Retrieve checkout session to get subscription details
            $session = $request->user()->stripe()->checkout->sessions->retrieve($sessionId);

            return view('subscription.success', [
                'subscription_id' => $session->subscription,
            ]);
        }

        return view('subscription.success');
    }

    /**
     * Handle cancelled checkout.
     *
     * @return \Illuminate\View\View
     */
    public function cancel()
    {
        return view('subscription.cancel');
    }
}
```

### Checkout with Additional Options

```php
<?php

/**
 * Create a checkout session with additional options.
 *
 * @param Request $request
 * @return RedirectResponse
 */
public function checkoutWithOptions(Request $request): RedirectResponse
{
    $priceId = config('subscriptions.plans.pro.monthly');

    return $request->user()
        ->newSubscription('default', $priceId)
        ->allowPromotionCodes()  // Allow customers to enter promo codes
        ->checkout([
            'success_url' => route('subscription.success') . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('subscription.cancel'),
            // Prefill customer email
            'customer_email' => $request->user()->email,
            // Collect billing address
            'billing_address_collection' => 'required',
            // Add custom metadata
            'metadata' => [
                'user_id' => $request->user()->id,
                'source' => 'web_app',
            ],
            // Configure invoice settings
            'subscription_data' => [
                'metadata' => [
                    'user_id' => $request->user()->id,
                ],
            ],
        ]);
}
```

## Managing Trial Periods

### Generic Trials (No Payment Method Required)

Allow users to try your app without entering payment information:

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class TrialController extends Controller
{
    /**
     * Start a generic trial for a new user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function startTrial(Request $request): JsonResponse
    {
        $user = $request->user();

        // Check if user has already used their trial
        if ($user->trial_ends_at !== null) {
            return response()->json([
                'message' => 'You have already used your trial period',
            ], 422);
        }

        // Set trial to end in 14 days
        $user->trial_ends_at = Carbon::now()->addDays(14);
        $user->save();

        return response()->json([
            'message' => 'Trial started successfully',
            'trial_ends_at' => $user->trial_ends_at->toISOString(),
        ]);
    }

    /**
     * Check trial status.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'on_trial' => $user->onTrial(),
            'trial_ends_at' => $user->trial_ends_at?->toISOString(),
            'days_remaining' => $user->onTrial()
                ? Carbon::now()->diffInDays($user->trial_ends_at)
                : 0,
        ]);
    }
}
```

### Subscription-Specific Trials

Attach a trial period to a specific subscription:

```php
<?php

/**
 * Create subscription with trial period.
 *
 * @param Request $request
 * @return RedirectResponse
 */
public function subscribeWithTrial(Request $request): RedirectResponse
{
    $priceId = config('subscriptions.plans.pro.monthly');

    return $request->user()
        ->newSubscription('default', $priceId)
        ->trialDays(14)  // 14-day trial before first charge
        ->checkout([
            'success_url' => route('subscription.success'),
            'cancel_url' => route('subscription.cancel'),
        ]);
}

/**
 * Create subscription with trial ending on specific date.
 *
 * @param Request $request
 * @return RedirectResponse
 */
public function subscribeWithTrialUntil(Request $request): RedirectResponse
{
    $priceId = config('subscriptions.plans.pro.monthly');

    return $request->user()
        ->newSubscription('default', $priceId)
        ->trialUntil(Carbon::now()->addMonth())  // Trial until specific date
        ->checkout([
            'success_url' => route('subscription.success'),
            'cancel_url' => route('subscription.cancel'),
        ]);
}
```

### Skip Trial for Existing Customers

```php
<?php

/**
 * Subscribe without trial (for returning customers).
 *
 * @param Request $request
 * @return JsonResponse
 */
public function subscribeWithoutTrial(Request $request): JsonResponse
{
    $user = $request->user();
    $priceId = config('subscriptions.plans.pro.monthly');

    // Check if user has subscribed before
    $hasSubscribedBefore = $user->subscriptions()->withTrashed()->exists();

    $subscriptionBuilder = $user->newSubscription('default', $priceId);

    if ($hasSubscribedBefore) {
        // Skip trial for returning customers
        $subscriptionBuilder->skipTrial();
    } else {
        // Give trial to new customers
        $subscriptionBuilder->trialDays(14);
    }

    $subscription = $subscriptionBuilder->create($request->payment_method);

    return response()->json([
        'message' => 'Subscription created',
        'on_trial' => $subscription->onTrial(),
    ]);
}
```

## Checking Subscription Status

### Middleware for Subscription Verification

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsSubscribed
{
    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     * @param string|null $type
     * @return Response
     */
    public function handle(Request $request, Closure $next, ?string $type = 'default'): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        // Check for active subscription or trial
        if (!$user->subscribed($type) && !$user->onTrial()) {
            return redirect()->route('subscription.plans')
                ->with('message', 'Please subscribe to access this feature.');
        }

        return $next($request);
    }
}
```

Register the middleware in your application:

```php
<?php
// bootstrap/app.php (Laravel 11+)

use App\Http\Middleware\EnsureUserIsSubscribed;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'subscribed' => EnsureUserIsSubscribed::class,
        ]);
    })
    ->create();
```

Use in routes:

```php
<?php
// routes/web.php

Route::middleware(['auth', 'subscribed'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/projects', [ProjectController::class, 'index']);
});

// Require specific subscription type
Route::middleware(['auth', 'subscribed:pro'])->group(function () {
    Route::get('/analytics', [AnalyticsController::class, 'index']);
});
```

### Checking Subscription in Controllers

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FeatureController extends Controller
{
    /**
     * Get user's subscription status and available features.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            // Basic subscription checks
            'subscribed' => $user->subscribed('default'),
            'on_trial' => $user->onTrial(),
            'on_generic_trial' => $user->onGenericTrial(),

            // Subscription details
            'subscription' => $user->subscribed('default') ? [
                'status' => $user->subscription('default')->stripe_status,
                'on_grace_period' => $user->subscription('default')->onGracePeriod(),
                'cancelled' => $user->subscription('default')->cancelled(),
                'ended' => $user->subscription('default')->ended(),
                'recurring' => $user->subscription('default')->recurring(),
            ] : null,

            // Plan-specific checks
            'on_basic_plan' => $user->subscribedToPrice(config('subscriptions.plans.basic.monthly'))
                || $user->subscribedToPrice(config('subscriptions.plans.basic.yearly')),
            'on_pro_plan' => $user->subscribedToPrice(config('subscriptions.plans.pro.monthly'))
                || $user->subscribedToPrice(config('subscriptions.plans.pro.yearly')),

            // Feature flags based on subscription
            'features' => $this->getFeatures($user),
        ]);
    }

    /**
     * Get available features based on user's subscription.
     *
     * @param \App\Models\User $user
     * @return array
     */
    private function getFeatures($user): array
    {
        $features = [
            'max_projects' => 3,
            'max_team_members' => 1,
            'analytics' => false,
            'api_access' => false,
            'priority_support' => false,
        ];

        if ($user->onTrial() || $user->subscribedToPrice(config('subscriptions.plans.basic.monthly'))
            || $user->subscribedToPrice(config('subscriptions.plans.basic.yearly'))) {
            $features['max_projects'] = 10;
            $features['max_team_members'] = 5;
        }

        if ($user->subscribedToPrice(config('subscriptions.plans.pro.monthly'))
            || $user->subscribedToPrice(config('subscriptions.plans.pro.yearly'))) {
            $features['max_projects'] = -1;  // Unlimited
            $features['max_team_members'] = -1;
            $features['analytics'] = true;
            $features['api_access'] = true;
            $features['priority_support'] = true;
        }

        return $features;
    }
}
```

## Changing Plans and Upgrading

### Swapping Subscription Plans

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PlanController extends Controller
{
    /**
     * Change the user's subscription plan.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function swap(Request $request): JsonResponse
    {
        $request->validate([
            'plan' => 'required|string|in:basic,pro',
            'billing_cycle' => 'required|string|in:monthly,yearly',
        ]);

        $user = $request->user();
        $newPriceId = config("subscriptions.plans.{$request->plan}.{$request->billing_cycle}");

        if (!$user->subscribed('default')) {
            return response()->json([
                'message' => 'No active subscription to change',
            ], 422);
        }

        // Swap to the new plan - prorates by default
        $user->subscription('default')->swap($newPriceId);

        return response()->json([
            'message' => 'Plan changed successfully',
            'new_plan' => $request->plan,
            'billing_cycle' => $request->billing_cycle,
        ]);
    }

    /**
     * Swap plan without prorating.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function swapWithoutProrating(Request $request): JsonResponse
    {
        $request->validate([
            'plan' => 'required|string|in:basic,pro',
            'billing_cycle' => 'required|string|in:monthly,yearly',
        ]);

        $user = $request->user();
        $newPriceId = config("subscriptions.plans.{$request->plan}.{$request->billing_cycle}");

        // Swap without prorating - new price takes effect at next billing cycle
        $user->subscription('default')->noProrate()->swap($newPriceId);

        return response()->json([
            'message' => 'Plan will change at next billing cycle',
        ]);
    }

    /**
     * Swap and invoice immediately.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function swapAndInvoice(Request $request): JsonResponse
    {
        $request->validate([
            'plan' => 'required|string|in:basic,pro',
            'billing_cycle' => 'required|string|in:monthly,yearly',
        ]);

        $user = $request->user();
        $newPriceId = config("subscriptions.plans.{$request->plan}.{$request->billing_cycle}");

        // Swap and immediately invoice for the prorated amount
        $user->subscription('default')->swapAndInvoice($newPriceId);

        return response()->json([
            'message' => 'Plan changed and invoiced successfully',
        ]);
    }
}
```

### Handling Quantity-Based Subscriptions

For per-seat pricing:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SeatController extends Controller
{
    /**
     * Update the number of seats in the subscription.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateSeats(Request $request): JsonResponse
    {
        $request->validate([
            'quantity' => 'required|integer|min:1|max:100',
        ]);

        $user = $request->user();
        $subscription = $user->subscription('default');

        if (!$subscription) {
            return response()->json([
                'message' => 'No active subscription',
            ], 422);
        }

        // Update quantity - prorates by default
        $subscription->updateQuantity($request->quantity);

        return response()->json([
            'message' => 'Seats updated successfully',
            'quantity' => $subscription->quantity,
        ]);
    }

    /**
     * Increment seats by one.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function addSeat(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        // Add one seat
        $subscription->incrementQuantity();

        return response()->json([
            'message' => 'Seat added',
            'quantity' => $subscription->quantity,
        ]);
    }

    /**
     * Decrement seats by one.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function removeSeat(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        if ($subscription->quantity <= 1) {
            return response()->json([
                'message' => 'Cannot reduce below 1 seat',
            ], 422);
        }

        // Remove one seat
        $subscription->decrementQuantity();

        return response()->json([
            'message' => 'Seat removed',
            'quantity' => $subscription->quantity,
        ]);
    }
}
```

## Cancellation and Grace Periods

### Cancelling Subscriptions

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CancellationController extends Controller
{
    /**
     * Cancel the subscription at period end.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function cancel(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        if (!$subscription || $subscription->cancelled()) {
            return response()->json([
                'message' => 'No active subscription to cancel',
            ], 422);
        }

        // Cancel at the end of the billing period (grace period)
        $subscription->cancel();

        return response()->json([
            'message' => 'Subscription will be cancelled at period end',
            'ends_at' => $subscription->ends_at->toISOString(),
            'on_grace_period' => true,
        ]);
    }

    /**
     * Cancel the subscription immediately.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function cancelNow(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        if (!$subscription) {
            return response()->json([
                'message' => 'No active subscription to cancel',
            ], 422);
        }

        // Cancel immediately - no grace period
        $subscription->cancelNow();

        return response()->json([
            'message' => 'Subscription cancelled immediately',
        ]);
    }

    /**
     * Cancel and refund prorated amount.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function cancelNowAndRefund(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        if (!$subscription) {
            return response()->json([
                'message' => 'No active subscription to cancel',
            ], 422);
        }

        // Cancel immediately and issue prorated refund
        $subscription->cancelNowAndInvoice();

        return response()->json([
            'message' => 'Subscription cancelled and prorated amount refunded',
        ]);
    }

    /**
     * Resume a cancelled subscription during grace period.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function resume(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        if (!$subscription) {
            return response()->json([
                'message' => 'No subscription found',
            ], 422);
        }

        if (!$subscription->onGracePeriod()) {
            return response()->json([
                'message' => 'Subscription cannot be resumed - grace period has ended',
            ], 422);
        }

        // Resume the subscription
        $subscription->resume();

        return response()->json([
            'message' => 'Subscription resumed successfully',
        ]);
    }
}
```

### Checking Grace Period Status

```php
<?php

/**
 * Get detailed cancellation status.
 *
 * @param Request $request
 * @return JsonResponse
 */
public function cancellationStatus(Request $request): JsonResponse
{
    $user = $request->user();
    $subscription = $user->subscription('default');

    if (!$subscription) {
        return response()->json([
            'has_subscription' => false,
        ]);
    }

    return response()->json([
        'has_subscription' => true,
        'cancelled' => $subscription->cancelled(),
        'on_grace_period' => $subscription->onGracePeriod(),
        'ended' => $subscription->ended(),
        'ends_at' => $subscription->ends_at?->toISOString(),
        'can_resume' => $subscription->onGracePeriod(),
    ]);
}
```

## Handling Webhooks

Webhooks are critical for keeping your application in sync with Stripe. They notify you of events like successful payments, failed charges, and subscription changes.

### Setting Up the Webhook Route

Cashier provides a webhook controller out of the box. Register the route:

```php
<?php
// routes/web.php

use Laravel\Cashier\Http\Controllers\WebhookController;

// Exclude from CSRF protection - Stripe cannot send CSRF tokens
Route::post(
    '/stripe/webhook',
    [WebhookController::class, 'handleWebhook']
)->name('cashier.webhook');
```

Exclude from CSRF verification in your middleware:

```php
<?php
// bootstrap/app.php (Laravel 11+)

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->validateCsrfTokens(except: [
            'stripe/*',
        ]);
    })
    ->create();
```

### Configuring Webhooks in Stripe

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/stripe/webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.updated`
   - `customer.deleted`
5. Copy the webhook signing secret to your `.env` file

### Creating Custom Webhook Handlers

Extend the default webhook controller to handle additional events:

```php
<?php

namespace App\Http\Controllers;

use Laravel\Cashier\Http\Controllers\WebhookController as CashierController;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Notifications\PaymentFailed;
use App\Notifications\SubscriptionCancelled;
use App\Notifications\TrialEnding;

class StripeWebhookController extends CashierController
{
    /**
     * Handle invoice payment succeeded.
     *
     * @param array $payload
     * @return Response
     */
    protected function handleInvoicePaymentSucceeded(array $payload): Response
    {
        $invoice = $payload['data']['object'];
        $customerId = $invoice['customer'];

        $user = User::where('stripe_id', $customerId)->first();

        if ($user) {
            Log::info('Payment succeeded', [
                'user_id' => $user->id,
                'amount' => $invoice['amount_paid'] / 100,
                'invoice_id' => $invoice['id'],
            ]);

            // Record the payment in your database
            $user->payments()->create([
                'stripe_invoice_id' => $invoice['id'],
                'amount' => $invoice['amount_paid'],
                'currency' => $invoice['currency'],
                'status' => 'succeeded',
                'paid_at' => now(),
            ]);
        }

        return $this->successMethod();
    }

    /**
     * Handle invoice payment failed.
     *
     * @param array $payload
     * @return Response
     */
    protected function handleInvoicePaymentFailed(array $payload): Response
    {
        $invoice = $payload['data']['object'];
        $customerId = $invoice['customer'];

        $user = User::where('stripe_id', $customerId)->first();

        if ($user) {
            Log::warning('Payment failed', [
                'user_id' => $user->id,
                'amount' => $invoice['amount_due'] / 100,
                'invoice_id' => $invoice['id'],
                'attempt_count' => $invoice['attempt_count'],
            ]);

            // Notify the user about the failed payment
            $user->notify(new PaymentFailed(
                amount: $invoice['amount_due'] / 100,
                currency: strtoupper($invoice['currency']),
                invoiceUrl: $invoice['hosted_invoice_url']
            ));
        }

        return $this->successMethod();
    }

    /**
     * Handle customer subscription deleted.
     *
     * @param array $payload
     * @return Response
     */
    protected function handleCustomerSubscriptionDeleted(array $payload): Response
    {
        // Let Cashier handle the subscription update first
        $response = parent::handleCustomerSubscriptionDeleted($payload);

        $subscription = $payload['data']['object'];
        $customerId = $subscription['customer'];

        $user = User::where('stripe_id', $customerId)->first();

        if ($user) {
            Log::info('Subscription cancelled', [
                'user_id' => $user->id,
                'subscription_id' => $subscription['id'],
            ]);

            // Notify the user
            $user->notify(new SubscriptionCancelled());

            // Downgrade user permissions
            $user->role = 'free';
            $user->save();
        }

        return $response;
    }

    /**
     * Handle trial will end event.
     *
     * @param array $payload
     * @return Response
     */
    protected function handleCustomerSubscriptionTrialWillEnd(array $payload): Response
    {
        $subscription = $payload['data']['object'];
        $customerId = $subscription['customer'];

        $user = User::where('stripe_id', $customerId)->first();

        if ($user) {
            $trialEnd = \Carbon\Carbon::createFromTimestamp($subscription['trial_end']);

            Log::info('Trial ending soon', [
                'user_id' => $user->id,
                'trial_ends_at' => $trialEnd->toISOString(),
            ]);

            // Notify user that trial is ending
            $user->notify(new TrialEnding($trialEnd));
        }

        return $this->successMethod();
    }

    /**
     * Handle charge refunded event.
     *
     * @param array $payload
     * @return Response
     */
    protected function handleChargeRefunded(array $payload): Response
    {
        $charge = $payload['data']['object'];
        $customerId = $charge['customer'];

        $user = User::where('stripe_id', $customerId)->first();

        if ($user) {
            Log::info('Charge refunded', [
                'user_id' => $user->id,
                'amount_refunded' => $charge['amount_refunded'] / 100,
                'charge_id' => $charge['id'],
            ]);

            // Update your payment records
            $user->payments()
                ->where('stripe_charge_id', $charge['id'])
                ->update(['status' => 'refunded']);
        }

        return $this->successMethod();
    }
}
```

Update your route to use the custom controller:

```php
<?php
// routes/web.php

use App\Http\Controllers\StripeWebhookController;

Route::post(
    '/stripe/webhook',
    [StripeWebhookController::class, 'handleWebhook']
)->name('cashier.webhook');
```

### Testing Webhooks Locally

Use the Stripe CLI to forward webhooks to your local environment:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:8000/stripe/webhook

# The CLI will display a webhook signing secret - add it to your .env
# STRIPE_WEBHOOK_SECRET=whsec_xxx

# In another terminal, trigger test events
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.updated
```

## Working with Invoices

### Listing User Invoices

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InvoiceController extends Controller
{
    /**
     * List all invoices for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasStripeId()) {
            return response()->json([
                'invoices' => [],
            ]);
        }

        $invoices = $user->invoices()->map(function ($invoice) {
            return [
                'id' => $invoice->id,
                'date' => $invoice->date()->toISOString(),
                'total' => $invoice->total(),
                'status' => $invoice->status,
                'invoice_pdf' => $invoice->invoice_pdf,
                'hosted_invoice_url' => $invoice->hosted_invoice_url,
            ];
        });

        return response()->json([
            'invoices' => $invoices,
        ]);
    }

    /**
     * Download a specific invoice as PDF.
     *
     * @param Request $request
     * @param string $invoiceId
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function download(Request $request, string $invoiceId)
    {
        $user = $request->user();

        return $user->downloadInvoice($invoiceId, [
            'vendor' => 'Your Company Name',
            'product' => 'Subscription Service',
            'street' => '123 Main Street',
            'location' => 'San Francisco, CA 94105',
            'phone' => '+1 (555) 123-4567',
            'email' => 'billing@yourcompany.com',
            'url' => 'https://yourcompany.com',
            'vendorVat' => 'US123456789',
        ]);
    }

    /**
     * Get the upcoming invoice (prorated charges for plan changes).
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function upcoming(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->subscribed('default')) {
            return response()->json([
                'upcoming_invoice' => null,
            ]);
        }

        try {
            $invoice = $user->upcomingInvoice();

            return response()->json([
                'upcoming_invoice' => [
                    'date' => $invoice->date()->toISOString(),
                    'total' => $invoice->total(),
                    'subtotal' => $invoice->subtotal(),
                    'tax' => $invoice->tax(),
                    'lines' => collect($invoice->invoiceLineItems())->map(function ($item) {
                        return [
                            'description' => $item->description,
                            'amount' => $item->amount / 100,
                        ];
                    }),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'upcoming_invoice' => null,
            ]);
        }
    }
}
```

### Previewing Plan Change Costs

```php
<?php

/**
 * Preview the cost of changing plans.
 *
 * @param Request $request
 * @return JsonResponse
 */
public function previewPlanChange(Request $request): JsonResponse
{
    $request->validate([
        'plan' => 'required|string|in:basic,pro',
        'billing_cycle' => 'required|string|in:monthly,yearly',
    ]);

    $user = $request->user();
    $newPriceId = config("subscriptions.plans.{$request->plan}.{$request->billing_cycle}");

    if (!$user->subscribed('default')) {
        return response()->json([
            'message' => 'No active subscription',
        ], 422);
    }

    try {
        // Preview what the invoice would look like
        $preview = $user->subscription('default')->previewInvoice($newPriceId);

        return response()->json([
            'preview' => [
                'subtotal' => $preview->subtotal(),
                'tax' => $preview->tax(),
                'total' => $preview->total(),
                'proration_amount' => $preview->rawAmountDue() / 100,
                'lines' => collect($preview->invoiceLineItems())->map(function ($item) {
                    return [
                        'description' => $item->description,
                        'amount' => $item->amount / 100,
                        'proration' => $item->proration,
                    ];
                }),
            ],
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Unable to preview plan change',
            'error' => $e->getMessage(),
        ], 500);
    }
}
```

## Payment Method Management

### Adding and Updating Payment Methods

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PaymentMethodController extends Controller
{
    /**
     * List all payment methods for the user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasStripeId()) {
            return response()->json([
                'payment_methods' => [],
                'default_payment_method' => null,
            ]);
        }

        $paymentMethods = $user->paymentMethods()->map(function ($method) {
            return [
                'id' => $method->id,
                'brand' => $method->card->brand,
                'last_four' => $method->card->last4,
                'exp_month' => $method->card->exp_month,
                'exp_year' => $method->card->exp_year,
            ];
        });

        $default = $user->defaultPaymentMethod();

        return response()->json([
            'payment_methods' => $paymentMethods,
            'default_payment_method' => $default ? $default->id : null,
        ]);
    }

    /**
     * Add a new payment method.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'payment_method' => 'required|string',
        ]);

        $user = $request->user();

        // Create Stripe customer if needed
        $user->createOrGetStripeCustomer();

        // Add the payment method
        $paymentMethod = $user->addPaymentMethod($request->payment_method);

        return response()->json([
            'message' => 'Payment method added successfully',
            'payment_method' => [
                'id' => $paymentMethod->id,
                'brand' => $paymentMethod->card->brand,
                'last_four' => $paymentMethod->card->last4,
            ],
        ]);
    }

    /**
     * Set a payment method as default.
     *
     * @param Request $request
     * @param string $paymentMethodId
     * @return JsonResponse
     */
    public function setDefault(Request $request, string $paymentMethodId): JsonResponse
    {
        $user = $request->user();

        $user->updateDefaultPaymentMethod($paymentMethodId);

        return response()->json([
            'message' => 'Default payment method updated',
        ]);
    }

    /**
     * Delete a payment method.
     *
     * @param Request $request
     * @param string $paymentMethodId
     * @return JsonResponse
     */
    public function destroy(Request $request, string $paymentMethodId): JsonResponse
    {
        $user = $request->user();

        // Check if this is the only payment method
        $methodCount = $user->paymentMethods()->count();

        if ($methodCount <= 1 && $user->subscribed('default')) {
            return response()->json([
                'message' => 'Cannot delete the only payment method while subscribed',
            ], 422);
        }

        $user->deletePaymentMethod($paymentMethodId);

        return response()->json([
            'message' => 'Payment method deleted',
        ]);
    }

    /**
     * Create a setup intent for adding payment methods on the frontend.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function createSetupIntent(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->createOrGetStripeCustomer();

        return response()->json([
            'client_secret' => $user->createSetupIntent()->client_secret,
        ]);
    }
}
```

### Frontend Integration with Stripe Elements

```html
<!-- resources/views/payment-method.blade.php -->
<!DOCTYPE html>
<html>
<head>
    <title>Add Payment Method</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        .StripeElement {
            box-sizing: border-box;
            height: 40px;
            padding: 10px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: white;
        }
        .StripeElement--focus {
            border-color: #80bdff;
            outline: 0;
            box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
        }
        .StripeElement--invalid {
            border-color: #dc3545;
        }
        #card-errors {
            color: #dc3545;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <form id="payment-form">
        <div id="card-element"></div>
        <div id="card-errors" role="alert"></div>
        <button type="submit" id="submit-button">Add Payment Method</button>
    </form>

    <script>
        // Initialize Stripe with your publishable key
        const stripe = Stripe('{{ config("cashier.key") }}');
        const elements = stripe.elements();

        // Create card element with styling
        const cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#32325d',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    '::placeholder': {
                        color: '#aab7c4'
                    }
                },
                invalid: {
                    color: '#dc3545',
                    iconColor: '#dc3545'
                }
            }
        });

        cardElement.mount('#card-element');

        // Handle validation errors
        cardElement.on('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });

        // Handle form submission
        const form = document.getElementById('payment-form');
        const submitButton = document.getElementById('submit-button');

        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';

            // Get setup intent from server
            const setupResponse = await fetch('/api/payment-methods/setup-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}'
                }
            });
            const { client_secret } = await setupResponse.json();

            // Confirm card setup with Stripe
            const { setupIntent, error } = await stripe.confirmCardSetup(
                client_secret,
                {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            name: '{{ auth()->user()->name }}',
                            email: '{{ auth()->user()->email }}'
                        }
                    }
                }
            );

            if (error) {
                // Show error to customer
                const displayError = document.getElementById('card-errors');
                displayError.textContent = error.message;
                submitButton.disabled = false;
                submitButton.textContent = 'Add Payment Method';
            } else {
                // Send payment method ID to server
                const response = await fetch('/api/payment-methods', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: JSON.stringify({
                        payment_method: setupIntent.payment_method
                    })
                });

                if (response.ok) {
                    window.location.href = '/billing';
                } else {
                    const data = await response.json();
                    document.getElementById('card-errors').textContent = data.message;
                    submitButton.disabled = false;
                    submitButton.textContent = 'Add Payment Method';
                }
            }
        });
    </script>
</body>
</html>
```

## Handling Failed Payments

### Automatic Retry Configuration

Stripe automatically retries failed payments. Configure the retry schedule in your Stripe Dashboard under Settings > Billing > Subscriptions and emails.

### Manual Payment Retry

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PaymentRetryController extends Controller
{
    /**
     * Retry payment for a past due subscription.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function retry(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        if (!$subscription) {
            return response()->json([
                'message' => 'No subscription found',
            ], 422);
        }

        // Check if subscription is past due
        if ($subscription->stripe_status !== 'past_due') {
            return response()->json([
                'message' => 'Subscription is not past due',
            ], 422);
        }

        try {
            // Get the latest unpaid invoice
            $invoice = $user->invoices()
                ->first(function ($invoice) {
                    return $invoice->status === 'open';
                });

            if ($invoice) {
                // Attempt to pay the invoice
                $invoice->pay();

                return response()->json([
                    'message' => 'Payment successful',
                ]);
            }

            return response()->json([
                'message' => 'No unpaid invoice found',
            ], 422);
        } catch (\Laravel\Cashier\Exceptions\IncompletePayment $e) {
            return response()->json([
                'message' => 'Payment requires additional action',
                'payment_intent' => $e->payment->asStripePaymentIntent()->client_secret,
            ], 402);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Payment failed',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
```

## Applying Coupons and Promotions

### Creating and Applying Coupons

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CouponController extends Controller
{
    /**
     * Apply a coupon to a new subscription.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function subscribeWithCoupon(Request $request)
    {
        $request->validate([
            'plan' => 'required|string|in:basic,pro',
            'billing_cycle' => 'required|string|in:monthly,yearly',
            'coupon' => 'nullable|string',
        ]);

        $user = $request->user();
        $priceId = config("subscriptions.plans.{$request->plan}.{$request->billing_cycle}");

        $subscriptionBuilder = $user->newSubscription('default', $priceId);

        // Apply coupon if provided
        if ($request->coupon) {
            $subscriptionBuilder->withCoupon($request->coupon);
        }

        return $subscriptionBuilder->checkout([
            'success_url' => route('subscription.success'),
            'cancel_url' => route('subscription.cancel'),
        ]);
    }

    /**
     * Apply a coupon to an existing subscription.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function applyCoupon(Request $request): JsonResponse
    {
        $request->validate([
            'coupon' => 'required|string',
        ]);

        $user = $request->user();
        $subscription = $user->subscription('default');

        if (!$subscription) {
            return response()->json([
                'message' => 'No active subscription',
            ], 422);
        }

        try {
            // Verify the coupon exists and is valid
            $stripe = $user->stripe();
            $coupon = $stripe->coupons->retrieve($request->coupon);

            if (!$coupon->valid) {
                return response()->json([
                    'message' => 'This coupon is no longer valid',
                ], 422);
            }

            // Apply the coupon
            $subscription->applyCoupon($request->coupon);

            return response()->json([
                'message' => 'Coupon applied successfully',
                'discount' => $coupon->percent_off
                    ? "{$coupon->percent_off}% off"
                    : '$' . ($coupon->amount_off / 100) . ' off',
            ]);
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            return response()->json([
                'message' => 'Invalid coupon code',
            ], 422);
        }
    }

    /**
     * Validate a coupon code without applying it.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        $request->validate([
            'coupon' => 'required|string',
        ]);

        try {
            $stripe = new \Stripe\StripeClient(config('cashier.secret'));
            $coupon = $stripe->coupons->retrieve($request->coupon);

            if (!$coupon->valid) {
                return response()->json([
                    'valid' => false,
                    'message' => 'This coupon has expired',
                ]);
            }

            return response()->json([
                'valid' => true,
                'coupon' => [
                    'id' => $coupon->id,
                    'name' => $coupon->name,
                    'percent_off' => $coupon->percent_off,
                    'amount_off' => $coupon->amount_off ? $coupon->amount_off / 100 : null,
                    'duration' => $coupon->duration,
                    'duration_in_months' => $coupon->duration_in_months,
                ],
            ]);
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid coupon code',
            ]);
        }
    }
}
```

## Customer Portal

Stripe provides a hosted Customer Portal where users can manage their subscriptions, payment methods, and invoices without you building the UI.

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class BillingPortalController extends Controller
{
    /**
     * Redirect user to Stripe Customer Portal.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function redirect(Request $request): RedirectResponse
    {
        $user = $request->user();

        // Create Stripe customer if needed
        $user->createOrGetStripeCustomer();

        return $user->redirectToBillingPortal(route('dashboard'));
    }

    /**
     * Get a Customer Portal URL without redirecting.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getPortalUrl(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->createOrGetStripeCustomer();

        $url = $user->billingPortalUrl(route('dashboard'));

        return response()->json([
            'portal_url' => $url,
        ]);
    }
}
```

Configure the Customer Portal in Stripe Dashboard under Settings > Billing > Customer Portal to control what customers can do.

## Testing Subscriptions

### Using Stripe Test Mode

Always use Stripe test mode during development. Test card numbers:

| Card Number | Scenario |
|-------------|----------|
| 4242424242424242 | Successful payment |
| 4000000000000341 | Attaches but fails on charge |
| 4000000000009995 | Insufficient funds |
| 4000002500003155 | Requires 3D Secure authentication |
| 4000000000000002 | Card declined |

### Writing Feature Tests

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Cashier\Subscription;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test user can check subscription status.
     */
    public function test_user_can_check_subscription_status(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/subscription/status')
            ->assertOk()
            ->assertJsonStructure([
                'subscribed',
                'on_trial',
                'features',
            ]);
    }

    /**
     * Test subscribed middleware blocks unsubscribed users.
     */
    public function test_unsubscribed_users_cannot_access_premium_features(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertRedirect('/subscription/plans');
    }

    /**
     * Test subscribed users can access premium features.
     */
    public function test_subscribed_users_can_access_premium_features(): void
    {
        $user = User::factory()->create([
            'stripe_id' => 'cus_test123',
        ]);

        // Create a fake subscription
        Subscription::create([
            'user_id' => $user->id,
            'type' => 'default',
            'stripe_id' => 'sub_test123',
            'stripe_status' => 'active',
            'stripe_price' => 'price_test123',
            'quantity' => 1,
        ]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk();
    }

    /**
     * Test users on trial can access premium features.
     */
    public function test_users_on_trial_can_access_premium_features(): void
    {
        $user = User::factory()->create([
            'trial_ends_at' => now()->addDays(7),
        ]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk();
    }

    /**
     * Test subscription cancellation during grace period.
     */
    public function test_cancelled_subscription_during_grace_period(): void
    {
        $user = User::factory()->create([
            'stripe_id' => 'cus_test123',
        ]);

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'type' => 'default',
            'stripe_id' => 'sub_test123',
            'stripe_status' => 'active',
            'stripe_price' => 'price_test123',
            'quantity' => 1,
            'ends_at' => now()->addDays(15),  // Cancelled but in grace period
        ]);

        // User should still have access during grace period
        $this->assertTrue($subscription->onGracePeriod());
        $this->assertTrue($user->subscribed('default'));

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk();
    }
}
```

## Production Checklist

Before going live, verify:

1. **Switch to live Stripe keys** - Replace test keys with production keys in `.env`

2. **Configure webhook endpoint** - Add your production webhook URL in Stripe Dashboard

3. **Set up monitoring** - Track failed payments and subscription changes

4. **Configure email notifications** - Set up Stripe email receipts or use your own

5. **Test the full flow** - Create a real subscription with a real card in production mode

6. **Set up proper error handling** - Catch and log all Stripe exceptions

7. **Implement dunning management** - Configure retry logic for failed payments in Stripe

8. **Review tax settings** - Configure Stripe Tax if needed for your jurisdiction

## Summary

| Feature | Implementation |
|---------|----------------|
| **Installation** | `composer require laravel/cashier` |
| **Create subscription** | `$user->newSubscription('default', $priceId)->create($paymentMethod)` |
| **Stripe Checkout** | `$user->newSubscription(...)->checkout([...])` |
| **Check status** | `$user->subscribed('default')` |
| **Cancel** | `$user->subscription('default')->cancel()` |
| **Resume** | `$user->subscription('default')->resume()` |
| **Change plan** | `$user->subscription('default')->swap($newPriceId)` |
| **Webhooks** | Extend `WebhookController` |
| **Invoices** | `$user->invoices()` or `$user->downloadInvoice($id)` |
| **Customer Portal** | `$user->redirectToBillingPortal()` |

Laravel Cashier handles the complexity of subscription billing so you can focus on building your product. The combination of Eloquent integration, Stripe Checkout, and webhook handling gives you a production-ready billing system with minimal code.

---

**Need to monitor your Laravel application in production?** [OneUptime](https://oneuptime.com) provides comprehensive monitoring, alerting, and incident management for your web applications. Track API response times, monitor webhook endpoints, and get notified when payment processing issues occur - all from a single dashboard. Start your free trial and ensure your subscription system stays reliable.
