# How to Build a Job Scheduler with Priority Queues in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Job Scheduler, Priority Queue, Background Jobs, Concurrency

Description: Learn how to build a robust job scheduler in Go using priority queues. This guide covers heap-based implementations, worker pools, and graceful shutdown patterns for production systems.

---

Background job processing is a core requirement for most production systems. Whether you're sending emails, processing images, or running analytics, you need a way to handle tasks asynchronously with different priority levels. In this post, we'll build a job scheduler from scratch using Go's heap package and goroutines.

## Why Priority Queues Matter

Not all jobs are created equal. A password reset email should be processed before a weekly newsletter. A payment webhook needs to be handled before a log cleanup task. Priority queues let you define this ordering explicitly, ensuring critical tasks get processed first even when your system is under load.

## The Building Blocks

We'll need three components:

1. A **Job** struct to represent work items
2. A **PriorityQueue** backed by a heap
3. A **Scheduler** that manages workers and job dispatch

Let's start with the job definition.

```go
package scheduler

import (
    "context"
    "time"
)

// Priority levels for jobs
const (
    PriorityCritical = 0  // Highest priority
    PriorityHigh     = 1
    PriorityNormal   = 2
    PriorityLow      = 3
)

// Job represents a unit of work to be processed
type Job struct {
    ID        string
    Priority  int
    Payload   interface{}
    Handler   func(ctx context.Context, payload interface{}) error
    CreatedAt time.Time
    index     int // Used internally by the heap
}
```

The `index` field is required by Go's heap package to track the position of items. We keep it unexported since it's an implementation detail.

## Implementing the Priority Queue

Go's `container/heap` package provides heap operations, but we need to implement the `heap.Interface`. This interface extends `sort.Interface` and adds `Push` and `Pop` methods.

```go
package scheduler

import "container/heap"

// PriorityQueue implements heap.Interface
type PriorityQueue []*Job

func (pq PriorityQueue) Len() int { return len(pq) }

func (pq PriorityQueue) Less(i, j int) bool {
    // Lower priority number means higher priority
    // If priorities are equal, earlier jobs go first (FIFO within priority)
    if pq[i].Priority == pq[j].Priority {
        return pq[i].CreatedAt.Before(pq[j].CreatedAt)
    }
    return pq[i].Priority < pq[j].Priority
}

func (pq PriorityQueue) Swap(i, j int) {
    pq[i], pq[j] = pq[j], pq[i]
    pq[i].index = i
    pq[j].index = j
}

func (pq *PriorityQueue) Push(x interface{}) {
    n := len(*pq)
    job := x.(*Job)
    job.index = n
    *pq = append(*pq, job)
}

func (pq *PriorityQueue) Pop() interface{} {
    old := *pq
    n := len(old)
    job := old[n-1]
    old[n-1] = nil  // Avoid memory leak
    job.index = -1  // Mark as removed
    *pq = old[0 : n-1]
    return job
}

// Initialize prepares the queue for use
func (pq *PriorityQueue) Initialize() {
    heap.Init(pq)
}
```

The `Less` function is where the magic happens. Jobs with lower priority numbers get processed first. When two jobs have the same priority, we fall back to creation time, ensuring fairness.

## Building the Scheduler

Now let's tie everything together with a scheduler that manages workers and coordinates job dispatch.

```go
package scheduler

import (
    "container/heap"
    "context"
    "sync"
    "time"
)

// Scheduler manages job processing with multiple workers
type Scheduler struct {
    queue      PriorityQueue
    mutex      sync.Mutex
    cond       *sync.Cond
    workers    int
    running    bool
    wg         sync.WaitGroup
    cancelFunc context.CancelFunc
}

// NewScheduler creates a scheduler with the specified number of workers
func NewScheduler(workers int) *Scheduler {
    s := &Scheduler{
        queue:   make(PriorityQueue, 0),
        workers: workers,
    }
    s.cond = sync.NewCond(&s.mutex)
    s.queue.Initialize()
    return s
}

// Submit adds a job to the queue
func (s *Scheduler) Submit(job *Job) {
    s.mutex.Lock()
    defer s.mutex.Unlock()

    if job.CreatedAt.IsZero() {
        job.CreatedAt = time.Now()
    }

    heap.Push(&s.queue, job)
    s.cond.Signal() // Wake up one waiting worker
}

// Start begins processing jobs
func (s *Scheduler) Start(ctx context.Context) {
    s.mutex.Lock()
    if s.running {
        s.mutex.Unlock()
        return
    }
    s.running = true

    ctx, s.cancelFunc = context.WithCancel(ctx)
    s.mutex.Unlock()

    // Spawn worker goroutines
    for i := 0; i < s.workers; i++ {
        s.wg.Add(1)
        go s.worker(ctx, i)
    }
}
```

