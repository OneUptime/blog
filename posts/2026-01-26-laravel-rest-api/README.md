# How to Build a REST API with Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Laravel, PHP, REST API, Backend Development, Web Development, API Design

Description: Learn how to build a production-ready REST API with Laravel from scratch. This guide covers project setup, database configuration, Eloquent models, API resources, authentication with Sanctum, validation, error handling, and testing.

---

> Laravel has become the go-to PHP framework for building modern web applications and APIs. Its elegant syntax, powerful ORM, and built-in features make API development a breeze. This guide walks you through building a complete REST API from the ground up.

Laravel powers some of the largest applications on the web. Its expressive syntax, comprehensive documentation, and active community make it an excellent choice for teams of any size. Whether you are building a simple CRUD API or a complex microservice, Laravel provides the tools you need.

---

## What We Will Build

We will build a book library API with the following features:

- User authentication with Laravel Sanctum
- CRUD operations for books and authors
- Relationships between models
- API resource transformations
- Request validation
- Error handling
- Rate limiting
- Automated tests

---

## Project Setup

Make sure you have PHP 8.2 or higher and Composer installed. This guide uses Laravel 11.

```bash
# Check your PHP version
php -v
# Should output something like: PHP 8.2.0

# Create a new Laravel project
composer create-project laravel/laravel book-api

# Navigate to the project directory
cd book-api

# Start the development server
php artisan serve
```

Laravel 11 includes a streamlined directory structure. The application will be available at `http://localhost:8000`.

---

## Database Configuration

Update your `.env` file with your database credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=book_api
DB_USERNAME=root
DB_PASSWORD=your_password
```

Laravel supports MySQL, PostgreSQL, SQLite, and SQL Server out of the box. For local development, SQLite works great:

```env
DB_CONNECTION=sqlite
# Comment out other DB_ variables for SQLite
```

Create the database file for SQLite:

```bash
touch database/database.sqlite
```

---

## Creating Migrations

Let's create migrations for our Author and Book models:

```bash
# Generate migrations
php artisan make:migration create_authors_table
php artisan make:migration create_books_table
```

Define the authors table structure:

```php
<?php
// database/migrations/xxxx_xx_xx_create_authors_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('authors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->text('bio')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('country')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('authors');
    }
};
```

Define the books table with a foreign key to authors:

```php
<?php
// database/migrations/xxxx_xx_xx_create_books_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('isbn')->unique();
            $table->text('description')->nullable();
            $table->integer('pages')->nullable();
            $table->decimal('price', 8, 2);
            $table->date('published_date')->nullable();
            $table->enum('status', ['available', 'out_of_stock', 'discontinued'])
                  ->default('available');
            $table->foreignId('author_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
```

Run the migrations:

```bash
php artisan migrate
```

---

## Creating Models

Generate Eloquent models with relationships:

```bash
php artisan make:model Author
php artisan make:model Book
```

Configure the Author model:

```php
<?php
// app/Models/Author.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Author extends Model
{
    use HasFactory;

    // Allow mass assignment for these fields
    protected $fillable = [
        'name',
        'email',
        'bio',
        'birth_date',
        'country',
    ];

    // Cast attributes to native types
    protected $casts = [
        'birth_date' => 'date',
    ];

    // One author has many books
    public function books(): HasMany
    {
        return $this->hasMany(Book::class);
    }

    // Accessor for book count
    public function getBooksCountAttribute(): int
    {
        return $this->books()->count();
    }
}
```

Configure the Book model:

```php
<?php
// app/Models/Book.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Book extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'isbn',
        'description',
        'pages',
        'price',
        'published_date',
        'status',
        'author_id',
    ];

    protected $casts = [
        'published_date' => 'date',
        'price' => 'decimal:2',
        'pages' => 'integer',
    ];

    // Each book belongs to one author
    public function author(): BelongsTo
    {
        return $this->belongsTo(Author::class);
    }

    // Scope for available books
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    // Scope for filtering by price range
    public function scopePriceRange($query, $min, $max)
    {
        return $query->whereBetween('price', [$min, $max]);
    }
}
```

---

## API Architecture Overview

Here is how requests flow through a Laravel API:

```mermaid
flowchart LR
    A[Client Request] --> B[Routes]
    B --> C[Middleware]
    C --> D[Controller]
    D --> E[Form Request Validation]
    E --> F[Model/Database]
    F --> G[API Resource]
    G --> H[JSON Response]
