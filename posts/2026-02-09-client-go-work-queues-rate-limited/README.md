# How to Use client-go Work Queues for Rate-Limited Event Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, client-go, Work Queues, Go

Description: Learn how to use client-go work queues with rate limiting and exponential backoff to reliably process Kubernetes events in controllers and operators.

---

Informer event handlers run synchronously. If your handler does heavy processing, it blocks other events. If it fails, the event is lost. If the same resource changes rapidly, you process every intermediate state even though you only care about the final one.

Work queues solve these problems. Event handlers add items to a queue and return immediately. Worker goroutines process items from the queue with rate limiting and retry logic. This decouples event detection from event processing, making controllers robust and efficient.

## Understanding Work Queues

client-go provides several queue types. The basic queue (FIFO) processes items in order. The rate-limiting queue adds exponential backoff for failures. The delaying queue lets you schedule items for future processing.

Controllers typically use rate-limiting queues. When processing fails, the item goes back in the queue with increasing delays. This prevents hot loops and gives transient errors time to resolve.

## Creating a Basic Work Queue

Start with a simple FIFO queue.

```go
package main

import (
    "fmt"
    "time"

    "k8s.io/client-go/tools/cache"
    "k8s.io/client-go/util/workqueue"
)

func main() {
    // Create a simple work queue
    queue := workqueue.New()

    // Start workers
    stopCh := make(chan struct{})
    defer close(stopCh)

    for i := 0; i < 3; i++ {
        go worker(i, queue, stopCh)
    }

    // Add items to queue
    for i := 0; i < 10; i++ {
        queue.Add(fmt.Sprintf("item-%d", i))
    }

    time.Sleep(5 * time.Second)
}

func worker(id int, queue workqueue.Interface, stopCh <-chan struct{}) {
    for {
        item, shutdown := queue.Get()
        if shutdown {
            return
        }

        // Process item
        fmt.Printf("Worker %d processing: %s\n", id, item)
        time.Sleep(500 * time.Millisecond)

        // Mark item as done
        queue.Done(item)
    }
}
```

## Creating a Rate-Limiting Queue

Add rate limiting and exponential backoff.

```go
package main

import (
    "fmt"
    "time"

    "k8s.io/client-go/util/workqueue"
)

func main() {
    // Create rate-limiting queue with exponential backoff
    queue := workqueue.NewRateLimitingQueue(
        workqueue.DefaultControllerRateLimiter(),
    )

    stopCh := make(chan struct{})
    defer close(stopCh)

    go worker(queue, stopCh)

    // Add items
    queue.Add("task-1")
    queue.Add("task-2")
    queue.Add("failing-task")

    time.Sleep(30 * time.Second)
}

func worker(queue workqueue.RateLimitingInterface, stopCh <-chan struct{}) {
    for {
        item, shutdown := queue.Get()
        if shutdown {
            return
        }

        err := processItem(item)
        if err != nil {
            // Failed - requeue with backoff
            if queue.NumRequeues(item) < 5 {
                fmt.Printf("Error processing %s (attempt %d): %v\n",
                    item, queue.NumRequeues(item)+1, err)
                queue.AddRateLimited(item)
            } else {
                // Too many retries - give up
                fmt.Printf("Giving up on %s after %d attempts\n",
                    item, queue.NumRequeues(item))
                queue.Forget(item)
            }
        } else {
            // Success - remove from queue
            fmt.Printf("Successfully processed %s\n", item)
            queue.Forget(item)
        }

        queue.Done(item)
    }
}

func processItem(item interface{}) error {
    key := item.(string)

    if key == "failing-task" {
        return fmt.Errorf("simulated failure")
    }

    time.Sleep(1 * time.Second)
    return nil
}
```

## Integrating with Informers

Connect informers to work queues for a complete controller pattern.

