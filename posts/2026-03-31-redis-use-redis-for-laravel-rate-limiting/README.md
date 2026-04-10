# How to Use Redis for Laravel Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Laravel, Rate Limiting, Middleware, PHP

Description: Implement Redis-backed rate limiting in Laravel using the built-in throttle middleware and custom RateLimiter definitions to protect API endpoints.

---

## Introduction

Laravel's rate limiting system uses Redis (or the cache driver) to track request counts per client. Redis is the preferred backend because it is fast, atomic, and shared across all application instances. This guide covers the built-in throttle middleware, custom rate limiters, and manual Redis-based rate limiting.

## Prerequisites

Make sure your `CACHE_DRIVER` or `REDIS_HOST` is configured in `.env`:

```text
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CACHE_DRIVER=redis
```

## Using the Built-In Throttle Middleware

Apply the throttle middleware to API routes in `routes/api.php`:

```php
use Illuminate\Support\Facades\Route;

// 60 requests per minute per user
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
});

// 10 requests per minute for auth endpoints
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});
```

## Custom Rate Limiters

Define custom rate limiters in `App\Providers\RouteServiceProvider`:

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

public function boot(): void
{
    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });

    RateLimiter::for('uploads', function (Request $request) {
        return [
            Limit::perMinute(10)->by($request->user()?->id ?? $request->ip()),
            Limit::perDay(100)->by($request->user()?->id ?? $request->ip()),
        ];
    });

    RateLimiter::for('sensitive', function (Request $request) {
        return Limit::perMinute(5)
            ->by($request->ip())
            ->response(function (Request $request, array $headers) {
                return response()->json(
                    ['error' => 'Too many attempts. Please try again later.'],
                    429,
                    $headers
                );
            });
    });
}
```

## Applying Named Rate Limiters to Routes

```php
Route::middleware('throttle:api')->group(function () {
    Route::get('/user', [UserController::class, 'profile']);
});

Route::middleware('throttle:uploads')->post('/upload', [UploadController::class, 'store']);
Route::middleware('throttle:sensitive')->post('/password/reset', [PasswordController::class, 'reset']);
```

## Manual Rate Limiting with RateLimiter Facade

For programmatic rate limiting inside controllers or services:

```php
use Illuminate\Support\Facades\RateLimiter;

class LoginController extends Controller
{
    public function login(Request $request)
    {
        $key = 'login:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'error' => "Too many login attempts. Try again in {$seconds} seconds."
            ], 429);
        }

        $credentials = $request->only('email', 'password');

        if (!auth()->attempt($credentials)) {
            RateLimiter::hit($key, 300); // Increment counter, TTL 300s
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        RateLimiter::clear($key); // Reset on successful login
        return response()->json(['token' => auth()->user()->createToken('api')->plainTextToken]);
    }
}
```

## Rate Limiting with Redis Directly

For custom algorithms, use the Redis facade:

```php
use Illuminate\Support\Facades\Redis;

class ApiRateLimiter
{
    public function check(string $identifier, int $limit, int $windowSeconds): array
    {
        $key = "rl:{$identifier}";
        $count = Redis::incr($key);

        if ($count === 1) {
            Redis::expire($key, $windowSeconds);
        }

        return [
            'allowed'   => $count <= $limit,
            'remaining' => max(0, $limit - $count),
            'reset'     => Redis::ttl($key),
        ];
    }
}
```

## Summary

Laravel's rate limiting with Redis requires setting the cache driver to Redis and defining rate limiters using the `RateLimiter` facade or the `throttle` middleware. Custom limiters allow per-user, per-IP, or compound limits with custom response formats. For fine-grained control, use the `RateLimiter::hit()`, `tooManyAttempts()`, and `clear()` methods directly in controller logic. Redis ensures atomic, consistent rate limit enforcement across all application processes.
