# How to Implement Worker Pools in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Worker Pool, Concurrency, Goroutines, Channels

Description: Learn how to implement efficient worker pools in Go for processing jobs concurrently with controlled parallelism and graceful shutdown.

---

Worker pools limit concurrent goroutines to control resource usage while processing jobs in parallel. This pattern is essential for I/O-bound tasks, rate-limited APIs, and database operations.

---

## Basic Worker Pool

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        time.Sleep(time.Second)  // Simulate work
        results <- job * 2
    }
}

func main() {
    numJobs := 10
    numWorkers := 3
    
    jobs := make(chan int, numJobs)
    results := make(chan int, numJobs)
    
    var wg sync.WaitGroup
    
    // Start workers
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }
    
    // Send jobs
    for j := 1; j <= numJobs; j++ {
        jobs <- j
    }
    close(jobs)
    
    // Wait for completion
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Collect results
    for result := range results {
        fmt.Println("Result:", result)
    }
}
```

---

## Worker Pool with Struct

More organized approach:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

type Job struct {
    ID      int
    Payload string
}

type Result struct {
    JobID  int
    Output string
    Error  error
}

type WorkerPool struct {
    workers    int
    jobs       chan Job
    results    chan Result
    wg         sync.WaitGroup
}

func NewWorkerPool(workers int, jobBuffer int) *WorkerPool {
    return &WorkerPool{
        workers: workers,
        jobs:    make(chan Job, jobBuffer),
        results: make(chan Result, jobBuffer),
    }
}

func (wp *WorkerPool) Start(ctx context.Context) {
    for i := 0; i < wp.workers; i++ {
        wp.wg.Add(1)
        go wp.worker(ctx, i)
    }
}

func (wp *WorkerPool) worker(ctx context.Context, id int) {
    defer wp.wg.Done()
    
    for {
        select {
        case <-ctx.Done():
            return
        case job, ok := <-wp.jobs:
            if !ok {
                return
            }
            
            // Process job
            result := wp.processJob(job)
            
            select {
            case wp.results <- result:
            case <-ctx.Done():
                return
            }
        }
    }
}

func (wp *WorkerPool) processJob(job Job) Result {
    time.Sleep(100 * time.Millisecond)  // Simulate work
    return Result{
        JobID:  job.ID,
        Output: fmt.Sprintf("Processed: %s", job.Payload),
    }
}

func (wp *WorkerPool) Submit(job Job) {
    wp.jobs <- job
}

func (wp *WorkerPool) Results() <-chan Result {
    return wp.results
}

func (wp *WorkerPool) Close() {
    close(wp.jobs)
    wp.wg.Wait()
    close(wp.results)
}

func main() {
    ctx := context.Background()
    pool := NewWorkerPool(3, 100)
    pool.Start(ctx)
    
    // Submit jobs
    go func() {
        for i := 0; i < 10; i++ {
            pool.Submit(Job{ID: i, Payload: fmt.Sprintf("data-%d", i)})
        }
        pool.Close()
    }()
    
    // Collect results
    for result := range pool.Results() {
        fmt.Printf("Job %d: %s\n", result.JobID, result.Output)
    }
}
```

---

## Generic Worker Pool (Go 1.18+)

```go
package main

import (
    "context"
    "fmt"
    "sync"
)

type Pool[T any, R any] struct {
    workers int
    jobs    chan T
    results chan R
    process func(T) R
    wg      sync.WaitGroup
}

func NewPool[T any, R any](workers int, process func(T) R) *Pool[T, R] {
    return &Pool[T, R]{
        workers: workers,
        jobs:    make(chan T, workers*2),
        results: make(chan R, workers*2),
        process: process,
    }
}

func (p *Pool[T, R]) Start(ctx context.Context) {
    for i := 0; i < p.workers; i++ {
        p.wg.Add(1)
        go func() {
            defer p.wg.Done()
            for {
                select {
                case <-ctx.Done():
                    return
                case job, ok := <-p.jobs:
                    if !ok {
                        return
                    }
                    result := p.process(job)
                    select {
                    case p.results <- result:
                    case <-ctx.Done():
                        return
                    }
                }
            }
        }()
    }
}

func (p *Pool[T, R]) Submit(job T) {
    p.jobs <- job
}

func (p *Pool[T, R]) Results() <-chan R {
    return p.results
}

func (p *Pool[T, R]) Close() {
    close(p.jobs)
    p.wg.Wait()
    close(p.results)
}

func main() {
    // String processing pool
    pool := NewPool[string, int](3, func(s string) int {
        return len(s)
    })
    
    pool.Start(context.Background())
    
    go func() {
        words := []string{"hello", "world", "foo", "bar", "baz"}
        for _, w := range words {
            pool.Submit(w)
        }
        pool.Close()
    }()
    
    for length := range pool.Results() {
        fmt.Println("Length:", length)
    }
}
```

---

## Worker Pool with Error Handling

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

type Task struct {
    ID int
}

type TaskResult struct {
    TaskID int
    Value  string
    Err    error
}

func processTask(ctx context.Context, task Task) TaskResult {
    // Simulate random processing time
    select {
    case <-time.After(time.Duration(rand.Intn(100)) * time.Millisecond):
    case <-ctx.Done():
        return TaskResult{TaskID: task.ID, Err: ctx.Err()}
    }
    
    // Simulate random errors
    if rand.Float32() < 0.2 {
        return TaskResult{
            TaskID: task.ID,
            Err:    errors.New("random processing error"),
        }
    }
    
    return TaskResult{
        TaskID: task.ID,
        Value:  fmt.Sprintf("Task %d completed", task.ID),
    }
}

