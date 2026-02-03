# How to Use Diesel ORM in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Diesel, ORM, PostgreSQL, Database, Backend

Description: Learn how to use Diesel ORM for type-safe database operations in Rust. This guide covers schema definition, migrations, queries, and best practices.

---

Diesel is the most mature and widely-used ORM for Rust. It provides compile-time guarantees for your database queries, which means if your code compiles, your queries are valid. No more runtime SQL errors in production. This guide walks through everything you need to build production-ready database applications with Diesel.

## Why Diesel?

Before diving into code, here is why Diesel stands out:

- **Compile-time query validation** - The Rust compiler catches SQL errors before your code runs
- **Type safety** - Database types map directly to Rust types with no runtime casting
- **Zero-cost abstractions** - Generated SQL is as efficient as hand-written queries
- **Migration system** - Built-in CLI for managing database schema changes
- **Connection pooling support** - Works seamlessly with r2d2 and deadpool

## Installation and Setup

### Adding Dependencies

Start by adding Diesel and its dependencies to your `Cargo.toml`:

```toml
[dependencies]
# Diesel with PostgreSQL support - change to "mysql" or "sqlite" for other databases
diesel = { version = "2.1", features = ["postgres", "r2d2", "chrono", "uuid"] }

# Connection pooling for production use
r2d2 = "0.8"

# Environment variable management
dotenvy = "0.15"

# Common types that work well with Diesel
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
serde = { version = "1.0", features = ["derive"] }
```

### Installing the Diesel CLI

The Diesel CLI is essential for managing migrations and generating schema files:

```bash
# Install with PostgreSQL support
cargo install diesel_cli --no-default-features --features postgres

# For MySQL
cargo install diesel_cli --no-default-features --features mysql

# For SQLite
cargo install diesel_cli --no-default-features --features sqlite

# For all databases
cargo install diesel_cli
```

### Project Setup

Create a `.env` file with your database connection string:

```bash
# .env
DATABASE_URL=postgres://username:password@localhost:5432/myapp_development
```

Now initialize Diesel in your project:

```bash
# This creates the diesel.toml config and migrations directory
diesel setup
```

The `diesel setup` command creates your database if it does not exist and sets up the migrations infrastructure.

## Understanding the Diesel CLI

The Diesel CLI is your primary tool for database management. Here are the commands you will use most often:

```bash
# Create a new migration
diesel migration generate create_users

# Run all pending migrations
diesel migration run

# Revert the last migration
diesel migration revert

# Revert all migrations
diesel migration revert --all

# Check if migrations are in sync
diesel migration pending

# Print the current schema
diesel print-schema

# Regenerate src/schema.rs from database
diesel print-schema > src/schema.rs
```

## Creating Migrations

Migrations are the foundation of database schema management. Let us create a complete example with users, posts, and comments.

### Users Table Migration

```bash
diesel migration generate create_users
```

This creates two files in `migrations/TIMESTAMP_create_users/`:

```sql
-- migrations/TIMESTAMP_create_users/up.sql
-- Creates the users table with common fields

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    bio TEXT,
    avatar_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups during authentication
CREATE INDEX idx_users_email ON users(email);

-- Index for username searches
CREATE INDEX idx_users_username ON users(username);

-- Trigger to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

```sql
-- migrations/TIMESTAMP_create_users/down.sql
-- Reverts the users table creation

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS users;
```

### Posts Table Migration

```bash
diesel migration generate create_posts
```

```sql
-- migrations/TIMESTAMP_create_posts/up.sql
-- Creates the posts table with foreign key to users

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by user
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Index for published posts sorted by date
CREATE INDEX idx_posts_published ON posts(published, published_at DESC);

-- Index for slug lookups
CREATE INDEX idx_posts_slug ON posts(slug);

-- Reuse the update trigger function
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

```sql
-- migrations/TIMESTAMP_create_posts/down.sql
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
DROP TABLE IF EXISTS posts;
```

### Comments Table Migration

```bash
diesel migration generate create_comments
```

```sql
-- migrations/TIMESTAMP_create_comments/up.sql
-- Creates the comments table with self-referential foreign key for nested comments

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_edited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for fetching comments by post
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- Index for fetching comments by user
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Index for nested comments
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

```sql
-- migrations/TIMESTAMP_create_comments/down.sql
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TABLE IF EXISTS comments;
```

### Running Migrations

Apply all migrations:

```bash
diesel migration run
```

After running migrations, Diesel automatically updates `src/schema.rs`:

```rust
// src/schema.rs
// This file is auto-generated by Diesel CLI

