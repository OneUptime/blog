# How to Configure Database Seeding in Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PHP, Laravel, Database, Seeding, Testing

Description: Learn how to use Laravel database seeders for development and testing. This guide covers factories, seeders, and strategies for populating databases with test data.

---

Database seeding is one of those features that seems simple on the surface but can dramatically improve your development workflow. Instead of manually creating test records or importing SQL dumps, Laravel gives you a programmatic way to populate your database with consistent, realistic data.

This guide walks you through everything from basic seeders to advanced patterns for handling complex relationships, environment-specific data, and production-safe seeding strategies.

## Why Database Seeding Matters

Before diving into the code, let's understand why seeding is worth your time:

- **Consistent development environments**: Every developer on your team gets the same starting data
- **Faster onboarding**: New team members can start with a populated database immediately
- **Reliable testing**: Tests run against predictable data instead of depending on manual setup
- **Demo environments**: Sales teams can showcase features with realistic data
- **Database migrations testing**: Verify your migrations work correctly with actual records

## Setting Up Your First Seeder

Laravel comes with a `DatabaseSeeder` class out of the box. This is your main entry point for all seeding operations.

### Creating a Basic Seeder

Generate a new seeder using Artisan:

```bash
# Create a seeder for the User model
php artisan make:seeder UserSeeder
```

This creates a file at `database/seeders/UserSeeder.php`. Let's add some basic functionality:

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Seed the users table with initial data.
     *
     * This seeder creates essential user accounts that every
     * development environment needs - admin, test users, etc.
     */
    public function run(): void
    {
        // Create an admin user with known credentials for testing
        // Using updateOrCreate prevents duplicates on re-runs
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'is_admin' => true,
            ]
        );

        // Create a regular test user
        User::updateOrCreate(
            ['email' => 'user@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'is_admin' => false,
            ]
        );
    }
}
```

### Registering Seeders in DatabaseSeeder

The `DatabaseSeeder` class orchestrates which seeders run and in what order:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Order matters here - seed parent tables before children
     * to maintain referential integrity.
     */
    public function run(): void
    {
        // Call seeders in dependency order
        $this->call([
            RoleSeeder::class,      // Roles first (no dependencies)
            UserSeeder::class,      // Users depend on roles
            CategorySeeder::class,  // Categories before products
            ProductSeeder::class,   // Products depend on categories
            OrderSeeder::class,     // Orders depend on users and products
        ]);
    }
}
```

### Running Seeders

Execute all seeders:

```bash
# Run the main DatabaseSeeder
php artisan db:seed

# Run with fresh migration (drops all tables first)
php artisan migrate:fresh --seed
```

Run a specific seeder:

```bash
# Run only the UserSeeder
php artisan db:seed --class=UserSeeder
```

## Working with Model Factories

Factories are the secret weapon for generating large amounts of realistic test data. They use Faker to create random but believable values.

### Creating a Factory

Generate a factory for your model:

```bash
# Create a factory for the Post model
php artisan make:factory PostFactory
```

Here's a well-documented factory example:

```php
<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory for creating Post model instances.
 *
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = Post::class;

    /**
     * Define the model's default state.
     *
     * This method returns an array of attribute values that will be
     * applied when creating a new Post instance.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Assign to a random existing user or create one
            'user_id' => User::factory(),

            // Generate a realistic blog post title
            'title' => fake()->sentence(rand(4, 8)),

            // Create a URL-friendly slug from the title
            'slug' => fake()->unique()->slug(),

            // Generate multiple paragraphs of content
            'content' => fake()->paragraphs(rand(5, 15), true),

            // Short excerpt for listings
            'excerpt' => fake()->paragraph(),

            // Random featured image URL
            'featured_image' => fake()->imageUrl(800, 400, 'technology'),

            // Most posts should be published
            'status' => fake()->randomElement(['draft', 'published', 'published', 'published']),

            // Published date within the last year
            'published_at' => fake()->optional(0.8)->dateTimeBetween('-1 year', 'now'),

            // View count for analytics
            'views' => fake()->numberBetween(0, 10000),

            // SEO metadata
            'meta_description' => fake()->sentence(15),
            'meta_keywords' => implode(', ', fake()->words(5)),
        ];
    }

    /**
     * Indicate that the post is a draft.
     *
     * State methods let you create variations of the base factory.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
            'published_at' => null,
        ]);
    }

    /**
     * Indicate that the post is published.
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'published',
            'published_at' => fake()->dateTimeBetween('-1 year', 'now'),
        ]);
    }

    /**
     * Indicate that the post is scheduled for future publication.
     */
    public function scheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'scheduled',
            'published_at' => fake()->dateTimeBetween('now', '+1 month'),
        ]);
    }

    /**
     * Create a featured/highlighted post.
     */
    public function featured(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_featured' => true,
            'views' => fake()->numberBetween(5000, 50000),
        ]);
    }
}
```

