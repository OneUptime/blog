# How to Use Laravel Blade Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PHP, Laravel, Blade, Templates, Frontend

Description: Learn how to use Laravel Blade for dynamic templating. This guide covers directives, layouts, components, and best practices for building maintainable views.

---

Laravel's Blade templating engine is one of the framework's most powerful features. Unlike other PHP templating engines, Blade does not restrict you from using plain PHP code in your views. In fact, all Blade templates are compiled into plain PHP code and cached until modified, meaning Blade adds essentially zero overhead to your application.

This guide walks through everything you need to know to build maintainable, reusable views with Blade - from basic syntax to advanced component patterns.

## Understanding Blade Basics

Blade template files use the `.blade.php` extension and are stored in the `resources/views` directory. The Blade engine provides two primary advantages: template inheritance and sections.

### Creating Your First Blade View

```php
{{-- resources/views/welcome.blade.php --}}

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to My App</title>
</head>
<body>
    {{-- Display a variable passed from the controller --}}
    <h1>Hello, {{ $name }}</h1>

    {{-- The double curly braces automatically escape HTML entities --}}
    {{-- This prevents XSS attacks by converting special characters --}}
    <p>Your message: {{ $message }}</p>
</body>
</html>
```

### Rendering Views from Controllers

```php
<?php

// app/Http/Controllers/WelcomeController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class WelcomeController extends Controller
{
    public function index()
    {
        // Pass data to the view using the compact function
        $name = 'John Doe';
        $message = 'Welcome to our application!';

        return view('welcome', compact('name', 'message'));
    }

    public function show()
    {
        // Alternative: pass data as an array
        return view('welcome', [
            'name' => 'Jane Doe',
            'message' => 'Thanks for visiting!',
        ]);
    }

    public function display()
    {
        // Another alternative: use the with method
        return view('welcome')
            ->with('name', 'Bob Smith')
            ->with('message', 'Have a great day!');
    }
}
```

## Displaying Data

Blade provides several ways to display data in your templates. Understanding when to use each method is crucial for security and functionality.

### Escaped Output

```php
{{-- resources/views/user/profile.blade.php --}}

{{-- Default: escaped output - safe for user-generated content --}}
<h1>{{ $user->name }}</h1>

{{-- The above compiles to: --}}
{{-- <?php echo htmlspecialchars($user->name, ENT_QUOTES, 'UTF-8', true); ?> --}}

{{-- Display data with a default value if the variable is not set --}}
<p>Email: {{ $user->email ?? 'No email provided' }}</p>

{{-- Use the ternary operator for conditional display --}}
<p>Status: {{ $user->is_active ? 'Active' : 'Inactive' }}</p>

{{-- Call methods on objects --}}
<p>Member since: {{ $user->created_at->format('F j, Y') }}</p>

{{-- Access array elements --}}
<p>First tag: {{ $tags[0] ?? 'No tags' }}</p>
```

### Unescaped Output

```php
{{-- Use unescaped output only for trusted content like HTML from your database --}}
{{-- WARNING: Never use this for user-submitted content without sanitization --}}

{{-- Display raw HTML content --}}
<div class="content">
    {!! $article->body !!}
</div>

{{-- Render HTML from a trusted source --}}
<div class="widget">
    {!! $trustedHtmlWidget !!}
</div>

{{-- Common use case: rendering markdown that has been converted to HTML --}}
<article>
    {!! Str::markdown($post->content) !!}
</article>
```

### Rendering JSON

```php
{{-- Pass data to JavaScript safely --}}

<script>
    // The @json directive properly encodes PHP arrays/objects as JSON
    // It also handles special characters and prevents XSS
    const users = @json($users);

    // With formatting options for readability during development
    const config = @json($config, JSON_PRETTY_PRINT);

    // Access the data in your JavaScript
    console.log(users[0].name);
</script>

{{-- Alternative using Blade's double encoding --}}
<div data-config="{{ json_encode($config) }}">
    {{-- This element has its config as a data attribute --}}
</div>
```

## Blade Directives

Directives are Blade's way of providing convenient shortcuts for common PHP control structures. They make your templates cleaner and more readable.

### Conditional Directives

