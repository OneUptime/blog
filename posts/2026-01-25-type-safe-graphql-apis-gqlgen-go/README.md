# How to Build Type-Safe GraphQL APIs with gqlgen in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, GraphQL, gqlgen, API, Type Safety

Description: Learn how to build production-ready GraphQL APIs in Go using gqlgen, a schema-first code generation library that gives you full type safety without writing boilerplate.

---

If you have worked with GraphQL in other languages, you know the pain of keeping your schema and code in sync. Go's type system is strict, and manually mapping GraphQL types to Go structs gets old fast. That is where gqlgen shines - it generates type-safe Go code directly from your GraphQL schema, catching errors at compile time instead of runtime.

## Why gqlgen Over Other Go GraphQL Libraries

There are several GraphQL libraries for Go, but gqlgen stands out for a few reasons:

- **Schema-first approach** - You write your GraphQL schema, and gqlgen generates the Go types and resolver interfaces
- **Full type safety** - No `interface{}` everywhere, actual Go types that your IDE understands
- **Compile-time validation** - If your resolvers do not match your schema, the code will not compile
- **Plugin system** - Extend code generation for custom needs

Other libraries like graphql-go require you to define your schema in Go code, which can be verbose and harder to share with frontend teams.

## Getting Started

First, set up a new Go project and install gqlgen.

```bash
mkdir graphql-api && cd graphql-api
go mod init github.com/yourname/graphql-api
go get github.com/99designs/gqlgen
```

Initialize gqlgen in your project. This creates the config file and directory structure.

```bash
go run github.com/99designs/gqlgen init
```

This generates several files:

- `gqlgen.yml` - Configuration for code generation
- `graph/schema.graphqls` - Your GraphQL schema
- `graph/schema.resolvers.go` - Where you implement resolver logic
- `graph/model/models_gen.go` - Generated Go types from your schema

## Defining Your Schema

Let's build a simple API for managing tasks. Replace the default schema with something practical.

```graphql
# graph/schema.graphqls

type Task {
  id: ID!
  title: String!
  description: String
  status: TaskStatus!
  createdAt: String!
  assignee: User
}

type User {
  id: ID!
  name: String!
  email: String!
  tasks: [Task!]!
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

type Query {
  tasks(status: TaskStatus): [Task!]!
  task(id: ID!): Task
  users: [User!]!
  user(id: ID!): User
}

type Mutation {
  createTask(input: NewTask!): Task!
  updateTaskStatus(id: ID!, status: TaskStatus!): Task!
  createUser(input: NewUser!): User!
}

input NewTask {
  title: String!
  description: String
  assigneeId: ID
}

input NewUser {
  name: String!
  email: String!
}
```

After changing the schema, regenerate the Go code.

```bash
go run github.com/99designs/gqlgen generate
```

## Implementing Resolvers

gqlgen generates resolver interfaces that you must implement. Here is where your business logic lives.

```go
// graph/resolver.go

package graph

import "github.com/yourname/graphql-api/graph/model"

// Resolver holds dependencies for all resolvers
// Add your database connections, services, etc. here
type Resolver struct {
    tasks map[string]*model.Task
    users map[string]*model.User
}

// NewResolver creates a resolver with initialized storage
func NewResolver() *Resolver {
    return &Resolver{
        tasks: make(map[string]*model.Task),
        users: make(map[string]*model.User),
    }
}
```

Now implement the query resolvers. These map directly to your schema's Query type.

```go
// graph/schema.resolvers.go

package graph

import (
    "context"
    "fmt"
    "time"

    "github.com/google/uuid"
    "github.com/yourname/graphql-api/graph/model"
)

// Tasks returns all tasks, optionally filtered by status
func (r *queryResolver) Tasks(ctx context.Context, status *model.TaskStatus) ([]*model.Task, error) {
    var result []*model.Task

    for _, task := range r.tasks {
        // If status filter provided, only include matching tasks
        if status != nil && task.Status != *status {
            continue
        }
        result = append(result, task)
    }

    return result, nil
}

// Task returns a single task by ID
func (r *queryResolver) Task(ctx context.Context, id string) (*model.Task, error) {
    task, exists := r.tasks[id]
    if !exists {
        return nil, nil // GraphQL handles null for optional fields
    }
    return task, nil
}

// Users returns all users
func (r *queryResolver) Users(ctx context.Context) ([]*model.User, error) {
    var result []*model.User
    for _, user := range r.users {
        result = append(result, user)
    }
    return result, nil
}

// User returns a single user by ID
func (r *queryResolver) User(ctx context.Context, id string) (*model.User, error) {
    user, exists := r.users[id]
    if !exists {
        return nil, nil
    }
    return user, nil
}
```

Now the mutation resolvers for creating and updating data.

```go
// CreateTask adds a new task
func (r *mutationResolver) CreateTask(ctx context.Context, input model.NewTask) (*model.Task, error) {
    task := &model.Task{
        ID:          uuid.New().String(),
        Title:       input.Title,
        Description: input.Description,
        Status:      model.TaskStatusTodo,
        CreatedAt:   time.Now().Format(time.RFC3339),
    }

    // Link to assignee if provided
    if input.AssigneeID != nil {
        if _, exists := r.users[*input.AssigneeID]; !exists {
            return nil, fmt.Errorf("user with id %s not found", *input.AssigneeID)
        }
        task.Assignee = r.users[*input.AssigneeID]
    }

    r.tasks[task.ID] = task
    return task, nil
}

// UpdateTaskStatus changes a task's status
func (r *mutationResolver) UpdateTaskStatus(ctx context.Context, id string, status model.TaskStatus) (*model.Task, error) {
    task, exists := r.tasks[id]
    if !exists {
        return nil, fmt.Errorf("task with id %s not found", id)
    }

    task.Status = status
    return task, nil
}

// CreateUser adds a new user
func (r *mutationResolver) CreateUser(ctx context.Context, input model.NewUser) (*model.User, error) {
    user := &model.User{
        ID:    uuid.New().String(),
        Name:  input.Name,
        Email: input.Email,
    }

    r.users[user.ID] = user
    return user, nil
}
```

