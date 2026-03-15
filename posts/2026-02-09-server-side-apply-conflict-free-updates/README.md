# How to Use Server-Side Apply in Custom Controllers for Conflict-Free Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Server-Side Apply, Controllers

Description: Learn how to use server-side apply in custom controllers to manage field ownership and avoid conflicts when multiple controllers update the same resources.

---

When multiple controllers or users modify the same Kubernetes resource, conflicts can occur. Traditional client-side apply uses a three-way merge that can lose changes when different actors modify different fields. Server-side apply solves this by tracking field ownership at a granular level.

Server-side apply lets each controller own specific fields it manages. When you update a resource, you only need to specify the fields you care about. The API server merges your changes with existing data, preserving fields owned by other actors. This prevents conflicts and makes controllers more reliable.

## How Server-Side Apply Works

Server-side apply tracks which manager owns each field in a resource. When you apply changes, you send only the fields you want to manage. The API server:

1. Validates your changes
2. Checks field ownership
3. Merges your fields with existing data
4. Updates ownership metadata
5. Persists the result

If another manager owns a field you're trying to change, the API server returns a conflict error. You can force override if needed, but this explicit conflict handling prevents accidental overwrites.

## Using Server-Side Apply in Controllers

Here's how to use server-side apply with client-go:

```go
package main

import (
    "context"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/types"
    "k8s.io/client-go/kubernetes"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func updateServiceWithSSA(ctx context.Context, kubeClient kubernetes.Interface) error {
    // Define the desired state (only fields you manage)
    service := &corev1.Service{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "v1",
            Kind:       "Service",
        },
        ObjectMeta: metav1.ObjectMeta{
            Name:      "my-service",
            Namespace: "default",
            Labels: map[string]string{
                "managed-by": "my-controller",
            },
        },
        Spec: corev1.ServiceSpec{
            Selector: map[string]string{
                "app": "myapp",
            },
            Ports: []corev1.ServicePort{
                {
                    Name:     "http",
                    Port:     80,
                    Protocol: corev1.ProtocolTCP,
                },
            },
        },
    }

    // Convert to JSON
    data, err := json.Marshal(service)
    if err != nil {
        return err
    }

    // Apply with field manager name
    _, err = kubeClient.CoreV1().Services("default").Patch(
        ctx,
        "my-service",
        types.ApplyPatchType,
        data,
        metav1.PatchOptions{
            FieldManager: "my-controller",  // Identifies this manager
            Force:        false,             // Don't override other managers
        },
    )

    return err
}
```

The `FieldManager` parameter identifies your controller. All fields you specify become owned by this manager.

## Server-Side Apply with Controller-Runtime

Controller-runtime provides a cleaner API:

```go
import (
    "context"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func reconcileConfigMap(ctx context.Context, k8sClient client.Client) error {
    configMap := &corev1.ConfigMap{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "app-config",
            Namespace: "default",
        },
        Data: map[string]string{
            "log_level": "info",
            "timeout":   "30s",
        },
    }

    // Server-side apply
    err := k8sClient.Patch(ctx, configMap, client.Apply, &client.PatchOptions{
        FieldManager: "config-controller",
    })

    return err
}
```

This automatically handles serialization and applies only the fields you've set.

## Managing Multiple Fields Across Controllers

Different controllers can manage different fields of the same resource:

```go
// Controller A manages ports
func controllerA(ctx context.Context, k8sClient client.Client) error {
    service := &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "shared-service",
            Namespace: "default",
        },
        Spec: corev1.ServiceSpec{
            Ports: []corev1.ServicePort{
                {Name: "http", Port: 80},
                {Name: "https", Port: 443},
            },
        },
    }

    return k8sClient.Patch(ctx, service, client.Apply, &client.PatchOptions{
        FieldManager: "port-controller",
    })
}

// Controller B manages labels
func controllerB(ctx context.Context, k8sClient client.Client) error {
    service := &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "shared-service",
            Namespace: "default",
            Labels: map[string]string{
                "environment": "production",
                "team":        "platform",
            },
        },
    }

    return k8sClient.Patch(ctx, service, client.Apply, &client.PatchOptions{
        FieldManager: "label-controller",
    })
}
```

Both controllers can update the same Service without conflicts. Controller A owns the ports, and Controller B owns the labels.

## Handling Conflicts

When another manager owns a field you're trying to change, you get a conflict error:

```go
func updateWithConflictHandling(ctx context.Context, k8sClient client.Client) error {
    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "app",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: ptr.To(int32(5)),
        },
    }

    err := k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "replica-controller",
    })

    if err != nil {
        if apierrors.IsConflict(err) {
            // Another manager owns the replicas field
            // Option 1: Log and skip
            log.Info("Replicas field owned by another manager, skipping")
            return nil

            // Option 2: Force take ownership (use carefully)
            err = k8sClient.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
                FieldManager: "replica-controller",
                Force:        ptr.To(true),  // Force take ownership
            })
        }
        return err
    }

    return nil
}
```

