# How to Build a Simple ORM from Scratch in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Database, ORM, SQL

Description: Learn how to build a basic ORM in Go using reflection and struct tags to map Go structs to database tables.

---

Object-Relational Mapping (ORM) libraries abstract away the complexity of writing raw SQL queries by allowing developers to work with native language constructs. In this guide, we will build a simple ORM from scratch in Go, covering struct reflection, tag parsing, query generation, and basic CRUD operations.

## Setting Up the Foundation

First, let's define our ORM structure and establish a database connection. We will use the standard `database/sql` package with a PostgreSQL driver.

```go
package orm

import (
    "database/sql"
    "fmt"
    "reflect"
    "strings"

    _ "github.com/lib/pq"
)

// DB wraps the standard sql.DB connection
type DB struct {
    conn *sql.DB
}

// Connect establishes a connection to the database
func Connect(host, port, user, password, dbname string) (*DB, error) {
    // Build the connection string
    connStr := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        host, port, user, password, dbname,
    )

    // Open the database connection
    conn, err := sql.Open("postgres", connStr)
    if err != nil {
        return nil, fmt.Errorf("failed to open connection: %w", err)
    }

    // Verify the connection is alive
    if err := conn.Ping(); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return &DB{conn: conn}, nil
}

// Close terminates the database connection
func (db *DB) Close() error {
    return db.conn.Close()
}
```

## Using Reflection for Struct Inspection

The heart of any ORM is its ability to inspect struct fields at runtime. Go's `reflect` package provides this capability. We will extract field names and their corresponding database column names from struct tags.

```go
// getTableName extracts the table name from a struct
// It looks for a "table" tag on the struct or uses the struct name
func getTableName(model interface{}) string {
    t := reflect.TypeOf(model)

    // Handle pointer types by getting the underlying element
    if t.Kind() == reflect.Ptr {
        t = t.Elem()
    }

    // Convert struct name to lowercase for table name
    return strings.ToLower(t.Name())
}

// fieldInfo holds metadata about a struct field
type fieldInfo struct {
    Name       string       // Go field name
    Column     string       // Database column name
    Value      interface{}  // Field value
    IsPrimary  bool         // Is this the primary key?
}

// getFields extracts field information from a struct using reflection
func getFields(model interface{}) []fieldInfo {
    var fields []fieldInfo

    v := reflect.ValueOf(model)
    t := reflect.TypeOf(model)

    // Handle pointer types
    if v.Kind() == reflect.Ptr {
        v = v.Elem()
        t = t.Elem()
    }

    // Iterate through all struct fields
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        value := v.Field(i)

        // Skip unexported fields
        if !value.CanInterface() {
            continue
        }

        // Parse the db tag to get column name
        dbTag := field.Tag.Get("db")
        if dbTag == "-" {
            continue // Skip fields marked with db:"-"
        }

        // Use field name as column name if no tag specified
        columnName := dbTag
        if columnName == "" {
            columnName = strings.ToLower(field.Name)
        }

        // Check if this is the primary key
        isPrimary := field.Tag.Get("primary") == "true"

        fields = append(fields, fieldInfo{
            Name:      field.Name,
            Column:    columnName,
            Value:     value.Interface(),
            IsPrimary: isPrimary,
        })
    }

    return fields
}
```

## Building Query Strings

With field information extracted, we can now generate SQL queries dynamically. Let's implement functions for INSERT, SELECT, UPDATE, and DELETE operations.