### Using Factories in Seeders

Now let's use the factory in a seeder:

```php
<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

class PostSeeder extends Seeder
{
    /**
     * Seed the posts table.
     *
     * Creates a mix of posts in different states to simulate
     * a real blog with drafts, published articles, and scheduled content.
     */
    public function run(): void
    {
        // Get existing users to assign posts to
        $users = User::all();

        // If no users exist, create some first
        if ($users->isEmpty()) {
            $users = User::factory()->count(5)->create();
        }

        // Create 50 published posts spread across users
        Post::factory()
            ->count(50)
            ->published()
            ->recycle($users)  // Assign to existing users instead of creating new ones
            ->create();

        // Create 10 draft posts
        Post::factory()
            ->count(10)
            ->draft()
            ->recycle($users)
            ->create();

        // Create 5 scheduled posts
        Post::factory()
            ->count(5)
            ->scheduled()
            ->recycle($users)
            ->create();

        // Create 3 featured posts
        Post::factory()
            ->count(3)
            ->featured()
            ->published()
            ->recycle($users)
            ->create();
    }
}
```

## Leveraging Faker for Realistic Data

Faker provides an extensive library of data generators. Here's a comprehensive reference for common use cases:

### User and Personal Data

```php
<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            // Basic personal information
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'full_name' => fake()->name(),

            // Contact information
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'mobile' => fake()->e164PhoneNumber(),

            // Address fields
            'street_address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'state' => fake()->state(),
            'postal_code' => fake()->postcode(),
            'country' => fake()->country(),
            'country_code' => fake()->countryCode(),

            // Full formatted address
            'full_address' => fake()->address(),

            // Demographic data
            'date_of_birth' => fake()->dateTimeBetween('-70 years', '-18 years'),
            'gender' => fake()->randomElement(['male', 'female', 'other', 'prefer_not_to_say']),

            // Account details
            'username' => fake()->unique()->userName(),
            'avatar' => fake()->imageUrl(200, 200, 'people'),

            // Timestamps
            'created_at' => fake()->dateTimeBetween('-2 years', 'now'),
            'last_login_at' => fake()->dateTimeBetween('-30 days', 'now'),
        ];
    }
}
```

### Business and E-commerce Data

```php
<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        // Generate price first so we can calculate discount
        $originalPrice = fake()->randomFloat(2, 10, 500);
        $hasDiscount = fake()->boolean(30);  // 30% chance of discount

        return [
            // Product identification
            'sku' => strtoupper(fake()->unique()->bothify('???-#####')),
            'barcode' => fake()->ean13(),

            // Product details
            'name' => fake()->words(rand(2, 5), true),
            'description' => fake()->paragraphs(3, true),
            'short_description' => fake()->sentence(20),

            // Pricing
            'price' => $originalPrice,
            'compare_at_price' => $hasDiscount
                ? $originalPrice * fake()->randomFloat(2, 1.1, 1.5)
                : null,
            'cost_price' => $originalPrice * fake()->randomFloat(2, 0.3, 0.7),

            // Inventory
            'quantity' => fake()->numberBetween(0, 500),
            'low_stock_threshold' => fake()->numberBetween(5, 20),
            'track_inventory' => fake()->boolean(90),

            // Physical attributes
            'weight' => fake()->randomFloat(2, 0.1, 50),
            'weight_unit' => 'kg',
            'dimensions' => json_encode([
                'length' => fake()->numberBetween(5, 100),
                'width' => fake()->numberBetween(5, 100),
                'height' => fake()->numberBetween(5, 100),
            ]),

            // Categorization
            'brand' => fake()->company(),
            'tags' => json_encode(fake()->words(rand(3, 7))),

            // Status flags
            'is_active' => fake()->boolean(85),
            'is_featured' => fake()->boolean(15),
            'is_digital' => fake()->boolean(10),

            // SEO
            'meta_title' => fake()->sentence(6),
            'meta_description' => fake()->sentence(15),
        ];
    }

    /**
     * Product that is out of stock.
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'quantity' => 0,
        ]);
    }

    /**
     * Product with low stock level.
     */
    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'quantity' => fake()->numberBetween(1, 5),
        ]);
    }

    /**
     * Digital product (no shipping required).
     */
    public function digital(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_digital' => true,
            'weight' => 0,
            'dimensions' => null,
            'track_inventory' => false,
        ]);
    }
}
```

