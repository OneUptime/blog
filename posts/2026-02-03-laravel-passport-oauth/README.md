# How to Use Laravel Passport for OAuth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PHP, Laravel, Passport, OAuth, Authentication, API

Description: Learn how to implement OAuth2 authentication in Laravel with Passport. This guide covers token management, scopes, and securing API endpoints.

---

If you have ever built an API that needs to authenticate users or third-party applications, you know how tricky it can get. OAuth2 is the industry standard for authorization, and Laravel Passport makes implementing it surprisingly straightforward. In this guide, I will walk you through everything you need to know to get Passport up and running in your Laravel application.

## What is Laravel Passport?

Laravel Passport is a full OAuth2 server implementation for your Laravel application. It provides a complete OAuth2 server implementation in a matter of minutes. Passport is built on top of the League OAuth2 server, which is maintained by Alex Bilbie and the PHP League.

Before Passport, implementing OAuth2 in Laravel required significant effort and understanding of the OAuth2 specification. Passport abstracts away most of that complexity while still giving you full control when you need it.

## Why Use OAuth2?

OAuth2 solves a specific problem: how do you let third-party applications access user data without sharing passwords? Think about how you can log into various apps using your Google or GitHub account. That is OAuth2 in action.

For your own APIs, OAuth2 provides:

- **Token-based authentication** - No need to send credentials with every request
- **Scoped access** - Control what each token can and cannot do
- **Token expiration** - Limit the window of vulnerability if a token is compromised
- **Revocation** - Instantly invalidate tokens when needed

## Prerequisites

Before we dive in, make sure you have:

- PHP 8.1 or higher
- Laravel 10.x or 11.x installed
- Composer installed
- A database configured (MySQL, PostgreSQL, or SQLite)

## Installation

Let us start by installing Passport via Composer.

```bash
# Install Laravel Passport via Composer
composer require laravel/passport
```

Once installed, run the migrations to create the necessary database tables:

```bash
# Run Passport migrations to create OAuth tables
php artisan migrate
```

This creates several tables in your database:

- `oauth_auth_codes` - Stores authorization codes
- `oauth_access_tokens` - Stores access tokens
- `oauth_refresh_tokens` - Stores refresh tokens
- `oauth_clients` - Stores OAuth clients
- `oauth_personal_access_clients` - Links personal access clients

Next, generate the encryption keys that Passport uses to generate secure tokens:

```bash
# Generate encryption keys for secure token generation
php artisan passport:install
```

This command creates the encryption keys needed to generate secure access tokens. It also creates "personal access" and "password grant" clients which will be used to generate access tokens.

## Configuring Your User Model

Add the `HasApiTokens` trait to your User model. This trait provides helper methods to inspect the authenticated user's token and scopes.

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;