```

---

## Setting Up Authentication with Sanctum

Laravel Sanctum provides a lightweight authentication system for APIs. Install and configure it:

```bash
# Sanctum is included in Laravel 11, just publish the config
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Run the Sanctum migrations
php artisan migrate
```

The User model already includes the `HasApiTokens` trait in Laravel 11. Verify it exists:

```php
<?php
// app/Models/User.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
```

---

## Authentication Controller

Create a controller for registration and login:

```bash
php artisan make:controller Api/AuthController
```

```php
<?php
// app/Http/Controllers/Api/AuthController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Register a new user
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Create an API token for the user
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'token' => $token,
        ], 201);
    }

    // Log in an existing user
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Verify credentials
        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke existing tokens and create a new one
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'token' => $token,
        ]);
    }

    // Log out the current user
    public function logout(Request $request): JsonResponse
    {
        // Delete the current access token
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }
}
```

---

## API Resources

API Resources transform your models into JSON responses. They give you full control over the output format:

```bash
php artisan make:resource AuthorResource
php artisan make:resource BookResource
php artisan make:resource AuthorCollection
php artisan make:resource BookCollection
```

Define the Author resource:

```php
<?php
// app/Http/Resources/AuthorResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'bio' => $this->bio,
            'birth_date' => $this->birth_date?->format('Y-m-d'),
            'country' => $this->country,
            'books_count' => $this->whenCounted('books'),
            // Include books when explicitly loaded
            'books' => BookResource::collection($this->whenLoaded('books')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
```

Define the Book resource:

```php
<?php
// app/Http/Resources/BookResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'isbn' => $this->isbn,
            'description' => $this->description,
            'pages' => $this->pages,
            'price' => $this->price,
            'formatted_price' => '$' . number_format($this->price, 2),
            'published_date' => $this->published_date?->format('Y-m-d'),
            'status' => $this->status,
            'author_id' => $this->author_id,
            // Include author when explicitly loaded
            'author' => new AuthorResource($this->whenLoaded('author')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
```

Create collection resources for pagination support:

```php
<?php
// app/Http/Resources/BookCollection.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class BookCollection extends ResourceCollection
{
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
            'meta' => [
                'total' => $this->total(),
                'per_page' => $this->perPage(),
                'current_page' => $this->currentPage(),
                'last_page' => $this->lastPage(),
            ],
        ];
    }
}
```

---

## Form Request Validation

Create dedicated request classes for validation:

```bash
php artisan make:request StoreBookRequest
php artisan make:request UpdateBookRequest
php artisan make:request StoreAuthorRequest
```

Define validation rules for creating a book:

```php
<?php
// app/Http/Requests/StoreBookRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Add authorization logic here if needed
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'isbn' => ['required', 'string', 'max:20', 'unique:books,isbn'],
            'description' => ['nullable', 'string', 'max:5000'],
            'pages' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'price' => ['required', 'numeric', 'min:0', 'max:9999.99'],
            'published_date' => ['nullable', 'date', 'before_or_equal:today'],
            'status' => ['sometimes', Rule::in(['available', 'out_of_stock', 'discontinued'])],
            'author_id' => ['required', 'exists:authors,id'],
        ];
    }

    // Custom error messages
    public function messages(): array
    {
        return [
            'isbn.unique' => 'A book with this ISBN already exists.',
            'author_id.exists' => 'The specified author does not exist.',
            'price.max' => 'The price cannot exceed $9,999.99.',
        ];
    }
}
```

Define validation rules for updating a book:

```php
<?php
// app/Http/Requests/UpdateBookRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Get the book ID from the route
        $bookId = $this->route('book')->id;

        return [
            'title' => ['sometimes', 'string', 'max:255'],
            // Ignore current book when checking uniqueness
            'isbn' => [
                'sometimes',
                'string',
                'max:20',
                Rule::unique('books', 'isbn')->ignore($bookId),
            ],
            'description' => ['nullable', 'string', 'max:5000'],
            'pages' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:9999.99'],
            'published_date' => ['nullable', 'date', 'before_or_equal:today'],
            'status' => ['sometimes', Rule::in(['available', 'out_of_stock', 'discontinued'])],
            'author_id' => ['sometimes', 'exists:authors,id'],
        ];
    }
}
```

---

## Controllers

Create resource controllers for books and authors:

```bash
php artisan make:controller Api/BookController --api
php artisan make:controller Api/AuthorController --api
```

Implement the Book controller:

```php
<?php
// app/Http/Controllers/Api/BookController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBookRequest;
use App\Http\Requests\UpdateBookRequest;
use App\Http\Resources\BookCollection;
use App\Http\Resources\BookResource;
use App\Models\Book;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookController extends Controller
{
    // GET /api/books - List all books with filtering and pagination
    public function index(Request $request): BookCollection
    {
        $query = Book::with('author');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by author
        if ($request->has('author_id')) {
            $query->where('author_id', $request->author_id);
        }

        // Filter by price range
        if ($request->has('min_price') && $request->has('max_price')) {
            $query->priceRange($request->min_price, $request->max_price);
        }

        // Search by title
        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        // Sort results
        $sortField = $request->get('sort', 'created_at');
        $sortDirection = $request->get('direction', 'desc');
        $allowedSorts = ['title', 'price', 'published_date', 'created_at'];

        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        // Paginate results (default 15 per page, max 100)
        $perPage = min($request->get('per_page', 15), 100);
        $books = $query->paginate($perPage);

        return new BookCollection($books);
    }

    // POST /api/books - Create a new book
    public function store(StoreBookRequest $request): JsonResponse
    {
        $book = Book::create($request->validated());

        // Load the author relationship for the response
        $book->load('author');

        return response()->json([
            'message' => 'Book created successfully',
            'data' => new BookResource($book),
        ], 201);
    }

    // GET /api/books/{book} - Show a single book
    public function show(Book $book): JsonResponse
    {
        // Eager load the author
        $book->load('author');

        return response()->json([
            'data' => new BookResource($book),
        ]);
    }

    // PUT/PATCH /api/books/{book} - Update a book
    public function update(UpdateBookRequest $request, Book $book): JsonResponse
    {
        $book->update($request->validated());
        $book->load('author');

        return response()->json([
            'message' => 'Book updated successfully',
            'data' => new BookResource($book),
        ]);
    }

    // DELETE /api/books/{book} - Delete a book
    public function destroy(Book $book): JsonResponse
    {
        $book->delete();

        return response()->json([
            'message' => 'Book deleted successfully',
        ], 200);
    }
}
```

Implement the Author controller:

```php
<?php
// app/Http/Controllers/Api/AuthorController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuthorResource;
use App\Models\Author;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthorController extends Controller
{
    // GET /api/authors - List all authors
    public function index(Request $request)
    {
        $query = Author::withCount('books');

        // Search by name
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Filter by country
        if ($request->has('country')) {
            $query->where('country', $request->country);
        }

        $perPage = min($request->get('per_page', 15), 100);
        $authors = $query->paginate($perPage);

        return AuthorResource::collection($authors);
    }

    // POST /api/authors - Create a new author
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:authors,email'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);

        $author = Author::create($validated);

        return response()->json([
            'message' => 'Author created successfully',
            'data' => new AuthorResource($author),
        ], 201);
    }

    // GET /api/authors/{author} - Show a single author with books
    public function show(Author $author): JsonResponse
    {
        $author->load('books');

        return response()->json([
            'data' => new AuthorResource($author),
        ]);
    }

    // PUT/PATCH /api/authors/{author} - Update an author
    public function update(Request $request, Author $author): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:authors,email,' . $author->id],
            'bio' => ['nullable', 'string', 'max:2000'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);

        $author->update($validated);

        return response()->json([
            'message' => 'Author updated successfully',
            'data' => new AuthorResource($author),
        ]);
    }

    // DELETE /api/authors/{author} - Delete an author
    public function destroy(Author $author): JsonResponse
    {
        // This will also delete associated books due to cascade
        $author->delete();

        return response()->json([
            'message' => 'Author deleted successfully',
        ]);
    }
}
```

---

## Routes Configuration

Define your API routes in `routes/api.php`:

```php
<?php
// routes/api.php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuthorController;
use App\Http\Controllers\Api\BookController;
use Illuminate\Support\Facades\Route;

