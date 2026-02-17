# How to Perform CRUD Operations on Firestore Documents Using the Go Client Library for Firestore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Go, CRUD, NoSQL, Database

Description: Perform CRUD operations on Firestore documents using the Go client library, including document creation, reads, updates, deletes, queries, and batch operations.

---

Firestore is Google's serverless document database. It scales automatically, supports real-time listeners, and has a straightforward data model based on collections and documents. The Go client library for Firestore gives you a typed, idiomatic way to interact with Firestore from Go applications.

In this post, I will cover all the CRUD operations you need to work with Firestore from Go, including queries, batch writes, and transactions.

## Setting Up the Client

Add the Firestore client library to your Go module:

```bash
go get cloud.google.com/go/firestore
```

Create a Firestore client:

```go
package main

import (
    "context"
    "log"

    "cloud.google.com/go/firestore"
)

// CreateClient initializes a Firestore client
// It uses application default credentials automatically
func CreateClient(ctx context.Context, projectID string) (*firestore.Client, error) {
    client, err := firestore.NewClient(ctx, projectID)
    if err != nil {
        return nil, err
    }
    return client, nil
}

func main() {
    ctx := context.Background()

    client, err := CreateClient(ctx, "my-project-id")
    if err != nil {
        log.Fatalf("Failed to create Firestore client: %v", err)
    }
    // Always close the client when done
    defer client.Close()
}
```

## Defining the Data Model

In Go, you use structs with `firestore` tags to map to Firestore documents:

```go
// Product represents a document in the products collection
type Product struct {
    ID          string    `firestore:"-"`            // Excluded from document data
    Name        string    `firestore:"name"`
    Description string    `firestore:"description"`
    Price       float64   `firestore:"price"`
    Category    string    `firestore:"category"`
    Tags        []string  `firestore:"tags"`
    InStock     bool      `firestore:"in_stock"`
    CreatedAt   time.Time `firestore:"created_at"`
    UpdatedAt   time.Time `firestore:"updated_at"`
}
```

The `firestore:"-"` tag excludes the ID field from the document data since the ID is part of the document reference, not the document itself.

## Create Operations

```go
// CreateProduct adds a new product document to Firestore
func CreateProduct(ctx context.Context, client *firestore.Client, product Product) (string, error) {
    // Let Firestore generate the document ID
    docRef, _, err := client.Collection("products").Add(ctx, product)
    if err != nil {
        return "", fmt.Errorf("failed to create product: %w", err)
    }
    return docRef.ID, nil
}

// CreateProductWithID creates a product with a specific document ID
func CreateProductWithID(ctx context.Context, client *firestore.Client,
    id string, product Product) error {

    _, err := client.Collection("products").Doc(id).Set(ctx, product)
    if err != nil {
        return fmt.Errorf("failed to create product with ID %s: %w", id, err)
    }
    return nil
}

// CreateIfNotExists creates a document only if it does not already exist
func CreateIfNotExists(ctx context.Context, client *firestore.Client,
    id string, product Product) error {

    _, err := client.Collection("products").Doc(id).Create(ctx, product)
    if err != nil {
        // Returns an error if the document already exists
        return fmt.Errorf("document already exists or creation failed: %w", err)
    }
    return nil
}
```

## Read Operations

```go
// GetProduct retrieves a single product by ID
func GetProduct(ctx context.Context, client *firestore.Client, id string) (*Product, error) {
    doc, err := client.Collection("products").Doc(id).Get(ctx)
    if err != nil {
        return nil, fmt.Errorf("failed to get product %s: %w", id, err)
    }

    var product Product
    if err := doc.DataTo(&product); err != nil {
        return nil, fmt.Errorf("failed to decode product: %w", err)
    }
    product.ID = doc.Ref.ID

    return &product, nil
}

// ListAllProducts retrieves all documents in the products collection
func ListAllProducts(ctx context.Context, client *firestore.Client) ([]Product, error) {
    docs, err := client.Collection("products").Documents(ctx).GetAll()
    if err != nil {
        return nil, fmt.Errorf("failed to list products: %w", err)
    }

    products := make([]Product, 0, len(docs))
    for _, doc := range docs {
        var product Product
        if err := doc.DataTo(&product); err != nil {
            log.Printf("Skipping malformed document %s: %v", doc.Ref.ID, err)
            continue
        }
        product.ID = doc.Ref.ID
        products = append(products, product)
    }

    return products, nil
}

// ListProductsByCategory queries products filtered by category
func ListProductsByCategory(ctx context.Context, client *firestore.Client,
    category string) ([]Product, error) {

    docs, err := client.Collection("products").
        Where("category", "==", category).
        OrderBy("name", firestore.Asc).
        Documents(ctx).
        GetAll()

    if err != nil {
        return nil, fmt.Errorf("failed to query products: %w", err)
    }

    products := make([]Product, 0, len(docs))
    for _, doc := range docs {
        var product Product
        if err := doc.DataTo(&product); err != nil {
            continue
        }
        product.ID = doc.Ref.ID
        products = append(products, product)
    }

    return products, nil
}

// ListProductsPaginated retrieves products with pagination
func ListProductsPaginated(ctx context.Context, client *firestore.Client,
    pageSize int, lastDocID string) ([]Product, error) {

    query := client.Collection("products").
        OrderBy("created_at", firestore.Desc).
        Limit(pageSize)

    // If we have a cursor, start after the last document
    if lastDocID != "" {
        lastDoc, err := client.Collection("products").Doc(lastDocID).Get(ctx)
        if err != nil {
            return nil, fmt.Errorf("failed to get cursor document: %w", err)
        }
        query = query.StartAfter(lastDoc)
    }

    docs, err := query.Documents(ctx).GetAll()
    if err != nil {
        return nil, fmt.Errorf("failed to list products: %w", err)
    }

    products := make([]Product, 0, len(docs))
    for _, doc := range docs {
        var product Product
        if err := doc.DataTo(&product); err != nil {
            continue
        }
        product.ID = doc.Ref.ID
        products = append(products, product)
    }

    return products, nil
}
```

