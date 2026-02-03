# How to Implement Middleware in Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PHP, Laravel, Middleware, Security, HTTP

Description: Learn how to create and use middleware in Laravel. This guide covers request/response middleware, route middleware, groups, and authentication guards.

---

> Middleware provides a powerful mechanism for filtering HTTP requests entering your application. Laravel includes several middleware out of the box, including authentication and CSRF protection. This guide shows you how to create custom middleware and leverage Laravel's middleware system effectively.

Middleware acts as a bridge between a request and a response. It can inspect, modify, or reject requests before they reach your controllers, and transform responses before they are sent to the client.

---

## Understanding Middleware

| Middleware Type | Purpose | Runs When |
|-----------------|---------|-----------|
| **Before Middleware** | Validate/modify request | Before controller |
| **After Middleware** | Modify response | After controller |
| **Terminable Middleware** | Cleanup tasks | After response sent |
| **Global Middleware** | Apply to all routes | Every request |
| **Route Middleware** | Apply to specific routes | Assigned routes only |

---

## Creating Your First Middleware

Use the Artisan command to generate middleware:

```bash
php artisan make:middleware EnsureTokenIsValid
```

This creates a file in `app/Http/Middleware/`:

```php
<?php
// app/Http/Middleware/EnsureTokenIsValid.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenIsValid
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->input('token') !== 'my-secret-token') {
            return redirect('home');
        }

        return $next($request);
    }
}
```

---

## Before vs After Middleware

### Before Middleware

Executes logic before the request reaches the controller:

```php
<?php
// app/Http/Middleware/CheckUserAge.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserAge
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        // This runs BEFORE the request is handled
        $age = $request->user()?->age ?? 0;

        if ($age < 18) {
            return response()->json([
                'error' => 'You must be 18 or older to access this resource.',
                'required_age' => 18,
                'your_age' => $age
            ], 403);
        }

        // Pass the request to the next middleware/controller
        return $next($request);
    }
}
```

### After Middleware

Executes logic after the controller generates the response:

```php
<?php
// app/Http/Middleware/AddResponseHeaders.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddResponseHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        // First, let the request continue through the stack
        $response = $next($request);

        // This runs AFTER the response is created
        $response->headers->set('X-App-Version', config('app.version', '1.0.0'));
        $response->headers->set('X-Request-Id', $request->header('X-Request-Id', uniqid()));
        $response->headers->set('X-Response-Time', microtime(true) - LARAVEL_START);

        return $response;
    }
}
```

### Combined Before and After

```php
<?php
// app/Http/Middleware/MeasureRequestTime.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class MeasureRequestTime
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        // BEFORE: Record start time
        $startTime = microtime(true);

        // Pass to next middleware/controller
        $response = $next($request);

        // AFTER: Calculate and log duration
        $duration = microtime(true) - $startTime;
        $durationMs = round($duration * 1000, 2);

        Log::info('Request completed', [
            'method' => $request->method(),
            'uri' => $request->getRequestUri(),
            'duration_ms' => $durationMs,
            'status' => $response->getStatusCode(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        // Add timing header
        $response->headers->set('X-Response-Time-Ms', $durationMs);

        return $response;
    }
}
```

---

## Registering Middleware

### Laravel 11+ (bootstrap/app.php)

In Laravel 11 and later, middleware is registered in `bootstrap/app.php`:

```php
<?php
// bootstrap/app.php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Global middleware (runs on every request)
        $middleware->append(\App\Http\Middleware\MeasureRequestTime::class);

        // Prepend to run first
        $middleware->prepend(\App\Http\Middleware\TrustProxies::class);

        // Register route middleware aliases
        $middleware->alias([
            'verified.age' => \App\Http\Middleware\CheckUserAge::class,
            'valid.token' => \App\Http\Middleware\EnsureTokenIsValid::class,
            'add.headers' => \App\Http\Middleware\AddResponseHeaders::class,
            'throttle.custom' => \App\Http\Middleware\CustomThrottle::class,
        ]);

        // Define middleware groups
        $middleware->group('api.v2', [
            \App\Http\Middleware\ApiVersionTwo::class,
            \App\Http\Middleware\ValidateApiKey::class,
            'throttle:60,1',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
```

### Laravel 10 and Earlier (Kernel.php)

For older Laravel versions, use the HTTP Kernel:

```php
<?php
// app/Http/Kernel.php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * The application's global HTTP middleware stack.
     *
     * These middleware are run during every request to your application.
     *
     * @var array<int, class-string|string>
     */
    protected $middleware = [
        \App\Http\Middleware\TrustProxies::class,
        \Illuminate\Http\Middleware\HandleCors::class,
        \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \App\Http\Middleware\TrimStrings::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
        \App\Http\Middleware\MeasureRequestTime::class,
    ];

    /**
     * The application's route middleware groups.
     *
     * @var array<string, array<int, class-string|string>>
     */
    protected $middlewareGroups = [
        'web' => [
            \App\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],

        'api' => [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    /**
     * The application's route middleware.
     *
     * These middleware may be assigned to groups or used individually.
     *
     * @var array<string, class-string|string>
     */
    protected $middlewareAliases = [
        'auth' => \App\Http\Middleware\Authenticate::class,
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'auth.session' => \Illuminate\Session\Middleware\AuthenticateSession::class,
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can' => \Illuminate\Auth\Middleware\Authorize::class,
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed' => \App\Http\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
        'verified.age' => \App\Http\Middleware\CheckUserAge::class,
        'valid.token' => \App\Http\Middleware\EnsureTokenIsValid::class,
    ];
}
```

---

## Global vs Route Middleware

### Global Middleware

Global middleware runs on every HTTP request:

```php
<?php
// app/Http/Middleware/SecurityHeaders.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Security headers to add to all responses
     */
    protected array $headers = [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'SAMEORIGIN',
        'X-XSS-Protection' => '1; mode=block',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        foreach ($this->headers as $key => $value) {
            $response->headers->set($key, $value);
        }

        // Add CSP header (customize based on your needs)
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        );

        return $response;
    }
}
```

Register as global middleware:

```php
// bootstrap/app.php (Laravel 11+)
$middleware->append(\App\Http\Middleware\SecurityHeaders::class);

// Or in Kernel.php (Laravel 10 and earlier)
protected $middleware = [
    // ... other middleware
    \App\Http\Middleware\SecurityHeaders::class,
];
```

### Route Middleware

Route middleware only runs on specific routes:

```php
<?php
// app/Http/Middleware/CheckSubscription.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscription
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        if (!$user->hasActiveSubscription()) {
            return response()->json([
                'error' => 'Subscription required',
                'message' => 'Please upgrade your account to access this feature.',
                'upgrade_url' => route('subscription.plans')
            ], 402);
        }

        return $next($request);
    }
}
```

Apply to routes:

```php
// routes/web.php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PremiumController;

// Single route
Route::get('/premium/dashboard', [PremiumController::class, 'dashboard'])
    ->middleware('subscription');

// Multiple middleware
Route::get('/premium/reports', [PremiumController::class, 'reports'])
    ->middleware(['auth', 'verified', 'subscription']);

// Route group
Route::middleware(['auth', 'subscription'])->group(function () {
    Route::get('/premium/analytics', [PremiumController::class, 'analytics']);
    Route::get('/premium/exports', [PremiumController::class, 'exports']);
    Route::post('/premium/generate-report', [PremiumController::class, 'generateReport']);
});
```

---

## Middleware Groups

Create custom middleware groups for common combinations:

```php
// bootstrap/app.php (Laravel 11+)
$middleware->group('admin', [
    'auth',
    \App\Http\Middleware\EnsureUserIsAdmin::class,
    \App\Http\Middleware\LogAdminActions::class,
    'throttle:admin',
]);

$middleware->group('api.authenticated', [
    'auth:sanctum',
    \App\Http\Middleware\ValidateApiVersion::class,
    \App\Http\Middleware\TrackApiUsage::class,
    'throttle:api',
]);

$middleware->group('premium', [
    'auth',
    'verified',
    \App\Http\Middleware\CheckSubscription::class,
    \App\Http\Middleware\TrackPremiumUsage::class,
]);
```

Use groups in routes:

```php
// routes/web.php

Route::middleware('admin')->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::post('/users/{user}/ban', [AdminController::class, 'banUser']);
    Route::get('/system/logs', [AdminController::class, 'logs']);
});

// routes/api.php

Route::middleware('api.authenticated')->prefix('v1')->group(function () {
    Route::apiResource('posts', PostController::class);
    Route::apiResource('comments', CommentController::class);
    Route::get('/user/profile', [UserController::class, 'profile']);
});
```

