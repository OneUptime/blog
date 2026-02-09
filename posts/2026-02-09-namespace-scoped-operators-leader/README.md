# How to Implement Namespace-Scoped Operators with Leader Election

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operators, Leader Election

Description: Learn how to build namespace-scoped Kubernetes operators with leader election for high availability and efficient resource management across multiple replicas.

---

Kubernetes operators automate the management of complex applications, but when you need to run operators that work within specific namespaces while maintaining high availability, you face unique challenges. Running multiple replicas of an operator requires leader election to prevent duplicate reconciliation loops and ensure only one instance actively manages resources at a time.

Namespace-scoped operators are particularly useful in multi-tenant environments where you want isolation between different teams or applications. Combined with leader election, they provide both high availability and safe concurrent operation.

## Understanding Namespace-Scoped Operators

Unlike cluster-scoped operators that watch and manage resources across the entire cluster, namespace-scoped operators focus on resources within a single namespace. This scoping provides several benefits:

Resource isolation between different tenants or teams. Reduced RBAC permissions since the operator only needs access to its namespace. Lower resource consumption by watching fewer resources. Easier multi-tenancy implementation with separate operator instances per namespace.

## Why Leader Election Matters

When you run multiple replicas of an operator for high availability, you need leader election to ensure only one replica actively reconciles resources. Without it, multiple replicas would simultaneously attempt to modify the same resources, causing race conditions, duplicate operations, and inconsistent state.

## Building a Namespace-Scoped Operator with Kubebuilder

Let's build a namespace-scoped operator using Kubebuilder with leader election enabled. We'll create an operator that manages custom application deployments.

First, initialize the operator project:

```bash
# Initialize the project
kubebuilder init --domain example.com --repo github.com/example/app-operator

# Create an API
kubebuilder create api --group apps --version v1 --kind Application
```

Define the custom resource in `api/v1/application_types.go`:

```go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ApplicationSpec defines the desired state of Application
type ApplicationSpec struct {
    // Replicas is the number of desired pods
    Replicas int32 `json:"replicas,omitempty"`

    // Image is the container image to deploy
    Image string `json:"image"`

    // Port is the container port to expose
    Port int32 `json:"port,omitempty"`
}

// ApplicationStatus defines the observed state of Application
type ApplicationStatus struct {
    // ReadyReplicas is the number of ready pods
    ReadyReplicas int32 `json:"readyReplicas,omitempty"`

    // Conditions represent the latest available observations
    Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// Application is the Schema for the applications API
type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ApplicationList contains a list of Application
type ApplicationList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []Application `json:"items"`
}

func init() {
    SchemeBuilder.Register(&Application{}, &ApplicationList{})
}
```

Implement the controller logic in `controllers/application_controller.go`:

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
    "sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
    "sigs.k8s.io/controller-runtime/pkg/log"

    appsv1alpha1 "github.com/example/app-operator/api/v1"
)

// ApplicationReconciler reconciles an Application object
type ApplicationReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

const applicationFinalizer = "apps.example.com/finalizer"

//+kubebuilder:rbac:groups=apps.example.com,resources=applications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps.example.com,resources=applications/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=apps.example.com,resources=applications/finalizers,verbs=update
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete

// Reconcile handles the reconciliation logic
func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)
    logger.Info("Reconciling Application", "namespace", req.Namespace, "name", req.Name)

    // Fetch the Application instance
    app := &appsv1alpha1.Application{}
    if err := r.Get(ctx, req.NamespacedName, app); err != nil {
        if errors.IsNotFound(err) {
            return ctrl.Result{}, nil
        }
        return ctrl.Result{}, err
    }

    // Handle deletion
    if !app.DeletionTimestamp.IsZero() {
        return r.handleDeletion(ctx, app)
    }

    // Add finalizer if not present
    if !controllerutil.ContainsFinalizer(app, applicationFinalizer) {
        controllerutil.AddFinalizer(app, applicationFinalizer)
        if err := r.Update(ctx, app); err != nil {
            return ctrl.Result{}, err
        }
    }

    // Reconcile Deployment
    if err := r.reconcileDeployment(ctx, app); err != nil {
        logger.Error(err, "Failed to reconcile Deployment")
        return ctrl.Result{}, err
    }

    // Reconcile Service
    if err := r.reconcileService(ctx, app); err != nil {
        logger.Error(err, "Failed to reconcile Service")
        return ctrl.Result{}, err
    }

    // Update status
    if err := r.updateStatus(ctx, app); err != nil {
        logger.Error(err, "Failed to update status")
        return ctrl.Result{}, err
    }

    logger.Info("Successfully reconciled Application")
    return ctrl.Result{}, nil
}

