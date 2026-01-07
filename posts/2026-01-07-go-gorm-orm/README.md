# How to Use GORM Effectively in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, GORM, ORM, Database, PostgreSQL

Description: Master GORM in Go with best practices for model definitions, relationships, migrations, and performance optimization.

---

GORM is the most popular ORM (Object-Relational Mapping) library for Go, providing a developer-friendly way to interact with databases. It supports multiple databases including PostgreSQL, MySQL, SQLite, and SQL Server. This guide covers everything you need to know to use GORM effectively in production applications.

## Table of Contents

1. [Installation and Setup](#installation-and-setup)
2. [Database Connection](#database-connection)
3. [Model Definitions](#model-definitions)
4. [CRUD Operations](#crud-operations)
5. [Relationships](#relationships)
6. [Migrations](#migrations)
7. [Query Optimization](#query-optimization)
8. [Transactions](#transactions)
9. [Hooks and Callbacks](#hooks-and-callbacks)
10. [Best Practices](#best-practices)

## Installation and Setup

### Installing GORM

First, install GORM and the database driver for your preferred database. We will use PostgreSQL in this guide.

```bash
# Install GORM core library
go get -u gorm.io/gorm

# Install PostgreSQL driver
go get -u gorm.io/driver/postgres

# For MySQL, use:
# go get -u gorm.io/driver/mysql

# For SQLite, use:
# go get -u gorm.io/driver/sqlite
```

## Database Connection

### Basic Connection Setup

Create a database connection with proper configuration. This example shows how to connect to PostgreSQL with connection pooling settings.

```go
package main

import (
    "fmt"
    "log"
    "time"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

// Database configuration struct for clean configuration management
type DBConfig struct {
    Host     string
    Port     int
    User     string
    Password string
    DBName   string
    SSLMode  string
}

// NewDatabase creates a new database connection with optimized settings
func NewDatabase(config DBConfig) (*gorm.DB, error) {
    // Build the DSN (Data Source Name) string
    dsn := fmt.Sprintf(
        "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
        config.Host,
        config.Port,
        config.User,
        config.Password,
        config.DBName,
        config.SSLMode,
    )

    // Configure GORM with custom settings
    gormConfig := &gorm.Config{
        // Set logger to info level for development
        Logger: logger.Default.LogMode(logger.Info),
        // Disable default transaction for better performance
        SkipDefaultTransaction: true,
        // Prepare statements for better performance
        PrepareStmt: true,
    }

    // Open connection to the database
    db, err := gorm.Open(postgres.Open(dsn), gormConfig)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to database: %w", err)
    }

    // Get the underlying SQL database connection
    sqlDB, err := db.DB()
    if err != nil {
        return nil, fmt.Errorf("failed to get database instance: %w", err)
    }

    // Configure connection pool settings
    // SetMaxIdleConns sets the maximum number of idle connections
    sqlDB.SetMaxIdleConns(10)
    // SetMaxOpenConns sets the maximum number of open connections
    sqlDB.SetMaxOpenConns(100)
    // SetConnMaxLifetime sets the maximum lifetime of a connection
    sqlDB.SetConnMaxLifetime(time.Hour)
    // SetConnMaxIdleTime sets the maximum idle time for connections
    sqlDB.SetConnMaxIdleTime(10 * time.Minute)

    return db, nil
}

func main() {
    config := DBConfig{
        Host:     "localhost",
        Port:     5432,
        User:     "postgres",
        Password: "password",
        DBName:   "myapp",
        SSLMode:  "disable",
    }

    db, err := NewDatabase(config)
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Database connected successfully")
    _ = db // Use db for queries
}
```

## Model Definitions

### Basic Model with GORM Tags

Define models using struct tags to customize column names, types, and constraints. GORM uses conventions but allows full customization.

```go
package models

import (
    "time"

    "gorm.io/gorm"
)

// User represents the users table with common fields
type User struct {
    // Embed gorm.Model for ID, CreatedAt, UpdatedAt, DeletedAt
    gorm.Model

    // Use column tag to customize the database column name
    Email string `gorm:"column:email;type:varchar(255);uniqueIndex;not null"`

    // Add size constraint directly in the type
    Username string `gorm:"type:varchar(100);uniqueIndex;not null"`

    // Password hash should never be selected by default
    PasswordHash string `gorm:"type:varchar(255);not null;->:false;<-"`

    // Use index tag for better query performance
    FirstName string `gorm:"type:varchar(100);index"`
    LastName  string `gorm:"type:varchar(100);index"`

    // Boolean field with default value
    IsActive bool `gorm:"default:true"`

    // Timestamp fields with auto-update
    LastLoginAt *time.Time `gorm:"index"`

    // JSON field for flexible data storage
    Preferences map[string]interface{} `gorm:"type:jsonb"`

    // Relationships (defined later)
    Posts    []Post    `gorm:"foreignKey:UserID"`
    Profile  *Profile  `gorm:"foreignKey:UserID"`
    Comments []Comment `gorm:"foreignKey:UserID"`
}

// TableName overrides the default table name
func (User) TableName() string {
    return "users"
}
```

### Understanding GORM Tags

Here is a comprehensive reference for commonly used GORM struct tags.

```go
package models

// TagReference demonstrates all common GORM struct tags
type TagReference struct {
    // Primary key - auto-increment by default for uint types
    ID uint `gorm:"primaryKey"`

    // Column name customization
    Name string `gorm:"column:full_name"`

    // Type specification for database column
    Description string `gorm:"type:text"`

    // Size constraint (shorthand for varchar)
    Code string `gorm:"size:50"`

    // Unique constraint
    Email string `gorm:"unique"`

    // Not null constraint
    Username string `gorm:"not null"`

    // Default value
    Status string `gorm:"default:'pending'"`

    // Index creation
    Category string `gorm:"index"`

    // Named index
    Tag string `gorm:"index:idx_tag"`

    // Composite index (multiple fields with same index name)
    FirstName string `gorm:"index:idx_full_name"`
    LastName  string `gorm:"index:idx_full_name"`

    // Unique index
    Slug string `gorm:"uniqueIndex"`

    // Ignore field (not stored in database)
    TempData string `gorm:"-"`

    // Read-only field (only read from database)
    CreatedBy string `gorm:"->"`

    // Write-only field (only write to database)
    Secret string `gorm:"<-"`

    // Auto-create and auto-update timestamps
    CreatedAt time.Time `gorm:"autoCreateTime"`
    UpdatedAt time.Time `gorm:"autoUpdateTime"`

    // Precision for time fields
    ProcessedAt time.Time `gorm:"precision:6"`

    // Check constraint
    Age int `gorm:"check:age >= 0"`

    // Comment for the column
    Notes string `gorm:"comment:'User notes field'"`

    // Embedded struct
    Address Address `gorm:"embedded;embeddedPrefix:addr_"`
}

// Address is an embedded struct
type Address struct {
    Street  string
    City    string
    Country string
    ZipCode string
}
```

## CRUD Operations

### Create Operations

Insert records into the database with various methods for single and batch inserts.

```go
package repository

import (
    "context"
    "errors"

    "gorm.io/gorm"
)

// UserRepository handles user database operations
type UserRepository struct {
    db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) *UserRepository {
    return &UserRepository{db: db}
}

// Create inserts a single user into the database
func (r *UserRepository) Create(ctx context.Context, user *User) error {
    // Create will insert the record and update the model with generated values
    result := r.db.WithContext(ctx).Create(user)
    if result.Error != nil {
        return result.Error
    }
    // user.ID is now populated with the generated ID
    return nil
}

// CreateBatch inserts multiple users in a single query for better performance
func (r *UserRepository) CreateBatch(ctx context.Context, users []User) error {
    // CreateInBatches processes records in batches to avoid memory issues
    // Second parameter is the batch size
    result := r.db.WithContext(ctx).CreateInBatches(users, 100)
    return result.Error
}

// Upsert creates or updates a user based on conflict columns
func (r *UserRepository) Upsert(ctx context.Context, user *User) error {
    // Clauses for handling conflicts (upsert)
    result := r.db.WithContext(ctx).
        Clauses(clause.OnConflict{
            Columns:   []clause.Column{{Name: "email"}},
            DoUpdates: clause.AssignmentColumns([]string{"username", "updated_at"}),
        }).
        Create(user)
    return result.Error
}
```

### Read Operations

Query records with various conditions, ordering, and pagination.

```go
// FindByID retrieves a user by their ID
func (r *UserRepository) FindByID(ctx context.Context, id uint) (*User, error) {
    var user User
    // First finds the first record matching the condition
    result := r.db.WithContext(ctx).First(&user, id)
    if result.Error != nil {
        if errors.Is(result.Error, gorm.ErrRecordNotFound) {
            return nil, nil // Return nil for not found
        }
        return nil, result.Error
    }
    return &user, nil
}

// FindByEmail retrieves a user by their email address
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
    var user User
    result := r.db.WithContext(ctx).Where("email = ?", email).First(&user)
    if result.Error != nil {
        if errors.Is(result.Error, gorm.ErrRecordNotFound) {
            return nil, nil
        }
        return nil, result.Error
    }
    return &user, nil
}

// FindAll retrieves all users with pagination
func (r *UserRepository) FindAll(ctx context.Context, page, pageSize int) ([]User, int64, error) {
    var users []User
    var total int64

    // Count total records first
    r.db.WithContext(ctx).Model(&User{}).Count(&total)

    // Calculate offset for pagination
    offset := (page - 1) * pageSize

    // Retrieve paginated results with ordering
    result := r.db.WithContext(ctx).
        Order("created_at DESC").
        Offset(offset).
        Limit(pageSize).
        Find(&users)

    if result.Error != nil {
        return nil, 0, result.Error
    }

    return users, total, nil
}

// FindWithFilters retrieves users matching multiple conditions
func (r *UserRepository) FindWithFilters(ctx context.Context, filters UserFilters) ([]User, error) {
    var users []User

    // Start building the query
    query := r.db.WithContext(ctx).Model(&User{})

    // Apply filters conditionally
    if filters.IsActive != nil {
        query = query.Where("is_active = ?", *filters.IsActive)
    }
    if filters.Username != "" {
        // Use ILIKE for case-insensitive search (PostgreSQL)
        query = query.Where("username ILIKE ?", "%"+filters.Username+"%")
    }
    if !filters.CreatedAfter.IsZero() {
        query = query.Where("created_at > ?", filters.CreatedAfter)
    }

    result := query.Find(&users)
    return users, result.Error
}

// UserFilters contains optional filters for querying users
type UserFilters struct {
    IsActive     *bool
    Username     string
    CreatedAfter time.Time
}
```

### Update Operations

Update records with various strategies for partial and full updates.

```go
// Update updates specific fields of a user
func (r *UserRepository) Update(ctx context.Context, id uint, updates map[string]interface{}) error {
    // Updates only the specified fields
    result := r.db.WithContext(ctx).
        Model(&User{}).
        Where("id = ?", id).
        Updates(updates)

    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return gorm.ErrRecordNotFound
    }
    return nil
}

// Save updates all fields of a user (including zero values)
func (r *UserRepository) Save(ctx context.Context, user *User) error {
    // Save will update all fields, including zero values
    // Use this when you want to explicitly set fields to zero/empty
    result := r.db.WithContext(ctx).Save(user)
    return result.Error
}

// UpdateColumn updates a single column without running hooks
func (r *UserRepository) UpdateLastLogin(ctx context.Context, id uint) error {
    now := time.Now()
    // UpdateColumn bypasses hooks and doesn't update UpdatedAt
    result := r.db.WithContext(ctx).
        Model(&User{}).
        Where("id = ?", id).
        UpdateColumn("last_login_at", now)
    return result.Error
}

// IncrementCounter demonstrates atomic counter updates
func (r *UserRepository) IncrementLoginCount(ctx context.Context, id uint) error {
    // Use gorm.Expr for SQL expressions
    result := r.db.WithContext(ctx).
        Model(&User{}).
        Where("id = ?", id).
        Update("login_count", gorm.Expr("login_count + ?", 1))
    return result.Error
}
```

### Delete Operations

Delete records with soft delete support and permanent deletion options.

```go
// Delete performs a soft delete (sets deleted_at)
func (r *UserRepository) Delete(ctx context.Context, id uint) error {
    // With gorm.Model, Delete sets deleted_at instead of removing the row
    result := r.db.WithContext(ctx).Delete(&User{}, id)
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return gorm.ErrRecordNotFound
    }
    return nil
}

// HardDelete permanently removes a record from the database
func (r *UserRepository) HardDelete(ctx context.Context, id uint) error {
    // Unscoped bypasses soft delete and permanently removes the record
    result := r.db.WithContext(ctx).Unscoped().Delete(&User{}, id)
    return result.Error
}

// DeleteByCondition deletes multiple records matching a condition
func (r *UserRepository) DeleteInactiveUsers(ctx context.Context, before time.Time) (int64, error) {
    result := r.db.WithContext(ctx).
        Where("is_active = ? AND last_login_at < ?", false, before).
        Delete(&User{})
    return result.RowsAffected, result.Error
}

// Restore recovers a soft-deleted record
func (r *UserRepository) Restore(ctx context.Context, id uint) error {
    result := r.db.WithContext(ctx).
        Unscoped().
        Model(&User{}).
        Where("id = ?", id).
        Update("deleted_at", nil)
    return result.Error
}
```

## Relationships

### Belongs To Relationship

Define a belongs-to relationship where a model references another model's ID.

```go
// Post belongs to a User (many-to-one relationship)
type Post struct {
    gorm.Model
    Title   string `gorm:"type:varchar(255);not null"`
    Content string `gorm:"type:text"`

    // Foreign key field
    UserID uint `gorm:"not null;index"`
    // Association reference - GORM will populate this when preloading
    User User `gorm:"foreignKey:UserID"`

    // Self-referential belongs-to for reply threads
    ParentID *uint `gorm:"index"`
    Parent   *Post `gorm:"foreignKey:ParentID"`
}
```

### Has One Relationship

Define a has-one relationship where a model owns exactly one instance of another model.

```go
// Profile has a one-to-one relationship with User
type Profile struct {
    gorm.Model

    // Foreign key to User
    UserID uint `gorm:"uniqueIndex;not null"` // uniqueIndex ensures one profile per user

    Bio       string `gorm:"type:text"`
    AvatarURL string `gorm:"type:varchar(500)"`
    Website   string `gorm:"type:varchar(255)"`
    Location  string `gorm:"type:varchar(100)"`

    // Social links stored as JSON
    SocialLinks map[string]string `gorm:"type:jsonb"`
}

// User has one Profile
type User struct {
    gorm.Model
    Email    string   `gorm:"uniqueIndex;not null"`
    Username string   `gorm:"uniqueIndex;not null"`

    // Has One relationship - User owns one Profile
    Profile *Profile `gorm:"foreignKey:UserID"`
}
```

### Has Many Relationship

Define a has-many relationship where a model owns multiple instances of another model.

```go
// User has many Posts and Comments
type User struct {
    gorm.Model
    Email    string `gorm:"uniqueIndex;not null"`
    Username string `gorm:"uniqueIndex;not null"`

    // Has Many relationships
    Posts    []Post    `gorm:"foreignKey:UserID"`
    Comments []Comment `gorm:"foreignKey:UserID"`
}

// Comment belongs to both User and Post
type Comment struct {
    gorm.Model
    Content string `gorm:"type:text;not null"`

    // Foreign keys
    UserID uint `gorm:"not null;index"`
    PostID uint `gorm:"not null;index"`

    // Associations
    User User `gorm:"foreignKey:UserID"`
    Post Post `gorm:"foreignKey:PostID"`
}
```

### Many to Many Relationship

Define a many-to-many relationship with a join table.

```go
// Tag can be associated with many Posts and vice versa
type Tag struct {
    gorm.Model
    Name  string `gorm:"type:varchar(50);uniqueIndex;not null"`
    Slug  string `gorm:"type:varchar(50);uniqueIndex;not null"`

    // Many-to-many with Posts
    Posts []Post `gorm:"many2many:post_tags;"`
}

// Post with many-to-many relationship to Tags
type Post struct {
    gorm.Model
    Title   string `gorm:"type:varchar(255);not null"`
    Content string `gorm:"type:text"`
    UserID  uint   `gorm:"not null;index"`

    // Many-to-many with Tags
    // GORM automatically creates the join table 'post_tags'
    Tags []Tag `gorm:"many2many:post_tags;"`
}

// Custom join table with additional fields
type PostTag struct {
    PostID    uint      `gorm:"primaryKey"`
    TagID     uint      `gorm:"primaryKey"`
    CreatedAt time.Time `gorm:"autoCreateTime"`
    AddedBy   uint      // Who added this tag
}

// SetupJoinTable configures the custom join table
func SetupJoinTable(db *gorm.DB) error {
    // Use SetupJoinTable to specify a custom join table model
    return db.SetupJoinTable(&Post{}, "Tags", &PostTag{})
}
```

### Working with Associations

Create, append, replace, and delete associations.

```go
// AssociationOperations demonstrates working with relationships
func AssociationOperations(db *gorm.DB) {
    ctx := context.Background()

    // Create a post with tags in a single operation
    post := Post{
        Title:   "GORM Relationships",
        Content: "Understanding GORM relationships...",
        UserID:  1,
        Tags: []Tag{
            {Name: "golang", Slug: "golang"},
            {Name: "database", Slug: "database"},
        },
    }
    db.WithContext(ctx).Create(&post)

    // Append new tags to an existing post
    var existingPost Post
    db.First(&existingPost, 1)

    newTag := Tag{Name: "tutorial", Slug: "tutorial"}
    db.WithContext(ctx).Model(&existingPost).Association("Tags").Append(&newTag)

    // Replace all tags for a post
    replacementTags := []Tag{
        {Name: "go", Slug: "go"},
    }
    db.WithContext(ctx).Model(&existingPost).Association("Tags").Replace(&replacementTags)

    // Remove a specific tag from a post
    var tagToRemove Tag
    db.Where("slug = ?", "go").First(&tagToRemove)
    db.WithContext(ctx).Model(&existingPost).Association("Tags").Delete(&tagToRemove)

    // Clear all tags from a post
    db.WithContext(ctx).Model(&existingPost).Association("Tags").Clear()

    // Count associations
    count := db.WithContext(ctx).Model(&existingPost).Association("Tags").Count()
    fmt.Printf("Post has %d tags\n", count)
}
```

## Migrations

### Auto Migration

Use AutoMigrate for development environments to automatically sync schema changes.

```go
// AutoMigrate creates or updates tables based on model definitions
func AutoMigrate(db *gorm.DB) error {
    // AutoMigrate will:
    // - Create tables if they don't exist
    // - Add missing columns
    // - Add missing indexes
    // It will NOT:
    // - Delete unused columns (data safety)
    // - Change column types
    // - Delete unused indexes

    err := db.AutoMigrate(
        &User{},
        &Profile{},
        &Post{},
        &Comment{},
        &Tag{},
    )
    if err != nil {
        return fmt.Errorf("auto migration failed: %w", err)
    }

    return nil
}
```

### Manual Migrations with golang-migrate

For production environments, use explicit migration files with version control.

```go
// migrations/000001_create_users.up.sql
/*
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
*/

// migrations/000001_create_users.down.sql
/*
DROP TABLE IF EXISTS users;
*/
```

Integration with golang-migrate for version-controlled migrations.

```go
package database

import (
    "database/sql"
    "fmt"

    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

// RunMigrations executes database migrations from the specified path
func RunMigrations(db *sql.DB, migrationsPath string) error {
    // Create postgres driver for migrate
    driver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        return fmt.Errorf("failed to create migration driver: %w", err)
    }

    // Create migrate instance
    m, err := migrate.NewWithDatabaseInstance(
        fmt.Sprintf("file://%s", migrationsPath),
        "postgres",
        driver,
    )
    if err != nil {
        return fmt.Errorf("failed to create migrate instance: %w", err)
    }

    // Run migrations
    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        return fmt.Errorf("migration failed: %w", err)
    }

    return nil
}

// RollbackMigration rolls back the last migration
func RollbackMigration(db *sql.DB, migrationsPath string) error {
    driver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        return err
    }

    m, err := migrate.NewWithDatabaseInstance(
        fmt.Sprintf("file://%s", migrationsPath),
        "postgres",
        driver,
    )
    if err != nil {
        return err
    }

    // Roll back one step
    return m.Steps(-1)
}
```

### Creating Indexes and Constraints

Add indexes and constraints for better performance and data integrity.

```go
// CreateIndexes manually creates indexes using GORM's Migrator
func CreateIndexes(db *gorm.DB) error {
    migrator := db.Migrator()

    // Create a composite index
    if !migrator.HasIndex(&User{}, "idx_users_name") {
        err := migrator.CreateIndex(&User{}, "idx_users_name")
        if err != nil {
            return err
        }
    }

    // Create a partial index using raw SQL
    err := db.Exec(`
        CREATE INDEX IF NOT EXISTS idx_active_users
        ON users(email)
        WHERE is_active = true AND deleted_at IS NULL
    `).Error
    if err != nil {
        return err
    }

    return nil
}

// AddConstraints adds foreign key and check constraints
func AddConstraints(db *gorm.DB) error {
    // Add foreign key constraint with cascade
    err := db.Exec(`
        ALTER TABLE posts
        ADD CONSTRAINT fk_posts_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    `).Error
    if err != nil {
        return err
    }

    // Add check constraint
    err = db.Exec(`
        ALTER TABLE users
        ADD CONSTRAINT chk_email_format
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
    `).Error

    return err
}
```

## Query Optimization

### Eager Loading with Preload

Use Preload to avoid N+1 query problems when loading associations.

```go
// FindPostsWithDetails demonstrates proper eager loading
func (r *PostRepository) FindPostsWithDetails(ctx context.Context, page, pageSize int) ([]Post, error) {
    var posts []Post
    offset := (page - 1) * pageSize

    // Preload loads associations in separate queries
    // This avoids the N+1 problem
    result := r.db.WithContext(ctx).
        Preload("User").           // Load the post author
        Preload("Tags").           // Load all tags
        Preload("Comments").       // Load all comments
        Preload("Comments.User").  // Load comment authors (nested preload)
        Order("created_at DESC").
        Offset(offset).
        Limit(pageSize).
        Find(&posts)

    return posts, result.Error
}

// Conditional Preload loads associations only when certain conditions are met
func (r *PostRepository) FindPostsWithActiveComments(ctx context.Context) ([]Post, error) {
    var posts []Post

    result := r.db.WithContext(ctx).
        Preload("Comments", func(db *gorm.DB) *gorm.DB {
            // Only load non-deleted comments, ordered by date
            return db.Where("deleted_at IS NULL").Order("created_at DESC")
        }).
        Find(&posts)

    return posts, result.Error
}
```

### Using Joins for Better Performance

Use Joins when you need to filter by associated table fields.

```go
// FindPostsByUserEmail demonstrates using joins for filtering
func (r *PostRepository) FindPostsByUserEmail(ctx context.Context, email string) ([]Post, error) {
    var posts []Post

    // Joins is more efficient when filtering by associated table columns
    result := r.db.WithContext(ctx).
        Joins("JOIN users ON users.id = posts.user_id").
        Where("users.email = ?", email).
        Find(&posts)

    return posts, result.Error
}

// FindPostsWithUserData loads posts with user data in a single query
func (r *PostRepository) FindPostsWithUserData(ctx context.Context) ([]Post, error) {
    var posts []Post

    // Using Joins with struct population
    result := r.db.WithContext(ctx).
        Joins("User").  // Smart join that populates the User field
        Find(&posts)

    return posts, result.Error
}

// ComplexJoinQuery demonstrates multi-table joins
func (r *PostRepository) FindPopularPosts(ctx context.Context, minComments int) ([]Post, error) {
    var posts []Post

    result := r.db.WithContext(ctx).
        Select("posts.*, COUNT(comments.id) as comment_count").
        Joins("LEFT JOIN comments ON comments.post_id = posts.id").
        Group("posts.id").
        Having("COUNT(comments.id) >= ?", minComments).
        Order("comment_count DESC").
        Find(&posts)

    return posts, result.Error
}
```

### Select Specific Fields

Only select fields you need to reduce memory usage and improve performance.

```go
// PostSummary is a DTO for post list views
type PostSummary struct {
    ID        uint
    Title     string
    CreatedAt time.Time
    UserName  string
}

// FindPostSummaries loads only necessary fields
func (r *PostRepository) FindPostSummaries(ctx context.Context) ([]PostSummary, error) {
    var summaries []PostSummary

    result := r.db.WithContext(ctx).
        Model(&Post{}).
        Select("posts.id, posts.title, posts.created_at, users.username as user_name").
        Joins("JOIN users ON users.id = posts.user_id").
        Scan(&summaries)

    return summaries, result.Error
}

// Pluck extracts a single column into a slice
func (r *UserRepository) GetAllEmails(ctx context.Context) ([]string, error) {
    var emails []string
    result := r.db.WithContext(ctx).Model(&User{}).Pluck("email", &emails)
    return emails, result.Error
}
```

### Batch Processing

Process large datasets efficiently using batch operations.

```go
// ProcessUsersInBatches processes users without loading all into memory
func ProcessUsersInBatches(db *gorm.DB, batchSize int, processor func([]User) error) error {
    var users []User

    // FindInBatches processes records in batches
    result := db.Model(&User{}).
        Where("is_active = ?", true).
        FindInBatches(&users, batchSize, func(tx *gorm.DB, batch int) error {
            // Process each batch
            if err := processor(users); err != nil {
                return err
            }

            // Return nil to continue to next batch
            return nil
        })

    return result.Error
}

// Rows returns an iterator for memory-efficient processing
func ProcessUsersOneByOne(db *gorm.DB, processor func(*User) error) error {
    rows, err := db.Model(&User{}).Where("is_active = ?", true).Rows()
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var user User
        // ScanRows scans a single row into the struct
        if err := db.ScanRows(rows, &user); err != nil {
            return err
        }
        if err := processor(&user); err != nil {
            return err
        }
    }

    return rows.Err()
}
```

## Transactions

### Basic Transactions

Use transactions to ensure data consistency for multiple operations.

```go
// TransferCredits demonstrates a basic transaction
func TransferCredits(db *gorm.DB, fromUserID, toUserID uint, amount int) error {
    // Transaction wraps operations in a database transaction
    return db.Transaction(func(tx *gorm.DB) error {
        var fromUser, toUser User

        // Lock the rows for update to prevent race conditions
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            First(&fromUser, fromUserID).Error; err != nil {
            return err
        }

        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            First(&toUser, toUserID).Error; err != nil {
            return err
        }

        // Validate sufficient balance
        if fromUser.Credits < amount {
            return errors.New("insufficient credits")
        }

        // Perform the transfer
        if err := tx.Model(&fromUser).
            Update("credits", gorm.Expr("credits - ?", amount)).Error; err != nil {
            return err
        }

        if err := tx.Model(&toUser).
            Update("credits", gorm.Expr("credits + ?", amount)).Error; err != nil {
            return err
        }

        // Return nil to commit the transaction
        // Return any error to rollback
        return nil
    })
}
```

### Nested Transactions with Savepoints

Use savepoints for partial rollbacks within a transaction.

```go
// CreateOrderWithItems demonstrates nested transactions
func CreateOrderWithItems(db *gorm.DB, order *Order, items []OrderItem) error {
    return db.Transaction(func(tx *gorm.DB) error {
        // Create the main order
        if err := tx.Create(order).Error; err != nil {
            return err
        }

        // Process each item with savepoints
        for i, item := range items {
            item.OrderID = order.ID

            // Nested transaction creates a savepoint
            err := tx.Transaction(func(tx2 *gorm.DB) error {
                // Update inventory
                result := tx2.Model(&Product{}).
                    Where("id = ? AND stock >= ?", item.ProductID, item.Quantity).
                    Update("stock", gorm.Expr("stock - ?", item.Quantity))

                if result.RowsAffected == 0 {
                    return fmt.Errorf("insufficient stock for product %d", item.ProductID)
                }

                // Create the order item
                return tx2.Create(&item).Error
            })

            if err != nil {
                // Log the error but continue with other items
                log.Printf("Failed to process item %d: %v", i, err)
                // The savepoint is rolled back, but main transaction continues
            }
        }

        // Verify at least one item was added
        var itemCount int64
        tx.Model(&OrderItem{}).Where("order_id = ?", order.ID).Count(&itemCount)
        if itemCount == 0 {
            return errors.New("no items could be added to the order")
        }

        return nil
    })
}
```

### Manual Transaction Control

For complex scenarios where you need fine-grained control over transactions.

```go
// ManualTransactionExample shows explicit transaction control
func ManualTransactionExample(db *gorm.DB) error {
    // Begin a new transaction
    tx := db.Begin()

    // Check for errors when beginning transaction
    if tx.Error != nil {
        return tx.Error
    }

    // Defer rollback - will be ignored if transaction is committed
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
            panic(r) // Re-throw after rollback
        }
    }()

    // Perform operations
    if err := tx.Create(&User{Email: "test@example.com"}).Error; err != nil {
        tx.Rollback()
        return err
    }

    if err := tx.Create(&Profile{UserID: 1, Bio: "Test bio"}).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Commit the transaction
    return tx.Commit().Error
}
```

## Hooks and Callbacks

### Model Hooks

Use hooks to add logic before or after database operations.

```go
// BeforeCreate hook runs before inserting a new record
func (u *User) BeforeCreate(tx *gorm.DB) error {
    // Generate UUID if not set
    if u.UUID == "" {
        u.UUID = uuid.New().String()
    }

    // Validate email format
    if !isValidEmail(u.Email) {
        return errors.New("invalid email format")
    }

    // Hash password if provided in plain text
    if u.Password != "" {
        hash, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
        if err != nil {
            return err
        }
        u.PasswordHash = string(hash)
        u.Password = "" // Clear plain text password
    }

    return nil
}

// AfterCreate hook runs after inserting a new record
func (u *User) AfterCreate(tx *gorm.DB) error {
    // Send welcome email asynchronously
    go sendWelcomeEmail(u.Email)

    // Create audit log
    return tx.Create(&AuditLog{
        Action:    "user_created",
        EntityID:  u.ID,
        Timestamp: time.Now(),
    }).Error
}

// BeforeUpdate hook runs before updating a record
func (u *User) BeforeUpdate(tx *gorm.DB) error {
    // Track changes for audit
    if tx.Statement.Changed("Email") {
        // Log email change
        log.Printf("User %d changing email", u.ID)
    }
    return nil
}

// AfterFind hook runs after querying records
func (u *User) AfterFind(tx *gorm.DB) error {
    // Mask sensitive data
    u.PasswordHash = "[REDACTED]"
    return nil
}

// BeforeDelete hook runs before deleting a record
func (u *User) BeforeDelete(tx *gorm.DB) error {
    // Prevent deletion of admin users
    if u.Role == "admin" {
        return errors.New("cannot delete admin users")
    }
    return nil
}
```

## Best Practices

### Repository Pattern

Implement the repository pattern for clean separation of concerns.

```go
// Repository interface defines the contract for data access
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id uint) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id uint) error
    List(ctx context.Context, opts ListOptions) ([]User, int64, error)
}

// ListOptions contains common pagination and filtering options
type ListOptions struct {
    Page     int
    PageSize int
    OrderBy  string
    Order    string // "asc" or "desc"
    Filters  map[string]interface{}
}

// gormUserRepository implements UserRepository using GORM
type gormUserRepository struct {
    db *gorm.DB
}

// NewUserRepository creates a new GORM-based user repository
func NewUserRepository(db *gorm.DB) UserRepository {
    return &gormUserRepository{db: db}
}
```

### Error Handling

Properly handle and wrap GORM errors for better debugging.

```go
import (
    "errors"
    "gorm.io/gorm"
)

// Custom error types for domain-specific errors
var (
    ErrUserNotFound     = errors.New("user not found")
    ErrDuplicateEmail   = errors.New("email already exists")
    ErrDuplicateUsername = errors.New("username already exists")
)

// HandleGORMError converts GORM errors to domain errors
func HandleGORMError(err error) error {
    if err == nil {
        return nil
    }

    // Check for record not found
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return ErrUserNotFound
    }

    // Check for duplicate key violation (PostgreSQL)
    if strings.Contains(err.Error(), "duplicate key") {
        if strings.Contains(err.Error(), "email") {
            return ErrDuplicateEmail
        }
        if strings.Contains(err.Error(), "username") {
            return ErrDuplicateUsername
        }
    }

    // Return wrapped error for unexpected errors
    return fmt.Errorf("database error: %w", err)
}
```

### Context Usage

Always pass context for timeout and cancellation support.

```go
// FindWithTimeout demonstrates context usage for timeouts
func (r *UserRepository) FindWithTimeout(parentCtx context.Context, id uint) (*User, error) {
    // Create a context with timeout
    ctx, cancel := context.WithTimeout(parentCtx, 5*time.Second)
    defer cancel()

    var user User
    result := r.db.WithContext(ctx).First(&user, id)

    if result.Error != nil {
        if errors.Is(result.Error, context.DeadlineExceeded) {
            return nil, errors.New("query timed out")
        }
        return nil, result.Error
    }

    return &user, nil
}
```

### Connection Health Checks

Implement health checks for production deployments.

```go
// HealthCheck verifies database connectivity
func HealthCheck(db *gorm.DB) error {
    sqlDB, err := db.DB()
    if err != nil {
        return fmt.Errorf("failed to get database instance: %w", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := sqlDB.PingContext(ctx); err != nil {
        return fmt.Errorf("database ping failed: %w", err)
    }

    return nil
}

// GetDBStats returns database connection pool statistics
func GetDBStats(db *gorm.DB) (sql.DBStats, error) {
    sqlDB, err := db.DB()
    if err != nil {
        return sql.DBStats{}, err
    }
    return sqlDB.Stats(), nil
}
```

## Conclusion

GORM is a powerful and flexible ORM for Go that simplifies database operations while providing full control when needed. Key takeaways from this guide:

1. **Configuration Matters**: Set up connection pooling and prepared statements for production use
2. **Use Proper Tags**: Leverage GORM struct tags for constraints, indexes, and column customization
3. **Handle Relationships Correctly**: Choose the right relationship type and use preloading to avoid N+1 queries
4. **Migrations Strategy**: Use AutoMigrate for development and explicit migrations for production
5. **Optimize Queries**: Select only needed fields, use joins when filtering, and process large datasets in batches
6. **Transactions**: Wrap related operations in transactions to maintain data consistency
7. **Error Handling**: Convert GORM errors to domain-specific errors for better application logic
8. **Always Use Context**: Pass context to support timeouts and cancellation

By following these patterns and best practices, you can build robust, performant, and maintainable database layers in your Go applications.

## Further Reading

- [GORM Official Documentation](https://gorm.io/docs/)
- [GORM GitHub Repository](https://github.com/go-gorm/gorm)
- [PostgreSQL Driver for GORM](https://github.com/go-gorm/postgres)
- [golang-migrate for Database Migrations](https://github.com/golang-migrate/migrate)
