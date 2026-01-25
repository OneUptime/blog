# How to Process Large Datasets with Batch Processing in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Batch Processing, Data Processing, Performance, Scalability

Description: Learn how to efficiently process millions of records in Go using batch processing techniques, worker pools, and memory-conscious patterns that keep your application fast and stable.

---

When you need to process millions of records, loading everything into memory at once is a recipe for disaster. Your application will grind to a halt, consume all available RAM, and probably crash. Batch processing solves this by breaking large datasets into smaller, manageable chunks that can be processed sequentially or in parallel.

Go is particularly well-suited for batch processing. Its goroutines make concurrent processing trivial, channels provide clean communication between workers, and the language's simplicity keeps the code maintainable even as complexity grows.

## The Basic Pattern

At its core, batch processing means reading a chunk of data, processing it, and then moving to the next chunk. Here is a simple implementation:

```go
package main

import (
    "database/sql"
    "log"
)

const batchSize = 1000

// ProcessInBatches reads records from the database and processes them in chunks
func ProcessInBatches(db *sql.DB) error {
    var offset int

    for {
        // Fetch one batch of records
        rows, err := db.Query(
            "SELECT id, data FROM records ORDER BY id LIMIT $1 OFFSET $2",
            batchSize, offset,
        )
        if err != nil {
            return err
        }

        // Track how many records we processed in this batch
        count := 0

        for rows.Next() {
            var id int
            var data string
            if err := rows.Scan(&id, &data); err != nil {
                rows.Close()
                return err
            }

            // Process each record
            if err := processRecord(id, data); err != nil {
                log.Printf("failed to process record %d: %v", id, err)
            }
            count++
        }
        rows.Close()

        // No more records to process
        if count == 0 {
            break
        }

        log.Printf("processed %d records (offset: %d)", count, offset)
        offset += batchSize
    }

    return nil
}
```

This approach has a problem: using OFFSET becomes slower as you paginate deeper into the table. Each query must scan all previous rows before returning results. For tables with millions of rows, this becomes painfully slow.

## Cursor-Based Pagination

A better approach uses cursor-based pagination, where you track the last processed ID and query records after that point:

```go
// ProcessWithCursor uses keyset pagination for efficient batch processing
func ProcessWithCursor(db *sql.DB) error {
    var lastID int

    for {
        // Fetch records after the last processed ID
        // This query uses the primary key index, making it fast regardless of position
        rows, err := db.Query(
            "SELECT id, data FROM records WHERE id > $1 ORDER BY id LIMIT $2",
            lastID, batchSize,
        )
        if err != nil {
            return err
        }

        count := 0

        for rows.Next() {
            var id int
            var data string
            if err := rows.Scan(&id, &data); err != nil {
                rows.Close()
                return err
            }

            if err := processRecord(id, data); err != nil {
                log.Printf("failed to process record %d: %v", id, err)
            }

            // Update cursor to the current record's ID
            lastID = id
            count++
        }
        rows.Close()

        if count == 0 {
            break
        }

        log.Printf("processed batch ending at ID %d", lastID)
    }

    return nil
}
```

This query runs in constant time because it uses the index on the primary key. No matter how far into the dataset you are, each batch query takes the same amount of time.

## Adding Concurrency with Worker Pools

Processing records one at a time leaves performance on the table. Go's goroutines let you process multiple records concurrently with minimal overhead:

```go
package main

import (
    "database/sql"
    "log"
    "sync"
)

// Record represents a single data record
type Record struct {
    ID   int
    Data string
}

// ProcessConcurrently uses a worker pool to process records in parallel
func ProcessConcurrently(db *sql.DB, workerCount int) error {
    // Channel to send records to workers
    jobs := make(chan Record, batchSize)

    // WaitGroup to track when all workers are done
    var wg sync.WaitGroup

    // Start worker goroutines
    for i := 0; i < workerCount; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()

            // Each worker pulls records from the jobs channel
            for record := range jobs {
                if err := processRecord(record.ID, record.Data); err != nil {
                    log.Printf("worker %d: failed to process record %d: %v",
                        workerID, record.ID, err)
                }
            }
        }(i)
    }

    // Fetch and distribute records
    var lastID int

    for {
        rows, err := db.Query(
            "SELECT id, data FROM records WHERE id > $1 ORDER BY id LIMIT $2",
            lastID, batchSize,
        )
        if err != nil {
            close(jobs)
            return err
        }

        count := 0

        for rows.Next() {
            var record Record
            if err := rows.Scan(&record.ID, &record.Data); err != nil {
                rows.Close()
                close(jobs)
                return err
            }

            // Send record to worker pool
            jobs <- record
            lastID = record.ID
            count++
        }
        rows.Close()

        if count == 0 {
            break
        }
    }

    // Close channel to signal workers to exit
    close(jobs)

    // Wait for all workers to finish
    wg.Wait()

    return nil
}
```

