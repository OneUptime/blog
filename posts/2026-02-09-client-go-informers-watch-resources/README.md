# How to Use client-go Informers to Watch Kubernetes Resource Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, client-go, Informers, Go

Description: Learn how to use client-go informers to efficiently watch and cache Kubernetes resources with event handlers for building controllers and operators.

---

Making individual API calls to check resource state is inefficient. List all pods, then list them again a second later, and you're hammering the API server with redundant requests. Your code is slow and you're wasting cluster resources.

Informers solve this problem. They maintain a local cache of resources and notify you when things change. One watch connection provides real-time updates for all resources of a type. This is how controllers efficiently track cluster state. This guide shows you how to use informers effectively.

## Understanding Informers

An informer sets up a watch on the Kubernetes API server for a specific resource type. When resources change, the API server sends events. The informer updates its local cache and calls your event handlers.

The cache means you can query resource state locally without API calls. Event handlers let you react to changes immediately. This combination enables efficient, real-time controllers.

## Setting Up client-go

Install the client-go library.

```bash
go get k8s.io/client-go@latest
go get k8s.io/apimachinery/pkg/apis/meta/v1@latest
```

Create a client configuration.

```go
package main

import (
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
    "k8s.io/client-go/rest"
)

func getKubernetesClient() (*kubernetes.Clientset, error) {
    // Try in-cluster config first
    config, err := rest.InClusterConfig()
    if err != nil {
        // Fall back to kubeconfig
        loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
        configOverrides := &clientcmd.ConfigOverrides{}
        kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
        config, err = kubeConfig.ClientConfig()
        if err != nil {
            return nil, err
        }
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return clientset, nil
}
```

## Creating a Basic Informer

Create an informer for pods.

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

func main() {
    clientset, err := getKubernetesClient()
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
            fmt.Printf("Pod ADDED: %s/%s\n", pod.Namespace, pod.Name)
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            oldPod := oldObj.(*corev1.Pod)
            newPod := newObj.(*corev1.Pod)
            fmt.Printf("Pod UPDATED: %s/%s\n", newPod.Namespace, newPod.Name)
            fmt.Printf("  Old phase: %s, New phase: %s\n", oldPod.Status.Phase, newPod.Status.Phase)
        },
        DeleteFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod DELETED: %s/%s\n", pod.Namespace, pod.Name)
        },
    })

    // Start informers
    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)

    // Wait for cache sync
    if !cache.WaitForCacheSync(stopCh, podInformer.Informer().HasSynced) {
        panic("failed to sync cache")
    }

    fmt.Println("Informer synced, watching for pod changes...")

    // Keep running
    <-stopCh
}
```

## Querying the Cache

Once synced, query the informer's cache without API calls.

```go
func listPodsFromCache(podInformer informers.PodInformer) {
    // List all pods from cache
    pods, err := podInformer.Lister().List(labels.Everything())
    if err != nil {
        fmt.Printf("Error listing pods: %v\n", err)
        return
    }

    fmt.Printf("Found %d pods in cache:\n", len(pods))
    for _, pod := range pods {
        fmt.Printf("  %s/%s - %s\n", pod.Namespace, pod.Name, pod.Status.Phase)
    }
}

