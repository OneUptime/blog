# How to Build Custom Kubernetes Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Controllers, Operators, Go

Description: Build custom Kubernetes controllers using controller-runtime to manage resources with reconciliation loops and custom business logic.

---

## Introduction

Kubernetes controllers are the backbone of the declarative model that makes Kubernetes powerful. Every time you create a Deployment, StatefulSet, or Service, a controller watches for changes and works to make the actual state match your desired state. Building custom controllers lets you extend Kubernetes with your own business logic and automation.

This guide walks through building a production-ready Kubernetes controller using the controller-runtime library. We will create a controller that manages a custom resource called `WebApp`, which automatically provisions Deployments, Services, and ConfigMaps.

## Understanding the Controller Pattern

The controller pattern follows a simple loop:

1. Watch for changes to resources
2. Compare desired state with actual state
3. Take action to reconcile differences
4. Update status to reflect current state

This pattern, often called the "reconciliation loop," runs continuously. Controllers are designed to be idempotent, meaning running the same reconciliation multiple times produces the same result.

### Key Concepts

| Concept | Description |
|---------|-------------|
| Reconciler | The core logic that compares desired and actual state |
| Watch | Mechanism to receive notifications about resource changes |
| Owner Reference | Links child resources to parent resources for garbage collection |
| Finalizer | Allows cleanup logic before resource deletion |
| Status | Subresource that reflects the current state of a resource |

## Setting Up Your Project

Start by initializing a new Go module and installing the required dependencies.

```bash
mkdir webapp-controller
cd webapp-controller
go mod init github.com/example/webapp-controller

# Install controller-runtime and client-go
go get sigs.k8s.io/controller-runtime@v0.17.0
go get k8s.io/client-go@v0.29.0
go get k8s.io/apimachinery@v0.29.0
```

## Defining the Custom Resource

First, define the custom resource type. This struct represents the schema for your WebApp resource.

```go
// api/v1/webapp_types.go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// WebAppSpec defines the desired state of WebApp
type WebAppSpec struct {
    // Image is the container image to deploy
    Image string `json:"image"`

    // Replicas is the number of pod replicas
    // +kubebuilder:default=1
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=10
    Replicas int32 `json:"replicas,omitempty"`

    // Port is the container port to expose
    // +kubebuilder:default=8080
    Port int32 `json:"port,omitempty"`

    // Config holds key-value pairs for the ConfigMap
    // +optional
    Config map[string]string `json:"config,omitempty"`

    // Resources defines CPU and memory limits
    // +optional
    Resources ResourceRequirements `json:"resources,omitempty"`
}

// ResourceRequirements specifies compute resource requirements
type ResourceRequirements struct {
    CPULimit    string `json:"cpuLimit,omitempty"`
    MemoryLimit string `json:"memoryLimit,omitempty"`
}

// WebAppStatus defines the observed state of WebApp
type WebAppStatus struct {
    // AvailableReplicas is the number of ready pods
    AvailableReplicas int32 `json:"availableReplicas"`

    // Conditions represent the latest available observations
    Conditions []metav1.Condition `json:"conditions,omitempty"`

    // LastReconcileTime is when reconciliation last occurred
    LastReconcileTime metav1.Time `json:"lastReconcileTime,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Image",type=string,JSONPath=`.spec.image`
// +kubebuilder:printcolumn:name="Replicas",type=integer,JSONPath=`.spec.replicas`
// +kubebuilder:printcolumn:name="Available",type=integer,JSONPath=`.status.availableReplicas`

// WebApp is the Schema for the webapps API
type WebApp struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   WebAppSpec   `json:"spec,omitempty"`
    Status WebAppStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// WebAppList contains a list of WebApp resources
type WebAppList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []WebApp `json:"items"`
}

func init() {
    SchemeBuilder.Register(&WebApp{}, &WebAppList{})
}
```

## Building the Reconciler

The reconciler contains the main logic for your controller. Each time a watched resource changes, the Reconcile function runs.

```go
// internal/controller/webapp_controller.go
package controller

import (
    "context"
    "fmt"
    "time"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/types"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"

    webappv1 "github.com/example/webapp-controller/api/v1"
)

// WebAppReconciler reconciles a WebApp object
type WebAppReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