class User extends Authenticatable
{
    // Include the HasApiTokens trait for Passport functionality
    use HasApiTokens, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
```

## Registering Passport Routes

In Laravel 11, you need to register Passport routes in your `AppServiceProvider`. Add the following to the `boot` method:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Passport routes for OAuth endpoints
        Passport::routes();

        // Optional: Set token expiration times
        Passport::tokensExpireIn(now()->addDays(15));
        Passport::refreshTokensExpireIn(now()->addDays(30));
        Passport::personalAccessTokensExpireIn(now()->addMonths(6));
    }
}
```

For Laravel 10, you would typically do this in `AuthServiceProvider` instead.

## Configuring the API Guard

Update your `config/auth.php` to use Passport's token driver for the API guard:

```php
<?php

return [
    // ... other config options

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        // Configure the API guard to use Passport
        'api' => [
            'driver' => 'passport',
            'provider' => 'users',
        ],
    ],

    // ... rest of config
];
```

## Understanding Token Types

Passport supports several OAuth2 grant types. Let us explore each one.

### Personal Access Tokens

Personal access tokens are the simplest way to issue tokens. They are ideal for when users want to generate API tokens for themselves - think GitHub personal access tokens.

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TokenController extends Controller
{
    /**
     * Create a new personal access token for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function createToken(Request $request): JsonResponse
    {
        // Validate the incoming request
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'scopes' => 'nullable|array',
            'scopes.*' => 'string',
        ]);

        // Get the authenticated user
        $user = $request->user();

        // Create the personal access token with optional scopes
        // The name helps users identify what the token is for
        $token = $user->createToken(
            $validated['name'],
            $validated['scopes'] ?? []
        );

        // Return the token details
        // IMPORTANT: The plainTextToken is only available once
        return response()->json([
            'access_token' => $token->accessToken,
            'token_type' => 'Bearer',
            'expires_at' => $token->token->expires_at,
        ]);
    }

    /**
     * List all tokens for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function listTokens(Request $request): JsonResponse
    {
        // Retrieve all tokens for the current user
        $tokens = $request->user()->tokens;

        // Map tokens to a cleaner response format
        $tokenList = $tokens->map(function ($token) {
            return [
                'id' => $token->id,
                'name' => $token->name,
                'scopes' => $token->scopes,
                'revoked' => $token->revoked,
                'created_at' => $token->created_at,
                'expires_at' => $token->expires_at,
            ];
        });

        return response()->json(['tokens' => $tokenList]);
    }
}
```

### Password Grant Tokens

The password grant allows your first-party clients (like your mobile app) to exchange a username and password for an access token. This is useful when you control both the client and the server.

First, create a password grant client:

```bash
# Create a password grant client for first-party applications
php artisan passport:client --password
```

Now you can exchange credentials for tokens:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    /**
     * Handle a login request using the password grant.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function login(Request $request): JsonResponse
    {
        // Validate the login credentials
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Find the user by email
        $user = User::where('email', $validated['email'])->first();

        // Check if user exists and password is correct
        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Make a request to the Passport token endpoint
        // This exchanges the credentials for an access token
        $response = Http::asForm()->post(url('/oauth/token'), [
            'grant_type' => 'password',
            'client_id' => config('passport.password_client_id'),
            'client_secret' => config('passport.password_client_secret'),
            'username' => $validated['email'],
            'password' => $validated['password'],
            'scope' => '',
        ]);

        // Check if the token request was successful
        if ($response->failed()) {
            return response()->json([
                'message' => 'Unable to generate token',
            ], 500);
        }

        // Return the token response
        return response()->json($response->json());
    }

    /**
     * Refresh an access token using a refresh token.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function refresh(Request $request): JsonResponse
    {
        // Validate the refresh token
        $validated = $request->validate([
            'refresh_token' => 'required|string',
        ]);

        // Make a request to refresh the token
        $response = Http::asForm()->post(url('/oauth/token'), [
            'grant_type' => 'refresh_token',
            'refresh_token' => $validated['refresh_token'],
            'client_id' => config('passport.password_client_id'),
            'client_secret' => config('passport.password_client_secret'),
            'scope' => '',
        ]);

        if ($response->failed()) {
            return response()->json([
                'message' => 'Unable to refresh token',
            ], 401);
        }

        return response()->json($response->json());
    }
}
```

Add the client credentials to your `config/passport.php`:

```php
<?php

return [
    // Password grant client credentials
    // These should be stored in your .env file
    'password_client_id' => env('PASSPORT_PASSWORD_CLIENT_ID'),
    'password_client_secret' => env('PASSPORT_PASSWORD_CLIENT_SECRET'),
];
```

And in your `.env` file:

```env
PASSPORT_PASSWORD_CLIENT_ID=your-client-id
PASSPORT_PASSWORD_CLIENT_SECRET=your-client-secret
```

### Authorization Code Grant

The authorization code grant is the most secure OAuth2 flow and is used for third-party applications. This is what happens when you click "Login with GitHub" on a website.

Here is how to implement the authorization flow:

```php
<?php

namespace App\Http\Controllers\OAuth;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;

class AuthorizationController extends Controller
{
    /**
     * Redirect to the authorization page.
     * This is typically called from the third-party application.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function redirect(Request $request): RedirectResponse
    {
        // Generate a random state parameter for CSRF protection
        $state = Str::random(40);

        // Store the state in the session to verify later
        $request->session()->put('oauth_state', $state);

        // Build the authorization URL
        $query = http_build_query([
            'client_id' => config('services.your_app.client_id'),
            'redirect_uri' => config('services.your_app.redirect'),
            'response_type' => 'code',
            'scope' => 'read-user read-posts',
            'state' => $state,
        ]);

        // Redirect to the authorization endpoint
        return redirect(config('services.your_app.url') . '/oauth/authorize?' . $query);
    }

    /**
     * Handle the callback from the authorization server.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function callback(Request $request)
    {
        // Verify the state parameter to prevent CSRF attacks
        $storedState = $request->session()->pull('oauth_state');

        if ($storedState !== $request->state) {
            abort(403, 'Invalid state parameter');
        }

        // Exchange the authorization code for an access token
        $response = Http::asForm()->post(config('services.your_app.url') . '/oauth/token', [
            'grant_type' => 'authorization_code',
            'client_id' => config('services.your_app.client_id'),
            'client_secret' => config('services.your_app.client_secret'),
            'redirect_uri' => config('services.your_app.redirect'),
            'code' => $request->code,
        ]);

        // Store the tokens securely and redirect the user
        // In a real app, you would save these tokens to the database
        return response()->json($response->json());
    }
}
```

### Client Credentials Grant

The client credentials grant is used when applications need to authenticate themselves rather than a user. This is perfect for machine-to-machine communication.

```bash
# Create a client credentials grant client
php artisan passport:client --client
```

To use client credentials authentication:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;

class ExternalApiController extends Controller
{
    /**
     * Make an authenticated request to an external API using client credentials.
     *
     * @return JsonResponse
     */
    public function fetchData(): JsonResponse
    {
        // First, get an access token using client credentials
        $tokenResponse = Http::asForm()->post('https://api.example.com/oauth/token', [
            'grant_type' => 'client_credentials',
            'client_id' => config('services.external_api.client_id'),
            'client_secret' => config('services.external_api.client_secret'),
            'scope' => 'read-data',
        ]);

        if ($tokenResponse->failed()) {
            return response()->json(['error' => 'Failed to obtain token'], 500);
        }

        $accessToken = $tokenResponse->json('access_token');

        // Now use the token to make authenticated requests
        $dataResponse = Http::withToken($accessToken)
            ->get('https://api.example.com/api/data');

        return response()->json($dataResponse->json());
    }
}
```

To protect routes that require client credentials, use the `client` middleware:

```php
<?php

use Illuminate\Support\Facades\Route;

// Routes that require client credentials authentication
Route::middleware('client')->group(function () {
    Route::get('/api/machine-data', function () {
        return response()->json(['data' => 'This is machine-to-machine data']);
    });
});
```

Register the middleware in your `bootstrap/app.php` (Laravel 11):

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Passport\Http\Middleware\CheckClientCredentials;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Register the client credentials middleware
        $middleware->alias([
            'client' => CheckClientCredentials::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
```

## Implementing Scopes

Scopes let you define specific permissions for access tokens. This is crucial for limiting what third-party applications can do with user data.

### Defining Scopes

Define your scopes in the `AppServiceProvider`:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Passport routes
        Passport::routes();