func getPodFromCache(podInformer informers.PodInformer, namespace, name string) {
    pod, err := podInformer.Lister().Pods(namespace).Get(name)
    if err != nil {
        fmt.Printf("Error getting pod: %v\n", err)
        return
    }

    fmt.Printf("Pod: %s/%s\n", pod.Namespace, pod.Name)
    fmt.Printf("  Phase: %s\n", pod.Status.Phase)
    fmt.Printf("  Node: %s\n", pod.Spec.NodeName)
    fmt.Printf("  IP: %s\n", pod.Status.PodIP)
}
```

## Filtering with Label Selectors

Create informers that only watch resources matching specific labels.

```go
func createFilteredInformer(clientset *kubernetes.Clientset) {
    // Create filtered informer factory
    tweakListOptions := func(options *metav1.ListOptions) {
        options.LabelSelector = "app=myapp,environment=production"
    }

    informerFactory := informers.NewSharedInformerFactoryWithOptions(
        clientset,
        30*time.Second,
        informers.WithTweakListOptions(tweakListOptions),
    )

    podInformer := informerFactory.Core().V1().Pods()

    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Production pod added: %s/%s\n", pod.Namespace, pod.Name)
        },
    })

    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)
    informerFactory.WaitForCacheSync(stopCh)

    <-stopCh
}
```

## Watching Namespace-Specific Resources

Create informers for a single namespace.

```go
func createNamespacedInformer(clientset *kubernetes.Clientset, namespace string) {
    informerFactory := informers.NewSharedInformerFactoryWithOptions(
        clientset,
        30*time.Second,
        informers.WithNamespace(namespace),
    )

    podInformer := informerFactory.Core().V1().Pods()

    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod added in %s: %s\n", namespace, pod.Name)
        },
    })

    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)
    informerFactory.WaitForCacheSync(stopCh)

    <-stopCh
}
```

## Working with Multiple Resource Types

Watch multiple resource types with a single factory.

```go
func watchMultipleResources(clientset *kubernetes.Clientset) {
    informerFactory := informers.NewSharedInformerFactory(clientset, 30*time.Second)

    // Pod informer
    podInformer := informerFactory.Core().V1().Pods()
    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod added: %s/%s\n", pod.Namespace, pod.Name)
        },
    })

    // Service informer
    serviceInformer := informerFactory.Core().V1().Services()
    serviceInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            svc := obj.(*corev1.Service)
            fmt.Printf("Service added: %s/%s\n", svc.Namespace, svc.Name)
        },
    })

    // Deployment informer
    deploymentInformer := informerFactory.Apps().V1().Deployments()
    deploymentInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            deploy := obj.(*appsv1.Deployment)
            fmt.Printf("Deployment added: %s/%s\n", deploy.Namespace, deploy.Name)
        },
    })

    stopCh := make(chan struct{})
    defer close(stopCh)

    // Start all informers
    informerFactory.Start(stopCh)

    // Wait for all caches to sync
    informerFactory.WaitForCacheSync(stopCh)

    fmt.Println("All informers synced and watching...")
    <-stopCh
}
```

## Implementing Resource Indexers

Add custom indexes to speed up cache queries.

```go
func createIndexedInformer(clientset *kubernetes.Clientset) {
    informerFactory := informers.NewSharedInformerFactory(clientset, 30*time.Second)
    podInformer := informerFactory.Core().V1().Pods()

    // Add custom index by node name
    podInformer.Informer().AddIndexers(cache.Indexers{
        "byNode": func(obj interface{}) ([]string, error) {
            pod := obj.(*corev1.Pod)
            return []string{pod.Spec.NodeName}, nil
        },
    })

    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)
    informerFactory.WaitForCacheSync(stopCh)

    // Query pods by node
    indexer := podInformer.Informer().GetIndexer()
    pods, err := indexer.ByIndex("byNode", "worker-node-1")
    if err != nil {
        fmt.Printf("Error querying index: %v\n", err)
        return
    }

    fmt.Printf("Pods on worker-node-1:\n")
    for _, obj := range pods {
        pod := obj.(*corev1.Pod)
        fmt.Printf("  %s/%s\n", pod.Namespace, pod.Name)
    }
}
```

## Handling Resync

Informers periodically resync to catch missed events.

```go
func createInformerWithResync(clientset *kubernetes.Clientset) {
    // Resync every 5 minutes
    resyncPeriod := 5 * time.Minute

    informerFactory := informers.NewSharedInformerFactory(clientset, resyncPeriod)
    podInformer := informerFactory.Core().V1().Pods()

    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("Pod add/resync: %s/%s\n", pod.Namespace, pod.Name)
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            // During resync, oldObj == newObj
            if oldObj == newObj {
                // This is a resync event
                pod := newObj.(*corev1.Pod)
                fmt.Printf("Pod resync: %s/%s\n", pod.Namespace, pod.Name)
                return
            }

            // Actual update
            pod := newObj.(*corev1.Pod)
            fmt.Printf("Pod updated: %s/%s\n", pod.Namespace, pod.Name)
        },
    })

    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)
    informerFactory.WaitForCacheSync(stopCh)

    <-stopCh
}
```

## Error Handling and Retries

Handle errors gracefully when processing events.

```go
func createRobustInformer(clientset *kubernetes.Clientset) {
    informerFactory := informers.NewSharedInformerFactory(clientset, 30*time.Second)
    podInformer := informerFactory.Core().V1().Pods()

    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            if err := processPodAdd(obj); err != nil {
                pod := obj.(*corev1.Pod)
                fmt.Printf("Error processing pod %s/%s: %v\n",
                    pod.Namespace, pod.Name, err)
                // In a real controller, add to work queue for retry
            }
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            if err := processPodUpdate(oldObj, newObj); err != nil {
                pod := newObj.(*corev1.Pod)
                fmt.Printf("Error processing pod update %s/%s: %v\n",
                    pod.Namespace, pod.Name, err)
            }
        },
    })

    stopCh := make(chan struct{})
    defer close(stopCh)
    informerFactory.Start(stopCh)
    informerFactory.WaitForCacheSync(stopCh)

    <-stopCh
}

func processPodAdd(obj interface{}) error {
    pod := obj.(*corev1.Pod)

    // Validate object
    if pod == nil {
        return fmt.Errorf("received nil pod")
    }

    // Process the pod
    fmt.Printf("Processing new pod: %s/%s\n", pod.Namespace, pod.Name)

    // Your business logic here
    return nil
}

func processPodUpdate(oldObj, newObj interface{}) error {
    oldPod := oldObj.(*corev1.Pod)
    newPod := newObj.(*corev1.Pod)

    // Check if this is actually a change
    if oldPod.ResourceVersion == newPod.ResourceVersion {
        return nil // No actual change
    }

    // Process the update
    fmt.Printf("Processing pod update: %s/%s\n", newPod.Namespace, newPod.Name)

    // Your business logic here
    return nil
}
```

## Conclusion

Informers are the foundation of efficient Kubernetes controllers. They maintain local caches and provide event-driven updates without constant API polling.

Use informers for any application that watches Kubernetes resources. Configure appropriate resync periods to catch missed events. Add custom indexes for complex queries. Handle events in lightweight handlers and defer heavy processing to work queues.

Informers reduce API server load, improve response times, and enable real-time reactions to cluster changes. They're essential for building production-grade Kubernetes controllers and operators.
