# How to Build a Kubernetes Controller with the Controller-Runtime Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Controller, controller-runtime, Go

Description: Learn how to build production-ready Kubernetes controllers using the controller-runtime library with proper reconciliation logic, event handling, and error management.

---

Building controllers with raw client-go requires writing a lot of boilerplate. You set up informers, create work queues, implement worker loops, handle cache synchronization, and manage leader election. Every controller needs this same infrastructure.

The controller-runtime library abstracts all of this. You write a Reconcile function that describes desired state, and the runtime handles everything else. This is the same library that powers Kubebuilder and Operator SDK. This guide shows you how to use it directly.

## Installing controller-runtime

Create a new Go module and install dependencies.

```bash
mkdir my-controller
cd my-controller
go mod init github.com/example/my-controller

# Install controller-runtime
go get sigs.k8s.io/controller-runtime@latest
```

## Creating a Simple Controller

Build a controller that watches ConfigMaps and logs changes.

```go
package main

import (
    "context"
    "fmt"
    "os"

    corev1 "k8s.io/api/core/v1"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"
)

type ConfigMapReconciler struct {
    client.Client
}

func (r *ConfigMapReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    // Fetch the ConfigMap
    var configMap corev1.ConfigMap
    if err := r.Get(ctx, req.NamespacedName, &configMap); err != nil {
        if client.IgnoreNotFound(err) == nil {
            logger.Info("ConfigMap not found, probably deleted",
                "name", req.Name, "namespace", req.Namespace)
            return ctrl.Result{}, nil
        }
        logger.Error(err, "Failed to get ConfigMap")
        return ctrl.Result{}, err
    }

    logger.Info("Reconciling ConfigMap",
        "name", configMap.Name,
        "namespace", configMap.Namespace,
        "keys", len(configMap.Data))

    // Your reconciliation logic here
    return ctrl.Result{}, nil
}

func main() {
    ctrl.SetLogger(zap.New(zap.UseDevMode(true)))

    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{})
    if err != nil {
        fmt.Fprintf(os.Stderr, "Failed to create manager: %v\n", err)
        os.Exit(1)
    }

    if err := ctrl.NewControllerManagedBy(mgr).
        For(&corev1.ConfigMap{}).
        Complete(&ConfigMapReconciler{
            Client: mgr.GetClient(),
        }); err != nil {
        fmt.Fprintf(os.Stderr, "Failed to create controller: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("Starting controller...")
    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        fmt.Fprintf(os.Stderr, "Failed to start manager: %v\n", err)
        os.Exit(1)
    }
}
```

## Watching Custom Resources

Create a controller for a Custom Resource Definition.

```go
package main

import (
    "context"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

// Define custom resource type
type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

type ApplicationSpec struct {
    Image    string `json:"image"`
    Replicas int32  `json:"replicas"`
    Port     int32  `json:"port"`
}

type ApplicationStatus struct {
    Phase             string `json:"phase"`
    AvailableReplicas int32  `json:"availableReplicas"`
}

type ApplicationReconciler struct {
    client.Client
}

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    // Fetch the Application
    var app Application
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    logger.Info("Reconciling Application", "name", app.Name, "namespace", app.Namespace)

    // Create or update Deployment
    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      app.Name,
            Namespace: app.Namespace,
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
                            Ports: []corev1.ContainerPort{
                                {
                                    ContainerPort: app.Spec.Port,
                                },
                            },
                        },
                    },
                },
            },
        },
    }

    // Set owner reference for garbage collection
    if err := ctrl.SetControllerReference(&app, deployment, r.Scheme()); err != nil {
        return ctrl.Result{}, err
    }

    // Create or update the deployment
    if err := r.Create(ctx, deployment); err != nil {
        if client.IgnoreAlreadyExists(err) == nil {
            // Deployment exists, update it
            if err := r.Update(ctx, deployment); err != nil {
                logger.Error(err, "Failed to update Deployment")
                return ctrl.Result{}, err
            }
        } else {
            logger.Error(err, "Failed to create Deployment")
            return ctrl.Result{}, err
        }
    }

    // Update Application status
    app.Status.Phase = "Running"
    app.Status.AvailableReplicas = app.Spec.Replicas
    if err := r.Status().Update(ctx, &app); err != nil {
        logger.Error(err, "Failed to update Application status")
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}
```

## Watching Multiple Resources

Set up a controller that watches both primary and owned resources.

```go
package main

import (
    "context"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/handler"
    "sigs.k8s.io/controller-runtime/pkg/source"
)

type MultiResourceReconciler struct {
    client.Client
}

func (r *MultiResourceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // Reconciliation logic
    return ctrl.Result{}, nil
}

func setupController(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&Application{}). // Primary resource
        Owns(&appsv1.Deployment{}). // Watch owned Deployments
        Owns(&corev1.Service{}). // Watch owned Services
        Watches(
            &source.Kind{Type: &corev1.ConfigMap{}},
            &handler.EnqueueRequestForObject{},
        ). // Watch ConfigMaps
        Complete(&MultiResourceReconciler{
            Client: mgr.GetClient(),
        })
}
```

## Implementing Predicates for Filtering

Filter events before they trigger reconciliation.

