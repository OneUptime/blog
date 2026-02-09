# How to Use Informer Cache to Reduce API Server Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Controllers, Performance

Description: Learn how to use Kubernetes informers to cache resources locally, reduce API server load, build efficient controllers, and understand the informer pattern for scalable applications.

---

Constantly querying the Kubernetes API server for resource state is inefficient and puts unnecessary load on the control plane. Informers solve this problem by maintaining a local cache of resources that stays synchronized with the cluster through watch events. This pattern is fundamental to building scalable controllers and operators.

## The Problem with Repeated API Calls

Imagine a controller that checks pod status every second:

```go
// Bad approach: repeatedly query the API server
for {
    pods, err := clientset.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
    // Process pods...
    time.Sleep(1 * time.Second)
}
```

Problems with this approach:
- Excessive API server load
- Network bandwidth waste
- Stale data between polls
- Does not scale with cluster size
- Misses rapid changes between poll intervals

## How Informers Work

Informers provide a better approach:

1. **Initial list**: Fetch all resources once
2. **Watch for changes**: Maintain a watch connection to receive updates
3. **Local cache**: Store resources in memory
4. **Event handlers**: Trigger callbacks when resources change
5. **Automatic resync**: Periodically re-list to catch missed events

This architecture dramatically reduces API server load while providing real-time updates.

## Basic Informer Setup

Here is a simple informer for pods:

```go
package main

import (
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/client-go/informers"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/cache"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // Build config
    config, err := clientcmd.BuildConfigFromFlags("", "/path/to/kubeconfig")
    if err != nil {
        panic(err)
    }

    // Create clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err)
    }

    // Create informer factory
    informerFactory := informers.NewSharedInformerFactory(clientset, 30*time.Second)

    // Get pod informer
    podInformer := informerFactory.Core().V1().Pods()

    // Add event handlers
    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod added: %s/%s\n", pod.Namespace, pod.Name)
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            pod := newObj.(*corev1.Pod)
            fmt.Printf("Pod updated: %s/%s\n", pod.Namespace, pod.Name)
        },
        DeleteFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod deleted: %s/%s\n", pod.Namespace, pod.Name)
        },
    })

    // Start the informer
    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)

    // Wait for cache to sync
    if !cache.WaitForCacheSync(stopCh, podInformer.Informer().HasSynced) {
        panic("failed to sync cache")
    }

    fmt.Println("Informer cache synced, watching for events...")

    // Keep running
    <-stopCh
}
```

After the cache syncs, all pod queries use local data instead of hitting the API server.

## Querying the Cache

Once the cache is synced, query it instead of the API server:

```go
func queryCache(podInformer cache.SharedIndexInformer) {
    // List all pods from cache (no API call)
    pods := podInformer.GetStore().List()
    fmt.Printf("Found %d pods in cache\n", len(pods))

    for _, obj := range pods {
        pod := obj.(*corev1.Pod)
        fmt.Printf("  - %s/%s\n", pod.Namespace, pod.Name)
    }
}

func getPodFromCache(podInformer cache.SharedIndexInformer, namespace, name string) (*corev1.Pod, error) {
    // Get specific pod from cache
    key := fmt.Sprintf("%s/%s", namespace, name)
    obj, exists, err := podInformer.GetStore().GetByKey(key)
    if err != nil {
        return nil, err
    }
    if !exists {
        return nil, fmt.Errorf("pod not found in cache")
    }
    return obj.(*corev1.Pod), nil
}
```

These queries happen in microseconds with zero API server load.

## Using Listers for Type-Safe Access

Listers provide type-safe cache access:

```go
func useListers(clientset *kubernetes.Clientset) {
    informerFactory := informers.NewSharedInformerFactory(clientset, 30*time.Second)
    podInformer := informerFactory.Core().V1().Pods()

    // Start informer
    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)
    cache.WaitForCacheSync(stopCh, podInformer.Informer().HasSynced)

    // Get lister from informer
    podLister := podInformer.Lister()

    // List all pods
    pods, err := podLister.List(labels.Everything())
    if err != nil {
        panic(err)
    }
    fmt.Printf("Found %d pods\n", len(pods))

    // List pods in specific namespace
    defaultPods, err := podLister.Pods("default").List(labels.Everything())
    if err != nil {
        panic(err)
    }
    fmt.Printf("Found %d pods in default namespace\n", len(defaultPods))

    // Get specific pod
    pod, err := podLister.Pods("default").Get("nginx")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
    } else {
        fmt.Printf("Pod: %s\n", pod.Name)
    }
}
```

## Filtering with Label Selectors

Filter cached resources without API calls:

```go
import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/labels"
)

func filterCachedPods(podLister v1.PodLister) {
    // Create label selector
    selector, err := labels.Parse("app=nginx,environment=production")
    if err != nil {
        panic(err)
    }

    // Filter pods from cache
    pods, err := podLister.List(selector)
    if err != nil {
        panic(err)
    }

    fmt.Printf("Found %d matching pods\n", len(pods))
    for _, pod := range pods {
        fmt.Printf("  - %s\n", pod.Name)
    }
}
```

## Namespace-Scoped Informers

Reduce memory usage by watching only specific namespaces:

```go
func namespacedInformer(clientset *kubernetes.Clientset) {
    // Create factory for specific namespace
    informerFactory := informers.NewSharedInformerFactoryWithOptions(
        clientset,
        30*time.Second,
        informers.WithNamespace("production"), // Only watch production namespace
    )

    podInformer := informerFactory.Core().V1().Pods()

    // This informer only caches pods in the production namespace
    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Production pod added: %s\n", pod.Name)
        },
    })

    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)
    cache.WaitForCacheSync(stopCh, podInformer.Informer().HasSynced)

    <-stopCh
}
```

