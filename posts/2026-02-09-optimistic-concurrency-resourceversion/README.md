# How to Handle Optimistic Concurrency with ResourceVersion in Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, Concurrency

Description: Learn how to use ResourceVersion for optimistic concurrency control in Kubernetes to prevent lost updates and race conditions when multiple clients modify the same resources.

---

When multiple controllers or users modify the same Kubernetes resource simultaneously, you risk lost updates where one change overwrites another. Kubernetes uses optimistic concurrency control through the `resourceVersion` field to prevent this, ensuring that updates only succeed when based on the current state of the resource.

## The Lost Update Problem

Imagine two operators trying to update the same Deployment:

1. Operator A reads the Deployment (replicas: 3)
2. Operator B reads the same Deployment (replicas: 3)
3. Operator A updates replicas to 5
4. Operator B updates replicas to 2

Without concurrency control, Operator B's update would overwrite Operator A's change, leaving replicas at 2 instead of reflecting both intentions.

## How ResourceVersion Works

Every Kubernetes resource has a `resourceVersion` field in its metadata. This field is:

- A string representing the internal version of the resource
- Updated every time the resource changes
- Used by the API server to detect conflicts

When you update a resource, Kubernetes checks if the `resourceVersion` in your update matches the current version in etcd. If they match, the update proceeds. If not, you get a conflict error.

```bash
# View resourceVersion in any resource
kubectl get deployment nginx -o yaml | grep resourceVersion

# Output:
# resourceVersion: "123456"
```

## Update Flow with Optimistic Concurrency

The typical update flow looks like this:

```go
package main

import (
    "context"
    "fmt"
    "log"

    appsv1 "k8s.io/api/apps/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func updateDeploymentWithConcurrencyControl(clientset *kubernetes.Clientset) error {
    namespace := "default"
    name := "nginx"

    // Step 1: Read the current resource
    deployment, err := clientset.AppsV1().Deployments(namespace).Get(
        context.TODO(),
        name,
        metav1.GetOptions{},
    )
    if err != nil {
        return fmt.Errorf("failed to get deployment: %v", err)
    }

    // Note the current resourceVersion
    fmt.Printf("Current resourceVersion: %s\n", deployment.ResourceVersion)

    // Step 2: Modify the resource
    deployment.Spec.Replicas = int32Ptr(5)

    // Step 3: Update with the resourceVersion
    // If another client modified this deployment, this will fail
    updatedDeployment, err := clientset.AppsV1().Deployments(namespace).Update(
        context.TODO(),
        deployment,
        metav1.UpdateOptions{},
    )
    if err != nil {
        return fmt.Errorf("failed to update deployment: %v", err)
    }

    fmt.Printf("Updated resourceVersion: %s\n", updatedDeployment.ResourceVersion)
    return nil
}

func int32Ptr(i int32) *int32 {
    return &i
}
```

If another client modifies the deployment between the `Get` and `Update` calls, the update fails with a conflict error.

## Handling Conflict Errors

When a conflict occurs, you receive an error indicating the resourceVersion mismatch:

```go
import (
    "k8s.io/apimachinery/pkg/api/errors"
)

func updateWithRetry(clientset *kubernetes.Clientset) error {
    namespace := "default"
    name := "nginx"

    maxRetries := 5
    for attempt := 0; attempt < maxRetries; attempt++ {
        // Get current resource
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return err
        }

        // Modify the resource
        deployment.Spec.Replicas = int32Ptr(5)

        // Attempt to update
        _, err = clientset.AppsV1().Deployments(namespace).Update(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )

        if err == nil {
            fmt.Println("Update succeeded")
            return nil
        }

        // Check if it is a conflict error
        if errors.IsConflict(err) {
            fmt.Printf("Conflict detected (attempt %d/%d), retrying...\n", attempt+1, maxRetries)
            continue
        }

        // Some other error occurred
        return err
    }

    return fmt.Errorf("failed to update after %d attempts", maxRetries)
}
```

This retry pattern is essential for robust controllers that handle concurrent modifications.

## Using RetryOnConflict Helper

Kubernetes client-go provides a helper function for this common pattern:

```go
import (
    "k8s.io/client-go/util/retry"
)

func updateWithHelper(clientset *kubernetes.Clientset) error {
    namespace := "default"
    name := "nginx"

    // RetryOnConflict automatically handles the retry loop
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

    fmt.Println("Update succeeded")
    return nil
}
```

This is cleaner and follows best practices for exponential backoff.

## Server-Side Apply and ResourceVersion

Server-Side Apply takes a different approach. Instead of requiring exact resourceVersion matches, it uses field ownership tracking:

```go
import (
    corev1 "k8s.io/api/core/v1"
)

func applyWithServerSide(clientset *kubernetes.Clientset) error {
    deployment := &appsv1.Deployment{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "nginx",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: int32Ptr(5),
            Selector: &metav1.LabelSelector{
                MatchLabels: map[string]string{"app": "nginx"},
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: map[string]string{"app": "nginx"},
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "nginx",
                            Image: "nginx:1.21",
                        },
                    },
                },
            },
        },
    }

    applyOptions := metav1.ApplyOptions{
        FieldManager: "my-controller",
        Force:        false, // Respect field ownership
    }

    _, err := clientset.AppsV1().Deployments("default").Apply(
        context.TODO(),
        deployment,
        applyOptions,
    )

    return err
}
```

Server-Side Apply still uses resourceVersion internally but manages conflicts differently through field ownership.

## Status Subresource Updates

Many resources have a separate status subresource that should be updated independently:

```go
func updateDeploymentStatus(clientset *kubernetes.Clientset) error {
    namespace := "default"
    name := "nginx"

    // Use RetryOnConflict for status updates too
    err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return err
        }

        // Modify status
        deployment.Status.AvailableReplicas = 5
        deployment.Status.ReadyReplicas = 5

        // Update status subresource
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

The status subresource has its own resourceVersion tracking, separate from the main spec.

## Patch Operations and ResourceVersion

Patch operations can optionally include resourceVersion for safety:

```bash
# JSON Patch without resourceVersion check (risky)
kubectl patch deployment nginx --type=json -p '[{"op":"replace","path":"/spec/replicas","value":5}]'

# Strategic Merge Patch with resourceVersion
kubectl patch deployment nginx --type=strategic -p '{"metadata":{"resourceVersion":"123456"},"spec":{"replicas":5}}'
```

In Go:

```go
import (
    "k8s.io/apimachinery/pkg/types"
)

func patchWithVersionCheck(clientset *kubernetes.Clientset) error {
    namespace := "default"
    name := "nginx"

    // First, get the current resourceVersion
    deployment, err := clientset.AppsV1().Deployments(namespace).Get(
        context.TODO(),
        name,
        metav1.GetOptions{},
    )
    if err != nil {
        return err
    }

    // Create a patch that includes the resourceVersion
    patch := []byte(fmt.Sprintf(`{
        "metadata": {
            "resourceVersion": "%s"
        },
        "spec": {
            "replicas": 5
        }
    }`, deployment.ResourceVersion))

    _, err = clientset.AppsV1().Deployments(namespace).Patch(
        context.TODO(),
        name,
        types.StrategicMergePatchType,
        patch,
        metav1.PatchOptions{},
    )

    return err
}
```

## Watch and ResourceVersion

The watch API uses resourceVersion to resume watching from a specific point:

```go
import (
    "k8s.io/apimachinery/pkg/watch"
)

func watchDeployments(clientset *kubernetes.Clientset, startVersion string) error {
    watcher, err := clientset.AppsV1().Deployments("default").Watch(
        context.TODO(),
        metav1.ListOptions{
            ResourceVersion: startVersion, // Start watching from this version
        },
    )
    if err != nil {
        return err
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        deployment := event.Object.(*appsv1.Deployment)
        fmt.Printf("Event: %s, ResourceVersion: %s\n",
            event.Type,
            deployment.ResourceVersion,
        )
    }

    return nil
}
```

This allows you to resume watching after a connection interruption without missing events.

## Best Practices

1. **Always use retry logic**: Wrap update operations in retry loops to handle conflicts gracefully

2. **Use RetryOnConflict**: Leverage the built-in retry helper instead of writing your own

3. **Do not manipulate resourceVersion**: Never set or modify resourceVersion manually; let the API server manage it

4. **Separate spec and status updates**: Use the status subresource for status changes to avoid conflicts with spec updates

5. **Consider Server-Side Apply**: For complex updates involving multiple fields, Server-Side Apply provides better conflict resolution

6. **Handle non-conflict errors differently**: Not all update errors are conflicts; check the error type before retrying

## Common Pitfalls

**Setting resourceVersion to empty string**: This tells Kubernetes to ignore version checking, which defeats optimistic concurrency:

```go
// DO NOT do this
deployment.ResourceVersion = ""
```

**Infinite retry loops**: Always limit retry attempts to avoid infinite loops:

```go
// Bad: no limit
for {
    if err := tryUpdate(); err == nil {
        break
    }
}

// Good: limited retries
for i := 0; i < 10; i++ {
    if err := tryUpdate(); err == nil {
        break
    }
}
```

**Ignoring conflict errors**: If you do not handle conflicts, your updates will silently fail.

## Conclusion

ResourceVersion-based optimistic concurrency control is fundamental to safe resource updates in Kubernetes. By reading the current state, modifying it, and updating with the resourceVersion, you ensure that your changes are based on the latest data and do not overwrite concurrent modifications. Implement robust retry logic using the RetryOnConflict helper, and your controllers will handle concurrent updates gracefully without lost changes or race conditions.