### Financial and Transaction Data

```php
<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        // Generate line items total
        $subtotal = fake()->randomFloat(2, 25, 1000);
        $taxRate = 0.08;  // 8% tax
        $tax = round($subtotal * $taxRate, 2);
        $shipping = fake()->randomElement([0, 5.99, 9.99, 14.99]);
        $discount = fake()->optional(0.3)->randomFloat(2, 5, 50) ?? 0;

        return [
            // Order identification
            'order_number' => 'ORD-' . fake()->unique()->numerify('######'),
            'customer_id' => Customer::factory(),

            // Financial breakdown
            'subtotal' => $subtotal,
            'tax' => $tax,
            'shipping_cost' => $shipping,
            'discount' => $discount,
            'total' => $subtotal + $tax + $shipping - $discount,

            // Currency
            'currency' => fake()->randomElement(['USD', 'EUR', 'GBP']),

            // Status tracking
            'status' => fake()->randomElement([
                'pending',
                'processing',
                'shipped',
                'delivered',
                'cancelled',
            ]),
            'payment_status' => fake()->randomElement([
                'pending',
                'paid',
                'refunded',
                'failed',
            ]),

            // Payment details
            'payment_method' => fake()->randomElement([
                'credit_card',
                'paypal',
                'bank_transfer',
                'cash_on_delivery',
            ]),
            'transaction_id' => fake()->optional(0.8)->uuid(),

            // Shipping address (JSON)
            'shipping_address' => json_encode([
                'name' => fake()->name(),
                'street' => fake()->streetAddress(),
                'city' => fake()->city(),
                'state' => fake()->state(),
                'postal_code' => fake()->postcode(),
                'country' => fake()->countryCode(),
                'phone' => fake()->phoneNumber(),
            ]),

            // Billing address (JSON)
            'billing_address' => json_encode([
                'name' => fake()->name(),
                'street' => fake()->streetAddress(),
                'city' => fake()->city(),
                'state' => fake()->state(),
                'postal_code' => fake()->postcode(),
                'country' => fake()->countryCode(),
            ]),

            // Notes and metadata
            'customer_notes' => fake()->optional(0.2)->sentence(),
            'internal_notes' => fake()->optional(0.1)->sentence(),

            // Timestamps
            'ordered_at' => fake()->dateTimeBetween('-6 months', 'now'),
            'shipped_at' => fake()->optional(0.7)->dateTimeBetween('-6 months', 'now'),
            'delivered_at' => fake()->optional(0.5)->dateTimeBetween('-6 months', 'now'),
        ];
    }

    /**
     * A completed and delivered order.
     */
    public function completed(): static
    {
        $orderedAt = fake()->dateTimeBetween('-6 months', '-7 days');
        $shippedAt = fake()->dateTimeBetween($orderedAt, '-5 days');
        $deliveredAt = fake()->dateTimeBetween($shippedAt, 'now');

        return $this->state(fn (array $attributes) => [
            'status' => 'delivered',
            'payment_status' => 'paid',
            'ordered_at' => $orderedAt,
            'shipped_at' => $shippedAt,
            'delivered_at' => $deliveredAt,
        ]);
    }

    /**
     * A cancelled order.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
            'payment_status' => fake()->randomElement(['refunded', 'pending']),
            'shipped_at' => null,
            'delivered_at' => null,
        ]);
    }
}
```

## Seeding Relationships

Real applications have complex relationships between models. Here's how to seed them properly.

### One-to-Many Relationships

