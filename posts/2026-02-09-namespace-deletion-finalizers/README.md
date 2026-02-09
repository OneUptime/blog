# How to Use Namespace Deletion Finalizers for Cleanup Hooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Namespaces, Finalizers

Description: Learn how to implement namespace deletion finalizers in Kubernetes to ensure proper cleanup of external resources and dependencies before namespace removal.

---

Namespace deletion in Kubernetes is typically a straightforward operation, but what happens when you need to clean up external resources, notify external systems, or ensure proper decommissioning of services before a namespace is removed? This is where namespace deletion finalizers become invaluable.

Finalizers are a mechanism in Kubernetes that prevent resource deletion until specific cleanup tasks are completed. When applied to namespaces, they give you powerful hooks to implement custom cleanup logic that runs before the namespace is actually deleted.

## Understanding Namespace Finalizers

A finalizer is a string value stored in the metadata.finalizers array of a Kubernetes resource. When you delete a resource that has finalizers, Kubernetes marks it for deletion by setting the deletionTimestamp but keeps it in the cluster until all finalizers are removed.

For namespaces, this means you can intercept the deletion process and perform cleanup operations before the namespace and all its contained resources are actually removed.

## Common Use Cases for Namespace Finalizers

You might want to use namespace deletion finalizers when:

- Cleaning up external resources like cloud storage buckets or databases
- Notifying external systems about namespace decommissioning
- Backing up critical data before removal
- Revoking external API credentials or tokens
- Removing DNS records or external load balancer configurations
- Ensuring graceful shutdown of stateful applications

## Implementing a Simple Namespace Finalizer Controller

Let's build a controller that watches for namespace deletions and performs cleanup tasks. Here's a complete example using the Kubernetes client-go library:

```go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/cache"
    "k8s.io/client-go/informers"
)

const (
    finalizerName = "cleanup.example.com/namespace-cleanup"
)

type NamespaceCleanupController struct {
    clientset *kubernetes.Clientset
}

// NewNamespaceCleanupController creates a new controller instance
func NewNamespaceCleanupController() (*NamespaceCleanupController, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &NamespaceCleanupController{
        clientset: clientset,
    }, nil
}

// Run starts the controller
func (c *NamespaceCleanupController) Run(ctx context.Context) error {
    factory := informers.NewSharedInformerFactory(c.clientset, time.Minute*5)
    nsInformer := factory.Core().V1().Namespaces()

    // Add event handler for namespace updates
    nsInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        UpdateFunc: func(old, new interface{}) {
            ns := new.(*corev1.Namespace)
            c.handleNamespaceUpdate(ctx, ns)
        },
    })

    factory.Start(ctx.Done())
    factory.WaitForCacheSync(ctx.Done())

    <-ctx.Done()
    return nil
}

// handleNamespaceUpdate processes namespace update events
func (c *NamespaceCleanupController) handleNamespaceUpdate(ctx context.Context, ns *corev1.Namespace) {
    // Check if namespace is being deleted
    if ns.DeletionTimestamp.IsZero() {
        // Namespace is not being deleted, ensure our finalizer is present
        c.ensureFinalizerPresent(ctx, ns)
        return
    }

    // Namespace is being deleted, check if our finalizer is present
    if !c.hasOurFinalizer(ns) {
        return
    }

    // Perform cleanup operations
    if err := c.performCleanup(ctx, ns); err != nil {
        fmt.Printf("Failed to cleanup namespace %s: %v\n", ns.Name, err)
        return
    }

    // Remove our finalizer to allow deletion to proceed
    c.removeFinalizer(ctx, ns)
}

// ensureFinalizerPresent adds our finalizer if it's not already present
func (c *NamespaceCleanupController) ensureFinalizerPresent(ctx context.Context, ns *corev1.Namespace) error {
    if c.hasOurFinalizer(ns) {
        return nil
    }

    // Add our finalizer
    ns.Finalizers = append(ns.Finalizers, finalizerName)
    _, err := c.clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
    if err != nil {
        return fmt.Errorf("failed to add finalizer: %w", err)
    }

    fmt.Printf("Added finalizer to namespace %s\n", ns.Name)
    return nil
}

// hasOurFinalizer checks if our finalizer is present
func (c *NamespaceCleanupController) hasOurFinalizer(ns *corev1.Namespace) bool {
    for _, f := range ns.Finalizers {
        if f == finalizerName {
            return true
        }
    }
    return false
}

// performCleanup executes the actual cleanup logic
func (c *NamespaceCleanupController) performCleanup(ctx context.Context, ns *corev1.Namespace) error {
    fmt.Printf("Starting cleanup for namespace %s\n", ns.Name)

    // Example: Cleanup external resources
    if err := c.cleanupExternalStorage(ctx, ns); err != nil {
        return err
    }

    // Example: Notify external systems
    if err := c.notifyExternalSystems(ctx, ns); err != nil {
        return err
    }

    // Example: Backup critical data
    if err := c.backupNamespaceData(ctx, ns); err != nil {
        return err
    }

    fmt.Printf("Completed cleanup for namespace %s\n", ns.Name)
    return nil
}

// cleanupExternalStorage removes external storage resources
func (c *NamespaceCleanupController) cleanupExternalStorage(ctx context.Context, ns *corev1.Namespace) error {
    // Implement your external storage cleanup logic here
    // For example: delete S3 buckets, cloud storage, etc.
    fmt.Printf("Cleaning up external storage for namespace %s\n", ns.Name)

    // Simulated cleanup
    time.Sleep(time.Second * 2)
    return nil
}

// notifyExternalSystems sends notifications about namespace deletion
func (c *NamespaceCleanupController) notifyExternalSystems(ctx context.Context, ns *corev1.Namespace) error {
    // Implement notification logic here
    // For example: send webhook, update CMDB, etc.
    fmt.Printf("Notifying external systems about namespace %s deletion\n", ns.Name)
    return nil
}

// backupNamespaceData creates a backup before deletion
func (c *NamespaceCleanupController) backupNamespaceData(ctx context.Context, ns *corev1.Namespace) error {
    // Implement backup logic here
    fmt.Printf("Backing up data for namespace %s\n", ns.Name)
    return nil
}

// removeFinalizer removes our finalizer from the namespace
func (c *NamespaceCleanupController) removeFinalizer(ctx context.Context, ns *corev1.Namespace) error {
    // Get the latest version of the namespace
    ns, err := c.clientset.CoreV1().Namespaces().Get(ctx, ns.Name, metav1.GetOptions{})
    if err != nil {
        return fmt.Errorf("failed to get namespace: %w", err)
    }

    // Remove our finalizer
    finalizers := []string{}
    for _, f := range ns.Finalizers {
        if f != finalizerName {
            finalizers = append(finalizers, f)
        }
    }
    ns.Finalizers = finalizers

    _, err = c.clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
    if err != nil {
        return fmt.Errorf("failed to remove finalizer: %w", err)
    }

    fmt.Printf("Removed finalizer from namespace %s\n", ns.Name)
    return nil
}

func main() {
    controller, err := NewNamespaceCleanupController()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    if err := controller.Run(ctx); err != nil {
        panic(err)
    }
}
```