---

## Middleware Parameters

Pass parameters to middleware for flexible behavior:

```php
<?php
// app/Http/Middleware/CheckRole.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles  One or more roles to check
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Check if user has any of the required roles
        $userRoles = $user->roles->pluck('name')->toArray();
        $hasRole = !empty(array_intersect($roles, $userRoles));

        if (!$hasRole) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'You do not have permission to access this resource.',
                'required_roles' => $roles,
                'your_roles' => $userRoles
            ], 403);
        }

        return $next($request);
    }
}
```

Register and use with parameters:

```php
// Register alias
$middleware->alias([
    'role' => \App\Http\Middleware\CheckRole::class,
]);

// Usage in routes
Route::get('/admin/dashboard', [AdminController::class, 'dashboard'])
    ->middleware('role:admin');

Route::get('/reports', [ReportController::class, 'index'])
    ->middleware('role:admin,manager,analyst');

Route::delete('/users/{user}', [UserController::class, 'destroy'])
    ->middleware('role:super-admin');
```

### Multiple Parameters Example

```php
<?php
// app/Http/Middleware/RateLimit.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class RateLimit
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  int  $maxAttempts  Maximum number of attempts
     * @param  int  $decayMinutes  Time window in minutes
     * @param  string  $prefix  Cache key prefix
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(
        Request $request,
        Closure $next,
        int $maxAttempts = 60,
        int $decayMinutes = 1,
        string $prefix = 'rate_limit'
    ): Response {
        $key = $prefix . ':' . ($request->user()?->id ?? $request->ip());
        $decaySeconds = $decayMinutes * 60;

        $attempts = Cache::get($key, 0);

        if ($attempts >= $maxAttempts) {
            $retryAfter = Cache::get($key . ':timer', $decaySeconds);

            return response()->json([
                'error' => 'Too Many Requests',
                'message' => 'Rate limit exceeded. Please try again later.',
                'retry_after' => $retryAfter
            ], 429, [
                'X-RateLimit-Limit' => $maxAttempts,
                'X-RateLimit-Remaining' => 0,
                'Retry-After' => $retryAfter
            ]);
        }

        // Increment attempts
        if ($attempts === 0) {
            Cache::put($key, 1, $decaySeconds);
            Cache::put($key . ':timer', $decaySeconds, $decaySeconds);
        } else {
            Cache::increment($key);
        }

        $response = $next($request);

        // Add rate limit headers
        $response->headers->set('X-RateLimit-Limit', $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', max(0, $maxAttempts - $attempts - 1));

        return $response;
    }
}
```

```php
// Usage with multiple parameters (separated by commas)
Route::post('/api/login', [AuthController::class, 'login'])
    ->middleware('rate_limit:5,1,login');  // 5 attempts per minute

Route::post('/api/forgot-password', [AuthController::class, 'forgotPassword'])
    ->middleware('rate_limit:3,60,password_reset');  // 3 attempts per hour

Route::post('/api/send-verification', [AuthController::class, 'sendVerification'])
    ->middleware('rate_limit:2,1440,verification');  // 2 per day
```

---

## Terminable Middleware

Terminable middleware runs after the response has been sent to the browser:

```php
<?php
// app/Http/Middleware/LogRequestResponse.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Contracts\Foundation\TerminableMiddleware;

class LogRequestResponse implements TerminableMiddleware
{
    /**
     * Request start time
     */
    protected float $startTime;

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Store start time for later
        $this->startTime = microtime(true);

        // Store request data for terminate method
        $request->attributes->set('middleware_start_time', $this->startTime);

        return $next($request);
    }

    /**
     * Handle tasks after the response has been sent to the browser.
     *
     * This runs AFTER the response is sent, so it doesn't affect response time.
     */
    public function terminate(Request $request, Response $response): void
    {
        $startTime = $request->attributes->get('middleware_start_time', microtime(true));
        $duration = microtime(true) - $startTime;

        // Log detailed request/response information
        Log::channel('requests')->info('HTTP Request', [
            'timestamp' => now()->toISOString(),
            'method' => $request->method(),
            'uri' => $request->getRequestUri(),
            'full_url' => $request->fullUrl(),
            'status_code' => $response->getStatusCode(),
            'duration_ms' => round($duration * 1000, 2),
            'ip' => $request->ip(),
            'user_id' => $request->user()?->id,
            'user_agent' => $request->userAgent(),
            'referer' => $request->header('Referer'),
            'request_size' => strlen($request->getContent()),
            'response_size' => strlen($response->getContent()),
            'query_params' => $request->query(),
            'route_name' => $request->route()?->getName(),
        ]);

        // Send to external analytics service (async)
        $this->sendToAnalytics($request, $response, $duration);
    }

    /**
     * Send data to external analytics service
     */
    protected function sendToAnalytics(Request $request, Response $response, float $duration): void
    {
        // This runs after response is sent, so it's safe to do slow operations
        // Example: Send to OneUptime, Datadog, etc.
        // dispatch(new SendAnalyticsJob($data));
    }
}
```