// reconcileDeployment ensures the Deployment exists and matches the spec
func (r *ApplicationReconciler) reconcileDeployment(ctx context.Context, app *appsv1alpha1.Application) error {
    deployment := &appsv1.Deployment{}
    deploymentName := types.NamespacedName{
        Name:      app.Name,
        Namespace: app.Namespace,
    }

    err := r.Get(ctx, deploymentName, deployment)
    if err != nil && errors.IsNotFound(err) {
        // Create new deployment
        deployment = r.buildDeployment(app)
        if err := controllerutil.SetControllerReference(app, deployment, r.Scheme); err != nil {
            return err
        }
        return r.Create(ctx, deployment)
    } else if err != nil {
        return err
    }

    // Update existing deployment if needed
    if deployment.Spec.Replicas == nil || *deployment.Spec.Replicas != app.Spec.Replicas {
        deployment.Spec.Replicas = &app.Spec.Replicas
        return r.Update(ctx, deployment)
    }

    return nil
}

// buildDeployment creates a Deployment from the Application spec
func (r *ApplicationReconciler) buildDeployment(app *appsv1alpha1.Application) *appsv1.Deployment {
    labels := map[string]string{
        "app": app.Name,
    }

    return &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      app.Name,
            Namespace: app.Namespace,
            Labels:    labels,
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &app.Spec.Replicas,
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
                            Name:  app.Name,
                            Image: app.Spec.Image,
                            Ports: []corev1.ContainerPort{
                                {
                                    ContainerPort: app.Spec.Port,
                                    Protocol:      corev1.ProtocolTCP,
                                },
                            },
                        },
                    },
                },
            },
        },
    }
}

// reconcileService ensures the Service exists
func (r *ApplicationReconciler) reconcileService(ctx context.Context, app *appsv1alpha1.Application) error {
    service := &corev1.Service{}
    serviceName := types.NamespacedName{
        Name:      app.Name,
        Namespace: app.Namespace,
    }

    err := r.Get(ctx, serviceName, service)
    if err != nil && errors.IsNotFound(err) {
        service = r.buildService(app)
        if err := controllerutil.SetControllerReference(app, service, r.Scheme); err != nil {
            return err
        }
        return r.Create(ctx, service)
    }
    return err
}

// buildService creates a Service from the Application spec
func (r *ApplicationReconciler) buildService(app *appsv1alpha1.Application) *corev1.Service {
    labels := map[string]string{
        "app": app.Name,
    }

    return &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      app.Name,
            Namespace: app.Namespace,
            Labels:    labels,
        },
        Spec: corev1.ServiceSpec{
            Selector: labels,
            Ports: []corev1.ServicePort{
                {
                    Port:     app.Spec.Port,
                    Protocol: corev1.ProtocolTCP,
                },
            },
            Type: corev1.ServiceTypeClusterIP,
        },
    }
}

// updateStatus updates the Application status
func (r *ApplicationReconciler) updateStatus(ctx context.Context, app *appsv1alpha1.Application) error {
    deployment := &appsv1.Deployment{}
    if err := r.Get(ctx, types.NamespacedName{Name: app.Name, Namespace: app.Namespace}, deployment); err != nil {
        return err
    }

    app.Status.ReadyReplicas = deployment.Status.ReadyReplicas
    return r.Status().Update(ctx, app)
}

// handleDeletion handles cleanup when Application is deleted
func (r *ApplicationReconciler) handleDeletion(ctx context.Context, app *appsv1alpha1.Application) (ctrl.Result, error) {
    if controllerutil.ContainsFinalizer(app, applicationFinalizer) {
        // Perform cleanup operations here
        controllerutil.RemoveFinalizer(app, applicationFinalizer)
        if err := r.Update(ctx, app); err != nil {
            return ctrl.Result{}, err
        }
    }
    return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager
func (r *ApplicationReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&appsv1alpha1.Application{}).
        Owns(&appsv1.Deployment{}).
        Owns(&corev1.Service{}).
        Complete(r)
}
```

Configure leader election in `main.go`:

```go
package main

