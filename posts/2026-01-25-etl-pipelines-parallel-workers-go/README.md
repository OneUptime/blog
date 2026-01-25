# How to Build ETL Pipelines with Parallel Workers in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, ETL, Data Pipeline, Parallel Processing, Concurrency

Description: Learn how to build efficient ETL pipelines in Go using goroutines and channels. This guide covers worker pools, error handling, backpressure management, and patterns that scale to millions of records.

---

ETL pipelines are the backbone of data engineering. They extract data from sources, transform it, and load it into destinations. When you are processing millions of records, single-threaded execution is painfully slow. Go's concurrency primitives make parallel ETL straightforward without the complexity of thread management you would face in other languages.

This guide walks through building a production-grade ETL pipeline with parallel workers. We will cover the core patterns, handle errors gracefully, and manage backpressure so your pipeline does not overwhelm downstream systems.

## The Problem with Sequential ETL

Consider a typical ETL job: read 10 million rows from a database, transform each row, and write to another system. Sequential processing looks simple:

```go
for _, record := range records {
    transformed := transform(record)
    err := load(transformed)
    if err != nil {
        log.Printf("failed to load record %d: %v", record.ID, err)
    }
}
```

The issue is throughput. If each transform takes 1ms and each load takes 5ms, processing 10 million records takes over 16 hours. With 10 parallel workers, that drops to under 2 hours. With 100 workers, you are looking at 10 minutes.

## Building the Pipeline Architecture

A well-structured ETL pipeline in Go uses three stages connected by channels. The extractor reads data and sends it downstream. Workers transform records in parallel. The loader receives transformed data and writes it to the destination.

Here is the core structure:

```go
package main

import (
    "context"
    "sync"
)

// Record represents a single data record in the pipeline
type Record struct {
    ID   int64
    Data map[string]interface{}
}

// TransformedRecord is the output after transformation
type TransformedRecord struct {
    ID          int64
    ProcessedAt int64
    Result      string
}

// Pipeline coordinates the ETL stages
type Pipeline struct {
    workerCount int
    batchSize   int
}

func NewPipeline(workers, batchSize int) *Pipeline {
    return &Pipeline{
        workerCount: workers,
        batchSize:   batchSize,
    }
}
```

## Implementing the Worker Pool

The worker pool is where parallelism happens. Each worker pulls records from an input channel, transforms them, and pushes results to an output channel. The `sync.WaitGroup` ensures we wait for all workers to finish before closing the output channel.

```go
func (p *Pipeline) runWorkers(
    ctx context.Context,
    input <-chan Record,
    output chan<- TransformedRecord,
    transform func(Record) (TransformedRecord, error),
) {
    var wg sync.WaitGroup

    // Spawn worker goroutines
    for i := 0; i < p.workerCount; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()

            for {
                select {
                case <-ctx.Done():
                    // Context cancelled - stop processing
                    return
                case record, ok := <-input:
                    if !ok {
                        // Input channel closed - no more work
                        return
                    }

                    // Transform the record
                    result, err := transform(record)
                    if err != nil {
                        // Log error but continue processing
                        log.Printf("worker %d: transform failed for record %d: %v",
                            workerID, record.ID, err)
                        continue
                    }

                    // Send to output channel
                    select {
                    case output <- result:
                    case <-ctx.Done():
                        return
                    }
                }
            }
        }(i)
    }

    // Wait for all workers to finish, then close output
    wg.Wait()
    close(output)
}
```

Notice the nested `select` statements. The first handles both context cancellation and input channel reads. The second ensures we do not block forever when sending output if the context is cancelled. This pattern prevents goroutine leaks.

## Managing Backpressure with Buffered Channels

Backpressure is critical. If your transformer is faster than your loader, unbounded queuing will exhaust memory. Buffered channels provide natural flow control - when the buffer fills up, fast producers block until slow consumers catch up.

```go
func (p *Pipeline) Run(
    ctx context.Context,
    source DataSource,
    transform func(Record) (TransformedRecord, error),
    loader DataLoader,
) error {
    // Buffered channels create backpressure points
    // Size them based on memory constraints and latency requirements
    extracted := make(chan Record, p.batchSize)
    transformed := make(chan TransformedRecord, p.batchSize)

    var extractErr, loadErr error
    var wg sync.WaitGroup

    // Stage 1: Extract
    wg.Add(1)
    go func() {
        defer wg.Done()
        defer close(extracted)
        extractErr = source.Extract(ctx, extracted)
    }()

    // Stage 2: Transform (parallel workers)
    wg.Add(1)
    go func() {
        defer wg.Done()
        p.runWorkers(ctx, extracted, transformed, transform)
    }()

    // Stage 3: Load
    wg.Add(1)
    go func() {
        defer wg.Done()
        loadErr = loader.Load(ctx, transformed)
    }()

    wg.Wait()

    // Return first error encountered
    if extractErr != nil {
        return fmt.Errorf("extract failed: %w", extractErr)
    }
    if loadErr != nil {
        return fmt.Errorf("load failed: %w", loadErr)
    }
    return nil
}
```

