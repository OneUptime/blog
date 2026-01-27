# How to Build GraphQL APIs with Laravel Lighthouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Laravel, PHP, GraphQL, Lighthouse, API, Backend

Description: Learn how to build GraphQL APIs in Laravel using Lighthouse, including schema definition, resolvers, authentication, and N+1 query prevention.

---

> GraphQL provides a flexible query language that lets clients request exactly the data they need. Laravel Lighthouse makes implementing GraphQL in Laravel straightforward by leveraging Eloquent models and familiar Laravel conventions.

## What is Lighthouse?

Lighthouse is a Laravel package that integrates GraphQL into your application with minimal boilerplate. It uses a schema-first approach where you define your GraphQL schema, and Lighthouse automatically wires it to your Eloquent models, policies, and custom resolvers.

Key benefits:
- Schema-first development with automatic type generation
- Built-in directives for common operations
- Seamless Eloquent integration
- N+1 query prevention with batched loading
- Authentication and authorization out of the box

## Installation and Setup

### Install Lighthouse

```bash
# Install via Composer
composer require nuwave/lighthouse

# Publish the default schema
php artisan vendor:publish --tag=lighthouse-schema

# Publish config (optional)
php artisan vendor:publish --tag=lighthouse-config
```

### Configure the GraphQL Endpoint

Lighthouse registers a `/graphql` endpoint by default. You can customize this in `config/lighthouse.php`:

```php
<?php
// config/lighthouse.php

return [
    // The URI at which the GraphQL endpoint is available
    'route' => [
        'uri' => '/graphql',
        'middleware' => [
            // Add any middleware here
        ],
    ],

    // Path to your schema file
    'schema' => [
        'register' => base_path('graphql/schema.graphql'),
    ],

    // Namespaces for auto-discovery
    'namespaces' => [
        'models' => ['App\\Models'],
        'queries' => ['App\\GraphQL\\Queries'],
        'mutations' => ['App\\GraphQL\\Mutations'],
    ],
];
```

### Install GraphQL Playground (Development)

```bash
# Install the playground for testing queries
composer require mll-lab/laravel-graphql-playground --dev
```

Visit `/graphql-playground` in your browser to test queries interactively.

## Defining Your GraphQL Schema

Create your schema in `graphql/schema.graphql`:

```graphql
# graphql/schema.graphql

# Define the User type based on your Eloquent model
type User {
    id: ID!
    name: String!
    email: String!
    created_at: DateTime!
    posts: [Post!]! @hasMany
}

# Define the Post type
type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User! @belongsTo
    comments: [Comment!]! @hasMany
    created_at: DateTime!
    updated_at: DateTime!
}

type Comment {
    id: ID!
    body: String!
    user: User! @belongsTo
    post: Post! @belongsTo
    created_at: DateTime!
}

# Root query type - entry points for reading data
type Query {
    # Fetch a single user by ID
    user(id: ID! @eq): User @find

    # Fetch all users with pagination
    users: [User!]! @paginate(defaultCount: 10)

    # Fetch a single post
    post(id: ID! @eq): Post @find

    # Fetch all posts with filtering
    posts(
        published: Boolean @eq
        title: String @where(operator: "like")
    ): [Post!]! @paginate(defaultCount: 20)

    # Get the authenticated user
    me: User @auth
}

# Root mutation type - entry points for writing data
type Mutation {
    # Create a new post
    createPost(input: CreatePostInput! @spread): Post!
        @guard
        @create

    # Update an existing post
    updatePost(id: ID!, input: UpdatePostInput! @spread): Post
        @guard
        @update

    # Delete a post
    deletePost(id: ID! @eq): Post
        @guard
        @delete

    # Add a comment to a post
    createComment(input: CreateCommentInput! @spread): Comment!
        @guard
        @create
}

# Input types for mutations
input CreatePostInput {
    title: String! @rules(apply: ["required", "min:3", "max:255"])
    content: String! @rules(apply: ["required"])
    published: Boolean = false
}

input UpdatePostInput {
    title: String @rules(apply: ["min:3", "max:255"])
    content: String
    published: Boolean
}

input CreateCommentInput {
    post_id: ID!
    body: String! @rules(apply: ["required", "min:1"])
}
```