```php
<?php

namespace Database\Seeders;

use App\Models\Author;
use App\Models\Book;
use Illuminate\Database\Seeder;

class AuthorWithBooksSeeder extends Seeder
{
    /**
     * Seed authors with their books.
     *
     * Each author gets a random number of books assigned.
     */
    public function run(): void
    {
        // Method 1: Create authors then add books
        Author::factory()
            ->count(20)
            ->create()
            ->each(function (Author $author) {
                // Each author writes between 1 and 10 books
                Book::factory()
                    ->count(rand(1, 10))
                    ->create(['author_id' => $author->id]);
            });

        // Method 2: Use the has() method (cleaner syntax)
        Author::factory()
            ->count(10)
            ->has(Book::factory()->count(5), 'books')
            ->create();

        // Method 3: Create prolific authors with many books
        Author::factory()
            ->count(3)
            ->has(
                Book::factory()
                    ->count(20)
                    ->state(['is_bestseller' => true]),
                'books'
            )
            ->create(['is_featured' => true]);
    }
}
```

### Many-to-Many Relationships

```php
<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Category;
use App\Models\Tag;
use Illuminate\Database\Seeder;

class ProductCategorySeeder extends Seeder
{
    /**
     * Seed products with categories and tags.
     *
     * Products belong to multiple categories and have multiple tags.
     */
    public function run(): void
    {
        // First, create categories
        $categories = Category::factory()
            ->count(10)
            ->create();

        // Create tags
        $tags = Tag::factory()
            ->count(30)
            ->create();

        // Create products and attach relationships
        Product::factory()
            ->count(100)
            ->create()
            ->each(function (Product $product) use ($categories, $tags) {
                // Attach 1-3 random categories
                $product->categories()->attach(
                    $categories->random(rand(1, 3))->pluck('id')
                );

                // Attach 2-5 random tags
                $product->tags()->attach(
                    $tags->random(rand(2, 5))->pluck('id')
                );
            });
    }
}
```

### Pivot Table with Extra Attributes

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Course;
use Illuminate\Database\Seeder;

class CourseEnrollmentSeeder extends Seeder
{
    /**
     * Seed course enrollments with progress data.
     *
     * The enrollment pivot table includes additional fields
     * like progress percentage, completion date, and grade.
     */
    public function run(): void
    {
        $users = User::all();
        $courses = Course::all();

        // Enroll each user in some random courses
        foreach ($users as $user) {
            // Each user enrolls in 1-5 courses
            $enrolledCourses = $courses->random(rand(1, 5));

            foreach ($enrolledCourses as $course) {
                $progress = rand(0, 100);
                $isCompleted = $progress === 100;

                // Attach with pivot data
                $user->courses()->attach($course->id, [
                    'enrolled_at' => fake()->dateTimeBetween('-1 year', 'now'),
                    'progress' => $progress,
                    'completed_at' => $isCompleted
                        ? fake()->dateTimeBetween('-6 months', 'now')
                        : null,
                    'grade' => $isCompleted
                        ? fake()->randomElement(['A', 'B', 'C', 'D', 'F'])
                        : null,
                    'last_accessed_at' => fake()->dateTimeBetween('-30 days', 'now'),
                ]);
            }
        }
    }
}
```

### Polymorphic Relationships

```php
<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\Video;
use App\Models\Comment;
use App\Models\User;
use Illuminate\Database\Seeder;

