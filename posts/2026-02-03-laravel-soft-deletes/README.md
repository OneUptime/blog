# How to Implement Soft Deletes in Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PHP, Laravel, Eloquent, Database, Soft Deletes

Description: Learn how to implement soft deletes in Laravel for data recovery and audit trails. This guide covers the SoftDeletes trait, querying, restoring, and cascade handling.

---

When you delete a record from your database, it is usually gone forever. That is fine for throwaway data, but for anything important - user accounts, orders, documents, audit logs - permanent deletion is a liability. Soft deletes solve this by marking records as deleted without actually removing them. Laravel makes this pattern trivially easy with the `SoftDeletes` trait.

## Why Use Soft Deletes?

Before diving into implementation, let us understand why soft deletes matter:

| Use Case | Without Soft Deletes | With Soft Deletes |
|----------|----------------------|-------------------|
| Accidental deletion | Data lost permanently | Easy recovery |
| Audit compliance | No deletion history | Full audit trail |
| Data analysis | Historical data missing | Complete dataset |
| Customer support | Cannot investigate issues | Full context available |
| Legal holds | Cannot preserve data | Data retained |

Soft deletes add a `deleted_at` timestamp column to your table. When you "delete" a record, Laravel sets this timestamp instead of removing the row. All normal queries automatically exclude soft-deleted records, so your application behaves as if they are gone.

## Setting Up the Migration

First, you need to add the `deleted_at` column to your table. Laravel provides a helper method for this.

### For a New Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates the posts table with soft delete support.
     */
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            // Primary key
            $table->id();

            // Post content fields
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('content');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');

            // Timestamps for created_at and updated_at
            $table->timestamps();

            // This adds the deleted_at column for soft deletes
            // The column is nullable - null means not deleted
            $table->softDeletes();

            // Add index for better query performance on soft-deleted records
            $table->index(['deleted_at', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
```

### Adding Soft Deletes to an Existing Table

If you have an existing table that needs soft delete support:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add soft delete column to existing posts table.
     * This is a non-destructive change - existing data is preserved.
     */
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            // Add the deleted_at column after updated_at for consistency
            $table->softDeletes()->after('updated_at');

            // Index helps when querying both active and deleted records
            $table->index('deleted_at');
        });
    }

    /**
     * Remove soft delete support.
     * Warning: This will lose all soft delete timestamps.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            // dropSoftDeletes removes the deleted_at column
            $table->dropSoftDeletes();
        });
    }
};
```

Run the migration:

```bash
php artisan migrate
```

## Adding the SoftDeletes Trait to Your Model

With the database ready, add the `SoftDeletes` trait to your Eloquent model:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'content',
        'status',
    ];

    /**
     * The attributes that should be cast.
     * The deleted_at column is automatically cast to a Carbon instance.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'status' => 'string',
    ];

    /**
     * Get the user who created the post.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the comments for this post.
     */
    public function comments()
    {
        return $this->hasMany(Comment::class);
    }
}
```

That is all it takes. The `SoftDeletes` trait automatically:

- Adds `deleted_at` to the model's dates
- Excludes soft-deleted records from normal queries
- Provides methods for working with trashed records

## Basic Soft Delete Operations

### Deleting Records

When you call `delete()` on a model with soft deletes, Laravel sets the `deleted_at` timestamp:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PostController extends Controller
{
    /**
     * Soft delete a post.
     * The record remains in the database with a deleted_at timestamp.
     */
    public function destroy(Post $post): JsonResponse
    {
        // This sets deleted_at to the current timestamp
        // The record is NOT removed from the database
        $post->delete();

        return response()->json([
            'message' => 'Post deleted successfully',
            'deleted_at' => $post->deleted_at->toIso8601String(),
        ]);
    }

    /**
     * Soft delete multiple posts at once.
     * Useful for bulk operations in admin panels.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'post_ids' => 'required|array',
            'post_ids.*' => 'integer|exists:posts,id',
        ]);

        // Delete multiple records - each gets its own deleted_at timestamp
        $deletedCount = Post::whereIn('id', $validated['post_ids'])->delete();

        return response()->json([
            'message' => "Deleted {$deletedCount} posts",
            'deleted_count' => $deletedCount,
        ]);
    }
}
```