The number of workers should match your workload. For CPU-bound processing, use the number of available CPU cores. For I/O-bound work like API calls or database writes, you can use more workers since they spend most of their time waiting.

## Handling Errors Without Stopping

In production, you rarely want a single failed record to halt the entire batch job. Instead, collect errors and continue processing:

```go
package main

import (
    "fmt"
    "sync"
)

// BatchResult tracks the outcome of batch processing
type BatchResult struct {
    Processed int
    Failed    int
    Errors    []error
    mu        sync.Mutex
}

// AddError records a processing failure
func (r *BatchResult) AddError(err error) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.Failed++

    // Limit stored errors to prevent memory issues
    if len(r.Errors) < 100 {
        r.Errors = append(r.Errors, err)
    }
}

// AddSuccess records a successful processing
func (r *BatchResult) AddSuccess() {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.Processed++
}

// Summary returns a human-readable summary
func (r *BatchResult) Summary() string {
    r.mu.Lock()
    defer r.mu.Unlock()
    return fmt.Sprintf("processed: %d, failed: %d", r.Processed, r.Failed)
}
```

This pattern lets you process the entire dataset while tracking failures. After the job completes, you can review errors, retry failed records, or alert on high failure rates.

## Memory-Efficient File Processing

When processing large files, streaming line by line prevents memory exhaustion:

```go
package main

import (
    "bufio"
    "encoding/json"
    "log"
    "os"
)

// ProcessLargeFile reads a JSON-lines file and processes records in batches
func ProcessLargeFile(filepath string) error {
    file, err := os.Open(filepath)
    if err != nil {
        return err
    }
    defer file.Close()

    scanner := bufio.NewScanner(file)

    // Increase buffer size for lines longer than 64KB
    buf := make([]byte, 0, 1024*1024) // 1MB buffer
    scanner.Buffer(buf, 10*1024*1024) // max 10MB per line

    batch := make([]Record, 0, batchSize)
    lineNum := 0

    for scanner.Scan() {
        lineNum++

        var record Record
        if err := json.Unmarshal(scanner.Bytes(), &record); err != nil {
            log.Printf("line %d: invalid JSON: %v", lineNum, err)
            continue
        }

        batch = append(batch, record)

        // Process batch when full
        if len(batch) >= batchSize {
            if err := processBatch(batch); err != nil {
                log.Printf("batch failed: %v", err)
            }

            // Reset batch, reusing underlying array
            batch = batch[:0]
        }
    }

    // Process remaining records
    if len(batch) > 0 {
        if err := processBatch(batch); err != nil {
            log.Printf("final batch failed: %v", err)
        }
    }

    return scanner.Err()
}

func processBatch(records []Record) error {
    // Process all records in the batch
    for _, r := range records {
        if err := processRecord(r.ID, r.Data); err != nil {
            return err
        }
    }
    return nil
}
```

By reusing the batch slice with `batch[:0]`, you avoid repeated memory allocations. The underlying array is preserved while the slice length is reset to zero.

## Progress Tracking and Checkpointing

Long-running jobs need progress tracking and the ability to resume after failures:

```go
package main

import (
    "encoding/json"
    "log"
    "os"
    "time"
)

// Checkpoint stores the state of a batch job
type Checkpoint struct {
    LastProcessedID int       `json:"last_processed_id"`
    ProcessedCount  int       `json:"processed_count"`
    UpdatedAt       time.Time `json:"updated_at"`
}

// SaveCheckpoint writes current progress to a file
func SaveCheckpoint(filepath string, lastID, count int) error {
    cp := Checkpoint{
        LastProcessedID: lastID,
        ProcessedCount:  count,
        UpdatedAt:       time.Now(),
    }

    data, err := json.Marshal(cp)
    if err != nil {
        return err
    }

    // Write to temp file first, then rename for atomicity
    tmpPath := filepath + ".tmp"
    if err := os.WriteFile(tmpPath, data, 0644); err != nil {
        return err
    }

    return os.Rename(tmpPath, filepath)
}

// LoadCheckpoint reads the last saved checkpoint
func LoadCheckpoint(filepath string) (*Checkpoint, error) {
    data, err := os.ReadFile(filepath)
    if os.IsNotExist(err) {
        return &Checkpoint{}, nil // Fresh start
    }
    if err != nil {
        return nil, err
    }

    var cp Checkpoint
    if err := json.Unmarshal(data, &cp); err != nil {
        return nil, err
    }

    return &cp, nil
}

// ProcessWithCheckpoint resumes from the last saved position
func ProcessWithCheckpoint(db *sql.DB, checkpointFile string) error {
    cp, err := LoadCheckpoint(checkpointFile)
    if err != nil {
        return err
    }

    if cp.LastProcessedID > 0 {
        log.Printf("resuming from ID %d (%d records previously processed)",
            cp.LastProcessedID, cp.ProcessedCount)
    }

    lastID := cp.LastProcessedID
    totalProcessed := cp.ProcessedCount

    for {
        rows, err := db.Query(
            "SELECT id, data FROM records WHERE id > $1 ORDER BY id LIMIT $2",
            lastID, batchSize,
        )
        if err != nil {
            return err
        }

        count := 0

        for rows.Next() {
            var id int
            var data string
            if err := rows.Scan(&id, &data); err != nil {
                rows.Close()
                return err
            }

            if err := processRecord(id, data); err != nil {
                log.Printf("failed to process record %d: %v", id, err)
            }

            lastID = id
            count++
            totalProcessed++
        }
        rows.Close()

        if count == 0 {
            break
        }

        // Save checkpoint after each batch
        if err := SaveCheckpoint(checkpointFile, lastID, totalProcessed); err != nil {
            log.Printf("failed to save checkpoint: %v", err)
        }
    }

    return nil
}
```

