# How to Build a Priority-Based Request Queue in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Priority Queue, Request Processing, Performance, Concurrency

Description: Learn how to build a production-ready priority-based request queue in Go using heap data structures, goroutines, and channels to handle high-priority requests before low-priority ones.

---

When you have limited processing capacity and requests with different importance levels, treating them equally causes problems. A payment webhook sitting behind thousands of analytics pings is a recipe for frustrated users. Priority queues solve this by ensuring critical requests get processed first.

This guide walks through building a priority-based request queue in Go from scratch. We will start simple and add features until we have something production-ready.

## Why Priority Queues Matter

Consider an API that handles both user-facing requests and background jobs. Without prioritization:

- A burst of batch imports blocks real-time user requests
- High-value enterprise customers wait behind free tier users
- Critical alerts queue behind routine health checks

Priority queues let you define what matters and enforce that ordering at runtime.

## The Heap Foundation

Go's `container/heap` package provides the building blocks. A heap is a tree structure where parents always have higher priority than children. This gives us O(log n) insertions and O(log n) extractions of the highest-priority item.

```go
package priorityqueue

import (
    "container/heap"
    "sync"
    "time"
)

// Request represents a single queued item with its priority
type Request struct {
    ID        string
    Priority  int       // Higher numbers = higher priority
    Payload   []byte
    CreatedAt time.Time
    index     int       // Internal index for heap operations
}

// PriorityHeap implements heap.Interface
type PriorityHeap []*Request

func (h PriorityHeap) Len() int { return len(h) }

// Less returns true if item i has higher priority than item j
// We use greater-than because heap.Pop returns the minimum,
// and we want the highest priority first
func (h PriorityHeap) Less(i, j int) bool {
    // Higher priority number means higher priority
    if h[i].Priority != h[j].Priority {
        return h[i].Priority > h[j].Priority
    }
    // Same priority: older requests first (FIFO within priority)
    return h[i].CreatedAt.Before(h[j].CreatedAt)
}

func (h PriorityHeap) Swap(i, j int) {
    h[i], h[j] = h[j], h[i]
    h[i].index = i
    h[j].index = j
}

func (h *PriorityHeap) Push(x any) {
    n := len(*h)
    item := x.(*Request)
    item.index = n
    *h = append(*h, item)
}

func (h *PriorityHeap) Pop() any {
    old := *h
    n := len(old)
    item := old[n-1]
    old[n-1] = nil  // Avoid memory leak
    item.index = -1
    *h = old[0 : n-1]
    return item
}
```

The `Less` function defines our ordering. Higher priority numbers come first. When priorities match, older requests take precedence. This prevents starvation where high-priority requests continuously jump ahead of waiting low-priority ones.

## Thread-Safe Queue Wrapper

The heap alone is not thread-safe. In a real application, multiple goroutines push and pop concurrently. We need synchronization.

```go
// Queue wraps the heap with thread-safe operations
type Queue struct {
    heap     PriorityHeap
    mu       sync.Mutex
    notEmpty *sync.Cond
    closed   bool
    maxSize  int
}

// NewQueue creates a bounded priority queue
func NewQueue(maxSize int) *Queue {
    q := &Queue{
        heap:    make(PriorityHeap, 0),
        maxSize: maxSize,
    }
    q.notEmpty = sync.NewCond(&q.mu)
    heap.Init(&q.heap)
    return q
}

// Push adds a request to the queue
// Returns false if queue is full or closed
func (q *Queue) Push(req *Request) bool {
    q.mu.Lock()
    defer q.mu.Unlock()

    if q.closed {
        return false
    }

    if q.maxSize > 0 && q.heap.Len() >= q.maxSize {
        return false
    }

    if req.CreatedAt.IsZero() {
        req.CreatedAt = time.Now()
    }

    heap.Push(&q.heap, req)
    q.notEmpty.Signal()  // Wake up one waiting consumer
    return true
}

// Pop removes and returns the highest priority request
// Blocks if queue is empty, returns nil if queue is closed
func (q *Queue) Pop() *Request {
    q.mu.Lock()
    defer q.mu.Unlock()

    for q.heap.Len() == 0 && !q.closed {
        q.notEmpty.Wait()
    }

    if q.closed && q.heap.Len() == 0 {
        return nil
    }

    return heap.Pop(&q.heap).(*Request)
}

// Close shuts down the queue and wakes blocked consumers
func (q *Queue) Close() {
    q.mu.Lock()
    defer q.mu.Unlock()

    q.closed = true
    q.notEmpty.Broadcast()  // Wake all waiting consumers
}

// Len returns current queue size
func (q *Queue) Len() int {
    q.mu.Lock()
    defer q.mu.Unlock()
    return q.heap.Len()
}
```

The `sync.Cond` handles the blocking behavior. When a consumer calls `Pop` on an empty queue, it waits until `Push` signals that new data arrived. This is more efficient than polling.

## Worker Pool with Priority Processing

A queue without consumers is useless. Let us build a worker pool that processes requests according to priority.

