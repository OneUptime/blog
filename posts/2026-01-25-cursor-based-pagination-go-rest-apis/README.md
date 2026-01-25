# How to Implement Cursor-Based Pagination in Go REST APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Pagination, REST API, Cursor, Database

Description: Cursor-based pagination offers better performance and consistency than offset pagination for large datasets. This guide walks through implementing it in Go with practical examples you can adapt to your own APIs.

---

Pagination is one of those things that seems simple until you hit scale. Most developers start with offset-based pagination because it maps directly to SQL's `LIMIT` and `OFFSET`. But as your dataset grows into millions of rows, offset pagination starts to hurt. The database still has to scan through all the skipped rows, and users can see duplicate or missing items when data changes between requests.

Cursor-based pagination solves both problems. Instead of saying "give me page 5," you say "give me the next 20 items after this specific record." The database uses an index seek instead of a scan, and the results stay consistent even when new records are inserted.

## Why Cursor Pagination Beats Offset Pagination

Consider a table with 10 million rows. With offset pagination, requesting page 5000 means the database has to skip 100,000 rows before returning your 20 results. That is slow, and it gets slower as users page deeper into the dataset.

Cursor pagination flips this model. You provide a pointer to a specific record - typically an encoded combination of the sort field and a unique identifier - and the database jumps directly to that position. Performance stays constant whether you are on "page 1" or "page 5000."

There is also a consistency benefit. If someone inserts a new record while a user is paginating, offset pagination can show the same record twice or skip records entirely. Cursor pagination anchors to a specific point in the dataset, so you get predictable results.

## The Data Model

Let us build a simple API that lists blog posts sorted by creation date. Here is our Post struct:

```go
// Post represents a blog post in the database
type Post struct {
    ID        int64     `json:"id" db:"id"`
    Title     string    `json:"title" db:"title"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}
```

For cursor pagination to work efficiently, you need an index on your sort column plus a unique tiebreaker. In this case, we will create a composite index on `(created_at, id)`:

```sql
CREATE INDEX idx_posts_created_at_id ON posts(created_at DESC, id DESC);
```

The ID acts as a tiebreaker when multiple posts have the same creation timestamp.

## Encoding and Decoding Cursors

A cursor is just encoded state that tells you where to resume. We will encode the creation timestamp and ID as a base64 string:

```go
package pagination

import (
    "encoding/base64"
    "fmt"
    "strconv"
    "strings"
    "time"
)

// Cursor holds the position in the paginated result set
type Cursor struct {
    CreatedAt time.Time
    ID        int64
}

// EncodeCursor converts a cursor to a URL-safe string
func EncodeCursor(createdAt time.Time, id int64) string {
    // Format: timestamp_id
    payload := fmt.Sprintf("%d_%d", createdAt.UnixNano(), id)
    return base64.URLEncoding.EncodeToString([]byte(payload))
}

// DecodeCursor parses a cursor string back into its components
func DecodeCursor(encoded string) (*Cursor, error) {
    if encoded == "" {
        return nil, nil // No cursor means start from beginning
    }

    decoded, err := base64.URLEncoding.DecodeString(encoded)
    if err != nil {
        return nil, fmt.Errorf("invalid cursor encoding: %w", err)
    }

    parts := strings.Split(string(decoded), "_")
    if len(parts) != 2 {
        return nil, fmt.Errorf("invalid cursor format")
    }

    nanos, err := strconv.ParseInt(parts[0], 10, 64)
    if err != nil {
        return nil, fmt.Errorf("invalid timestamp in cursor: %w", err)
    }

    id, err := strconv.ParseInt(parts[1], 10, 64)
    if err != nil {
        return nil, fmt.Errorf("invalid id in cursor: %w", err)
    }

    return &Cursor{
        CreatedAt: time.Unix(0, nanos),
        ID:        id,
    }, nil
}
```

Using base64 encoding keeps the cursor opaque to clients. They should not parse or construct cursors themselves - they just pass back whatever you give them.

## The Pagination Query

Here is where the performance magic happens. Instead of using `OFFSET`, we use a `WHERE` clause that filters based on the cursor values:

```go
package repository

import (
    "context"
    "database/sql"
    "fmt"
)

type PostRepository struct {
    db *sql.DB
}

