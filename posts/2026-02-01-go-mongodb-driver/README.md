# How to Use MongoDB with Go Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, MongoDB, Database, NoSQL, CRUD

Description: A practical guide to using the official MongoDB Go driver for database operations with best practices.

---

MongoDB pairs well with Go for building performant backend services. The official MongoDB Go driver gives you full access to MongoDB features while staying idiomatic to Go's design philosophy. This guide walks through everything you need to get productive - from basic CRUD operations to aggregation pipelines and connection pooling.

## Installing the MongoDB Go Driver

First, initialize your Go module and install the driver:

```bash
go mod init your-project
go get go.mongodb.org/mongo-driver/mongo
go get go.mongodb.org/mongo-driver/bson
```

The driver consists of two main packages: `mongo` for database operations and `bson` for document encoding/decoding.

## Connecting to MongoDB

Connection management is where many projects get things wrong. You want a single client instance shared across your application - not a new connection per request.

Here's a production-ready connection setup:

```go
package main

import (
    "context"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "go.mongodb.org/mongo-driver/mongo/readpref"
)

// MongoClient holds our database connection
// Keep this as a package-level variable or inject it through dependency injection
var MongoClient *mongo.Client

func ConnectMongoDB(uri string) (*mongo.Client, error) {
    // Create a context with timeout for the connection attempt
    // 10 seconds is reasonable for initial connection
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // Configure client options
    // ServerAPIOptions ensures compatibility with MongoDB Atlas
    clientOptions := options.Client().
        ApplyURI(uri).
        SetServerAPIOptions(options.ServerAPI(options.ServerAPIVersion1))

    // Connect to MongoDB
    client, err := mongo.Connect(ctx, clientOptions)
    if err != nil {
        return nil, err
    }

    // Ping the database to verify the connection works
    // This catches issues like wrong credentials or network problems early
    if err := client.Ping(ctx, readpref.Primary()); err != nil {
        return nil, err
    }

    log.Println("Connected to MongoDB")
    return client, nil
}

func main() {
    client, err := ConnectMongoDB("mongodb://localhost:27017")
    if err != nil {
        log.Fatal(err)
    }
    MongoClient = client

    // Always disconnect when your application shuts down
    defer func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        if err := client.Disconnect(ctx); err != nil {
            log.Printf("Error disconnecting from MongoDB: %v", err)
        }
    }()

    // Your application logic here
}
```

## Connection Pooling Configuration

The Go driver manages connection pooling automatically, but you should tune it based on your workload. The defaults work for small applications, but high-traffic services need adjustments.

```go
// Configure connection pool settings based on your application's needs
// These values work well for a service handling ~1000 requests/second
clientOptions := options.Client().
    ApplyURI(uri).
    SetMaxPoolSize(100).           // Maximum connections in the pool
    SetMinPoolSize(10).            // Minimum connections to keep open
    SetMaxConnIdleTime(30*time.Second). // Close idle connections after this duration
    SetConnectTimeout(10*time.Second).  // Timeout for establishing new connections
    SetSocketTimeout(30*time.Second)    // Timeout for socket read/write operations
```

A few rules of thumb: set `MaxPoolSize` to roughly the number of concurrent database operations you expect. If you have 50 goroutines all hitting MongoDB simultaneously, you need at least 50 connections. Setting `MinPoolSize` keeps connections warm and avoids the latency hit of establishing new connections during traffic spikes.

## Understanding BSON Types

MongoDB stores documents in BSON format. The Go driver provides several ways to work with BSON data.

```go
import "go.mongodb.org/mongo-driver/bson"

// bson.D - Ordered document (slice of key-value pairs)
// Use this when order matters, like in aggregation pipelines
doc := bson.D{
    {Key: "name", Value: "John"},
    {Key: "age", Value: 30},
}

// bson.M - Unordered document (map)
// Use this for simple queries where order doesn't matter
filter := bson.M{"status": "active"}

// bson.A - Array type
// Use this for array values in documents
tags := bson.A{"golang", "mongodb", "tutorial"}

// bson.E - Single element (used within bson.D)
element := bson.E{Key: "country", Value: "USA"}
```

For struct mapping, use struct tags to control how fields are encoded:

```go
// Define a struct that maps to your MongoDB documents
// The bson tag controls the field name in MongoDB
// omitempty excludes zero values from the document
type User struct {
    ID        primitive.ObjectID `bson:"_id,omitempty"`
    Email     string             `bson:"email"`
    Name      string             `bson:"name"`
    Age       int                `bson:"age,omitempty"`
    CreatedAt time.Time          `bson:"created_at"`
    UpdatedAt time.Time          `bson:"updated_at"`
    Active    bool               `bson:"active"`
}
```