### Checking if a Record is Soft Deleted

```php
<?php

// Check if a specific record is soft deleted
$post = Post::withTrashed()->find($id);

if ($post->trashed()) {
    // This post has been soft deleted
    echo "Post was deleted on: " . $post->deleted_at->format('Y-m-d H:i:s');
}

// You can also check the deleted_at directly
if ($post->deleted_at !== null) {
    echo "This post is soft deleted";
}
```

## Querying Soft Deleted Records

By default, soft-deleted records are invisible to your queries. Laravel provides several methods to work with them.

### Normal Queries - Exclude Deleted

```php
<?php

// Standard queries automatically exclude soft-deleted records
// This only returns posts where deleted_at IS NULL
$activePosts = Post::all();

// Same with where clauses - soft deleted records are excluded
$publishedPosts = Post::where('status', 'published')
    ->orderBy('created_at', 'desc')
    ->get();

// Pagination also respects soft deletes
$paginatedPosts = Post::where('status', 'published')
    ->paginate(15);

// Relationships also exclude soft-deleted records by default
$user = User::find(1);
$userPosts = $user->posts; // Only non-deleted posts
```

### Including Soft Deleted Records

Use `withTrashed()` to include soft-deleted records in your query:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Models\Post;
use Illuminate\Http\Request;

class PostAdminController extends Controller
{
    /**
     * List all posts including deleted ones.
     * Useful for admin panels and audit views.
     */
    public function index(Request $request)
    {
        // withTrashed() includes both active and deleted records
        $posts = Post::withTrashed()
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return view('admin.posts.index', [
            'posts' => $posts,
        ]);
    }

    /**
     * Search across all posts including deleted.
     */
    public function search(Request $request)
    {
        $query = $request->input('q');

        $results = Post::withTrashed()
            ->where(function ($q) use ($query) {
                $q->where('title', 'like', "%{$query}%")
                  ->orWhere('content', 'like', "%{$query}%");
            })
            ->get();

        return response()->json($results);
    }
}
```

### Querying Only Soft Deleted Records

Use `onlyTrashed()` to get only the soft-deleted records:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Models\Post;
use Illuminate\Http\Request;

class TrashController extends Controller
{
    /**
     * Display the trash bin - only deleted posts.
     */
    public function index()
    {
        // onlyTrashed() returns only records where deleted_at IS NOT NULL
        $trashedPosts = Post::onlyTrashed()
            ->with('user')
            ->orderBy('deleted_at', 'desc')
            ->paginate(20);

        return view('admin.trash.index', [
            'posts' => $trashedPosts,
        ]);
    }

    /**
     * Get count of deleted records for dashboard widgets.
     */
    public function stats()
    {
        return response()->json([
            'total_trashed' => Post::onlyTrashed()->count(),
            'trashed_today' => Post::onlyTrashed()
                ->whereDate('deleted_at', today())
                ->count(),
            'trashed_this_week' => Post::onlyTrashed()
                ->whereBetween('deleted_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
        ]);
    }
}
```

## Restoring Soft Deleted Records