// Reconcile handles the main reconciliation logic
// This function is called whenever a WebApp resource changes
func (r *WebAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)
    logger.Info("Starting reconciliation", "webapp", req.NamespacedName)

    // Fetch the WebApp instance
    webapp := &webappv1.WebApp{}
    if err := r.Get(ctx, req.NamespacedName, webapp); err != nil {
        if errors.IsNotFound(err) {
            // Resource was deleted, nothing to do
            logger.Info("WebApp resource not found, likely deleted")
            return ctrl.Result{}, nil
        }
        logger.Error(err, "Failed to fetch WebApp")
        return ctrl.Result{}, err
    }

    // Handle finalizer for cleanup logic
    if !webapp.DeletionTimestamp.IsZero() {
        return r.handleDeletion(ctx, webapp)
    }

    // Add finalizer if not present
    if err := r.ensureFinalizer(ctx, webapp); err != nil {
        return ctrl.Result{}, err
    }

    // Reconcile ConfigMap
    if err := r.reconcileConfigMap(ctx, webapp); err != nil {
        logger.Error(err, "Failed to reconcile ConfigMap")
        return ctrl.Result{}, err
    }

    // Reconcile Deployment
    if err := r.reconcileDeployment(ctx, webapp); err != nil {
        logger.Error(err, "Failed to reconcile Deployment")
        return ctrl.Result{}, err
    }

    // Reconcile Service
    if err := r.reconcileService(ctx, webapp); err != nil {
        logger.Error(err, "Failed to reconcile Service")
        return ctrl.Result{}, err
    }

    // Update status
    if err := r.updateStatus(ctx, webapp); err != nil {
        logger.Error(err, "Failed to update status")
        return ctrl.Result{}, err
    }

    logger.Info("Reconciliation complete", "webapp", req.NamespacedName)
    return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}
```

## Reconciling Child Resources

Each child resource needs its own reconciliation function. These functions follow a pattern: check if the resource exists, create it if missing, or update it if the spec changed.

### Reconciling the ConfigMap

The ConfigMap stores configuration data that pods can consume as environment variables or mounted files.

```go
// reconcileConfigMap ensures the ConfigMap exists and matches the desired state
func (r *WebAppReconciler) reconcileConfigMap(ctx context.Context, webapp *webappv1.WebApp) error {
    logger := log.FromContext(ctx)

    // Skip if no config is defined
    if webapp.Spec.Config == nil || len(webapp.Spec.Config) == 0 {
        return nil
    }

    configMap := &corev1.ConfigMap{}
    configMapName := types.NamespacedName{
        Name:      webapp.Name + "-config",
        Namespace: webapp.Namespace,
    }

    // Check if ConfigMap already exists
    err := r.Get(ctx, configMapName, configMap)
    if err != nil && errors.IsNotFound(err) {
        // Create new ConfigMap
        configMap = r.buildConfigMap(webapp)
        if err := ctrl.SetControllerReference(webapp, configMap, r.Scheme); err != nil {
            return fmt.Errorf("failed to set owner reference: %w", err)
        }

        logger.Info("Creating ConfigMap", "name", configMap.Name)
        return r.Create(ctx, configMap)
    } else if err != nil {
        return fmt.Errorf("failed to get ConfigMap: %w", err)
    }

    // Update existing ConfigMap if data changed
    if !mapsEqual(configMap.Data, webapp.Spec.Config) {
        configMap.Data = webapp.Spec.Config
        logger.Info("Updating ConfigMap", "name", configMap.Name)
        return r.Update(ctx, configMap)
    }

    return nil
}

// buildConfigMap creates a ConfigMap spec from the WebApp
func (r *WebAppReconciler) buildConfigMap(webapp *webappv1.WebApp) *corev1.ConfigMap {
    return &corev1.ConfigMap{
        ObjectMeta: metav1.ObjectMeta{
            Name:      webapp.Name + "-config",
            Namespace: webapp.Namespace,
            Labels:    labelsForWebApp(webapp),
        },
        Data: webapp.Spec.Config,
    }
}