        // Define available scopes
        // Each scope has a key and a human-readable description
        Passport::tokensCan([
            'read-user' => 'Read user profile information',
            'update-user' => 'Update user profile information',
            'delete-user' => 'Delete user account',
            'read-posts' => 'Read user posts',
            'create-posts' => 'Create new posts',
            'update-posts' => 'Update existing posts',
            'delete-posts' => 'Delete posts',
            'read-comments' => 'Read comments',
            'create-comments' => 'Create new comments',
            'admin' => 'Full administrative access',
        ]);

        // Set the default scope if none is requested
        Passport::setDefaultScope([
            'read-user',
        ]);
    }
}
```

### Protecting Routes with Scopes

Use the `scope` or `scopes` middleware to protect routes:

```php
<?php

use Illuminate\Support\Facades\Route;

// Protect routes with scope middleware
Route::middleware(['auth:api'])->group(function () {

    // This route requires the 'read-user' scope
    Route::get('/user', function (Request $request) {
        return $request->user();
    })->middleware('scope:read-user');

    // This route requires EITHER 'read-posts' OR 'admin' scope
    Route::get('/posts', function () {
        return Post::all();
    })->middleware('scope:read-posts,admin');

    // This route requires BOTH 'create-posts' AND 'update-posts' scopes
    Route::post('/posts', function (Request $request) {
        // Create post logic
    })->middleware('scopes:create-posts,update-posts');
});
```

Register the scope middlewares in `bootstrap/app.php`:

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Passport\Http\Middleware\CheckScopes;
use Laravel\Passport\Http\Middleware\CheckForAnyScope;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'scopes' => CheckScopes::class,      // Requires ALL listed scopes
            'scope' => CheckForAnyScope::class,  // Requires ANY of the listed scopes
        ]);
    })
    ->create();
```

