# How to Implement Worker Pools in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Concurrency, Worker Pool, Performance, Parallel Processing

Description: Implement efficient worker pools in Go for bounded concurrency, handling both CPU-intensive and I/O-bound tasks with proper resource management.

---

Concurrency is one of Go's most powerful features, but unbounded goroutine creation can quickly exhaust system resources. Worker pools provide a structured approach to managing concurrent work, ensuring predictable resource usage while maximizing throughput. This guide covers everything you need to implement production-ready worker pools in Go.

## Understanding Worker Pools

A worker pool is a concurrency pattern that maintains a fixed number of goroutines (workers) ready to process tasks from a shared queue. Instead of spawning a new goroutine for each task, work is distributed among pre-allocated workers.

### Why Use Worker Pools?

Worker pools solve several critical problems:

1. **Resource Control**: Limit the number of concurrent operations to prevent resource exhaustion
2. **Predictable Memory Usage**: Fixed number of goroutines means predictable memory consumption
3. **Connection Management**: Control database connections, file handles, or API rate limits
4. **Backpressure Handling**: Naturally slow down producers when workers are overwhelmed
5. **Graceful Degradation**: System remains responsive under high load

### When to Use Worker Pools

Worker pools are ideal for:

- **CPU-intensive tasks**: Image processing, cryptographic operations, data compression
- **I/O-bound operations**: HTTP requests, database queries, file operations
- **Rate-limited APIs**: External service calls with request limits
- **Batch processing**: Processing large datasets in controlled chunks

## Basic Worker Pool Implementation

Let's start with a fundamental worker pool implementation that processes jobs from a channel.

### Simple Worker Pool Structure

The following code demonstrates a basic worker pool with a configurable number of workers processing jobs concurrently:

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// Job represents a unit of work to be processed
type Job struct {
    ID      int
    Payload string
}

// Result represents the outcome of processing a job
type Result struct {
    JobID  int
    Output string
    Error  error
}

// Worker processes jobs from the jobs channel and sends results to the results channel
func Worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()

    for job := range jobs {
        // Simulate work being done
        time.Sleep(100 * time.Millisecond)

        result := Result{
            JobID:  job.ID,
            Output: fmt.Sprintf("Worker %d processed: %s", id, job.Payload),
        }
        results <- result
    }
}

func main() {
    const numWorkers = 5
    const numJobs = 20

    jobs := make(chan Job, numJobs)
    results := make(chan Result, numJobs)

    var wg sync.WaitGroup

    // Start workers
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go Worker(w, jobs, results, &wg)
    }

    // Send jobs to the workers
    for j := 1; j <= numJobs; j++ {
        jobs <- Job{ID: j, Payload: fmt.Sprintf("Task-%d", j)}
    }
    close(jobs)

    // Wait for all workers to complete and close results
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect results
    for result := range results {
        fmt.Printf("Result: %s\n", result.Output)
    }
}
```

## Buffered vs Unbuffered Channels

Channel buffering significantly impacts worker pool behavior. Understanding the differences is crucial for optimal performance.

### Unbuffered Channels

Unbuffered channels provide synchronous communication and natural backpressure:

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // Unbuffered channel - sender blocks until receiver is ready
    jobs := make(chan int)

    // Worker (receiver)
    go func() {
        for job := range jobs {
            fmt.Printf("Processing job %d\n", job)
            time.Sleep(500 * time.Millisecond) // Slow processing
        }
    }()

    // Producer - will block on each send until worker receives
    start := time.Now()
    for i := 1; i <= 5; i++ {
        fmt.Printf("Sending job %d at %v\n", i, time.Since(start))
        jobs <- i
    }
    close(jobs)

    time.Sleep(3 * time.Second)
}
```

### Buffered Channels

