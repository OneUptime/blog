# How to Use MongoDB with Chi (Go)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, Chi

Description: Build a RESTful API with Go's Chi router and MongoDB, using context-based database injection, middleware, and structured repository pattern.

---

## Chi and MongoDB

Chi is a lightweight, idiomatic Go router that follows the `net/http` standard library interfaces. It is composable, supports middleware chaining, and works well with the repository pattern for MongoDB. Chi's context-based design integrates naturally with MongoDB's context-timeout requirements.

## Project Setup

```bash
mkdir chi-mongo && cd chi-mongo
go mod init chi-mongo
go get github.com/go-chi/chi/v5
go get go.mongodb.org/mongo-driver/mongo
go get go.mongodb.org/mongo-driver/bson
```

## Repository Pattern

Define a repository struct to encapsulate database operations:

`repository/post_repo.go`:

```go
package repository

import (
    "context"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

type Post struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Title     string             `bson:"title" json:"title"`
    Body      string             `bson:"body" json:"body"`
    Published bool               `bson:"published" json:"published"`
    CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
}

type PostRepository struct {
    col *mongo.Collection
}

func NewPostRepository(db *mongo.Database) *PostRepository {
    col := db.Collection("posts")
    // Create indexes
    col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
        Keys:    bson.D{{Key: "title", Value: "text"}},
        Options: options.Index().SetName("text_search"),
    })
    return &PostRepository{col: col}
}

func (r *PostRepository) FindAll(ctx context.Context) ([]Post, error) {
    cursor, err := r.col.Find(ctx, bson.M{"published": true},
        options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(50))
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var posts []Post
    return posts, cursor.All(ctx, &posts)
}

func (r *PostRepository) FindByID(ctx context.Context, id string) (*Post, error) {
    oid, err := primitive.ObjectIDFromHex(id)
    if err != nil {
        return nil, err
    }
    var p Post
    err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&p)
    return &p, err
}

func (r *PostRepository) Insert(ctx context.Context, p *Post) error {
    p.ID = primitive.NewObjectID()
    p.CreatedAt = time.Now()
    _, err := r.col.InsertOne(ctx, p)
    return err
}
```

## Chi Router with Middleware

`main.go`:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"

    "chi-mongo/repository"
    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    client, err := mongo.Connect(ctx, options.Client().ApplyURI(
        os.Getenv("MONGO_URI"),
    ).SetMaxPoolSize(20))
    if err != nil {
        log.Fatal(err)
    }
    db := client.Database("chiapp")
    repo := repository.NewPostRepository(db)

    r := chi.NewRouter()
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(middleware.Timeout(30 * time.Second))

    r.Get("/posts", func(w http.ResponseWriter, req *http.Request) {
        posts, err := repo.FindAll(req.Context())
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(posts)
    })

    r.Post("/posts", func(w http.ResponseWriter, req *http.Request) {
        var p repository.Post
        if err := json.NewDecoder(req.Body).Decode(&p); err != nil {
            http.Error(w, "invalid body", http.StatusBadRequest)
            return
        }
        if err := repo.Insert(req.Context(), &p); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(p)
    })

    log.Println("Listening on :3000")
    http.ListenAndServe(":3000", r)
}
```

## Summary

Chi and MongoDB work well together through the repository pattern, which separates MongoDB query logic from HTTP handler code and makes unit testing straightforward. Chi's `middleware.Timeout` middleware pairs well with MongoDB's context-based timeout system - both use `context.Context` so timeouts propagate naturally from the HTTP layer down to the database driver. Use BSON struct tags consistently and always validate ObjectID conversions to return proper 400 errors.