Use `Force: true` sparingly and only when you're certain your controller should own the field.

## Partial Updates with Server-Side Apply

You don't need to specify all fields. Send only what you manage:

```go
func updateOnlyAnnotations(ctx context.Context, k8sClient client.Client) error {
    pod := &corev1.Pod{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "mypod",
            Namespace: "default",
            Annotations: map[string]string{
                "last-updated": time.Now().Format(time.RFC3339),
                "controller":   "annotation-manager",
            },
        },
    }

    // Only annotations are specified, everything else is untouched
    return k8sClient.Patch(ctx, pod, client.Apply, &client.PatchOptions{
        FieldManager: "annotation-manager",
    })
}
```

This updates only the annotations, leaving spec, labels, and other fields unchanged.

## Cleaning Up Owned Fields

Remove fields by omitting them from your apply:

```go
func removeOwnedLabel(ctx context.Context, k8sClient client.Client) error {
    service := &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "my-service",
            Namespace: "default",
            Labels: map[string]string{
                // Only include labels you want to keep
                "app": "myapp",
                // Omit any labels you want removed
            },
        },
    }

    return k8sClient.Patch(ctx, service, client.Apply, &client.PatchOptions{
        FieldManager: "label-controller",
    })
}
```

Fields owned by your manager that aren't in the apply will be removed.

## Server-Side Apply in Reconcile Loops

Use server-side apply in controller reconciliation:

```go
import (
    "context"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

type AppReconciler struct {
    client.Client
}

func (r *AppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // Fetch the custom resource
    app := &examplev1.Application{}
    if err := r.Get(ctx, req.NamespacedName, app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Create desired Deployment state
    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      app.Name,
            Namespace: app.Namespace,
            Labels: map[string]string{
                "app": app.Name,
            },
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &app.Spec.Replicas,
            Selector: &metav1.LabelSelector{
                MatchLabels: map[string]string{
                    "app": app.Name,
                },
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: map[string]string{
                        "app": app.Name,
                    },
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "app",
                            Image: app.Spec.Image,
                        },
                    },
                },
            },
        },
    }

    // Set owner reference so deployment gets deleted with the app
    if err := ctrl.SetControllerReference(app, deployment, r.Scheme()); err != nil {
        return ctrl.Result{}, err
    }

    // Apply the deployment
    if err := r.Patch(ctx, deployment, client.Apply, &client.PatchOptions{
        FieldManager: "application-controller",
    }); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}
```

This reconcile function creates or updates the deployment using server-side apply, managing all the specified fields.

## Checking Field Ownership

View field ownership metadata:

```bash
kubectl get service my-service -o yaml
```

Look for the `managedFields` section:

```yaml
metadata:
  managedFields:
  - apiVersion: v1
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:labels:
          f:managed-by: {}
      f:spec:
        f:ports: {}
    manager: port-controller
    operation: Apply
    time: "2026-02-09T10:00:00Z"
  - apiVersion: v1
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:labels:
          f:environment: {}
          f:team: {}
    manager: label-controller
    operation: Apply
    time: "2026-02-09T10:05:00Z"
```

This shows which manager owns which fields.

## Migrating from Client-Side to Server-Side Apply

If you have existing controllers using client-side apply (kubectl apply), migrate gradually:

```go
func migrateToSSA(ctx context.Context, k8sClient client.Client) error {
    // Old way: Get, modify, update
    deployment := &appsv1.Deployment{}
    if err := k8sClient.Get(ctx, types.NamespacedName{
        Name:      "app",
        Namespace: "default",
    }, deployment); err != nil {
        return err
    }

    deployment.Spec.Replicas = ptr.To(int32(3))

    if err := k8sClient.Update(ctx, deployment); err != nil {
        return err
    }

    // New way: Just apply desired state
    desiredDeployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "app",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: ptr.To(int32(3)),
        },
    }

    return k8sClient.Patch(ctx, desiredDeployment, client.Apply, &client.PatchOptions{
        FieldManager: "my-controller",
    })
}
```

The server-side apply approach is simpler and safer.

## Best Practices

Choose a unique field manager name that identifies your controller, like "application-controller" or "cert-manager".

Only specify fields your controller actually manages. Don't include read-only fields or fields managed by other components.

Handle conflicts gracefully. Log them for debugging but avoid forcing ownership unless absolutely necessary.

Use server-side apply consistently throughout your controller. Mixing it with Update calls can cause confusion about field ownership.

Server-side apply makes controllers more robust and enables safe collaboration between multiple automation systems managing the same resources.