// ListPosts returns posts after the given cursor, limited to the specified count
func (r *PostRepository) ListPosts(ctx context.Context, cursor *Cursor, limit int) ([]Post, error) {
    var args []interface{}
    var query string

    if cursor == nil {
        // First page - no cursor constraint
        query = `
            SELECT id, title, created_at
            FROM posts
            ORDER BY created_at DESC, id DESC
            LIMIT $1
        `
        args = []interface{}{limit + 1} // Fetch one extra to detect if there's a next page
    } else {
        // Subsequent pages - filter using cursor
        query = `
            SELECT id, title, created_at
            FROM posts
            WHERE (created_at, id) < ($1, $2)
            ORDER BY created_at DESC, id DESC
            LIMIT $3
        `
        args = []interface{}{cursor.CreatedAt, cursor.ID, limit + 1}
    }

    rows, err := r.db.QueryContext(ctx, query, args...)
    if err != nil {
        return nil, fmt.Errorf("query failed: %w", err)
    }
    defer rows.Close()

    var posts []Post
    for rows.Next() {
        var p Post
        if err := rows.Scan(&p.ID, &p.Title, &p.CreatedAt); err != nil {
            return nil, fmt.Errorf("scan failed: %w", err)
        }
        posts = append(posts, p)
    }

    return posts, rows.Err()
}
```

Notice the tuple comparison `(created_at, id) < ($1, $2)`. This leverages the composite index we created earlier. PostgreSQL, MySQL 8.0+, and SQLite all support this row value comparison syntax.

We fetch `limit + 1` records to determine whether more pages exist without running a separate count query.

## The API Response

A well-designed pagination response includes the data plus metadata about what comes next:

```go
package api

import (
    "encoding/json"
    "net/http"
    "strconv"
)

// PageInfo contains pagination metadata
type PageInfo struct {
    HasNextPage bool    `json:"has_next_page"`
    EndCursor   *string `json:"end_cursor,omitempty"`
}

// PostsResponse wraps the paginated post list
type PostsResponse struct {
    Posts    []Post   `json:"posts"`
    PageInfo PageInfo `json:"page_info"`
}

func (h *Handler) ListPosts(w http.ResponseWriter, r *http.Request) {
    // Parse query parameters
    cursorParam := r.URL.Query().Get("cursor")
    limitParam := r.URL.Query().Get("limit")

    limit := 20 // Default
    if limitParam != "" {
        if parsed, err := strconv.Atoi(limitParam); err == nil && parsed > 0 && parsed <= 100 {
            limit = parsed
        }
    }

    cursor, err := DecodeCursor(cursorParam)
    if err != nil {
        http.Error(w, "Invalid cursor", http.StatusBadRequest)
        return
    }

    // Fetch posts from repository
    posts, err := h.repo.ListPosts(r.Context(), cursor, limit)
    if err != nil {
        http.Error(w, "Failed to fetch posts", http.StatusInternalServerError)
        return
    }

    // Build response with pagination info
    response := PostsResponse{
        PageInfo: PageInfo{HasNextPage: false},
    }

    if len(posts) > limit {
        // We fetched one extra, so there is a next page
        response.PageInfo.HasNextPage = true
        posts = posts[:limit] // Trim the extra record

        // Set the cursor to the last item we are returning
        lastPost := posts[len(posts)-1]
        endCursor := EncodeCursor(lastPost.CreatedAt, lastPost.ID)
        response.PageInfo.EndCursor = &endCursor
    }

    response.Posts = posts

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

Clients use the API like this:

```
GET /posts?limit=20
GET /posts?limit=20&cursor=MTY3NDU4NzIwMDAwMDAwMDAwMF8xMjM0
```

The response looks like:

```json
{
  "posts": [
    {"id": 1234, "title": "First Post", "created_at": "2026-01-25T10:00:00Z"},
    {"id": 1233, "title": "Second Post", "created_at": "2026-01-24T15:30:00Z"}
  ],
  "page_info": {
    "has_next_page": true,
    "end_cursor": "MTY3NDU4NzIwMDAwMDAwMDAwMF8xMjMz"
  }
}
```

## Handling Edge Cases

A few things to watch out for in production:

**Deleted records:** If a user holds a cursor and the record it points to gets deleted, the pagination still works. The `WHERE` clause filters by value, not by the existence of the record.

**Clock skew:** If your servers have time drift, records might appear out of order. Use database-generated timestamps or a monotonically increasing ID as your primary sort key.

**Bidirectional pagination:** The examples above only support forward pagination. For backward pagination, you need separate cursors and reverse the comparison operators. This adds complexity, so only implement it if your use case requires it.

**Consistent sort order:** Always include a unique tiebreaker in your sort order. Without it, records with identical sort values will have undefined ordering, which breaks pagination.

## When to Stick with Offset Pagination

Cursor pagination is not always the right choice. For small datasets under a few thousand records, offset pagination is simpler and the performance difference is negligible. If your users need to jump to arbitrary pages - like "go to page 47" - offset pagination is more natural. Cursor pagination only supports sequential traversal.

Admin dashboards and internal tools often work fine with offset pagination. Reserve cursor pagination for public APIs and endpoints where users will page through large result sets.

---

Cursor pagination takes more upfront work than tossing in a `LIMIT OFFSET`, but the payoff is real. Your queries stay fast at any depth, your results stay consistent when data changes, and your API scales gracefully as your dataset grows. The pattern shown here is battle-tested and works with PostgreSQL, MySQL, and SQLite with minimal changes.