### Checking Scopes Programmatically

You can also check scopes within your controller logic:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    /**
     * Get the authenticated user's profile.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user->token();

        // Build the response based on token scopes
        $response = [
            'id' => $user->id,
            'name' => $user->name,
        ];

        // Only include email if the token has the appropriate scope
        if ($token->can('read-user')) {
            $response['email'] = $user->email;
            $response['email_verified_at'] = $user->email_verified_at;
        }

        // Include sensitive data only with admin scope
        if ($token->can('admin')) {
            $response['created_at'] = $user->created_at;
            $response['updated_at'] = $user->updated_at;
            $response['roles'] = $user->roles;
        }

        return response()->json($response);
    }

    /**
     * Update the authenticated user's profile.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user->token();

        // Check if the token has permission to update user data
        if (!$token->can('update-user')) {
            return response()->json([
                'message' => 'Token does not have the required scope',
                'required_scope' => 'update-user',
            ], 403);
        }

        // Validate and update user data
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user,
        ]);
    }
}
```

## Token Revocation

Being able to revoke tokens is critical for security. If a token is compromised or a user wants to log out all sessions, you need a way to invalidate tokens.

### Revoking Individual Tokens

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Laravel\Passport\Token;

class TokenController extends Controller
{
    /**
     * Revoke a specific token by ID.
     *
     * @param Request $request
     * @param string $tokenId
     * @return JsonResponse
     */
    public function revoke(Request $request, string $tokenId): JsonResponse
    {
        $user = $request->user();

        // Find the token that belongs to the current user
        $token = $user->tokens()->find($tokenId);

        if (!$token) {
            return response()->json([
                'message' => 'Token not found',
            ], 404);
        }

        // Revoke the token
        $token->revoke();

        // Also revoke the refresh token associated with this access token
        $refreshTokenRepository = app('Laravel\Passport\RefreshTokenRepository');
        $refreshTokenRepository->revokeRefreshTokensByAccessTokenId($tokenId);

        return response()->json([
            'message' => 'Token revoked successfully',
        ]);
    }

    /**
     * Revoke the current access token (logout).
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        // Get the current token
        $token = $request->user()->token();

        // Revoke it
        $token->revoke();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Revoke all tokens for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function revokeAll(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get all tokens for the user
        $tokens = $user->tokens;

        // Revoke each token
        foreach ($tokens as $token) {
            $token->revoke();
        }

        return response()->json([
            'message' => 'All tokens revoked successfully',
            'revoked_count' => $tokens->count(),
        ]);
    }
}
```

### Creating a Token Management Service

For more complex applications, consider creating a dedicated service:

```php
<?php

namespace App\Services;

use App\Models\User;
use Laravel\Passport\Token;
use Laravel\Passport\RefreshTokenRepository;
use Illuminate\Support\Collection;

class TokenManagementService
{
    /**
     * Create a new service instance.
     *
     * @param RefreshTokenRepository $refreshTokenRepository
     */
    public function __construct(
        protected RefreshTokenRepository $refreshTokenRepository
    ) {}

    /**
     * Revoke a single token by ID.
     *
     * @param User $user
     * @param string $tokenId
     * @return bool
     */
    public function revokeToken(User $user, string $tokenId): bool
    {
        $token = $user->tokens()->find($tokenId);

        if (!$token) {
            return false;
        }

        $token->revoke();
        $this->refreshTokenRepository->revokeRefreshTokensByAccessTokenId($tokenId);

        return true;
    }

    /**
     * Revoke all tokens for a user.
     *
     * @param User $user
     * @return int Number of tokens revoked
     */
    public function revokeAllTokens(User $user): int
    {
        $count = 0;

        foreach ($user->tokens as $token) {
            $token->revoke();
            $this->refreshTokenRepository->revokeRefreshTokensByAccessTokenId($token->id);
            $count++;
        }

        return $count;
    }

    /**
     * Revoke all tokens except the current one.
     *
     * @param User $user
     * @param string $currentTokenId
     * @return int Number of tokens revoked
     */
    public function revokeOtherTokens(User $user, string $currentTokenId): int
    {
        $count = 0;

        foreach ($user->tokens as $token) {
            if ($token->id !== $currentTokenId) {
                $token->revoke();
                $this->refreshTokenRepository->revokeRefreshTokensByAccessTokenId($token->id);
                $count++;
            }
        }

        return $count;
    }

    /**
     * Get all active tokens for a user.
     *
     * @param User $user
     * @return Collection
     */
    public function getActiveTokens(User $user): Collection
    {
        return $user->tokens()
            ->where('revoked', false)
            ->where('expires_at', '>', now())
            ->get();
    }

    /**
     * Cleanup expired and revoked tokens.
     *
     * @return int Number of tokens deleted
     */
    public function cleanupTokens(): int
    {
        // Delete tokens that are revoked or expired
        return Token::where('revoked', true)
            ->orWhere('expires_at', '<', now())
            ->delete();
    }
}
```

## Protecting API Routes

Here is a complete example of how to set up your API routes with Passport authentication:

```php
<?php

