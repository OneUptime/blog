# How to Implement the Fan-Out/Fan-In Pattern in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Concurrency, Fan-Out, Fan-In, Design Patterns, Parallel Processing

Description: Master the fan-out/fan-in concurrency pattern in Go for distributing work across multiple goroutines and collecting results efficiently.

---

Concurrency is one of Go's most powerful features, and the fan-out/fan-in pattern is a cornerstone technique for building high-performance concurrent applications. This pattern allows you to distribute work across multiple goroutines (fan-out) and then collect the results back into a single channel (fan-in). In this comprehensive guide, we will explore how to implement this pattern effectively, handle errors gracefully, and apply it to real-world scenarios.

## Understanding Fan-Out/Fan-In

The fan-out/fan-in pattern consists of two complementary operations:

**Fan-Out**: Distributing work from a single source to multiple workers. This is useful when you have CPU-bound or I/O-bound tasks that can be processed in parallel.

**Fan-In**: Collecting results from multiple workers back into a single channel. This consolidates the outputs for further processing or final consumption.

This pattern is particularly effective for:
- Processing large datasets in parallel
- Making concurrent API calls
- Image or video processing pipelines
- ETL (Extract, Transform, Load) operations
- Any workload that can be parallelized

## Basic Fan-Out Implementation

Let's start with a simple fan-out implementation where we distribute numbers to multiple worker goroutines for processing.

The following code demonstrates the basic structure of fan-out, where a generator produces work items and multiple workers process them concurrently:

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// generator creates a channel and sends numbers from 1 to max
// This represents our source of work items
func generator(max int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for i := 1; i <= max; i++ {
            out <- i
        }
    }()
    return out
}

// worker receives numbers from the input channel, processes them,
// and sends results to the output channel
func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs {
        // Simulate some processing work
        time.Sleep(100 * time.Millisecond)
        result := job * 2
        fmt.Printf("Worker %d processed job %d -> %d\n", id, job, result)
        results <- result
    }
}

func main() {
    // Generate work items (numbers 1-10)
    jobs := generator(10)

    // Create a results channel to collect processed items
    results := make(chan int, 10)

    // WaitGroup to track when all workers are done
    var wg sync.WaitGroup

    // Fan-out: Start 3 workers to process jobs concurrently
    numWorkers := 3
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go worker(i, jobs, results, &wg)
    }

    // Close results channel when all workers are done
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect all results
    var total int
    for result := range results {
        total += result
    }

    fmt.Printf("Total sum of processed results: %d\n", total)
}
```

## Basic Fan-In Implementation

Now let's look at the fan-in part, where we merge results from multiple channels into a single channel.

This implementation shows how to combine outputs from multiple producer channels into one unified stream:

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// producer creates a channel and sends values with a specific prefix
// Each producer simulates an independent data source
func producer(id string, count int) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for i := 0; i < count; i++ {
            time.Sleep(50 * time.Millisecond)
            out <- fmt.Sprintf("%s-%d", id, i)
        }
    }()
    return out
}

// fanIn merges multiple input channels into a single output channel
// This is the core fan-in operation that consolidates all sources
func fanIn(channels ...<-chan string) <-chan string {
    out := make(chan string)
    var wg sync.WaitGroup

    // Start a goroutine for each input channel
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan string) {
            defer wg.Done()
            for val := range c {
                out <- val
            }
        }(ch)
    }

    // Close output channel when all inputs are exhausted
    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}

func main() {
    // Create multiple producers (data sources)
    producer1 := producer("A", 5)
    producer2 := producer("B", 5)
    producer3 := producer("C", 5)

    // Fan-in: Merge all producer outputs into one channel
    merged := fanIn(producer1, producer2, producer3)

    // Consume merged results
    for val := range merged {
        fmt.Println("Received:", val)
    }
}
```

## Pipeline Stages Pattern

The fan-out/fan-in pattern becomes even more powerful when combined with pipeline stages. Each stage can process data and pass it to the next stage.

This example demonstrates a multi-stage pipeline where data flows through sequential processing steps:

```go
package main

import (
    "fmt"
    "sync"
)

// Stage 1: Generate numbers
func generateNumbers(max int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for i := 1; i <= max; i++ {
            out <- i
        }
    }()
    return out
}

// Stage 2: Square numbers (can be fanned out)
func squareWorker(in <-chan int, out chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for n := range in {
        out <- n * n
    }
}

// Stage 3: Filter only even numbers
func filterEven(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if n%2 == 0 {
                out <- n
            }
        }
    }()
    return out
}

// Stage 4: Sum all numbers
func sum(in <-chan int) int {
    total := 0
    for n := range in {
        total += n
    }
    return total
}

func main() {
    // Stage 1: Generate numbers 1-20
    numbers := generateNumbers(20)

    // Stage 2: Fan-out to multiple square workers
    squared := make(chan int, 20)
    var wg sync.WaitGroup

    // Create 4 workers for the squaring stage
    numWorkers := 4
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go squareWorker(numbers, squared, &wg)
    }

    // Close squared channel when all workers complete
    go func() {
        wg.Wait()
        close(squared)
    }()

    // Stage 3: Filter even numbers
    evenNumbers := filterEven(squared)

    // Stage 4: Calculate sum
    total := sum(evenNumbers)

    fmt.Printf("Sum of even squares from 1-20: %d\n", total)
}
```

## Bounded Fan-Out with Semaphores

Unbounded fan-out can overwhelm system resources. Using semaphores (implemented with buffered channels), we can limit concurrent operations.

This pattern is essential for rate limiting and preventing resource exhaustion when dealing with expensive operations:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// Semaphore is a simple semaphore implementation using a buffered channel
type Semaphore chan struct{}

// NewSemaphore creates a new semaphore with the specified capacity
func NewSemaphore(capacity int) Semaphore {
    return make(chan struct{}, capacity)
}

// Acquire obtains a semaphore slot, blocking if necessary
func (s Semaphore) Acquire() {
    s <- struct{}{}
}

// Release frees a semaphore slot
func (s Semaphore) Release() {
    <-s
}

// Task represents a unit of work
type Task struct {
    ID   int
    Data string
}

// Result represents the output of processing a task
type Result struct {
    TaskID  int
    Output  string
    Elapsed time.Duration
}

// processTask simulates an expensive operation
func processTask(task Task) Result {
    start := time.Now()
    // Simulate varying processing times
    time.Sleep(time.Duration(100+task.ID*50) * time.Millisecond)
    return Result{
        TaskID:  task.ID,
        Output:  fmt.Sprintf("Processed: %s", task.Data),
        Elapsed: time.Since(start),
    }
}

// boundedFanOut processes tasks with a maximum number of concurrent workers
func boundedFanOut(ctx context.Context, tasks []Task, maxConcurrency int) <-chan Result {
    results := make(chan Result, len(tasks))
    sem := NewSemaphore(maxConcurrency)
    var wg sync.WaitGroup

    for _, task := range tasks {
        wg.Add(1)
        go func(t Task) {
            defer wg.Done()

            // Acquire semaphore slot (blocks if at capacity)
            sem.Acquire()
            defer sem.Release()

            // Check for cancellation before processing
            select {
            case <-ctx.Done():
                return
            default:
                results <- processTask(t)
            }
        }(task)
    }

    // Close results when all tasks complete
    go func() {
        wg.Wait()
        close(results)
    }()

    return results
}

