# How to Implement Efficient Resource Watching with Bookmarks and ResourceVersion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Watch, ResourceVersion

Description: Learn how to implement efficient resource watching in Kubernetes using bookmarks and resource versions to minimize API server load and handle watch reconnections reliably.

---

Watching Kubernetes resources for changes is fundamental to building controllers and operators. Naive watch implementations can miss events, cause memory leaks, or overwhelm the API server. Using resource versions and bookmarks correctly ensures reliable, efficient watches that scale well even with thousands of resources.

Resource versions track changes to resources, while bookmarks help watches resume efficiently after disconnections. Understanding these mechanisms is essential for production-ready controllers.

## Understanding ResourceVersion

Every Kubernetes resource has a resourceVersion field that changes whenever the resource is modified. The API server uses this to track changes and enable efficient watches.

```bash
# Check resource version
kubectl get deployment webapp -o yaml | grep resourceVersion

resourceVersion: "12345678"
```

ResourceVersion types:

- **Specific version**: Watch from a specific point in time
- **0**: Watch from the beginning (all existing resources + future changes)
- **Empty**: Watch from now (only future changes, skip existing resources)

## Basic Watch Implementation

Simple watch using client-go:

```go
package main

import (
    "context"
    "fmt"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/cache"
)

func watchPods(clientset *kubernetes.Clientset) {
    ctx := context.Background()

    watcher, err := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{
        // Start from now, skip existing pods
        ResourceVersion: "",
    })
    if err != nil {
        panic(err)
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        pod := event.Object.(*corev1.Pod)

        switch event.Type {
        case "ADDED":
            fmt.Printf("Pod added: %s\n", pod.Name)
        case "MODIFIED":
            fmt.Printf("Pod modified: %s\n", pod.Name)
        case "DELETED":
            fmt.Printf("Pod deleted: %s\n", pod.Name)
        case "ERROR":
            fmt.Printf("Watch error: %v\n", event.Object)
        }
    }
}
```

## Resuming Watches with ResourceVersion

Store the last seen resource version to resume watches:

```go
func watchWithResume(clientset *kubernetes.Clientset) {
    ctx := context.Background()
    lastResourceVersion := ""

    for {
        watcher, err := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{
            ResourceVersion: lastResourceVersion,
        })
        if err != nil {
            fmt.Printf("Watch failed: %v, retrying...\n", err)
            continue
        }

        for event := range watcher.ResultChan() {
            switch event.Type {
            case "ADDED", "MODIFIED", "DELETED":
                pod := event.Object.(*corev1.Pod)
                lastResourceVersion = pod.ResourceVersion

                fmt.Printf("Event: %s, Pod: %s, RV: %s\n",
                    event.Type, pod.Name, lastResourceVersion)

            case "ERROR":
                // Watch expired or error occurred
                fmt.Printf("Watch error, will reconnect\n")
                watcher.Stop()
                break

            case "BOOKMARK":
                // Bookmark event with updated resource version
                bookmark := event.Object.(*corev1.Pod)
                lastResourceVersion = bookmark.ResourceVersion
                fmt.Printf("Bookmark received, RV: %s\n", lastResourceVersion)
            }
        }

        watcher.Stop()
        fmt.Println("Watch stopped, reconnecting...")
    }
}
```

## Using Bookmarks

Bookmarks help watches resume efficiently without replaying all events:

```go
func watchWithBookmarks(clientset *kubernetes.Clientset) {
    ctx := context.Background()
    lastResourceVersion := ""

    watcher, err := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{
        ResourceVersion:     lastResourceVersion,
        AllowWatchBookmarks: true,  // Enable bookmarks
    })
    if err != nil {
        panic(err)
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        switch event.Type {
        case "BOOKMARK":
            // API server sends periodic bookmarks with current RV
            meta := event.Object.(metav1.Object)
            lastResourceVersion = meta.GetResourceVersion()

            // Persist this for resume after restart
            saveResourceVersion(lastResourceVersion)

            fmt.Printf("Bookmark: RV=%s\n", lastResourceVersion)

        case "ADDED", "MODIFIED", "DELETED":
            pod := event.Object.(*corev1.Pod)
            lastResourceVersion = pod.ResourceVersion
            saveResourceVersion(lastResourceVersion)

            handleEvent(event.Type, pod)
        }
    }
}

func saveResourceVersion(rv string) {
    // Save to file, database, or configmap for recovery
    // after controller restart
}
```