class CommentSeeder extends Seeder
{
    /**
     * Seed comments on posts and videos.
     *
     * Comments are polymorphic - they can belong to any
     * commentable model (posts, videos, etc.)
     */
    public function run(): void
    {
        $users = User::all();

        // Add comments to posts
        Post::all()->each(function (Post $post) use ($users) {
            // Each post gets 0-15 comments
            $commentCount = rand(0, 15);

            Comment::factory()
                ->count($commentCount)
                ->create([
                    'commentable_type' => Post::class,
                    'commentable_id' => $post->id,
                    'user_id' => $users->random()->id,
                ]);
        });

        // Add comments to videos
        Video::all()->each(function (Video $video) use ($users) {
            $commentCount = rand(0, 30);

            Comment::factory()
                ->count($commentCount)
                ->create([
                    'commentable_type' => Video::class,
                    'commentable_id' => $video->id,
                    'user_id' => $users->random()->id,
                ]);
        });

        // Add reply comments (nested comments)
        $topLevelComments = Comment::whereNull('parent_id')->get();

        $topLevelComments->random(
            min(50, $topLevelComments->count())
        )->each(function (Comment $comment) use ($users) {
            // Add 1-5 replies to this comment
            Comment::factory()
                ->count(rand(1, 5))
                ->create([
                    'commentable_type' => $comment->commentable_type,
                    'commentable_id' => $comment->commentable_id,
                    'parent_id' => $comment->id,
                    'user_id' => $users->random()->id,
                ]);
        });
    }
}
```

## Environment-Specific Seeding

Different environments need different data. Development needs lots of test data, staging might need a subset, and production might only need essential records.

### Conditional Seeding Based on Environment

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\App;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Adjusts seeding strategy based on environment.
     */
    public function run(): void
    {
        // Always seed these (essential data for all environments)
        $this->call([
            RolePermissionSeeder::class,
            SettingsSeeder::class,
            CountrySeeder::class,
        ]);

        // Environment-specific seeding
        if (App::environment('local', 'development')) {
            $this->seedDevelopmentData();
        } elseif (App::environment('staging')) {
            $this->seedStagingData();
        } elseif (App::environment('production')) {
            $this->seedProductionData();
        }
    }

    /**
     * Seed data for local development.
     *
     * Creates large amounts of test data for thorough testing.
     */
    private function seedDevelopmentData(): void
    {
        $this->call([
            // Test accounts with known passwords
            DevelopmentUserSeeder::class,

            // Large datasets for pagination testing
            ProductSeeder::class,        // 500 products
            CustomerSeeder::class,       // 1000 customers
            OrderSeeder::class,          // 5000 orders

            // Demo data for UI development
            NotificationSeeder::class,
            ActivityLogSeeder::class,
        ]);
    }

    /**
     * Seed data for staging environment.
     *
     * Smaller dataset that mirrors production structure.
     */
    private function seedStagingData(): void
    {
        $this->call([
            StagingUserSeeder::class,    // QA team accounts
            ProductSeeder::class,        // 100 products
            CustomerSeeder::class,       // 200 customers
            OrderSeeder::class,          // 500 orders
        ]);
    }

    /**
     * Seed essential data for production.
     *
     * Only creates required records - no test data.
     */
    private function seedProductionData(): void
    {
        $this->call([
            AdminUserSeeder::class,      // Initial admin account
            DefaultSettingsSeeder::class,
        ]);
    }
}
```

### Configurable Seeder Amounts

```php
<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Seed the products table.
     *
     * Amount varies by environment for performance reasons.
     */
    public function run(): void
    {
        // Get count from config or environment variable
        $count = $this->getProductCount();

        $this->command->info("Creating {$count} products...");

        // Use chunk creation for large datasets
        $chunkSize = 100;
        $chunks = ceil($count / $chunkSize);

        for ($i = 0; $i < $chunks; $i++) {
            $createCount = min($chunkSize, $count - ($i * $chunkSize));

            Product::factory()
                ->count($createCount)
                ->create();

            // Show progress
            $progress = min(($i + 1) * $chunkSize, $count);
            $this->command->info("Created {$progress}/{$count} products");
        }
    }

    /**
     * Get the number of products to create based on environment.
     */
    private function getProductCount(): int
    {
        // Allow override via environment variable
        if ($envCount = env('SEED_PRODUCT_COUNT')) {
            return (int) $envCount;
        }

        // Default counts per environment
        return match (app()->environment()) {
            'local', 'development' => 500,
            'staging' => 100,
            'testing' => 20,
            default => 0,
        };
    }
}
```

### Safe Production Seeding

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Create the initial admin user.
     *
     * Safe for production - only creates if not exists.
     */
    public function run(): void
    {
        // Prevent accidental data creation in production
        if (App::environment('production')) {
            if (!$this->command->confirm('You are in PRODUCTION. Continue?', false)) {
                $this->command->warn('Seeding cancelled.');
                return;
            }
        }

        // Check if admin already exists
        $adminEmail = config('app.admin_email', 'admin@example.com');

        if (User::where('email', $adminEmail)->exists()) {
            $this->command->info('Admin user already exists, skipping.');
            return;
        }

        // Create admin with secure password from environment
        $admin = User::create([
            'name' => 'Administrator',
            'email' => $adminEmail,
            'password' => Hash::make(
                config('app.admin_password', env('ADMIN_PASSWORD'))
            ),
            'email_verified_at' => now(),
        ]);

        // Assign admin role
        $admin->assignRole('administrator');

        $this->command->info("Admin user created: {$adminEmail}");
    }
}
```

## Running Seeders Effectively

### Refreshing and Reseeding

```bash
# Drop all tables, re-run migrations, and seed
php artisan migrate:fresh --seed

