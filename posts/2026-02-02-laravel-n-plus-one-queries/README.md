# How to Handle N+1 Queries in Laravel

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PHP, Laravel, Database, Performance, Eloquent

Description: Learn how to identify and fix N+1 query problems in Laravel using eager loading, query optimization techniques, and debugging tools.

---

If your Laravel app feels sluggish and you're not sure why, there's a good chance you're dealing with N+1 queries. This is one of the most common performance issues in applications that use an ORM, and Eloquent makes it surprisingly easy to fall into this trap without realizing it.

Let's break down what N+1 queries are, how to spot them, and the practical ways to fix them in your Laravel applications.

## What Is the N+1 Query Problem?

The N+1 problem happens when your code executes one query to fetch a collection of records, then runs an additional query for each record to fetch related data. So if you have 100 posts, you end up with 1 query for posts + 100 queries for authors = 101 total queries.

Here's a classic example that triggers N+1:

```php
// This looks innocent, but it's a performance killer
$posts = Post::all();

foreach ($posts as $post) {
    // Each iteration fires a new query to fetch the author
    echo $post->author->name;
}
```

What actually happens:

```sql
-- Query 1: Fetch all posts
SELECT * FROM posts;

-- Query 2-101: Fetch each author separately
SELECT * FROM users WHERE id = 1;
SELECT * FROM users WHERE id = 2;
SELECT * FROM users WHERE id = 3;
-- ... and so on for every single post
```

## Query Count Comparison

| Approach | Posts | Authors Fetched | Total Queries |
|----------|-------|-----------------|---------------|
| Lazy Loading (N+1) | 100 | 100 | 101 |
| Eager Loading | 100 | 100 | 2 |
| Lazy Loading (N+1) | 1000 | 1000 | 1001 |
| Eager Loading | 1000 | 1000 | 2 |

The difference is massive. Two queries vs a thousand queries - that's the difference between a snappy response and a timeout.

## Fix 1: Eager Loading with with()

The most straightforward fix is eager loading using the `with()` method. This tells Eloquent to fetch the related records upfront in a single query.

```php
// Eager load the author relationship
$posts = Post::with('author')->get();

foreach ($posts as $post) {
    // No additional queries - author data is already loaded
    echo $post->author->name;
}
```

Now Laravel executes just two queries:

```sql
-- Query 1: Fetch all posts
SELECT * FROM posts;

-- Query 2: Fetch all authors for those posts in one go
SELECT * FROM users WHERE id IN (1, 2, 3, 4, 5, ...);
```

You can eager load multiple relationships at once:

```php
// Load multiple relationships
$posts = Post::with(['author', 'comments', 'tags'])->get();

// Nested eager loading - load comments and their authors
$posts = Post::with(['comments.author'])->get();

// Constrain eager loaded relationships
$posts = Post::with(['comments' => function ($query) {
    $query->where('approved', true)
          ->orderBy('created_at', 'desc');
}])->get();
```

## Fix 2: Lazy Eager Loading with load()

Sometimes you already have a model instance and need to load relationships after the fact. Use `load()` for this:

```php
$post = Post::find(1);

// Later in your code, you realize you need the comments
$post->load('comments');

// Load multiple relationships
$post->load(['author', 'comments.author']);
```

This is useful when the decision to load relationships depends on runtime conditions:

```php
$posts = Post::all();

if ($request->has('include_authors')) {
    // Only load authors if specifically requested
    $posts->load('author');
}
```

## Fix 3: Count Related Records with withCount()

Need to display how many comments each post has? Don't load all the comments just to count them:

```php
// Bad - loads all comment data just to count
$posts = Post::with('comments')->get();
foreach ($posts as $post) {
    echo $post->comments->count(); // Wasteful
}

// Good - adds a comments_count attribute without loading comments
$posts = Post::withCount('comments')->get();
foreach ($posts as $post) {
    echo $post->comments_count; // Efficient
}
```

The `withCount()` method runs a subquery and adds the count as an attribute:

```sql
SELECT posts.*,
       (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comments_count
FROM posts;
```

You can also add conditions to the count:

```php
// Count only approved comments
$posts = Post::withCount(['comments' => function ($query) {
    $query->where('approved', true);
}])->get();

// Multiple counts with aliases
$posts = Post::withCount([
    'comments',
    'comments as approved_comments_count' => function ($query) {
        $query->where('approved', true);
    }
])->get();
```

## Fix 4: Prevent N+1 with Strict Mode

Laravel 9+ includes a strict mode that throws an exception when lazy loading happens. This is incredibly useful during development to catch N+1 issues before they hit production.

Add this to your `AppServiceProvider`:

```php
<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Prevent lazy loading in non-production environments
        Model::preventLazyLoading(!app()->isProduction());

        // Optional: Log instead of throwing exceptions in production
        Model::handleLazyLoadingViolationUsing(function ($model, $relation) {
            $class = get_class($model);
            logger()->warning("Lazy loading {$relation} on {$class}");
        });
    }
}
```

Now when you accidentally trigger lazy loading during development:

```php
$post = Post::first();
$post->author->name; // Throws Illuminate\Database\LazyLoadingViolationException
```

This forces you to explicitly eager load relationships, making N+1 issues impossible to miss.

## Fix 5: Use Laravel Debugbar

Laravel Debugbar is essential for identifying N+1 problems. Install it via Composer:

```bash
composer require barryvdh/laravel-debugbar --dev
```

Once installed, you'll see a debug bar at the bottom of your pages showing:

- Total number of queries executed
- Time taken by each query
- Duplicate queries (a telltale sign of N+1)
- Memory usage

When you see dozens of similar queries with different IDs, that's your N+1 problem staring back at you.

For API endpoints or when you need programmatic access, use the query log:

```php
// Enable query logging
DB::enableQueryLog();

// Run your code
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->author->name;
}

// Dump the queries
dd(DB::getQueryLog());
```

## Model-Level Default Eager Loading

If a relationship is almost always needed, define it on the model:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    // These relationships are always eager loaded
    protected $with = ['author'];

    public function author()
    {
        return $this->belongsTo(User::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }
}
```

Now every Post query automatically includes the author. You can disable this for specific queries:

```php
// Skip the default eager loading
$posts = Post::without('author')->get();
```

## Quick Reference

| Scenario | Solution |
|----------|----------|
| Fetching related records in a loop | Use `with()` to eager load |
| Need to load relations on existing model | Use `load()` |
| Only need counts of related records | Use `withCount()` |
| Catch N+1 during development | Enable `preventLazyLoading()` |
| Debug query performance | Install Laravel Debugbar |
| Relation always needed | Add to `$with` property on model |

## Wrapping Up

N+1 queries are sneaky. The code looks clean and the bug doesn't show up until you have real data. The fix is straightforward - be explicit about what relationships you need and load them upfront.

Enable strict mode in development, use Debugbar to verify your query counts, and make eager loading a habit. Your database (and your users) will thank you.