One of the main benefits of soft deletes is the ability to restore records:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TrashController extends Controller
{
    /**
     * Restore a single soft-deleted post.
     */
    public function restore(int $id): JsonResponse
    {
        // Find the post including trashed records
        $post = Post::withTrashed()->findOrFail($id);

        // Check if it is actually deleted
        if (!$post->trashed()) {
            return response()->json([
                'message' => 'Post is not deleted',
            ], 422);
        }

        // Restore sets deleted_at back to NULL
        $post->restore();

        return response()->json([
            'message' => 'Post restored successfully',
            'post' => $post->fresh(),
        ]);
    }

    /**
     * Restore multiple posts at once.
     */
    public function bulkRestore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'post_ids' => 'required|array',
            'post_ids.*' => 'integer',
        ]);

        // Restore only the trashed records from the given IDs
        $restoredCount = Post::onlyTrashed()
            ->whereIn('id', $validated['post_ids'])
            ->restore();

        return response()->json([
            'message' => "Restored {$restoredCount} posts",
            'restored_count' => $restoredCount,
        ]);
    }

    /**
     * Restore all deleted posts.
     * Use with caution - consider adding confirmation.
     */
    public function restoreAll(): JsonResponse
    {
        $restoredCount = Post::onlyTrashed()->restore();

        return response()->json([
            'message' => "Restored {$restoredCount} posts",
            'restored_count' => $restoredCount,
        ]);
    }
}
```

## Force Deleting Records

Sometimes you need to permanently remove records. Use `forceDelete()`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TrashController extends Controller
{
    /**
     * Permanently delete a post.
     * This cannot be undone - the record is removed from the database.
     */
    public function forceDestroy(int $id): JsonResponse
    {
        $post = Post::withTrashed()->findOrFail($id);

        // forceDelete() permanently removes the record
        $post->forceDelete();

        return response()->json([
            'message' => 'Post permanently deleted',
        ]);
    }

    /**
     * Empty the trash - permanently delete all trashed posts.
     */
    public function emptyTrash(): JsonResponse
    {
        $deletedCount = Post::onlyTrashed()->forceDelete();

        return response()->json([
            'message' => "Permanently deleted {$deletedCount} posts",
            'deleted_count' => $deletedCount,
        ]);
    }

    /**
     * Auto-purge old deleted records.
     * Useful for GDPR compliance or storage management.
     */
    public function purgeOldRecords(int $daysOld = 30): JsonResponse
    {
        // Delete records that have been in trash for more than X days
        $cutoffDate = now()->subDays($daysOld);

        $deletedCount = Post::onlyTrashed()
            ->where('deleted_at', '<', $cutoffDate)
            ->forceDelete();

        return response()->json([
            'message' => "Purged {$deletedCount} posts older than {$daysOld} days",
            'deleted_count' => $deletedCount,
        ]);
    }
}
```

## Handling Cascading Soft Deletes

When a parent record is deleted, you often want related records to be soft-deleted too. Laravel does not do this automatically, but there are several approaches.

### Using Model Events

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;

    /**
     * Boot the model and register event listeners.
     */
    protected static function boot()
    {
        parent::boot();

        // When a post is soft deleted, also soft delete its comments
        static::deleting(function (Post $post) {
            // Only cascade if this is a soft delete (not force delete)
            if (!$post->isForceDeleting()) {
                $post->comments()->delete();
            }
        });

        // When a post is restored, also restore its comments
        static::restoring(function (Post $post) {
            // Restore comments that were deleted at the same time as the post
            // Using a time window to catch related deletions
            $post->comments()
                ->onlyTrashed()
                ->where('deleted_at', '>=', $post->deleted_at->subSecond())
                ->where('deleted_at', '<=', $post->deleted_at->addSecond())
                ->restore();
        });

        // When a post is force deleted, also force delete its comments
        static::forceDeleting(function (Post $post) {
            $post->comments()->withTrashed()->forceDelete();
        });
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }
}
```

### Creating a Reusable Trait for Cascading

For consistent cascading behavior across your application:

```php
<?php

namespace App\Traits;

trait CascadeSoftDeletes
{
    /**
     * Boot the trait and register cascading behavior.
     */
    protected static function bootCascadeSoftDeletes(): void
    {
        static::deleting(function ($model) {
            if (!$model->isForceDeleting()) {
                $model->cascadeDelete();
            }
        });

        static::restoring(function ($model) {
            $model->cascadeRestore();
        });

        static::forceDeleting(function ($model) {
            $model->cascadeForceDelete();
        });
    }

    /**
     * Get the relationships that should cascade on delete.
     * Override this in your model to specify which relationships to cascade.
     *
     * @return array<string>
     */
    protected function getCascadingDeletes(): array
    {
        // Override this method in your model
        // Return an array of relationship method names
        return $this->cascadeDeletes ?? [];
    }

    /**
     * Cascade soft delete to related models.
     */
    protected function cascadeDelete(): void
    {
        foreach ($this->getCascadingDeletes() as $relationship) {
            if (method_exists($this, $relationship)) {
                $this->{$relationship}()->delete();
            }
        }
    }

