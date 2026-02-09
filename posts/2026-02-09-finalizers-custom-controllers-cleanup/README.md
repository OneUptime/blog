# How to Use Finalizers in Custom Controllers for Cleanup Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Controllers, Finalizers, Cleanup

Description: Learn how to implement finalizers in Kubernetes controllers to perform cleanup operations before resources are deleted from etcd.

---

When someone deletes a Pod, Kubernetes removes it from etcd immediately. This works for built-in resources because Kubernetes knows how to clean them up. But what about your custom resources that provision external resources like cloud storage buckets, database instances, or DNS records?

Finalizers let you run cleanup logic before deletion. Kubernetes marks the resource for deletion but doesn't remove it from etcd until your controller removes its finalizer. This guarantees your cleanup code runs before the resource disappears. This guide shows you how to use finalizers correctly.

## Understanding Finalizers

A finalizer is just a string in the resource's metadata.finalizers list. When someone tries to delete a resource with finalizers, Kubernetes sets the deletionTimestamp but keeps the resource in etcd. Your controller detects the timestamp, runs cleanup, and removes its finalizer. Only when all finalizers are gone does Kubernetes actually delete the resource.

This pattern ensures cleanup happens reliably even if your controller is down when the resource is deleted. The resource waits in the deleting state until your controller comes back online.

## Adding Finalizers

Add a finalizer when creating or first reconciling a resource.

```go
package main

import (
    "context"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

const finalizerName = "myresource.example.com/finalizer"

type MyReconciler struct {
    client.Client
}

func (r *MyReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    var resource MyResource
    if err := r.Get(ctx, req.NamespacedName, &resource); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Add finalizer if not present
    if !containsString(resource.Finalizers, finalizerName) {
        resource.Finalizers = append(resource.Finalizers, finalizerName)
        if err := r.Update(ctx, &resource); err != nil {
            logger.Error(err, "Failed to add finalizer")
            return ctrl.Result{}, err
        }
        logger.Info("Finalizer added")
    }

    // Regular reconciliation logic
    return ctrl.Result{}, nil
}

func containsString(slice []string, s string) bool {
    for _, item := range slice {
        if item == s {
            return true
        }
    }
    return false
}
```

## Implementing Cleanup Logic

Check for deletion timestamp and run cleanup before removing the finalizer.

```go
func (r *MyReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    var resource MyResource
    if err := r.Get(ctx, req.NamespacedName, &resource); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Check if resource is being deleted
    if !resource.DeletionTimestamp.IsZero() {
        if containsString(resource.Finalizers, finalizerName) {
            // Run cleanup logic
            logger.Info("Running finalizer cleanup")
            if err := r.cleanupExternalResources(ctx, &resource); err != nil {
                logger.Error(err, "Cleanup failed, will retry")
                return ctrl.Result{}, err
            }

            // Remove finalizer
            resource.Finalizers = removeString(resource.Finalizers, finalizerName)
            if err := r.Update(ctx, &resource); err != nil {
                logger.Error(err, "Failed to remove finalizer")
                return ctrl.Result{}, err
            }

            logger.Info("Finalizer removed, resource will be deleted")
        }
        return ctrl.Result{}, nil
    }

    // Add finalizer if not present
    if !containsString(resource.Finalizers, finalizerName) {
        resource.Finalizers = append(resource.Finalizers, finalizerName)
        if err := r.Update(ctx, &resource); err != nil {
            return ctrl.Result{}, err
        }
    }

    // Regular reconciliation
    return ctrl.Result{}, r.reconcileNormal(ctx, &resource)
}

func (r *MyReconciler) cleanupExternalResources(ctx context.Context, resource *MyResource) error {
    logger := log.FromContext(ctx)

    // Delete S3 bucket
    if resource.Spec.BucketName != "" {
        logger.Info("Deleting S3 bucket", "bucket", resource.Spec.BucketName)
        if err := deleteS3Bucket(resource.Spec.BucketName); err != nil {
            return fmt.Errorf("failed to delete S3 bucket: %w", err)
        }
    }

    // Remove database
    if resource.Spec.DatabaseID != "" {
        logger.Info("Deleting database", "id", resource.Spec.DatabaseID)
        if err := deleteDatabase(resource.Spec.DatabaseID); err != nil {
            return fmt.Errorf("failed to delete database: %w", err)
        }
    }

    // Remove DNS records
    if resource.Spec.DNSName != "" {
        logger.Info("Deleting DNS record", "name", resource.Spec.DNSName)
        if err := deleteDNSRecord(resource.Spec.DNSName); err != nil {
            return fmt.Errorf("failed to delete DNS record: %w", err)
        }
    }

    logger.Info("All external resources cleaned up")
    return nil
}

func removeString(slice []string, s string) []string {
    result := []string{}
    for _, item := range slice {
        if item != s {
            result = append(result, item)
        }
    }
    return result
}
```

## Handling Cleanup Failures

Cleanup can fail. Handle retries gracefully.

```go
func (r *MyReconciler) cleanupExternalResources(ctx context.Context, resource *MyResource) error {
    logger := log.FromContext(ctx)

    // Track cleanup errors
    var errors []error

    // Try to clean up each resource
    if resource.Spec.BucketName != "" {
        if err := deleteS3Bucket(resource.Spec.BucketName); err != nil {
            logger.Error(err, "Failed to delete bucket", "bucket", resource.Spec.BucketName)
            errors = append(errors, err)
        }
    }

    if resource.Spec.DatabaseID != "" {
        if err := deleteDatabase(resource.Spec.DatabaseID); err != nil {
            logger.Error(err, "Failed to delete database", "id", resource.Spec.DatabaseID)
            errors = append(errors, err)
        }
    }

    // If any cleanup failed, return error to retry
    if len(errors) > 0 {
        return fmt.Errorf("cleanup failed: %d errors", len(errors))
    }

    return nil
}
```