```php
{{-- resources/views/dashboard.blade.php --}}

{{-- Basic if statement --}}
@if($user->isAdmin())
    <div class="admin-panel">
        <h2>Admin Dashboard</h2>
        <p>You have full access to all features.</p>
    </div>
@endif

{{-- If-else statement --}}
@if($posts->count() > 0)
    <p>You have {{ $posts->count() }} posts.</p>
@else
    <p>You have not written any posts yet.</p>
@endif

{{-- If-elseif-else chain --}}
@if($user->subscription === 'premium')
    <span class="badge badge-gold">Premium Member</span>
@elseif($user->subscription === 'basic')
    <span class="badge badge-silver">Basic Member</span>
@else
    <span class="badge badge-gray">Free Member</span>
@endif

{{-- Unless directive - opposite of if --}}
@unless($user->hasVerifiedEmail())
    <div class="alert alert-warning">
        Please verify your email address.
        <a href="{{ route('verification.send') }}">Resend verification email</a>
    </div>
@endunless

{{-- Isset directive - checks if variable exists and is not null --}}
@isset($specialOffer)
    <div class="promo-banner">
        {{ $specialOffer->message }}
    </div>
@endisset

{{-- Empty directive - checks if variable is empty --}}
@empty($notifications)
    <p class="text-muted">No new notifications.</p>
@endempty
```

### Authentication Directives

```php
{{-- resources/views/layouts/navigation.blade.php --}}

<nav class="navbar">
    <a href="/" class="brand">MyApp</a>

    <div class="nav-links">
        {{-- Show different content based on authentication status --}}
        @auth
            {{-- User is logged in --}}
            <span>Welcome, {{ auth()->user()->name }}</span>
            <a href="{{ route('dashboard') }}">Dashboard</a>
            <form action="{{ route('logout') }}" method="POST">
                @csrf
                <button type="submit">Logout</button>
            </form>
        @endauth

        @guest
            {{-- User is not logged in --}}
            <a href="{{ route('login') }}">Login</a>
            <a href="{{ route('register') }}">Register</a>
        @endguest
    </div>
</nav>

{{-- Check specific guard --}}
@auth('admin')
    <a href="{{ route('admin.dashboard') }}">Admin Panel</a>
@endauth

@guest('admin')
    <p>Please log in to access admin features.</p>
@endguest
```

### Environment Directives

```php
{{-- resources/views/layouts/app.blade.php --}}

{{-- Only show in production --}}
@production
    {{-- Google Analytics tracking code --}}
    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'GA_TRACKING_ID');
    </script>
@endproduction

{{-- Only show in specific environment --}}
@env('staging')
    <div class="staging-banner">
        You are viewing the staging environment.
    </div>
@endenv

{{-- Show in multiple environments --}}
@env(['local', 'staging'])
    <div class="debug-toolbar">
        {{-- Debug information for development --}}
        <p>Environment: {{ app()->environment() }}</p>
        <p>Laravel Version: {{ app()->version() }}</p>
    </div>
@endenv
```

### Session and Error Directives

```php
{{-- resources/views/auth/login.blade.php --}}

{{-- Display session flash messages --}}
@session('status')
    <div class="alert alert-success">
        {{ $value }}
    </div>
@endsession

@session('error')
    <div class="alert alert-danger">
        {{ $value }}
    </div>
@endsession

{{-- Form with error handling --}}
<form method="POST" action="{{ route('login') }}">
    @csrf

    <div class="form-group">
        <label for="email">Email</label>
        <input
            type="email"
            name="email"
            id="email"
            value="{{ old('email') }}"
            class="@error('email') is-invalid @enderror"
        >

        {{-- Display specific field error --}}
        @error('email')
            <span class="error-message">{{ $message }}</span>
        @enderror
    </div>

    <div class="form-group">
        <label for="password">Password</label>
        <input
            type="password"
            name="password"
            id="password"
            class="@error('password') is-invalid @enderror"
        >

        @error('password')
            <span class="error-message">{{ $message }}</span>
        @enderror
    </div>

    <button type="submit">Login</button>
</form>

{{-- Check if there are any errors --}}
@if($errors->any())
    <div class="alert alert-danger">
        <ul>
            @foreach($errors->all() as $error)
                <li>{{ $error }}</li>
            @endforeach
        </ul>
    </div>
@endif
```

## Loops in Blade

Blade provides clean syntax for all common loop structures, plus a special `$loop` variable that gives you useful information about the current iteration.

### Basic Loops

```php
{{-- resources/views/posts/index.blade.php --}}

{{-- For loop --}}
<ul class="pagination">
    @for($i = 1; $i <= $totalPages; $i++)
        <li class="{{ $currentPage === $i ? 'active' : '' }}">
            <a href="?page={{ $i }}">{{ $i }}</a>
        </li>
    @endfor
</ul>

{{-- Foreach loop --}}
<div class="posts-grid">
    @foreach($posts as $post)
        <article class="post-card">
            <h2>{{ $post->title }}</h2>
            <p>{{ Str::limit($post->excerpt, 150) }}</p>
            <a href="{{ route('posts.show', $post) }}">Read more</a>
        </article>
    @endforeach
</div>

{{-- Forelse loop - handles empty collections gracefully --}}
<div class="comments-section">
    <h3>Comments</h3>

    @forelse($comments as $comment)
        <div class="comment">
            <strong>{{ $comment->author->name }}</strong>
            <p>{{ $comment->body }}</p>
            <small>{{ $comment->created_at->diffForHumans() }}</small>
        </div>
    @empty
        <p class="no-comments">No comments yet. Be the first to comment!</p>
    @endforelse
</div>

{{-- While loop --}}
@php
    $attempts = 0;
@endphp

@while($attempts < 3)
    <p>Attempt {{ $attempts + 1 }}</p>
    @php $attempts++; @endphp
@endwhile
```