// mapsEqual compares two string maps for equality
func mapsEqual(a, b map[string]string) bool {
    if len(a) != len(b) {
        return false
    }
    for k, v := range a {
        if b[k] != v {
            return false
        }
    }
    return true
}
```

### Reconciling the Deployment

The Deployment manages the pods for your application. This is where most of the complexity lives.

```go
// reconcileDeployment ensures the Deployment exists and matches the desired state
func (r *WebAppReconciler) reconcileDeployment(ctx context.Context, webapp *webappv1.WebApp) error {
    logger := log.FromContext(ctx)

    deployment := &appsv1.Deployment{}
    deploymentName := types.NamespacedName{
        Name:      webapp.Name,
        Namespace: webapp.Namespace,
    }

    err := r.Get(ctx, deploymentName, deployment)
    if err != nil && errors.IsNotFound(err) {
        // Create new Deployment
        deployment = r.buildDeployment(webapp)
        if err := ctrl.SetControllerReference(webapp, deployment, r.Scheme); err != nil {
            return fmt.Errorf("failed to set owner reference: %w", err)
        }

        logger.Info("Creating Deployment", "name", deployment.Name)
        return r.Create(ctx, deployment)
    } else if err != nil {
        return fmt.Errorf("failed to get Deployment: %w", err)
    }

    // Check if update is needed
    needsUpdate := false

    // Check replicas
    if *deployment.Spec.Replicas != webapp.Spec.Replicas {
        deployment.Spec.Replicas = &webapp.Spec.Replicas
        needsUpdate = true
    }

    // Check container image
    if len(deployment.Spec.Template.Spec.Containers) > 0 {
        if deployment.Spec.Template.Spec.Containers[0].Image != webapp.Spec.Image {
            deployment.Spec.Template.Spec.Containers[0].Image = webapp.Spec.Image
            needsUpdate = true
        }
    }

    if needsUpdate {
        logger.Info("Updating Deployment", "name", deployment.Name)
        return r.Update(ctx, deployment)
    }

    return nil
}

// buildDeployment creates a Deployment spec from the WebApp
func (r *WebAppReconciler) buildDeployment(webapp *webappv1.WebApp) *appsv1.Deployment {
    labels := labelsForWebApp(webapp)
    replicas := webapp.Spec.Replicas

    deployment := &appsv1.Deployment{
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
                    Containers: []corev1.Container{{
                        Name:  "webapp",
                        Image: webapp.Spec.Image,
                        Ports: []corev1.ContainerPort{{
                            ContainerPort: webapp.Spec.Port,
                            Name:          "http",
                        }},
                        // Add liveness and readiness probes
                        LivenessProbe: &corev1.Probe{
                            ProbeHandler: corev1.ProbeHandler{
                                HTTPGet: &corev1.HTTPGetAction{
                                    Path: "/healthz",
                                    Port: intstr.FromInt(int(webapp.Spec.Port)),
                                },
                            },
                            InitialDelaySeconds: 15,
                            PeriodSeconds:       20,
                        },
                        ReadinessProbe: &corev1.Probe{
                            ProbeHandler: corev1.ProbeHandler{
                                HTTPGet: &corev1.HTTPGetAction{
                                    Path: "/readyz",
                                    Port: intstr.FromInt(int(webapp.Spec.Port)),
                                },
                            },
                            InitialDelaySeconds: 5,
                            PeriodSeconds:       10,
                        },
                    }},
                },
            },
        },
    }

    // Add ConfigMap volume if config exists
    if webapp.Spec.Config != nil && len(webapp.Spec.Config) > 0 {
        deployment.Spec.Template.Spec.Volumes = []corev1.Volume{{
            Name: "config",
            VolumeSource: corev1.VolumeSource{
                ConfigMap: &corev1.ConfigMapVolumeSource{
                    LocalObjectReference: corev1.LocalObjectReference{
                        Name: webapp.Name + "-config",
                    },
                },
            },
        }}
        deployment.Spec.Template.Spec.Containers[0].VolumeMounts = []corev1.VolumeMount{{
            Name:      "config",
            MountPath: "/etc/webapp",
        }}
    }

    // Add resource limits if specified
    if webapp.Spec.Resources.CPULimit != "" || webapp.Spec.Resources.MemoryLimit != "" {
        resources := corev1.ResourceRequirements{
            Limits: corev1.ResourceList{},
        }
        if webapp.Spec.Resources.CPULimit != "" {
            resources.Limits[corev1.ResourceCPU] = resource.MustParse(webapp.Spec.Resources.CPULimit)
        }
        if webapp.Spec.Resources.MemoryLimit != "" {
            resources.Limits[corev1.ResourceMemory] = resource.MustParse(webapp.Spec.Resources.MemoryLimit)
        }
        deployment.Spec.Template.Spec.Containers[0].Resources = resources
    }

    return deployment
}

