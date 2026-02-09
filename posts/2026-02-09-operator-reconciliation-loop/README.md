# Understanding and Implementing the Reconciliation Loop Pattern in Kubernetes Operators

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes Operator, Reconciliation, Controller, Go, Design Pattern

Description: A deep dive into the reconciliation loop pattern in Kubernetes operators, covering the theory, implementation details, error handling, and best practices for building reliable controllers.

---

The reconciliation loop is the heartbeat of every Kubernetes operator. It is the pattern that makes the entire Kubernetes ecosystem work, from the built-in Deployment controller to your custom operators. Understanding this pattern deeply is essential for building operators that are reliable, efficient, and correct. This guide explains what the reconciliation loop is, how it works under the hood, and how to implement it properly with real Go code examples.

## The Declarative Model and Reconciliation

Kubernetes is built on a declarative model. Users declare the desired state of the system through resource manifests, and controllers continuously work to bring the actual state of the system in line with the desired state. This process of comparing desired state with actual state and taking corrective action is called reconciliation.

The reconciliation loop follows a simple pattern:

1. Observe the desired state (read the custom resource spec)
2. Observe the actual state (query the cluster for existing resources)
3. Compare the two states
4. Take action to close the gap (create, update, or delete resources)
5. Update the status of the custom resource to reflect the current state
6. Return and wait for the next trigger

This loop runs not on a fixed timer but in response to events: resource creation, updates, deletions, or periodic resyncs.

## The Controller Runtime Framework

The controller-runtime library, used by both Kubebuilder and Operator SDK, provides the infrastructure for the reconciliation loop. At its core, it uses informers and work queues.

Informers watch the Kubernetes API server for changes to resources and push events into a work queue. The controller pulls items from the queue and calls your `Reconcile` function. If reconciliation fails, the item is re-queued with exponential backoff.

Here is the minimal structure of a controller:

```go
package controllers

import (
    "context"
    "fmt"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/types"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"

    myappv1 "github.com/example/my-operator/api/v1"
)

type WebAppReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *WebAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    // Step 1: Fetch the custom resource
    webapp := &myappv1.WebApp{}
    if err := r.Get(ctx, req.NamespacedName, webapp); err != nil {
        if errors.IsNotFound(err) {
            logger.Info("WebApp resource not found, likely deleted")
            return ctrl.Result{}, nil
        }
        return ctrl.Result{}, err
    }

    // Step 2: Check the actual state
    // Step 3: Compare and act
    // Step 4: Update status

    return ctrl.Result{}, nil
}
```

## Implementing a Complete Reconciliation Loop

Let us build a complete reconciler for a `WebApp` custom resource that manages a Deployment and a Service. The WebApp spec has fields for the container image, replica count, and port.

### Fetching the Custom Resource

The first thing every reconciler does is fetch the resource that triggered the reconciliation:

```go
webapp := &myappv1.WebApp{}
if err := r.Get(ctx, req.NamespacedName, webapp); err != nil {
    if errors.IsNotFound(err) {
        // Resource was deleted before we could reconcile
        return ctrl.Result{}, nil
    }
    return ctrl.Result{}, err
}
```

Returning `nil` for a NotFound error is critical. The resource may have been deleted between the time the event was queued and the time the reconciler runs. This is normal and not an error condition.

### Ensuring the Deployment Exists

Next, check if the Deployment already exists. If not, create it. If it does, ensure it matches the desired state:

```go
func (r *WebAppReconciler) reconcileDeployment(ctx context.Context, webapp *myappv1.WebApp) error {
    logger := log.FromContext(ctx)

    desired := r.desiredDeployment(webapp)

    existing := &appsv1.Deployment{}
    err := r.Get(ctx, types.NamespacedName{
        Name:      desired.Name,
        Namespace: desired.Namespace,
    }, existing)

    if errors.IsNotFound(err) {
        logger.Info("Creating Deployment", "name", desired.Name)
        if err := ctrl.SetControllerReference(webapp, desired, r.Scheme); err != nil {
            return err
        }
        return r.Create(ctx, desired)
    }
    if err != nil {
        return err
    }

    // Update if spec has drifted
    if existing.Spec.Replicas == nil ||
        *existing.Spec.Replicas != *desired.Spec.Replicas ||
        existing.Spec.Template.Spec.Containers[0].Image != desired.Spec.Template.Spec.Containers[0].Image {

        existing.Spec.Replicas = desired.Spec.Replicas
        existing.Spec.Template.Spec.Containers[0].Image = desired.Spec.Template.Spec.Containers[0].Image
        logger.Info("Updating Deployment", "name", existing.Name)
        return r.Update(ctx, existing)
    }

    return nil
}

func (r *WebAppReconciler) desiredDeployment(webapp *myappv1.WebApp) *appsv1.Deployment {
    labels := map[string]string{
        "app.kubernetes.io/name":       webapp.Name,
        "app.kubernetes.io/managed-by": "webapp-operator",
    }
    replicas := int32(webapp.Spec.Replicas)

    return &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      webapp.Name,
            Namespace: webapp.Namespace,
            Labels:    labels,
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &replicas,
            Selector: &metav1.LabelSelector{
                MatchLabels: labels,
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: labels,
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "web",
                            Image: webapp.Spec.Image,
                            Ports: []corev1.ContainerPort{
                                {ContainerPort: int32(webapp.Spec.Port)},
                            },
                        },
                    },
                },
            },
        },
    }
}
```