## Understanding Lighthouse Directives

Lighthouse provides powerful directives that eliminate boilerplate code.

### Eloquent Relationship Directives

```graphql
type User {
    # One-to-many relationship
    posts: [Post!]! @hasMany

    # One-to-one relationship
    profile: Profile @hasOne

    # Many-to-many relationship
    roles: [Role!]! @belongsToMany
}

type Post {
    # Inverse of hasMany
    author: User! @belongsTo

    # Polymorphic relationship
    comments: [Comment!]! @morphMany
}
```

### Query Directives

```graphql
type Query {
    # Find a single record by a unique field
    user(id: ID! @eq): User @find

    # Find the first matching record
    activeUser(active: Boolean! @eq): User @first

    # Get all records (use with caution)
    allUsers: [User!]! @all

    # Paginated results
    users: [User!]! @paginate(defaultCount: 15)

    # Cursor-based pagination (better for large datasets)
    posts: [Post!]! @paginate(type: CONNECTION)
}
```

### Argument Directives

```graphql
type Query {
    posts(
        # Exact match
        published: Boolean @eq

        # LIKE query (remember to add % in the value)
        title: String @where(operator: "like")

        # Greater than
        views: Int @where(operator: ">")

        # Scope from Eloquent model
        featured: Boolean @scope(name: "featured")

        # Order results
        orderBy: _ @orderBy(columns: ["created_at", "title"])
    ): [Post!]! @paginate
}
```

## Queries and Resolvers

### Using Built-in Directives

Most simple queries need no custom code:

```graphql
type Query {
    # Lighthouse handles this automatically
    post(id: ID! @eq): Post @find
}
```

### Custom Query Resolvers

For complex queries, create custom resolvers:

```php
<?php
// app/GraphQL/Queries/SearchPosts.php

namespace App\GraphQL\Queries;

use App\Models\Post;
use Illuminate\Database\Eloquent\Collection;

final class SearchPosts
{
    /**
     * Search posts by term across title and content.
     *
     * @param  null  $_
     * @param  array<string, mixed>  $args
     */
    public function __invoke($_, array $args): Collection
    {
        $term = $args['term'];

        return Post::query()
            ->where('published', true)
            ->where(function ($query) use ($term) {
                $query->where('title', 'like', "%{$term}%")
                    ->orWhere('content', 'like', "%{$term}%");
            })
            ->orderBy('created_at', 'desc')
            ->limit($args['limit'] ?? 10)
            ->get();
    }
}
```

Register in schema:

```graphql
type Query {
    searchPosts(term: String!, limit: Int): [Post!]!
}
```

Lighthouse auto-discovers the resolver by matching the query name to the class name.

## Mutations

### Simple CRUD with Directives

```graphql
type Mutation {
    # Create uses mass assignment - ensure $fillable is set on model
    createPost(input: CreatePostInput! @spread): Post! @create

    # Update finds by ID and updates
    updatePost(id: ID!, input: UpdatePostInput! @spread): Post @update

    # Upsert creates or updates based on ID
    upsertPost(id: ID, input: CreatePostInput! @spread): Post! @upsert

    # Delete removes the record
    deletePost(id: ID! @eq): Post @delete
}
```

### Custom Mutation Resolver

```php
<?php
// app/GraphQL/Mutations/CreatePost.php

namespace App\GraphQL\Mutations;

use App\Models\Post;
use Illuminate\Support\Facades\Auth;

final class CreatePost
{
    /**
     * Create a new post for the authenticated user.
     *
     * @param  null  $_
     * @param  array<string, mixed>  $args
     */
    public function __invoke($_, array $args): Post
    {
        $user = Auth::user();

        // Create the post with the authenticated user as author
        $post = new Post();
        $post->title = $args['title'];
        $post->content = $args['content'];
        $post->published = $args['published'] ?? false;
        $post->user_id = $user->id;
        $post->save();

        // Dispatch any events or jobs
        // event(new PostCreated($post));

        return $post;
    }
}
```

## Subscriptions