Buffered channels allow producers to continue without waiting, up to the buffer size:

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // Buffered channel - sender can send up to 3 items without blocking
    jobs := make(chan int, 3)

    // Worker (receiver)
    go func() {
        for job := range jobs {
            fmt.Printf("Processing job %d\n", job)
            time.Sleep(500 * time.Millisecond)
        }
    }()

    // Producer - first 3 sends won't block
    start := time.Now()
    for i := 1; i <= 5; i++ {
        fmt.Printf("Sending job %d at %v\n", i, time.Since(start))
        jobs <- i
    }
    close(jobs)

    time.Sleep(3 * time.Second)
}
```

### Choosing the Right Buffer Size

Buffer sizing depends on your use case:

```go
package main

import "runtime"

// BufferSizeGuidelines demonstrates different buffer sizing strategies
func BufferSizeGuidelines() {
    numWorkers := runtime.NumCPU()

    // CPU-bound tasks: Buffer equal to number of workers
    // Provides one job ready for each worker
    cpuBoundBuffer := make(chan Job, numWorkers)

    // I/O-bound tasks: Larger buffer to absorb latency spikes
    // Typically 2-10x the number of workers
    ioBoundBuffer := make(chan Job, numWorkers*5)

    // Batch processing: Buffer sized to batch
    batchSize := 1000
    batchBuffer := make(chan Job, batchSize)

    // Memory-constrained: Smaller buffer with backpressure
    memoryConstrainedBuffer := make(chan Job, 10)

    _, _, _, _ = cpuBoundBuffer, ioBoundBuffer, batchBuffer, memoryConstrainedBuffer
}
```

## Dynamic Pool Sizing

Static worker pools may not adapt well to varying workloads. Dynamic pool sizing adjusts worker count based on demand.

### Auto-Scaling Worker Pool

This implementation monitors queue depth and adjusts worker count accordingly:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "sync/atomic"
    "time"
)

// DynamicPool manages a pool of workers that scales based on workload
type DynamicPool struct {
    jobs         chan Job
    results      chan Result
    minWorkers   int
    maxWorkers   int
    activeCount  int32
    workerCount  int32
    wg           sync.WaitGroup
    ctx          context.Context
    cancel       context.CancelFunc
    mu           sync.Mutex
}

// NewDynamicPool creates a new dynamic worker pool
func NewDynamicPool(minWorkers, maxWorkers, bufferSize int) *DynamicPool {
    ctx, cancel := context.WithCancel(context.Background())

    pool := &DynamicPool{
        jobs:       make(chan Job, bufferSize),
        results:    make(chan Result, bufferSize),
        minWorkers: minWorkers,
        maxWorkers: maxWorkers,
        ctx:        ctx,
        cancel:     cancel,
    }

    // Start minimum number of workers
    for i := 0; i < minWorkers; i++ {
        pool.addWorker()
    }

    // Start the scaler goroutine
    go pool.scaler()

    return pool
}

// addWorker adds a new worker to the pool
func (p *DynamicPool) addWorker() {
    atomic.AddInt32(&p.workerCount, 1)
    p.wg.Add(1)

    go func() {
        defer p.wg.Done()
        defer atomic.AddInt32(&p.workerCount, -1)

        for {
            select {
            case <-p.ctx.Done():
                return
            case job, ok := <-p.jobs:
                if !ok {
                    return
                }

                atomic.AddInt32(&p.activeCount, 1)
                result := p.processJob(job)
                atomic.AddInt32(&p.activeCount, -1)

                select {
                case p.results <- result:
                case <-p.ctx.Done():
                    return
                }
            }
        }
    }()
}

// processJob handles the actual work
func (p *DynamicPool) processJob(job Job) Result {
    time.Sleep(100 * time.Millisecond) // Simulate work
    return Result{
        JobID:  job.ID,
        Output: fmt.Sprintf("Processed: %s", job.Payload),
    }
}

// scaler monitors workload and adjusts worker count
func (p *DynamicPool) scaler() {
    ticker := time.NewTicker(100 * time.Millisecond)
    defer ticker.Stop()

    for {
        select {
        case <-p.ctx.Done():
            return
        case <-ticker.C:
            queueDepth := len(p.jobs)
            workers := atomic.LoadInt32(&p.workerCount)
            active := atomic.LoadInt32(&p.activeCount)

            // Scale up if queue is backing up and all workers are busy
            if queueDepth > int(workers) && active == workers && int(workers) < p.maxWorkers {
                p.addWorker()
                fmt.Printf("Scaled up to %d workers (queue: %d)\n",
                    atomic.LoadInt32(&p.workerCount), queueDepth)
            }

            // Scale down if workers are idle (implementation simplified)
            if queueDepth == 0 && active < workers/2 && int(workers) > p.minWorkers {
                // In production, you'd signal a specific worker to exit
                fmt.Printf("Would scale down from %d workers\n", workers)
            }
        }
    }
}

// Submit adds a job to the pool
func (p *DynamicPool) Submit(job Job) error {
    select {
    case p.jobs <- job:
        return nil
    case <-p.ctx.Done():
        return fmt.Errorf("pool is shutting down")
    }
}

// Results returns the results channel
func (p *DynamicPool) Results() <-chan Result {
    return p.results
}

// Shutdown gracefully shuts down the pool
func (p *DynamicPool) Shutdown() {
    close(p.jobs)
    p.wg.Wait()
    close(p.results)
    p.cancel()
}

func main() {
    pool := NewDynamicPool(2, 10, 100)

    // Submit jobs
    go func() {
        for i := 1; i <= 50; i++ {
            pool.Submit(Job{ID: i, Payload: fmt.Sprintf("Task-%d", i)})
        }
    }()

    // Collect results with timeout
    timeout := time.After(10 * time.Second)
    collected := 0

    for collected < 50 {
        select {
        case result := <-pool.Results():
            fmt.Printf("Result: %s\n", result.Output)
            collected++
        case <-timeout:
            fmt.Println("Timeout reached")
            pool.Shutdown()
            return
        }
    }

    pool.Shutdown()
}
```