The buffer size is a tuning parameter. Too small and your workers idle waiting for space. Too large and you waste memory. Start with a size equal to 2-3 times your worker count and adjust based on profiling.

## Handling Errors Without Stopping the World

Production ETL pipelines encounter bad records. A single malformed row should not crash the entire job. The pattern above logs errors and continues, but sometimes you need more control - maybe you want to collect all errors, retry transient failures, or stop after a threshold.

Here is a more sophisticated error handling approach:

```go
type PipelineResult struct {
    Processed   int64
    Failed      int64
    Errors      []error
    mu          sync.Mutex
}

func (r *PipelineResult) RecordError(err error) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.Failed++
    // Keep only first 100 errors to bound memory
    if len(r.Errors) < 100 {
        r.Errors = append(r.Errors, err)
    }
}

func (r *PipelineResult) RecordSuccess() {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.Processed++
}

// Check if failure rate exceeds threshold
func (r *PipelineResult) ShouldAbort(threshold float64) bool {
    r.mu.Lock()
    defer r.mu.Unlock()
    total := r.Processed + r.Failed
    if total < 100 {
        return false // Need minimum sample size
    }
    failRate := float64(r.Failed) / float64(total)
    return failRate > threshold
}
```

Pass this result tracker into your workers and check `ShouldAbort` periodically. If 10% of records fail, you probably have a systemic issue worth investigating before burning through the remaining 90%.

## Batching for Efficient Loads

Individual inserts are slow. Most databases and APIs perform better with batch operations. Add a batching layer between your workers and the final load:

```go
func batchLoader(
    ctx context.Context,
    input <-chan TransformedRecord,
    batchSize int,
    loadBatch func([]TransformedRecord) error,
) error {
    batch := make([]TransformedRecord, 0, batchSize)

    flush := func() error {
        if len(batch) == 0 {
            return nil
        }
        err := loadBatch(batch)
        batch = batch[:0] // Reset slice, keep capacity
        return err
    }

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case record, ok := <-input:
            if !ok {
                // Channel closed - flush remaining records
                return flush()
            }

            batch = append(batch, record)
            if len(batch) >= batchSize {
                if err := flush(); err != nil {
                    return err
                }
            }
        }
    }
}
```

Batch sizes depend on your destination. For PostgreSQL bulk inserts, 1000-5000 rows per batch is typical. For HTTP APIs, check their rate limits and payload size restrictions.

## Putting It All Together

Here is a complete example that reads from a database, transforms records, and writes to another table:

```go
func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
    defer cancel()

    pipeline := NewPipeline(
        50,   // 50 parallel workers
        1000, // buffer size
    )

    source := NewPostgresSource(sourceDB, "SELECT * FROM events")
    loader := NewPostgresLoader(destDB, "processed_events", 500)

    transform := func(r Record) (TransformedRecord, error) {
        // Your transformation logic here
        return TransformedRecord{
            ID:          r.ID,
            ProcessedAt: time.Now().Unix(),
            Result:      processData(r.Data),
        }, nil
    }

    err := pipeline.Run(ctx, source, transform, loader)
    if err != nil {
        log.Fatalf("pipeline failed: %v", err)
    }

    log.Println("ETL pipeline completed successfully")
}
```

## Performance Tuning Tips

After building your pipeline, profile it. The `pprof` package shows where time is spent. Common bottlenecks:

- **Too few workers**: CPU is idle while waiting on I/O. Increase worker count.
- **Too many workers**: Context switching overhead dominates. Reduce workers or batch more aggressively.
- **Small batches**: Network round-trip latency kills throughput. Increase batch size.
- **Large batches**: Memory usage spikes. Reduce batch size or add streaming.

For CPU-bound transforms, set workers equal to `runtime.NumCPU()`. For I/O-bound work like API calls, you can safely run 10-100x more workers than CPU cores.

## Wrapping Up

Go makes parallel ETL pipelines approachable. Goroutines handle the concurrency, channels handle the communication, and `sync.WaitGroup` handles the coordination. The patterns here scale from thousands to billions of records - the same code, just more workers and bigger machines.

Start simple. Add complexity only when profiling reveals bottlenecks. And always test with realistic data volumes before deploying to production. A pipeline that works for 1000 records might fall over at 10 million due to memory pressure or rate limits you did not anticipate.