```go
package main

import (
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/client-go/informers"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/cache"
    "k8s.io/client-go/util/workqueue"
)

type Controller struct {
    clientset      *kubernetes.Clientset
    podInformer    cache.SharedIndexInformer
    queue          workqueue.RateLimitingInterface
}

func NewController(clientset *kubernetes.Clientset) *Controller {
    informerFactory := informers.NewSharedInformerFactory(clientset, 30*time.Second)
    podInformer := informerFactory.Core().V1().Pods().Informer()

    queue := workqueue.NewRateLimitingQueue(
        workqueue.DefaultControllerRateLimiter(),
    )

    controller := &Controller{
        clientset:   clientset,
        podInformer: podInformer,
        queue:       queue,
    }

    // Add event handlers that enqueue items
    podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            key, err := cache.MetaNamespaceKeyFunc(obj)
            if err == nil {
                queue.Add(key)
            }
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            key, err := cache.MetaNamespaceKeyFunc(newObj)
            if err == nil {
                queue.Add(key)
            }
        },
        DeleteFunc: func(obj interface{}) {
            key, err := cache.DeletionHandlingMetaNamespaceKeyFunc(obj)
            if err == nil {
                queue.Add(key)
            }
        },
    })

    return controller
}

func (c *Controller) Run(stopCh <-chan struct{}) {
    defer c.queue.ShutDown()

    // Start informer
    go c.podInformer.Run(stopCh)

    // Wait for cache sync
    if !cache.WaitForCacheSync(stopCh, c.podInformer.HasSynced) {
        fmt.Println("Failed to sync cache")
        return
    }

    // Start workers
    for i := 0; i < 3; i++ {
        go c.runWorker()
    }

    <-stopCh
}

func (c *Controller) runWorker() {
    for c.processNextItem() {
    }
}

func (c *Controller) processNextItem() bool {
    item, shutdown := c.queue.Get()
    if shutdown {
        return false
    }
    defer c.queue.Done(item)

    key := item.(string)
    err := c.reconcile(key)

    if err != nil {
        if c.queue.NumRequeues(key) < 5 {
            fmt.Printf("Error syncing %s: %v\n", key, err)
            c.queue.AddRateLimited(key)
            return true
        }
        fmt.Printf("Dropping %s after too many retries\n", key)
        c.queue.Forget(key)
        return true
    }

    c.queue.Forget(key)
    return true
}

func (c *Controller) reconcile(key string) error {
    namespace, name, err := cache.SplitMetaNamespaceKey(key)
    if err != nil {
        return err
    }

    // Get pod from cache
    obj, exists, err := c.podInformer.GetIndexer().GetByKey(key)
    if err != nil {
        return err
    }

    if !exists {
        fmt.Printf("Pod %s/%s has been deleted\n", namespace, name)
        return nil
    }

    pod := obj.(*corev1.Pod)
    fmt.Printf("Reconciling pod %s/%s (phase: %s)\n",
        pod.Namespace, pod.Name, pod.Status.Phase)

    // Your reconciliation logic here
    return nil
}
```

## Custom Rate Limiters

Create custom rate limiting strategies.

```go
package main

import (
    "time"

    "k8s.io/client-go/util/workqueue"
)

// Create a custom rate limiter with specific parameters
func createCustomRateLimiter() workqueue.RateLimiter {
    return workqueue.NewItemExponentialFailureRateLimiter(
        500*time.Millisecond, // Base delay
        30*time.Second,       // Max delay
    )
}

// Combine multiple rate limiters
func createCombinedRateLimiter() workqueue.RateLimiter {
    return workqueue.NewMaxOfRateLimiter(
        // Exponential backoff
        workqueue.NewItemExponentialFailureRateLimiter(
            5*time.Millisecond,
            1000*time.Second,
        ),
        // Bucket rate limiter (10 qps, 100 burst)
        &workqueue.BucketRateLimiter{
            Limiter: rate.NewLimiter(rate.Limit(10), 100),
        },
    )
}

// Use custom rate limiter
func main() {
    queue := workqueue.NewRateLimitingQueue(createCustomRateLimiter())

    // Add and process items
    queue.Add("item-1")

    item, _ := queue.Get()
    // Process fails
    queue.AddRateLimited(item) // Waits 500ms
    queue.Done(item)

    item, _ = queue.Get()
    // Process fails again
    queue.AddRateLimited(item) // Waits 1s (2x)
    queue.Done(item)

    item, _ = queue.Get()
    // Process fails again
    queue.AddRateLimited(item) // Waits 2s (4x)
    queue.Done(item)
}
```