func main() {
    // Create 10 tasks
    tasks := make([]Task, 10)
    for i := 0; i < 10; i++ {
        tasks[i] = Task{ID: i, Data: fmt.Sprintf("Task-%d", i)}
    }

    ctx := context.Background()

    // Process with max 3 concurrent workers
    fmt.Println("Processing with bounded fan-out (max 3 concurrent):")
    start := time.Now()

    results := boundedFanOut(ctx, tasks, 3)

    for result := range results {
        fmt.Printf("Task %d completed in %v: %s\n",
            result.TaskID, result.Elapsed, result.Output)
    }

    fmt.Printf("\nTotal time: %v\n", time.Since(start))
}
```

## Merging Results from Multiple Sources

In real applications, you often need to merge results from multiple independent sources while preserving order or priority.

This implementation shows how to merge results with metadata about their source:

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// DataSource represents a source of data with metadata
type DataSource struct {
    Name     string
    Priority int
}

// DataItem represents an item from a specific source
type DataItem struct {
    Source    string
    Priority  int
    Value     interface{}
    Timestamp time.Time
}

// fetchFromSource simulates fetching data from an external source
func fetchFromSource(source DataSource, count int) <-chan DataItem {
    out := make(chan DataItem)
    go func() {
        defer close(out)
        for i := 0; i < count; i++ {
            // Simulate network latency
            time.Sleep(time.Duration(50+source.Priority*10) * time.Millisecond)
            out <- DataItem{
                Source:    source.Name,
                Priority:  source.Priority,
                Value:     fmt.Sprintf("%s-item-%d", source.Name, i),
                Timestamp: time.Now(),
            }
        }
    }()
    return out
}

// mergeWithPriority merges channels and includes source metadata
func mergeWithPriority(sources ...DataSource) <-chan DataItem {
    out := make(chan DataItem)
    var wg sync.WaitGroup

    for _, source := range sources {
        wg.Add(1)
        go func(s DataSource) {
            defer wg.Done()
            // Each source produces 3 items
            ch := fetchFromSource(s, 3)
            for item := range ch {
                out <- item
            }
        }(source)
    }

    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}

// collectAndSort collects all items and can sort by priority
func collectAndSort(items <-chan DataItem) []DataItem {
    var collected []DataItem
    for item := range items {
        collected = append(collected, item)
    }

    // Sort by priority (lower is higher priority)
    for i := 0; i < len(collected)-1; i++ {
        for j := i + 1; j < len(collected); j++ {
            if collected[j].Priority < collected[i].Priority {
                collected[i], collected[j] = collected[j], collected[i]
            }
        }
    }

    return collected
}

func main() {
    // Define multiple data sources with different priorities
    sources := []DataSource{
        {Name: "Database", Priority: 1},
        {Name: "Cache", Priority: 0},
        {Name: "ExternalAPI", Priority: 2},
    }

    // Merge results from all sources
    merged := mergeWithPriority(sources...)

    // Collect and sort by priority
    results := collectAndSort(merged)

    fmt.Println("Results sorted by priority:")
    for _, item := range results {
        fmt.Printf("[Priority %d] %s: %v\n",
            item.Priority, item.Source, item.Value)
    }
}
```

## Error Handling in Pipelines

Proper error handling is crucial in concurrent pipelines. Here's a pattern that propagates errors through the pipeline while allowing graceful cancellation.

This implementation demonstrates how to handle errors without losing results and supporting cancellation:

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

// Result wraps either a successful value or an error
type Result[T any] struct {
    Value T
    Err   error
}

// processWithError simulates processing that might fail
func processWithError(ctx context.Context, id int) Result[string] {
    // Simulate random failures (20% chance)
    if rand.Float32() < 0.2 {
        return Result[string]{
            Err: fmt.Errorf("processing failed for item %d", id),
        }
    }

    // Simulate work
    select {
    case <-time.After(100 * time.Millisecond):
        return Result[string]{
            Value: fmt.Sprintf("Successfully processed item %d", id),
        }
    case <-ctx.Done():
        return Result[string]{
            Err: ctx.Err(),
        }
    }
}

// worker processes items and sends results (including errors)
func workerWithErrors(
    ctx context.Context,
    id int,
    jobs <-chan int,
    results chan<- Result[string],
    wg *sync.WaitGroup,
) {
    defer wg.Done()
    for job := range jobs {
        select {
        case <-ctx.Done():
            return
        default:
            result := processWithError(ctx, job)
            results <- result
        }
    }
}

// fanOutWithErrors distributes work with error handling
func fanOutWithErrors(ctx context.Context, items []int, numWorkers int) (<-chan Result[string], context.CancelFunc) {
    // Create a cancellable context
    ctx, cancel := context.WithCancel(ctx)

    jobs := make(chan int, len(items))
    results := make(chan Result[string], len(items))

    var wg sync.WaitGroup

    // Start workers
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go workerWithErrors(ctx, i, jobs, results, &wg)
    }

    // Send all jobs
    go func() {
        defer close(jobs)
        for _, item := range items {
            select {
            case jobs <- item:
            case <-ctx.Done():
                return
            }
        }
    }()

    // Close results when done
    go func() {
        wg.Wait()
        close(results)
    }()

    return results, cancel
}

// collectResults separates successful results from errors
func collectResults[T any](results <-chan Result[T]) ([]T, []error) {
    var successes []T
    var errs []error

    for result := range results {
        if result.Err != nil {
            errs = append(errs, result.Err)
        } else {
            successes = append(successes, result.Value)
        }
    }

    return successes, errs
}