### The Loop Variable

```php
{{-- resources/views/products/list.blade.php --}}

<table class="products-table">
    <thead>
        <tr>
            <th>#</th>
            <th>Product</th>
            <th>Price</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
        @foreach($products as $product)
            <tr class="{{ $loop->even ? 'bg-gray' : 'bg-white' }}">
                {{-- Current iteration (1-indexed) --}}
                <td>{{ $loop->iteration }}</td>

                <td>{{ $product->name }}</td>
                <td>${{ number_format($product->price, 2) }}</td>

                {{-- Add special styling for first and last items --}}
                <td>
                    @if($loop->first)
                        <span class="badge badge-new">Newest</span>
                    @elseif($loop->last)
                        <span class="badge badge-old">Oldest</span>
                    @else
                        <span class="badge">{{ $product->status }}</span>
                    @endif
                </td>
            </tr>
        @endforeach
    </tbody>
</table>

{{-- Available $loop properties: --}}
{{-- $loop->index      - Current iteration index (0-indexed) --}}
{{-- $loop->iteration  - Current iteration (1-indexed) --}}
{{-- $loop->remaining  - Iterations remaining --}}
{{-- $loop->count      - Total items in the array --}}
{{-- $loop->first      - Whether this is the first iteration --}}
{{-- $loop->last       - Whether this is the last iteration --}}
{{-- $loop->even       - Whether this is an even iteration --}}
{{-- $loop->odd        - Whether this is an odd iteration --}}
{{-- $loop->depth      - Nesting level of the current loop --}}
{{-- $loop->parent     - Parent loop variable when nested --}}
```

### Nested Loops

```php
{{-- resources/views/categories/index.blade.php --}}

@foreach($categories as $category)
    <div class="category-section">
        <h2>{{ $category->name }}</h2>

        <div class="products">
            @foreach($category->products as $product)
                <div class="product-card">
                    {{-- Access parent loop information --}}
                    <span class="category-badge">
                        Category {{ $loop->parent->iteration }} of {{ $loop->parent->count }}
                    </span>

                    <h3>{{ $product->name }}</h3>
                    <p>Product {{ $loop->iteration }} of {{ $loop->count }}</p>

                    {{-- Current nesting depth --}}
                    <small>Depth: {{ $loop->depth }}</small>
                </div>
            @endforeach
        </div>
    </div>
@endforeach
```

### Loop Control

```php
{{-- Skip certain iterations with @continue --}}
@foreach($users as $user)
    @continue($user->is_suspended)

    <div class="user-card">
        <h3>{{ $user->name }}</h3>
        <p>{{ $user->email }}</p>
    </div>
@endforeach

{{-- Stop the loop early with @break --}}
@foreach($posts as $post)
    <article>
        <h2>{{ $post->title }}</h2>
        <p>{{ $post->excerpt }}</p>
    </article>

    {{-- Only show first 5 featured posts --}}
    @break($loop->iteration >= 5)
@endforeach

{{-- Combining continue and break --}}
@foreach($items as $item)
    {{-- Skip items that are not published --}}
    @continue(!$item->is_published)

    {{-- Stop if we have shown 10 items --}}
    @break($loop->iteration > 10)

    <div class="item">{{ $item->name }}</div>
@endforeach
```

## Template Inheritance and Layouts

Blade's template inheritance system allows you to define a master layout that child views can extend. This promotes code reuse and maintains consistency across your application.

### Creating a Master Layout

```php
{{-- resources/views/layouts/app.blade.php --}}

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- Title with default fallback --}}
    <title>@yield('title', 'My Application')</title>

    {{-- Base styles that every page needs --}}
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">

    {{-- Allow child views to add additional styles --}}
    @stack('styles')
</head>
<body class="@yield('body-class', 'default-layout')">
    {{-- Include navigation partial --}}
    @include('layouts.partials.navigation')

    {{-- Main content wrapper --}}
    <main class="container">
        {{-- Flash messages --}}
        @include('layouts.partials.flash-messages')

        {{-- This is where child view content will be inserted --}}
        @yield('content')
    </main>

    {{-- Include footer partial --}}
    @include('layouts.partials.footer')

    {{-- Base scripts --}}
    <script src="{{ asset('js/app.js') }}"></script>

    {{-- Allow child views to add additional scripts --}}
    @stack('scripts')
</body>
</html>
```

