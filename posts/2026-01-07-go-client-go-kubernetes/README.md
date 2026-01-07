# How to Use client-go for Kubernetes API Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Kubernetes, client-go, API, DevOps

Description: Use client-go to programmatically interact with Kubernetes clusters for managing resources, watching events, and building automation tools.

---

Kubernetes has become the standard platform for container orchestration, and while `kubectl` serves well for manual operations, production systems often require programmatic access to the Kubernetes API. The official Go client library, `client-go`, provides a robust, type-safe way to interact with Kubernetes clusters. This guide covers everything from basic setup to advanced patterns like informers and work queues.

## Prerequisites

Before diving in, ensure you have:

- Go 1.21 or later installed
- Access to a Kubernetes cluster (local or remote)
- Basic understanding of Kubernetes resources
- Familiarity with Go programming

## Setting Up client-go

First, initialize your Go module and install the required dependencies.

```bash
# Initialize a new Go module
go mod init github.com/yourusername/k8s-controller

# Install client-go and related packages
go get k8s.io/client-go@latest
go get k8s.io/api@latest
go get k8s.io/apimachinery@latest
```

The `client-go` library consists of several key packages:

- `kubernetes`: The main clientset for accessing built-in resources
- `rest`: Configuration and transport for API communication
- `tools/clientcmd`: Loading kubeconfig files
- `informers`: Shared informer factories for efficient watching
- `util/workqueue`: Rate-limited work queues for event processing

## Authentication and Configuration

### Out-of-Cluster Configuration

When running outside the cluster (development, CI/CD pipelines), use kubeconfig-based authentication.

```go
package main

import (
    "context"
    "flag"
    "fmt"
    "os"
    "path/filepath"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // Define kubeconfig flag with default path
    var kubeconfig *string
    if home := homeDir(); home != "" {
        kubeconfig = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"),
            "(optional) absolute path to the kubeconfig file")
    } else {
        kubeconfig = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
    }
    flag.Parse()

    // Build configuration from the kubeconfig file
    config, err := clientcmd.BuildConfigFromFlags("", *kubeconfig)
    if err != nil {
        fmt.Printf("Error building kubeconfig: %v\n", err)
        os.Exit(1)
    }

    // Create the Kubernetes clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        fmt.Printf("Error creating clientset: %v\n", err)
        os.Exit(1)
    }

    // Test the connection by listing namespaces
    namespaces, err := clientset.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        fmt.Printf("Error listing namespaces: %v\n", err)
        os.Exit(1)
    }

    fmt.Printf("Found %d namespaces\n", len(namespaces.Items))
    for _, ns := range namespaces.Items {
        fmt.Printf("  - %s\n", ns.Name)
    }
}

func homeDir() string {
    if h := os.Getenv("HOME"); h != "" {
        return h
    }
    return os.Getenv("USERPROFILE") // Windows
}
```

### In-Cluster Configuration

When running inside a Kubernetes pod, use the service account token mounted automatically.

```go
package main

import (
    "context"
    "fmt"
    "os"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func main() {
    // InClusterConfig uses the service account token and CA certificate
    // mounted at /var/run/secrets/kubernetes.io/serviceaccount/
    config, err := rest.InClusterConfig()
    if err != nil {
        fmt.Printf("Error getting in-cluster config: %v\n", err)
        os.Exit(1)
    }

    // Create clientset with the in-cluster configuration
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        fmt.Printf("Error creating clientset: %v\n", err)
        os.Exit(1)
    }

    // Verify connectivity by getting server version
    version, err := clientset.Discovery().ServerVersion()
    if err != nil {
        fmt.Printf("Error getting server version: %v\n", err)
        os.Exit(1)
    }

    fmt.Printf("Connected to Kubernetes %s\n", version.GitVersion)
}
```

### Hybrid Configuration Helper

This utility function automatically detects the environment and uses the appropriate configuration method.