## Watching Multiple Resources Efficiently

Use informers for production-ready watches:

```go
package main

import (
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/labels"
    "k8s.io/client-go/informers"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/cache"
)

func useInformer(clientset *kubernetes.Clientset) {
    // Create informer factory
    factory := informers.NewSharedInformerFactory(clientset, 30*time.Second)

    // Get pod informer
    podInformer := factory.Core().V1().Pods().Informer()

    // Add event handlers
    podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
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

    // Start informer
    stopCh := make(chan struct{})
    defer close(stopCh)

    factory.Start(stopCh)
    factory.WaitForCacheSync(stopCh)

    // Keep running
    <-stopCh
}
```

## List-Watch Pattern

Efficient pattern: List once, then watch for changes:

```go
func listThenWatch(clientset *kubernetes.Clientset) error {
    ctx := context.Background()

    // List all pods to get initial state
    pods, err := clientset.CoreV1().Pods("default").List(ctx, metav1.ListOptions{})
    if err != nil {
        return err
    }

    // Get resource version from list
    lastRV := pods.ResourceVersion

    fmt.Printf("Listed %d pods, RV: %s\n", len(pods.Items), lastRV)

    // Process initial pods
    for _, pod := range pods.Items {
        processPod(&pod)
    }

    // Now watch from that resource version
    watcher, err := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{
        ResourceVersion:     lastRV,
        AllowWatchBookmarks: true,
    })
    if err != nil {
        return err
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        switch event.Type {
        case "ADDED", "MODIFIED":
            pod := event.Object.(*corev1.Pod)
            processPod(pod)
        case "DELETED":
            pod := event.Object.(*corev1.Pod)
            fmt.Printf("Pod deleted: %s\n", pod.Name)
        case "BOOKMARK":
            meta := event.Object.(metav1.Object)
            lastRV = meta.GetResourceVersion()
        }
    }

    return nil
}

func processPod(pod *corev1.Pod) {
    fmt.Printf("Processing pod: %s\n", pod.Name)
}
```

## Handling Watch Errors

Properly handle watch failures and expiration:

```go
func robustWatch(clientset *kubernetes.Clientset) {
    ctx := context.Background()
    lastRV := ""
    backoff := time.Second

    for {
        err := watchOnce(ctx, clientset, &lastRV)
        if err != nil {
            fmt.Printf("Watch error: %v, retrying in %v\n", err, backoff)
            time.Sleep(backoff)

            // Exponential backoff
            backoff *= 2
            if backoff > time.Minute {
                backoff = time.Minute
            }
        } else {
            // Reset backoff on successful watch
            backoff = time.Second
        }
    }
}

func watchOnce(ctx context.Context, clientset *kubernetes.Clientset, lastRV *string) error {
    watcher, err := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{
        ResourceVersion:     *lastRV,
        AllowWatchBookmarks: true,
        TimeoutSeconds:      ptr.To(int64(300)), // 5 minute timeout
    })
    if err != nil {
        return err
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        switch event.Type {
        case "BOOKMARK":
            meta := event.Object.(metav1.Object)
            *lastRV = meta.GetResourceVersion()

        case "ADDED", "MODIFIED", "DELETED":
            pod := event.Object.(*corev1.Pod)
            *lastRV = pod.ResourceVersion

            // Process event
            handleEvent(event.Type, pod)

        case "ERROR":
            // Watch expired or encountered error
            return fmt.Errorf("watch error event")
        }
    }

    // Channel closed, watch ended
    return fmt.Errorf("watch channel closed")
}

func handleEvent(eventType string, pod *corev1.Pod) {
    fmt.Printf("%s: %s\n", eventType, pod.Name)
}
```

## Filtering Watches

Reduce watch traffic with field and label selectors:

```go
func watchWithFilters(clientset *kubernetes.Clientset) {
    ctx := context.Background()

    watcher, err := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{
        // Label selector
        LabelSelector: "app=webapp,environment=production",

        // Field selector
        FieldSelector: "status.phase=Running",

        // Enable bookmarks
        AllowWatchBookmarks: true,
    })
    if err != nil {
        panic(err)
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        pod := event.Object.(*corev1.Pod)
        fmt.Printf("%s: %s\n", event.Type, pod.Name)
    }
}
```