```go
// Worker processes requests from the queue
type Worker struct {
    id      int
    queue   *Queue
    handler func(*Request) error
    done    chan struct{}
}

// WorkerPool manages multiple workers
type WorkerPool struct {
    workers []*Worker
    queue   *Queue
}

// NewWorkerPool creates a pool of workers
func NewWorkerPool(numWorkers int, queue *Queue, handler func(*Request) error) *WorkerPool {
    pool := &WorkerPool{
        workers: make([]*Worker, numWorkers),
        queue:   queue,
    }

    for i := 0; i < numWorkers; i++ {
        pool.workers[i] = &Worker{
            id:      i,
            queue:   queue,
            handler: handler,
            done:    make(chan struct{}),
        }
    }

    return pool
}

// Start launches all workers
func (p *WorkerPool) Start() {
    for _, w := range p.workers {
        go w.run()
    }
}

// Stop shuts down all workers gracefully
func (p *WorkerPool) Stop() {
    p.queue.Close()
    for _, w := range p.workers {
        <-w.done
    }
}

func (w *Worker) run() {
    defer close(w.done)

    for {
        req := w.queue.Pop()
        if req == nil {
            return  // Queue closed
        }

        if err := w.handler(req); err != nil {
            // Log error, maybe requeue with backoff
            // For now, we just continue
        }
    }
}
```

## Putting It Together

Here is a complete example showing how to use the priority queue in an HTTP server context.

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"

    "github.com/google/uuid"
)

func main() {
    // Create queue with capacity for 10000 requests
    queue := NewQueue(10000)

    // Handler function processes each request
    handler := func(req *Request) error {
        log.Printf("Processing request %s (priority: %d)", req.ID, req.Priority)
        // Simulate work
        time.Sleep(100 * time.Millisecond)
        return nil
    }

    // Start worker pool with 10 workers
    pool := NewWorkerPool(10, queue, handler)
    pool.Start()

    // HTTP endpoint to submit requests
    http.HandleFunc("/submit", func(w http.ResponseWriter, r *http.Request) {
        var body struct {
            Priority int    `json:"priority"`
            Data     string `json:"data"`
        }

        if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
            http.Error(w, "Invalid JSON", http.StatusBadRequest)
            return
        }

        req := &Request{
            ID:       uuid.New().String(),
            Priority: body.Priority,
            Payload:  []byte(body.Data),
        }

        if !queue.Push(req) {
            http.Error(w, "Queue full", http.StatusServiceUnavailable)
            return
        }

        w.WriteHeader(http.StatusAccepted)
        fmt.Fprintf(w, "Queued: %s\n", req.ID)
    })

    // Stats endpoint
    http.HandleFunc("/stats", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Queue length: %d\n", queue.Len())
    })

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Handling Priority Starvation

One risk with priority queues is starvation. If high-priority requests keep arriving, low-priority ones never get processed. There are a few strategies to prevent this.

**Priority Aging**: Boost priority over time.

```go
// AdjustedPriority increases priority based on wait time
func (r *Request) AdjustedPriority() int {
    waited := time.Since(r.CreatedAt)
    // Add 1 priority level for every 10 seconds of waiting
    boost := int(waited.Seconds() / 10)
    return r.Priority + boost
}
```

**Reserved Capacity**: Dedicate some workers to low-priority queues.

```go
// Split workers across priority tiers
highPriorityQueue := NewQueue(5000)
lowPriorityQueue := NewQueue(5000)

// 8 workers for high priority, 2 for low priority
NewWorkerPool(8, highPriorityQueue, handler).Start()
NewWorkerPool(2, lowPriorityQueue, handler).Start()
```

**Fair Scheduling**: Process in rounds, taking from each priority level.

## Monitoring and Metrics

In production, you need visibility into queue behavior. Track these metrics:

```go
type QueueMetrics struct {
    Enqueued   int64         // Total items added
    Processed  int64         // Total items completed
    Rejected   int64         // Items rejected (queue full)
    WaitTime   time.Duration // Average time in queue
    QueueDepth int           // Current queue size
}

// Add instrumentation to your queue operations
func (q *Queue) PushWithMetrics(req *Request) bool {
    success := q.Push(req)
    if success {
        atomic.AddInt64(&q.metrics.Enqueued, 1)
    } else {
        atomic.AddInt64(&q.metrics.Rejected, 1)
    }
    return success
}
```

Export these to Prometheus, Datadog, or whatever observability platform you use. Set alerts on queue depth growing unbounded or rejection rates spiking.

## When to Use This Pattern

Priority queues work well for:

- API rate limiting with tiered customers
- Background job processing with mixed criticality
- Event streaming where some events need faster delivery
- Resource allocation when capacity is constrained

They add complexity, so do not reach for them by default. A simple channel works fine when all requests have equal importance.

## Summary

Building a priority queue in Go requires three components: a heap for efficient ordering, synchronization for thread safety, and a worker pool for processing. The `container/heap` package handles the data structure, `sync.Mutex` and `sync.Cond` provide concurrency primitives, and goroutines power the workers.

Start simple. Add features like priority aging and metrics when you actually need them. Profile under load to find your bottlenecks. And remember that the best queue is often no queue at all - if you can scale your processors to match your request rate, you avoid queuing complexity entirely.