# Same but for a specific database connection
php artisan migrate:fresh --seed --database=mysql_testing

# Run migrations and seed in one command
php artisan migrate --seed
```

### Seeding in Testing

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\ProductSeeder;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Seed before each test using specific seeder.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Run specific seeder for this test class
        $this->seed(ProductSeeder::class);
    }

    /**
     * Test product listing.
     */
    public function test_can_list_products(): void
    {
        $response = $this->getJson('/api/products');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'price'],
                ],
            ]);
    }
}
```

### Seeding with Artisan Commands

Create a custom seeding command for more control:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\DatabaseSeeder;

class SeedDemoData extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'app:seed-demo
                            {--fresh : Drop and recreate all tables first}
                            {--count=100 : Number of records to create}';

    /**
     * The console command description.
     */
    protected $description = 'Seed the database with demo data for presentations';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if ($this->option('fresh')) {
            $this->call('migrate:fresh');
        }

        // Set environment variable for seeders to use
        putenv('SEED_RECORD_COUNT=' . $this->option('count'));

        $this->info('Seeding demo data...');

        $this->call('db:seed', [
            '--class' => DatabaseSeeder::class,
        ]);

        $this->info('Demo data seeded successfully!');

        return Command::SUCCESS;
    }
}
```

## Advanced Seeding Patterns

### Sequences for Deterministic Data

```php
<?php

namespace Database\Factories;

use App\Models\Subscription;
use Illuminate\Database\Eloquent\Factories\Factory;

class SubscriptionFactory extends Factory
{
    protected $model = Subscription::class;

    public function definition(): array
    {
        return [
            'user_id' => null,
            'plan' => 'basic',
            'status' => 'active',
            'started_at' => now(),
        ];
    }
}

// In seeder - create subscriptions in a specific order
use Illuminate\Database\Eloquent\Factories\Sequence;

Subscription::factory()
    ->count(9)
    ->state(new Sequence(
        // First three: basic plan
        ['plan' => 'basic', 'price' => 9.99],
        ['plan' => 'basic', 'price' => 9.99],
        ['plan' => 'basic', 'price' => 9.99],
        // Next three: pro plan
        ['plan' => 'pro', 'price' => 29.99],
        ['plan' => 'pro', 'price' => 29.99],
        ['plan' => 'pro', 'price' => 29.99],
        // Last three: enterprise plan
        ['plan' => 'enterprise', 'price' => 99.99],
        ['plan' => 'enterprise', 'price' => 99.99],
        ['plan' => 'enterprise', 'price' => 99.99],
    ))
    ->create();
```

### Callbacks for Complex Logic

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => bcrypt('password'),
        ];
    }

    /**
     * Configure the model factory.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (User $user) {
            // Create a default profile for every user
            $user->profile()->create([
                'bio' => fake()->paragraph(),
                'website' => fake()->optional()->url(),
                'twitter' => fake()->optional()->userName(),
            ]);

            // Subscribe to default notification channels
            $user->notificationPreferences()->create([
                'email_notifications' => true,
                'push_notifications' => false,
            ]);

            // Log user creation for audit
            activity()
                ->performedOn($user)
                ->log('User account created via seeder');
        });
    }
}
```

### Seeding Large Datasets Efficiently