func main() {
    rand.Seed(time.Now().UnixNano())

    // Create items to process
    items := make([]int, 20)
    for i := 0; i < 20; i++ {
        items[i] = i
    }

    ctx := context.Background()
    results, cancel := fanOutWithErrors(ctx, items, 4)
    defer cancel()

    // Collect results
    successes, errs := collectResults(results)

    fmt.Printf("Successfully processed: %d items\n", len(successes))
    for _, s := range successes {
        fmt.Println("  ", s)
    }

    fmt.Printf("\nFailed: %d items\n", len(errs))
    for _, e := range errs {
        fmt.Println("  Error:", e)
    }
}
```

## Error Handling with First-Error Cancellation

Sometimes you want to cancel all work when the first error occurs. This pattern is useful for fail-fast scenarios.

This implementation cancels remaining work immediately when any worker encounters an error:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// processItem simulates work that might fail
func processItem(ctx context.Context, id int) error {
    // Item 5 will always fail
    if id == 5 {
        return fmt.Errorf("critical error processing item %d", id)
    }

    select {
    case <-time.After(100 * time.Millisecond):
        fmt.Printf("Item %d processed successfully\n", id)
        return nil
    case <-ctx.Done():
        fmt.Printf("Item %d cancelled\n", id)
        return ctx.Err()
    }
}

// fanOutFailFast processes items and cancels all on first error
func fanOutFailFast(items []int, numWorkers int) error {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    jobs := make(chan int, len(items))
    errCh := make(chan error, 1) // Buffer of 1 to avoid blocking

    var wg sync.WaitGroup

    // Start workers
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done():
                    return
                default:
                    if err := processItem(ctx, job); err != nil {
                        // Try to send error (non-blocking)
                        select {
                        case errCh <- err:
                            cancel() // Cancel all other workers
                        default:
                            // Another error was already sent
                        }
                        return
                    }
                }
            }
        }(i)
    }

    // Send jobs
    go func() {
        defer close(jobs)
        for _, item := range items {
            select {
            case jobs <- item:
            case <-ctx.Done():
                return
            }
        }
    }()

    // Wait for completion
    wg.Wait()
    close(errCh)

    // Return first error if any
    return <-errCh
}

func main() {
    items := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

    fmt.Println("Processing with fail-fast behavior:")
    if err := fanOutFailFast(items, 3); err != nil {
        fmt.Printf("\nPipeline failed: %v\n", err)
    } else {
        fmt.Println("\nAll items processed successfully")
    }
}
```

## Real-World Example: Image Processing Pipeline

Let's build a practical example of processing multiple images concurrently with resize, filter, and watermark stages.

This example demonstrates a real-world image processing pipeline with multiple stages:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// Image represents an image being processed
type Image struct {
    ID       string
    Filename string
    Size     int // in KB
    Width    int
    Height   int
    Data     []byte
}

// ProcessedImage represents the final output
type ProcessedImage struct {
    Original   Image
    Resized    bool
    Filtered   bool
    Watermark  bool
    OutputPath string
    Error      error
}

// resizeStage simulates image resizing
func resizeStage(ctx context.Context, in <-chan Image, targetWidth int) <-chan Image {
    out := make(chan Image)
    go func() {
        defer close(out)
        for img := range in {
            select {
            case <-ctx.Done():
                return
            default:
                // Simulate resize operation
                time.Sleep(50 * time.Millisecond)
                img.Width = targetWidth
                img.Height = int(float64(img.Height) * (float64(targetWidth) / float64(img.Width)))
                fmt.Printf("Resized %s to %dx%d\n", img.Filename, img.Width, img.Height)
                out <- img
            }
        }
    }()
    return out
}

// filterWorker applies filters with fan-out
func filterWorker(
    ctx context.Context,
    id int,
    in <-chan Image,
    out chan<- Image,
    wg *sync.WaitGroup,
) {
    defer wg.Done()
    for img := range in {
        select {
        case <-ctx.Done():
            return
        default:
            // Simulate filter application
            time.Sleep(100 * time.Millisecond)
            fmt.Printf("Worker %d applied filter to %s\n", id, img.Filename)
            out <- img
        }
    }
}

// watermarkStage adds watermark to images
func watermarkStage(ctx context.Context, in <-chan Image, watermarkText string) <-chan ProcessedImage {
    out := make(chan ProcessedImage)
    go func() {
        defer close(out)
        for img := range in {
            select {
            case <-ctx.Done():
                return
            default:
                // Simulate watermark operation
                time.Sleep(30 * time.Millisecond)
                fmt.Printf("Added watermark to %s\n", img.Filename)
                out <- ProcessedImage{
                    Original:   img,
                    Resized:    true,
                    Filtered:   true,
                    Watermark:  true,
                    OutputPath: fmt.Sprintf("output/%s", img.Filename),
                }
            }
        }
    }()
    return out
}