diesel::table! {
    users (id) {
        id -> Uuid,
        email -> Varchar,
        username -> Varchar,
        password_hash -> Varchar,
        display_name -> Nullable<Varchar>,
        bio -> Nullable<Text>,
        avatar_url -> Nullable<Varchar>,
        is_active -> Bool,
        is_admin -> Bool,
        email_verified_at -> Nullable<Timestamp>,
        last_login_at -> Nullable<Timestamp>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    posts (id) {
        id -> Uuid,
        user_id -> Uuid,
        title -> Varchar,
        slug -> Varchar,
        content -> Text,
        excerpt -> Nullable<Text>,
        published -> Bool,
        published_at -> Nullable<Timestamp>,
        view_count -> Int4,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    comments (id) {
        id -> Uuid,
        post_id -> Uuid,
        user_id -> Uuid,
        parent_id -> Nullable<Uuid>,
        content -> Text,
        is_edited -> Bool,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

// Define relationships between tables
diesel::joinable!(posts -> users (user_id));
diesel::joinable!(comments -> posts (post_id));
diesel::joinable!(comments -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    users,
    posts,
    comments,
);
```

## Defining Models

Models are Rust structs that map to database tables. Diesel uses different structs for different operations.

### User Models

```rust
// src/models/user.rs

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::schema::users;

// Queryable - for SELECT operations
// Maps database rows to this struct
#[derive(Debug, Clone, Queryable, Selectable, Serialize)]
#[diesel(table_name = users)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    #[serde(skip_serializing)] // Never expose password hash in API responses
    pub password_hash: String,
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: bool,
    pub is_admin: bool,
    pub email_verified_at: Option<NaiveDateTime>,
    pub last_login_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

// Insertable - for INSERT operations
// Only includes fields that can be set during creation
#[derive(Debug, Insertable, Deserialize)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub email: String,
    pub username: String,
    pub password_hash: String,
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
}

// AsChangeset - for UPDATE operations
// All fields are optional to allow partial updates
#[derive(Debug, AsChangeset, Deserialize)]
#[diesel(table_name = users)]
pub struct UpdateUser {
    pub email: Option<String>,
    pub username: Option<String>,
    pub password_hash: Option<String>,
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: Option<bool>,
    pub is_admin: Option<bool>,
    pub email_verified_at: Option<NaiveDateTime>,
    pub last_login_at: Option<NaiveDateTime>,
}

// A lighter version for listings that excludes sensitive data
#[derive(Debug, Queryable, Selectable, Serialize)]
#[diesel(table_name = users)]
pub struct UserSummary {
    pub id: Uuid,
    pub username: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}
```

### Post Models

```rust
// src/models/post.rs

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::schema::posts;

#[derive(Debug, Clone, Queryable, Selectable, Serialize, Identifiable)]
#[diesel(table_name = posts)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Post {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub published: bool,
    pub published_at: Option<NaiveDateTime>,
    pub view_count: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable, Deserialize)]
#[diesel(table_name = posts)]
pub struct NewPost {
    pub user_id: Uuid,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub published: Option<bool>,
    pub published_at: Option<NaiveDateTime>,
}

#[derive(Debug, AsChangeset, Deserialize)]
#[diesel(table_name = posts)]
pub struct UpdatePost {
    pub title: Option<String>,
    pub slug: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<String>,
    pub published: Option<bool>,
    pub published_at: Option<NaiveDateTime>,
}

// For listings with author info
#[derive(Debug, Queryable, Serialize)]
pub struct PostWithAuthor {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub excerpt: Option<String>,
    pub published_at: Option<NaiveDateTime>,
    pub view_count: i32,
    pub author_username: String,
    pub author_display_name: Option<String>,
}
```

### Comment Models

```rust
// src/models/comment.rs

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::schema::comments;

#[derive(Debug, Clone, Queryable, Selectable, Serialize, Identifiable, Associations)]
#[diesel(table_name = comments)]
#[diesel(belongs_to(crate::models::post::Post))]
#[diesel(belongs_to(crate::models::user::User))]
pub struct Comment {
    pub id: Uuid,
    pub post_id: Uuid,
    pub user_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub content: String,
    pub is_edited: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable, Deserialize)]
#[diesel(table_name = comments)]
pub struct NewComment {
    pub post_id: Uuid,
    pub user_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub content: String,
}

#[derive(Debug, AsChangeset, Deserialize)]
#[diesel(table_name = comments)]
pub struct UpdateComment {
    pub content: Option<String>,
    pub is_edited: Option<bool>,
}
```

## Database Connection Management

### Setting Up Connection Pooling

For production applications, always use connection pooling:

```rust
// src/db.rs

use diesel::pg::PgConnection;
use diesel::r2d2::{self, ConnectionManager, Pool, PooledConnection};
use dotenvy::dotenv;
use std::env;

// Type alias for cleaner code
pub type DbPool = Pool<ConnectionManager<PgConnection>>;
pub type DbConnection = PooledConnection<ConnectionManager<PgConnection>>;

