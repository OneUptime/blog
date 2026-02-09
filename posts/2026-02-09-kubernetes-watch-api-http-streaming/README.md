# How to Use the Kubernetes Watch API with HTTP Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, Watch

Description: Learn how to use the Kubernetes Watch API with HTTP streaming to receive real-time resource updates, build efficient controllers, and understand the watch protocol for event-driven applications.

---

Polling for changes is inefficient. Instead of repeatedly asking "did anything change?", the Kubernetes Watch API lets you subscribe to a stream of events, receiving notifications immediately when resources are created, modified, or deleted. This event-driven approach is the foundation of how controllers and operators work.

## How Watch Works

The Watch API uses HTTP streaming to deliver a continuous stream of events. When you initiate a watch request, the API server keeps the HTTP connection open and sends JSON-encoded events as they occur:

```
GET /api/v1/namespaces/default/pods?watch=true
```

The response is a stream of newline-delimited JSON objects:

```json
{"type":"ADDED","object":{"kind":"Pod","apiVersion":"v1","metadata":{"name":"nginx"},...}}
{"type":"MODIFIED","object":{"kind":"Pod","apiVersion":"v1","metadata":{"name":"nginx"},...}}
{"type":"DELETED","object":{"kind":"Pod","apiVersion":"v1","metadata":{"name":"nginx"},...}}
```

Each event includes:
- `type`: ADDED, MODIFIED, DELETED, BOOKMARK, or ERROR
- `object`: The full resource object

## Basic Watch with kubectl

You can watch resources using kubectl:

```bash
# Watch all pods in default namespace
kubectl get pods --watch

# Watch with output formatting
kubectl get pods --watch -o json

# Watch specific resource
kubectl get pod nginx --watch
```

The `--watch` flag keeps the connection open and streams changes as they happen.

## Watching with Raw API Access

Using `kubectl get --raw`, you can see the raw watch protocol:

```bash
# Start watching pods
kubectl get --raw "/api/v1/namespaces/default/pods?watch=true"

# The output streams JSON events continuously
# Press Ctrl+C to stop
```

## Implementing Watch in client-go

Here is how to watch resources programmatically:

```go
package main

import (
    "context"
    "fmt"
    "log"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/watch"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func watchPods(clientset *kubernetes.Clientset) error {
    namespace := "default"

    // Create a watcher
    watcher, err := clientset.CoreV1().Pods(namespace).Watch(
        context.TODO(),
        metav1.ListOptions{},
    )
    if err != nil {
        return fmt.Errorf("failed to create watcher: %v", err)
    }
    defer watcher.Stop()

    fmt.Println("Watching for pod events...")

    // Process events from the watch stream
    for event := range watcher.ResultChan() {
        pod, ok := event.Object.(*corev1.Pod)
        if !ok {
            log.Printf("Unexpected type: %T\n", event.Object)
            continue
        }

        switch event.Type {
        case watch.Added:
            fmt.Printf("Pod ADDED: %s\n", pod.Name)
        case watch.Modified:
            fmt.Printf("Pod MODIFIED: %s (phase: %s)\n", pod.Name, pod.Status.Phase)
        case watch.Deleted:
            fmt.Printf("Pod DELETED: %s\n", pod.Name)
        case watch.Error:
            log.Printf("Watch ERROR: %v\n", event.Object)
        case watch.Bookmark:
            // Bookmark events are used for resuming watches
            fmt.Printf("Bookmark received (resourceVersion: %s)\n", pod.ResourceVersion)
        }
    }

    fmt.Println("Watch stream closed")
    return nil
}

func main() {
    config, err := clientcmd.BuildConfigFromFlags("", "/path/to/kubeconfig")
    if err != nil {
        log.Fatalf("Failed to build config: %v", err)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        log.Fatalf("Failed to create clientset: %v", err)
    }

    if err := watchPods(clientset); err != nil {
        log.Fatalf("Error: %v", err)
    }
}
```

