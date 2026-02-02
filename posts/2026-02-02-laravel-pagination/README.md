# How to Implement Pagination in Laravel

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PHP, Laravel, Pagination, Eloquent, API

Description: A comprehensive guide to implementing pagination in Laravel, covering basic pagination, cursor pagination, API resources, and custom pagination views.

---

When your application grows and you start dealing with thousands or millions of records, loading everything at once becomes a problem. Your pages slow down, memory usage spikes, and users get frustrated. Pagination solves this by breaking large datasets into smaller, manageable chunks.

Laravel makes pagination ridiculously easy. You can add it to any query with a single method call, and the framework handles all the complexity for you - generating links, tracking the current page, and slicing the results.

## Pagination Methods Comparison

| Method | Use Case | Performance | Memory | Supports Jump to Page |
|--------|----------|-------------|--------|----------------------|
| `paginate()` | Standard web pages | Good | Moderate | Yes |
| `simplePaginate()` | Mobile apps, infinite scroll | Better | Lower | No |
| `cursorPaginate()` | Large datasets, real-time data | Best | Lowest | No |

## Basic Pagination with paginate()

The `paginate()` method is the most commonly used. It fetches results for the current page and generates links to navigate between pages.

```php
<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request)
    {
        // Fetch 15 posts per page (default is 15 if not specified)
        $posts = Post::query()
            ->where('published', true)
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return view('posts.index', compact('posts'));
    }
}
```

In your Blade template, you can render the pagination links:

```blade
{{-- resources/views/posts/index.blade.php --}}
<div class="posts-container">
    @foreach ($posts as $post)
        <article class="post">
            <h2>{{ $post->title }}</h2>
            <p>{{ $post->excerpt }}</p>
        </article>
    @endforeach

    {{-- Render pagination links --}}
    <div class="pagination-wrapper">
        {{ $posts->links() }}
    </div>
</div>
```

The `paginate()` method runs two queries: one to count total records and another to fetch the current page. This count query is what allows it to show "Page 3 of 12" and generate links to all pages.

## Simple Pagination with simplePaginate()

If you don't need to know the total number of pages - for example, in an infinite scroll interface or mobile app - use `simplePaginate()`. It skips the count query, making it faster.

```php
<?php

public function feed(Request $request)
{
    // Only shows "Previous" and "Next" links - no page numbers
    $posts = Post::query()
        ->with(['author', 'category']) // Eager load relationships
        ->where('published', true)
        ->latest()
        ->simplePaginate(20);

    return view('feed', compact('posts'));
}
```

The difference is subtle but important for large tables. On a table with millions of rows, the `COUNT(*)` query in `paginate()` can take seconds. With `simplePaginate()`, you avoid that entirely.

## Cursor Pagination with cursorPaginate()

Cursor pagination is the most efficient method for very large datasets. Instead of using offsets (which get slower as you go deeper into results), it uses a cursor - essentially a pointer to where you left off.

```php
<?php

public function timeline(Request $request)
{
    // Cursor pagination requires a unique, ordered column
    $tweets = Tweet::query()
        ->where('user_id', auth()->id())
        ->orderBy('id', 'desc') // Must have consistent ordering
        ->cursorPaginate(50);

    return response()->json([
        'data' => $tweets->items(),
        'next_cursor' => $tweets->nextCursor()?->encode(),
        'prev_cursor' => $tweets->previousCursor()?->encode(),
    ]);
}
```

Cursor pagination has some limitations: you cannot jump to a specific page, and the order must be based on a unique, sequential column (usually the primary key or a timestamp).

## API Pagination with Resources

When building APIs, you want consistent JSON responses. Laravel's API Resources combined with pagination give you clean, structured output.

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'author' => [
                'id' => $this->author->id,
                'name' => $this->author->name,
            ],
            'published_at' => $this->published_at->toIso8601String(),
            'read_time' => $this->read_time_minutes . ' min read',
        ];
    }
}
```

Now use the resource collection in your controller:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request)
    {
        $posts = Post::query()
            ->with('author')
            ->published()
            ->latest()
            ->paginate($request->input('per_page', 15));

        // Wrap in resource collection - pagination meta is preserved
        return PostResource::collection($posts);
    }
}
```

The JSON response includes pagination metadata automatically:

```json
{
    "data": [
        {
            "id": 1,
            "title": "Getting Started with Laravel",
            "slug": "getting-started-with-laravel",
            "excerpt": "Learn the basics...",
            "author": {
                "id": 5,
                "name": "Jane Doe"
            },
            "published_at": "2026-01-15T10:30:00+00:00",
            "read_time": "5 min read"
        }
    ],
    "links": {
        "first": "http://api.example.com/posts?page=1",
        "last": "http://api.example.com/posts?page=10",
        "prev": null,
        "next": "http://api.example.com/posts?page=2"
    },
    "meta": {
        "current_page": 1,
        "from": 1,
        "last_page": 10,
        "per_page": 15,
        "to": 15,
        "total": 150
    }
}
```

## Custom Pagination Views

Laravel uses Tailwind CSS for pagination by default. You can publish and customize the views, or switch to Bootstrap or a completely custom design.

```bash
# Publish pagination views to resources/views/vendor/pagination
php artisan vendor:publish --tag=laravel-pagination
```

To use Bootstrap styling instead of Tailwind:

```php
<?php

namespace App\Providers;

use Illuminate\Pagination\Paginator;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Use Bootstrap 5 styling for pagination
        Paginator::useBootstrapFive();

        // Or Bootstrap 4
        // Paginator::useBootstrapFour();
    }
}
```

For a fully custom pagination view:

```blade
{{-- resources/views/vendor/pagination/custom.blade.php --}}
@if ($paginator->hasPages())
    <nav class="pagination-nav" role="navigation">
        {{-- Previous Page Link --}}
        @if ($paginator->onFirstPage())
            <span class="pagination-link disabled">Previous</span>
        @else
            <a href="{{ $paginator->previousPageUrl() }}" class="pagination-link">Previous</a>
        @endif

        {{-- Page Numbers --}}
        @foreach ($elements as $element)
            @if (is_string($element))
                <span class="pagination-ellipsis">{{ $element }}</span>
            @endif

            @if (is_array($element))
                @foreach ($element as $page => $url)
                    @if ($page == $paginator->currentPage())
                        <span class="pagination-link active">{{ $page }}</span>
                    @else
                        <a href="{{ $url }}" class="pagination-link">{{ $page }}</a>
                    @endif
                @endforeach
            @endif
        @endforeach

        {{-- Next Page Link --}}
        @if ($paginator->hasMorePages())
            <a href="{{ $paginator->nextPageUrl() }}" class="pagination-link">Next</a>
        @else
            <span class="pagination-link disabled">Next</span>
        @endif
    </nav>
@endif
```

Use your custom view:

```blade
{{ $posts->links('vendor.pagination.custom') }}
```

## Appending Query Parameters

When your page has filters or search parameters, you need to preserve them in pagination links:

```php
<?php

public function search(Request $request)
{
    $posts = Post::query()
        ->when($request->filled('category'), function ($query) use ($request) {
            $query->where('category_id', $request->category);
        })
        ->when($request->filled('q'), function ($query) use ($request) {
            $query->where('title', 'like', '%' . $request->q . '%');
        })
        ->paginate(15)
        ->withQueryString(); // Preserves all query parameters in pagination links

    return view('posts.search', compact('posts'));
}
```

You can also append specific parameters:

```php
$posts->appends(['sort' => 'date', 'direction' => 'desc'])->links();
```

## Performance Tips

When working with pagination, keep these practices in mind:

1. **Always add indexes** on columns you filter or sort by
2. **Use eager loading** to avoid N+1 queries
3. **Choose the right method** - cursor pagination for feeds, simple pagination for mobile
4. **Limit per_page values** - don't let users request 1000 items per page

```php
<?php

public function index(Request $request)
{
    // Validate and limit per_page to reasonable values
    $perPage = min($request->input('per_page', 15), 100);

    $posts = Post::query()
        ->select(['id', 'title', 'slug', 'excerpt', 'created_at']) // Select only needed columns
        ->with(['author:id,name']) // Eager load with specific columns
        ->latest()
        ->paginate($perPage);

    return PostResource::collection($posts);
}
```

## Summary

Laravel's pagination is flexible enough to handle any scenario. Use `paginate()` for traditional web pages where users need to jump between pages. Switch to `simplePaginate()` for better performance when you only need previous/next navigation. Choose `cursorPaginate()` for high-performance APIs dealing with large, frequently-updated datasets.

The key is matching the pagination method to your use case. Most web applications do fine with basic `paginate()`, but knowing when to reach for the alternatives can make a real difference in user experience and server load.