```go
package config

import (
    "os"
    "path/filepath"

    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
)

// GetClientset returns a Kubernetes clientset using in-cluster config
// if running inside a pod, or kubeconfig if running locally
func GetClientset() (*kubernetes.Clientset, error) {
    var config *rest.Config
    var err error

    // Try in-cluster config first
    config, err = rest.InClusterConfig()
    if err != nil {
        // Fall back to kubeconfig
        kubeconfigPath := os.Getenv("KUBECONFIG")
        if kubeconfigPath == "" {
            homeDir, _ := os.UserHomeDir()
            kubeconfigPath = filepath.Join(homeDir, ".kube", "config")
        }

        config, err = clientcmd.BuildConfigFromFlags("", kubeconfigPath)
        if err != nil {
            return nil, err
        }
    }

    // Configure connection settings for better reliability
    config.QPS = 50           // Queries per second
    config.Burst = 100        // Burst capacity
    config.Timeout = 30       // Request timeout in seconds

    return kubernetes.NewForConfig(config)
}
```

## CRUD Operations on Resources

### Creating Resources

Create a Deployment with proper configuration and labels.

```go
package main

import (
    "context"
    "fmt"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

// CreateDeployment creates a new Deployment in the specified namespace
func CreateDeployment(clientset *kubernetes.Clientset, namespace string) (*appsv1.Deployment, error) {
    deploymentsClient := clientset.AppsV1().Deployments(namespace)

    // Define the number of replicas
    replicas := int32(3)

    // Build the Deployment specification
    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name: "nginx-deployment",
            Labels: map[string]string{
                "app":        "nginx",
                "managed-by": "client-go",
            },
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &replicas,
            Selector: &metav1.LabelSelector{
                MatchLabels: map[string]string{
                    "app": "nginx",
                },
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: map[string]string{
                        "app": "nginx",
                    },
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "nginx",
                            Image: "nginx:1.25",
                            Ports: []corev1.ContainerPort{
                                {
                                    ContainerPort: 80,
                                    Protocol:      corev1.ProtocolTCP,
                                },
                            },
                            Resources: corev1.ResourceRequirements{
                                Requests: corev1.ResourceList{
                                    corev1.ResourceCPU:    resource.MustParse("100m"),
                                    corev1.ResourceMemory: resource.MustParse("128Mi"),
                                },
                                Limits: corev1.ResourceList{
                                    corev1.ResourceCPU:    resource.MustParse("200m"),
                                    corev1.ResourceMemory: resource.MustParse("256Mi"),
                                },
                            },
                        },
                    },
                },
            },
        },
    }

    // Create the Deployment
    result, err := deploymentsClient.Create(context.TODO(), deployment, metav1.CreateOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to create deployment: %w", err)
    }

    fmt.Printf("Created deployment %q in namespace %q\n", result.Name, namespace)
    return result, nil
}
```

### Reading Resources

Retrieve resources with various filtering options.

```go
package main

import (
    "context"
    "fmt"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

// GetDeployment retrieves a specific Deployment by name
func GetDeployment(clientset *kubernetes.Clientset, namespace, name string) error {
    deployment, err := clientset.AppsV1().Deployments(namespace).Get(
        context.TODO(),
        name,
        metav1.GetOptions{},
    )
    if err != nil {
        return fmt.Errorf("failed to get deployment: %w", err)
    }

    fmt.Printf("Deployment: %s\n", deployment.Name)
    fmt.Printf("  Replicas: %d/%d\n", deployment.Status.ReadyReplicas, *deployment.Spec.Replicas)
    fmt.Printf("  Strategy: %s\n", deployment.Spec.Strategy.Type)
    fmt.Printf("  Created: %s\n", deployment.CreationTimestamp)

    return nil
}

// ListPodsByLabel retrieves all Pods matching a label selector
func ListPodsByLabel(clientset *kubernetes.Clientset, namespace, labelSelector string) error {
    pods, err := clientset.CoreV1().Pods(namespace).List(
        context.TODO(),
        metav1.ListOptions{
            LabelSelector: labelSelector,
        },
    )
    if err != nil {
        return fmt.Errorf("failed to list pods: %w", err)
    }

    fmt.Printf("Found %d pods matching %q:\n", len(pods.Items), labelSelector)
    for _, pod := range pods.Items {
        fmt.Printf("  - %s (Phase: %s, Node: %s)\n",
            pod.Name, pod.Status.Phase, pod.Spec.NodeName)
    }

    return nil
}

// ListAllNamespaces retrieves all namespaces in the cluster
func ListAllNamespaces(clientset *kubernetes.Clientset) error {
    namespaces, err := clientset.CoreV1().Namespaces().List(
        context.TODO(),
        metav1.ListOptions{},
    )
    if err != nil {
        return fmt.Errorf("failed to list namespaces: %w", err)
    }

    for _, ns := range namespaces.Items {
        fmt.Printf("Namespace: %s (Status: %s)\n", ns.Name, ns.Status.Phase)
    }

    return nil
}
```

