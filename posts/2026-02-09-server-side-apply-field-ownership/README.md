# How to Use Server-Side Apply to Manage Field Ownership in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Server-Side Apply, Field Management

Description: Learn how to use server-side apply to track and manage field ownership in Kubernetes, enabling multiple controllers and users to safely modify different parts of the same resource.

---

When multiple controllers or users modify the same Kubernetes resource, conflicts occur. Server-side apply solves this by tracking which manager owns each field. You specify only the fields you care about, and Kubernetes merges your changes with existing data while preserving fields owned by other managers.

This granular field ownership prevents conflicts, makes controllers more reliable, and enables safe collaboration between multiple automation systems managing the same resources.

## Traditional Update vs Server-Side Apply

Traditional client-side updates (kubectl apply) use a three-way merge based on annotations. Server-side apply tracks ownership directly in the resource metadata, providing accurate field-level conflict detection.

Client-side apply:

```bash
# Creates/updates with client-side logic
kubectl apply -f deployment.yaml
```

Server-side apply:

```bash
# Creates/updates with server-side tracking
kubectl apply -f deployment.yaml --server-side
```

## Field Manager Identity

Every server-side apply requires a field manager name that identifies who owns the fields:

```bash
# Apply with explicit field manager
kubectl apply -f deployment.yaml \
  --server-side \
  --field-manager=kubectl-client-side-apply
```

In Go code:

```go
import (
    "context"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func applyResource(ctx context.Context, k8sClient client.Client, obj client.Object) error {
    return k8sClient.Patch(ctx, obj, client.Apply, &client.PatchOptions{
        FieldManager: "my-controller",
    })
}
```

## Viewing Field Ownership

Check which manager owns which fields:

```bash
kubectl get deployment webapp -o yaml
```

Look for the `managedFields` section:

```yaml
metadata:
  managedFields:
  - apiVersion: apps/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        f:replicas: {}
        f:template:
          f:spec:
            f:containers:
              k:{"name":"nginx"}:
                f:image: {}
    manager: kubectl-client-side-apply
    operation: Update
    time: "2026-02-09T10:00:00Z"
  - apiVersion: apps/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:labels:
          f:environment: {}
      f:spec:
        f:template:
          f:metadata:
            f:labels:
              f:version: {}
    manager: my-controller
    operation: Apply
    time: "2026-02-09T10:05:00Z"
```

This shows kubectl owns replicas and image, while my-controller owns labels.

## Basic Server-Side Apply Example

Apply only the fields you want to manage:

```go
package main

import (
    "context"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func updateDeploymentImage(ctx context.Context, k8sClient client.Client) error {
    // Specify only the fields you manage
    deployment := &appsv1.Deployment{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Template: corev1.PodTemplateSpec{
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "nginx",
                            Image: "nginx:1.22",  // Only updating image
                        },
                    },
                },
            },
        },
    }

    // Apply with your field manager name
    return k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "image-updater",
    })
}
```

This takes ownership of the image field without touching replicas, resources, or other fields.

## Multiple Managers on Same Resource

Different managers can own different fields:

```go
// Manager 1: Manages replicas
func scaleDeployment(ctx context.Context, k8sClient client.Client, replicas int32) error {
    deployment := &appsv1.Deployment{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &replicas,
        },
    }

    return k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "autoscaler",
    })
}

// Manager 2: Manages image
func updateImage(ctx context.Context, k8sClient client.Client, image string) error {
    deployment := &appsv1.Deployment{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Template: corev1.PodTemplateSpec{
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "nginx",
                            Image: image,
                        },
                    },
                },
            },
        },
    }

    return k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "image-updater",
    })
}
```

Both managers can update the same Deployment without conflicts because they own different fields.

## Handling Ownership Conflicts

When you try to modify a field owned by another manager, you get a conflict error:

```go
func tryTakeOwnership(ctx context.Context, k8sClient client.Client) error {
    deployment := &appsv1.Deployment{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: ptr.To(int32(5)),  // autoscaler owns this
        },
    }

    err := k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "manual-scaler",
    })

    if err != nil {
        // Conflict error: field is managed by another manager
        return err
    }

    return nil
}
```