```php
<?php

namespace Database\Seeders;

use App\Models\LogEntry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LogEntrySeeder extends Seeder
{
    /**
     * Seed a large number of log entries efficiently.
     *
     * Uses bulk insert instead of Eloquent for performance.
     */
    public function run(): void
    {
        $totalRecords = 100000;
        $batchSize = 1000;
        $batches = ceil($totalRecords / $batchSize);

        // Disable query logging for memory efficiency
        DB::disableQueryLog();

        $this->command->info("Creating {$totalRecords} log entries...");
        $this->command->getOutput()->progressStart($batches);

        for ($batch = 0; $batch < $batches; $batch++) {
            $records = [];

            for ($i = 0; $i < $batchSize; $i++) {
                $records[] = [
                    'level' => fake()->randomElement(['info', 'warning', 'error', 'debug']),
                    'message' => fake()->sentence(),
                    'context' => json_encode(['user_id' => rand(1, 1000)]),
                    'channel' => fake()->randomElement(['app', 'security', 'api']),
                    'created_at' => fake()->dateTimeBetween('-30 days', 'now'),
                ];
            }

            // Bulk insert for speed
            DB::table('log_entries')->insert($records);

            $this->command->getOutput()->progressAdvance();
        }

        $this->command->getOutput()->progressFinish();
        $this->command->info('Log entries seeded successfully!');
    }
}
```

### Idempotent Seeders

```php
<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    /**
     * Seed application settings.
     *
     * Idempotent - safe to run multiple times without duplicating data.
     */
    public function run(): void
    {
        $settings = [
            [
                'key' => 'site_name',
                'value' => 'My Application',
                'type' => 'string',
                'group' => 'general',
            ],
            [
                'key' => 'items_per_page',
                'value' => '25',
                'type' => 'integer',
                'group' => 'pagination',
            ],
            [
                'key' => 'enable_registration',
                'value' => 'true',
                'type' => 'boolean',
                'group' => 'auth',
            ],
            [
                'key' => 'supported_currencies',
                'value' => json_encode(['USD', 'EUR', 'GBP']),
                'type' => 'array',
                'group' => 'commerce',
            ],
        ];

        foreach ($settings as $setting) {
            // Only create if doesn't exist - never overwrite
            Setting::firstOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }

        $this->command->info('Settings seeded (existing values preserved).');
    }
}
```

## Debugging Seeders

### Verbose Output

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Starting UserSeeder...');

        // Show what we're about to do
        $existingCount = User::count();
        $this->command->info("Existing users: {$existingCount}");

        // Create users with progress
        $count = 50;
        $this->command->info("Creating {$count} new users...");

        $bar = $this->command->getOutput()->createProgressBar($count);
        $bar->start();

        for ($i = 0; $i < $count; $i++) {
            User::factory()->create();
            $bar->advance();
        }

        $bar->finish();
        $this->command->newLine();

        // Summary
        $newCount = User::count();
        $this->command->info("Total users now: {$newCount}");
        $this->command->info('UserSeeder completed.');
    }
}
```

### Handling Seeder Failures

```php
<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Exception;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Wrap in transaction for atomicity
        DB::beginTransaction();

        try {
            Product::factory()->count(100)->create();

            // Verify data integrity
            $count = Product::count();
            if ($count < 100) {
                throw new Exception("Expected 100 products, got {$count}");
            }

            DB::commit();
            $this->command->info('Products seeded successfully.');

        } catch (Exception $e) {
            DB::rollBack();

            $this->command->error('Seeding failed: ' . $e->getMessage());
            $this->command->error('Transaction rolled back.');

            // Re-throw to stop the seeding process
            throw $e;
        }
    }
}
```

## Summary

| Concept | Purpose | Key Method |
|---------|---------|------------|
| **Seeders** | Orchestrate data population | `$this->call()` |
| **Factories** | Generate model instances with fake data | `Model::factory()->create()` |
| **Faker** | Produce realistic random data | `fake()->methodName()` |
| **States** | Create factory variations | `->state()` |
| **Relationships** | Seed connected data | `->has()`, `->for()` |
| **Environment checks** | Customize per environment | `App::environment()` |
| **Idempotent seeding** | Safe re-runs | `firstOrCreate()`, `updateOrCreate()` |

Database seeding transforms how you build and test Laravel applications. With factories generating realistic data and seeders orchestrating the process, you can spin up fully populated environments in seconds instead of hours.

The key is treating your seeders like any other code - make them maintainable, testable, and environment-aware. Start simple with basic seeders, then layer in factories, relationships, and environment-specific logic as your application grows.

---

Building reliable applications requires more than just good test data - you need visibility into how your systems behave in production. [OneUptime](https://oneuptime.com) provides comprehensive monitoring, incident management, and status pages to keep your Laravel applications running smoothly. From database performance tracking to API endpoint monitoring, OneUptime helps you catch issues before your users do. Start monitoring your application today at [oneuptime.com](https://oneuptime.com).