### Updating Resources

Update resources using both direct updates and strategic merge patches.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/types"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/util/retry"
)

// UpdateDeploymentReplicas scales a Deployment using retry logic
func UpdateDeploymentReplicas(clientset *kubernetes.Clientset, namespace, name string, replicas int32) error {
    deploymentsClient := clientset.AppsV1().Deployments(namespace)

    // Use RetryOnConflict to handle concurrent updates
    return retry.RetryOnConflict(retry.DefaultRetry, func() error {
        // Get the latest version of the Deployment
        deployment, err := deploymentsClient.Get(context.TODO(), name, metav1.GetOptions{})
        if err != nil {
            return err
        }

        // Update the replica count
        deployment.Spec.Replicas = &replicas

        // Attempt to update
        _, err = deploymentsClient.Update(context.TODO(), deployment, metav1.UpdateOptions{})
        return err
    })
}

// PatchDeploymentImage updates the container image using a JSON patch
func PatchDeploymentImage(clientset *kubernetes.Clientset, namespace, name, newImage string) error {
    // Create a strategic merge patch
    patch := map[string]interface{}{
        "spec": map[string]interface{}{
            "template": map[string]interface{}{
                "spec": map[string]interface{}{
                    "containers": []map[string]interface{}{
                        {
                            "name":  "nginx",
                            "image": newImage,
                        },
                    },
                },
            },
        },
    }

    patchBytes, err := json.Marshal(patch)
    if err != nil {
        return fmt.Errorf("failed to marshal patch: %w", err)
    }

    // Apply the patch
    _, err = clientset.AppsV1().Deployments(namespace).Patch(
        context.TODO(),
        name,
        types.StrategicMergePatchType,
        patchBytes,
        metav1.PatchOptions{},
    )
    if err != nil {
        return fmt.Errorf("failed to patch deployment: %w", err)
    }

    fmt.Printf("Updated image to %s\n", newImage)
    return nil
}

// AddDeploymentAnnotation adds an annotation using JSON patch
func AddDeploymentAnnotation(clientset *kubernetes.Clientset, namespace, name, key, value string) error {
    // JSON Patch format for adding/updating annotations
    patch := []map[string]interface{}{
        {
            "op":    "add",
            "path":  fmt.Sprintf("/metadata/annotations/%s", key),
            "value": value,
        },
    }

    patchBytes, err := json.Marshal(patch)
    if err != nil {
        return err
    }

    _, err = clientset.AppsV1().Deployments(namespace).Patch(
        context.TODO(),
        name,
        types.JSONPatchType,
        patchBytes,
        metav1.PatchOptions{},
    )

    return err
}
```

### Deleting Resources

Delete resources with proper propagation policies.

```go
package main