### Owner References and Garbage Collection

The call to `ctrl.SetControllerReference` is critical. It sets an owner reference on the Deployment pointing back to the WebApp resource. This means when the WebApp is deleted, Kubernetes garbage collection automatically deletes the Deployment too. Without owner references, you would need to manually clean up child resources.

### Reconciling the Service

The pattern for the Service is identical:

```go
func (r *WebAppReconciler) reconcileService(ctx context.Context, webapp *myappv1.WebApp) error {
    logger := log.FromContext(ctx)

    desired := &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      webapp.Name,
            Namespace: webapp.Namespace,
        },
        Spec: corev1.ServiceSpec{
            Selector: map[string]string{
                "app.kubernetes.io/name": webapp.Name,
            },
            Ports: []corev1.ServicePort{
                {
                    Port:       int32(webapp.Spec.Port),
                    TargetPort: intstr.FromInt(int(webapp.Spec.Port)),
                },
            },
        },
    }

    existing := &corev1.Service{}
    err := r.Get(ctx, types.NamespacedName{
        Name:      desired.Name,
        Namespace: desired.Namespace,
    }, existing)

    if errors.IsNotFound(err) {
        logger.Info("Creating Service", "name", desired.Name)
        if err := ctrl.SetControllerReference(webapp, desired, r.Scheme); err != nil {
            return err
        }
        return r.Create(ctx, desired)
    }

    return err
}
```

### Updating Status

After reconciling child resources, update the status of the custom resource to reflect the current state:

```go
func (r *WebAppReconciler) updateStatus(ctx context.Context, webapp *myappv1.WebApp) error {
    deployment := &appsv1.Deployment{}
    err := r.Get(ctx, types.NamespacedName{
        Name:      webapp.Name,
        Namespace: webapp.Namespace,
    }, deployment)
    if err != nil {
        return err
    }

    webapp.Status.AvailableReplicas = int(deployment.Status.AvailableReplicas)
    webapp.Status.Ready = deployment.Status.AvailableReplicas == *deployment.Spec.Replicas

    return r.Status().Update(ctx, webapp)
}
```

### Putting It All Together

The main Reconcile function orchestrates these steps:

```go
func (r *WebAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    webapp := &myappv1.WebApp{}
    if err := r.Get(ctx, req.NamespacedName, webapp); err != nil {
        if errors.IsNotFound(err) {
            return ctrl.Result{}, nil
        }
        return ctrl.Result{}, err
    }

    if err := r.reconcileDeployment(ctx, webapp); err != nil {
        logger.Error(err, "Failed to reconcile Deployment")
        return ctrl.Result{}, err
    }

    if err := r.reconcileService(ctx, webapp); err != nil {
        logger.Error(err, "Failed to reconcile Service")
        return ctrl.Result{}, err
    }

    if err := r.updateStatus(ctx, webapp); err != nil {
        logger.Error(err, "Failed to update status")
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}
```

## Return Values and Requeueing

The `ctrl.Result` return value controls requeueing behavior:

- `ctrl.Result{}, nil` means reconciliation succeeded and the item should not be requeued (unless a new event triggers it).
- `ctrl.Result{}, err` means reconciliation failed and the item will be requeued with exponential backoff.
- `ctrl.Result{Requeue: true}, nil` means the controller should immediately requeue the item.
- `ctrl.Result{RequeueAfter: 30 * time.Second}, nil` means requeue after a specific duration. This is useful for polling external systems that do not generate Kubernetes events.

## Setting Up Watches

The controller must be configured to watch for events on the custom resource and its child resources:

```go
func (r *WebAppReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&myappv1.WebApp{}).
        Owns(&appsv1.Deployment{}).
        Owns(&corev1.Service{}).
        Complete(r)
}
```

The `For` method watches the primary resource. The `Owns` method watches child resources and maps events back to the owning WebApp through the owner reference. If someone manually scales the Deployment, the controller receives an event and can correct the drift.

## Idempotency Is Non-Negotiable

The reconciliation loop must be idempotent. Running the same reconciliation multiple times with the same input must produce the same result without side effects. This means you should always check if a resource exists before creating it, compare the current state before updating, and never assume the order of events.

## Conclusion

The reconciliation loop is deceptively simple in concept but requires careful implementation. Every decision about state comparison, error handling, requeueing, and status updates affects the reliability of your operator. Build your reconciler to be idempotent, use owner references for garbage collection, leverage the controller-runtime framework for watch and queue management, and always handle the NotFound case gracefully. A well-implemented reconciliation loop is what separates a production-grade operator from a fragile automation script.