## Watch with Timeout

Set watch timeouts to prevent indefinite connections:

```go
func watchWithTimeout(clientset *kubernetes.Clientset) {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
    defer cancel()

    watcher, err := clientset.CoreV1().Pods("default").Watch(ctx, metav1.ListOptions{
        TimeoutSeconds: ptr.To(int64(600)), // 10 minutes
    })
    if err != nil {
        panic(err)
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        // Process events
    }
}
```

## Persisting Watch Progress

Save watch state for recovery:

```go
type WatchCheckpoint struct {
    ResourceVersion string
    Timestamp       time.Time
}

func persistentWatch(clientset *kubernetes.Clientset) {
    // Load last checkpoint
    checkpoint := loadCheckpoint()

    watcher, err := clientset.CoreV1().Pods("default").Watch(context.Background(),
        metav1.ListOptions{
            ResourceVersion:     checkpoint.ResourceVersion,
            AllowWatchBookmarks: true,
        })
    if err != nil {
        panic(err)
    }
    defer watcher.Stop()

    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    currentRV := checkpoint.ResourceVersion

    for {
        select {
        case event := <-watcher.ResultChan():
            switch event.Type {
            case "BOOKMARK":
                meta := event.Object.(metav1.Object)
                currentRV = meta.GetResourceVersion()

            case "ADDED", "MODIFIED", "DELETED":
                pod := event.Object.(*corev1.Pod)
                currentRV = pod.ResourceVersion
                handleEvent(event.Type, pod)
            }

        case <-ticker.C:
            // Periodically save checkpoint
            saveCheckpoint(WatchCheckpoint{
                ResourceVersion: currentRV,
                Timestamp:       time.Now(),
            })
        }
    }
}

func loadCheckpoint() WatchCheckpoint {
    // Load from file/database
    return WatchCheckpoint{}
}

func saveCheckpoint(checkpoint WatchCheckpoint) {
    // Save to file/database
}
```

## Watch Performance Monitoring

Monitor watch performance:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    watchEvents = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "kubernetes_watch_events_total",
            Help: "Total watch events received",
        },
        []string{"resource", "event_type"},
    )

    watchErrors = promauto.NewCounter(
        prometheus.CounterOpts{
            Name: "kubernetes_watch_errors_total",
            Help: "Total watch errors",
        },
    )

    watchReconnects = promauto.NewCounter(
        prometheus.CounterOpts{
            Name: "kubernetes_watch_reconnects_total",
            Help: "Total watch reconnections",
        },
    )
)

func monitoredWatch(clientset *kubernetes.Clientset) {
    for {
        err := watchWithMetrics(clientset)
        if err != nil {
            watchErrors.Inc()
            watchReconnects.Inc()
        }
    }
}

func watchWithMetrics(clientset *kubernetes.Clientset) error {
    watcher, err := clientset.CoreV1().Pods("default").Watch(
        context.Background(),
        metav1.ListOptions{AllowWatchBookmarks: true},
    )
    if err != nil {
        return err
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        watchEvents.WithLabelValues("pod", string(event.Type)).Inc()

        // Process event
    }

    return nil
}
```

## Controller-Runtime Watches

Use controller-runtime for high-level watch management:

```go
import (
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

type PodReconciler struct {
    client.Client
}

func (r *PodReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    pod := &corev1.Pod{}
    if err := r.Get(ctx, req.NamespacedName, pod); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Process pod
    return ctrl.Result{}, nil
}

func (r *PodReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&corev1.Pod{}).  // Watch pods
        Complete(r)
}
```

Controller-runtime handles resource versions, bookmarks, and reconnections automatically.

## Best Practices

Always use bookmarks in production watches to enable efficient resume.

Persist resource versions regularly to recover watch progress after restarts.

Use informers from client-go or controller-runtime instead of raw watches for better performance and reliability.

Implement exponential backoff when reconnecting after watch failures.

Set reasonable watch timeouts to prevent indefinite connections.

Monitor watch performance and errors with metrics.

Use label and field selectors to reduce watch traffic when possible.

Efficient resource watching with proper resource version and bookmark handling ensures controllers remain reliable and performant even at scale.