import (
    "context"
    "fmt"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

// DeleteDeployment removes a Deployment and its associated resources
func DeleteDeployment(clientset *kubernetes.Clientset, namespace, name string) error {
    deploymentsClient := clientset.AppsV1().Deployments(namespace)

    // Use Foreground deletion to wait for dependent resources
    deletePolicy := metav1.DeletePropagationForeground
    gracePeriod := int64(30) // 30 second grace period

    err := deploymentsClient.Delete(context.TODO(), name, metav1.DeleteOptions{
        PropagationPolicy:  &deletePolicy,
        GracePeriodSeconds: &gracePeriod,
    })
    if err != nil {
        return fmt.Errorf("failed to delete deployment: %w", err)
    }

    fmt.Printf("Deleted deployment %q\n", name)
    return nil
}

// DeletePodsByLabel removes all Pods matching a label selector
func DeletePodsByLabel(clientset *kubernetes.Clientset, namespace, labelSelector string) error {
    // DeleteCollection removes all matching resources in a single call
    err := clientset.CoreV1().Pods(namespace).DeleteCollection(
        context.TODO(),
        metav1.DeleteOptions{},
        metav1.ListOptions{
            LabelSelector: labelSelector,
        },
    )
    if err != nil {
        return fmt.Errorf("failed to delete pods: %w", err)
    }

    fmt.Printf("Deleted pods matching %q\n", labelSelector)
    return nil
}
```

## Dynamic Client for Custom Resources

The dynamic client enables working with Custom Resource Definitions (CRDs) without generated types.

```go
package main

import (
    "context"
    "fmt"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/client-go/dynamic"
    "k8s.io/client-go/rest"
)

// CRDManager handles operations on Custom Resources
type CRDManager struct {
    client dynamic.Interface
}

// NewCRDManager creates a new CRD manager
func NewCRDManager(config *rest.Config) (*CRDManager, error) {
    client, err := dynamic.NewForConfig(config)
    if err != nil {
        return nil, err
    }
    return &CRDManager{client: client}, nil
}

// CreateCustomResource creates a custom resource instance
func (m *CRDManager) CreateCustomResource(
    namespace string,
    gvr schema.GroupVersionResource,
    obj *unstructured.Unstructured,
) (*unstructured.Unstructured, error) {
    return m.client.Resource(gvr).Namespace(namespace).Create(
        context.TODO(),
        obj,
        metav1.CreateOptions{},
    )
}

// Example: Working with a Certificate custom resource (cert-manager)
func CreateCertificate(manager *CRDManager, namespace string) error {
    // Define the GroupVersionResource for cert-manager Certificate
    certificateGVR := schema.GroupVersionResource{
        Group:    "cert-manager.io",
        Version:  "v1",
        Resource: "certificates",
    }

    // Build the Certificate object using unstructured
    certificate := &unstructured.Unstructured{
        Object: map[string]interface{}{
            "apiVersion": "cert-manager.io/v1",
            "kind":       "Certificate",
            "metadata": map[string]interface{}{
                "name":      "my-certificate",
                "namespace": namespace,
            },
            "spec": map[string]interface{}{
                "secretName": "my-tls-secret",
                "issuerRef": map[string]interface{}{
                    "name": "letsencrypt-prod",
                    "kind": "ClusterIssuer",
                },
                "dnsNames": []interface{}{
                    "example.com",
                    "www.example.com",
                },
            },
        },
    }

    result, err := manager.CreateCustomResource(namespace, certificateGVR, certificate)
    if err != nil {
        return fmt.Errorf("failed to create certificate: %w", err)
    }

    fmt.Printf("Created certificate: %s\n", result.GetName())
    return nil
}

// ListCustomResources lists all instances of a custom resource
func (m *CRDManager) ListCustomResources(
    namespace string,
    gvr schema.GroupVersionResource,
) (*unstructured.UnstructuredList, error) {
    return m.client.Resource(gvr).Namespace(namespace).List(
        context.TODO(),
        metav1.ListOptions{},
    )
}

// GetNestedField safely extracts nested fields from unstructured objects
func GetNestedField(obj *unstructured.Unstructured, fields ...string) (interface{}, bool, error) {
    return unstructured.NestedFieldNoCopy(obj.Object, fields...)
}
```

## Informers and Watches

Informers provide an efficient way to watch resources and maintain a local cache, reducing API server load.

```go
package main

import (
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/util/wait"
    "k8s.io/client-go/informers"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/cache"
)

// PodInformer watches Pod events and maintains a local cache
type PodInformer struct {
    factory  informers.SharedInformerFactory
    informer cache.SharedIndexInformer
    stopCh   chan struct{}
}

// NewPodInformer creates a new Pod informer
func NewPodInformer(clientset *kubernetes.Clientset, namespace string) *PodInformer {
    // Create a shared informer factory with 30-second resync period
    factory := informers.NewSharedInformerFactoryWithOptions(
        clientset,
        30*time.Second,
        informers.WithNamespace(namespace),
    )

    // Get the Pod informer from the factory
    podInformer := factory.Core().V1().Pods().Informer()

    return &PodInformer{
        factory:  factory,
        informer: podInformer,
        stopCh:   make(chan struct{}),
    }
}

// AddEventHandlers registers callbacks for Pod events
func (p *PodInformer) AddEventHandlers() {
    // Add event handlers for add, update, and delete events
    p.informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("[ADD] Pod: %s/%s\n", pod.Namespace, pod.Name)
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            oldPod := oldObj.(*corev1.Pod)
            newPod := newObj.(*corev1.Pod)

            // Only log if the phase changed
            if oldPod.Status.Phase != newPod.Status.Phase {
                fmt.Printf("[UPDATE] Pod: %s/%s - Phase: %s -> %s\n",
                    newPod.Namespace, newPod.Name,
                    oldPod.Status.Phase, newPod.Status.Phase)
            }
        },
        DeleteFunc: func(obj interface{}) {
            pod := obj.(*corev1.Pod)
            fmt.Printf("[DELETE] Pod: %s/%s\n", pod.Namespace, pod.Name)
        },
    })
}