## Graceful Shutdown

Proper shutdown handling ensures no work is lost and resources are cleaned up correctly.

### Context-Based Shutdown

This implementation uses context for coordinated shutdown across all workers:

```go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

// GracefulPool implements a worker pool with proper shutdown handling
type GracefulPool struct {
    jobs       chan Job
    results    chan Result
    numWorkers int
    wg         sync.WaitGroup
    ctx        context.Context
    cancel     context.CancelFunc
}

// NewGracefulPool creates a pool with graceful shutdown support
func NewGracefulPool(numWorkers, bufferSize int) *GracefulPool {
    ctx, cancel := context.WithCancel(context.Background())

    pool := &GracefulPool{
        jobs:       make(chan Job, bufferSize),
        results:    make(chan Result, bufferSize),
        numWorkers: numWorkers,
        ctx:        ctx,
        cancel:     cancel,
    }

    pool.start()
    return pool
}

// start initializes all workers
func (p *GracefulPool) start() {
    for i := 0; i < p.numWorkers; i++ {
        p.wg.Add(1)
        go p.worker(i)
    }
}

// worker processes jobs until shutdown
func (p *GracefulPool) worker(id int) {
    defer p.wg.Done()

    for {
        select {
        case <-p.ctx.Done():
            // Context cancelled, but drain remaining jobs first
            for job := range p.jobs {
                result := p.processJob(id, job)
                select {
                case p.results <- result:
                default:
                    // Results channel full or closed, log and continue
                    fmt.Printf("Worker %d: couldn't send result for job %d\n", id, job.ID)
                }
            }
            fmt.Printf("Worker %d: shutdown complete\n", id)
            return

        case job, ok := <-p.jobs:
            if !ok {
                // Jobs channel closed
                fmt.Printf("Worker %d: no more jobs\n", id)
                return
            }
            result := p.processJob(id, job)
            select {
            case p.results <- result:
            case <-p.ctx.Done():
                // Try to send result even during shutdown
                select {
                case p.results <- result:
                default:
                }
            }
        }
    }
}

// processJob simulates work
func (p *GracefulPool) processJob(workerID int, job Job) Result {
    time.Sleep(50 * time.Millisecond)
    return Result{
        JobID:  job.ID,
        Output: fmt.Sprintf("Worker %d completed job %d", workerID, job.ID),
    }
}

// Submit adds a job to the pool
func (p *GracefulPool) Submit(job Job) error {
    select {
    case <-p.ctx.Done():
        return fmt.Errorf("pool is shutting down")
    case p.jobs <- job:
        return nil
    }
}

// Shutdown performs graceful shutdown with timeout
func (p *GracefulPool) Shutdown(timeout time.Duration) error {
    // Signal shutdown
    p.cancel()

    // Close jobs channel to signal workers
    close(p.jobs)

    // Wait for workers with timeout
    done := make(chan struct{})
    go func() {
        p.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        close(p.results)
        return nil
    case <-time.After(timeout):
        return fmt.Errorf("shutdown timed out after %v", timeout)
    }
}

// Results returns the results channel
func (p *GracefulPool) Results() <-chan Result {
    return p.results
}

func main() {
    pool := NewGracefulPool(4, 100)

    // Handle OS signals for graceful shutdown
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    // Submit jobs in background
    go func() {
        for i := 1; i <= 100; i++ {
            if err := pool.Submit(Job{ID: i, Payload: fmt.Sprintf("Task-%d", i)}); err != nil {
                fmt.Printf("Failed to submit job %d: %v\n", i, err)
                return
            }
            time.Sleep(10 * time.Millisecond)
        }
    }()

    // Collect results in background
    go func() {
        for result := range pool.Results() {
            fmt.Printf("Result: %s\n", result.Output)
        }
    }()

    // Wait for signal
    sig := <-sigChan
    fmt.Printf("\nReceived signal: %v, shutting down...\n", sig)

    if err := pool.Shutdown(5 * time.Second); err != nil {
        fmt.Printf("Shutdown error: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("Shutdown complete")
}
```

