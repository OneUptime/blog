# How to Implement Retry Logic for Kubernetes API Conflicts in Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Controllers, Error Handling

Description: Master retry patterns for handling API conflicts in Kubernetes controllers, implement exponential backoff, and build resilient operators that gracefully handle concurrent modifications.

---

In Kubernetes controllers, conflicts are inevitable. Multiple controllers may update the same resource, users might modify resources while your controller is processing them, and network issues can cause retry storms. Implementing proper retry logic is essential for building robust controllers that handle these situations gracefully without overwhelming the API server.

## Understanding API Conflicts

Conflicts occur when your update is based on an outdated version of a resource. Kubernetes uses optimistic concurrency control through the `resourceVersion` field. When you try to update a resource, the API server checks if your resourceVersion matches the current version. If not, you get a conflict error:

```
Error from server (Conflict): Operation cannot be fulfilled on pods "nginx":
the object has been modified; please apply your changes to the latest version and try again
```

This is not a failure. It is Kubernetes telling you: "The resource changed since you last read it. Try again with the latest version."

## Basic Retry Pattern

The fundamental retry pattern involves reading, modifying, and updating in a loop:

```go
package main

import (
    "context"
    "fmt"
    "time"

    appsv1 "k8s.io/api/apps/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

func updateDeploymentWithRetry(clientset *kubernetes.Clientset, namespace, name string) error {
    maxRetries := 5

    for attempt := 0; attempt < maxRetries; attempt++ {
        // Read the current state
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return fmt.Errorf("failed to get deployment: %v", err)
        }

        // Modify the deployment
        deployment.Spec.Replicas = int32Ptr(5)

        // Attempt to update
        _, err = clientset.AppsV1().Deployments(namespace).Update(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )

        if err == nil {
            // Success
            fmt.Printf("Update succeeded on attempt %d\n", attempt+1)
            return nil
        }

        // Check if it is a conflict error
        if !errors.IsConflict(err) {
            // Not a conflict, return the error
            return fmt.Errorf("update failed: %v", err)
        }

        // It is a conflict, retry
        fmt.Printf("Conflict on attempt %d, retrying...\n", attempt+1)
    }

    return fmt.Errorf("failed to update after %d attempts", maxRetries)
}

func int32Ptr(i int32) *int32 {
    return &i
}
```

This works, but it has a problem: no backoff. All retries happen immediately, which can overwhelm the API server.

## Exponential Backoff

Add exponential backoff to space out retry attempts:

```go
import (
    "math"
    "math/rand"
)

func updateWithExponentialBackoff(clientset *kubernetes.Clientset, namespace, name string) error {
    maxRetries := 10
    baseDelay := 100 * time.Millisecond
    maxDelay := 10 * time.Second

    for attempt := 0; attempt < maxRetries; attempt++ {
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return err
        }

        deployment.Spec.Replicas = int32Ptr(5)

        _, err = clientset.AppsV1().Deployments(namespace).Update(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )

        if err == nil {
            return nil
        }

        if !errors.IsConflict(err) {
            return err
        }

        // Calculate exponential backoff delay
        delay := time.Duration(float64(baseDelay) * math.Pow(2, float64(attempt)))
        if delay > maxDelay {
            delay = maxDelay
        }

        // Add jitter to prevent thundering herd
        jitter := time.Duration(rand.Float64() * float64(delay) * 0.1)
        delay += jitter

        fmt.Printf("Conflict on attempt %d, waiting %v before retry\n", attempt+1, delay)
        time.Sleep(delay)
    }

    return fmt.Errorf("failed to update after %d attempts", maxRetries)
}
```

The exponential backoff with jitter prevents retry storms when multiple controllers encounter conflicts simultaneously.

## Using client-go Retry Helper

Kubernetes client-go provides a built-in retry helper that implements exponential backoff:

```go
import (
    "k8s.io/client-go/util/retry"
)

func updateWithRetryHelper(clientset *kubernetes.Clientset, namespace, name string) error {
    // Use the built-in retry helper
    err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
        // Get the current version
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return err
        }

        // Modify it
        deployment.Spec.Replicas = int32Ptr(5)

        // Update it
        _, updateErr := clientset.AppsV1().Deployments(namespace).Update(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )
        return updateErr
    })

    if err != nil {
        return fmt.Errorf("update failed: %v", err)
    }

    return nil
}
```

`retry.DefaultRetry` provides sensible defaults:
- Initial delay: 10ms
- Backoff factor: 2x
- Max duration: 1000 seconds
- Steps: unlimited

You can customize the retry behavior:

```go
func updateWithCustomRetry(clientset *kubernetes.Clientset, namespace, name string) error {
    customRetry := retry.DefaultBackoff
    customRetry.Duration = 100 * time.Millisecond
    customRetry.Factor = 1.5
    customRetry.Jitter = 0.1
    customRetry.Steps = 10

    err := retry.RetryOnConflict(customRetry, func() error {
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return err
        }

        deployment.Spec.Replicas = int32Ptr(5)

        _, updateErr := clientset.AppsV1().Deployments(namespace).Update(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )
        return updateErr
    })

    return err
}
```

## Handling Different Error Types

Not all errors should trigger retries. Distinguish between retriable and non-retriable errors:

```go
func smartRetryUpdate(clientset *kubernetes.Clientset, namespace, name string) error {
    err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            // Check if it is a not-found error
            if errors.IsNotFound(err) {
                // Resource does not exist, no point retrying
                return nil
            }
            // Other errors might be transient, let retry logic handle them
            return err
        }

        deployment.Spec.Replicas = int32Ptr(5)

        _, updateErr := clientset.AppsV1().Deployments(namespace).Update(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )

        if updateErr != nil {
            // Check for specific error types
            if errors.IsInvalid(updateErr) {
                // Validation error, retrying will not help
                return updateErr
            }
            if errors.IsUnauthorized(updateErr) || errors.IsForbidden(updateErr) {
                // Permission error, retrying will not help
                return updateErr
            }
            // Conflict or transient error, retry
            return updateErr
        }

        return nil
    })

    return err
}
```

## Retry Logic in Controllers

In a controller, you typically retry the entire reconciliation loop:

```go
type DeploymentController struct {
    clientset *kubernetes.Clientset
}

func (c *DeploymentController) syncDeployment(namespace, name string) error {
    // Wrap the entire sync logic in retry
    err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
        return c.doSync(namespace, name)
    })

    if err != nil {
        // After all retries failed, requeue for later
        return fmt.Errorf("sync failed after retries: %v", err)
    }

    return nil
}

func (c *DeploymentController) doSync(namespace, name string) error {
    // Get current state
    deployment, err := c.clientset.AppsV1().Deployments(namespace).Get(
        context.TODO(),
        name,
        metav1.GetOptions{},
    )
    if err != nil {
        return err
    }

    // Compute desired state
    desiredReplicas := c.computeDesiredReplicas(deployment)

    // Update if needed
    if *deployment.Spec.Replicas != desiredReplicas {
        deployment.Spec.Replicas = &desiredReplicas
        _, err = c.clientset.AppsV1().Deployments(namespace).Update(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )
        return err
    }

    return nil
}

func (c *DeploymentController) computeDesiredReplicas(deployment *appsv1.Deployment) int32 {
    // Your business logic here
    return 5
}
```

## Status Updates Need Retry Too

Status subresource updates can also conflict:

```go
func updateStatusWithRetry(clientset *kubernetes.Clientset, namespace, name string) error {
    err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return err
        }

        // Update status fields
        deployment.Status.Replicas = 5
        deployment.Status.AvailableReplicas = 5
        deployment.Status.ReadyReplicas = 5

        // Use UpdateStatus, not Update
        _, updateErr := clientset.AppsV1().Deployments(namespace).UpdateStatus(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )
        return updateErr
    })

    return err
}
```

## Rate Limiting Retries

Prevent excessive API calls by implementing rate limiting:

```go
import (
    "golang.org/x/time/rate"
)

type RateLimitedController struct {
    clientset *kubernetes.Clientset
    limiter   *rate.Limiter
}

func NewRateLimitedController(clientset *kubernetes.Clientset) *RateLimitedController {
    // Allow 10 retries per second with burst of 20
    return &RateLimitedController{
        clientset: clientset,
        limiter:   rate.NewLimiter(10, 20),
    }
}

func (c *RateLimitedController) updateWithRateLimit(namespace, name string) error {
    err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
        // Wait for rate limiter
        if err := c.limiter.Wait(context.TODO()); err != nil {
            return err
        }

        deployment, err := c.clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return err
        }

        deployment.Spec.Replicas = int32Ptr(5)

        _, updateErr := clientset.AppsV1().Deployments(namespace).Update(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )
        return updateErr
    })

    return err
}
```

## Circuit Breaker Pattern

Implement a circuit breaker to stop retrying when the API server is overwhelmed:

```go
type CircuitBreaker struct {
    maxFailures  int
    resetTimeout time.Duration
    failures     int
    lastFailure  time.Time
    state        string // "closed", "open", "half-open"
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    if cb.state == "open" {
        if time.Since(cb.lastFailure) > cb.resetTimeout {
            cb.state = "half-open"
            cb.failures = 0
        } else {
            return fmt.Errorf("circuit breaker is open")
        }
    }

    err := fn()

    if err != nil {
        cb.failures++
        cb.lastFailure = time.Now()
        if cb.failures >= cb.maxFailures {
            cb.state = "open"
        }
        return err
    }

    // Success, reset circuit breaker
    cb.failures = 0
    cb.state = "closed"
    return nil
}
```

## Best Practices

1. **Always use retry for updates**: Any update can conflict; always implement retry logic

2. **Use exponential backoff**: Prevent overwhelming the API server with rapid retries

3. **Add jitter**: Random jitter prevents synchronized retry storms

4. **Limit retry attempts**: Set a maximum to avoid infinite loops

5. **Distinguish error types**: Only retry conflict and transient errors

6. **Use client-go helpers**: RetryOnConflict implements best practices

7. **Monitor retry rates**: Track retry metrics to detect issues early

8. **Apply to status updates**: Status subresources can conflict too

9. **Consider rate limiting**: Protect the API server during high contention

10. **Log retry attempts**: Include retry counts in logs for debugging

## Common Mistakes

**Retrying without backoff**: Leads to API server overload

**Retrying non-retriable errors**: Permission errors will never succeed

**Infinite retries**: Always set a maximum retry count

**Modifying outside the retry loop**: Modifications must be inside the loop to use the latest version

**Not checking error types**: Distinguish between conflicts and other errors

## Conclusion

Retry logic is fundamental to building robust Kubernetes controllers. Conflicts are a normal part of operating in a multi-client environment, and proper retry patterns with exponential backoff and jitter ensure your controllers handle them gracefully. Use the client-go RetryOnConflict helper as a starting point, customize backoff parameters for your specific needs, and always distinguish between retriable and non-retriable errors. With these patterns, your controllers will be resilient, efficient, and play nicely with other components in the Kubernetes ecosystem.