// Start begins watching for Pod events
func (p *PodInformer) Start() {
    p.factory.Start(p.stopCh)

    // Wait for the cache to sync before processing events
    if !cache.WaitForCacheSync(p.stopCh, p.informer.HasSynced) {
        fmt.Println("Failed to sync cache")
        return
    }

    fmt.Println("Cache synced, watching for Pod events...")
}

// Stop gracefully shuts down the informer
func (p *PodInformer) Stop() {
    close(p.stopCh)
}

// GetPod retrieves a Pod from the local cache
func (p *PodInformer) GetPod(namespace, name string) (*corev1.Pod, bool, error) {
    key := fmt.Sprintf("%s/%s", namespace, name)
    obj, exists, err := p.informer.GetIndexer().GetByKey(key)
    if err != nil || !exists {
        return nil, exists, err
    }
    return obj.(*corev1.Pod), true, nil
}

// ListPods retrieves all Pods from the local cache
func (p *PodInformer) ListPods() []*corev1.Pod {
    items := p.informer.GetIndexer().List()
    pods := make([]*corev1.Pod, 0, len(items))
    for _, item := range items {
        pods = append(pods, item.(*corev1.Pod))
    }
    return pods
}
```

## Work Queues for Event Handling

Work queues enable reliable, rate-limited processing of events with retry support.

```go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/util/runtime"
    "k8s.io/apimachinery/pkg/util/wait"
    "k8s.io/client-go/informers"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/cache"
    "k8s.io/client-go/util/workqueue"
)

// Controller processes Pod events using a work queue
type Controller struct {
    clientset     *kubernetes.Clientset
    informer      cache.SharedIndexInformer
    queue         workqueue.RateLimitingInterface
    maxRetries    int
}

// NewController creates a new Controller with rate-limited work queue
func NewController(clientset *kubernetes.Clientset, namespace string) *Controller {
    // Create informer factory
    factory := informers.NewSharedInformerFactoryWithOptions(
        clientset,
        time.Minute,
        informers.WithNamespace(namespace),
    )

    podInformer := factory.Core().V1().Pods().Informer()

    // Create a rate-limiting work queue
    // Items are rate limited with exponential backoff
    queue := workqueue.NewRateLimitingQueue(
        workqueue.NewItemExponentialFailureRateLimiter(
            time.Millisecond*500, // Base delay
            time.Second*30,       // Max delay
        ),
    )

    controller := &Controller{
        clientset:  clientset,
        informer:   podInformer,
        queue:      queue,
        maxRetries: 5,
    }

    // Register event handlers that enqueue work items
    podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            controller.enqueue(obj)
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            controller.enqueue(newObj)
        },
        DeleteFunc: func(obj interface{}) {
            controller.enqueue(obj)
        },
    })

    return controller
}

// enqueue adds an item to the work queue
func (c *Controller) enqueue(obj interface{}) {
    key, err := cache.MetaNamespaceKeyFunc(obj)
    if err != nil {
        runtime.HandleError(err)
        return
    }
    c.queue.Add(key)
}

// Run starts the controller with the specified number of workers
func (c *Controller) Run(ctx context.Context, workers int) error {
    defer runtime.HandleCrash()
    defer c.queue.ShutDown()

    fmt.Println("Starting controller")

    // Wait for cache sync
    if !cache.WaitForCacheSync(ctx.Done(), c.informer.HasSynced) {
        return fmt.Errorf("failed to sync cache")
    }

    fmt.Println("Cache synced, starting workers")

    // Start worker goroutines
    for i := 0; i < workers; i++ {
        go wait.UntilWithContext(ctx, c.runWorker, time.Second)
    }

    <-ctx.Done()
    fmt.Println("Shutting down controller")
    return nil
}

// runWorker processes items from the queue
func (c *Controller) runWorker(ctx context.Context) {
    for c.processNextItem(ctx) {
    }
}