// Custom error type for database operations
#[derive(Debug)]
pub enum DbError {
    ConnectionError(r2d2::Error),
    QueryError(diesel::result::Error),
    NotFound,
}

impl From<r2d2::Error> for DbError {
    fn from(err: r2d2::Error) -> Self {
        DbError::ConnectionError(err)
    }
}

impl From<diesel::result::Error> for DbError {
    fn from(err: diesel::result::Error) -> Self {
        match err {
            diesel::result::Error::NotFound => DbError::NotFound,
            _ => DbError::QueryError(err),
        }
    }
}

// Initialize the connection pool
pub fn init_pool() -> DbPool {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in environment");

    let manager = ConnectionManager::<PgConnection>::new(database_url);

    Pool::builder()
        .max_size(10)           // Maximum connections in the pool
        .min_idle(Some(2))      // Minimum idle connections to maintain
        .connection_timeout(std::time::Duration::from_secs(5))
        .idle_timeout(Some(std::time::Duration::from_secs(300)))
        .build(manager)
        .expect("Failed to create database connection pool")
}

// Helper to get a connection from the pool
pub fn get_connection(pool: &DbPool) -> Result<DbConnection, DbError> {
    pool.get().map_err(DbError::from)
}
```

### Using the Pool in Your Application

```rust
// src/main.rs

mod db;
mod models;
mod schema;

use db::{init_pool, DbPool};

fn main() {
    // Initialize the pool once at startup
    let pool: DbPool = init_pool();

    // Pass the pool to your web framework, workers, etc.
    // Example with Actix-web:
    // HttpServer::new(move || {
    //     App::new()
    //         .app_data(web::Data::new(pool.clone()))
    //         .configure(routes::configure)
    // })

    println!("Database pool initialized with {} connections", pool.max_size());
}
```

## CRUD Operations

Now let us implement complete CRUD operations for our models.

### User Repository

```rust
// src/repositories/user_repository.rs

use diesel::prelude::*;
use uuid::Uuid;

use crate::db::{DbConnection, DbError};
use crate::models::user::{NewUser, UpdateUser, User, UserSummary};
use crate::schema::users;

pub struct UserRepository;

impl UserRepository {
    // Create a new user and return the created record
    pub fn create(conn: &mut DbConnection, new_user: NewUser) -> Result<User, DbError> {
        diesel::insert_into(users::table)
            .values(&new_user)
            .returning(User::as_returning())
            .get_result(conn)
            .map_err(DbError::from)
    }

    // Find a user by ID
    pub fn find_by_id(conn: &mut DbConnection, user_id: Uuid) -> Result<User, DbError> {
        users::table
            .find(user_id)
            .select(User::as_select())
            .first(conn)
            .map_err(DbError::from)
    }

    // Find a user by email - useful for authentication
    pub fn find_by_email(conn: &mut DbConnection, email: &str) -> Result<User, DbError> {
        users::table
            .filter(users::email.eq(email))
            .select(User::as_select())
            .first(conn)
            .map_err(DbError::from)
    }

    // Find a user by username
    pub fn find_by_username(conn: &mut DbConnection, username: &str) -> Result<User, DbError> {
        users::table
            .filter(users::username.eq(username))
            .select(User::as_select())
            .first(conn)
            .map_err(DbError::from)
    }