import (
    "flag"
    "os"
    "time"

    "k8s.io/apimachinery/pkg/runtime"
    utilruntime "k8s.io/apimachinery/pkg/util/runtime"
    clientgoscheme "k8s.io/client-go/kubernetes/scheme"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/healthz"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"

    appsv1 "github.com/example/app-operator/api/v1"
    "github.com/example/app-operator/controllers"
)

var (
    scheme   = runtime.NewScheme()
    setupLog = ctrl.Log.WithName("setup")
)

func init() {
    utilruntime.Must(clientgoscheme.AddToScheme(scheme))
    utilruntime.Must(appsv1.AddToScheme(scheme))
}

func main() {
    var metricsAddr string
    var enableLeaderElection bool
    var probeAddr string
    var namespace string
    var leaderElectionID string
    var leaseDuration time.Duration
    var renewDeadline time.Duration
    var retryPeriod time.Duration

    flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
    flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
    flag.BoolVar(&enableLeaderElection, "leader-elect", false, "Enable leader election for controller manager.")
    flag.StringVar(&namespace, "namespace", "", "Namespace to watch (empty for all namespaces)")
    flag.StringVar(&leaderElectionID, "leader-election-id", "app-operator-leader", "Leader election ID")
    flag.DurationVar(&leaseDuration, "leader-election-lease-duration", 15*time.Second, "Leader election lease duration")
    flag.DurationVar(&renewDeadline, "leader-election-renew-deadline", 10*time.Second, "Leader election renew deadline")
    flag.DurationVar(&retryPeriod, "leader-election-retry-period", 2*time.Second, "Leader election retry period")

    opts := zap.Options{
        Development: true,
    }
    opts.BindFlags(flag.CommandLine)
    flag.Parse()

    ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

    // Configure manager options
    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
        Scheme:                 scheme,
        MetricsBindAddress:     metricsAddr,
        Port:                   9443,
        HealthProbeBindAddress: probeAddr,
        LeaderElection:         enableLeaderElection,
        LeaderElectionID:       leaderElectionID,
        Namespace:              namespace,
        LeaseDuration:          &leaseDuration,
        RenewDeadline:          &renewDeadline,
        RetryPeriod:            &retryPeriod,
    })
    if err != nil {
        setupLog.Error(err, "unable to start manager")
        os.Exit(1)
    }

    if err = (&controllers.ApplicationReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create controller", "controller", "Application")
        os.Exit(1)
    }

    if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
        setupLog.Error(err, "unable to set up health check")
        os.Exit(1)
    }
    if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
        setupLog.Error(err, "unable to set up ready check")
        os.Exit(1)
    }

    setupLog.Info("starting manager")
    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        setupLog.Error(err, "problem running manager")
        os.Exit(1)
    }
}
```

Deploy the operator with multiple replicas:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: app-operator-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-operator-controller-manager
  namespace: app-operator-system
spec:
  replicas: 3
  selector:
    matchLabels:
      control-plane: controller-manager
  template:
    metadata:
      labels:
        control-plane: controller-manager
    spec:
      serviceAccountName: app-operator-controller-manager
      containers:
      - name: manager
        image: app-operator:latest
        command:
        - /manager
        args:
        - --leader-elect
        - --namespace=app-namespace
        - --leader-election-id=app-operator-leader
        - --leader-election-lease-duration=15s
        - --leader-election-renew-deadline=10s
        - --leader-election-retry-period=2s
        resources:
          limits:
            cpu: 200m
            memory: 128Mi
          requests:
            cpu: 100m
            memory: 64Mi
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
          initialDelaySeconds: 15
          periodSeconds: 20
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 10
```

Test the operator by creating an Application resource:

```yaml
apiVersion: apps.example.com/v1
kind: Application
metadata:
  name: my-app
  namespace: app-namespace
spec:
  replicas: 3
  image: nginx:latest
  port: 80
```

Verify leader election is working:

```bash
# Check which pod is the leader
kubectl logs -n app-operator-system deployment/app-operator-controller-manager | grep "leader"

# You should see logs like:
# "successfully acquired lease" "leader elected"

# Scale down the leader pod and watch failover
kubectl delete pod -n app-operator-system <leader-pod-name>

# Watch for new leader election
kubectl logs -n app-operator-system -l control-plane=controller-manager --follow | grep "leader"
```

This implementation provides a robust namespace-scoped operator with leader election, ensuring high availability while preventing duplicate reconciliation loops across multiple replicas.