```go
package main

import (
    "sigs.k8s.io/controller-runtime/pkg/event"
    "sigs.k8s.io/controller-runtime/pkg/predicate"
)

func createPredicates() predicate.Predicate {
    return predicate.Funcs{
        CreateFunc: func(e event.CreateEvent) bool {
            // Only reconcile resources with specific label
            labels := e.Object.GetLabels()
            return labels["managed-by"] == "my-controller"
        },
        UpdateFunc: func(e event.UpdateEvent) bool {
            // Only reconcile if spec changed
            oldGen := e.ObjectOld.GetGeneration()
            newGen := e.ObjectNew.GetGeneration()
            return oldGen != newGen
        },
        DeleteFunc: func(e event.DeleteEvent) bool {
            // Always handle deletions
            return true
        },
        GenericFunc: func(e event.GenericEvent) bool {
            return false
        },
    }
}

// Use predicates in controller setup
func setupFilteredController(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&Application{}).
        WithEventFilter(createPredicates()).
        Complete(&ApplicationReconciler{
            Client: mgr.GetClient(),
        })
}
```

## Handling Status Updates

Properly manage status subresources.

```go
func (r *ApplicationReconciler) updateStatus(ctx context.Context, app *Application, phase string, replicas int32) error {
    logger := log.FromContext(ctx)

    // Update status fields
    app.Status.Phase = phase
    app.Status.AvailableReplicas = replicas

    // Update status subresource
    if err := r.Status().Update(ctx, app); err != nil {
        logger.Error(err, "Failed to update status")
        return err
    }

    return nil
}

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var app Application
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Do reconciliation work...

    // Update status at the end
    if err := r.updateStatus(ctx, &app, "Running", app.Spec.Replicas); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}
```

## Implementing Requeue Logic

Control when and how resources are requeued.

```go
func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    var app Application
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Check if resource is being deleted
    if !app.ObjectMeta.DeletionTimestamp.IsZero() {
        logger.Info("Resource is being deleted")
        return ctrl.Result{}, nil
    }

    // Perform reconciliation
    err := r.reconcileDeployment(ctx, &app)
    if err != nil {
        logger.Error(err, "Failed to reconcile deployment")

        // Requeue after 30 seconds
        return ctrl.Result{
            Requeue:      true,
            RequeueAfter: 30 * time.Second,
        }, nil
    }

    // Check deployment status
    ready, err := r.isDeploymentReady(ctx, &app)
    if err != nil {
        return ctrl.Result{}, err
    }

    if !ready {
        logger.Info("Deployment not ready yet, requeuing")
        // Requeue after 10 seconds to check again
        return ctrl.Result{
            RequeueAfter: 10 * time.Second,
        }, nil
    }

    logger.Info("Reconciliation successful")
    return ctrl.Result{}, nil
}
```

## Using Finalizers

Implement cleanup logic with finalizers.

```go
const applicationFinalizerName = "application.example.com/finalizer"

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    var app Application
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Check if resource is being deleted
    if !app.ObjectMeta.DeletionTimestamp.IsZero() {
        if containsString(app.ObjectMeta.Finalizers, applicationFinalizerName) {
            // Run finalization logic
            if err := r.finalizeApplication(ctx, &app); err != nil {
                return ctrl.Result{}, err
            }

            // Remove finalizer
            app.ObjectMeta.Finalizers = removeString(app.ObjectMeta.Finalizers, applicationFinalizerName)
            if err := r.Update(ctx, &app); err != nil {
                return ctrl.Result{}, err
            }
        }
        return ctrl.Result{}, nil
    }

    // Add finalizer if not present
    if !containsString(app.ObjectMeta.Finalizers, applicationFinalizerName) {
        app.ObjectMeta.Finalizers = append(app.ObjectMeta.Finalizers, applicationFinalizerName)
        if err := r.Update(ctx, &app); err != nil {
            return ctrl.Result{}, err
        }
    }

    // Regular reconciliation logic
    return ctrl.Result{}, nil
}

func (r *ApplicationReconciler) finalizeApplication(ctx context.Context, app *Application) error {
    logger := log.FromContext(ctx)
    logger.Info("Running finalizer", "name", app.Name)

    // Cleanup external resources, remove database entries, etc.
    return nil
}

func containsString(slice []string, s string) bool {
    for _, item := range slice {
        if item == s {
            return true
        }
    }
    return false
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

## Configuring Manager Options

Customize the manager for production use.

```go
func main() {
    ctrl.SetLogger(zap.New(zap.UseDevMode(false)))

    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
        Scheme: scheme,
        MetricsBindAddress: ":8080",
        HealthProbeBindAddress: ":8081",
        LeaderElection: true,
        LeaderElectionID: "application-controller-leader",
        LeaderElectionNamespace: "kube-system",
        Namespace: "", // Watch all namespaces
    })
    if err != nil {
        os.Exit(1)
    }

    // Add health checks
    if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
        os.Exit(1)
    }
    if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
        os.Exit(1)
    }

    // Setup controller
    if err := setupController(mgr); err != nil {
        os.Exit(1)
    }

    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        os.Exit(1)
    }
}
```

## Conclusion

controller-runtime eliminates boilerplate and provides a consistent framework for building Kubernetes controllers. The Reconcile pattern focuses on desired state rather than imperative operations.

Use controller-runtime when building custom controllers or operators. Implement Reconcile functions that are idempotent and handle all resource states. Use predicates to filter unnecessary events. Implement finalizers for cleanup logic.

The library handles all the infrastructure details like informers, work queues, leader election, and metrics. You focus on business logic and desired state reconciliation.