---

## Practical Middleware Examples

### API Key Authentication

```php
<?php
// app/Http/Middleware/ValidateApiKey.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\ApiKey;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class ValidateApiKey
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key') ?? $request->query('api_key');

        if (!$apiKey) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'API key is required. Provide it via X-API-Key header or api_key query parameter.'
            ], 401);
        }

        // Cache API key validation for performance
        $cacheKey = 'api_key:' . hash('sha256', $apiKey);
        $keyData = Cache::remember($cacheKey, 300, function () use ($apiKey) {
            return ApiKey::where('key', hash('sha256', $apiKey))
                ->where('is_active', true)
                ->where(function ($query) {
                    $query->whereNull('expires_at')
                        ->orWhere('expires_at', '>', now());
                })
                ->first();
        });

        if (!$keyData) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid or expired API key.'
            ], 401);
        }

        // Add API key info to request for later use
        $request->attributes->set('api_key', $keyData);
        $request->attributes->set('api_key_owner', $keyData->user_id);

        // Track API key usage (async)
        dispatch(fn() => $keyData->increment('request_count'));

        return $next($request);
    }
}
```

### Maintenance Mode Bypass

```php
<?php
// app/Http/Middleware/MaintenanceBypass.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MaintenanceBypass
{
    /**
     * IPs allowed to bypass maintenance mode
     */
    protected array $allowedIps = [
        '127.0.0.1',
        '::1',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if maintenance mode is active
        if (!app()->isDownForMaintenance()) {
            return $next($request);
        }

        // Allow specific IPs
        if (in_array($request->ip(), $this->allowedIps)) {
            return $next($request);
        }

        // Allow requests with bypass cookie
        $secret = config('app.maintenance_secret');
        if ($secret && $request->cookie('maintenance_bypass') === $secret) {
            return $next($request);
        }

        // Allow health check endpoints
        if (in_array($request->path(), ['health', 'up', 'ping'])) {
            return $next($request);
        }

        return response()->json([
            'error' => 'Service Unavailable',
            'message' => 'The application is currently undergoing maintenance. Please try again later.',
            'estimated_downtime' => config('app.maintenance_estimated_end')
        ], 503);
    }
}
```

### Content Negotiation

```php
<?php
// app/Http/Middleware/ContentNegotiation.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentNegotiation
{
    /**
     * Supported content types
     */
    protected array $supportedTypes = [
        'application/json',
        'application/xml',
        'text/html',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get accepted types from request
        $acceptHeader = $request->header('Accept', 'application/json');
        $requestedType = $this->parseAcceptHeader($acceptHeader);

        // Check if requested type is supported
        if (!in_array($requestedType, $this->supportedTypes)) {
            return response()->json([
                'error' => 'Not Acceptable',
                'message' => 'Requested content type is not supported.',
                'supported_types' => $this->supportedTypes
            ], 406);
        }

        // Store preferred content type for controllers
        $request->attributes->set('preferred_content_type', $requestedType);

        $response = $next($request);

        // Transform response based on content type
        if ($requestedType === 'application/xml' && $response instanceof \Illuminate\Http\JsonResponse) {
            $data = $response->getData(true);
            $xml = $this->arrayToXml($data);
            return response($xml, $response->getStatusCode())
                ->header('Content-Type', 'application/xml');
        }

        return $response;
    }

    /**
     * Parse Accept header to get preferred type
     */
    protected function parseAcceptHeader(string $header): string
    {
        $types = explode(',', $header);

        foreach ($types as $type) {
            $type = trim(explode(';', $type)[0]);
            if (in_array($type, $this->supportedTypes)) {
                return $type;
            }
        }

        return 'application/json';
    }

    /**
     * Convert array to XML
     */
    protected function arrayToXml(array $data, string $rootElement = 'response'): string
    {
        $xml = new \SimpleXMLElement("<{$rootElement}/>");
        $this->arrayToXmlRecursive($data, $xml);
        return $xml->asXML();
    }

    protected function arrayToXmlRecursive(array $data, \SimpleXMLElement $xml): void
    {
        foreach ($data as $key => $value) {
            $key = is_numeric($key) ? 'item' : $key;
            if (is_array($value)) {
                $child = $xml->addChild($key);
                $this->arrayToXmlRecursive($value, $child);
            } else {
                $xml->addChild($key, htmlspecialchars((string) $value));
            }
        }
    }
}
```