    /**
     * Cascade restore to related models.
     */
    protected function cascadeRestore(): void
    {
        foreach ($this->getCascadingDeletes() as $relationship) {
            if (method_exists($this, $relationship)) {
                // Restore records deleted around the same time
                $this->{$relationship}()
                    ->onlyTrashed()
                    ->where('deleted_at', '>=', $this->deleted_at->subSeconds(5))
                    ->where('deleted_at', '<=', $this->deleted_at->addSeconds(5))
                    ->restore();
            }
        }
    }

    /**
     * Cascade force delete to related models.
     */
    protected function cascadeForceDelete(): void
    {
        foreach ($this->getCascadingDeletes() as $relationship) {
            if (method_exists($this, $relationship)) {
                $this->{$relationship}()->withTrashed()->forceDelete();
            }
        }
    }
}
```

Using the trait in your model:

```php
<?php

namespace App\Models;

use App\Traits\CascadeSoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes, CascadeSoftDeletes;

    /**
     * Relationships that should be soft deleted when this model is deleted.
     *
     * @var array<string>
     */
    protected $cascadeDeletes = ['comments', 'tags'];

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class);
    }
}
```

## Working with Unique Constraints

Soft deletes can cause issues with unique constraints. Consider a `posts` table with a unique `slug` column. If you soft delete a post and try to create a new post with the same slug, you will get a constraint violation.

### Solution 1 - Include deleted_at in the Unique Index

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('slug');
            $table->timestamps();
            $table->softDeletes();

            // Unique constraint includes deleted_at
            // This allows the same slug for active and deleted posts
            $table->unique(['slug', 'deleted_at']);
        });
    }
};
```

### Solution 2 - Modify Slug on Delete

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Post extends Model
{
    use SoftDeletes;

    protected static function boot()
    {
        parent::boot();

        // Append a unique suffix to the slug when soft deleting
        static::deleting(function (Post $post) {
            if (!$post->isForceDeleting()) {
                $post->slug = $post->slug . '_deleted_' . Str::random(8);
                $post->saveQuietly(); // Save without triggering events
            }
        });

        // Restore the original slug when restoring
        static::restoring(function (Post $post) {
            // Remove the _deleted_xxx suffix
            $post->slug = preg_replace('/_deleted_[a-zA-Z0-9]{8}$/', '', $post->slug);
        });
    }
}
```

## Soft Deletes in API Resources

When building APIs, format soft delete information appropriately:

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->content,
            'status' => $this->status,
            'author' => new UserResource($this->whenLoaded('user')),

            // Timestamps
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),

            // Soft delete information - only included if the record is deleted
            'deleted_at' => $this->when(
                $this->trashed(),
                fn() => $this->deleted_at->toIso8601String()
            ),
            'is_deleted' => $this->trashed(),

            // Include restoration link for deleted records
            'links' => [
                'self' => route('posts.show', $this->id),
                'restore' => $this->when(
                    $this->trashed(),
                    fn() => route('admin.posts.restore', $this->id)
                ),
            ],
        ];
    }
}
```

## Scheduling Automatic Cleanup

Use Laravel's scheduler to automatically purge old soft-deleted records:

```php
<?php

namespace App\Console;

use App\Models\Post;
use App\Models\Comment;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Purge posts deleted more than 30 days ago
        $schedule->call(function () {
            $count = Post::onlyTrashed()
                ->where('deleted_at', '<', now()->subDays(30))
                ->forceDelete();

            logger()->info("Purged {$count} old deleted posts");
        })->daily()->at('03:00');

        // Purge comments deleted more than 7 days ago
        $schedule->call(function () {
            $count = Comment::onlyTrashed()
                ->where('deleted_at', '<', now()->subDays(7))
                ->forceDelete();

            logger()->info("Purged {$count} old deleted comments");
        })->daily()->at('03:30');
    }
}
```

