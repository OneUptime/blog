# How to Build a REST API with MongoDB and Go (Gin)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, Gin, REST API, Database

Description: Learn how to build a production-ready REST API using Go with the Gin framework and MongoDB as the backend database.

---

## Why Go and Gin for MongoDB APIs

Go is a high-performance language well-suited for building APIs. The Gin framework provides a fast HTTP router with middleware support, and the official MongoDB Go driver offers first-class support for all MongoDB operations.

## Project Setup

Initialize a Go module and install dependencies:

```bash
mkdir mongodb-gin-api && cd mongodb-gin-api
go mod init github.com/yourname/mongodb-gin-api
go get go.mongodb.org/mongo-driver/mongo
go get github.com/gin-gonic/gin
go get github.com/joho/godotenv
```

## Connecting to MongoDB

Create a `db/mongo.go` file to manage your connection:

```go
package db

import (
    "context"
    "log"
    "os"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client

func Connect() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    client, err := mongo.Connect(ctx, options.Client().ApplyURI(os.Getenv("MONGO_URI")))
    if err != nil {
        log.Fatal("Failed to connect to MongoDB:", err)
    }

    if err = client.Ping(ctx, nil); err != nil {
        log.Fatal("Failed to ping MongoDB:", err)
    }

    Client = client
    log.Println("Connected to MongoDB")
}

func GetCollection(name string) *mongo.Collection {
    return Client.Database(os.Getenv("MONGO_DB")).Collection(name)
}
```

## Defining the Data Model

```go
package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Product struct {
    ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Name     string             `bson:"name" json:"name" binding:"required"`
    Price    float64            `bson:"price" json:"price" binding:"required"`
    Category string             `bson:"category" json:"category"`
}
```

## CRUD Handlers with Gin

```go
package handlers

import (
    "context"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "github.com/yourname/mongodb-gin-api/db"
    "github.com/yourname/mongodb-gin-api/models"
)

func CreateProduct(c *gin.Context) {
    var product models.Product
    if err := c.ShouldBindJSON(&product); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    product.ID = primitive.NewObjectID()
    col := db.GetCollection("products")
    _, err := col.InsertOne(ctx, product)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
        return
    }

    c.JSON(http.StatusCreated, product)
}

func GetProduct(c *gin.Context) {
    id, err := primitive.ObjectIDFromHex(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var product models.Product
    col := db.GetCollection("products")
    err = col.FindOne(ctx, bson.M{"_id": id}).Decode(&product)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
        return
    }

    c.JSON(http.StatusOK, product)
}

func ListProducts(c *gin.Context) {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    col := db.GetCollection("products")
    cursor, err := col.Find(ctx, bson.M{})
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
        return
    }
    defer cursor.Close(ctx)

    var products []models.Product
    if err = cursor.All(ctx, &products); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode products"})
        return
    }

    c.JSON(http.StatusOK, products)
}
```

## Wiring Up Routes

```go
package main

import (
    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
    "github.com/yourname/mongodb-gin-api/db"
    "github.com/yourname/mongodb-gin-api/handlers"
)

func main() {
    godotenv.Load()
    db.Connect()

    r := gin.Default()

    api := r.Group("/api/v1")
    {
        api.POST("/products", handlers.CreateProduct)
        api.GET("/products", handlers.ListProducts)
        api.GET("/products/:id", handlers.GetProduct)
    }

    r.Run(":8080")
}
```

## Testing the API

```bash
# Create a product
curl -X POST http://localhost:8080/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":999.99,"category":"Electronics"}'

# List all products
curl http://localhost:8080/api/v1/products

# Get a specific product
curl http://localhost:8080/api/v1/products/<id>
```

## Error Handling Best Practices

Always use context timeouts with MongoDB operations to prevent hanging requests. Return proper HTTP status codes: 400 for validation errors, 404 for missing documents, and 500 for database errors. Consider using a middleware to handle panics gracefully with `gin.Recovery()`.

## Summary

Building a REST API with Go, Gin, and MongoDB is straightforward with the official Go driver. This setup covers Create and Read operations with proper context management and clean route organization. You can extend it with Update and Delete handlers following the same patterns. Adding authentication middleware, input sanitization, and index creation on frequently queried fields will make the API production-ready.