## Customizing Resync Period

The resync period controls how often the informer re-lists all resources:

```go
func customResync(clientset *kubernetes.Clientset) {
    // Resync every 5 minutes
    informerFactory := informers.NewSharedInformerFactory(clientset, 5*time.Minute)

    podInformer := informerFactory.Core().V1().Pods()

    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            // Called for initial list and resync
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod: %s\n", pod.Name)
        },
    })

    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)
    cache.WaitForCacheSync(stopCh, podInformer.Informer().HasSynced)

    <-stopCh
}
```

Longer resync periods reduce API server load but may miss events if watch breaks. Typical values: 30 seconds to 10 minutes.

## Multiple Resource Types

Share one factory for multiple resource types:

```go
func multiResourceInformer(clientset *kubernetes.Clientset) {
    informerFactory := informers.NewSharedInformerFactory(clientset, 30*time.Second)

    // Get informers for different resources
    podInformer := informerFactory.Core().V1().Pods()
    serviceInformer := informerFactory.Core().V1().Services()
    deploymentInformer := informerFactory.Apps().V1().Deployments()

    // Add handlers for each
    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod: %s\n", pod.Name)
        },
    })

    serviceInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            svc := obj.(*corev1.Service)
            fmt.Printf("Service: %s\n", svc.Name)
        },
    })

    deploymentInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            deploy := obj.(*appsv1.Deployment)
            fmt.Printf("Deployment: %s\n", deploy.Name)
        },
    })

    // Start factory (starts all informers)
    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)

    // Wait for all caches to sync
    informerFactory.WaitForCacheSync(stopCh)

    <-stopCh
}
```

## Using Informers in Controllers

Typical controller pattern with informers:

```go
import (
    "k8s.io/client-go/util/workqueue"
)

type Controller struct {
    clientset     *kubernetes.Clientset
    podLister     v1.PodLister
    podSynced     cache.InformerSynced
    queue         workqueue.RateLimitingInterface
}

func NewController(clientset *kubernetes.Clientset, podInformer cache.SharedIndexInformer) *Controller {
    controller := &Controller{
        clientset: clientset,
        podLister: podInformer.Lister().(v1.PodLister),
        podSynced: podInformer.HasSynced,
        queue:     workqueue.NewRateLimitingQueue(workqueue.DefaultControllerRateLimiter()),
    }

    // Add event handlers that queue pod keys
    podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: controller.enqueuePod,
        UpdateFunc: func(old, new interface{}) {
            controller.enqueuePod(new)
        },
        DeleteFunc: controller.enqueuePod,
    })

    return controller
}

func (c *Controller) enqueuePod(obj interface{}) {
    key, err := cache.MetaNamespaceKeyFunc(obj)
    if err != nil {
        return
    }
    c.queue.Add(key)
}

func (c *Controller) Run(stopCh <-chan struct{}) {
    defer c.queue.ShutDown()

    // Wait for cache to sync
    if !cache.WaitForCacheSync(stopCh, c.podSynced) {
        fmt.Println("Failed to sync cache")
        return
    }

    // Start worker
    go c.runWorker()

    <-stopCh
}

func (c *Controller) runWorker() {
    for c.processNextItem() {
    }
}

func (c *Controller) processNextItem() bool {
    key, quit := c.queue.Get()
    if quit {
        return false
    }
    defer c.queue.Done(key)

    err := c.syncHandler(key.(string))
    if err != nil {
        c.queue.AddRateLimited(key)
        return true
    }

    c.queue.Forget(key)
    return true
}

func (c *Controller) syncHandler(key string) error {
    namespace, name, err := cache.SplitMetaNamespaceKey(key)
    if err != nil {
        return err
    }

    // Get pod from cache (not API server)
    pod, err := c.podLister.Pods(namespace).Get(name)
    if err != nil {
        return err
    }

    // Process the pod
    fmt.Printf("Processing pod: %s/%s\n", namespace, name)

    return nil
}
```

This pattern uses the informer cache for all reads, dramatically reducing API server load.

## Best Practices

1. **Use shared informer factories**: Share informers across controllers to reduce memory

2. **Wait for cache sync**: Always wait before querying the cache

3. **Use listers for queries**: Listers provide type-safe, indexed access

4. **Set appropriate resync periods**: Balance freshness with API server load

5. **Scope to namespaces when possible**: Reduce memory for namespace-specific controllers

6. **Handle deleted objects**: Check for deletions before processing

7. **Use work queues**: Decouple event handling from processing

8. **Monitor cache size**: Track memory usage for large clusters

## Avoiding Common Pitfalls

**Querying before sync**: Always wait for `HasSynced` to return true

**Not handling nil pointers**: Objects may be nil during deletion

**Modifying cached objects**: Never modify objects from cache; clone them first

**Forgetting to start informers**: Call `Start()` on the factory

**Not sharing factories**: Creating multiple factories wastes memory

## Performance Comparison

Without informers (repeated list calls):
- 1000 pods, 10 queries/sec = 10,000 API calls/sec
- High API server CPU and network usage

With informers:
- 1000 pods, 1 initial list + watch = ~1 API call for initial sync
- Subsequent queries from cache = 0 API calls
- 99.99% reduction in API server load

## Conclusion

Informers are essential for building scalable Kubernetes controllers. By maintaining a synchronized local cache of resources, they eliminate the need for repeated API calls, dramatically reducing API server load while providing real-time updates through watch events. Use shared informer factories, leverage listers for type-safe access, and implement the standard controller pattern with work queues for robust, efficient controllers that scale to clusters of any size.