## Error Handling and Result Collection

Robust error handling is essential for production worker pools. Here's a comprehensive approach:

### Error-Aware Worker Pool

This implementation provides detailed error tracking and result aggregation:

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "math/rand"
    "sync"
    "time"
)

// JobStatus represents the outcome of a job
type JobStatus int

const (
    StatusSuccess JobStatus = iota
    StatusFailed
    StatusTimeout
    StatusCancelled
)

// DetailedResult contains comprehensive job outcome information
type DetailedResult struct {
    JobID     int
    Status    JobStatus
    Output    interface{}
    Error     error
    Duration  time.Duration
    WorkerID  int
    Retries   int
}

// ErrorAwarePool handles errors and collects detailed results
type ErrorAwarePool struct {
    jobs         chan Job
    results      chan DetailedResult
    numWorkers   int
    maxRetries   int
    retryDelay   time.Duration
    wg           sync.WaitGroup
    ctx          context.Context
    cancel       context.CancelFunc

    // Statistics
    mu           sync.Mutex
    stats        PoolStats
}

// PoolStats tracks pool performance metrics
type PoolStats struct {
    TotalJobs      int64
    SuccessCount   int64
    FailureCount   int64
    TotalRetries   int64
    TotalDuration  time.Duration
}

// NewErrorAwarePool creates a pool with error handling
func NewErrorAwarePool(numWorkers, bufferSize, maxRetries int, retryDelay time.Duration) *ErrorAwarePool {
    ctx, cancel := context.WithCancel(context.Background())

    pool := &ErrorAwarePool{
        jobs:       make(chan Job, bufferSize),
        results:    make(chan DetailedResult, bufferSize),
        numWorkers: numWorkers,
        maxRetries: maxRetries,
        retryDelay: retryDelay,
        ctx:        ctx,
        cancel:     cancel,
    }

    pool.start()
    return pool
}