### Extending Layouts

```php
{{-- resources/views/posts/show.blade.php --}}

{{-- Specify which layout to extend --}}
@extends('layouts.app')

{{-- Set the page title --}}
@section('title', $post->title . ' - My Blog')

{{-- Override the body class --}}
@section('body-class', 'post-page')

{{-- Add page-specific styles --}}
@push('styles')
    <link rel="stylesheet" href="{{ asset('css/posts.css') }}">
    <style>
        .post-content img {
            max-width: 100%;
            height: auto;
        }
    </style>
@endpush

{{-- Main content section --}}
@section('content')
    <article class="post">
        <header class="post-header">
            <h1>{{ $post->title }}</h1>
            <div class="post-meta">
                <span class="author">By {{ $post->author->name }}</span>
                <span class="date">{{ $post->published_at->format('F j, Y') }}</span>
                <span class="reading-time">{{ $post->reading_time }} min read</span>
            </div>
        </header>

        @if($post->featured_image)
            <figure class="featured-image">
                <img src="{{ $post->featured_image }}" alt="{{ $post->title }}">
            </figure>
        @endif

        <div class="post-content">
            {!! $post->content !!}
        </div>

        <footer class="post-footer">
            <div class="tags">
                @foreach($post->tags as $tag)
                    <a href="{{ route('tags.show', $tag) }}" class="tag">
                        {{ $tag->name }}
                    </a>
                @endforeach
            </div>

            <div class="share-buttons">
                @include('posts.partials.share-buttons')
            </div>
        </footer>
    </article>

    {{-- Related posts section --}}
    @include('posts.partials.related', ['posts' => $relatedPosts])

    {{-- Comments section --}}
    @include('posts.partials.comments', ['comments' => $post->comments])
@endsection

{{-- Add page-specific scripts --}}
@push('scripts')
    <script src="{{ asset('js/posts.js') }}"></script>
    <script>
        // Initialize syntax highlighting for code blocks
        document.addEventListener('DOMContentLoaded', function() {
            hljs.highlightAll();
        });
    </script>
@endpush
```

### Sections with Default Content

```php
{{-- resources/views/layouts/sidebar.blade.php --}}

@extends('layouts.app')

@section('content')
    <div class="two-column-layout">
        <div class="main-column">
            {{-- Child views must define this section --}}
            @yield('main-content')
        </div>

        <aside class="sidebar">
            {{-- Section with default content that can be overridden --}}
            @section('sidebar')
                <div class="widget">
                    <h3>Categories</h3>
                    @include('widgets.categories')
                </div>

                <div class="widget">
                    <h3>Recent Posts</h3>
                    @include('widgets.recent-posts')
                </div>
            @show
        </aside>
    </div>
@endsection

{{-- Child view that extends the sidebar layout --}}
{{-- resources/views/blog/index.blade.php --}}

@extends('layouts.sidebar')

@section('main-content')
    <h1>Blog Posts</h1>

    @foreach($posts as $post)
        <article class="post-summary">
            <h2>{{ $post->title }}</h2>
            <p>{{ $post->excerpt }}</p>
        </article>
    @endforeach

    {{ $posts->links() }}
@endsection

{{-- Override the sidebar with custom content --}}
@section('sidebar')
    {{-- Include parent sidebar content --}}
    @parent

    {{-- Add additional widgets --}}
    <div class="widget">
        <h3>Newsletter</h3>
        @include('widgets.newsletter-signup')
    </div>
@endsection
```

## Including Sub-Views

Blade's `@include` directive lets you embed one view inside another. This is perfect for reusable components like navigation, footers, and widgets.

### Basic Includes

```php
{{-- resources/views/layouts/partials/navigation.blade.php --}}

<nav class="main-nav">
    <div class="nav-brand">
        <a href="{{ route('home') }}">
            <img src="{{ asset('images/logo.png') }}" alt="Logo">
        </a>
    </div>

    <ul class="nav-menu">
        <li><a href="{{ route('home') }}" class="{{ request()->routeIs('home') ? 'active' : '' }}">Home</a></li>
        <li><a href="{{ route('about') }}" class="{{ request()->routeIs('about') ? 'active' : '' }}">About</a></li>
        <li><a href="{{ route('services') }}" class="{{ request()->routeIs('services*') ? 'active' : '' }}">Services</a></li>
        <li><a href="{{ route('contact') }}" class="{{ request()->routeIs('contact') ? 'active' : '' }}">Contact</a></li>
    </ul>

    <div class="nav-actions">
        @include('layouts.partials.auth-links')
    </div>
</nav>

{{-- Include the navigation in your layout --}}
{{-- resources/views/layouts/app.blade.php --}}

<body>
    @include('layouts.partials.navigation')

    {{-- Rest of layout... --}}
</body>
```

