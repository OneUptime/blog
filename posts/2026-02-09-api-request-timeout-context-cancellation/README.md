# How to Handle API Request Timeout and Context Cancellation in client-go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, client-go, Error Handling

Description: Master timeout handling and context cancellation in Kubernetes client-go to build robust controllers that gracefully handle slow APIs, network issues, and long-running operations.

---

API requests do not always complete successfully or quickly. Network issues, overloaded API servers, or long-running operations can cause requests to hang indefinitely. Proper timeout and context cancellation handling ensures your controllers remain responsive and do not leak resources waiting for requests that will never complete.

## The Importance of Timeouts

Without timeouts, a single hung API request can block your controller indefinitely. This leads to:

- Controllers that stop processing new events
- Resource leaks from goroutines waiting forever
- Cascading failures as queues back up
- Difficulty diagnosing why controllers stopped working

Timeouts prevent these issues by giving up on slow requests and allowing your controller to continue operating.

## Basic Timeout with Context

The cleanest way to implement timeouts is using Go's context package:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func listPodsWithTimeout(clientset *kubernetes.Clientset) error {
    // Create a context with 5-second timeout
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel() // Always call cancel to release resources

    // Use the context in the API call
    pods, err := clientset.CoreV1().Pods("default").List(ctx, metav1.ListOptions{})
    if err != nil {
        // Check if it was a timeout
        if ctx.Err() == context.DeadlineExceeded {
            return fmt.Errorf("request timed out after 5 seconds")
        }
        return fmt.Errorf("request failed: %v", err)
    }

    fmt.Printf("Found %d pods\n", len(pods.Items))
    return nil
}

func main() {
    config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
    if err != nil {
        log.Fatal(err)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        log.Fatal(err)
    }

    if err := listPodsWithTimeout(clientset); err != nil {
        log.Printf("Error: %v", err)
    }
}
```

The `context.WithTimeout` creates a context that automatically cancels after the specified duration.

## Different Timeout Patterns

**Fixed timeout for all operations**:

```go
const requestTimeout = 10 * time.Second

func getDeployment(clientset *kubernetes.Clientset, namespace, name string) error {
    ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
    defer cancel()

    deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
    if err != nil {
        return err
    }

    fmt.Printf("Deployment: %s\n", deployment.Name)
    return nil
}
```

**Different timeouts for different operations**:

```go
func operationSpecificTimeouts(clientset *kubernetes.Clientset) {
    // Short timeout for gets (should be fast)
    ctxGet, cancelGet := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancelGet()
    clientset.CoreV1().Pods("default").Get(ctxGet, "nginx", metav1.GetOptions{})

    // Longer timeout for lists (more data to transfer)
    ctxList, cancelList := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancelList()
    clientset.CoreV1().Pods("default").List(ctxList, metav1.ListOptions{})

    // Very long timeout for watch (intentionally long-lived)
    ctxWatch, cancelWatch := context.WithTimeout(context.Background(), 5*time.Minute)
    defer cancelWatch()
    clientset.CoreV1().Pods("default").Watch(ctxWatch, metav1.ListOptions{})
}
```

## Cancellable Contexts

Sometimes you need to cancel operations explicitly, not just on timeout:

```go
import (
    "sync"
)

type Controller struct {
    clientset  *kubernetes.Clientset
    ctx        context.Context
    cancel     context.CancelFunc
    wg         sync.WaitGroup
}

func NewController(clientset *kubernetes.Clientset) *Controller {
    ctx, cancel := context.WithCancel(context.Background())
    return &Controller{
        clientset: clientset,
        ctx:       ctx,
        cancel:    cancel,
    }
}

func (c *Controller) Start() {
    c.wg.Add(1)
    go func() {
        defer c.wg.Done()
        c.watchPods()
    }()
}

func (c *Controller) Stop() {
    // Cancel the context to stop all operations
    c.cancel()
    // Wait for goroutines to finish
    c.wg.Wait()
}