// start initializes workers
func (p *ErrorAwarePool) start() {
    for i := 0; i < p.numWorkers; i++ {
        p.wg.Add(1)
        go p.worker(i)
    }
}

// worker processes jobs with retry logic
func (p *ErrorAwarePool) worker(id int) {
    defer p.wg.Done()

    for {
        select {
        case <-p.ctx.Done():
            return
        case job, ok := <-p.jobs:
            if !ok {
                return
            }

            result := p.executeWithRetry(id, job)

            // Update stats
            p.mu.Lock()
            p.stats.TotalJobs++
            p.stats.TotalDuration += result.Duration
            p.stats.TotalRetries += int64(result.Retries)
            if result.Status == StatusSuccess {
                p.stats.SuccessCount++
            } else {
                p.stats.FailureCount++
            }
            p.mu.Unlock()

            select {
            case p.results <- result:
            case <-p.ctx.Done():
                return
            }
        }
    }
}

// executeWithRetry attempts job execution with retries
func (p *ErrorAwarePool) executeWithRetry(workerID int, job Job) DetailedResult {
    var lastErr error
    retries := 0
    startTime := time.Now()

    for attempt := 0; attempt <= p.maxRetries; attempt++ {
        if attempt > 0 {
            retries++
            select {
            case <-time.After(p.retryDelay):
            case <-p.ctx.Done():
                return DetailedResult{
                    JobID:    job.ID,
                    Status:   StatusCancelled,
                    Error:    context.Canceled,
                    Duration: time.Since(startTime),
                    WorkerID: workerID,
                    Retries:  retries,
                }
            }
        }

        output, err := p.processJob(job)
        if err == nil {
            return DetailedResult{
                JobID:    job.ID,
                Status:   StatusSuccess,
                Output:   output,
                Duration: time.Since(startTime),
                WorkerID: workerID,
                Retries:  retries,
            }
        }

        lastErr = err

        // Check if error is retryable
        if !isRetryable(err) {
            break
        }
    }

    return DetailedResult{
        JobID:    job.ID,
        Status:   StatusFailed,
        Error:    lastErr,
        Duration: time.Since(startTime),
        WorkerID: workerID,
        Retries:  retries,
    }
}

// processJob simulates work that might fail
func (p *ErrorAwarePool) processJob(job Job) (interface{}, error) {
    time.Sleep(50 * time.Millisecond)

    // Simulate random failures
    if rand.Float32() < 0.3 {
        return nil, errors.New("transient error")
    }

    return fmt.Sprintf("Processed: %s", job.Payload), nil
}

// isRetryable determines if an error warrants retry
func isRetryable(err error) bool {
    // In production, check for specific error types
    return err != nil && err.Error() == "transient error"
}

// Submit adds a job to the pool
func (p *ErrorAwarePool) Submit(job Job) error {
    select {
    case <-p.ctx.Done():
        return fmt.Errorf("pool is shutting down")
    case p.jobs <- job:
        return nil
    }
}

// Results returns the results channel
func (p *ErrorAwarePool) Results() <-chan DetailedResult {
    return p.results
}

// Stats returns current pool statistics
func (p *ErrorAwarePool) Stats() PoolStats {
    p.mu.Lock()
    defer p.mu.Unlock()
    return p.stats
}

// Shutdown gracefully shuts down the pool
func (p *ErrorAwarePool) Shutdown() {
    close(p.jobs)
    p.wg.Wait()
    close(p.results)
    p.cancel()
}