Lighthouse supports GraphQL subscriptions for real-time updates.

### Configure Broadcasting

```php
<?php
// config/lighthouse.php

'subscriptions' => [
    'storage' => 'redis',
    'broadcaster' => 'pusher',
],
```

### Define Subscriptions

```graphql
type Subscription {
    # Subscribe to new posts
    postCreated: Post!

    # Subscribe to updates on a specific post
    postUpdated(id: ID!): Post
}
```

### Subscription Class

```php
<?php
// app/GraphQL/Subscriptions/PostCreated.php

namespace App\GraphQL\Subscriptions;

use App\Models\Post;
use Illuminate\Http\Request;
use Nuwave\Lighthouse\Schema\Types\GraphQLSubscription;
use Nuwave\Lighthouse\Subscriptions\Subscriber;

final class PostCreated extends GraphQLSubscription
{
    /**
     * Check if subscriber is authorized.
     */
    public function authorize(Subscriber $subscriber, Request $request): bool
    {
        // Only authenticated users can subscribe
        return $subscriber->context->user() !== null;
    }

    /**
     * Filter which subscribers receive the update.
     */
    public function filter(Subscriber $subscriber, mixed $root): bool
    {
        // All authorized subscribers receive new posts
        return true;
    }
}
```

### Broadcasting Events

```php
<?php
// In your controller or service

use Nuwave\Lighthouse\Execution\Utils\Subscription;

// After creating a post
$post = Post::create($data);

// Broadcast to subscribers
Subscription::broadcast('postCreated', $post);
```

## Authentication and Authorization

### Protecting Queries and Mutations

```graphql
type Query {
    # Requires authentication
    me: User @guard

    # Requires specific guard
    adminDashboard: Dashboard @guard(with: ["admin"])
}

type Mutation {
    # Only authenticated users can create posts
    createPost(input: CreatePostInput! @spread): Post!
        @guard
        @create
}
```

### Policy-Based Authorization

```graphql
type Mutation {
    # Check Laravel policy before updating
    updatePost(id: ID!, input: UpdatePostInput! @spread): Post
        @guard
        @can(ability: "update", find: "id")
        @update

    # Check policy for deletion
    deletePost(id: ID! @eq): Post
        @guard
        @can(ability: "delete", find: "id")
        @delete
}
```

The corresponding Laravel policy:

```php
<?php
// app/Policies/PostPolicy.php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    /**
     * Determine if the user can update the post.
     */
    public function update(User $user, Post $post): bool
    {
        // Users can only update their own posts
        return $user->id === $post->user_id;
    }

    /**
     * Determine if the user can delete the post.
     */
    public function delete(User $user, Post $post): bool
    {
        // Users can delete their own posts, admins can delete any
        return $user->id === $post->user_id || $user->isAdmin();
    }
}
```

### Field-Level Authorization

```graphql
type User {
    id: ID!
    name: String!
    email: String! @canAccess(ability: "viewEmail")
    # Only visible to admins
    internal_notes: String @can(ability: "viewInternalNotes")
}
```

## Pagination and Filtering

### Pagination Types

```graphql
type Query {
    # Offset-based pagination (simple, good for small datasets)
    posts: [Post!]! @paginate(defaultCount: 20, maxCount: 100)

    # Cursor-based pagination (efficient for large datasets)
    allPosts: [Post!]! @paginate(type: CONNECTION, defaultCount: 20)

    # Simple pagination with page info
    userPosts: [Post!]! @paginate(type: SIMPLE)
}
```

Query with pagination:

```graphql
query GetPosts($page: Int, $first: Int) {
    posts(first: $first, page: $page) {
        data {
            id
            title
        }
        paginatorInfo {
            currentPage
            lastPage
            total
            hasMorePages
        }
    }
}
```

### Advanced Filtering

```graphql
type Query {
    posts(
        # Multiple conditions
        where: PostWhereInput @whereConditions

        # Order by multiple columns
        orderBy: _ @orderBy(columns: ["created_at", "title", "views"])

        # Search across fields
        search: String @search
    ): [Post!]! @paginate
}

# Auto-generated input for whereConditions
input PostWhereInput {
    column: PostColumn!
    operator: SQLOperator!
    value: Mixed
    AND: [PostWhereInput!]
    OR: [PostWhereInput!]
}
```