// Public routes - no authentication required
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Health check endpoint
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toIso8601String(),
        'version' => '1.0.0',
    ]);
});

// Protected routes - require authentication
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);

    // Book routes
    Route::apiResource('books', BookController::class);

    // Author routes
    Route::apiResource('authors', AuthorController::class);

    // Get books by a specific author
    Route::get('/authors/{author}/books', function (App\Models\Author $author) {
        return App\Http\Resources\BookResource::collection(
            $author->books()->paginate(15)
        );
    });
});
```

---

## Error Handling

Customize error responses in `bootstrap/app.php`:

```php
<?php
// bootstrap/app.php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Add rate limiting to API routes
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Handle 404 errors for API requests
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code' => 'not_found',
                        'message' => 'The requested resource was not found.',
                    ],
                ], 404);
            }
        });

        // Handle validation errors for API requests
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code' => 'validation_failed',
                        'message' => 'The given data was invalid.',
                        'details' => $e->errors(),
                    ],
                ], 422);
            }
        });
    })->create();
```

---

## Rate Limiting

Configure rate limiting in `routes/api.php` or create a custom rate limiter:

```php
<?php
// app/Providers/AppServiceProvider.php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Default API rate limit: 60 requests per minute
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by(
                $request->user()?->id ?: $request->ip()
            );
        });

        // Stricter limit for authentication endpoints
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });
    }
}
```

Apply rate limiting to auth routes:

```php
<?php
// routes/api.php - updated auth routes