The atomic write pattern - writing to a temporary file then renaming - prevents corruption if the process dies mid-write.

## Rate Limiting for External APIs

When batch processing involves external API calls, rate limiting prevents overwhelming downstream services:

```go
package main

import (
    "context"
    "time"

    "golang.org/x/time/rate"
)

// RateLimitedProcessor wraps processing with rate limiting
type RateLimitedProcessor struct {
    limiter *rate.Limiter
}

// NewRateLimitedProcessor creates a processor that allows n requests per second
func NewRateLimitedProcessor(requestsPerSecond int) *RateLimitedProcessor {
    return &RateLimitedProcessor{
        // Allow burst of 10 requests, refill at requestsPerSecond rate
        limiter: rate.NewLimiter(rate.Limit(requestsPerSecond), 10),
    }
}

// Process waits for rate limit token before processing
func (p *RateLimitedProcessor) Process(ctx context.Context, record Record) error {
    // Wait blocks until a token is available or context is cancelled
    if err := p.limiter.Wait(ctx); err != nil {
        return err
    }

    return processRecord(record.ID, record.Data)
}
```

The `golang.org/x/time/rate` package provides a token bucket rate limiter. The burst parameter allows short bursts of activity while maintaining the average rate over time.

## Putting It All Together

A production batch processor combines all these patterns:

```go
package main

import (
    "context"
    "database/sql"
    "log"
    "os"
    "os/signal"
    "sync"
    "syscall"
)

// BatchProcessor orchestrates large-scale data processing
type BatchProcessor struct {
    db             *sql.DB
    workerCount    int
    batchSize      int
    checkpointFile string
}

// Run executes the batch job with graceful shutdown support
func (bp *BatchProcessor) Run(ctx context.Context) error {
    // Set up graceful shutdown
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        <-sigChan
        log.Println("shutdown signal received, finishing current batch...")
        cancel()
    }()

    // Load checkpoint for resume capability
    cp, err := LoadCheckpoint(bp.checkpointFile)
    if err != nil {
        return err
    }

    jobs := make(chan Record, bp.batchSize)
    result := &BatchResult{}

    var wg sync.WaitGroup

    // Start workers
    for i := 0; i < bp.workerCount; i++ {
        wg.Add(1)
        go bp.worker(&wg, jobs, result)
    }

    // Process records
    lastID := cp.LastProcessedID

    for {
        select {
        case <-ctx.Done():
            close(jobs)
            wg.Wait()
            log.Printf("stopped gracefully: %s", result.Summary())
            return nil
        default:
        }

        count, newLastID, err := bp.fetchAndDispatch(lastID, jobs)
        if err != nil {
            close(jobs)
            return err
        }

        if count == 0 {
            break
        }

        lastID = newLastID
        SaveCheckpoint(bp.checkpointFile, lastID, result.Processed)
    }

    close(jobs)
    wg.Wait()

    log.Printf("completed: %s", result.Summary())
    return nil
}
```

This structure gives you resumable processing, concurrent workers, graceful shutdown on SIGTERM, and progress tracking. When deploying to Kubernetes or running as a systemd service, these features ensure reliable operation.

## Conclusion

Batch processing in Go comes down to a few key principles: process data in chunks to control memory, use cursor-based pagination for efficient database queries, leverage goroutines for concurrent processing, and implement checkpointing for reliability. The patterns shown here scale from thousands to billions of records with minimal changes.

Start simple with sequential processing and add concurrency only when you have measured the bottleneck. Often, the database query or network call is the limiting factor, not CPU processing. Profile before optimizing, and let the numbers guide your decisions.