    // Get all active users with pagination
    pub fn list_active(
        conn: &mut DbConnection,
        page: i64,
        per_page: i64,
    ) -> Result<Vec<UserSummary>, DbError> {
        users::table
            .filter(users::is_active.eq(true))
            .order(users::created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .select(UserSummary::as_select())
            .load(conn)
            .map_err(DbError::from)
    }

    // Count total active users for pagination metadata
    pub fn count_active(conn: &mut DbConnection) -> Result<i64, DbError> {
        users::table
            .filter(users::is_active.eq(true))
            .count()
            .get_result(conn)
            .map_err(DbError::from)
    }

    // Update a user
    pub fn update(
        conn: &mut DbConnection,
        user_id: Uuid,
        updates: UpdateUser,
    ) -> Result<User, DbError> {
        diesel::update(users::table.find(user_id))
            .set(&updates)
            .returning(User::as_returning())
            .get_result(conn)
            .map_err(DbError::from)
    }

    // Soft delete - set is_active to false instead of removing
    pub fn deactivate(conn: &mut DbConnection, user_id: Uuid) -> Result<User, DbError> {
        diesel::update(users::table.find(user_id))
            .set(users::is_active.eq(false))
            .returning(User::as_returning())
            .get_result(conn)
            .map_err(DbError::from)
    }

    // Hard delete - actually remove the record
    pub fn delete(conn: &mut DbConnection, user_id: Uuid) -> Result<usize, DbError> {
        diesel::delete(users::table.find(user_id))
            .execute(conn)
            .map_err(DbError::from)
    }

    // Check if email is already taken
    pub fn email_exists(conn: &mut DbConnection, email: &str) -> Result<bool, DbError> {
        use diesel::dsl::exists;

        diesel::select(exists(users::table.filter(users::email.eq(email))))
            .get_result(conn)
            .map_err(DbError::from)
    }

    // Search users by username or display name
    pub fn search(
        conn: &mut DbConnection,
        query: &str,
        limit: i64,
    ) -> Result<Vec<UserSummary>, DbError> {
        let pattern = format!("%{}%", query.to_lowercase());

        users::table
            .filter(users::is_active.eq(true))
            .filter(
                users::username.ilike(&pattern)
                    .or(users::display_name.ilike(&pattern))
            )
            .order(users::username.asc())
            .limit(limit)
            .select(UserSummary::as_select())
            .load(conn)
            .map_err(DbError::from)
    }

    // Update last login timestamp
    pub fn update_last_login(conn: &mut DbConnection, user_id: Uuid) -> Result<(), DbError> {
        use chrono::Utc;

        diesel::update(users::table.find(user_id))
            .set(users::last_login_at.eq(Utc::now().naive_utc()))
            .execute(conn)
            .map(|_| ())
            .map_err(DbError::from)
    }
}
```

### Post Repository

```rust
// src/repositories/post_repository.rs

use diesel::prelude::*;
use uuid::Uuid;

use crate::db::{DbConnection, DbError};
use crate::models::post::{NewPost, Post, PostWithAuthor, UpdatePost};
use crate::schema::{posts, users};

pub struct PostRepository;

impl PostRepository {
    // Create a new post
    pub fn create(conn: &mut DbConnection, new_post: NewPost) -> Result<Post, DbError> {
        diesel::insert_into(posts::table)
            .values(&new_post)
            .returning(Post::as_returning())
            .get_result(conn)
            .map_err(DbError::from)
    }

    // Find post by ID
    pub fn find_by_id(conn: &mut DbConnection, post_id: Uuid) -> Result<Post, DbError> {
        posts::table
            .find(post_id)
            .select(Post::as_select())
            .first(conn)
            .map_err(DbError::from)
    }

    // Find post by slug
    pub fn find_by_slug(conn: &mut DbConnection, slug: &str) -> Result<Post, DbError> {
        posts::table
            .filter(posts::slug.eq(slug))
            .select(Post::as_select())
            .first(conn)
            .map_err(DbError::from)
    }