Route::middleware('throttle:auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});
```

---

## Database Seeding

Create factories and seeders for testing:

```bash
php artisan make:factory AuthorFactory
php artisan make:factory BookFactory
```

```php
<?php
// database/factories/AuthorFactory.php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class AuthorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'bio' => fake()->paragraphs(2, true),
            'birth_date' => fake()->dateTimeBetween('-80 years', '-25 years'),
            'country' => fake()->country(),
        ];
    }
}
```

```php
<?php
// database/factories/BookFactory.php

namespace Database\Factories;

use App\Models\Author;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'isbn' => fake()->unique()->isbn13(),
            'description' => fake()->paragraphs(3, true),
            'pages' => fake()->numberBetween(100, 800),
            'price' => fake()->randomFloat(2, 9.99, 49.99),
            'published_date' => fake()->dateTimeBetween('-10 years', 'now'),
            'status' => fake()->randomElement(['available', 'out_of_stock', 'discontinued']),
            'author_id' => Author::factory(),
        ];
    }

    // State for available books only
    public function available(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'available',
        ]);
    }
}
```

Create a seeder:

```php
<?php
// database/seeders/DatabaseSeeder.php

namespace Database\Seeders;

use App\Models\Author;
use App\Models\Book;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create a test user
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Create 10 authors, each with 3-5 books
        Author::factory(10)->create()->each(function ($author) {
            Book::factory(rand(3, 5))->create([
                'author_id' => $author->id,
            ]);
        });
    }
}
```

Run the seeder:

```bash
php artisan db:seed
```

---

## Writing Tests

Create feature tests for your API:

```bash
php artisan make:test BookApiTest
```

```php
<?php
// tests/Feature/BookApiTest.php

namespace Tests\Feature;