This code watches for pod events and prints them as they occur.

## Resuming Watches with ResourceVersion

Watches can be interrupted by network issues or server restarts. Use `resourceVersion` to resume from where you left off:

```go
func watchWithResume(clientset *kubernetes.Clientset) error {
    namespace := "default"
    var resourceVersion string

    for {
        // Start watching from the last known resourceVersion
        watcher, err := clientset.CoreV1().Pods(namespace).Watch(
            context.TODO(),
            metav1.ListOptions{
                ResourceVersion: resourceVersion,
            },
        )
        if err != nil {
            log.Printf("Failed to create watcher: %v", err)
            // Retry after a delay
            time.Sleep(5 * time.Second)
            continue
        }

        for event := range watcher.ResultChan() {
            pod, ok := event.Object.(*corev1.Pod)
            if !ok {
                continue
            }

            // Update the resourceVersion to resume from
            resourceVersion = pod.ResourceVersion

            // Process the event
            fmt.Printf("Event: %s, Pod: %s, ResourceVersion: %s\n",
                event.Type, pod.Name, resourceVersion)
        }

        // If we get here, the watch was closed
        // Loop will restart the watch from the last resourceVersion
        fmt.Println("Watch closed, reconnecting...")
        watcher.Stop()
    }
}
```

This pattern ensures you do not miss events when connections are interrupted.

## Filtering Watch Results

You can filter watch results using label selectors and field selectors:

```go
func watchFilteredPods(clientset *kubernetes.Clientset) error {
    watcher, err := clientset.CoreV1().Pods("default").Watch(
        context.TODO(),
        metav1.ListOptions{
            // Only watch pods with this label
            LabelSelector: "app=nginx",
            // Only watch running pods
            FieldSelector: "status.phase=Running",
        },
    )
    if err != nil {
        return err
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        pod := event.Object.(*corev1.Pod)
        fmt.Printf("Event: %s, Pod: %s\n", event.Type, pod.Name)
    }

    return nil
}
```

Filtering on the server side is more efficient than receiving all events and filtering client-side.

## Watch Bookmarks

Bookmark events help you maintain up-to-date resourceVersion values without processing actual changes:

```go
func watchWithBookmarks(clientset *kubernetes.Clientset) error {
    watcher, err := clientset.CoreV1().Pods("default").Watch(
        context.TODO(),
        metav1.ListOptions{
            AllowWatchBookmarks: true, // Request bookmark events
        },
    )
    if err != nil {
        return err
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        switch event.Type {
        case watch.Bookmark:
            // Bookmark events contain only metadata
            pod := event.Object.(*corev1.Pod)
            fmt.Printf("Bookmark: resourceVersion %s\n", pod.ResourceVersion)
            // Save this resourceVersion for resuming later
        case watch.Added, watch.Modified, watch.Deleted:
            pod := event.Object.(*corev1.Pod)
            fmt.Printf("Event: %s, Pod: %s\n", event.Type, pod.Name)
        }
    }

    return nil
}
```

Bookmarks are sent periodically when there are no actual resource changes, allowing you to keep your resourceVersion current.

## Watching Multiple Resource Types

To watch multiple resource types, create multiple watchers:

```go
func watchMultipleResources(clientset *kubernetes.Clientset) error {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Watch pods
    go func() {
        watcher, _ := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{})
        defer watcher.Stop()
        for event := range watcher.ResultChan() {
            pod := event.Object.(*corev1.Pod)
            fmt.Printf("Pod %s: %s\n", event.Type, pod.Name)
        }
    }()

    // Watch services
    go func() {
        watcher, _ := clientset.CoreV1().Services("default").Watch(ctx, metav1.ListOptions{})
        defer watcher.Stop()
        for event := range watcher.ResultChan() {
            svc := event.Object.(*corev1.Service)
            fmt.Printf("Service %s: %s\n", event.Type, svc.Name)
        }
    }()

    // Keep running until interrupted
    select {}
}
```