## Using Multiple Finalizers

Different controllers can add their own finalizers.

```go
const (
    storageFinalizerName  = "storage.example.com/finalizer"
    networkFinalizerName  = "network.example.com/finalizer"
    databaseFinalizerName = "database.example.com/finalizer"
)

type MultiFinalizerReconciler struct {
    client.Client
}

func (r *MultiFinalizerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var resource MyResource
    if err := r.Get(ctx, req.NamespacedName, &resource); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Handle deletion
    if !resource.DeletionTimestamp.IsZero() {
        // Cleanup storage
        if containsString(resource.Finalizers, storageFinalizerName) {
            if err := r.cleanupStorage(ctx, &resource); err != nil {
                return ctrl.Result{}, err
            }
            resource.Finalizers = removeString(resource.Finalizers, storageFinalizerName)
        }

        // Cleanup network
        if containsString(resource.Finalizers, networkFinalizerName) {
            if err := r.cleanupNetwork(ctx, &resource); err != nil {
                return ctrl.Result{}, err
            }
            resource.Finalizers = removeString(resource.Finalizers, networkFinalizerName)
        }

        // Cleanup database
        if containsString(resource.Finalizers, databaseFinalizerName) {
            if err := r.cleanupDatabase(ctx, &resource); err != nil {
                return ctrl.Result{}, err
            }
            resource.Finalizers = removeString(resource.Finalizers, databaseFinalizerName)
        }

        // Update resource to remove finalizers
        if err := r.Update(ctx, &resource); err != nil {
            return ctrl.Result{}, err
        }

        return ctrl.Result{}, nil
    }

    // Add all finalizers
    needsUpdate := false
    if !containsString(resource.Finalizers, storageFinalizerName) {
        resource.Finalizers = append(resource.Finalizers, storageFinalizerName)
        needsUpdate = true
    }
    if !containsString(resource.Finalizers, networkFinalizerName) {
        resource.Finalizers = append(resource.Finalizers, networkFinalizerName)
        needsUpdate = true
    }
    if !containsString(resource.Finalizers, databaseFinalizerName) {
        resource.Finalizers = append(resource.Finalizers, databaseFinalizerName)
        needsUpdate = true
    }

    if needsUpdate {
        if err := r.Update(ctx, &resource); err != nil {
            return ctrl.Result{}, err
        }
    }

    return ctrl.Result{}, nil
}
```

## Finalizer for Owned Resources

Use finalizers to cleanup resources owned by your custom resource.

```go
func (r *MyReconciler) cleanupOwnedResources(ctx context.Context, resource *MyResource) error {
    logger := log.FromContext(ctx)

    // Delete owned Deployments
    var deployments appsv1.DeploymentList
    if err := r.List(ctx, &deployments, client.InNamespace(resource.Namespace),
        client.MatchingLabels{"app": resource.Name}); err != nil {
        return err
    }

    for _, deployment := range deployments.Items {
        logger.Info("Deleting owned Deployment", "name", deployment.Name)
        if err := r.Delete(ctx, &deployment); err != nil {
            return err
        }
    }

    // Delete owned Services
    var services corev1.ServiceList
    if err := r.List(ctx, &services, client.InNamespace(resource.Namespace),
        client.MatchingLabels{"app": resource.Name}); err != nil {
        return err
    }

    for _, service := range services.Items {
        logger.Info("Deleting owned Service", "name", service.Name)
        if err := r.Delete(ctx, &service); err != nil {
            return err
        }
    }

    return nil
}
```

## Timeout for Cleanup

Set a maximum time for cleanup operations.

```go
func (r *MyReconciler) cleanupWithTimeout(ctx context.Context, resource *MyResource) error {
    // Create context with timeout
    cleanupCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
    defer cancel()

    // Run cleanup with timeout
    done := make(chan error, 1)
    go func() {
        done <- r.cleanupExternalResources(cleanupCtx, resource)
    }()

    select {
    case err := <-done:
        return err
    case <-cleanupCtx.Done():
        return fmt.Errorf("cleanup timeout exceeded")
    }
}
```

## Best Practices

Add finalizers early in the resource lifecycle, ideally during creation or first reconciliation.

Use descriptive finalizer names with your domain. This prevents conflicts with other controllers.

Make cleanup idempotent. It might run multiple times if the controller restarts during cleanup.

Log cleanup operations thoroughly. Debugging finalizer issues requires good logs.

Handle cleanup failures gracefully. Don't remove the finalizer until cleanup succeeds.

Set reasonable timeouts for cleanup operations. External API calls can hang.

Test deletion scenarios thoroughly. Finalizer bugs can leave resources stuck in deleting state forever.

## Conclusion

Finalizers provide reliable cleanup semantics for custom resources. They guarantee your cleanup logic runs before resources are removed from etcd, even if your controller is temporarily unavailable.

Use finalizers whenever your custom resources provision external resources. Implement idempotent cleanup logic with proper error handling. Test deletion scenarios to ensure finalizers work correctly.

Finalizers transform custom resources from simple data structures into complete abstractions that properly manage their entire lifecycle including cleanup.