## CRUD Operations

Let's build a complete example with all CRUD operations. We'll create a `UserRepository` that encapsulates database logic.

### Insert Operations

```go
package repository

import (
    "context"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
)

type UserRepository struct {
    collection *mongo.Collection
}

// NewUserRepository creates a repository instance
// Pass the MongoDB client and it returns a ready-to-use repository
func NewUserRepository(client *mongo.Client) *UserRepository {
    collection := client.Database("myapp").Collection("users")
    return &UserRepository{collection: collection}
}

// CreateUser inserts a single user document
// Returns the inserted ID on success
func (r *UserRepository) CreateUser(ctx context.Context, user *User) (primitive.ObjectID, error) {
    // Set timestamps before inserting
    now := time.Now()
    user.CreatedAt = now
    user.UpdatedAt = now

    result, err := r.collection.InsertOne(ctx, user)
    if err != nil {
        return primitive.NilObjectID, err
    }

    // The InsertedID is an interface{}, cast it to ObjectID
    return result.InsertedID.(primitive.ObjectID), nil
}

// CreateUsers inserts multiple user documents in a single operation
// Batch inserts are much faster than individual inserts
func (r *UserRepository) CreateUsers(ctx context.Context, users []User) ([]primitive.ObjectID, error) {
    // Convert to []interface{} as required by InsertMany
    docs := make([]interface{}, len(users))
    now := time.Now()
    for i, user := range users {
        user.CreatedAt = now
        user.UpdatedAt = now
        docs[i] = user
    }

    result, err := r.collection.InsertMany(ctx, docs)
    if err != nil {
        return nil, err
    }

    // Extract the ObjectIDs from the result
    ids := make([]primitive.ObjectID, len(result.InsertedIDs))
    for i, id := range result.InsertedIDs {
        ids[i] = id.(primitive.ObjectID)
    }
    return ids, nil
}
```

### Read Operations

```go
// FindByID retrieves a single user by their ObjectID
func (r *UserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*User, error) {
    var user User
    filter := bson.M{"_id": id}

    err := r.collection.FindOne(ctx, filter).Decode(&user)
    if err != nil {
        // Check if it's a "not found" error specifically
        if err == mongo.ErrNoDocuments {
            return nil, nil // Return nil without error for not found
        }
        return nil, err
    }

    return &user, nil
}

// FindByEmail looks up a user by their email address
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
    var user User
    filter := bson.M{"email": email}

    err := r.collection.FindOne(ctx, filter).Decode(&user)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            return nil, nil
        }
        return nil, err
    }

    return &user, nil
}

// FindActiveUsers returns all users where active is true
// Uses a cursor to handle potentially large result sets
func (r *UserRepository) FindActiveUsers(ctx context.Context) ([]User, error) {
    filter := bson.M{"active": true}

    // Find returns a cursor that you iterate over
    cursor, err := r.collection.Find(ctx, filter)
    if err != nil {
        return nil, err
    }
    // Always close the cursor when done
    defer cursor.Close(ctx)

    // Decode all documents into the slice
    var users []User
    if err := cursor.All(ctx, &users); err != nil {
        return nil, err
    }

    return users, nil
}

// FindWithPagination returns a page of users with sorting
// Pagination prevents loading too much data into memory
func (r *UserRepository) FindWithPagination(ctx context.Context, page, pageSize int64) ([]User, error) {
    skip := (page - 1) * pageSize

    // Configure find options for pagination and sorting
    opts := options.Find().
        SetSkip(skip).
        SetLimit(pageSize).
        SetSort(bson.D{{Key: "created_at", Value: -1}}) // Sort by newest first

    cursor, err := r.collection.Find(ctx, bson.M{}, opts)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var users []User
    if err := cursor.All(ctx, &users); err != nil {
        return nil, err
    }

    return users, nil
}
```

### Update Operations