## Field Resolvers for Relationships

When a type has fields that require additional logic or database lookups, you implement field resolvers. gqlgen generates these when it detects relationships.

```go
// graph/schema.resolvers.go

// Tasks resolver for User type - fetches tasks assigned to this user
func (r *userResolver) Tasks(ctx context.Context, obj *model.User) ([]*model.Task, error) {
    var userTasks []*model.Task

    for _, task := range r.tasks {
        if task.Assignee != nil && task.Assignee.ID == obj.ID {
            userTasks = append(userTasks, task)
        }
    }

    return userTasks, nil
}
```

## Setting Up the Server

Wire everything together in your main function.

```go
// server.go

package main

import (
    "log"
    "net/http"
    "os"

    "github.com/99designs/gqlgen/graphql/handler"
    "github.com/99designs/gqlgen/graphql/playground"
    "github.com/yourname/graphql-api/graph"
)

const defaultPort = "8080"

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = defaultPort
    }

    // Create resolver with dependencies
    resolver := graph.NewResolver()

    // Create the GraphQL server
    srv := handler.NewDefaultServer(
        graph.NewExecutableSchema(graph.Config{Resolvers: resolver}),
    )

    // GraphQL Playground for testing queries in browser
    http.Handle("/", playground.Handler("GraphQL playground", "/query"))
    http.Handle("/query", srv)

    log.Printf("GraphQL playground available at http://localhost:%s/", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

Run the server and open http://localhost:8080 to access the GraphQL Playground.

```bash
go run server.go
```

## Adding Middleware and Context

Real applications need authentication, logging, and other middleware. Pass data through context to your resolvers.

```go
// middleware.go

package main

import (
    "context"
    "net/http"
)

type contextKey string

const userCtxKey contextKey = "user"

// AuthMiddleware extracts user info from request headers
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")

        if token == "" {
            next.ServeHTTP(w, r)
            return
        }

        // Validate token and get user - simplified for example
        user := validateTokenAndGetUser(token)
        if user != nil {
            ctx := context.WithValue(r.Context(), userCtxKey, user)
            r = r.WithContext(ctx)
        }

        next.ServeHTTP(w, r)
    })
}

// GetUserFromContext retrieves the authenticated user
func GetUserFromContext(ctx context.Context) *User {
    user, _ := ctx.Value(userCtxKey).(*User)
    return user
}
```

Use the middleware in your server setup.

```go
http.Handle("/query", AuthMiddleware(srv))
```

## Error Handling Best Practices

gqlgen lets you return errors from resolvers that become GraphQL errors. For better client experience, use custom error types.

```go
// graph/errors.go

package graph

import (
    "context"
    "fmt"

    "github.com/99designs/gqlgen/graphql"
    "github.com/vektah/gqlparser/v2/gqlerror"
)

// NotFoundError represents a resource not found
type NotFoundError struct {
    Resource string
    ID       string
}

func (e NotFoundError) Error() string {
    return fmt.Sprintf("%s with id %s not found", e.Resource, e.ID)
}

// Present the error as a GraphQL error with extensions
func (r *queryResolver) Task(ctx context.Context, id string) (*model.Task, error) {
    task, exists := r.tasks[id]
    if !exists {
        graphql.AddError(ctx, &gqlerror.Error{
            Message: "Task not found",
            Extensions: map[string]interface{}{
                "code": "NOT_FOUND",
                "id":   id,
            },
        })
        return nil, nil
    }
    return task, nil
}
```

## Common Pitfalls to Avoid

**1. Not regenerating after schema changes** - Always run `go generate ./...` after modifying your schema. Forgetting this leads to confusing compile errors.

**2. Circular imports** - Keep your model package separate from resolvers. gqlgen's generated code can cause import cycles if you are not careful about package structure.

**3. N+1 query problems** - When you have relationships like User.Tasks, each user triggers a separate database query. Use dataloaders to batch these queries.

```go
// Example dataloader setup for batching
// go get github.com/graph-gophers/dataloader/v7

loader := dataloader.NewBatchedLoader(func(ctx context.Context, keys []string) []*dataloader.Result[*model.User] {
    // Batch fetch all users by IDs in a single query
    users := fetchUsersByIDs(keys)
    // Return results in same order as keys
    // ...
})
```

**4. Missing null checks** - GraphQL nullable fields become Go pointers. Always check for nil before dereferencing.

## Configuration Tips

The `gqlgen.yml` file controls code generation. Here are useful settings.

```yaml
# gqlgen.yml

schema:
  - graph/*.graphqls

exec:
  filename: graph/generated.go
  package: graph

model:
  filename: graph/model/models_gen.go
  package: model

resolver:
  layout: follow-schema
  dir: graph
  package: graph

# Map GraphQL scalars to Go types
models:
  ID:
    model:
      - github.com/99designs/gqlgen/graphql.ID
  DateTime:
    model:
      - github.com/99designs/gqlgen/graphql.Time
```

## Wrapping Up

gqlgen takes the tedious parts of building GraphQL APIs in Go and automates them. You get full type safety, your IDE can autocomplete everything, and schema changes immediately show you what resolver code needs updating.

The schema-first approach also makes it easier to collaborate with frontend teams - they can review the GraphQL schema without needing to understand Go code.

For production use, add proper database integration, authentication middleware, and dataloaders for query optimization. The foundation you have built here scales well as your API grows.