### Request Sanitization

```php
<?php
// app/Http/Middleware/SanitizeInput.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeInput
{
    /**
     * Fields that should never be sanitized (passwords, etc.)
     */
    protected array $except = [
        'password',
        'password_confirmation',
        'current_password',
        'secret',
        'token',
    ];

    /**
     * Fields that should be completely stripped of HTML
     */
    protected array $stripHtml = [
        'name',
        'email',
        'username',
        'phone',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $input = $request->all();
        $sanitized = $this->sanitizeArray($input);
        $request->merge($sanitized);

        return $next($request);
    }

    /**
     * Recursively sanitize array
     */
    protected function sanitizeArray(array $data, string $prefix = ''): array
    {
        $result = [];

        foreach ($data as $key => $value) {
            $fullKey = $prefix ? "{$prefix}.{$key}" : $key;

            if (is_array($value)) {
                $result[$key] = $this->sanitizeArray($value, $fullKey);
            } elseif (is_string($value)) {
                $result[$key] = $this->sanitizeValue($key, $value);
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * Sanitize a single value
     */
    protected function sanitizeValue(string $key, string $value): string
    {
        // Skip excepted fields
        if (in_array($key, $this->except)) {
            return $value;
        }

        // Remove null bytes
        $value = str_replace(chr(0), '', $value);

        // Strip HTML completely for certain fields
        if (in_array($key, $this->stripHtml)) {
            $value = strip_tags($value);
        }

        // Trim whitespace
        $value = trim($value);

        // Normalize line endings
        $value = str_replace(["\r\n", "\r"], "\n", $value);

        return $value;
    }
}
```

### Locale Detection

```php
<?php
// app/Http/Middleware/SetLocale.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Supported locales
     */
    protected array $supportedLocales = ['en', 'es', 'fr', 'de', 'ja', 'zh'];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->determineLocale($request);

        App::setLocale($locale);

        $response = $next($request);

        // Add Content-Language header
        $response->headers->set('Content-Language', $locale);

        return $response;
    }

    /**
     * Determine the locale from various sources
     */
    protected function determineLocale(Request $request): string
    {
        // 1. Check URL parameter
        if ($locale = $request->query('lang')) {
            if ($this->isSupported($locale)) {
                return $locale;
            }
        }

        // 2. Check route parameter
        if ($locale = $request->route('locale')) {
            if ($this->isSupported($locale)) {
                return $locale;
            }
        }

        // 3. Check Accept-Language header
        $acceptLanguage = $request->header('Accept-Language', '');
        if ($locale = $this->parseAcceptLanguage($acceptLanguage)) {
            return $locale;
        }

        // 4. Check user preference (if authenticated)
        if ($user = $request->user()) {
            if ($this->isSupported($user->preferred_locale)) {
                return $user->preferred_locale;
            }
        }

        // 5. Check session
        if ($locale = session('locale')) {
            if ($this->isSupported($locale)) {
                return $locale;
            }
        }

        // 6. Default
        return config('app.locale', 'en');
    }

    /**
     * Check if locale is supported
     */
    protected function isSupported(?string $locale): bool
    {
        return $locale && in_array($locale, $this->supportedLocales);
    }

    /**
     * Parse Accept-Language header
     */
    protected function parseAcceptLanguage(string $header): ?string
    {
        $languages = explode(',', $header);

        foreach ($languages as $language) {
            $parts = explode(';', trim($language));
            $locale = trim($parts[0]);

            // Handle full locale (en-US) or short (en)
            $shortLocale = explode('-', $locale)[0];

            if ($this->isSupported($shortLocale)) {
                return $shortLocale;
            }
        }

        return null;
    }
}
```