func main() {
    pool := NewErrorAwarePool(4, 100, 3, 100*time.Millisecond)

    // Submit jobs
    go func() {
        for i := 1; i <= 20; i++ {
            pool.Submit(Job{ID: i, Payload: fmt.Sprintf("Task-%d", i)})
        }
    }()

    // Collect results
    collected := 0
    for collected < 20 {
        result := <-pool.Results()
        collected++

        if result.Status == StatusSuccess {
            fmt.Printf("Job %d succeeded: %v (retries: %d, duration: %v)\n",
                result.JobID, result.Output, result.Retries, result.Duration)
        } else {
            fmt.Printf("Job %d failed: %v (retries: %d, duration: %v)\n",
                result.JobID, result.Error, result.Retries, result.Duration)
        }
    }

    stats := pool.Stats()
    fmt.Printf("\n--- Pool Statistics ---\n")
    fmt.Printf("Total Jobs: %d\n", stats.TotalJobs)
    fmt.Printf("Successes: %d\n", stats.SuccessCount)
    fmt.Printf("Failures: %d\n", stats.FailureCount)
    fmt.Printf("Total Retries: %d\n", stats.TotalRetries)
    fmt.Printf("Avg Duration: %v\n", stats.TotalDuration/time.Duration(stats.TotalJobs))

    pool.Shutdown()
}
```

## Rate Limiting Within Pools

When interacting with external services, rate limiting prevents overwhelming APIs and respecting quotas.

### Token Bucket Rate Limiter

This implementation uses a token bucket algorithm for smooth rate limiting:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
    tokens     chan struct{}
    refillRate time.Duration
    ctx        context.Context
    cancel     context.CancelFunc
}

// NewRateLimiter creates a rate limiter with specified rate
func NewRateLimiter(ratePerSecond int) *RateLimiter {
    ctx, cancel := context.WithCancel(context.Background())

    rl := &RateLimiter{
        tokens:     make(chan struct{}, ratePerSecond),
        refillRate: time.Second / time.Duration(ratePerSecond),
        ctx:        ctx,
        cancel:     cancel,
    }

    // Fill initial tokens
    for i := 0; i < ratePerSecond; i++ {
        rl.tokens <- struct{}{}
    }

    // Start token refiller
    go rl.refill()

    return rl
}

// refill adds tokens at the specified rate
func (rl *RateLimiter) refill() {
    ticker := time.NewTicker(rl.refillRate)
    defer ticker.Stop()

    for {
        select {
        case <-rl.ctx.Done():
            return
        case <-ticker.C:
            select {
            case rl.tokens <- struct{}{}:
            default:
                // Bucket is full
            }
        }
    }
}

// Acquire waits for a token
func (rl *RateLimiter) Acquire(ctx context.Context) error {
    select {
    case <-rl.tokens:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    case <-rl.ctx.Done():
        return fmt.Errorf("rate limiter closed")
    }
}

// Stop shuts down the rate limiter
func (rl *RateLimiter) Stop() {
    rl.cancel()
}

// RateLimitedPool combines worker pool with rate limiting
type RateLimitedPool struct {
    jobs        chan Job
    results     chan Result
    numWorkers  int
    rateLimiter *RateLimiter
    wg          sync.WaitGroup
    ctx         context.Context
    cancel      context.CancelFunc
}

// NewRateLimitedPool creates a pool with rate limiting
func NewRateLimitedPool(numWorkers, bufferSize, ratePerSecond int) *RateLimitedPool {
    ctx, cancel := context.WithCancel(context.Background())

    pool := &RateLimitedPool{
        jobs:        make(chan Job, bufferSize),
        results:     make(chan Result, bufferSize),
        numWorkers:  numWorkers,
        rateLimiter: NewRateLimiter(ratePerSecond),
        ctx:         ctx,
        cancel:      cancel,
    }

    pool.start()
    return pool
}

// start initializes workers
func (p *RateLimitedPool) start() {
    for i := 0; i < p.numWorkers; i++ {
        p.wg.Add(1)
        go p.worker(i)
    }
}

// worker processes jobs respecting rate limits
func (p *RateLimitedPool) worker(id int) {
    defer p.wg.Done()

    for {
        select {
        case <-p.ctx.Done():
            return
        case job, ok := <-p.jobs:
            if !ok {
                return
            }

            // Wait for rate limiter token before processing
            if err := p.rateLimiter.Acquire(p.ctx); err != nil {
                return
            }

            start := time.Now()
            result := p.processJob(id, job)
            result.Output = fmt.Sprintf("%s (took %v)", result.Output, time.Since(start))

            select {
            case p.results <- result:
            case <-p.ctx.Done():
                return
            }
        }
    }
}

// processJob simulates an API call
func (p *RateLimitedPool) processJob(workerID int, job Job) Result {
    // Simulate API call
    time.Sleep(50 * time.Millisecond)
    return Result{
        JobID:  job.ID,
        Output: fmt.Sprintf("Worker %d processed job %d", workerID, job.ID),
    }
}

// Submit adds a job to the pool
func (p *RateLimitedPool) Submit(job Job) error {
    select {
    case <-p.ctx.Done():
        return fmt.Errorf("pool is shutting down")
    case p.jobs <- job:
        return nil
    }
}

// Results returns the results channel
func (p *RateLimitedPool) Results() <-chan Result {
    return p.results
}

// Shutdown gracefully shuts down the pool
func (p *RateLimitedPool) Shutdown() {
    close(p.jobs)
    p.wg.Wait()
    close(p.results)
    p.rateLimiter.Stop()
    p.cancel()
}

func main() {
    // Create pool with 10 workers but limit to 5 requests per second
    pool := NewRateLimitedPool(10, 100, 5)

    start := time.Now()

    // Submit 20 jobs
    go func() {
        for i := 1; i <= 20; i++ {
            pool.Submit(Job{ID: i, Payload: fmt.Sprintf("API-Call-%d", i)})
        }
    }()

    // Collect results
    collected := 0
    for collected < 20 {
        result := <-pool.Results()
        collected++
        fmt.Printf("[%v] %s\n", time.Since(start).Round(time.Millisecond), result.Output)
    }

    fmt.Printf("\nTotal time: %v (expected ~4s for 20 jobs at 5/sec)\n", time.Since(start))
    pool.Shutdown()
}
```