```go
// UpdateUser modifies an existing user document
// Returns the number of documents modified
func (r *UserRepository) UpdateUser(ctx context.Context, id primitive.ObjectID, updates bson.M) (int64, error) {
    filter := bson.M{"_id": id}

    // Always update the updated_at timestamp
    updates["updated_at"] = time.Now()

    // $set only updates the specified fields, leaving others unchanged
    update := bson.M{"$set": updates}

    result, err := r.collection.UpdateOne(ctx, filter, update)
    if err != nil {
        return 0, err
    }

    return result.ModifiedCount, nil
}

// DeactivateUser sets active to false for a specific user
func (r *UserRepository) DeactivateUser(ctx context.Context, id primitive.ObjectID) error {
    filter := bson.M{"_id": id}
    update := bson.M{
        "$set": bson.M{
            "active":     false,
            "updated_at": time.Now(),
        },
    }

    _, err := r.collection.UpdateOne(ctx, filter, update)
    return err
}

// IncrementLoginCount uses $inc to atomically increment a counter
// Atomic operations prevent race conditions in concurrent environments
func (r *UserRepository) IncrementLoginCount(ctx context.Context, id primitive.ObjectID) error {
    filter := bson.M{"_id": id}
    update := bson.M{
        "$inc": bson.M{"login_count": 1},
        "$set": bson.M{"last_login": time.Now()},
    }

    _, err := r.collection.UpdateOne(ctx, filter, update)
    return err
}
```

### Delete Operations

```go
// DeleteUser removes a user document by ID
func (r *UserRepository) DeleteUser(ctx context.Context, id primitive.ObjectID) error {
    filter := bson.M{"_id": id}
    _, err := r.collection.DeleteOne(ctx, filter)
    return err
}

// DeleteInactiveUsers removes all users who haven't logged in for 90 days
// Be careful with DeleteMany - always test your filter first with Find
func (r *UserRepository) DeleteInactiveUsers(ctx context.Context) (int64, error) {
    cutoff := time.Now().AddDate(0, 0, -90)
    filter := bson.M{
        "last_login": bson.M{"$lt": cutoff},
    }

    result, err := r.collection.DeleteMany(ctx, filter)
    if err != nil {
        return 0, err
    }

    return result.DeletedCount, nil
}
```

## Creating Indexes

Indexes dramatically improve query performance. Create them during application startup or through database migrations.

```go
// CreateIndexes sets up the indexes your application needs
// Run this once during application initialization
func (r *UserRepository) CreateIndexes(ctx context.Context) error {
    // Define the indexes we need
    indexes := []mongo.IndexModel{
        // Unique index on email - prevents duplicate emails
        {
            Keys:    bson.D{{Key: "email", Value: 1}},
            Options: options.Index().SetUnique(true),
        },
        // Compound index for queries filtering by active status and sorting by created_at
        {
            Keys: bson.D{
                {Key: "active", Value: 1},
                {Key: "created_at", Value: -1},
            },
        },
        // TTL index - automatically deletes documents after 30 days
        // Useful for session data or temporary records
        {
            Keys:    bson.D{{Key: "expires_at", Value: 1}},
            Options: options.Index().SetExpireAfterSeconds(0),
        },
    }

    // CreateMany creates all indexes in one call
    _, err := r.collection.Indexes().CreateMany(ctx, indexes)
    return err
}
```

## Aggregation Pipelines

Aggregation pipelines let you process and transform data within MongoDB. They're powerful for analytics and complex queries.

```go
// GetUserStats returns statistics about users by country
// Aggregation pipelines process documents through multiple stages
func (r *UserRepository) GetUserStats(ctx context.Context) ([]bson.M, error) {
    // Each stage transforms the documents before passing to the next stage
    pipeline := mongo.Pipeline{
        // Stage 1: Filter to only active users
        {{Key: "$match", Value: bson.M{"active": true}}},

        // Stage 2: Group by country and calculate stats
        {{Key: "$group", Value: bson.D{
            {Key: "_id", Value: "$country"},
            {Key: "total_users", Value: bson.M{"$sum": 1}},
            {Key: "avg_age", Value: bson.M{"$avg": "$age"}},
            {Key: "oldest", Value: bson.M{"$max": "$age"}},
        }}},

        // Stage 3: Sort by total users descending
        {{Key: "$sort", Value: bson.D{{Key: "total_users", Value: -1}}}},

        // Stage 4: Limit to top 10 countries
        {{Key: "$limit", Value: 10}},
    }

    cursor, err := r.collection.Aggregate(ctx, pipeline)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var results []bson.M
    if err := cursor.All(ctx, &results); err != nil {
        return nil, err
    }

    return results, nil
}

// GetRecentSignupsByDay groups signups by day for the last 30 days
func (r *UserRepository) GetRecentSignupsByDay(ctx context.Context) ([]bson.M, error) {
    thirtyDaysAgo := time.Now().AddDate(0, 0, -30)

    pipeline := mongo.Pipeline{
        // Match users created in the last 30 days
        {{Key: "$match", Value: bson.M{
            "created_at": bson.M{"$gte": thirtyDaysAgo},
        }}},

        // Group by date (stripping time component)
        {{Key: "$group", Value: bson.D{
            {Key: "_id", Value: bson.M{
                "$dateToString": bson.M{
                    "format": "%Y-%m-%d",
                    "date":   "$created_at",
                },
            }},
            {Key: "count", Value: bson.M{"$sum": 1}},
        }}},

        // Sort by date
        {{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
    }

    cursor, err := r.collection.Aggregate(ctx, pipeline)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var results []bson.M
    if err := cursor.All(ctx, &results); err != nil {
        return nil, err
    }

    return results, nil
}
```