## Delayed Processing

Schedule items for future processing.

```go
package main

import (
    "fmt"
    "time"

    "k8s.io/client-go/util/workqueue"
)

func main() {
    queue := workqueue.NewDelayingQueue()

    go worker(queue)

    // Add immediate item
    queue.Add("immediate")

    // Add delayed items
    queue.AddAfter("delayed-5s", 5*time.Second)
    queue.AddAfter("delayed-10s", 10*time.Second)

    time.Sleep(15 * time.Second)
}

func worker(queue workqueue.DelayingInterface) {
    for {
        item, shutdown := queue.Get()
        if shutdown {
            return
        }

        fmt.Printf("Processing: %s at %s\n", item, time.Now().Format("15:04:05"))
        queue.Done(item)
    }
}
```

## Handling Failures with Retries

Implement sophisticated retry logic.

```go
package main

import (
    "fmt"
    "time"

    "k8s.io/client-go/util/workqueue"
)

const (
    maxRetries = 5
)

type RetryableController struct {
    queue workqueue.RateLimitingInterface
}

func (c *RetryableController) processItem(key string) error {
    // Simulate processing with occasional failures
    if time.Now().Unix()%3 == 0 {
        return fmt.Errorf("random failure for %s", key)
    }
    fmt.Printf("Successfully processed %s\n", key)
    return nil
}

func (c *RetryableController) handleError(key string, err error) {
    if err == nil {
        c.queue.Forget(key)
        return
    }

    if c.queue.NumRequeues(key) < maxRetries {
        fmt.Printf("Error processing %s (attempt %d/%d): %v\n",
            key, c.queue.NumRequeues(key)+1, maxRetries, err)
        c.queue.AddRateLimited(key)
        return
    }

    c.queue.Forget(key)
    fmt.Printf("Dropping %s after %d failures\n", key, maxRetries)
}

func (c *RetryableController) runWorker() {
    for {
        item, shutdown := c.queue.Get()
        if shutdown {
            return
        }

        key := item.(string)
        err := c.processItem(key)
        c.handleError(key, err)
        c.queue.Done(item)
    }
}
```

## Monitoring Queue Metrics

Track queue depth and processing rates.

```go
package main

import (
    "fmt"
    "time"

    "k8s.io/client-go/util/workqueue"
)

func monitorQueue(queue workqueue.RateLimitingInterface) {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        depth := queue.Len()
        fmt.Printf("Queue depth: %d items\n", depth)

        // In production, export to Prometheus
        // queueDepth.Set(float64(depth))
    }
}

// Register Prometheus metrics for the queue
func setupQueueMetrics(queue workqueue.RateLimitingInterface) {
    // Example metrics setup (pseudo-code)
    // workqueue.SetProvider(prometheusMetricsProvider{})
}
```

## Best Practices

Always call Done() after processing an item, even if it fails. This prevents deadlocks.

Use Forget() when successfully processing an item or giving up after max retries. This clears the rate limiter's tracking.

Keep workers lightweight. Offload heavy processing to separate goroutines if needed.

Set appropriate max retries based on your use case. Transient errors might resolve quickly, but persistent errors shouldn't loop forever.

Monitor queue depth and processing latency. Growing queues indicate workers can't keep up.

## Conclusion

Work queues decouple event detection from processing in Kubernetes controllers. They provide rate limiting, exponential backoff, and reliable retry semantics.

Use rate-limiting queues for production controllers. Configure appropriate backoff parameters and max retries. Integrate with informers to process resource changes efficiently. Monitor queue metrics to detect processing bottlenecks.

Work queues are essential for building robust controllers that handle errors gracefully and don't overwhelm the API server or external systems.