Or create a dedicated Artisan command:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgeSoftDeletedRecords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:purge-deleted
                            {--days=30 : Number of days after which to purge}
                            {--model=* : Specific models to purge (default: all)}
                            {--dry-run : Show what would be deleted without deleting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Permanently delete soft-deleted records older than specified days';

    /**
     * Models that support soft deletes.
     *
     * @var array<class-string>
     */
    protected $softDeleteModels = [
        \App\Models\Post::class,
        \App\Models\Comment::class,
        \App\Models\User::class,
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $dryRun = $this->option('dry-run');
        $specificModels = $this->option('model');

        $cutoffDate = now()->subDays($days);

        $this->info("Purging records deleted before: {$cutoffDate->toDateTimeString()}");

        if ($dryRun) {
            $this->warn('DRY RUN - No records will be deleted');
        }

        $models = empty($specificModels)
            ? $this->softDeleteModels
            : $specificModels;

        $totalPurged = 0;

        foreach ($models as $modelClass) {
            if (!class_exists($modelClass)) {
                $this->error("Model not found: {$modelClass}");
                continue;
            }

            $count = $modelClass::onlyTrashed()
                ->where('deleted_at', '<', $cutoffDate)
                ->count();

            if ($count === 0) {
                $this->line("  {$modelClass}: 0 records");
                continue;
            }

            if (!$dryRun) {
                $modelClass::onlyTrashed()
                    ->where('deleted_at', '<', $cutoffDate)
                    ->forceDelete();
            }

            $this->info("  {$modelClass}: {$count} records" . ($dryRun ? ' (would be deleted)' : ' deleted'));
            $totalPurged += $count;
        }

        $this->newLine();
        $this->info("Total: {$totalPurged} records" . ($dryRun ? ' would be' : '') . ' purged');

        return Command::SUCCESS;
    }
}
```

## Global Scopes for Soft Deletes

Sometimes you need more complex soft delete logic. Use global scopes:

```php
<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class VisibleToUserScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     * This scope shows active records and records deleted by the current user.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();

        if ($user) {
            $builder->where(function ($query) use ($user) {
                // Show non-deleted records
                $query->whereNull('deleted_at')
                    // Or records deleted by the current user (for recovery)
                    ->orWhere(function ($q) use ($user) {
                        $q->whereNotNull('deleted_at')
                          ->where('deleted_by', $user->id);
                    });
            });
        } else {
            // Anonymous users only see active records
            $builder->whereNull('deleted_at');
        }
    }
}
```

Apply it to your model:

```php
<?php

namespace App\Models;

use App\Models\Scopes\VisibleToUserScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;

    /**
     * Boot the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new VisibleToUserScope);
    }
}
```

## Testing Soft Deletes

Write comprehensive tests for your soft delete logic:

```php
<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SoftDeleteTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /** @test */
    public function it_soft_deletes_a_post(): void
    {
        $post = Post::factory()->create(['user_id' => $this->user->id]);

        $post->delete();

        // Post should not appear in normal queries
        $this->assertDatabaseHas('posts', ['id' => $post->id]);
        $this->assertNull(Post::find($post->id));
        $this->assertNotNull($post->fresh()->deleted_at);
    }

    /** @test */
    public function it_excludes_soft_deleted_posts_from_queries(): void
    {
        $activePost = Post::factory()->create(['user_id' => $this->user->id]);
        $deletedPost = Post::factory()->create(['user_id' => $this->user->id]);
        $deletedPost->delete();

        $posts = Post::all();

        $this->assertCount(1, $posts);
        $this->assertTrue($posts->contains($activePost));
        $this->assertFalse($posts->contains($deletedPost));
    }

    /** @test */
    public function it_includes_soft_deleted_posts_with_trashed(): void
    {
        $activePost = Post::factory()->create(['user_id' => $this->user->id]);
        $deletedPost = Post::factory()->create(['user_id' => $this->user->id]);
        $deletedPost->delete();

        $posts = Post::withTrashed()->get();

        $this->assertCount(2, $posts);
        $this->assertTrue($posts->contains($activePost));
        $this->assertTrue($posts->contains($deletedPost));
    }

    /** @test */
    public function it_retrieves_only_soft_deleted_posts(): void
    {
        $activePost = Post::factory()->create(['user_id' => $this->user->id]);
        $deletedPost = Post::factory()->create(['user_id' => $this->user->id]);
        $deletedPost->delete();

        $trashedPosts = Post::onlyTrashed()->get();

        $this->assertCount(1, $trashedPosts);
        $this->assertTrue($trashedPosts->contains($deletedPost));
        $this->assertFalse($trashedPosts->contains($activePost));
    }

    /** @test */
    public function it_restores_a_soft_deleted_post(): void
    {
        $post = Post::factory()->create(['user_id' => $this->user->id]);
        $post->delete();

        $post->restore();

        $this->assertNull($post->fresh()->deleted_at);
        $this->assertNotNull(Post::find($post->id));
    }

    /** @test */
    public function it_force_deletes_a_post_permanently(): void
    {
        $post = Post::factory()->create(['user_id' => $this->user->id]);
        $postId = $post->id;

        $post->forceDelete();

        $this->assertDatabaseMissing('posts', ['id' => $postId]);
        $this->assertNull(Post::withTrashed()->find($postId));
    }

    /** @test */
    public function it_cascades_soft_delete_to_comments(): void
    {
        $post = Post::factory()
            ->has(Comment::factory()->count(3))
            ->create(['user_id' => $this->user->id]);

        $post->delete();

        // All comments should also be soft deleted
        $this->assertCount(0, Comment::where('post_id', $post->id)->get());
        $this->assertCount(3, Comment::withTrashed()->where('post_id', $post->id)->get());
    }

    /** @test */
    public function it_cascades_restore_to_comments(): void
    {
        $post = Post::factory()
            ->has(Comment::factory()->count(3))
            ->create(['user_id' => $this->user->id]);

        $post->delete();
        $post->restore();

        // All comments should also be restored
        $this->assertCount(3, Comment::where('post_id', $post->id)->get());
    }

    /** @test */
    public function trashed_method_returns_correct_status(): void
    {
        $post = Post::factory()->create(['user_id' => $this->user->id]);

        $this->assertFalse($post->trashed());

        $post->delete();

        $this->assertTrue($post->trashed());

        $post->restore();

        $this->assertFalse($post->trashed());
    }
}
```

## Performance Considerations

Soft deletes can impact query performance as your trash grows. Here are some tips:

### Add Proper Indexes

```php
<?php

