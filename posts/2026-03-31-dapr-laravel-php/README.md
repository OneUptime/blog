# How to Use Dapr with Laravel PHP Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Laravel, PHP, Microservice, Service Invocation

Description: Integrate Dapr with Laravel PHP applications for service invocation, state management, and pub/sub to build scalable PHP microservices.

---

Laravel is the most popular PHP framework, and Dapr extends it for microservice architectures by providing sidecar-based state stores, service invocation, and pub/sub without tying your code to specific vendors. Since Dapr exposes a standard HTTP API, Laravel integrates cleanly using Guzzle or Laravel's HTTP client.

## Setting Up Laravel with Dapr

Create a new Laravel project and add HTTP client support:

```bash
composer create-project laravel/laravel product-service
cd product-service
```

Laravel includes Guzzle via the HTTP facade. Create a Dapr service class:

```php
<?php
// app/Services/DaprService.php
namespace App\Services;

use Illuminate\Support\Facades\Http;

class DaprService
{
    private string $baseUrl;

    public function __construct()
    {
        $port = env('DAPR_HTTP_PORT', '3500');
        $this->baseUrl = "http://localhost:{$port}";
    }

    public function getState(string $store, string $key): mixed
    {
        $response = Http::get("{$this->baseUrl}/v1.0/state/{$store}/{$key}");

        if ($response->status() === 204 || $response->body() === '') {
            return null;
        }
        return $response->json();
    }

    public function saveState(string $store, string $key, mixed $value): void
    {
        Http::withHeaders(['Content-Type' => 'application/json'])
            ->post("{$this->baseUrl}/v1.0/state/{$store}", [
                ['key' => $key, 'value' => $value]
            ]);
    }

    public function publishEvent(string $pubsub, string $topic, array $data): void
    {
        Http::withHeaders(['Content-Type' => 'application/json'])
            ->post("{$this->baseUrl}/v1.0/publish/{$pubsub}/{$topic}", $data);
    }

    public function invokeService(string $appId, string $method, string $verb = 'GET', array $body = []): mixed
    {
        $url = "{$this->baseUrl}/v1.0/invoke/{$appId}/method/{$method}";
        $response = Http::withHeaders(['Content-Type' => 'application/json'])
            ->$verb($url, $body ?: null);

        return $response->json();
    }
}
```

Register the service in `AppServiceProvider`:

```php
// app/Providers/AppServiceProvider.php
use App\Services\DaprService;

public function register(): void
{
    $this->app->singleton(DaprService::class);
}
```

## Creating Laravel Controllers with Dapr

```php
<?php
// app/Http/Controllers/ProductController.php
namespace App\Http\Controllers;

use App\Services\DaprService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function __construct(private DaprService $dapr) {}

    public function index()
    {
        $products = $this->dapr->getState('statestore', 'all-products') ?? [];
        return response()->json($products);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'price' => 'required|numeric',
            'stock' => 'required|integer',
        ]);

        $product = array_merge($validated, [
            'id' => Str::uuid()->toString(),
            'created_at' => now()->toIso8601String(),
        ]);

        $products = $this->dapr->getState('statestore', 'all-products') ?? [];
        $products[] = $product;
        $this->dapr->saveState('statestore', 'all-products', $products);
        $this->dapr->saveState('statestore', "product-{$product['id']}", $product);

        // Publish product created event
        $this->dapr->publishEvent('pubsub', 'product-created', $product);

        return response()->json($product, 201);
    }

    public function show(string $id)
    {
        $product = $this->dapr->getState('statestore', "product-{$id}");
        if (!$product) {
            return response()->json(['error' => 'Not found'], 404);
        }
        return response()->json($product);
    }
}
```

## Dapr Pub/Sub Subscription Endpoint

```php
<?php
// app/Http/Controllers/DaprController.php
namespace App\Http\Controllers;

use App\Services\DaprService;
use Illuminate\Http\Request;

class DaprController extends Controller
{
    public function __construct(private DaprService $dapr) {}

    public function subscribe()
    {
        return response()->json([
            [
                'pubsubname' => 'pubsub',
                'topic' => 'inventory-updated',
                'route' => '/dapr/events/inventory-updated',
            ]
        ]);
    }

    public function handleInventoryUpdated(Request $request)
    {
        $data = $request->input('data', []);
        $productId = $data['product_id'] ?? null;

        if ($productId) {
            $product = $this->dapr->getState('statestore', "product-{$productId}");
            if ($product) {
                $product['stock'] = $data['new_stock'];
                $this->dapr->saveState('statestore', "product-{$productId}", $product);
            }
        }

        return response()->json(['status' => 'SUCCESS']);
    }
}
```

Register routes in `routes/web.php`. Since this is a Dapr microservice receiving JSON requests (not browser form submissions), disable CSRF protection for these routes:

```php
use App\Http\Controllers\ProductController;
use App\Http\Controllers\DaprController;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

Route::withoutMiddleware([ValidateCsrfToken::class])->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::get('/dapr/subscribe', [DaprController::class, 'subscribe']);
    Route::post('/dapr/events/inventory-updated', [DaprController::class, 'handleInventoryUpdated']);
});
```

## Running with Dapr CLI

```bash
dapr run \
  --app-id product-service \
  --app-port 8000 \
  --dapr-http-port 3500 \
  -- php artisan serve --port=8000
```

## Summary

Laravel integrates with Dapr via its built-in HTTP client, using the Dapr sidecar's HTTP API for state management, service invocation, and pub/sub. Wrapping Dapr calls in a service class keeps controllers clean and allows easy mocking during testing.