// labelsForWebApp returns the labels for selecting resources belonging to a WebApp
func labelsForWebApp(webapp *webappv1.WebApp) map[string]string {
    return map[string]string{
        "app.kubernetes.io/name":       "webapp",
        "app.kubernetes.io/instance":   webapp.Name,
        "app.kubernetes.io/managed-by": "webapp-controller",
    }
}
```

### Reconciling the Service

The Service exposes the Deployment to other services in the cluster.

```go
// reconcileService ensures the Service exists and matches the desired state
func (r *WebAppReconciler) reconcileService(ctx context.Context, webapp *webappv1.WebApp) error {
    logger := log.FromContext(ctx)

    service := &corev1.Service{}
    serviceName := types.NamespacedName{
        Name:      webapp.Name,
        Namespace: webapp.Namespace,
    }

    err := r.Get(ctx, serviceName, service)
    if err != nil && errors.IsNotFound(err) {
        // Create new Service
        service = r.buildService(webapp)
        if err := ctrl.SetControllerReference(webapp, service, r.Scheme); err != nil {
            return fmt.Errorf("failed to set owner reference: %w", err)
        }

        logger.Info("Creating Service", "name", service.Name)
        return r.Create(ctx, service)
    } else if err != nil {
        return fmt.Errorf("failed to get Service: %w", err)
    }

    // Services are generally immutable, so we skip updates
    // For port changes, you would need to delete and recreate
    return nil
}

// buildService creates a Service spec from the WebApp
func (r *WebAppReconciler) buildService(webapp *webappv1.WebApp) *corev1.Service {
    return &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      webapp.Name,
            Namespace: webapp.Namespace,
            Labels:    labelsForWebApp(webapp),
        },
        Spec: corev1.ServiceSpec{
            Selector: labelsForWebApp(webapp),
            Ports: []corev1.ServicePort{{
                Port:       80,
                TargetPort: intstr.FromInt(int(webapp.Spec.Port)),
                Protocol:   corev1.ProtocolTCP,
                Name:       "http",
            }},
            Type: corev1.ServiceTypeClusterIP,
        },
    }
}
```

## Handling Owner References

Owner references are critical for proper garbage collection. When a parent resource is deleted, Kubernetes automatically deletes all child resources that have an owner reference pointing to the parent.

```go
// SetControllerReference sets the owner reference on a child object
// This is called automatically when using ctrl.SetControllerReference
// The child will be garbage collected when the parent is deleted

// Example of manual owner reference setup
func setOwnerReference(owner, child metav1.Object, scheme *runtime.Scheme) error {
    gvk, err := apiutil.GVKForObject(owner.(runtime.Object), scheme)
    if err != nil {
        return err
    }

    ref := metav1.OwnerReference{
        APIVersion:         gvk.GroupVersion().String(),
        Kind:               gvk.Kind,
        Name:               owner.GetName(),
        UID:                owner.GetUID(),
        BlockOwnerDeletion: pointer.Bool(true),
        Controller:         pointer.Bool(true),
    }

    owners := child.GetOwnerReferences()
    owners = append(owners, ref)
    child.SetOwnerReferences(owners)
    return nil
}
```

## Managing Status Updates

Status updates inform users about the current state of their resources. Use the status subresource to avoid conflicts with spec updates.

```go
// updateStatus updates the WebApp status with current information
func (r *WebAppReconciler) updateStatus(ctx context.Context, webapp *webappv1.WebApp) error {
    logger := log.FromContext(ctx)

    // Fetch the current Deployment to get replica status
    deployment := &appsv1.Deployment{}
    deploymentName := types.NamespacedName{
        Name:      webapp.Name,
        Namespace: webapp.Namespace,
    }

    if err := r.Get(ctx, deploymentName, deployment); err != nil {
        if !errors.IsNotFound(err) {
            return err
        }
        // Deployment not found, set status to 0
        webapp.Status.AvailableReplicas = 0
    } else {
        webapp.Status.AvailableReplicas = deployment.Status.AvailableReplicas
    }

    // Update last reconcile time
    webapp.Status.LastReconcileTime = metav1.Now()

    // Set conditions based on state
    condition := metav1.Condition{
        Type:               "Available",
        LastTransitionTime: metav1.Now(),
        ObservedGeneration: webapp.Generation,
    }

    if webapp.Status.AvailableReplicas >= webapp.Spec.Replicas {
        condition.Status = metav1.ConditionTrue
        condition.Reason = "MinimumReplicasAvailable"
        condition.Message = "Deployment has minimum availability"
    } else {
        condition.Status = metav1.ConditionFalse
        condition.Reason = "ReplicasUnavailable"
        condition.Message = fmt.Sprintf("Deployment has %d/%d replicas available",
            webapp.Status.AvailableReplicas, webapp.Spec.Replicas)
    }

    // Update or add the condition
    webapp.Status.Conditions = updateCondition(webapp.Status.Conditions, condition)

    // Use StatusClient to update only the status subresource
    logger.Info("Updating status", "availableReplicas", webapp.Status.AvailableReplicas)
    return r.Status().Update(ctx, webapp)
}