use App\Models\Author;
use App\Models\Book;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Author $author;

    protected function setUp(): void
    {
        parent::setUp();

        // Create and authenticate a user for each test
        $this->user = User::factory()->create();
        $this->author = Author::factory()->create();
    }

    public function test_can_list_books(): void
    {
        // Create some books
        Book::factory(5)->create(['author_id' => $this->author->id]);

        // Authenticate as the user
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/books');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         '*' => ['id', 'title', 'isbn', 'price', 'author_id'],
                     ],
                     'meta' => ['total', 'per_page', 'current_page'],
                 ]);
    }

    public function test_can_create_book(): void
    {
        Sanctum::actingAs($this->user);

        $bookData = [
            'title' => 'The Great Gatsby',
            'isbn' => '978-0743273565',
            'description' => 'A classic American novel',
            'pages' => 180,
            'price' => 14.99,
            'author_id' => $this->author->id,
        ];

        $response = $this->postJson('/api/books', $bookData);

        $response->assertStatus(201)
                 ->assertJson([
                     'message' => 'Book created successfully',
                 ])
                 ->assertJsonPath('data.title', 'The Great Gatsby');

        $this->assertDatabaseHas('books', ['isbn' => '978-0743273565']);
    }

    public function test_cannot_create_book_with_duplicate_isbn(): void
    {
        Sanctum::actingAs($this->user);

        // Create a book with a specific ISBN
        Book::factory()->create([
            'isbn' => '978-0743273565',
            'author_id' => $this->author->id,
        ]);

        // Try to create another book with the same ISBN
        $response = $this->postJson('/api/books', [
            'title' => 'Another Book',
            'isbn' => '978-0743273565',
            'price' => 19.99,
            'author_id' => $this->author->id,
        ]);

        $response->assertStatus(422)
                 ->assertJsonPath('error.code', 'validation_failed');
    }

    public function test_can_update_book(): void
    {
        Sanctum::actingAs($this->user);

        $book = Book::factory()->create(['author_id' => $this->author->id]);

        $response = $this->putJson("/api/books/{$book->id}", [
            'title' => 'Updated Title',
            'price' => 29.99,
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.title', 'Updated Title')
                 ->assertJsonPath('data.price', '29.99');
    }

    public function test_can_delete_book(): void
    {
        Sanctum::actingAs($this->user);

        $book = Book::factory()->create(['author_id' => $this->author->id]);

        $response = $this->deleteJson("/api/books/{$book->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('books', ['id' => $book->id]);
    }

    public function test_unauthenticated_user_cannot_access_api(): void
    {
        $response = $this->getJson('/api/books');

        $response->assertStatus(401);
    }

    public function test_can_filter_books_by_status(): void
    {
        Sanctum::actingAs($this->user);

        Book::factory(3)->create([
            'author_id' => $this->author->id,
            'status' => 'available',
        ]);
        Book::factory(2)->create([
            'author_id' => $this->author->id,
            'status' => 'out_of_stock',
        ]);

        $response = $this->getJson('/api/books?status=available');

        $response->assertStatus(200)
                 ->assertJsonCount(3, 'data');
    }
}
```

Run your tests:

```bash
php artisan test
# Or with more details
php artisan test --verbose
```

---

## Testing the API with cURL

Here are some example requests to test your API:

```bash
# Register a new user
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }'

# Login and get a token
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Use the token to access protected routes
curl -X GET http://localhost:8000/api/books \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"

# Create a new author
curl -X POST http://localhost:8000/api/authors \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "F. Scott Fitzgerald",
    "email": "fitzgerald@example.com",
    "bio": "American novelist",
    "country": "United States"
  }'

# Create a new book
curl -X POST http://localhost:8000/api/books \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Great Gatsby",
    "isbn": "978-0743273565",
    "description": "A novel set in the Jazz Age",
    "pages": 180,
    "price": 14.99,
    "author_id": 1
  }'
```

---

## Conclusion

You now have a fully functional REST API built with Laravel. The key components we covered include:

- Laravel project setup with proper configuration
- Database migrations and Eloquent models with relationships
- Authentication using Laravel Sanctum
- API Resources for controlling JSON output
- Form Request validation for clean input handling
- Comprehensive error handling
- Rate limiting for API protection
- Feature tests for ensuring reliability

Laravel provides an excellent developer experience for building APIs. Its expressive syntax and powerful features let you focus on your application logic rather than boilerplate code. The framework handles common concerns like validation, authentication, and database operations elegantly.

As your API grows, consider adding features like API documentation with tools like Scribe or L5-Swagger, implementing caching with Redis, and setting up queue workers for background processing.

---

*Building APIs requires robust monitoring to catch issues before your users do. [OneUptime](https://oneuptime.com) provides comprehensive API monitoring with response time tracking, error alerting, and detailed analytics to keep your Laravel applications running smoothly.*

**Related Reading:**
- [How to Build a REST API with Ruby on Rails](https://oneuptime.com/blog/post/2026-01-26-ruby-rails-rest-api/view)
- [How to Integrate Redis with Laravel](https://oneuptime.com/blog/post/2026-01-21-redis-laravel-integration/view)
