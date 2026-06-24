# How to Build a REST API with MongoDB and Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Laravel, PHP, REST API, Database

Description: Build a fully functional REST API using Laravel and MongoDB with the official jenssegers/laravel-mongodb package for seamless integration.

---

## Why Laravel with MongoDB

Laravel is the most popular PHP framework, and while it defaults to relational databases, the `mongodb/laravel-mongodb` package brings full Eloquent support to MongoDB. This lets you use familiar Laravel conventions like models, controllers, and resource routes with a NoSQL backend.

## Installation

```bash
composer create-project laravel/laravel mongodb-api
cd mongodb-api
composer require mongodb/laravel-mongodb
```

Add the MongoDB service provider in `config/app.php`:

```php
'providers' => [
    // ...
    MongoDB\Laravel\MongoDBServiceProvider::class,
],
```

## Database Configuration

Update `.env`:

```bash
DB_CONNECTION=mongodb
DB_HOST=127.0.0.1
DB_PORT=27017
DB_DATABASE=laravel_api
```

Update `config/database.php` to add the MongoDB connection:

```php
'mongodb' => [
    'driver'   => 'mongodb',
    'host'     => env('DB_HOST', '127.0.0.1'),
    'port'     => env('DB_PORT', 27017),
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
    'options'  => [],
],
```

## Creating the Model

```php
<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Article extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'articles';

    protected $fillable = ['title', 'body', 'author', 'tags', 'published_at'];

    protected $casts = [
        'tags' => 'array',
        'published_at' => 'datetime',
    ];
}
```

## Building the API Controller

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function index()
    {
        $articles = Article::orderBy('created_at', 'desc')->paginate(10);
        return response()->json($articles);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'  => 'required|string|max:255',
            'body'   => 'required|string',
            'author' => 'required|string',
            'tags'   => 'array',
        ]);

        $article = Article::create($validated);
        return response()->json($article, 201);
    }

    public function show(string $id)
    {
        $article = Article::findOrFail($id);
        return response()->json($article);
    }

    public function update(Request $request, string $id)
    {
        $article = Article::findOrFail($id);
        $article->update($request->only(['title', 'body', 'tags']));
        return response()->json($article);
    }

    public function destroy(string $id)
    {
        Article::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
```

## Defining API Routes

In `routes/api.php`:

```php
use App\Http\Controllers\Api\ArticleController;
use Illuminate\Support\Facades\Route;

Route::apiResource('articles', ArticleController::class);
```

## Testing Endpoints

```bash
# Create an article
curl -X POST http://localhost:8000/api/articles \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"title":"First Post","body":"Hello World","author":"Jane","tags":["php","mongodb"]}'

# List articles
curl http://localhost:8000/api/articles

# Get one article
curl http://localhost:8000/api/articles/<id>

# Update article
curl -X PUT http://localhost:8000/api/articles/<id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"title":"Updated Title"}'

# Delete article
curl -X DELETE http://localhost:8000/api/articles/<id>
```

## Adding Query Filtering

Extend the index method to support filtering by tags or author:

```php
public function index(Request $request)
{
    $query = Article::query();

    if ($request->has('author')) {
        $query->where('author', $request->author);
    }

    if ($request->has('tag')) {
        $query->where('tags', $request->tag);
    }

    return response()->json($query->paginate(10));
}
```

## Summary

Laravel and MongoDB work together seamlessly via the `mongodb/laravel-mongodb` package, which provides full Eloquent model support. This lets you build RESTful APIs using familiar Laravel patterns like resource controllers and route model binding. Adding API authentication with Laravel Sanctum and index creation on filtered fields will complete a production-ready setup.