// updateCondition updates or adds a condition in the conditions slice
func updateCondition(conditions []metav1.Condition, newCondition metav1.Condition) []metav1.Condition {
    for i, existing := range conditions {
        if existing.Type == newCondition.Type {
            conditions[i] = newCondition
            return conditions
        }
    }
    return append(conditions, newCondition)
}
```

## Implementing Finalizers

Finalizers allow you to run cleanup logic before a resource is deleted. This is useful for external resources that Kubernetes cannot garbage collect.

```go
const finalizerName = "webapp.example.com/finalizer"

// ensureFinalizer adds the finalizer if not present
func (r *WebAppReconciler) ensureFinalizer(ctx context.Context, webapp *webappv1.WebApp) error {
    if !containsString(webapp.Finalizers, finalizerName) {
        webapp.Finalizers = append(webapp.Finalizers, finalizerName)
        return r.Update(ctx, webapp)
    }
    return nil
}

// handleDeletion performs cleanup and removes the finalizer
func (r *WebAppReconciler) handleDeletion(ctx context.Context, webapp *webappv1.WebApp) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    if containsString(webapp.Finalizers, finalizerName) {
        // Run cleanup logic here
        // For example, delete external resources, notify external systems, etc.
        logger.Info("Running finalizer logic", "webapp", webapp.Name)

        // Example: Clean up external DNS record
        if err := r.cleanupExternalResources(ctx, webapp); err != nil {
            return ctrl.Result{}, err
        }

        // Remove finalizer to allow deletion to proceed
        webapp.Finalizers = removeString(webapp.Finalizers, finalizerName)
        if err := r.Update(ctx, webapp); err != nil {
            return ctrl.Result{}, err
        }
    }

    return ctrl.Result{}, nil
}

// cleanupExternalResources handles cleanup of resources outside Kubernetes
func (r *WebAppReconciler) cleanupExternalResources(ctx context.Context, webapp *webappv1.WebApp) error {
    // Implement cleanup logic for external resources
    // This could include:
    // - Deleting DNS records
    // - Removing entries from external load balancers
    // - Cleaning up cloud provider resources
    // - Notifying external monitoring systems
    return nil
}

// containsString checks if a string is in a slice
func containsString(slice []string, s string) bool {
    for _, item := range slice {
        if item == s {
            return true
        }
    }
    return false
}