Example query:

```graphql
query FilteredPosts {
    posts(
        where: {
            AND: [
                { column: PUBLISHED, operator: EQ, value: true }
                { column: VIEWS, operator: GTE, value: 100 }
            ]
        }
        orderBy: [{ column: CREATED_AT, order: DESC }]
        first: 10
    ) {
        data {
            id
            title
            views
        }
    }
}
```

## Solving N+1 Queries with @batch

N+1 queries are a common performance problem. Lighthouse provides the `@batch` directive to batch load relationships.

### The Problem

```graphql
# This query can cause N+1 issues
query {
    posts {
        id
        title
        author {  # Each post triggers a separate query
            name
        }
    }
}
```

### Solution: Batch Loading

```graphql
type Post {
    id: ID!
    title: String!
    # Batch load authors for all posts in one query
    author: User! @belongsTo @batch
}
```

### Custom Batch Loader

```php
<?php
// app/GraphQL/DataLoaders/PostAuthorLoader.php

namespace App\GraphQL\DataLoaders;

use App\Models\User;
use Illuminate\Support\Collection;

final class PostAuthorLoader
{
    /**
     * Load authors for multiple posts in a single query.
     *
     * @param  Collection<int, int>  $userIds
     * @return Collection<int, User>
     */
    public function __invoke(Collection $userIds): Collection
    {
        return User::whereIn('id', $userIds)
            ->get()
            ->keyBy('id');
    }
}
```

### Eager Loading with @with

```graphql
type Query {
    # Eager load relationships to prevent N+1
    posts: [Post!]! @paginate @with(relation: "author")

    # Multiple relationships
    postsWithComments: [Post!]!
        @paginate
        @with(relation: "author")
        @with(relation: "comments.user")
}
```

## Custom Resolvers and Middleware

### Field Resolver

```php
<?php
// app/GraphQL/Fields/PostExcerpt.php

namespace App\GraphQL\Fields;

use App\Models\Post;

final class PostExcerpt
{
    /**
     * Generate excerpt from post content.
     */
    public function __invoke(Post $post, array $args): string
    {
        $length = $args['length'] ?? 150;

        return \Str::limit(strip_tags($post->content), $length);
    }
}
```

```graphql
type Post {
    id: ID!
    title: String!
    content: String!
    excerpt(length: Int): String! @field(resolver: "App\\GraphQL\\Fields\\PostExcerpt")
}
```

### GraphQL Middleware

```php
<?php
// app/GraphQL/Middleware/LogQuery.php

namespace App\GraphQL\Middleware;

use Closure;
use GraphQL\Language\AST\FieldNode;
use Illuminate\Support\Facades\Log;
use Nuwave\Lighthouse\Schema\Directives\BaseDirective;
use Nuwave\Lighthouse\Schema\Values\FieldValue;
use Nuwave\Lighthouse\Support\Contracts\FieldMiddleware;

final class LogQueryDirective extends BaseDirective implements FieldMiddleware
{
    public static function definition(): string
    {
        return /** @lang GraphQL */ <<<'GRAPHQL'
directive @logQuery on FIELD_DEFINITION
GRAPHQL;
    }

    public function handleField(FieldValue $fieldValue): void
    {
        $fieldValue->wrapResolver(fn (callable $resolver) => function ($root, array $args, $context, $info) use ($resolver) {
            $start = microtime(true);

            $result = $resolver($root, $args, $context, $info);

            $duration = round((microtime(true) - $start) * 1000, 2);

            Log::info('GraphQL Query', [
                'field' => $info->fieldName,
                'duration_ms' => $duration,
                'args' => $args,
            ]);

            return $result;
        });
    }
}
```

Register and use:

```graphql
type Query {
    posts: [Post!]! @paginate @logQuery
}
```

## Testing GraphQL APIs

### PHPUnit Tests