// processImages orchestrates the entire pipeline
func processImages(ctx context.Context, images []Image, numFilterWorkers int) []ProcessedImage {
    // Stage 1: Feed images into pipeline
    imageChan := make(chan Image, len(images))
    go func() {
        defer close(imageChan)
        for _, img := range images {
            select {
            case imageChan <- img:
            case <-ctx.Done():
                return
            }
        }
    }()

    // Stage 2: Resize (single worker)
    resized := resizeStage(ctx, imageChan, 800)

    // Stage 3: Fan-out for filtering
    filtered := make(chan Image, len(images))
    var filterWg sync.WaitGroup
    for i := 0; i < numFilterWorkers; i++ {
        filterWg.Add(1)
        go filterWorker(ctx, i, resized, filtered, &filterWg)
    }
    go func() {
        filterWg.Wait()
        close(filtered)
    }()

    // Stage 4: Watermark (single worker)
    watermarked := watermarkStage(ctx, filtered, "Copyright 2026")

    // Collect results
    var results []ProcessedImage
    for result := range watermarked {
        results = append(results, result)
    }

    return results
}

func main() {
    // Create sample images
    images := []Image{
        {ID: "1", Filename: "photo1.jpg", Size: 1024, Width: 1920, Height: 1080},
        {ID: "2", Filename: "photo2.jpg", Size: 2048, Width: 3840, Height: 2160},
        {ID: "3", Filename: "photo3.jpg", Size: 512, Width: 1280, Height: 720},
        {ID: "4", Filename: "photo4.jpg", Size: 768, Width: 1600, Height: 900},
        {ID: "5", Filename: "photo5.jpg", Size: 1536, Width: 2560, Height: 1440},
    }

    ctx := context.Background()
    start := time.Now()

    // Process with 3 filter workers
    results := processImages(ctx, images, 3)

    fmt.Printf("\n=== Processing Complete ===\n")
    fmt.Printf("Processed %d images in %v\n", len(results), time.Since(start))

    for _, result := range results {
        fmt.Printf("  %s -> %s\n", result.Original.Filename, result.OutputPath)
    }
}
```

## Real-World Example: API Aggregation

Another common use case is aggregating data from multiple APIs concurrently. Here's an example of fetching user data from different services.

This pattern is essential for microservices architectures where you need to combine data from multiple sources:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "sync"
    "time"
)

// User represents the aggregated user profile
type User struct {
    ID       string
    Name     string
    Email    string
    Posts    []Post
    Friends  []Friend
    Settings Settings
}

// Post represents a user's post
type Post struct {
    ID      string
    Title   string
    Content string
}

// Friend represents a user's friend
type Friend struct {
    ID   string
    Name string
}

// Settings represents user settings
type Settings struct {
    Theme         string
    Notifications bool
}

// APIResult wraps the result of an API call
type APIResult struct {
    Type  string
    Data  interface{}
    Error error
}

// fetchUserProfile simulates fetching basic user data
func fetchUserProfile(ctx context.Context, userID string) APIResult {
    select {
    case <-time.After(80 * time.Millisecond):
        return APIResult{
            Type: "profile",
            Data: map[string]string{
                "id":    userID,
                "name":  "John Doe",
                "email": "john@example.com",
            },
        }
    case <-ctx.Done():
        return APIResult{Type: "profile", Error: ctx.Err()}
    }
}

// fetchUserPosts simulates fetching user posts
func fetchUserPosts(ctx context.Context, userID string) APIResult {
    select {
    case <-time.After(150 * time.Millisecond):
        return APIResult{
            Type: "posts",
            Data: []Post{
                {ID: "p1", Title: "First Post", Content: "Hello World"},
                {ID: "p2", Title: "Second Post", Content: "Learning Go"},
            },
        }
    case <-ctx.Done():
        return APIResult{Type: "posts", Error: ctx.Err()}
    }
}

// fetchUserFriends simulates fetching user friends
func fetchUserFriends(ctx context.Context, userID string) APIResult {
    select {
    case <-time.After(120 * time.Millisecond):
        return APIResult{
            Type: "friends",
            Data: []Friend{
                {ID: "f1", Name: "Alice"},
                {ID: "f2", Name: "Bob"},
                {ID: "f3", Name: "Charlie"},
            },
        }
    case <-ctx.Done():
        return APIResult{Type: "friends", Error: ctx.Err()}
    }
}

// fetchUserSettings simulates fetching user settings
func fetchUserSettings(ctx context.Context, userID string) APIResult {
    select {
    case <-time.After(60 * time.Millisecond):
        return APIResult{
            Type: "settings",
            Data: Settings{
                Theme:         "dark",
                Notifications: true,
            },
        }
    case <-ctx.Done():
        return APIResult{Type: "settings", Error: ctx.Err()}
    }
}

// aggregateUserData fans out to multiple APIs and fans in the results
func aggregateUserData(ctx context.Context, userID string) (*User, []error) {
    // Create a context with timeout
    ctx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
    defer cancel()

    // Results channel
    results := make(chan APIResult, 4)
    var wg sync.WaitGroup

    // Fan-out: Call all APIs concurrently
    apis := []func(context.Context, string) APIResult{
        fetchUserProfile,
        fetchUserPosts,
        fetchUserFriends,
        fetchUserSettings,
    }

    for _, apiFn := range apis {
        wg.Add(1)
        go func(fn func(context.Context, string) APIResult) {
            defer wg.Done()
            results <- fn(ctx, userID)
        }(apiFn)
    }

    // Close results when all APIs complete
    go func() {
        wg.Wait()
        close(results)
    }()

    // Fan-in: Aggregate results
    user := &User{ID: userID}
    var errors []error

    for result := range results {
        if result.Error != nil {
            errors = append(errors, fmt.Errorf("%s: %w", result.Type, result.Error))
            continue
        }

        switch result.Type {
        case "profile":
            if data, ok := result.Data.(map[string]string); ok {
                user.Name = data["name"]
                user.Email = data["email"]
            }
        case "posts":
            if posts, ok := result.Data.([]Post); ok {
                user.Posts = posts
            }
        case "friends":
            if friends, ok := result.Data.([]Friend); ok {
                user.Friends = friends
            }
        case "settings":
            if settings, ok := result.Data.(Settings); ok {
                user.Settings = settings
            }
        }
    }

    return user, errors
}

func main() {
    ctx := context.Background()
    start := time.Now()

    user, errors := aggregateUserData(ctx, "user123")

    fmt.Printf("Aggregated user data in %v\n\n", time.Since(start))

    // Display user data
    userData, _ := json.MarshalIndent(user, "", "  ")
    fmt.Printf("User Data:\n%s\n", userData)

    if len(errors) > 0 {
        fmt.Println("\nErrors encountered:")
        for _, err := range errors {
            fmt.Printf("  - %v\n", err)
        }
    }
}
```