```go
// buildInsertQuery creates an INSERT statement for the given model
func buildInsertQuery(model interface{}) (string, []interface{}) {
    tableName := getTableName(model)
    fields := getFields(model)

    var columns []string
    var placeholders []string
    var values []interface{}

    for i, f := range fields {
        // Skip primary key fields (auto-increment)
        if f.IsPrimary {
            continue
        }
        columns = append(columns, f.Column)
        placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
        values = append(values, f.Value)
    }

    query := fmt.Sprintf(
        "INSERT INTO %s (%s) VALUES (%s) RETURNING id",
        tableName,
        strings.Join(columns, ", "),
        strings.Join(placeholders, ", "),
    )

    return query, values
}

// buildSelectQuery creates a SELECT statement with optional WHERE clause
func buildSelectQuery(model interface{}, whereColumn string, whereValue interface{}) string {
    tableName := getTableName(model)
    fields := getFields(model)

    var columns []string
    for _, f := range fields {
        columns = append(columns, f.Column)
    }

    query := fmt.Sprintf("SELECT %s FROM %s", strings.Join(columns, ", "), tableName)

    if whereColumn != "" {
        query += fmt.Sprintf(" WHERE %s = $1", whereColumn)
    }

    return query
}

// buildUpdateQuery creates an UPDATE statement
func buildUpdateQuery(model interface{}, id interface{}) (string, []interface{}) {
    tableName := getTableName(model)
    fields := getFields(model)

    var setClauses []string
    var values []interface{}
    paramIndex := 1

    for _, f := range fields {
        if f.IsPrimary {
            continue
        }
        setClauses = append(setClauses, fmt.Sprintf("%s = $%d", f.Column, paramIndex))
        values = append(values, f.Value)
        paramIndex++
    }

    // Add the ID as the last parameter
    values = append(values, id)

    query := fmt.Sprintf(
        "UPDATE %s SET %s WHERE id = $%d",
        tableName,
        strings.Join(setClauses, ", "),
        paramIndex,
    )

    return query, values
}
```

## Implementing CRUD Operations

Now let's tie everything together with methods that execute these queries.

```go
// Create inserts a new record and returns the generated ID
func (db *DB) Create(model interface{}) (int64, error) {
    query, values := buildInsertQuery(model)

    var id int64
    err := db.conn.QueryRow(query, values...).Scan(&id)
    if err != nil {
        return 0, fmt.Errorf("insert failed: %w", err)
    }

    return id, nil
}

// FindByID retrieves a record by its primary key
func (db *DB) FindByID(model interface{}, id interface{}) error {
    query := buildSelectQuery(model, "id", id)

    v := reflect.ValueOf(model)
    if v.Kind() != reflect.Ptr {
        return fmt.Errorf("model must be a pointer")
    }
    v = v.Elem()

    // Build a slice of pointers for scanning
    fields := getFields(model)
    scanDest := make([]interface{}, len(fields))

    for i := range fields {
        scanDest[i] = v.Field(i).Addr().Interface()
    }

    err := db.conn.QueryRow(query, id).Scan(scanDest...)
    if err != nil {
        return fmt.Errorf("query failed: %w", err)
    }

    return nil
}

// Update modifies an existing record
func (db *DB) Update(model interface{}, id interface{}) error {
    query, values := buildUpdateQuery(model, id)

    _, err := db.conn.Exec(query, values...)
    if err != nil {
        return fmt.Errorf("update failed: %w", err)
    }

    return nil
}

// Delete removes a record by ID
func (db *DB) Delete(model interface{}, id interface{}) error {
    tableName := getTableName(model)
    query := fmt.Sprintf("DELETE FROM %s WHERE id = $1", tableName)

    _, err := db.conn.Exec(query, id)
    if err != nil {
        return fmt.Errorf("delete failed: %w", err)
    }

    return nil
}
```

## Putting It All Together

Here is how you would use our simple ORM in practice:

```go
// User represents our database model
type User struct {
    ID        int64  `db:"id" primary:"true"`
    Name      string `db:"name"`
    Email     string `db:"email"`
    CreatedAt string `db:"created_at"`
}

func main() {
    // Connect to the database
    db, err := orm.Connect("localhost", "5432", "user", "password", "myapp")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Create a new user
    user := User{
        Name:      "John Doe",
        Email:     "john@example.com",
        CreatedAt: time.Now().Format(time.RFC3339),
    }

    id, err := db.Create(&user)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Created user with ID: %d\n", id)

    // Find user by ID
    var foundUser User
    err = db.FindByID(&foundUser, id)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Found user: %+v\n", foundUser)

    // Update the user
    foundUser.Email = "newemail@example.com"
    err = db.Update(&foundUser, id)
    if err != nil {
        log.Fatal(err)
    }

    // Delete the user
    err = db.Delete(&User{}, id)
    if err != nil {
        log.Fatal(err)
    }
}
```

## Conclusion

Building an ORM from scratch helps you understand the magic behind libraries like GORM or sqlx. While our implementation is basic, it demonstrates the core concepts: reflection for struct inspection, struct tags for mapping, and dynamic query generation.

For production use, you would want to add features like transaction support, connection pooling, query caching, relationship handling, and proper SQL injection prevention. However, this foundation gives you a solid starting point for understanding how ORMs work under the hood.