## Implementing a Controller Pattern

Here is a basic controller pattern using watch:

```go
import (
    "time"
)

type Controller struct {
    clientset *kubernetes.Clientset
    namespace string
}

func (c *Controller) Run(ctx context.Context) error {
    for {
        if err := c.runWatch(ctx); err != nil {
            log.Printf("Watch error: %v, retrying in 5s...", err)
            time.Sleep(5 * time.Second)
            continue
        }

        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
        }
    }
}

func (c *Controller) runWatch(ctx context.Context) error {
    watcher, err := c.clientset.CoreV1().Pods(c.namespace).Watch(
        ctx,
        metav1.ListOptions{},
    )
    if err != nil {
        return err
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        pod := event.Object.(*corev1.Pod)

        switch event.Type {
        case watch.Added:
            c.handlePodAdded(pod)
        case watch.Modified:
            c.handlePodModified(pod)
        case watch.Deleted:
            c.handlePodDeleted(pod)
        }
    }

    return nil
}

func (c *Controller) handlePodAdded(pod *corev1.Pod) {
    fmt.Printf("New pod created: %s\n", pod.Name)
    // Implement your logic here
}

func (c *Controller) handlePodModified(pod *corev1.Pod) {
    fmt.Printf("Pod modified: %s\n", pod.Name)
    // Implement your logic here
}

func (c *Controller) handlePodDeleted(pod *corev1.Pod) {
    fmt.Printf("Pod deleted: %s\n", pod.Name)
    // Implement your logic here
}
```

## Using Informers Instead of Raw Watch

For production controllers, use informers instead of raw watch API. Informers provide caching, indexing, and resync capabilities:

```go
import (
    "k8s.io/client-go/informers"
    "k8s.io/client-go/tools/cache"
)

func useInformer(clientset *kubernetes.Clientset) {
    // Create an informer factory
    informerFactory := informers.NewSharedInformerFactory(clientset, 30*time.Second)

    // Get a pod informer
    podInformer := informerFactory.Core().V1().Pods()

    // Add event handlers
    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod added: %s\n", pod.Name)
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            pod := newObj.(*corev1.Pod)
            fmt.Printf("Pod updated: %s\n", pod.Name)
        },
        DeleteFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod deleted: %s\n", pod.Name)
        },
    })

    // Start the informer
    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)

    // Wait for caches to sync
    informerFactory.WaitForCacheSync(stopCh)

    // Keep running
    <-stopCh
}
```

Informers handle watch resumption, caching, and many edge cases automatically.

## Best Practices

1. **Always use resourceVersion for resumption**: Save the resourceVersion and resume from it when connections break

2. **Handle all event types**: Include cases for ADDED, MODIFIED, DELETED, ERROR, and BOOKMARK

3. **Implement retry logic**: Watches will close; always retry with backoff

4. **Use informers for controllers**: Raw watch is lower-level; informers are better for production controllers

5. **Filter server-side**: Use label and field selectors to reduce bandwidth

6. **Set timeouts**: Use context with timeout to prevent indefinite hangs

7. **Close watchers properly**: Always call `Stop()` when done, preferably with defer

## Common Pitfalls

**Not handling watch closure**: The watch channel will close; always detect this and reconnect

**Ignoring error events**: Error events indicate problems; handle them appropriately

**Blocking in event handlers**: Process events quickly or queue them for async processing

**Not using informers**: For production controllers, informers provide essential features

## Conclusion

The Kubernetes Watch API with HTTP streaming is the cornerstone of event-driven Kubernetes applications. By maintaining a long-lived HTTP connection and receiving real-time events, you can build efficient controllers that react immediately to cluster changes without wasteful polling. Whether you use the raw watch API or the higher-level informer abstraction, understanding the watch protocol, resourceVersion resumption, and proper event handling is essential for building robust Kubernetes controllers and operators.