## Best Practices for Fan-Out/Fan-In

Here are key recommendations for implementing this pattern effectively:

### 1. Always Close Channels Properly

Ensure channels are closed when no more data will be sent. This prevents goroutine leaks and allows receivers to complete:

```go
// Use defer to ensure channel closure
go func() {
    defer close(out)
    for item := range in {
        out <- process(item)
    }
}()
```

### 2. Use Buffered Channels Wisely

Buffer sizes should match your workload characteristics:

```go
// For known workload sizes
results := make(chan Result, len(items))

// For streaming workloads, use smaller buffers
stream := make(chan Data, 100)
```

### 3. Implement Proper Cancellation

Always respect context cancellation to enable graceful shutdown:

```go
select {
case <-ctx.Done():
    return ctx.Err()
case out <- result:
    // continue processing
}
```

### 4. Handle Backpressure

When producers are faster than consumers, implement backpressure mechanisms:

```go
// Use semaphores for bounded concurrency
sem := make(chan struct{}, maxConcurrency)
sem <- struct{}{} // acquire
defer func() { <-sem }() // release
```

### 5. Monitor Goroutine Counts

Track active goroutines in production systems:

```go
import "runtime"

// Log periodically
fmt.Printf("Active goroutines: %d\n", runtime.NumGoroutine())
```

## Conclusion

The fan-out/fan-in pattern is an essential tool for building high-performance concurrent applications in Go. By distributing work across multiple goroutines and efficiently collecting results, you can maximize throughput and resource utilization.

Key takeaways:

1. **Fan-out** distributes work to multiple workers for parallel processing
2. **Fan-in** merges results from multiple sources into a single stream
3. Use **bounded fan-out** with semaphores to prevent resource exhaustion
4. Implement **proper error handling** to maintain reliability
5. Always **close channels** and **respect context cancellation** to prevent leaks
6. Consider **pipeline stages** for complex processing workflows

With these patterns in your toolkit, you can build robust, scalable Go applications that efficiently handle concurrent workloads. Whether you're processing images, aggregating API responses, or building data pipelines, the fan-out/fan-in pattern provides a proven foundation for concurrent programming in Go.