Force take ownership if necessary:

```go
func forceTakeOwnership(ctx context.Context, k8sClient client.Client) error {
    deployment := &appsv1.Deployment{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: ptr.To(int32(5)),
        },
    }

    return k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "manual-scaler",
        Force:        ptr.To(true),  // Force take ownership
    })
}
```

Use `Force` cautiously, as it overrides the other manager's ownership.

## Partial Updates

Update only specific fields without full resource specification:

```go
func addLabel(ctx context.Context, k8sClient client.Client) error {
    deployment := &appsv1.Deployment{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
            Labels: map[string]string{
                "managed-by": "my-controller",
            },
        },
    }

    // Only manages labels, doesn't touch spec
    return k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "label-manager",
    })
}
```

## Removing Fields

Remove fields by omitting them from your apply:

```go
func removeLabel(ctx context.Context, k8sClient client.Client) error {
    deployment := &appsv1.Deployment{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
            Labels: map[string]string{
                "app": "webapp",
                // Omit "managed-by" label to remove it
            },
        },
    }

    return k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "label-manager",
    })
}
```

Fields you own that aren't in your apply are removed.

## Managing Arrays

Server-side apply handles arrays intelligently using merge keys:

```go
func addContainer(ctx context.Context, k8sClient client.Client) error {
    deployment := &appsv1.Deployment{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Template: corev1.PodTemplateSpec{
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "sidecar",  // Merge key
                            Image: "sidecar:latest",
                        },
                    },
                },
            },
        },
    }

    // Adds sidecar container without removing existing containers
    return k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "sidecar-injector",
    })
}
```

The `name` field is the merge key for containers, so this adds a sidecar without affecting other containers.

## Checking Field Ownership Programmatically

Query field ownership:

```go
func getFieldOwner(ctx context.Context, k8sClient client.Client, fieldPath string) (string, error) {
    deployment := &appsv1.Deployment{}
    err := k8sClient.Get(ctx, client.ObjectKey{
        Name:      "webapp",
        Namespace: "default",
    }, deployment)
    if err != nil {
        return "", err
    }

    // Parse managedFields
    for _, mf := range deployment.ManagedFields {
        // Check if this manager owns the field
        // This requires parsing FieldsV1 which is complex
        // In practice, use kubectl or admission controllers for this
    }

    return "", nil
}
```

## Server-Side Apply with kubectl

Use kubectl with server-side apply:

```bash
# Apply with server-side
kubectl apply -f deployment.yaml --server-side

# Specify field manager
kubectl apply -f deployment.yaml \
  --server-side \
  --field-manager=my-automation

# Force take ownership
kubectl apply -f deployment.yaml \
  --server-side \
  --field-manager=my-automation \
  --force-conflicts
```

## Combining with Dry Run

Test server-side apply without persisting:

```go
func dryRunApply(ctx context.Context, k8sClient client.Client) error {
    deployment := &appsv1.Deployment{
        // ... deployment spec
    }

    return k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "my-controller",
        DryRun:       []string{metav1.DryRunAll},
    })
}
```

This validates the apply without making changes.

## Best Practices

Choose descriptive field manager names that identify the component (e.g., "autoscaler", "image-updater", not "controller" or "automation").

Only specify fields you actively manage. Don't include read-only fields or fields other components own.

Handle conflicts gracefully by logging and alerting rather than forcing ownership.

Use consistent field managers across your codebase. Don't use different managers for the same logical component.

Test server-side apply behavior thoroughly, especially when multiple managers operate on the same resources.

## Monitoring Field Ownership

Track field ownership changes:

```go
func logFieldOwnershipChanges(oldObj, newObj *appsv1.Deployment) {
    oldManagers := make(map[string]bool)
    for _, mf := range oldObj.ManagedFields {
        oldManagers[mf.Manager] = true
    }

    for _, mf := range newObj.ManagedFields {
        if !oldManagers[mf.Manager] {
            log.Printf("New field manager: %s", mf.Manager)
        }
    }
}
```

Server-side apply with field ownership tracking enables safe collaboration between multiple controllers and automation systems, preventing conflicts and making resource management more predictable and reliable.