## Error Handling

Proper error handling makes your application more resilient. The MongoDB driver provides specific error types you can check.

```go
import (
    "errors"
    "go.mongodb.org/mongo-driver/mongo"
)

// HandleMongoError processes MongoDB errors and returns appropriate responses
func HandleMongoError(err error) error {
    if err == nil {
        return nil
    }

    // Check for "no documents found" - this often isn't a real error
    if errors.Is(err, mongo.ErrNoDocuments) {
        return ErrNotFound // Your custom error
    }

    // Check for duplicate key error (unique constraint violation)
    var writeErr mongo.WriteException
    if errors.As(err, &writeErr) {
        for _, we := range writeErr.WriteErrors {
            // Error code 11000 is duplicate key
            if we.Code == 11000 {
                return ErrDuplicateKey // Your custom error
            }
        }
    }

    // Check for timeout errors
    if mongo.IsTimeout(err) {
        return ErrTimeout // Your custom error
    }

    // Check for network errors
    if mongo.IsNetworkError(err) {
        return ErrNetworkFailure // Your custom error
    }

    // Return the original error for unexpected cases
    return err
}
```

## Transactions

When you need to update multiple documents atomically, use transactions. They ensure all-or-nothing behavior.

```go
// TransferCredits moves credits from one user to another atomically
// If any step fails, all changes are rolled back
func (r *UserRepository) TransferCredits(ctx context.Context, fromID, toID primitive.ObjectID, amount int) error {
    // Start a session for the transaction
    session, err := r.collection.Database().Client().StartSession()
    if err != nil {
        return err
    }
    defer session.EndSession(ctx)

    // Define the transaction logic
    _, err = session.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
        // Deduct from sender
        _, err := r.collection.UpdateOne(sessCtx,
            bson.M{"_id": fromID, "credits": bson.M{"$gte": amount}},
            bson.M{"$inc": bson.M{"credits": -amount}},
        )
        if err != nil {
            return nil, err
        }

        // Add to recipient
        _, err = r.collection.UpdateOne(sessCtx,
            bson.M{"_id": toID},
            bson.M{"$inc": bson.M{"credits": amount}},
        )
        if err != nil {
            return nil, err
        }

        return nil, nil
    })

    return err
}
```

## Context Best Practices

Every MongoDB operation should receive a context with a timeout. This prevents operations from hanging indefinitely.

```go
// Always create a context with timeout for database operations
// 5 seconds is reasonable for most CRUD operations
func (r *UserRepository) FindByIDWithTimeout(id primitive.ObjectID) (*User, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    return r.FindByID(ctx, id)
}

// For HTTP handlers, use the request context
// This automatically cancels the query if the client disconnects
func GetUserHandler(w http.ResponseWriter, r *http.Request) {
    // r.Context() inherits the request's deadline and cancellation
    user, err := repo.FindByID(r.Context(), userID)
    // ...
}
```

## Putting It All Together

Here's how your main application might look:

```go
func main() {
    // Connect to MongoDB
    client, err := ConnectMongoDB(os.Getenv("MONGODB_URI"))
    if err != nil {
        log.Fatal(err)
    }
    defer client.Disconnect(context.Background())

    // Create repository
    userRepo := NewUserRepository(client)

    // Create indexes on startup
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    if err := userRepo.CreateIndexes(ctx); err != nil {
        log.Printf("Warning: failed to create indexes: %v", err)
    }

    // Start your HTTP server or application
    // ...
}
```

The MongoDB Go driver is straightforward once you understand the patterns. Keep your connection pooling configured properly, always use contexts with timeouts, create indexes for your queries, and handle errors appropriately. These practices will serve you well as your application scales.

---

*Monitor MongoDB queries with [OneUptime](https://oneuptime.com) - track slow queries and connection pool health.*