### Passing Data to Includes

```php
{{-- resources/views/components/alert.blade.php --}}

<div class="alert alert-{{ $type ?? 'info' }}" role="alert">
    @if(isset($title))
        <h4 class="alert-title">{{ $title }}</h4>
    @endif

    <p class="alert-message">{{ $message }}</p>

    @if($dismissible ?? false)
        <button type="button" class="alert-close" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    @endif
</div>

{{-- Using the alert component with different configurations --}}
{{-- resources/views/dashboard.blade.php --}}

{{-- Simple info alert --}}
@include('components.alert', ['message' => 'Welcome to your dashboard!'])

{{-- Success alert with title --}}
@include('components.alert', [
    'type' => 'success',
    'title' => 'Success!',
    'message' => 'Your profile has been updated.',
    'dismissible' => true,
])

{{-- Error alert --}}
@include('components.alert', [
    'type' => 'danger',
    'message' => 'An error occurred while processing your request.',
])
```

### Conditional Includes

```php
{{-- Include only if the view exists --}}
@includeIf('custom.header')

{{-- Include based on a condition --}}
@includeWhen($user->isAdmin(), 'admin.dashboard-widgets')

{{-- Include unless a condition is true --}}
@includeUnless($user->isGuest(), 'user.profile-sidebar')

{{-- Include first existing view from an array --}}
@includeFirst(['custom.navigation', 'layouts.partials.navigation'])
```

### Include Each

```php
{{-- resources/views/widgets/post-card.blade.php --}}

<article class="post-card">
    <img src="{{ $post->thumbnail }}" alt="{{ $post->title }}">
    <div class="post-card-body">
        <h3>{{ $post->title }}</h3>
        <p>{{ Str::limit($post->excerpt, 100) }}</p>
        <a href="{{ route('posts.show', $post) }}">Read More</a>
    </div>
</article>

{{-- Include the view for each item in a collection --}}
{{-- resources/views/posts/index.blade.php --}}

<div class="posts-grid">
    {{-- Third parameter is the variable name in the partial --}}
    {{-- Fourth parameter is the view to show if collection is empty --}}
    @each('widgets.post-card', $posts, 'post', 'posts.empty')
</div>

{{-- resources/views/posts/empty.blade.php --}}

<div class="empty-state">
    <img src="{{ asset('images/no-posts.svg') }}" alt="No posts">
    <h3>No posts found</h3>
    <p>Check back later for new content.</p>
</div>
```

## Blade Components

Components are reusable pieces of UI that encapsulate both markup and logic. Laravel offers two types: class-based components and anonymous components.

### Anonymous Components

Anonymous components are simple blade files that do not require a PHP class.

```php
{{-- resources/views/components/button.blade.php --}}

{{-- Define default values using @props --}}
@props([
    'type' => 'button',
    'variant' => 'primary',
    'size' => 'md',
    'disabled' => false,
])

{{--
    $attributes contains all attributes passed to the component
    that were not defined in @props
--}}
<button
    type="{{ $type }}"
    {{ $disabled ? 'disabled' : '' }}
    {{ $attributes->merge([
        'class' => "btn btn-{$variant} btn-{$size}"
    ]) }}
>
    {{ $slot }}
</button>

{{-- Using the button component --}}
{{-- resources/views/forms/contact.blade.php --}}

<form action="{{ route('contact.store') }}" method="POST">
    @csrf

    {{-- Default primary button --}}
    <x-button>Submit</x-button>

    {{-- Secondary button with custom attributes --}}
    <x-button variant="secondary" type="reset">
        Reset Form
    </x-button>

    {{-- Large danger button --}}
    <x-button variant="danger" size="lg" id="delete-btn">
        Delete Account
    </x-button>

    {{-- Disabled button --}}
    <x-button :disabled="$isProcessing">
        {{ $isProcessing ? 'Processing...' : 'Submit' }}
    </x-button>
</form>
```

### Components with Slots