func (c *Controller) watchPods() {
    watcher, err := c.clientset.CoreV1().Pods("default").Watch(
        c.ctx,
        metav1.ListOptions{},
    )
    if err != nil {
        log.Printf("Failed to create watcher: %v", err)
        return
    }
    defer watcher.Stop()

    for {
        select {
        case event, ok := <-watcher.ResultChan():
            if !ok {
                // Channel closed
                return
            }
            // Process event
            fmt.Printf("Event: %s\n", event.Type)

        case <-c.ctx.Done():
            // Context was cancelled
            fmt.Println("Watch cancelled")
            return
        }
    }
}

// Usage:
controller := NewController(clientset)
controller.Start()
// Later...
controller.Stop() // Gracefully stop all operations
```

## Combining Timeout and Cancellation

Create a context with both timeout and manual cancellation:

```go
func watchWithTimeoutAndCancellation(clientset *kubernetes.Clientset, stopCh <-chan struct{}) error {
    // Create context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
    defer cancel()

    // Start watch
    watcher, err := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{})
    if err != nil {
        return err
    }
    defer watcher.Stop()

    for {
        select {
        case event := <-watcher.ResultChan():
            if event.Object == nil {
                // Watch closed
                return nil
            }
            // Process event

        case <-ctx.Done():
            // Timeout occurred
            return fmt.Errorf("watch timed out: %v", ctx.Err())

        case <-stopCh:
            // Manual cancellation
            return nil
        }
    }
}
```

## Retry with Timeout

Implement retries with overall timeout:

```go
import (
    "k8s.io/apimachinery/pkg/api/errors"
)

func updateWithRetryAndTimeout(clientset *kubernetes.Clientset, namespace, name string) error {
    // Overall timeout for all retry attempts
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    maxRetries := 5
    for attempt := 0; attempt < maxRetries; attempt++ {
        // Check if overall timeout exceeded
        if ctx.Err() != nil {
            return fmt.Errorf("operation timed out after %d attempts: %v", attempt, ctx.Err())
        }

        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            ctx,
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            if ctx.Err() != nil {
                return ctx.Err()
            }
            return err
        }

        deployment.Spec.Replicas = int32Ptr(5)

        _, err = clientset.AppsV1().Deployments(namespace).Update(
            ctx,
            deployment,
            metav1.UpdateOptions{},
        )

        if err == nil {
            return nil
        }

        if !errors.IsConflict(err) {
            return err
        }

        // Wait before retry, but respect the context
        select {
        case <-time.After(time.Second):
            // Continue to next attempt
        case <-ctx.Done():
            return ctx.Err()
        }
    }

    return fmt.Errorf("failed after %d attempts", maxRetries)
}

func int32Ptr(i int32) *int32 {
    return &i
}
```

## Configuring Client Timeouts

Set timeouts at the client level:

```go
import (
    "k8s.io/client-go/rest"
)

func createClientWithTimeouts() (*kubernetes.Clientset, error) {
    config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
    if err != nil {
        return nil, err
    }

    // Configure client timeouts
    config.Timeout = 10 * time.Second // Overall request timeout
    config.QPS = 50                   // Queries per second
    config.Burst = 100                // Burst capacity

    clientset, err := kubernetes.NewForConfig(config)
    return clientset, err
}
```

## Handling Timeout Errors

Distinguish between different error types:

```go
func handleAPIError(ctx context.Context, err error) {
    if err == nil {
        return
    }

    // Check for context errors first
    if ctx.Err() == context.DeadlineExceeded {
        log.Printf("Request timed out")
        return
    }

    if ctx.Err() == context.Canceled {
        log.Printf("Request was cancelled")
        return
    }

    // Check for Kubernetes API errors
    if errors.IsTimeout(err) {
        log.Printf("Server timeout error")
        return
    }

    if errors.IsServerTimeout(err) {
        log.Printf("Server is overloaded")
        return
    }

    // Other errors
    log.Printf("API error: %v", err)
}
```

## Watch with Timeout Handling

Properly handle watch timeout and reconnection:

```go
func watchWithReconnect(clientset *kubernetes.Clientset, stopCh <-chan struct{}) {
    for {
        select {
        case <-stopCh:
            return
        default:
        }

        // Create context for this watch attempt
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)

        watcher, err := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{})
        if err != nil {
            cancel()
            log.Printf("Failed to start watch: %v", err)
            time.Sleep(5 * time.Second)
            continue
        }

        // Process watch events
        watchLoop(watcher, ctx, stopCh)

        watcher.Stop()
        cancel()

        // Wait before reconnecting
        select {
        case <-time.After(1 * time.Second):
        case <-stopCh:
            return
        }
    }
}