The `cond.Signal()` call is important. It wakes up exactly one waiting worker when a new job arrives, avoiding the thundering herd problem where all workers wake up for a single job.

## The Worker Loop

Each worker runs in its own goroutine, waiting for jobs and processing them.

```go
func (s *Scheduler) worker(ctx context.Context, id int) {
    defer s.wg.Done()

    for {
        s.mutex.Lock()

        // Wait for a job or shutdown signal
        for s.queue.Len() == 0 && s.running {
            s.cond.Wait()
        }

        // Check if we should exit
        if !s.running && s.queue.Len() == 0 {
            s.mutex.Unlock()
            return
        }

        // Pop the highest priority job
        job := heap.Pop(&s.queue).(*Job)
        s.mutex.Unlock()

        // Process the job outside the lock
        if job.Handler != nil {
            if err := job.Handler(ctx, job.Payload); err != nil {
                // In production, you'd want proper error handling here
                // Log the error, maybe retry, or send to a dead letter queue
            }
        }
    }
}
```

Notice that we release the mutex before processing the job. This allows other workers to grab jobs while one is being processed. The mutex only protects queue access, not job execution.

## Graceful Shutdown

A production scheduler needs to shut down gracefully - finishing in-progress jobs and optionally draining the queue.

```go
// Stop signals workers to finish and waits for them
func (s *Scheduler) Stop(drain bool) {
    s.mutex.Lock()
    s.running = false

    if !drain {
        // Cancel ongoing jobs
        if s.cancelFunc != nil {
            s.cancelFunc()
        }
    }

    // Wake up all waiting workers so they can exit
    s.cond.Broadcast()
    s.mutex.Unlock()

    // Wait for all workers to finish
    s.wg.Wait()
}

// QueueLength returns the current number of pending jobs
func (s *Scheduler) QueueLength() int {
    s.mutex.Lock()
    defer s.mutex.Unlock()
    return s.queue.Len()
}
```

The `drain` parameter controls whether we wait for all queued jobs to complete or just the ones currently being processed.

## Putting It All Together

Here's how you'd use the scheduler in practice:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "yourproject/scheduler"
)

func main() {
    // Create a scheduler with 4 workers
    s := scheduler.NewScheduler(4)

    ctx := context.Background()
    s.Start(ctx)

    // Submit jobs with different priorities
    s.Submit(&scheduler.Job{
        ID:       "newsletter-batch",
        Priority: scheduler.PriorityLow,
        Payload:  []string{"user1@example.com", "user2@example.com"},
        Handler: func(ctx context.Context, payload interface{}) error {
            emails := payload.([]string)
            for _, email := range emails {
                fmt.Printf("Sending newsletter to %s\n", email)
            }
            return nil
        },
    })

    s.Submit(&scheduler.Job{
        ID:       "password-reset",
        Priority: scheduler.PriorityCritical,
        Payload:  "urgent@example.com",
        Handler: func(ctx context.Context, payload interface{}) error {
            email := payload.(string)
            fmt.Printf("Sending password reset to %s\n", email)
            return nil
        },
    })

    // Give jobs time to process
    time.Sleep(time.Second)

    // Graceful shutdown - wait for all queued jobs
    s.Stop(true)
}
```

Even though the newsletter job was submitted first, the password reset runs first because it has higher priority.

## Production Considerations

This implementation is a solid foundation, but production systems need a few more things:

**Persistence**: Jobs disappear if the process crashes. Consider backing the queue with Redis or a database for durability.

**Retries**: Add exponential backoff for failed jobs. Track retry counts and move jobs to a dead letter queue after too many failures.

**Metrics**: Instrument your scheduler with metrics for queue depth, processing latency, and error rates. This visibility is essential for tuning worker counts and identifying bottlenecks.

**Rate Limiting**: Some jobs might hit external APIs with rate limits. Consider adding per-handler rate limiters.

**Job Deduplication**: Prevent duplicate jobs by tracking job IDs in a set or using unique constraints in your persistence layer.

## Wrapping Up

Building a priority queue-based job scheduler in Go is straightforward thanks to the standard library's heap package. The key insights are using condition variables for efficient worker coordination and releasing locks during job execution to maximize concurrency.

This pattern scales well - you can easily extend it with persistence, monitoring, and retry logic to build a production-grade system. The priority queue ensures your most important work gets done first, even when your system is under pressure.
