# How to Scale Pagination with Cursor Navigation in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Pagination, Cursor, Database, Scalability

Description: Learn how to implement cursor-based pagination in Go to handle millions of records efficiently. This guide covers why offset pagination breaks at scale and how cursors solve it.

---

Pagination seems like a solved problem until your table hits a few million rows. The classic `LIMIT 50 OFFSET 10000` approach works fine in development, but in production it quietly becomes a performance killer. Every time you bump that offset, the database has to scan and discard all the rows before it. At offset 100,000, you are asking the database to read 100,050 rows just to return 50.

Cursor-based pagination (also called keyset pagination) sidesteps this entirely. Instead of telling the database "skip N rows," you tell it "give me rows after this specific point." The result is consistent O(1) performance regardless of how deep into the dataset you are.

## The Problem with Offset Pagination

Here is a typical offset-based query:

```sql
SELECT id, title, created_at
FROM articles
ORDER BY created_at DESC
LIMIT 50 OFFSET 10000;
```

This query looks harmless, but the database engine has to:

1. Sort all matching rows by `created_at`
2. Scan through 10,050 rows
3. Discard the first 10,000
4. Return 50

As your offset grows, so does the work. On a table with 10 million rows, requesting page 1000 means scanning 50,000 rows to return 50. Your P99 latency will spike, and your database CPU will suffer.

There is also a correctness problem. If new rows are inserted while a user is paginating, they might see duplicates or miss records entirely. The offset is a position, not a stable reference point.

## How Cursor Pagination Works

Cursor pagination uses a value from the last returned row as a reference point for the next query. Instead of "skip N rows," you ask for "rows where the sort key is less than X."

```sql
SELECT id, title, created_at
FROM articles
WHERE created_at < '2026-01-20 14:30:00'
ORDER BY created_at DESC
LIMIT 50;
```

This query uses an index scan starting exactly where you need it. No scanning and discarding. The performance is the same whether you are on page 1 or page 10,000.

## Implementing Cursor Pagination in Go

Let us build a practical implementation. We will use a simple Article model and return a cursor that encodes the position for the next page.

### The Data Model

```go
package main

import (
    "encoding/base64"
    "fmt"
    "time"
)

type Article struct {
    ID        int64     `json:"id"`
    Title     string    `json:"title"`
    CreatedAt time.Time `json:"created_at"`
}

// PageInfo holds pagination metadata
type PageInfo struct {
    HasNextPage bool   `json:"has_next_page"`
    EndCursor   string `json:"end_cursor,omitempty"`
}

// ArticlePage is the response structure
type ArticlePage struct {
    Articles []Article `json:"articles"`
    PageInfo PageInfo  `json:"page_info"`
}
```

### Encoding and Decoding Cursors

The cursor should be opaque to clients. We encode the actual value (timestamp and ID for tie-breaking) into a base64 string. This prevents clients from manipulating it and keeps our implementation flexible.

```go
// Cursor holds the pagination position
type Cursor struct {
    CreatedAt time.Time
    ID        int64
}

// EncodeCursor creates an opaque cursor string
func EncodeCursor(c Cursor) string {
    // Format: timestamp|id
    raw := fmt.Sprintf("%d|%d", c.CreatedAt.UnixNano(), c.ID)
    return base64.StdEncoding.EncodeToString([]byte(raw))
}

// DecodeCursor parses an opaque cursor string
func DecodeCursor(encoded string) (Cursor, error) {
    decoded, err := base64.StdEncoding.DecodeString(encoded)
    if err != nil {
        return Cursor{}, fmt.Errorf("invalid cursor encoding: %w", err)
    }

    var nanos int64
    var id int64
    _, err = fmt.Sscanf(string(decoded), "%d|%d", &nanos, &id)
    if err != nil {
        return Cursor{}, fmt.Errorf("invalid cursor format: %w", err)
    }

    return Cursor{
        CreatedAt: time.Unix(0, nanos),
        ID:        id,
    }, nil
}
```

### The Database Query

Here is where the performance gain happens. Notice we fetch `limit + 1` rows to determine if there is a next page without running a separate count query.