## Deploying the Finalizer Controller

Create a deployment manifest for the controller:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: namespace-cleanup-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-cleanup-controller
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: namespace-cleanup-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: namespace-cleanup-controller
subjects:
- kind: ServiceAccount
  name: namespace-cleanup-controller
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: namespace-cleanup-controller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: namespace-cleanup-controller
  template:
    metadata:
      labels:
        app: namespace-cleanup-controller
    spec:
      serviceAccountName: namespace-cleanup-controller
      containers:
      - name: controller
        image: your-registry/namespace-cleanup-controller:latest
        resources:
          limits:
            memory: "128Mi"
            cpu: "100m"
          requests:
            memory: "64Mi"
            cpu: "50m"
```

## Testing the Finalizer

Create a test namespace and observe the finalizer behavior:

```bash
# Create a test namespace
kubectl create namespace test-finalizer

# Check that the finalizer was added
kubectl get namespace test-finalizer -o yaml | grep finalizers -A 2

# Try to delete the namespace
kubectl delete namespace test-finalizer

# The namespace will be stuck in Terminating state until cleanup completes
kubectl get namespace test-finalizer
```

## Handling Edge Cases

Always implement proper error handling and timeout mechanisms:

```go
func (c *NamespaceCleanupController) performCleanup(ctx context.Context, ns *corev1.Namespace) error {
    // Set a timeout for cleanup operations
    cleanupCtx, cancel := context.WithTimeout(ctx, time.Minute*5)
    defer cancel()

    // Use a channel to coordinate cleanup tasks
    errChan := make(chan error, 3)

    // Run cleanup tasks concurrently
    go func() {
        errChan <- c.cleanupExternalStorage(cleanupCtx, ns)
    }()

    go func() {
        errChan <- c.notifyExternalSystems(cleanupCtx, ns)
    }()

    go func() {
        errChan <- c.backupNamespaceData(cleanupCtx, ns)
    }()

    // Wait for all tasks to complete
    for i := 0; i < 3; i++ {
        if err := <-errChan; err != nil {
            return fmt.Errorf("cleanup task failed: %w", err)
        }
    }

    return nil
}
```

## Best Practices

When implementing namespace deletion finalizers, follow these guidelines:

Use descriptive finalizer names that include your domain (like cleanup.example.com/namespace-cleanup) to avoid conflicts with other controllers.

Implement proper timeout handling to prevent namespaces from being stuck indefinitely in the Terminating state.

Add comprehensive logging to track cleanup progress and debug issues.

Consider making cleanup operations idempotent so they can safely be retried.

Always remove the finalizer after successful cleanup, even if some non-critical operations failed.

Use leader election if running multiple replicas of your controller to prevent duplicate cleanup operations.

## Debugging Stuck Namespaces

If a namespace gets stuck in Terminating state due to finalizer issues:

```bash
# View all finalizers on the namespace
kubectl get namespace stuck-namespace -o json | jq '.metadata.finalizers'

# Manually remove finalizers (use with caution in production)
kubectl patch namespace stuck-namespace -p '{"metadata":{"finalizers":[]}}' --type=merge

# Check for resources that might be blocking deletion
kubectl api-resources --verbs=list --namespaced -o name | xargs -n 1 kubectl get --show-kind --ignore-not-found -n stuck-namespace
```

Namespace deletion finalizers provide a powerful mechanism for ensuring clean resource decommissioning. By implementing proper cleanup hooks, you can maintain consistency between your Kubernetes cluster and external systems, prevent resource leaks, and ensure data is properly backed up before deletion.