// removeString removes a string from a slice
func removeString(slice []string, s string) []string {
    result := make([]string, 0, len(slice))
    for _, item := range slice {
        if item != s {
            result = append(result, item)
        }
    }
    return result
}
```

## Setting Up Watches

The controller needs to watch for changes to both the primary resource and any owned resources. The SetupWithManager function configures these watches.

```go
// SetupWithManager sets up the controller with the Manager
// This configures which resources the controller watches
func (r *WebAppReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        // Watch the primary resource
        For(&webappv1.WebApp{}).
        // Watch owned Deployments and trigger reconciliation for the owner
        Owns(&appsv1.Deployment{}).
        // Watch owned Services
        Owns(&corev1.Service{}).
        // Watch owned ConfigMaps
        Owns(&corev1.ConfigMap{}).
        // Configure concurrency and rate limiting
        WithOptions(controller.Options{
            MaxConcurrentReconciles: 3,
            RateLimiter:             workqueue.DefaultControllerRateLimiter(),
        }).
        Complete(r)
}
```

For more advanced scenarios, you can add custom watches with predicates.

```go
// Advanced watch configuration with predicates and custom event handlers
func (r *WebAppReconciler) SetupWithManagerAdvanced(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&webappv1.WebApp{}).
        Owns(&appsv1.Deployment{}).
        // Watch Secrets and map them to WebApps
        Watches(
            &corev1.Secret{},
            handler.EnqueueRequestsFromMapFunc(r.findWebAppsForSecret),
            builder.WithPredicates(predicate.ResourceVersionChangedPredicate{}),
        ).
        // Only reconcile on spec changes, not status changes
        WithEventFilter(predicate.GenerationChangedPredicate{}).
        Complete(r)
}

// findWebAppsForSecret maps Secret changes to WebApp reconciliation requests
func (r *WebAppReconciler) findWebAppsForSecret(ctx context.Context, obj client.Object) []ctrl.Request {
    webappList := &webappv1.WebAppList{}
    if err := r.List(ctx, webappList, client.InNamespace(obj.GetNamespace())); err != nil {
        return nil
    }

    var requests []ctrl.Request
    for _, webapp := range webappList.Items {
        // Check if this WebApp references the changed Secret
        if webapp.Spec.Config != nil {
            requests = append(requests, ctrl.Request{
                NamespacedName: types.NamespacedName{
                    Name:      webapp.Name,
                    Namespace: webapp.Namespace,
                },
            })
        }
    }
    return requests
}
```

## The Main Entry Point

The main function initializes the manager, registers the controller, and starts the control loop.

```go
// main.go
package main

import (
    "flag"
    "os"

    "k8s.io/apimachinery/pkg/runtime"
    utilruntime "k8s.io/apimachinery/pkg/util/runtime"
    clientgoscheme "k8s.io/client-go/kubernetes/scheme"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/healthz"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"
    metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"

    webappv1 "github.com/example/webapp-controller/api/v1"
    "github.com/example/webapp-controller/internal/controller"
)

var (
    scheme   = runtime.NewScheme()
    setupLog = ctrl.Log.WithName("setup")
)

func init() {
    // Register all types with the scheme
    utilruntime.Must(clientgoscheme.AddToScheme(scheme))
    utilruntime.Must(webappv1.AddToScheme(scheme))
}

func main() {
    var metricsAddr string
    var probeAddr string
    var enableLeaderElection bool

    flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address for metrics endpoint")
    flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address for health probes")
    flag.BoolVar(&enableLeaderElection, "leader-elect", false, "Enable leader election for HA")

    opts := zap.Options{Development: true}
    opts.BindFlags(flag.CommandLine)
    flag.Parse()

    ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

    // Create the manager
    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
        Scheme: scheme,
        Metrics: metricsserver.Options{
            BindAddress: metricsAddr,
        },
        HealthProbeBindAddress: probeAddr,
        LeaderElection:         enableLeaderElection,
        LeaderElectionID:       "webapp-controller.example.com",
    })
    if err != nil {
        setupLog.Error(err, "unable to create manager")
        os.Exit(1)
    }

    // Register the controller with the manager
    if err = (&controller.WebAppReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create controller", "controller", "WebApp")
        os.Exit(1)
    }

    // Add health checks
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

## Testing Your Controller

Testing controllers requires a combination of unit tests and integration tests. The controller-runtime library provides envtest for integration testing.

### Unit Tests

