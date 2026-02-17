# How to Run BigQuery Queries from a Go Application Using the cloud.google.com/go/bigquery Package

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Go, Data Analytics, Client Library

Description: Run BigQuery queries from a Go application using the official bigquery package, covering query execution, parameterized queries, result iteration, and streaming inserts.

---

BigQuery is Google's serverless data warehouse, and the Go client library gives you a typed, efficient way to interact with it. The `cloud.google.com/go/bigquery` package handles authentication, query execution, result streaming, and data insertion. Unlike REST-based approaches, the Go client uses gRPC under the hood for better performance.

In this post, I will cover running queries, handling results, using parameters, and inserting data into BigQuery from a Go application.

## Setting Up

Add the BigQuery client library:

```bash
go get cloud.google.com/go/bigquery
```

Create a client:

```go
package main

import (
    "context"
    "fmt"
    "log"

    "cloud.google.com/go/bigquery"
)

func main() {
    ctx := context.Background()

    // Create a BigQuery client - uses application default credentials
    client, err := bigquery.NewClient(ctx, "my-project-id")
    if err != nil {
        log.Fatalf("Failed to create BigQuery client: %v", err)
    }
    defer client.Close()
}
```

## Running a Simple Query

The basic pattern is: create a query, run it, and iterate over the results.

```go
// RunSimpleQuery executes a SQL query and prints the results
func RunSimpleQuery(ctx context.Context, client *bigquery.Client) error {
    // Create the query
    query := client.Query(`
        SELECT name, SUM(number) as total
        FROM ` + "`bigquery-public-data.usa_names.usa_1910_2013`" + `
        WHERE state = 'TX'
        GROUP BY name
        ORDER BY total DESC
        LIMIT 10
    `)

    // Use standard SQL (not legacy SQL)
    query.UseLegacySQL = false

    // Run the query
    it, err := query.Read(ctx)
    if err != nil {
        return fmt.Errorf("query failed: %w", err)
    }

    // Iterate over the results
    for {
        var row []bigquery.Value
        err := it.Next(&row)
        if err == iterator.Done {
            break
        }
        if err != nil {
            return fmt.Errorf("error reading row: %w", err)
        }

        fmt.Printf("Name: %v, Total: %v\n", row[0], row[1])
    }

    return nil
}
```

## Reading Results into Structs

For type safety, read results into Go structs:

```go
// EventSummary maps to the query result columns
type EventSummary struct {
    EventType string  `bigquery:"event_type"`
    Count     int64   `bigquery:"event_count"`
    AvgValue  float64 `bigquery:"avg_value"`
}

// QueryIntoStruct reads query results into typed structs
func QueryIntoStruct(ctx context.Context, client *bigquery.Client) ([]EventSummary, error) {
    query := client.Query(`
        SELECT
            event_type,
            COUNT(*) as event_count,
            AVG(metric_value) as avg_value
        FROM ` + "`my-project.analytics.events`" + `
        WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        GROUP BY event_type
        ORDER BY event_count DESC
    `)
    query.UseLegacySQL = false

    it, err := query.Read(ctx)
    if err != nil {
        return nil, fmt.Errorf("query failed: %w", err)
    }

    var results []EventSummary
    for {
        var summary EventSummary
        err := it.Next(&summary)
        if err == iterator.Done {
            break
        }
        if err != nil {
            return nil, fmt.Errorf("error reading row: %w", err)
        }
        results = append(results, summary)
    }

    return results, nil
}
```

## Parameterized Queries

Always use parameterized queries for user input to prevent SQL injection:

```go
// QueryWithParams runs a parameterized query
func QueryWithParams(ctx context.Context, client *bigquery.Client,
    startDate string, minCount int64) ([]EventSummary, error) {

    query := client.Query(`
        SELECT
            event_type,
            COUNT(*) as event_count,
            AVG(metric_value) as avg_value
        FROM ` + "`my-project.analytics.events`" + `
        WHERE event_date >= @start_date
            AND event_count >= @min_count
        GROUP BY event_type
        ORDER BY event_count DESC
    `)
    query.UseLegacySQL = false

    // Set query parameters - these are safely escaped
    query.Parameters = []bigquery.QueryParameter{
        {
            Name:  "start_date",
            Value: startDate,
        },
        {
            Name:  "min_count",
            Value: minCount,
        },
    }

    it, err := query.Read(ctx)
    if err != nil {
        return nil, fmt.Errorf("parameterized query failed: %w", err)
    }

    var results []EventSummary
    for {
        var summary EventSummary
        err := it.Next(&summary)
        if err == iterator.Done {
            break
        }
        if err != nil {
            return nil, fmt.Errorf("error reading row: %w", err)
        }
        results = append(results, summary)
    }

    return results, nil
}
```

## Handling Large Result Sets

For queries that return many rows, process results in a streaming fashion instead of loading everything into memory:

```go
// ProcessLargeResult streams through a large result set
func ProcessLargeResult(ctx context.Context, client *bigquery.Client,
    processRow func(EventSummary) error) error {

    query := client.Query(`
        SELECT event_type, COUNT(*) as event_count, AVG(metric_value) as avg_value
        FROM ` + "`my-project.analytics.events`" + `
        GROUP BY event_type
    `)
    query.UseLegacySQL = false

    it, err := query.Read(ctx)
    if err != nil {
        return fmt.Errorf("query failed: %w", err)
    }

    rowCount := 0
    for {
        var row EventSummary
        err := it.Next(&row)
        if err == iterator.Done {
            break
        }
        if err != nil {
            return fmt.Errorf("error at row %d: %w", rowCount, err)
        }

        // Process each row without storing it
        if err := processRow(row); err != nil {
            return fmt.Errorf("processing error at row %d: %w", rowCount, err)
        }

        rowCount++
        if rowCount%10000 == 0 {
            log.Printf("Processed %d rows", rowCount)
        }
    }

    log.Printf("Total rows processed: %d", rowCount)
    return nil
}
```