func worker(ctx context.Context, id int, tasks <-chan Task, results chan<- TaskResult, wg *sync.WaitGroup) {
    defer wg.Done()
    
    for {
        select {
        case <-ctx.Done():
            return
        case task, ok := <-tasks:
            if !ok {
                return
            }
            result := processTask(ctx, task)
            select {
            case results <- result:
            case <-ctx.Done():
                return
            }
        }
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    numWorkers := 5
    numTasks := 20
    
    tasks := make(chan Task, numTasks)
    results := make(chan TaskResult, numTasks)
    
    var wg sync.WaitGroup
    
    // Start workers
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go worker(ctx, i, tasks, results, &wg)
    }
    
    // Submit tasks
    go func() {
        for i := 0; i < numTasks; i++ {
            select {
            case tasks <- Task{ID: i}:
            case <-ctx.Done():
                return
            }
        }
        close(tasks)
    }()
    
    // Close results when workers done
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Process results
    var succeeded, failed int
    for result := range results {
        if result.Err != nil {
            fmt.Printf("Task %d failed: %v\n", result.TaskID, result.Err)
            failed++
        } else {
            fmt.Printf("Task %d: %s\n", result.TaskID, result.Value)
            succeeded++
        }
    }
    
    fmt.Printf("\nSummary: %d succeeded, %d failed\n", succeeded, failed)
}
```

---

## Dynamic Worker Pool

Adjust workers at runtime:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "sync/atomic"
    "time"
)

type DynamicPool struct {
    jobs         chan int
    results      chan int
    workerCount  int32
    maxWorkers   int32
    wg           sync.WaitGroup
    ctx          context.Context
    cancel       context.CancelFunc
}

func NewDynamicPool(maxWorkers int) *DynamicPool {
    ctx, cancel := context.WithCancel(context.Background())
    return &DynamicPool{
        jobs:       make(chan int, 100),
        results:    make(chan int, 100),
        maxWorkers: int32(maxWorkers),
        ctx:        ctx,
        cancel:     cancel,
    }
}

func (p *DynamicPool) AddWorker() bool {
    if atomic.LoadInt32(&p.workerCount) >= p.maxWorkers {
        return false
    }
    
    p.wg.Add(1)
    atomic.AddInt32(&p.workerCount, 1)
    
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
                time.Sleep(100 * time.Millisecond)
                p.results <- job * 2
            }
        }
    }()
    
    return true
}

func (p *DynamicPool) WorkerCount() int {
    return int(atomic.LoadInt32(&p.workerCount))
}

func (p *DynamicPool) Submit(job int) {
    p.jobs <- job
}

func (p *DynamicPool) Stop() {
    close(p.jobs)
    p.cancel()
    p.wg.Wait()
    close(p.results)
}

func main() {
    pool := NewDynamicPool(10)
    
    // Start with 2 workers
    pool.AddWorker()
    pool.AddWorker()
    
    fmt.Println("Workers:", pool.WorkerCount())
    
    // Add more workers based on load
    go func() {
        for i := 0; i < 50; i++ {
            pool.Submit(i)
            
            // Scale up if needed
            if i%10 == 0 && pool.AddWorker() {
                fmt.Println("Added worker, total:", pool.WorkerCount())
            }
        }
        pool.Stop()
    }()
    
    for result := range pool.results {
        fmt.Println("Result:", result)
    }
}
```

---

## Worker Pool with Rate Limiting

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

func rateLimitedWorker(
    ctx context.Context,
    id int,
    jobs <-chan int,
    results chan<- int,
    limiter <-chan time.Time,
    wg *sync.WaitGroup,
) {
    defer wg.Done()
    
    for {
        select {
        case <-ctx.Done():
            return
        case job, ok := <-jobs:
            if !ok {
                return
            }
            
            // Wait for rate limiter
            select {
            case <-limiter:
            case <-ctx.Done():
                return
            }
            
            // Process job
            fmt.Printf("Worker %d processing job %d at %v\n", 
                id, job, time.Now().Format("15:04:05.000"))
            results <- job * 2
        }
    }
}

func main() {
    ctx := context.Background()
    numWorkers := 5
    numJobs := 10
    rateLimit := 2 * time.Second  // 1 job per 2 seconds per worker
    
    jobs := make(chan int, numJobs)
    results := make(chan int, numJobs)
    limiter := time.Tick(rateLimit / time.Duration(numWorkers))
    
    var wg sync.WaitGroup
    
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go rateLimitedWorker(ctx, i, jobs, results, limiter, &wg)
    }
    
    // Submit jobs
    go func() {
        for i := 0; i < numJobs; i++ {
            jobs <- i
        }
        close(jobs)
    }()
    
    go func() {
        wg.Wait()
        close(results)
    }()
    
    for result := range results {
        fmt.Println("Result:", result)
    }
}
```

---

## Summary

| Pattern | Use Case |
|---------|----------|
| Basic pool | Simple parallel processing |
| Struct pool | Organized, reusable pool |
| Generic pool | Type-safe with any types |
| Error handling | Robust production code |
| Dynamic pool | Auto-scaling workers |
| Rate-limited | API rate limits, throttling |

**Best Practices:**

1. Buffer channels based on expected load
2. Always handle context cancellation
3. Use WaitGroup for graceful shutdown
4. Close channels from producer side
5. Handle errors in results
6. Consider rate limiting for external APIs
7. Monitor worker health with heartbeats

---

*Running worker pools in production? [OneUptime](https://oneuptime.com) helps you monitor job throughput, worker health, and processing latency.*