// routes/api.php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\TokenController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
| These routes do not require authentication
*/

Route::post('/login', [LoginController::class, 'login']);
Route::post('/register', [LoginController::class, 'register']);
Route::post('/token/refresh', [LoginController::class, 'refresh']);

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
| These routes require a valid access token
*/

Route::middleware('auth:api')->group(function () {

    // User routes
    Route::get('/user', [UserController::class, 'show'])
        ->middleware('scope:read-user');

    Route::put('/user', [UserController::class, 'update'])
        ->middleware('scope:update-user');

    Route::delete('/user', [UserController::class, 'destroy'])
        ->middleware('scope:delete-user');

    // Token management routes
    Route::get('/tokens', [TokenController::class, 'listTokens']);
    Route::post('/tokens', [TokenController::class, 'createToken']);
    Route::delete('/tokens/{tokenId}', [TokenController::class, 'revoke']);
    Route::post('/logout', [TokenController::class, 'logout']);
    Route::post('/logout-all', [TokenController::class, 'revokeAll']);

    // Post routes with scope protection
    Route::get('/posts', [PostController::class, 'index'])
        ->middleware('scope:read-posts');

    Route::get('/posts/{post}', [PostController::class, 'show'])
        ->middleware('scope:read-posts');

    Route::post('/posts', [PostController::class, 'store'])
        ->middleware('scope:create-posts');

    Route::put('/posts/{post}', [PostController::class, 'update'])
        ->middleware('scope:update-posts');

    Route::delete('/posts/{post}', [PostController::class, 'destroy'])
        ->middleware('scope:delete-posts');
});

/*
|--------------------------------------------------------------------------
| Client Credentials Routes
|--------------------------------------------------------------------------
| These routes require client credentials authentication (machine-to-machine)
*/