// In your migration
Schema::table('posts', function (Blueprint $table) {
    // Index for common queries
    $table->index('deleted_at');

    // Composite index for filtered queries
    $table->index(['deleted_at', 'status']);
    $table->index(['deleted_at', 'user_id']);
    $table->index(['deleted_at', 'created_at']);
});
```

### Partition Large Tables

For very large tables, consider partitioning by deleted status or using table archiving.

### Monitor Trash Size

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TrashStats extends Command
{
    protected $signature = 'app:trash-stats';
    protected $description = 'Show soft delete statistics';

    public function handle(): int
    {
        $tables = ['posts', 'comments', 'users'];

        $this->table(
            ['Table', 'Active', 'Deleted', 'Delete Rate'],
            collect($tables)->map(function ($table) {
                $active = DB::table($table)->whereNull('deleted_at')->count();
                $deleted = DB::table($table)->whereNotNull('deleted_at')->count();
                $total = $active + $deleted;
                $rate = $total > 0 ? round(($deleted / $total) * 100, 2) : 0;

                return [$table, $active, $deleted, "{$rate}%"];
            })
        );

        return Command::SUCCESS;
    }
}
```

## Summary

| Operation | Method | Result |
|-----------|--------|--------|
| Soft delete | `$model->delete()` | Sets `deleted_at` timestamp |
| Check if deleted | `$model->trashed()` | Returns boolean |
| Include deleted | `Model::withTrashed()` | Includes all records |
| Only deleted | `Model::onlyTrashed()` | Only deleted records |
| Restore | `$model->restore()` | Clears `deleted_at` |
| Permanent delete | `$model->forceDelete()` | Removes from database |

Soft deletes are a powerful pattern for maintaining data integrity, supporting audit requirements, and enabling recovery from mistakes. Laravel makes implementation straightforward with the `SoftDeletes` trait, while giving you full control over cascading behavior, cleanup schedules, and query patterns.

---

Building reliable applications means being prepared for the unexpected - accidental deletions, compliance audits, or the need to recover historical data. Soft deletes are one piece of that reliability puzzle.

For comprehensive monitoring of your Laravel applications, including database performance, error tracking, and uptime monitoring, check out [OneUptime](https://oneuptime.com). OneUptime provides real-time observability so you can catch issues before your users do - whether that is a slow query, a spike in deletions, or an unexpected error in your data layer.