```php
<?php
// tests/Feature/GraphQL/PostTest.php

namespace Tests\Feature\GraphQL;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Nuwave\Lighthouse\Testing\MakesGraphQLRequests;
use Tests\TestCase;

class PostTest extends TestCase
{
    use RefreshDatabase;
    use MakesGraphQLRequests;

    public function test_can_query_posts(): void
    {
        // Arrange: Create test data
        $posts = Post::factory()->count(3)->create(['published' => true]);

        // Act: Execute GraphQL query
        $response = $this->graphQL(/** @lang GraphQL */ '
            query {
                posts(first: 10) {
                    data {
                        id
                        title
                    }
                    paginatorInfo {
                        total
                    }
                }
            }
        ');

        // Assert: Check response
        $response->assertJson([
            'data' => [
                'posts' => [
                    'paginatorInfo' => [
                        'total' => 3,
                    ],
                ],
            ],
        ]);
    }

    public function test_can_create_post_when_authenticated(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->graphQL(/** @lang GraphQL */ '
            mutation CreatePost($input: CreatePostInput!) {
                createPost(input: $input) {
                    id
                    title
                    content
                }
            }
        ', [
            'input' => [
                'title' => 'Test Post',
                'content' => 'This is test content.',
                'published' => true,
            ],
        ]);

        $response->assertJson([
            'data' => [
                'createPost' => [
                    'title' => 'Test Post',
                    'content' => 'This is test content.',
                ],
            ],
        ]);

        $this->assertDatabaseHas('posts', [
            'title' => 'Test Post',
            'user_id' => $user->id,
        ]);
    }

    public function test_cannot_create_post_when_unauthenticated(): void
    {
        $response = $this->graphQL(/** @lang GraphQL */ '
            mutation CreatePost($input: CreatePostInput!) {
                createPost(input: $input) {
                    id
                }
            }
        ', [
            'input' => [
                'title' => 'Test Post',
                'content' => 'Content',
            ],
        ]);

        $response->assertGraphQLErrorMessage('Unauthenticated.');
    }

    public function test_user_cannot_update_others_post(): void
    {
        $author = User::factory()->create();
        $otherUser = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $author->id]);

        $response = $this->actingAs($otherUser)->graphQL(/** @lang GraphQL */ '
            mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
                updatePost(id: $id, input: $input) {
                    id
                    title
                }
            }
        ', [
            'id' => $post->id,
            'input' => [
                'title' => 'Hacked Title',
            ],
        ]);

        $response->assertGraphQLErrorMessage('This action is unauthorized.');
    }
}
```

### Testing with Variables

```php
public function test_can_filter_posts_by_status(): void
{
    Post::factory()->create(['published' => true, 'title' => 'Published']);
    Post::factory()->create(['published' => false, 'title' => 'Draft']);

    $response = $this->graphQL(/** @lang GraphQL */ '
        query Posts($published: Boolean) {
            posts(published: $published, first: 10) {
                data {
                    title
                    published
                }
            }
        }
    ', [
        'published' => true,
    ]);

    $response->assertJsonCount(1, 'data.posts.data');
    $response->assertJson([
        'data' => [
            'posts' => [
                'data' => [
                    ['title' => 'Published', 'published' => true],
                ],
            ],
        ],
    ]);
}
```

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Schema-first** | Define your schema, let Lighthouse wire it up |
| **Use directives** | Leverage `@paginate`, `@guard`, `@can` to reduce boilerplate |
| **Batch relationships** | Use `@batch` and `@with` to prevent N+1 queries |
| **Validate inputs** | Use `@rules` directive for validation |
| **Test thoroughly** | Use `MakesGraphQLRequests` trait for feature tests |
| **Policy authorization** | Use `@can` with Laravel policies for granular access control |
| **Paginate by default** | Always paginate list queries to prevent large result sets |
| **Custom resolvers** | Create resolvers only when directives are insufficient |

Lighthouse simplifies GraphQL development in Laravel while maintaining the flexibility to handle complex use cases. By combining schema directives with Eloquent relationships, you can build powerful APIs with minimal custom code.

For monitoring your GraphQL APIs in production, [OneUptime](https://oneuptime.com) provides observability tools to track performance, errors, and availability of your Laravel applications.