```go
// internal/controller/webapp_controller_test.go
package controller

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/types"
    "sigs.k8s.io/controller-runtime/pkg/client/fake"
    "sigs.k8s.io/controller-runtime/pkg/reconcile"

    webappv1 "github.com/example/webapp-controller/api/v1"
)

func TestWebAppReconciler_Reconcile(t *testing.T) {
    // Create a scheme with all required types
    scheme := runtime.NewScheme()
    _ = webappv1.AddToScheme(scheme)
    _ = appsv1.AddToScheme(scheme)
    _ = corev1.AddToScheme(scheme)

    // Create a test WebApp
    webapp := &webappv1.WebApp{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "test-webapp",
            Namespace: "default",
        },
        Spec: webappv1.WebAppSpec{
            Image:    "nginx:1.21",
            Replicas: 3,
            Port:     8080,
        },
    }

    // Create a fake client with the WebApp
    client := fake.NewClientBuilder().
        WithScheme(scheme).
        WithObjects(webapp).
        Build()

    // Create the reconciler
    reconciler := &WebAppReconciler{
        Client: client,
        Scheme: scheme,
    }

    // Run reconciliation
    req := reconcile.Request{
        NamespacedName: types.NamespacedName{
            Name:      "test-webapp",
            Namespace: "default",
        },
    }

    result, err := reconciler.Reconcile(context.Background(), req)
    require.NoError(t, err)
    assert.False(t, result.Requeue)

    // Verify Deployment was created
    deployment := &appsv1.Deployment{}
    err = client.Get(context.Background(), types.NamespacedName{
        Name:      "test-webapp",
        Namespace: "default",
    }, deployment)
    require.NoError(t, err)
    assert.Equal(t, int32(3), *deployment.Spec.Replicas)
    assert.Equal(t, "nginx:1.21", deployment.Spec.Template.Spec.Containers[0].Image)

    // Verify Service was created
    service := &corev1.Service{}
    err = client.Get(context.Background(), types.NamespacedName{
        Name:      "test-webapp",
        Namespace: "default",
    }, service)
    require.NoError(t, err)
    assert.Equal(t, corev1.ServiceTypeClusterIP, service.Spec.Type)
}

func TestWebAppReconciler_ReconcileNotFound(t *testing.T) {
    scheme := runtime.NewScheme()
    _ = webappv1.AddToScheme(scheme)

    client := fake.NewClientBuilder().
        WithScheme(scheme).
        Build()

    reconciler := &WebAppReconciler{
        Client: client,
        Scheme: scheme,
    }

    req := reconcile.Request{
        NamespacedName: types.NamespacedName{
            Name:      "nonexistent",
            Namespace: "default",
        },
    }

    result, err := reconciler.Reconcile(context.Background(), req)
    require.NoError(t, err)
    assert.False(t, result.Requeue)
}

func TestLabelsForWebApp(t *testing.T) {
    webapp := &webappv1.WebApp{
        ObjectMeta: metav1.ObjectMeta{
            Name: "my-app",
        },
    }

    labels := labelsForWebApp(webapp)

    assert.Equal(t, "webapp", labels["app.kubernetes.io/name"])
    assert.Equal(t, "my-app", labels["app.kubernetes.io/instance"])
    assert.Equal(t, "webapp-controller", labels["app.kubernetes.io/managed-by"])
}
```

### Integration Tests with envtest