## Streaming Inserts

Insert rows into BigQuery using the streaming API:

```go
// LogEntry represents a row to insert into BigQuery
type LogEntry struct {
    EventID   string    `bigquery:"event_id"`
    EventType string    `bigquery:"event_type"`
    UserID    string    `bigquery:"user_id"`
    Timestamp time.Time `bigquery:"timestamp"`
    Payload   string    `bigquery:"payload"`
}

// InsertRows streams rows into a BigQuery table
func InsertRows(ctx context.Context, client *bigquery.Client,
    datasetID, tableID string, entries []LogEntry) error {

    inserter := client.Dataset(datasetID).Table(tableID).Inserter()

    // Insert the rows
    if err := inserter.Put(ctx, entries); err != nil {
        // Check for individual row errors
        if multiErr, ok := err.(bigquery.PutMultiError); ok {
            for _, rowErr := range multiErr {
                for _, fieldErr := range rowErr.Errors {
                    log.Printf("Row %d error: %v", rowErr.RowIndex, fieldErr)
                }
            }
        }
        return fmt.Errorf("insert failed: %w", err)
    }

    log.Printf("Inserted %d rows into %s.%s", len(entries), datasetID, tableID)
    return nil
}
```

## Query Job Management

For long-running queries, you can manage the job explicitly:

```go
// RunLongQuery submits a query job and polls for completion
func RunLongQuery(ctx context.Context, client *bigquery.Client, sql string) (*bigquery.RowIterator, error) {
    query := client.Query(sql)
    query.UseLegacySQL = false

    // Start the query job
    job, err := query.Run(ctx)
    if err != nil {
        return nil, fmt.Errorf("failed to start query job: %w", err)
    }

    log.Printf("Query job started: %s", job.ID())

    // Wait for the job to complete
    status, err := job.Wait(ctx)
    if err != nil {
        return nil, fmt.Errorf("query job failed: %w", err)
    }

    if status.Err() != nil {
        return nil, fmt.Errorf("query completed with errors: %w", status.Err())
    }

    // Log job statistics
    stats := status.Statistics
    log.Printf("Query completed in %v, processed %d bytes",
        stats.EndTime.Sub(stats.StartTime),
        stats.TotalBytesProcessed)

    // Get the results
    it, err := job.Read(ctx)
    if err != nil {
        return nil, fmt.Errorf("failed to read results: %w", err)
    }

    return it, nil
}
```

## HTTP Service Integration

Integrate BigQuery queries into an HTTP service:

```go
type AnalyticsHandler struct {
    client *bigquery.Client
}

// HandleEventSummary returns event summary data from BigQuery
func (h *AnalyticsHandler) HandleEventSummary(w http.ResponseWriter, r *http.Request) {
    startDate := r.URL.Query().Get("start_date")
    if startDate == "" {
        startDate = time.Now().AddDate(0, 0, -7).Format("2006-01-02")
    }

    results, err := QueryWithParams(r.Context(), h.client, startDate, 0)
    if err != nil {
        log.Printf("Query error: %v", err)
        http.Error(w, `{"error": "query failed"}`, http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(results)
}

// HandleInsertEvents inserts events into BigQuery
func (h *AnalyticsHandler) HandleInsertEvents(w http.ResponseWriter, r *http.Request) {
    var entries []LogEntry
    if err := json.NewDecoder(r.Body).Decode(&entries); err != nil {
        http.Error(w, `{"error": "invalid request body"}`, http.StatusBadRequest)
        return
    }

    if err := InsertRows(r.Context(), h.client, "analytics", "events", entries); err != nil {
        log.Printf("Insert error: %v", err)
        http.Error(w, `{"error": "insert failed"}`, http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "inserted": len(entries),
    })
}
```

## Dry Run for Cost Estimation

Before running expensive queries, do a dry run to see how much data will be scanned:

```go
// DryRun estimates the bytes that will be processed by a query
func DryRun(ctx context.Context, client *bigquery.Client, sql string) (int64, error) {
    query := client.Query(sql)
    query.UseLegacySQL = false
    query.DryRun = true

    job, err := query.Run(ctx)
    if err != nil {
        return 0, fmt.Errorf("dry run failed: %w", err)
    }

    // Get the estimated bytes processed
    stats := job.LastStatus().Statistics
    bytesProcessed := stats.TotalBytesProcessed

    log.Printf("Query would process %.2f MB", float64(bytesProcessed)/(1024*1024))
    return bytesProcessed, nil
}
```

## Wrapping Up

The Go BigQuery client library provides a clean, type-safe way to run queries and manage data in BigQuery. Read results into Go structs with `bigquery` tags for type safety. Use parameterized queries for user input. For large result sets, stream through the iterator instead of loading everything into memory. The streaming insert API lets you push data into BigQuery in near real-time. And always use dry runs to estimate costs before running queries against large datasets. The Go client handles authentication, retries, and connection management, so you can focus on your queries and data processing logic.