// processNextItem handles a single work item
func (c *Controller) processNextItem(ctx context.Context) bool {
    // Get next item from queue (blocks if empty)
    key, shutdown := c.queue.Get()
    if shutdown {
        return false
    }
    defer c.queue.Done(key)

    // Process the item
    err := c.syncHandler(ctx, key.(string))
    if err == nil {
        // Success - remove from rate limiter
        c.queue.Forget(key)
        return true
    }

    // Handle retry logic
    if c.queue.NumRequeues(key) < c.maxRetries {
        fmt.Printf("Error processing %s (will retry): %v\n", key, err)
        c.queue.AddRateLimited(key)
        return true
    }

    // Max retries exceeded
    fmt.Printf("Dropping %s after %d retries: %v\n", key, c.maxRetries, err)
    c.queue.Forget(key)
    runtime.HandleError(err)

    return true
}

// syncHandler processes a single Pod event
func (c *Controller) syncHandler(ctx context.Context, key string) error {
    namespace, name, err := cache.SplitMetaNamespaceKey(key)
    if err != nil {
        return err
    }

    // Get the Pod from the cache
    obj, exists, err := c.informer.GetIndexer().GetByKey(key)
    if err != nil {
        return err
    }

    if !exists {
        // Pod was deleted
        fmt.Printf("Pod %s/%s was deleted\n", namespace, name)
        return nil
    }

    pod := obj.(*corev1.Pod)

    // Implement your business logic here
    fmt.Printf("Processing Pod %s/%s (Phase: %s)\n",
        namespace, name, pod.Status.Phase)

    return nil
}
```

## Pagination and List Optimizations

When dealing with large clusters, pagination prevents memory issues and API timeouts.

```go
package main

import (
    "context"
    "fmt"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

// PaginatedPodLister lists Pods using pagination
type PaginatedPodLister struct {
    clientset *kubernetes.Clientset
    pageSize  int64
}

// NewPaginatedPodLister creates a lister with the specified page size
func NewPaginatedPodLister(clientset *kubernetes.Clientset, pageSize int64) *PaginatedPodLister {
    return &PaginatedPodLister{
        clientset: clientset,
        pageSize:  pageSize,
    }
}

// ListAllPods retrieves all Pods across all namespaces using pagination
func (p *PaginatedPodLister) ListAllPods(ctx context.Context) ([]corev1.Pod, error) {
    var allPods []corev1.Pod
    var continueToken string

    for {
        // List pods with pagination parameters
        podList, err := p.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{
            Limit:    p.pageSize,
            Continue: continueToken,
        })
        if err != nil {
            return nil, fmt.Errorf("failed to list pods: %w", err)
        }

        // Append pods from this page
        allPods = append(allPods, podList.Items...)

        // Check if there are more pages
        if podList.Continue == "" {
            break
        }
        continueToken = podList.Continue

        fmt.Printf("Retrieved %d pods, fetching next page...\n", len(allPods))
    }

    return allPods, nil
}

// StreamPods processes Pods one page at a time to minimize memory usage
func (p *PaginatedPodLister) StreamPods(ctx context.Context, handler func([]corev1.Pod) error) error {
    var continueToken string

    for {
        podList, err := p.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{
            Limit:    p.pageSize,
            Continue: continueToken,
        })
        if err != nil {
            return fmt.Errorf("failed to list pods: %w", err)
        }

        // Process this page
        if err := handler(podList.Items); err != nil {
            return fmt.Errorf("handler error: %w", err)
        }

        if podList.Continue == "" {
            break
        }
        continueToken = podList.Continue
    }

    return nil
}

// ListPodsWithFilter lists Pods matching specific criteria
func (p *PaginatedPodLister) ListPodsWithFilter(
    ctx context.Context,
    namespace string,
    labelSelector string,
    fieldSelector string,
) ([]corev1.Pod, error) {
    var allPods []corev1.Pod
    var continueToken string

    for {
        podList, err := p.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
            LabelSelector: labelSelector,
            FieldSelector: fieldSelector,
            Limit:         p.pageSize,
            Continue:      continueToken,
        })
        if err != nil {
            return nil, err
        }

        allPods = append(allPods, podList.Items...)

        if podList.Continue == "" {
            break
        }
        continueToken = podList.Continue
    }

    return allPods, nil
}