Route::middleware('client')->group(function () {
    Route::get('/stats', function () {
        return response()->json([
            'total_users' => User::count(),
            'total_posts' => Post::count(),
        ]);
    });
});
```

## Customizing Token Responses

You might want to customize what gets returned when a token is issued:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class LoginController extends Controller
{
    /**
     * Handle login and return a customized token response.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Verify credentials
        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
        }

        // Get the token from Passport
        $response = Http::asForm()->post(url('/oauth/token'), [
            'grant_type' => 'password',
            'client_id' => config('passport.password_client_id'),
            'client_secret' => config('passport.password_client_secret'),
            'username' => $validated['email'],
            'password' => $validated['password'],
            'scope' => '*',
        ]);

        if ($response->failed()) {
            return response()->json([
                'message' => 'Failed to generate token',
            ], 500);
        }

        $tokenData = $response->json();

        // Return a customized response with user data
        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'authorization' => [
                'access_token' => $tokenData['access_token'],
                'token_type' => $tokenData['token_type'],
                'expires_in' => $tokenData['expires_in'],
                'refresh_token' => $tokenData['refresh_token'],
            ],
        ]);
    }
}
```

## Handling Token Errors

Create a custom exception handler for Passport errors:

```php
<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Laravel\Passport\Exceptions\MissingScopeException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * Render an exception into an HTTP response.
     *
     * @param \Illuminate\Http\Request $request
     * @param \Throwable $e
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function render($request, Throwable $e)
    {
        // Handle missing scope exceptions
        if ($e instanceof MissingScopeException) {
            return response()->json([
                'message' => 'Insufficient permissions',
                'error' => 'missing_scope',
                'required_scopes' => $e->scopes(),
            ], 403);
        }

        return parent::render($request, $e);
    }

    /**
     * Convert an authentication exception into a response.
     *
     * @param \Illuminate\Http\Request $request
     * @param \Illuminate\Auth\AuthenticationException $exception
     * @return \Symfony\Component\HttpFoundation\Response
     */
    protected function unauthenticated($request, AuthenticationException $exception)
    {
        // Always return JSON for API requests
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Unauthenticated',
                'error' => 'invalid_token',
            ], 401);
        }

        return redirect()->guest(route('login'));
    }
}
```

## Testing Your Passport Implementation

Here is how to write tests for your OAuth implementation:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Set up the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Run Passport installation for testing
        $this->artisan('passport:install');
    }

    /**
     * Test that authenticated users can access protected routes.
     */
    public function test_authenticated_user_can_access_protected_route(): void
    {
        // Create a user
        $user = User::factory()->create();

        // Use Passport's actingAs helper to authenticate
        Passport::actingAs($user);

        // Make a request to a protected route
        $response = $this->getJson('/api/user');

        // Assert the response is successful
        $response->assertOk()
            ->assertJsonStructure(['id', 'name', 'email']);
    }

    /**
     * Test that unauthenticated users cannot access protected routes.
     */
    public function test_unauthenticated_user_cannot_access_protected_route(): void
    {
        $response = $this->getJson('/api/user');

        $response->assertUnauthorized();
    }

    /**
     * Test that tokens with correct scopes can access scoped routes.
     */
    public function test_token_with_correct_scope_can_access_scoped_route(): void
    {
        $user = User::factory()->create();

        // Authenticate with specific scopes
        Passport::actingAs($user, ['read-posts']);

        $response = $this->getJson('/api/posts');

        $response->assertOk();
    }

    /**
     * Test that tokens without required scope are rejected.
     */
    public function test_token_without_required_scope_is_rejected(): void
    {
        $user = User::factory()->create();

        // Authenticate with different scopes
        Passport::actingAs($user, ['read-user']);

        // Try to access a route that requires 'create-posts' scope
        $response = $this->postJson('/api/posts', [
            'title' => 'Test Post',
            'content' => 'Test content',
        ]);

        $response->assertForbidden();
    }

    /**
     * Test personal access token creation.
     */
    public function test_user_can_create_personal_access_token(): void
    {
        $user = User::factory()->create();

        Passport::actingAs($user);

        $response = $this->postJson('/api/tokens', [
            'name' => 'My API Token',
            'scopes' => ['read-user', 'read-posts'],
        ]);

        $response->assertOk()
            ->assertJsonStructure(['access_token', 'token_type', 'expires_at']);
    }

    /**
     * Test token revocation.
     */
    public function test_user_can_revoke_token(): void
    {
        $user = User::factory()->create();

        // Create a token
        $token = $user->createToken('Test Token');

        Passport::actingAs($user);

        $response = $this->deleteJson('/api/tokens/' . $token->token->id);

        $response->assertOk()
            ->assertJson(['message' => 'Token revoked successfully']);

        // Verify the token is revoked
        $this->assertTrue($token->token->fresh()->revoked);
    }
}
```

## Security Best Practices

When implementing OAuth2 with Passport, keep these security practices in mind:

### 1. Use HTTPS

Always use HTTPS in production. OAuth2 tokens are bearer tokens - anyone who intercepts them can use them.

```php
<?php