```php
{{-- resources/views/components/card.blade.php --}}

@props([
    'title' => null,
    'footer' => null,
])

<div {{ $attributes->merge(['class' => 'card']) }}>
    @if($title)
        <div class="card-header">
            <h3 class="card-title">{{ $title }}</h3>

            {{-- Named slot for header actions --}}
            @if(isset($actions))
                <div class="card-actions">
                    {{ $actions }}
                </div>
            @endif
        </div>
    @endif

    <div class="card-body">
        {{-- Default slot for main content --}}
        {{ $slot }}
    </div>

    @if($footer || isset($footerSlot))
        <div class="card-footer">
            {{ $footer ?? $footerSlot }}
        </div>
    @endif
</div>

{{-- Using the card component with named slots --}}
{{-- resources/views/users/show.blade.php --}}

<x-card title="User Profile" class="profile-card">
    {{-- Named slot for header actions --}}
    <x-slot:actions>
        <a href="{{ route('users.edit', $user) }}" class="btn btn-sm">
            Edit Profile
        </a>
    </x-slot:actions>

    {{-- Default slot content --}}
    <div class="user-info">
        <img src="{{ $user->avatar }}" alt="{{ $user->name }}" class="avatar">
        <h4>{{ $user->name }}</h4>
        <p>{{ $user->email }}</p>
        <p>Member since {{ $user->created_at->format('F Y') }}</p>
    </div>

    {{-- Named slot for footer --}}
    <x-slot:footerSlot>
        <a href="{{ route('users.posts', $user) }}">
            View {{ $user->posts_count }} Posts
        </a>
    </x-slot:footerSlot>
</x-card>
```

### Class-Based Components

For components with complex logic, create a class-based component.

```bash
# Generate a component class and view
php artisan make:component Alert

# This creates:
# - app/View/Components/Alert.php
# - resources/views/components/alert.blade.php
```

```php
<?php

// app/View/Components/Alert.php

namespace App\View\Components;

use Illuminate\View\Component;

class Alert extends Component
{
    // Public properties are automatically available in the view
    public string $type;
    public string $message;
    public bool $dismissible;

    // Icon mapping based on alert type
    private array $icons = [
        'success' => 'check-circle',
        'danger' => 'exclamation-circle',
        'warning' => 'exclamation-triangle',
        'info' => 'info-circle',
    ];

    /**
     * Create a new component instance.
     */
    public function __construct(
        string $type = 'info',
        string $message = '',
        bool $dismissible = false
    ) {
        $this->type = $type;
        $this->message = $message;
        $this->dismissible = $dismissible;
    }

    /**
     * Get the icon for the current alert type.
     * Methods prefixed with nothing are also available in the view.
     */
    public function icon(): string
    {
        return $this->icons[$this->type] ?? 'info-circle';
    }

    /**
     * Determine if the alert should be rendered.
     */
    public function shouldRender(): bool
    {
        return !empty($this->message);
    }

    /**
     * Get the view that represents the component.
     */
    public function render()
    {
        return view('components.alert');
    }
}
```

```php
{{-- resources/views/components/alert.blade.php --}}

<div
    {{ $attributes->merge([
        'class' => "alert alert-{$type}",
        'role' => 'alert'
    ]) }}
    x-data="{ show: true }"
    x-show="show"
>
    <div class="alert-content">
        {{-- Call the icon() method from the component class --}}
        <i class="icon icon-{{ $icon() }}"></i>

        <span class="alert-message">{{ $message }}</span>
    </div>

    @if($dismissible)
        <button
            type="button"
            class="alert-close"
            @click="show = false"
            aria-label="Dismiss"
        >
            &times;
        </button>
    @endif
</div>

{{-- Using the class-based component --}}
<x-alert
    type="success"
    message="Your changes have been saved successfully!"
    :dismissible="true"
/>
```

### Component Attributes

```php
{{-- resources/views/components/input.blade.php --}}

@props([
    'name',
    'label' => null,
    'type' => 'text',
    'value' => '',
])

<div class="form-group">
    @if($label)
        <label for="{{ $name }}" class="form-label">{{ $label }}</label>
    @endif

    <input
        type="{{ $type }}"
        name="{{ $name }}"
        id="{{ $name }}"
        value="{{ old($name, $value) }}"
        {{-- Merge with any additional attributes passed to the component --}}
        {{ $attributes->merge(['class' => 'form-control']) }}
        {{-- Conditionally add error class --}}
        @class([
            'form-control',
            'is-invalid' => $errors->has($name)
        ])
    >

    @error($name)
        <span class="invalid-feedback">{{ $message }}</span>
    @enderror
</div>

{{-- Using the input component --}}
<x-input
    name="email"
    label="Email Address"
    type="email"
    placeholder="Enter your email"
    required
    autocomplete="email"
/>

{{-- The rendered HTML will have all attributes merged --}}
```

### Component Namespacing