---

## Middleware Priority

Control the order in which middleware executes:

```php
// bootstrap/app.php (Laravel 11+)
->withMiddleware(function (Middleware $middleware) {
    // Priority determines order (lower number = runs first)
    $middleware->priority([
        \App\Http\Middleware\TrustProxies::class,          // 1st
        \Illuminate\Http\Middleware\HandleCors::class,     // 2nd
        \App\Http\Middleware\SecurityHeaders::class,       // 3rd
        \Illuminate\Session\Middleware\StartSession::class, // 4th
        \App\Http\Middleware\SetLocale::class,             // 5th
        \App\Http\Middleware\Authenticate::class,          // 6th
        \App\Http\Middleware\CheckRole::class,             // 7th
    ]);
})
```

---

## Testing Middleware

### Unit Testing

```php
<?php
// tests/Unit/Middleware/CheckRoleTest.php

namespace Tests\Unit\Middleware;

use Tests\TestCase;
use App\Http\Middleware\CheckRole;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CheckRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_allows_user_with_required_role()
    {
        // Create user with admin role
        $user = User::factory()->create();
        $role = Role::create(['name' => 'admin']);
        $user->roles()->attach($role);

        // Create request with authenticated user
        $request = Request::create('/admin/dashboard', 'GET');
        $request->setUserResolver(fn() => $user);

        $middleware = new CheckRole();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK');
        }, 'admin');

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('OK', $response->getContent());
    }

    public function test_rejects_user_without_required_role()
    {
        // Create user without admin role
        $user = User::factory()->create();
        $role = Role::create(['name' => 'viewer']);
        $user->roles()->attach($role);

        $request = Request::create('/admin/dashboard', 'GET');
        $request->setUserResolver(fn() => $user);

        $middleware = new CheckRole();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK');
        }, 'admin');

        $this->assertEquals(403, $response->getStatusCode());
    }

    public function test_allows_user_with_any_of_multiple_roles()
    {
        $user = User::factory()->create();
        $role = Role::create(['name' => 'manager']);
        $user->roles()->attach($role);

        $request = Request::create('/reports', 'GET');
        $request->setUserResolver(fn() => $user);

        $middleware = new CheckRole();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK');
        }, 'admin', 'manager', 'analyst');

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_rejects_unauthenticated_user()
    {
        $request = Request::create('/admin/dashboard', 'GET');
        $request->setUserResolver(fn() => null);

        $middleware = new CheckRole();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK');
        }, 'admin');

        $this->assertEquals(401, $response->getStatusCode());
    }
}
```

### Feature Testing

```php
<?php
// tests/Feature/Middleware/RateLimitTest.php

namespace Tests\Feature\Middleware;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_allows_requests_within_limit()
    {
        $user = User::factory()->create();

        // Make 5 requests (within limit of 5 per minute)
        for ($i = 0; $i < 5; $i++) {
            $response = $this->actingAs($user)
                ->postJson('/api/login-attempt');

            $response->assertStatus(200);
        }
    }

    public function test_blocks_requests_exceeding_limit()
    {
        $user = User::factory()->create();

        // Make 5 requests (within limit)
        for ($i = 0; $i < 5; $i++) {
            $this->actingAs($user)->postJson('/api/login-attempt');
        }

        // 6th request should be blocked
        $response = $this->actingAs($user)
            ->postJson('/api/login-attempt');

        $response->assertStatus(429)
            ->assertJson([
                'error' => 'Too Many Requests'
            ]);
    }

    public function test_includes_rate_limit_headers()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/data');

        $response->assertHeader('X-RateLimit-Limit')
            ->assertHeader('X-RateLimit-Remaining');
    }

    public function test_rate_limit_resets_after_window()
    {
        $user = User::factory()->create();

        // Exhaust rate limit
        for ($i = 0; $i < 5; $i++) {
            $this->actingAs($user)->postJson('/api/login-attempt');
        }

        // Travel forward in time
        $this->travel(2)->minutes();

        // Should be allowed again
        $response = $this->actingAs($user)
            ->postJson('/api/login-attempt');

        $response->assertStatus(200);
    }
}
```

---

## Excluding Routes from Middleware

### Using Route Definition