```go
// internal/controller/suite_test.go
package controller

import (
    "context"
    "path/filepath"
    "testing"
    "time"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    "k8s.io/client-go/kubernetes/scheme"
    "k8s.io/client-go/rest"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/envtest"
    logf "sigs.k8s.io/controller-runtime/pkg/log"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"

    webappv1 "github.com/example/webapp-controller/api/v1"
)

var (
    cfg       *rest.Config
    k8sClient client.Client
    testEnv   *envtest.Environment
    ctx       context.Context
    cancel    context.CancelFunc
)

func TestControllers(t *testing.T) {
    RegisterFailHandler(Fail)
    RunSpecs(t, "Controller Suite")
}

var _ = BeforeSuite(func() {
    logf.SetLogger(zap.New(zap.WriteTo(GinkgoWriter), zap.UseDevMode(true)))

    ctx, cancel = context.WithCancel(context.Background())

    By("bootstrapping test environment")
    testEnv = &envtest.Environment{
        CRDDirectoryPaths:     []string{filepath.Join("..", "..", "config", "crd", "bases")},
        ErrorIfCRDPathMissing: true,
    }

    var err error
    cfg, err = testEnv.Start()
    Expect(err).NotTo(HaveOccurred())
    Expect(cfg).NotTo(BeNil())

    err = webappv1.AddToScheme(scheme.Scheme)
    Expect(err).NotTo(HaveOccurred())

    k8sClient, err = client.New(cfg, client.Options{Scheme: scheme.Scheme})
    Expect(err).NotTo(HaveOccurred())
    Expect(k8sClient).NotTo(BeNil())

    // Start the controller manager
    mgr, err := ctrl.NewManager(cfg, ctrl.Options{
        Scheme: scheme.Scheme,
    })
    Expect(err).NotTo(HaveOccurred())

    err = (&WebAppReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr)
    Expect(err).NotTo(HaveOccurred())

    go func() {
        defer GinkgoRecover()
        err = mgr.Start(ctx)
        Expect(err).NotTo(HaveOccurred())
    }()
})

var _ = AfterSuite(func() {
    cancel()
    By("tearing down the test environment")
    err := testEnv.Stop()
    Expect(err).NotTo(HaveOccurred())
})

var _ = Describe("WebApp Controller", func() {
    const (
        timeout  = time.Second * 10
        interval = time.Millisecond * 250
    )

    Context("When creating a WebApp", func() {
        It("Should create Deployment and Service", func() {
            webapp := &webappv1.WebApp{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "test-webapp",
                    Namespace: "default",
                },
                Spec: webappv1.WebAppSpec{
                    Image:    "nginx:latest",
                    Replicas: 2,
                    Port:     8080,
                },
            }

            Expect(k8sClient.Create(ctx, webapp)).Should(Succeed())

            // Wait for Deployment to be created
            deploymentKey := types.NamespacedName{Name: "test-webapp", Namespace: "default"}
            createdDeployment := &appsv1.Deployment{}

            Eventually(func() bool {
                err := k8sClient.Get(ctx, deploymentKey, createdDeployment)
                return err == nil
            }, timeout, interval).Should(BeTrue())

            Expect(*createdDeployment.Spec.Replicas).Should(Equal(int32(2)))
        })
    })
})
```

## Deploying Your Controller

Create a Dockerfile to containerize your controller.

```dockerfile
# Dockerfile
FROM golang:1.22 as builder

WORKDIR /workspace
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -o manager main.go

FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=builder /workspace/manager .
USER 65532:65532

ENTRYPOINT ["/manager"]
```

Deploy to Kubernetes with proper RBAC permissions.

```yaml
# config/rbac/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: webapp-controller-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "services"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["webapp.example.com"]
  resources: ["webapps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["webapp.example.com"]
  resources: ["webapps/status"]
  verbs: ["get", "update", "patch"]
- apiGroups: ["webapp.example.com"]
  resources: ["webapps/finalizers"]
  verbs: ["update"]
```

## Best Practices

### Error Handling

| Scenario | Recommended Action |
|----------|-------------------|
| Transient error (network timeout) | Return error to trigger requeue with backoff |
| Permanent error (invalid spec) | Log error, update status, return nil |
| External dependency unavailable | Return error with RequeueAfter |
| Resource not found | Return nil, no requeue needed |

### Performance Considerations

1. **Use informer caches** - The client provided by controller-runtime uses cached reads by default. Only use direct API calls when you need the latest state.

2. **Limit reconciliation scope** - Use predicates to filter events and reduce unnecessary reconciliations.

3. **Set appropriate rate limits** - Configure the work queue rate limiter based on your workload.

4. **Use owner references** - Let Kubernetes handle garbage collection instead of implementing custom cleanup.

### Common Pitfalls

1. **Forgetting idempotency** - Your reconciler may run multiple times for the same state. Ensure operations are idempotent.

2. **Status update conflicts** - Always fetch the latest resource before updating status.

3. **Missing RBAC permissions** - Controllers need explicit permissions for every API operation.

4. **Infinite reconciliation loops** - Avoid triggering reconciliation from status updates by using the status subresource.

## Summary

Building custom Kubernetes controllers requires understanding the reconciliation pattern, proper resource management, and thorough testing. The controller-runtime library simplifies many common tasks, letting you focus on your business logic.

Key takeaways:

- Controllers watch resources and reconcile actual state with desired state
- Owner references enable automatic garbage collection
- Finalizers allow cleanup of external resources
- Status subresources prevent reconciliation loops
- Integration testing with envtest catches issues early

The complete source code for this controller is available on GitHub. Start with a simple controller and gradually add features as you become more comfortable with the patterns.