```php
{{-- Organize components in subdirectories --}}

{{-- resources/views/components/forms/input.blade.php --}}
{{-- Use with: <x-forms.input /> --}}

{{-- resources/views/components/ui/modal.blade.php --}}
{{-- Use with: <x-ui.modal /> --}}

{{-- resources/views/components/dashboard/stats-card.blade.php --}}
{{-- Use with: <x-dashboard.stats-card /> --}}

{{-- Example organized component structure --}}
{{-- resources/views/dashboard/index.blade.php --}}

<div class="dashboard">
    <div class="stats-row">
        <x-dashboard.stats-card
            title="Total Users"
            :value="$totalUsers"
            icon="users"
        />

        <x-dashboard.stats-card
            title="Revenue"
            :value="'$' . number_format($revenue)"
            icon="dollar-sign"
            trend="up"
            :change="12.5"
        />

        <x-dashboard.stats-card
            title="Orders"
            :value="$orderCount"
            icon="shopping-cart"
        />
    </div>

    <x-ui.modal id="create-user-modal" title="Create New User">
        <x-forms.user-form :action="route('users.store')" />
    </x-ui.modal>
</div>
```

## Stacks

Stacks allow child views to push content to named stacks that are rendered elsewhere in the layout. This is perfect for page-specific CSS and JavaScript.

```php
{{-- resources/views/layouts/app.blade.php --}}

<head>
    {{-- Base styles --}}
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">

    {{-- Render any styles pushed by child views --}}
    @stack('styles')
</head>
<body>
    {{-- Content... --}}

    {{-- Base scripts --}}
    <script src="{{ asset('js/app.js') }}"></script>

    {{-- Render any scripts pushed by child views --}}
    @stack('scripts')
</body>

{{-- Child view pushing to stacks --}}
{{-- resources/views/pages/chart-dashboard.blade.php --}}

@extends('layouts.app')

{{-- Push styles to the head --}}
@push('styles')
    <link rel="stylesheet" href="{{ asset('css/charts.css') }}">
@endpush

@section('content')
    <div id="sales-chart"></div>
    <div id="users-chart"></div>
@endsection

{{-- Push scripts to the end of body --}}
@push('scripts')
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="{{ asset('js/charts.js') }}"></script>
@endpush

{{-- Prepend to ensure it loads first --}}
@prepend('scripts')
    <script>
        window.chartConfig = @json($chartConfig);
    </script>
@endprepend
```

## Custom Blade Directives

You can create your own Blade directives for common patterns in your application.

```php
<?php

// app/Providers/BladeServiceProvider.php

namespace App\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class BladeServiceProvider extends ServiceProvider
{
    public function boot()
    {
        // Simple directive that returns a string
        Blade::directive('datetime', function ($expression) {
            return "<?php echo ({$expression})->format('F j, Y g:i A'); ?>";
        });

        // Directive for formatting currency
        Blade::directive('money', function ($expression) {
            return "<?php echo '$' . number_format({$expression}, 2); ?>";
        });

        // Directive for checking user roles
        Blade::directive('role', function ($expression) {
            return "<?php if(auth()->check() && auth()->user()->hasRole({$expression})): ?>";
        });

        Blade::directive('endrole', function () {
            return "<?php endif; ?>";
        });

        // Directive for feature flags
        Blade::directive('feature', function ($expression) {
            return "<?php if(\\App\\Services\\FeatureFlag::isEnabled({$expression})): ?>";
        });

        Blade::directive('endfeature', function () {
            return "<?php endif; ?>";
        });

        // Directive for truncating text
        Blade::directive('truncate', function ($expression) {
            list($string, $length) = explode(',', $expression);
            return "<?php echo \\Illuminate\\Support\\Str::limit({$string}, {$length}); ?>";
        });
    }
}
```

```php
{{-- Using custom directives in your views --}}

{{-- Format a date --}}
<p>Published: @datetime($post->published_at)</p>

{{-- Format currency --}}
<p>Total: @money($order->total)</p>

{{-- Check user role --}}
@role('admin')
    <a href="{{ route('admin.dashboard') }}">Admin Panel</a>
@endrole

{{-- Feature flag --}}
@feature('new-checkout')
    <x-checkout.new-flow :cart="$cart" />
@else
    <x-checkout.legacy-flow :cart="$cart" />
@endfeature

{{-- Truncate text --}}
<p>@truncate($article->content, 200)</p>
```

## Form Method Spoofing and CSRF

Laravel provides helpers for handling forms securely.