    // Get published posts with author information
    pub fn list_published(
        conn: &mut DbConnection,
        page: i64,
        per_page: i64,
    ) -> Result<Vec<PostWithAuthor>, DbError> {
        posts::table
            .inner_join(users::table)
            .filter(posts::published.eq(true))
            .order(posts::published_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .select((
                posts::id,
                posts::title,
                posts::slug,
                posts::excerpt,
                posts::published_at,
                posts::view_count,
                users::username,
                users::display_name,
            ))
            .load::<PostWithAuthor>(conn)
            .map_err(DbError::from)
    }

    // Get all posts by a specific user
    pub fn find_by_user(
        conn: &mut DbConnection,
        user_id: Uuid,
        include_drafts: bool,
    ) -> Result<Vec<Post>, DbError> {
        let mut query = posts::table
            .filter(posts::user_id.eq(user_id))
            .into_boxed();

        if !include_drafts {
            query = query.filter(posts::published.eq(true));
        }

        query
            .order(posts::created_at.desc())
            .select(Post::as_select())
            .load(conn)
            .map_err(DbError::from)
    }

    // Update a post
    pub fn update(
        conn: &mut DbConnection,
        post_id: Uuid,
        updates: UpdatePost,
    ) -> Result<Post, DbError> {
        diesel::update(posts::table.find(post_id))
            .set(&updates)
            .returning(Post::as_returning())
            .get_result(conn)
            .map_err(DbError::from)
    }

    // Publish a post
    pub fn publish(conn: &mut DbConnection, post_id: Uuid) -> Result<Post, DbError> {
        use chrono::Utc;

        diesel::update(posts::table.find(post_id))
            .set((
                posts::published.eq(true),
                posts::published_at.eq(Utc::now().naive_utc()),
            ))
            .returning(Post::as_returning())
            .get_result(conn)
            .map_err(DbError::from)
    }

    // Increment view count
    pub fn increment_views(conn: &mut DbConnection, post_id: Uuid) -> Result<(), DbError> {
        diesel::update(posts::table.find(post_id))
            .set(posts::view_count.eq(posts::view_count + 1))
            .execute(conn)
            .map(|_| ())
            .map_err(DbError::from)
    }

    // Delete a post
    pub fn delete(conn: &mut DbConnection, post_id: Uuid) -> Result<usize, DbError> {
        diesel::delete(posts::table.find(post_id))
            .execute(conn)
            .map_err(DbError::from)
    }

    // Full-text search on title and content
    pub fn search(
        conn: &mut DbConnection,
        query: &str,
        limit: i64,
    ) -> Result<Vec<Post>, DbError> {
        let pattern = format!("%{}%", query.to_lowercase());

        posts::table
            .filter(posts::published.eq(true))
            .filter(
                posts::title.ilike(&pattern)
                    .or(posts::content.ilike(&pattern))
            )
            .order(posts::published_at.desc())
            .limit(limit)
            .select(Post::as_select())
            .load(conn)
            .map_err(DbError::from)
    }
}
```

## Advanced Queries

### Complex Filtering with Boxed Queries

When you need to build queries dynamically based on runtime conditions:

```rust
use diesel::prelude::*;
use diesel::pg::Pg;

// Filter parameters that might come from an API request
pub struct PostFilters {
    pub user_id: Option<Uuid>,
    pub published: Option<bool>,
    pub search: Option<String>,
    pub min_views: Option<i32>,
    pub created_after: Option<NaiveDateTime>,
    pub created_before: Option<NaiveDateTime>,
}

pub fn find_posts_with_filters(
    conn: &mut DbConnection,
    filters: PostFilters,
    page: i64,
    per_page: i64,
) -> Result<Vec<Post>, DbError> {
    // Start with a boxed query that can be modified conditionally
    let mut query = posts::table.into_boxed::<Pg>();

    // Apply filters only if they are present
    if let Some(user_id) = filters.user_id {
        query = query.filter(posts::user_id.eq(user_id));
    }

    if let Some(published) = filters.published {
        query = query.filter(posts::published.eq(published));
    }

    if let Some(search) = filters.search {
        let pattern = format!("%{}%", search.to_lowercase());
        query = query.filter(
            posts::title.ilike(&pattern)
                .or(posts::content.ilike(&pattern))
        );
    }

    if let Some(min_views) = filters.min_views {
        query = query.filter(posts::view_count.ge(min_views));
    }

    if let Some(created_after) = filters.created_after {
        query = query.filter(posts::created_at.gt(created_after));
    }

    if let Some(created_before) = filters.created_before {
        query = query.filter(posts::created_at.lt(created_before));
    }

    // Apply pagination and execute
    query
        .order(posts::created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .select(Post::as_select())
        .load(conn)
        .map_err(DbError::from)
}
```

### Aggregations and Grouping

```rust
use diesel::dsl::{count, sum, avg};

// Get statistics about posts per user
#[derive(Debug, Queryable)]
pub struct UserPostStats {
    pub user_id: Uuid,
    pub username: String,
    pub total_posts: i64,
    pub published_posts: i64,
    pub total_views: i64,
}

pub fn get_user_post_stats(conn: &mut DbConnection) -> Result<Vec<UserPostStats>, DbError> {
    users::table
        .left_join(posts::table)
        .group_by((users::id, users::username))
        .select((
            users::id,
            users::username,
            count(posts::id),
            count(posts::id.nullable()).filter(posts::published.eq(true)),
            sum(posts::view_count).nullable(),
        ))
        .load::<(Uuid, String, i64, i64, Option<i64>)>(conn)
        .map(|rows| {
            rows.into_iter()
                .map(|(user_id, username, total, published, views)| UserPostStats {
                    user_id,
                    username,
                    total_posts: total,
                    published_posts: published,
                    total_views: views.unwrap_or(0),
                })
                .collect()
        })
        .map_err(DbError::from)
}

// Get monthly post counts
pub fn get_monthly_post_counts(
    conn: &mut DbConnection,
    year: i32,
) -> Result<Vec<(i32, i64)>, DbError> {
    use diesel::dsl::sql;
    use diesel::sql_types::{Integer, BigInt};

    posts::table
        .filter(posts::published.eq(true))
        .filter(sql::<Integer>("EXTRACT(YEAR FROM published_at)").eq(year))
        .group_by(sql::<Integer>("EXTRACT(MONTH FROM published_at)"))
        .select((
            sql::<Integer>("EXTRACT(MONTH FROM published_at)::integer"),
            count(posts::id),
        ))
        .order(sql::<Integer>("EXTRACT(MONTH FROM published_at)"))
        .load::<(i32, i64)>(conn)
        .map_err(DbError::from)
}
```

## Joins and Associations

Diesel provides type-safe joins that catch relationship errors at compile time.

### Inner Joins

```rust
// Get post with its author
pub fn get_post_with_author(
    conn: &mut DbConnection,
    post_id: Uuid,
) -> Result<(Post, User), DbError> {
    posts::table
        .inner_join(users::table)
        .filter(posts::id.eq(post_id))
        .select((Post::as_select(), User::as_select()))
        .first(conn)
        .map_err(DbError::from)
}

// Get all comments for a post with their authors
pub fn get_post_comments_with_authors(
    conn: &mut DbConnection,
    post_id: Uuid,
) -> Result<Vec<(Comment, User)>, DbError> {
    comments::table
        .inner_join(users::table)
        .filter(comments::post_id.eq(post_id))
        .filter(comments::parent_id.is_null()) // Only top-level comments
        .order(comments::created_at.asc())
        .select((Comment::as_select(), User::as_select()))
        .load(conn)
        .map_err(DbError::from)
}
```

### Left Joins

```rust
// Get users with their post counts (including users with no posts)
pub fn get_users_with_post_counts(
    conn: &mut DbConnection,
) -> Result<Vec<(User, Option<i64>)>, DbError> {
    use diesel::dsl::count;

    users::table
        .left_join(posts::table)
        .group_by(users::id)
        .select((User::as_select(), count(posts::id).nullable()))
        .load(conn)
        .map_err(DbError::from)
}
```

### Using Associations

The `Associations` derive macro enables the `belonging_to` API for loading related records:

```rust
use diesel::prelude::*;

// Load a user and all their posts
pub fn get_user_with_posts(
    conn: &mut DbConnection,
    user_id: Uuid,
) -> Result<(User, Vec<Post>), DbError> {
    let user = users::table
        .find(user_id)
        .select(User::as_select())
        .first(conn)?;

    let user_posts = Post::belonging_to(&user)
        .select(Post::as_select())
        .load(conn)?;

    Ok((user, user_posts))
}

// Load multiple users with their posts efficiently
pub fn get_users_with_posts(
    conn: &mut DbConnection,
    user_ids: &[Uuid],
) -> Result<Vec<(User, Vec<Post>)>, DbError> {
    let users = users::table
        .filter(users::id.eq_any(user_ids))
        .select(User::as_select())
        .load(conn)?;

    let posts = Post::belonging_to(&users)
        .select(Post::as_select())
        .load(conn)?;

    // Group posts by user
    let posts_by_user = posts.grouped_by(&users);

    Ok(users.into_iter().zip(posts_by_user).collect())
}
```

## Transactions

Transactions ensure that multiple database operations either all succeed or all fail together.

### Basic Transactions

```rust
use diesel::Connection;

// Create a user and their first post atomically
pub fn create_user_with_first_post(
    conn: &mut DbConnection,
    new_user: NewUser,
    post_title: &str,
    post_content: &str,
) -> Result<(User, Post), DbError> {
    conn.transaction(|conn| {
        // Create the user
        let user = diesel::insert_into(users::table)
            .values(&new_user)
            .returning(User::as_returning())
            .get_result(conn)?;

        // Create their first post
        let new_post = NewPost {
            user_id: user.id,
            title: post_title.to_string(),
            slug: slugify(post_title),
            content: post_content.to_string(),
            excerpt: None,
            published: Some(false),
            published_at: None,
        };

        let post = diesel::insert_into(posts::table)
            .values(&new_post)
            .returning(Post::as_returning())
            .get_result(conn)?;

        Ok((user, post))
    })
    .map_err(DbError::from)
}

fn slugify(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
```

### Nested Transactions with Savepoints

```rust
// Transfer ownership of posts between users with rollback on error
pub fn transfer_posts_ownership(
    conn: &mut DbConnection,
    from_user_id: Uuid,
    to_user_id: Uuid,
    post_ids: &[Uuid],
) -> Result<Vec<Post>, DbError> {
    conn.transaction(|conn| {
        let mut transferred = Vec::new();

        for post_id in post_ids {
            // Each post transfer is a savepoint
            let result = conn.transaction(|conn| {
                // Verify the post belongs to the source user
                let post = posts::table
                    .filter(posts::id.eq(post_id))
                    .filter(posts::user_id.eq(from_user_id))
                    .select(Post::as_select())
                    .first(conn)?;

                // Transfer ownership
                let updated = diesel::update(posts::table.find(post.id))
                    .set(posts::user_id.eq(to_user_id))
                    .returning(Post::as_returning())
                    .get_result(conn)?;

                Ok::<Post, diesel::result::Error>(updated)
            });

            match result {
                Ok(post) => transferred.push(post),
                Err(diesel::result::Error::NotFound) => {
                    // Skip posts that do not exist or do not belong to source user
                    continue;
                }
                Err(e) => return Err(e),
            }
        }

        Ok(transferred)
    })
    .map_err(DbError::from)
}
```

### Transactions with Explicit Rollback

```rust
// Process a batch of operations, rolling back if any fail validation
pub fn batch_update_posts(
    conn: &mut DbConnection,
    updates: Vec<(Uuid, UpdatePost)>,
) -> Result<Vec<Post>, DbError> {
    conn.transaction(|conn| {
        let mut results = Vec::new();

        for (post_id, update) in updates {
            // Validate the update
            if let Some(ref title) = update.title {
                if title.len() > 255 {
                    // This will rollback all previous updates in this transaction
                    return Err(diesel::result::Error::RollbackTransaction);
                }
            }

            let updated = diesel::update(posts::table.find(post_id))
                .set(&update)
                .returning(Post::as_returning())
                .get_result(conn)?;

            results.push(updated);
        }

        Ok(results)
    })
    .map_err(DbError::from)
}
```

## Raw SQL Queries

Sometimes you need to write raw SQL for complex queries that Diesel's query builder does not support directly.

```rust
use diesel::sql_types::{Uuid as SqlUuid, Text, Integer, Timestamp};

// Define the result struct
#[derive(Debug, QueryableByName)]
pub struct PostAnalytics {
    #[diesel(sql_type = SqlUuid)]
    pub post_id: Uuid,
    #[diesel(sql_type = Text)]
    pub title: String,
    #[diesel(sql_type = Integer)]
    pub view_count: i32,
    #[diesel(sql_type = Integer)]
    pub comment_count: i32,
    #[diesel(sql_type = Integer)]
    pub days_since_published: i32,
}

pub fn get_post_analytics(
    conn: &mut DbConnection,
    user_id: Uuid,
) -> Result<Vec<PostAnalytics>, DbError> {
    diesel::sql_query(r#"
        SELECT
            p.id as post_id,
            p.title,
            p.view_count,
            COUNT(c.id)::integer as comment_count,
            EXTRACT(DAY FROM NOW() - p.published_at)::integer as days_since_published
        FROM posts p
        LEFT JOIN comments c ON c.post_id = p.id
        WHERE p.user_id = $1 AND p.published = true
        GROUP BY p.id, p.title, p.view_count, p.published_at
        ORDER BY p.published_at DESC
    "#)
    .bind::<SqlUuid, _>(user_id)
    .load(conn)
    .map_err(DbError::from)
}

// Using sql_query with parameters
pub fn search_posts_fulltext(
    conn: &mut DbConnection,
    search_term: &str,
    limit: i32,
) -> Result<Vec<Post>, DbError> {
    diesel::sql_query(r#"
        SELECT p.*
        FROM posts p
        WHERE p.published = true
          AND (
            to_tsvector('english', p.title || ' ' || p.content)
            @@ plainto_tsquery('english', $1)
          )
        ORDER BY ts_rank(
            to_tsvector('english', p.title || ' ' || p.content),
            plainto_tsquery('english', $1)
        ) DESC
        LIMIT $2
    "#)
    .bind::<Text, _>(search_term)
    .bind::<Integer, _>(limit)
    .load(conn)
    .map_err(DbError::from)
}
```

## Testing Database Code

Diesel works well with test databases and transactions that rollback after each test.

```rust
// tests/common/mod.rs

use diesel::pg::PgConnection;
use diesel::Connection;

pub fn establish_test_connection() -> PgConnection {
    dotenvy::from_filename(".env.test").ok();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set for tests");

    let mut conn = PgConnection::establish(&database_url)
        .expect("Failed to connect to test database");

    // Run migrations
    diesel_migrations::run_pending_migrations(&mut conn)
        .expect("Failed to run migrations");

    conn
}

// Wrap tests in transactions that rollback
pub fn run_test<T>(test: T)
where
    T: FnOnce(&mut PgConnection) -> () + std::panic::UnwindSafe,
{
    let mut conn = establish_test_connection();

    conn.test_transaction::<_, diesel::result::Error, _>(|conn| {
        test(conn);
        Ok(())
    });
}
```

```rust
// tests/user_tests.rs

mod common;

use crate::common::run_test;
use myapp::models::user::{NewUser, UpdateUser};
use myapp::repositories::user_repository::UserRepository;

#[test]
fn test_create_user() {
    run_test(|conn| {
        let new_user = NewUser {
            email: "test@example.com".to_string(),
            username: "testuser".to_string(),
            password_hash: "hashed_password".to_string(),
            display_name: Some("Test User".to_string()),
            bio: None,
            avatar_url: None,
        };

        let user = UserRepository::create(conn, new_user).unwrap();

        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.username, "testuser");
        assert!(user.is_active);
        assert!(!user.is_admin);
    });
}

#[test]
fn test_find_user_by_email() {
    run_test(|conn| {
        // Create a user first
        let new_user = NewUser {
            email: "find@example.com".to_string(),
            username: "finduser".to_string(),
            password_hash: "hashed".to_string(),
            display_name: None,
            bio: None,
            avatar_url: None,
        };

        let created = UserRepository::create(conn, new_user).unwrap();

        // Find by email
        let found = UserRepository::find_by_email(conn, "find@example.com").unwrap();

        assert_eq!(found.id, created.id);
    });
}

#[test]
fn test_update_user() {
    run_test(|conn| {
        let new_user = NewUser {
            email: "update@example.com".to_string(),
            username: "updateuser".to_string(),
            password_hash: "hashed".to_string(),
            display_name: None,
            bio: None,
            avatar_url: None,
        };

        let user = UserRepository::create(conn, new_user).unwrap();

        let updates = UpdateUser {
            email: None,
            username: None,
            password_hash: None,
            display_name: Some("Updated Name".to_string()),
            bio: Some("My bio".to_string()),
            avatar_url: None,
            is_active: None,
            is_admin: None,
            email_verified_at: None,
            last_login_at: None,
        };

        let updated = UserRepository::update(conn, user.id, updates).unwrap();

        assert_eq!(updated.display_name, Some("Updated Name".to_string()));
        assert_eq!(updated.bio, Some("My bio".to_string()));
    });
}

#[test]
fn test_email_uniqueness() {
    run_test(|conn| {
        let new_user = NewUser {
            email: "unique@example.com".to_string(),
            username: "uniqueuser".to_string(),
            password_hash: "hashed".to_string(),
            display_name: None,
            bio: None,
            avatar_url: None,
        };

        UserRepository::create(conn, new_user).unwrap();

        // Try to create another user with the same email
        let duplicate = NewUser {
            email: "unique@example.com".to_string(),
            username: "differentuser".to_string(),
            password_hash: "hashed".to_string(),
            display_name: None,
            bio: None,
            avatar_url: None,
        };

        let result = UserRepository::create(conn, duplicate);
        assert!(result.is_err());
    });
}
```

## Best Practices

### 1. Use Connection Pooling in Production

Never create a new connection for each request. Use r2d2 or deadpool for connection pooling:

```rust
// Good - reuse connections from pool
let conn = pool.get()?;

// Bad - creates new connection every time
let conn = PgConnection::establish(&database_url)?;
```

### 2. Prefer select() Over Loading Full Models

Load only the columns you need:

```rust
// Good - only loads needed columns
let usernames: Vec<String> = users::table
    .select(users::username)
    .load(conn)?;

// Less efficient - loads all columns
let users: Vec<User> = users::table.load(conn)?;
let usernames: Vec<String> = users.iter().map(|u| u.username.clone()).collect();
```

### 3. Use Transactions for Related Operations

Wrap related database operations in transactions to maintain data consistency:

```rust
// Good - atomic operation
conn.transaction(|conn| {
    create_order(conn, &order)?;
    update_inventory(conn, &items)?;
    charge_payment(conn, &payment)?;
    Ok(())
})?;
```

### 4. Handle Errors Appropriately

Create domain-specific error types that wrap Diesel errors:

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("User not found")]
    UserNotFound,

    #[error("Email already exists")]
    EmailExists,

    #[error("Database error: {0}")]
    Database(#[from] diesel::result::Error),
}
```

### 5. Write Migrations Carefully

Always provide both `up.sql` and `down.sql` migrations. Test your rollbacks in development.

### 6. Index Your Query Columns

Add indexes for columns used in WHERE clauses and JOINs. Diesel does not create indexes automatically.

### 7. Use Boxed Queries for Dynamic Filters

When building queries based on optional filters, use boxed queries to avoid code duplication.

## Summary

Diesel brings the safety guarantees of Rust to your database layer. The compile-time query validation catches SQL errors before they reach production, and the type system ensures your data transforms are correct.

Here is a quick reference:

| Feature | Diesel Approach |
|---------|-----------------|
| Schema management | `diesel migration` CLI commands |
| Models | Derive macros: `Queryable`, `Insertable`, `AsChangeset` |
| Queries | Type-safe query builder with `diesel::prelude` |
| Relationships | `Associations` derive and `belonging_to` |
| Transactions | `connection.transaction()` closure |
| Connection pooling | r2d2 or deadpool integration |
| Testing | `test_transaction` for isolated tests |

The initial learning curve is steeper than some ORMs, but the payoff is substantial: bugs that would have been runtime SQL errors in other languages become compile errors in Rust.

---

Building reliable applications requires more than just safe database access. You need visibility into your entire stack - from database query times to API response latencies to infrastructure health.

**[OneUptime](https://oneuptime.com)** provides complete observability for your Rust applications. Monitor your Diesel-powered services with distributed tracing, track database performance metrics, and get alerted before issues impact your users. Start with our free tier and scale as your application grows.