// Example usage of pagination with field selectors
func ListRunningPodsOnNode(clientset *kubernetes.Clientset, nodeName string) error {
    lister := NewPaginatedPodLister(clientset, 100)

    // Use field selector to filter server-side
    pods, err := lister.ListPodsWithFilter(
        context.TODO(),
        "",  // All namespaces
        "",  // No label selector
        fmt.Sprintf("spec.nodeName=%s,status.phase=Running", nodeName),
    )
    if err != nil {
        return err
    }

    fmt.Printf("Found %d running pods on node %s\n", len(pods), nodeName)
    return nil
}
```

## Complete Example: Pod Monitor Controller

This example combines informers, work queues, and proper error handling into a production-ready controller.

```go
package main

import (
    "context"
    "flag"
    "fmt"
    "os"
    "os/signal"
    "path/filepath"
    "syscall"
    "time"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/util/runtime"
    "k8s.io/apimachinery/pkg/util/wait"
    "k8s.io/client-go/informers"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/cache"
    "k8s.io/client-go/tools/clientcmd"
    "k8s.io/client-go/util/workqueue"
    "k8s.io/klog/v2"
)

// PodMonitor watches Pods and alerts on unhealthy states
type PodMonitor struct {
    clientset     *kubernetes.Clientset
    podInformer   cache.SharedIndexInformer
    queue         workqueue.RateLimitingInterface
}

func NewPodMonitor(clientset *kubernetes.Clientset) *PodMonitor {
    factory := informers.NewSharedInformerFactory(clientset, time.Minute*5)
    podInformer := factory.Core().V1().Pods().Informer()

    monitor := &PodMonitor{
        clientset:   clientset,
        podInformer: podInformer,
        queue: workqueue.NewRateLimitingQueue(
            workqueue.DefaultControllerRateLimiter(),
        ),
    }

    podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            monitor.enqueuePod(obj)
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            oldPod := oldObj.(*corev1.Pod)
            newPod := newObj.(*corev1.Pod)
            if oldPod.ResourceVersion != newPod.ResourceVersion {
                monitor.enqueuePod(newObj)
            }
        },
        DeleteFunc: func(obj interface{}) {
            monitor.enqueuePod(obj)
        },
    })

    return monitor
}

func (m *PodMonitor) enqueuePod(obj interface{}) {
    var key string
    var err error

    // Handle tombstone objects for delete events
    if _, ok := obj.(cache.DeletedFinalStateUnknown); ok {
        key, err = cache.DeletionHandlingMetaNamespaceKeyFunc(obj)
    } else {
        key, err = cache.MetaNamespaceKeyFunc(obj)
    }

    if err != nil {
        runtime.HandleError(err)
        return
    }

    m.queue.Add(key)
}

func (m *PodMonitor) Run(ctx context.Context, workers int) {
    defer runtime.HandleCrash()
    defer m.queue.ShutDown()

    klog.Info("Starting PodMonitor")

    // Start informer
    go m.podInformer.Run(ctx.Done())

    // Wait for cache sync
    klog.Info("Waiting for informer cache to sync")
    if !cache.WaitForCacheSync(ctx.Done(), m.podInformer.HasSynced) {
        klog.Fatal("Failed to sync informer cache")
    }

    klog.Info("Starting workers")
    for i := 0; i < workers; i++ {
        go wait.UntilWithContext(ctx, m.worker, time.Second)
    }

    <-ctx.Done()
    klog.Info("Shutting down PodMonitor")
}

func (m *PodMonitor) worker(ctx context.Context) {
    for m.processNext(ctx) {
    }
}

func (m *PodMonitor) processNext(ctx context.Context) bool {
    obj, shutdown := m.queue.Get()
    if shutdown {
        return false
    }
    defer m.queue.Done(obj)

    key := obj.(string)
    if err := m.sync(ctx, key); err != nil {
        if m.queue.NumRequeues(obj) < 5 {
            klog.Warningf("Error syncing %s, requeuing: %v", key, err)
            m.queue.AddRateLimited(obj)
            return true
        }
        klog.Errorf("Dropping %s after max retries: %v", key, err)
    }

    m.queue.Forget(obj)
    return true
}