```php
// routes/web.php

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/profile', [ProfileController::class, 'show']);

    // Exclude specific route from a middleware applied in group
    Route::withoutMiddleware('verified')->group(function () {
        Route::get('/verify-email', [VerificationController::class, 'show']);
        Route::post('/verify-email', [VerificationController::class, 'verify']);
    });
});
```

### Using Controller Middleware

```php
<?php
// app/Http/Controllers/UserController.php

namespace App\Http\Controllers;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            'auth',
            new Middleware('verified', except: ['index', 'show']),
            new Middleware('admin', only: ['destroy']),
        ];
    }

    public function index()
    {
        // Requires auth only
    }

    public function show(User $user)
    {
        // Requires auth only
    }

    public function edit(User $user)
    {
        // Requires auth and verified
    }

    public function destroy(User $user)
    {
        // Requires auth, verified, and admin
    }
}
```

---

## Common Middleware Patterns

### Request ID Tracking

```php
<?php
// app/Http/Middleware/AddRequestId.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AddRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        // Use existing request ID or generate new one
        $requestId = $request->header('X-Request-Id') ?? Str::uuid()->toString();

        // Store for use throughout application
        $request->attributes->set('request_id', $requestId);

        // Add to log context
        \Illuminate\Support\Facades\Log::shareContext([
            'request_id' => $requestId
        ]);

        $response = $next($request);

        // Include in response
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
```

### JSON Response Enforcement

```php
<?php
// app/Http/Middleware/ForceJsonResponse.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        // Force Accept header to JSON for API routes
        $request->headers->set('Accept', 'application/json');

        return $next($request);
    }
}
```

### CORS Handling

```php
<?php
// app/Http/Middleware/Cors.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Cors
{
    protected array $allowedOrigins = [
        'https://example.com',
        'https://app.example.com',
    ];

    protected array $allowedMethods = [
        'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'
    ];

    protected array $allowedHeaders = [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Handle preflight OPTIONS request
        if ($request->isMethod('OPTIONS')) {
            return $this->handlePreflight($request);
        }

        $response = $next($request);

        return $this->addCorsHeaders($request, $response);
    }

    protected function handlePreflight(Request $request): Response
    {
        $response = response('', 204);
        return $this->addCorsHeaders($request, $response);
    }

    protected function addCorsHeaders(Request $request, Response $response): Response
    {
        $origin = $request->header('Origin');

        // Check if origin is allowed
        if ($origin && $this->isAllowedOrigin($origin)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Methods', implode(', ', $this->allowedMethods));
            $response->headers->set('Access-Control-Allow-Headers', implode(', ', $this->allowedHeaders));
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Max-Age', '86400');
        }

        return $response;
    }

    protected function isAllowedOrigin(string $origin): bool
    {
        // Allow all in development
        if (app()->environment('local')) {
            return true;
        }

        return in_array($origin, $this->allowedOrigins);
    }
}
```

---

## Debugging Middleware

### Middleware Execution Logger

```php
<?php
// app/Http/Middleware/DebugMiddlewareExecution.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class DebugMiddlewareExecution
{
    protected static int $order = 0;

    public function handle(Request $request, Closure $next): Response
    {
        if (!config('app.debug')) {
            return $next($request);
        }

        $order = ++self::$order;
        $class = static::class;

        Log::debug("Middleware #{$order} START: {$class}", [
            'uri' => $request->getRequestUri(),
            'method' => $request->method()
        ]);

        $startTime = microtime(true);
        $response = $next($request);
        $duration = round((microtime(true) - $startTime) * 1000, 2);

        Log::debug("Middleware #{$order} END: {$class}", [
            'duration_ms' => $duration,
            'status' => $response->getStatusCode()
        ]);

        return $response;
    }
}
```

---

## Conclusion

Middleware is a fundamental building block in Laravel applications. Key takeaways:

- **Before middleware** validates and transforms requests before they reach controllers
- **After middleware** modifies responses before sending to clients
- **Terminable middleware** handles tasks after the response is sent
- **Global middleware** runs on every request; route middleware runs on specific routes
- **Middleware parameters** enable flexible, reusable logic
- **Middleware groups** simplify applying multiple middleware to routes

Well-designed middleware keeps your controllers clean and ensures consistent request/response handling across your application.

---

*Managing a Laravel application in production? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your Laravel services, including response time tracking, error alerting, and uptime monitoring to keep your middleware performing optimally.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
- [The Three Pillars of Observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