## Best Practices Summary

When implementing worker pools in Go, keep these guidelines in mind:

### Design Principles

1. **Start simple**: Begin with a basic pool and add complexity as needed
2. **Use contexts**: Always support cancellation via context.Context
3. **Prefer channels for communication**: Let workers pull work rather than pushing to them
4. **Size appropriately**: CPU-bound tasks benefit from GOMAXPROCS workers; I/O-bound tasks can handle more

### Performance Considerations

1. **Buffer sizing matters**: Too small causes blocking; too large wastes memory
2. **Monitor queue depth**: Indicates if workers are keeping up with demand
3. **Profile your workloads**: Measure before optimizing
4. **Consider worker locality**: Group related work to improve cache performance

### Reliability Patterns

1. **Always implement graceful shutdown**: Prevent work loss during restarts
2. **Add timeouts**: Prevent workers from hanging indefinitely
3. **Implement circuit breakers**: Protect against cascading failures
4. **Log appropriately**: Track job completion, failures, and retry attempts

### Common Pitfalls to Avoid

1. **Forgetting to close channels**: Causes goroutine leaks
2. **Ignoring context cancellation**: Workers should respect shutdown signals
3. **Not draining channels on shutdown**: May lose in-flight work
4. **Using unbounded concurrency**: Can exhaust system resources

## Conclusion

Worker pools are fundamental to building robust, scalable Go applications. By implementing bounded concurrency, you gain control over resource usage while maintaining high throughput. The patterns covered in this guide provide a solid foundation for handling both CPU-intensive and I/O-bound workloads efficiently.

Start with a simple implementation and iterate based on your specific requirements. Monitor your pools in production, collect metrics, and tune buffer sizes and worker counts based on real-world performance data. With proper implementation, worker pools become a reliable foundation for concurrent processing in your Go applications.