func watchLoop(watcher watch.Interface, ctx context.Context, stopCh <-chan struct{}) {
    for {
        select {
        case event, ok := <-watcher.ResultChan():
            if !ok {
                log.Println("Watch channel closed")
                return
            }
            // Process event
            log.Printf("Event: %s\n", event.Type)

        case <-ctx.Done():
            log.Printf("Watch timeout: %v", ctx.Err())
            return

        case <-stopCh:
            log.Println("Stop requested")
            return
        }
    }
}
```

## Propagating Contexts in Controllers

Pass contexts through your controller layers:

```go
type PodController struct {
    clientset *kubernetes.Clientset
}

func (c *PodController) Reconcile(ctx context.Context, namespace, name string) error {
    // All operations use the provided context
    pod, err := c.getPod(ctx, namespace, name)
    if err != nil {
        return err
    }

    if err := c.updatePodStatus(ctx, pod); err != nil {
        return err
    }

    return nil
}

func (c *PodController) getPod(ctx context.Context, namespace, name string) (*corev1.Pod, error) {
    return c.clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (c *PodController) updatePodStatus(ctx context.Context, pod *corev1.Pod) error {
    _, err := c.clientset.CoreV1().Pods(pod.Namespace).UpdateStatus(
        ctx,
        pod,
        metav1.UpdateOptions{},
    )
    return err
}
```

## Best Practices

1. **Always use contexts**: Never pass `context.Background()` directly; use `WithTimeout` or `WithCancel`

2. **Set appropriate timeouts**: Fast operations (get) need shorter timeouts than slow ones (list)

3. **Always defer cancel()**: Even if unused, call cancel to free resources

4. **Handle timeout errors**: Distinguish timeouts from other errors

5. **Propagate contexts**: Pass contexts through function calls

6. **Respect context cancellation**: Check `ctx.Done()` in loops

7. **Configure client timeouts**: Set reasonable defaults at the client level

8. **Implement retry with overall timeout**: Individual retries should respect an overall deadline

9. **Log timeout occurrences**: Monitor for frequent timeouts indicating issues

10. **Test timeout scenarios**: Verify your code handles timeouts gracefully

## Common Mistakes

**Not deferring cancel()**:

```go
// Wrong: cancel not deferred
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
pods, err := clientset.CoreV1().Pods("default").List(ctx, metav1.ListOptions{})
cancel() // If List panics, cancel is never called

// Correct: defer cancel
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
pods, err := clientset.CoreV1().Pods("default").List(ctx, metav1.ListOptions{})
```

**Ignoring context in loops**:

```go
// Wrong: infinite loop even after timeout
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
for {
    // This loop never checks ctx.Done()
    doWork()
}

// Correct: check context
for {
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
        doWork()
    }
}
```

**Timeout too short**:

```go
// Wrong: 1 second is too short for listing many resources
ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
defer cancel()
clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
```

## Conclusion

Proper timeout and context cancellation handling is essential for building robust Kubernetes controllers. By using contexts with timeouts, implementing graceful cancellation, and handling timeout errors appropriately, you ensure your controllers remain responsive even when the API server is slow or network conditions are poor. Always propagate contexts through your code, set reasonable timeouts for different operations, and test your timeout handling to verify controllers behave correctly under adverse conditions.