func (m *PodMonitor) sync(ctx context.Context, key string) error {
    namespace, name, err := cache.SplitMetaNamespaceKey(key)
    if err != nil {
        return err
    }

    obj, exists, err := m.podInformer.GetIndexer().GetByKey(key)
    if err != nil {
        return err
    }

    if !exists {
        klog.Infof("Pod deleted: %s/%s", namespace, name)
        return nil
    }

    pod := obj.(*corev1.Pod)

    // Check for unhealthy pod conditions
    m.checkPodHealth(pod)

    return nil
}

func (m *PodMonitor) checkPodHealth(pod *corev1.Pod) {
    // Check for crash loops
    for _, cs := range pod.Status.ContainerStatuses {
        if cs.RestartCount > 5 {
            klog.Warningf("ALERT: Pod %s/%s container %s has restarted %d times",
                pod.Namespace, pod.Name, cs.Name, cs.RestartCount)
        }

        if cs.State.Waiting != nil && cs.State.Waiting.Reason == "CrashLoopBackOff" {
            klog.Warningf("ALERT: Pod %s/%s is in CrashLoopBackOff",
                pod.Namespace, pod.Name)
        }
    }

    // Check for pending pods
    if pod.Status.Phase == corev1.PodPending {
        age := time.Since(pod.CreationTimestamp.Time)
        if age > 5*time.Minute {
            klog.Warningf("ALERT: Pod %s/%s has been pending for %v",
                pod.Namespace, pod.Name, age)
        }
    }
}

func main() {
    klog.InitFlags(nil)
    flag.Parse()

    // Build kubeconfig
    kubeconfig := filepath.Join(os.Getenv("HOME"), ".kube", "config")
    config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
    if err != nil {
        klog.Fatalf("Error building kubeconfig: %v", err)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        klog.Fatalf("Error creating clientset: %v", err)
    }

    // Create and run the monitor
    monitor := NewPodMonitor(clientset)

    // Handle shutdown signals
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    go func() {
        <-sigCh
        klog.Info("Received shutdown signal")
        cancel()
    }()

    monitor.Run(ctx, 2)
}
```

## Best Practices

### Error Handling

Always handle errors appropriately and consider transient failures.

```go
import (
    "k8s.io/apimachinery/pkg/api/errors"
)

// Check for specific error types
func handleError(err error) {
    if errors.IsNotFound(err) {
        // Resource doesn't exist - may be expected
        fmt.Println("Resource not found")
    } else if errors.IsConflict(err) {
        // Concurrent modification - retry with updated version
        fmt.Println("Conflict detected, retry needed")
    } else if errors.IsServerTimeout(err) {
        // API server timeout - retry with backoff
        fmt.Println("Server timeout, retrying...")
    } else if errors.IsTooManyRequests(err) {
        // Rate limited - respect backoff
        fmt.Println("Rate limited, backing off")
    }
}
```

### Resource Version Management

Track resource versions to detect changes and avoid update conflicts.

```go
// Store resource version for optimistic concurrency
type CachedResource struct {
    Data            interface{}
    ResourceVersion string
}

// Only process if version changed
func shouldProcess(cached, current string) bool {
    return cached != current
}
```

### Context and Cancellation

Always use contexts for timeout and cancellation support.

```go
// Use context with timeout for operations
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

pods, err := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
if err != nil {
    if ctx.Err() == context.DeadlineExceeded {
        fmt.Println("Operation timed out")
    }
    return err
}
```

## Conclusion

The `client-go` library provides everything needed to build robust Kubernetes automation tools. Key takeaways:

1. **Use the right configuration** - In-cluster for pods, kubeconfig for external tools
2. **Leverage informers** - They reduce API server load through local caching
3. **Implement work queues** - For reliable event processing with retry logic
4. **Paginate large lists** - Prevent memory issues and API timeouts
5. **Handle errors properly** - Use the `errors` package to detect specific failure modes
6. **Use contexts everywhere** - Enable timeout and cancellation support

With these patterns, you can build controllers, operators, and automation tools that interact reliably with Kubernetes clusters at scale.

## Additional Resources

- [Official client-go Documentation](https://pkg.go.dev/k8s.io/client-go)
- [Sample Controller](https://github.com/kubernetes/sample-controller) - Reference implementation
- [Kubernetes API Conventions](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md)
- [Controller Runtime](https://github.com/kubernetes-sigs/controller-runtime) - Higher-level abstractions for building operators