```php
{{-- resources/views/posts/edit.blade.php --}}

{{-- Standard form with CSRF protection --}}
<form action="{{ route('posts.update', $post) }}" method="POST">
    {{-- CSRF token is required for all POST, PUT, PATCH, DELETE requests --}}
    @csrf

    {{-- Method spoofing for PUT request (HTML forms only support GET and POST) --}}
    @method('PUT')

    <div class="form-group">
        <label for="title">Title</label>
        <input type="text" name="title" id="title" value="{{ old('title', $post->title) }}">
    </div>

    <div class="form-group">
        <label for="content">Content</label>
        <textarea name="content" id="content">{{ old('content', $post->content) }}</textarea>
    </div>

    <button type="submit">Update Post</button>
</form>

{{-- Delete form with method spoofing --}}
<form action="{{ route('posts.destroy', $post) }}" method="POST">
    @csrf
    @method('DELETE')

    <button type="submit" onclick="return confirm('Are you sure?')">
        Delete Post
    </button>
</form>

{{-- Alternative: inline method token --}}
<form action="{{ route('posts.destroy', $post) }}" method="POST">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="_method" value="DELETE">

    <button type="submit">Delete</button>
</form>
```

## Best Practices for Blade Templates

### 1. Keep Logic Minimal

```php
{{-- BAD: Too much logic in the view --}}
@php
    $activeUsers = collect($users)->filter(function ($user) {
        return $user->is_active && $user->last_login_at > now()->subDays(30);
    })->sortBy('name');
@endphp

@foreach($activeUsers as $user)
    {{-- ... --}}
@endforeach

{{-- GOOD: Move logic to the controller or a view model --}}
{{-- Controller already provides $activeUsers --}}
@foreach($activeUsers as $user)
    {{-- ... --}}
@endforeach
```

### 2. Use Components for Reusability

```php
{{-- BAD: Repeating the same markup --}}
<div class="alert alert-success">
    <i class="icon-check"></i>
    <span>Success message here</span>
</div>

<div class="alert alert-danger">
    <i class="icon-error"></i>
    <span>Error message here</span>
</div>

{{-- GOOD: Use a component --}}
<x-alert type="success" message="Success message here" />
<x-alert type="danger" message="Error message here" />
```

### 3. Organize Views Logically

```
resources/views/
├── components/          # Reusable components
│   ├── forms/
│   │   ├── input.blade.php
│   │   └── select.blade.php
│   └── ui/
│       ├── alert.blade.php
│       └── modal.blade.php
├── layouts/             # Layout templates
│   ├── app.blade.php
│   └── partials/
│       ├── navigation.blade.php
│       └── footer.blade.php
├── pages/               # Static pages
│   ├── about.blade.php
│   └── contact.blade.php
└── posts/               # Resource-specific views
    ├── index.blade.php
    ├── show.blade.php
    ├── create.blade.php
    └── edit.blade.php
```

### 4. Use View Composers for Shared Data

```php
<?php

// app/Providers/ViewServiceProvider.php

namespace App\Providers;

use App\Models\Category;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class ViewServiceProvider extends ServiceProvider
{
    public function boot()
    {
        // Share data with specific views
        View::composer('layouts.partials.navigation', function ($view) {
            $view->with('categories', Category::active()->get());
        });

        // Share data with multiple views
        View::composer(['posts.*', 'pages.home'], function ($view) {
            $view->with('popularPosts', Post::popular()->take(5)->get());
        });

        // Share data with all views
        View::share('appName', config('app.name'));
    }
}
```

### 5. Cache Views in Production

```bash
# Compile all Blade templates ahead of time
php artisan view:cache

# Clear the view cache during deployment
php artisan view:clear
```

## Debugging Blade Templates

```php
{{-- Dump a variable and continue --}}
@dump($users)

{{-- Dump a variable and die (stop execution) --}}
@dd($user)

{{-- Dump multiple variables --}}
@dump($user, $posts, $comments)

{{-- Use PHP to inspect complex data --}}
@php
    logger('User data:', ['user' => $user->toArray()]);
@endphp

{{-- Check if a variable exists --}}
@isset($debugMode)
    <pre>{{ var_export($debugData, true) }}</pre>
@endisset
```

## Summary

Laravel Blade provides a powerful yet simple templating system that makes building dynamic views straightforward. Key takeaways:

| Feature | Use Case |
|---------|----------|
| **Directives** | Control structures like @if, @foreach, @auth |
| **Layouts** | Master templates with @extends and @section |
| **Components** | Reusable UI elements with props and slots |
| **Stacks** | Page-specific CSS and JS with @push |
| **Includes** | Embed partial views with @include |
| **Custom Directives** | Application-specific shortcuts |

Blade templates compile to plain PHP and are cached for performance, so you get the convenience of a templating engine without sacrificing speed.

---

**Ready to monitor your Laravel applications?** OneUptime provides comprehensive monitoring for your web applications, including uptime monitoring, performance tracking, and incident management. Keep your Laravel apps running smoothly with real-time alerts and detailed insights.

Get started with [OneUptime](https://oneuptime.com) today and ensure your applications stay reliable for your users.