```go
import (
    "context"
    "database/sql"
)

func GetArticles(ctx context.Context, db *sql.DB, cursor *Cursor, limit int) (ArticlePage, error) {
    // Fetch one extra to check for next page
    fetchLimit := limit + 1

    var rows *sql.Rows
    var err error

    if cursor == nil {
        // First page - no cursor provided
        query := `
            SELECT id, title, created_at
            FROM articles
            ORDER BY created_at DESC, id DESC
            LIMIT $1
        `
        rows, err = db.QueryContext(ctx, query, fetchLimit)
    } else {
        // Subsequent pages - use cursor for efficient seek
        query := `
            SELECT id, title, created_at
            FROM articles
            WHERE (created_at, id) < ($1, $2)
            ORDER BY created_at DESC, id DESC
            LIMIT $3
        `
        rows, err = db.QueryContext(ctx, query, cursor.CreatedAt, cursor.ID, fetchLimit)
    }

    if err != nil {
        return ArticlePage{}, fmt.Errorf("query failed: %w", err)
    }
    defer rows.Close()

    // Collect results
    articles := make([]Article, 0, limit)
    for rows.Next() {
        var a Article
        if err := rows.Scan(&a.ID, &a.Title, &a.CreatedAt); err != nil {
            return ArticlePage{}, fmt.Errorf("scan failed: %w", err)
        }
        articles = append(articles, a)
    }

    if err := rows.Err(); err != nil {
        return ArticlePage{}, fmt.Errorf("rows error: %w", err)
    }

    // Determine if there is a next page
    hasNextPage := len(articles) > limit
    if hasNextPage {
        // Remove the extra row we fetched
        articles = articles[:limit]
    }

    // Build response
    page := ArticlePage{
        Articles: articles,
        PageInfo: PageInfo{
            HasNextPage: hasNextPage,
        },
    }

    // Set end cursor if we have results
    if len(articles) > 0 {
        lastArticle := articles[len(articles)-1]
        page.PageInfo.EndCursor = EncodeCursor(Cursor{
            CreatedAt: lastArticle.CreatedAt,
            ID:        lastArticle.ID,
        })
    }

    return page, nil
}
```

### The HTTP Handler

Putting it together in an HTTP handler:

```go
import (
    "encoding/json"
    "net/http"
    "strconv"
)

func ArticlesHandler(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Parse limit with a sensible default and maximum
        limit := 50
        if l := r.URL.Query().Get("limit"); l != "" {
            if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
                limit = parsed
            }
        }
        if limit > 100 {
            limit = 100 // Cap to prevent abuse
        }

        // Parse cursor if provided
        var cursor *Cursor
        if c := r.URL.Query().Get("cursor"); c != "" {
            decoded, err := DecodeCursor(c)
            if err != nil {
                http.Error(w, "Invalid cursor", http.StatusBadRequest)
                return
            }
            cursor = &decoded
        }

        // Fetch the page
        page, err := GetArticles(r.Context(), db, cursor, limit)
        if err != nil {
            http.Error(w, "Internal error", http.StatusInternalServerError)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(page)
    }
}
```

## The Index That Makes It Fast

The query relies on an index that matches your sort order. For our example:

```sql
CREATE INDEX idx_articles_cursor ON articles (created_at DESC, id DESC);
```

This composite index lets the database seek directly to the cursor position and scan forward. Without it, you lose most of the performance benefit.

## Handling Ties in Sort Order

If multiple rows share the same `created_at` value, using the timestamp alone can cause skipped or duplicate rows. That is why we include the `id` as a tie-breaker in both the cursor and the `ORDER BY` clause. The row tuple comparison `(created_at, id) < ($1, $2)` handles this cleanly.

## Trade-offs to Consider

Cursor pagination is not a universal replacement for offset pagination. Here are the trade-offs:

**Advantages:**
- Constant-time performance at any depth
- Stable results even with concurrent inserts
- Works well with real-time feeds and infinite scroll

**Limitations:**
- No "jump to page N" capability
- Clients cannot easily calculate total page count
- The cursor format ties you to a specific sort order

For most APIs serving paginated lists, the trade-offs favor cursors. Users rarely jump to page 47 directly. They scroll through results sequentially, which is exactly what cursor pagination optimizes for.

## A Note on Total Counts

If you absolutely need a total count, run it as a separate cached query. Do not add `COUNT(*) OVER()` to your main query. That window function forces the database to scan the entire result set, negating your cursor gains. Cache the count with a TTL and accept that it might be slightly stale.

---

**Bottom line:** Offset pagination is fine for small datasets and admin dashboards. But the moment your table grows past a few hundred thousand rows and users start paginating deep into the results, cursor pagination is the only approach that scales. The implementation is straightforward, and the performance difference is dramatic.