// In your AppServiceProvider or a middleware
if (app()->environment('production')) {
    \URL::forceScheme('https');
}
```

### 2. Set Appropriate Token Lifetimes

Do not let tokens live forever. Short-lived access tokens with refresh tokens are more secure.

```php
<?php

// In AppServiceProvider
Passport::tokensExpireIn(now()->addHours(1));
Passport::refreshTokensExpireIn(now()->addDays(7));
Passport::personalAccessTokensExpireIn(now()->addDays(30));
```

### 3. Use Scopes Effectively

Always use the minimum required scopes. Do not request full access when you only need to read user profiles.

### 4. Implement Rate Limiting

Protect your token endpoints from brute force attacks:

```php
<?php

// In routes/api.php
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/login', [LoginController::class, 'login']);
    Route::post('/token/refresh', [LoginController::class, 'refresh']);
});
```

### 5. Validate Redirect URIs

When implementing the authorization code grant, always validate that redirect URIs match exactly:

```php
<?php

// When creating OAuth clients, specify exact redirect URIs
// Never allow wildcard redirects in production
```

### 6. Clean Up Expired Tokens

Regularly purge expired and revoked tokens to keep your database clean:

```php
<?php

// Create a scheduled command
// In app/Console/Kernel.php

protected function schedule(Schedule $schedule): void
{
    // Purge revoked and expired tokens daily
    $schedule->command('passport:purge')->daily();
}
```

## Conclusion

Laravel Passport provides a robust, full-featured OAuth2 implementation that can handle everything from simple personal access tokens to complex third-party authorization flows. The key points to remember are:

1. **Choose the right grant type** for your use case - personal access tokens for user-generated API keys, password grant for first-party apps, authorization code grant for third-party apps, and client credentials for machine-to-machine communication.

2. **Use scopes** to limit what each token can access. This follows the principle of least privilege.

3. **Implement proper token management** - users should be able to see their active tokens and revoke them when needed.

4. **Follow security best practices** - use HTTPS, set appropriate token lifetimes, and regularly clean up expired tokens.

5. **Test thoroughly** - Passport provides testing helpers that make it easy to write comprehensive tests for your authentication logic.

With Passport handling the complexity of OAuth2, you can focus on building the features that matter to your users while maintaining a secure and standards-compliant API.

---

When building applications with API authentication, monitoring becomes critical. You need to know when authentication fails, when tokens expire unexpectedly, and when suspicious activity occurs. **[OneUptime](https://oneuptime.com)** provides comprehensive monitoring for your Laravel applications, including API endpoint monitoring, error tracking, and alerting. With OneUptime, you can set up monitors for your OAuth endpoints, track authentication failure rates, and get notified immediately when something goes wrong. Start monitoring your API authentication today and ensure your users always have a seamless experience.