## Update Operations

```go
// UpdateProduct replaces the entire document with new data
func UpdateProduct(ctx context.Context, client *firestore.Client,
    id string, product Product) error {

    product.UpdatedAt = time.Now()
    _, err := client.Collection("products").Doc(id).Set(ctx, product)
    if err != nil {
        return fmt.Errorf("failed to update product %s: %w", id, err)
    }
    return nil
}

// UpdateProductFields updates only specific fields
func UpdateProductFields(ctx context.Context, client *firestore.Client,
    id string, updates map[string]interface{}) error {

    // Build a list of field updates
    var fieldUpdates []firestore.Update
    for field, value := range updates {
        fieldUpdates = append(fieldUpdates, firestore.Update{
            Path:  field,
            Value: value,
        })
    }

    // Always update the updated_at timestamp
    fieldUpdates = append(fieldUpdates, firestore.Update{
        Path:  "updated_at",
        Value: time.Now(),
    })

    _, err := client.Collection("products").Doc(id).Update(ctx, fieldUpdates)
    if err != nil {
        return fmt.Errorf("failed to update fields for product %s: %w", id, err)
    }
    return nil
}

// IncrementStock atomically increments the stock count
func IncrementStock(ctx context.Context, client *firestore.Client,
    id string, quantity int) error {

    _, err := client.Collection("products").Doc(id).Update(ctx, []firestore.Update{
        {Path: "stock_count", Value: firestore.Increment(quantity)},
        {Path: "updated_at", Value: time.Now()},
    })
    if err != nil {
        return fmt.Errorf("failed to increment stock: %w", err)
    }
    return nil
}
```

## Delete Operations

```go
// DeleteProduct removes a product document
func DeleteProduct(ctx context.Context, client *firestore.Client, id string) error {
    _, err := client.Collection("products").Doc(id).Delete(ctx)
    if err != nil {
        return fmt.Errorf("failed to delete product %s: %w", id, err)
    }
    return nil
}

// DeleteField removes a specific field from a document
func DeleteField(ctx context.Context, client *firestore.Client,
    id string, fieldName string) error {

    _, err := client.Collection("products").Doc(id).Update(ctx, []firestore.Update{
        {Path: fieldName, Value: firestore.Delete},
    })
    if err != nil {
        return fmt.Errorf("failed to delete field %s: %w", fieldName, err)
    }
    return nil
}
```

## Batch Operations

Batch writes let you perform multiple operations atomically:

```go
// BatchCreateProducts creates multiple products in a single atomic operation
func BatchCreateProducts(ctx context.Context, client *firestore.Client,
    products []Product) error {

    batch := client.Batch()

    for _, product := range products {
        product.CreatedAt = time.Now()
        product.UpdatedAt = time.Now()
        ref := client.Collection("products").NewDoc()
        batch.Set(ref, product)
    }

    // Commit all operations atomically
    _, err := batch.Commit(ctx)
    if err != nil {
        return fmt.Errorf("batch create failed: %w", err)
    }

    return nil
}
```

## Transactions

For read-then-write operations that need consistency:

```go
// TransferStock moves stock between two products atomically
func TransferStock(ctx context.Context, client *firestore.Client,
    fromID string, toID string, quantity int) error {

    return client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
        // Read both documents within the transaction
        fromDoc, err := tx.Get(client.Collection("products").Doc(fromID))
        if err != nil {
            return fmt.Errorf("failed to read source product: %w", err)
        }

        toDoc, err := tx.Get(client.Collection("products").Doc(toID))
        if err != nil {
            return fmt.Errorf("failed to read destination product: %w", err)
        }

        // Check available stock
        fromStock := fromDoc.Data()["stock_count"].(int64)
        if fromStock < int64(quantity) {
            return fmt.Errorf("insufficient stock: have %d, need %d", fromStock, quantity)
        }

        toStock := toDoc.Data()["stock_count"].(int64)

        // Update both documents
        tx.Update(client.Collection("products").Doc(fromID), []firestore.Update{
            {Path: "stock_count", Value: fromStock - int64(quantity)},
        })

        tx.Update(client.Collection("products").Doc(toID), []firestore.Update{
            {Path: "stock_count", Value: toStock + int64(quantity)},
        })

        return nil
    })
}
```

## HTTP Handlers

Tie it together with HTTP handlers:

```go
// Handler struct holds the Firestore client
type Handler struct {
    client *firestore.Client
}

func (h *Handler) handleCreateProduct(w http.ResponseWriter, r *http.Request) {
    var product Product
    if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
        http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
        return
    }

    product.CreatedAt = time.Now()
    product.UpdatedAt = time.Now()

    id, err := CreateProduct(r.Context(), h.client, product)
    if err != nil {
        http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err), http.StatusInternalServerError)
        return
    }

    product.ID = id
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(product)
}
```

## Wrapping Up

The Go Firestore client library provides a clean, typed interface for document operations. Use `Add` for auto-generated IDs, `Set` for replacing documents, `Update` for partial updates, and `Delete` for removal. Batch writes give you atomic multi-document operations, and transactions ensure read-write consistency. The struct-based mapping with `firestore` tags makes it natural to work with Go types. For production applications, always handle the `not found` case on reads and use transactions when you need to read then write based on the current state of a document.
