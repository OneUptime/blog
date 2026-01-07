# How to Build Kubernetes Operators in Go with Kubebuilder

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Kubernetes, Operators, Kubebuilder, CRD, DevOps

Description: Build Kubernetes operators in Go using Kubebuilder with Custom Resource Definitions, controllers, and reconciliation loops.

---

Kubernetes operators extend the platform's capabilities by automating complex application lifecycle management. They encode operational knowledge into software, enabling Kubernetes to manage stateful applications, databases, and custom infrastructure components. In this comprehensive guide, we will explore how to build Kubernetes operators in Go using Kubebuilder, the official SDK for building operators.

## Understanding the Operator Pattern

The operator pattern is a method of packaging, deploying, and managing Kubernetes applications. An operator is a custom controller that watches for specific custom resources and takes action to bring the actual state of the cluster in line with the desired state specified in those resources.

### Key Components of an Operator

1. **Custom Resource Definition (CRD)**: Extends the Kubernetes API with new resource types
2. **Controller**: Watches for changes to resources and reconciles state
3. **Reconciliation Loop**: The core logic that ensures desired state matches actual state
4. **Finalizers**: Enable cleanup logic before resource deletion
5. **Status Subresource**: Reports the current state of managed resources

### Why Use Operators?

Operators are particularly valuable when you need to:

- Automate day-2 operations (backup, restore, scaling, upgrades)
- Manage stateful applications that require specific operational knowledge
- Encode complex deployment and configuration logic
- Provide self-healing capabilities for your applications

## Prerequisites

Before we begin, ensure you have the following installed:

- Go 1.21 or later
- Docker (for building container images)
- kubectl configured to access a Kubernetes cluster
- kind or minikube for local development
- Kubebuilder v3.x or later

### Installing Kubebuilder

Download and install Kubebuilder on your system:

```bash
# Download the latest release
curl -L -o kubebuilder "https://go.kubebuilder.io/dl/latest/$(go env GOOS)/$(go env GOARCH)"

# Make it executable and move to PATH
chmod +x kubebuilder
sudo mv kubebuilder /usr/local/bin/
```

Verify the installation:

```bash
kubebuilder version
```

## Project Scaffolding with Kubebuilder

Let us create a new operator project. We will build an operator that manages a custom application called "WebApp" which represents a web application deployment with automatic scaling and health monitoring.

### Initialize the Project

Create a new directory and initialize the Kubebuilder project:

```bash
# Create project directory
mkdir webapp-operator
cd webapp-operator

# Initialize the project with the domain and repo
kubebuilder init --domain example.com --repo github.com/example/webapp-operator
```

This command generates the following structure:

```
webapp-operator/
├── Dockerfile
├── Makefile
├── PROJECT
├── config/
│   ├── default/
│   ├── manager/
│   ├── prometheus/
│   └── rbac/
├── go.mod
├── go.sum
├── hack/
│   └── boilerplate.go.txt
└── main.go
```

### Create an API (CRD and Controller)

Generate the API scaffolding for our WebApp resource:

```bash
# Create API with CRD and controller
kubebuilder create api --group apps --version v1alpha1 --kind WebApp
```

When prompted, answer "y" to both questions to generate the resource and controller.

## Defining Custom Resource Definitions (CRDs)

The CRD defines the schema for your custom resource. Kubebuilder uses Go struct tags to generate the OpenAPI schema for the CRD.

### The WebApp Spec

Edit the file `api/v1alpha1/webapp_types.go` to define the WebApp specification:

```go
// WebAppSpec defines the desired state of WebApp
// This struct contains all the configuration options that users can set
// when creating a WebApp custom resource
type WebAppSpec struct {
    // Image specifies the container image to deploy
    // +kubebuilder:validation:Required
    // +kubebuilder:validation:MinLength=1
    Image string `json:"image"`

    // Replicas is the desired number of pod replicas
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=100
    // +kubebuilder:default=1
    Replicas int32 `json:"replicas,omitempty"`

    // Port is the container port to expose
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=65535
    // +kubebuilder:default=8080
    Port int32 `json:"port,omitempty"`

    // Resources defines the CPU and memory resource requirements
    // +optional
    Resources ResourceRequirements `json:"resources,omitempty"`

    // HealthCheck defines the health check configuration
    // +optional
    HealthCheck *HealthCheckConfig `json:"healthCheck,omitempty"`

    // Environment variables to set in the container
    // +optional
    Env []EnvVar `json:"env,omitempty"`

    // Suspend indicates whether the WebApp should be suspended
    // When true, the operator will scale down the deployment to 0
    // +kubebuilder:default=false
    Suspend bool `json:"suspend,omitempty"`
}

// ResourceRequirements defines CPU and memory limits
type ResourceRequirements struct {
    // CPULimit is the maximum CPU cores (e.g., "500m" or "2")
    // +kubebuilder:validation:Pattern=`^(\d+m?|\d+\.\d+)$`
    CPULimit string `json:"cpuLimit,omitempty"`

    // MemoryLimit is the maximum memory (e.g., "128Mi" or "1Gi")
    // +kubebuilder:validation:Pattern=`^(\d+)(Ki|Mi|Gi|Ti)?$`
    MemoryLimit string `json:"memoryLimit,omitempty"`

    // CPURequest is the requested CPU cores
    CPURequest string `json:"cpuRequest,omitempty"`

    // MemoryRequest is the requested memory
    MemoryRequest string `json:"memoryRequest,omitempty"`
}

// HealthCheckConfig defines health check settings
type HealthCheckConfig struct {
    // Path is the HTTP path for health checks
    // +kubebuilder:default="/health"
    Path string `json:"path,omitempty"`

    // InitialDelaySeconds is the delay before first check
    // +kubebuilder:validation:Minimum=0
    // +kubebuilder:default=10
    InitialDelaySeconds int32 `json:"initialDelaySeconds,omitempty"`

    // PeriodSeconds is the interval between checks
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:default=10
    PeriodSeconds int32 `json:"periodSeconds,omitempty"`
}

// EnvVar represents an environment variable
type EnvVar struct {
    // Name of the environment variable
    Name string `json:"name"`

    // Value of the environment variable
    Value string `json:"value"`
}
```

### The WebApp Status

Define the status subresource to report the current state:

```go
// WebAppStatus defines the observed state of WebApp
// The status subresource is updated by the controller to reflect
// the actual state of the managed resources
type WebAppStatus struct {
    // Phase represents the current lifecycle phase of the WebApp
    // +kubebuilder:validation:Enum=Pending;Running;Failed;Suspended
    Phase string `json:"phase,omitempty"`

    // ReadyReplicas is the number of pods that are ready
    ReadyReplicas int32 `json:"readyReplicas,omitempty"`

    // AvailableReplicas is the number of available pods
    AvailableReplicas int32 `json:"availableReplicas,omitempty"`

    // LastReconcileTime is the timestamp of the last reconciliation
    LastReconcileTime *metav1.Time `json:"lastReconcileTime,omitempty"`

    // Conditions represent the latest available observations
    // +patchMergeKey=type
    // +patchStrategy=merge
    // +listType=map
    // +listMapKey=type
    Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`

    // Message provides additional information about the current state
    Message string `json:"message,omitempty"`

    // ObservedGeneration is the most recently observed generation
    ObservedGeneration int64 `json:"observedGeneration,omitempty"`
}

// Phase constants for WebApp
const (
    PhasePending   = "Pending"
    PhaseRunning   = "Running"
    PhaseFailed    = "Failed"
    PhaseSuspended = "Suspended"
)

// Condition types for WebApp
const (
    ConditionTypeReady       = "Ready"
    ConditionTypeProgressing = "Progressing"
    ConditionTypeDegraded    = "Degraded"
)
```

### Update the WebApp Struct

Complete the WebApp struct with markers for subresources:

```go
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Ready",type=integer,JSONPath=`.status.readyReplicas`
// +kubebuilder:printcolumn:name="Desired",type=integer,JSONPath=`.spec.replicas`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
// +kubebuilder:resource:shortName=wa

// WebApp is the Schema for the webapps API
// It represents a web application that the operator will manage
type WebApp struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   WebAppSpec   `json:"spec,omitempty"`
    Status WebAppStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// WebAppList contains a list of WebApp
type WebAppList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []WebApp `json:"items"`
}

func init() {
    SchemeBuilder.Register(&WebApp{}, &WebAppList{})
}
```

### Generate CRD Manifests

After defining the types, generate the CRD manifests:

```bash
# Generate CRD manifests and deepcopy functions
make generate
make manifests
```

## Implementing the Reconciliation Loop

The reconciliation loop is the heart of any operator. It continuously watches for changes and ensures the actual state matches the desired state.

### Understanding Reconciliation

The reconcile function is called whenever:
- A watched resource is created, updated, or deleted
- A dependent resource changes
- A periodic resync occurs
- An error occurred in a previous reconciliation

### The Controller Structure

Edit `internal/controller/webapp_controller.go`:

```go
package controller

import (
    "context"
    "fmt"
    "time"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    "k8s.io/apimachinery/pkg/api/meta"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/types"
    "k8s.io/apimachinery/pkg/util/intstr"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
    "sigs.k8s.io/controller-runtime/pkg/log"

    appsv1alpha1 "github.com/example/webapp-operator/api/v1alpha1"
)

// Finalizer name for cleanup logic
const webAppFinalizer = "apps.example.com/finalizer"

// WebAppReconciler reconciles a WebApp object
// It watches for WebApp custom resources and manages the underlying
// Kubernetes resources (Deployments, Services) to match the desired state
type WebAppReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=apps.example.com,resources=webapps,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps.example.com,resources=webapps/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=apps.example.com,resources=webapps/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=core,resources=events,verbs=create;patch

// Reconcile is the main reconciliation loop that brings actual state
// in line with desired state for WebApp resources
func (r *WebAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)
    logger.Info("Reconciling WebApp", "namespacedName", req.NamespacedName)

    // Fetch the WebApp instance
    webapp := &appsv1alpha1.WebApp{}
    if err := r.Get(ctx, req.NamespacedName, webapp); err != nil {
        if errors.IsNotFound(err) {
            // Resource not found, likely deleted
            logger.Info("WebApp resource not found, ignoring")
            return ctrl.Result{}, nil
        }
        logger.Error(err, "Failed to fetch WebApp")
        return ctrl.Result{}, err
    }

    // Handle finalizer for cleanup
    if !webapp.DeletionTimestamp.IsZero() {
        return r.handleDeletion(ctx, webapp)
    }

    // Add finalizer if not present
    if !controllerutil.ContainsFinalizer(webapp, webAppFinalizer) {
        logger.Info("Adding finalizer to WebApp")
        controllerutil.AddFinalizer(webapp, webAppFinalizer)
        if err := r.Update(ctx, webapp); err != nil {
            return ctrl.Result{}, err
        }
        return ctrl.Result{Requeue: true}, nil
    }

    // Handle suspended state
    if webapp.Spec.Suspend {
        return r.handleSuspend(ctx, webapp)
    }

    // Reconcile Deployment
    if err := r.reconcileDeployment(ctx, webapp); err != nil {
        r.updateStatus(ctx, webapp, appsv1alpha1.PhaseFailed, err.Error())
        return ctrl.Result{}, err
    }

    // Reconcile Service
    if err := r.reconcileService(ctx, webapp); err != nil {
        r.updateStatus(ctx, webapp, appsv1alpha1.PhaseFailed, err.Error())
        return ctrl.Result{}, err
    }

    // Update status based on deployment state
    if err := r.updateStatusFromDeployment(ctx, webapp); err != nil {
        return ctrl.Result{}, err
    }

    logger.Info("Successfully reconciled WebApp")
    return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}
```

### Reconciling the Deployment

Add the deployment reconciliation logic:

```go
// reconcileDeployment ensures a Deployment exists matching the WebApp spec
// It creates the Deployment if it doesn't exist, or updates it if the spec changed
func (r *WebAppReconciler) reconcileDeployment(ctx context.Context, webapp *appsv1alpha1.WebApp) error {
    logger := log.FromContext(ctx)

    // Build the desired Deployment
    deployment := r.buildDeployment(webapp)

    // Set WebApp as the owner of the Deployment
    // This ensures the Deployment is garbage collected when WebApp is deleted
    if err := controllerutil.SetControllerReference(webapp, deployment, r.Scheme); err != nil {
        return fmt.Errorf("failed to set controller reference: %w", err)
    }

    // Check if Deployment already exists
    existing := &appsv1.Deployment{}
    err := r.Get(ctx, types.NamespacedName{
        Name:      deployment.Name,
        Namespace: deployment.Namespace,
    }, existing)

    if err != nil && errors.IsNotFound(err) {
        // Create new Deployment
        logger.Info("Creating Deployment", "name", deployment.Name)
        if err := r.Create(ctx, deployment); err != nil {
            return fmt.Errorf("failed to create deployment: %w", err)
        }
        return nil
    } else if err != nil {
        return fmt.Errorf("failed to get deployment: %w", err)
    }

    // Update existing Deployment if needed
    if needsUpdate(existing, deployment) {
        logger.Info("Updating Deployment", "name", deployment.Name)
        existing.Spec = deployment.Spec
        if err := r.Update(ctx, existing); err != nil {
            return fmt.Errorf("failed to update deployment: %w", err)
        }
    }

    return nil
}

// buildDeployment constructs a Deployment resource from WebApp spec
// This function translates the WebApp configuration into Kubernetes objects
func (r *WebAppReconciler) buildDeployment(webapp *appsv1alpha1.WebApp) *appsv1.Deployment {
    labels := map[string]string{
        "app":                          webapp.Name,
        "app.kubernetes.io/name":       webapp.Name,
        "app.kubernetes.io/managed-by": "webapp-operator",
        "app.kubernetes.io/instance":   webapp.Name,
    }

    replicas := webapp.Spec.Replicas
    if replicas == 0 {
        replicas = 1
    }

    // Build container definition
    container := corev1.Container{
        Name:  "webapp",
        Image: webapp.Spec.Image,
        Ports: []corev1.ContainerPort{
            {
                Name:          "http",
                ContainerPort: webapp.Spec.Port,
                Protocol:      corev1.ProtocolTCP,
            },
        },
    }

    // Add environment variables
    for _, env := range webapp.Spec.Env {
        container.Env = append(container.Env, corev1.EnvVar{
            Name:  env.Name,
            Value: env.Value,
        })
    }

    // Configure resource limits if specified
    if webapp.Spec.Resources.CPULimit != "" || webapp.Spec.Resources.MemoryLimit != "" {
        container.Resources = corev1.ResourceRequirements{
            Limits:   corev1.ResourceList{},
            Requests: corev1.ResourceList{},
        }

        if webapp.Spec.Resources.CPULimit != "" {
            container.Resources.Limits[corev1.ResourceCPU] = resource.MustParse(webapp.Spec.Resources.CPULimit)
        }
        if webapp.Spec.Resources.MemoryLimit != "" {
            container.Resources.Limits[corev1.ResourceMemory] = resource.MustParse(webapp.Spec.Resources.MemoryLimit)
        }
        if webapp.Spec.Resources.CPURequest != "" {
            container.Resources.Requests[corev1.ResourceCPU] = resource.MustParse(webapp.Spec.Resources.CPURequest)
        }
        if webapp.Spec.Resources.MemoryRequest != "" {
            container.Resources.Requests[corev1.ResourceMemory] = resource.MustParse(webapp.Spec.Resources.MemoryRequest)
        }
    }

    // Configure health checks if specified
    if webapp.Spec.HealthCheck != nil {
        path := webapp.Spec.HealthCheck.Path
        if path == "" {
            path = "/health"
        }

        probe := &corev1.Probe{
            ProbeHandler: corev1.ProbeHandler{
                HTTPGet: &corev1.HTTPGetAction{
                    Path: path,
                    Port: intstr.FromInt(int(webapp.Spec.Port)),
                },
            },
            InitialDelaySeconds: webapp.Spec.HealthCheck.InitialDelaySeconds,
            PeriodSeconds:       webapp.Spec.HealthCheck.PeriodSeconds,
        }

        container.LivenessProbe = probe
        container.ReadinessProbe = probe.DeepCopy()
    }

    return &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      webapp.Name,
            Namespace: webapp.Namespace,
            Labels:    labels,
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &replicas,
            Selector: &metav1.LabelSelector{
                MatchLabels: map[string]string{"app": webapp.Name},
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: labels,
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{container},
                },
            },
        },
    }
}
```

### Reconciling the Service

Add service reconciliation:

```go
// reconcileService ensures a Service exists for the WebApp
// The Service provides stable networking for the Deployment pods
func (r *WebAppReconciler) reconcileService(ctx context.Context, webapp *appsv1alpha1.WebApp) error {
    logger := log.FromContext(ctx)

    service := r.buildService(webapp)

    // Set ownership reference
    if err := controllerutil.SetControllerReference(webapp, service, r.Scheme); err != nil {
        return fmt.Errorf("failed to set controller reference: %w", err)
    }

    // Check if Service exists
    existing := &corev1.Service{}
    err := r.Get(ctx, types.NamespacedName{
        Name:      service.Name,
        Namespace: service.Namespace,
    }, existing)

    if err != nil && errors.IsNotFound(err) {
        logger.Info("Creating Service", "name", service.Name)
        if err := r.Create(ctx, service); err != nil {
            return fmt.Errorf("failed to create service: %w", err)
        }
        return nil
    } else if err != nil {
        return fmt.Errorf("failed to get service: %w", err)
    }

    // Update Service if port changed
    if existing.Spec.Ports[0].Port != webapp.Spec.Port {
        logger.Info("Updating Service", "name", service.Name)
        existing.Spec.Ports[0].Port = webapp.Spec.Port
        existing.Spec.Ports[0].TargetPort = intstr.FromInt(int(webapp.Spec.Port))
        if err := r.Update(ctx, existing); err != nil {
            return fmt.Errorf("failed to update service: %w", err)
        }
    }

    return nil
}

// buildService constructs a Service resource for the WebApp
func (r *WebAppReconciler) buildService(webapp *appsv1alpha1.WebApp) *corev1.Service {
    return &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      webapp.Name,
            Namespace: webapp.Namespace,
            Labels: map[string]string{
                "app":                          webapp.Name,
                "app.kubernetes.io/managed-by": "webapp-operator",
            },
        },
        Spec: corev1.ServiceSpec{
            Selector: map[string]string{"app": webapp.Name},
            Ports: []corev1.ServicePort{
                {
                    Name:       "http",
                    Protocol:   corev1.ProtocolTCP,
                    Port:       webapp.Spec.Port,
                    TargetPort: intstr.FromInt(int(webapp.Spec.Port)),
                },
            },
            Type: corev1.ServiceTypeClusterIP,
        },
    }
}

// needsUpdate checks if the Deployment needs to be updated
func needsUpdate(existing, desired *appsv1.Deployment) bool {
    // Compare replicas
    if *existing.Spec.Replicas != *desired.Spec.Replicas {
        return true
    }

    // Compare container image
    if len(existing.Spec.Template.Spec.Containers) > 0 &&
        len(desired.Spec.Template.Spec.Containers) > 0 {
        if existing.Spec.Template.Spec.Containers[0].Image !=
            desired.Spec.Template.Spec.Containers[0].Image {
            return true
        }
    }

    return false
}
```

## Status Subresource Updates

Updating the status subresource is crucial for reporting the current state of managed resources.

### Status Update Methods

```go
// updateStatus updates the WebApp status subresource
// This method is called to reflect changes in the managed resources
func (r *WebAppReconciler) updateStatus(ctx context.Context, webapp *appsv1alpha1.WebApp, phase, message string) error {
    logger := log.FromContext(ctx)

    // Get fresh copy to avoid conflicts
    latest := &appsv1alpha1.WebApp{}
    if err := r.Get(ctx, types.NamespacedName{
        Name:      webapp.Name,
        Namespace: webapp.Namespace,
    }, latest); err != nil {
        return err
    }

    // Update status fields
    now := metav1.Now()
    latest.Status.Phase = phase
    latest.Status.Message = message
    latest.Status.LastReconcileTime = &now
    latest.Status.ObservedGeneration = latest.Generation

    // Update conditions based on phase
    condition := metav1.Condition{
        Type:               appsv1alpha1.ConditionTypeReady,
        Status:             metav1.ConditionFalse,
        ObservedGeneration: latest.Generation,
        LastTransitionTime: now,
        Reason:             phase,
        Message:            message,
    }

    if phase == appsv1alpha1.PhaseRunning {
        condition.Status = metav1.ConditionTrue
    }

    meta.SetStatusCondition(&latest.Status.Conditions, condition)

    logger.Info("Updating WebApp status", "phase", phase)
    return r.Status().Update(ctx, latest)
}

// updateStatusFromDeployment reads deployment status and updates WebApp status
// This provides users visibility into the actual state of their application
func (r *WebAppReconciler) updateStatusFromDeployment(ctx context.Context, webapp *appsv1alpha1.WebApp) error {
    deployment := &appsv1.Deployment{}
    if err := r.Get(ctx, types.NamespacedName{
        Name:      webapp.Name,
        Namespace: webapp.Namespace,
    }, deployment); err != nil {
        return err
    }

    // Get fresh copy
    latest := &appsv1alpha1.WebApp{}
    if err := r.Get(ctx, types.NamespacedName{
        Name:      webapp.Name,
        Namespace: webapp.Namespace,
    }, latest); err != nil {
        return err
    }

    // Update replica counts
    latest.Status.ReadyReplicas = deployment.Status.ReadyReplicas
    latest.Status.AvailableReplicas = deployment.Status.AvailableReplicas

    // Determine phase based on deployment status
    now := metav1.Now()
    latest.Status.LastReconcileTime = &now
    latest.Status.ObservedGeneration = latest.Generation

    if deployment.Status.ReadyReplicas == *deployment.Spec.Replicas {
        latest.Status.Phase = appsv1alpha1.PhaseRunning
        latest.Status.Message = "All replicas are ready"
    } else if deployment.Status.ReadyReplicas > 0 {
        latest.Status.Phase = appsv1alpha1.PhaseRunning
        latest.Status.Message = fmt.Sprintf("%d/%d replicas ready",
            deployment.Status.ReadyReplicas, *deployment.Spec.Replicas)
    } else {
        latest.Status.Phase = appsv1alpha1.PhasePending
        latest.Status.Message = "Waiting for replicas to become ready"
    }

    // Update Ready condition
    readyCondition := metav1.Condition{
        Type:               appsv1alpha1.ConditionTypeReady,
        ObservedGeneration: latest.Generation,
        LastTransitionTime: now,
    }

    if deployment.Status.ReadyReplicas == *deployment.Spec.Replicas {
        readyCondition.Status = metav1.ConditionTrue
        readyCondition.Reason = "AllReplicasReady"
        readyCondition.Message = "All replicas are ready and serving traffic"
    } else {
        readyCondition.Status = metav1.ConditionFalse
        readyCondition.Reason = "ReplicasNotReady"
        readyCondition.Message = fmt.Sprintf("%d/%d replicas ready",
            deployment.Status.ReadyReplicas, *deployment.Spec.Replicas)
    }

    meta.SetStatusCondition(&latest.Status.Conditions, readyCondition)

    return r.Status().Update(ctx, latest)
}
```

## Handling Finalizers for Cleanup

Finalizers prevent resource deletion until cleanup logic completes. They are essential for managing external resources or performing cleanup operations.

### Finalizer Implementation

```go
// handleDeletion performs cleanup when WebApp is being deleted
// Finalizers ensure we can clean up external resources before the object is removed
func (r *WebAppReconciler) handleDeletion(ctx context.Context, webapp *appsv1alpha1.WebApp) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    if controllerutil.ContainsFinalizer(webapp, webAppFinalizer) {
        logger.Info("Performing cleanup for WebApp", "name", webapp.Name)

        // Perform cleanup operations here
        // Examples:
        // - Delete external resources (cloud load balancers, DNS entries)
        // - Clean up external databases or caches
        // - Revoke certificates or credentials
        // - Send notifications

        if err := r.cleanupExternalResources(ctx, webapp); err != nil {
            // If cleanup fails, requeue to retry
            logger.Error(err, "Failed to cleanup external resources")
            return ctrl.Result{RequeueAfter: 10 * time.Second}, err
        }

        // Remove finalizer after successful cleanup
        logger.Info("Removing finalizer from WebApp")
        controllerutil.RemoveFinalizer(webapp, webAppFinalizer)
        if err := r.Update(ctx, webapp); err != nil {
            return ctrl.Result{}, err
        }
    }

    return ctrl.Result{}, nil
}

// cleanupExternalResources handles cleanup of any external resources
// This is called during deletion before the finalizer is removed
func (r *WebAppReconciler) cleanupExternalResources(ctx context.Context, webapp *appsv1alpha1.WebApp) error {
    logger := log.FromContext(ctx)

    // Example: Clean up metrics
    logger.Info("Cleaning up metrics for WebApp", "name", webapp.Name)

    // Example: Remove from service mesh
    logger.Info("Removing from service mesh", "name", webapp.Name)

    // Example: Clean up external DNS
    logger.Info("Cleaning up external DNS entries", "name", webapp.Name)

    // Add your cleanup logic here
    // Return an error if cleanup fails to retry

    return nil
}

// handleSuspend scales down the deployment when WebApp is suspended
func (r *WebAppReconciler) handleSuspend(ctx context.Context, webapp *appsv1alpha1.WebApp) (ctrl.Result, error) {
    logger := log.FromContext(ctx)
    logger.Info("WebApp is suspended, scaling down", "name", webapp.Name)

    // Get the deployment
    deployment := &appsv1.Deployment{}
    err := r.Get(ctx, types.NamespacedName{
        Name:      webapp.Name,
        Namespace: webapp.Namespace,
    }, deployment)

    if err != nil && !errors.IsNotFound(err) {
        return ctrl.Result{}, err
    }

    // Scale to zero if deployment exists
    if err == nil && *deployment.Spec.Replicas != 0 {
        zero := int32(0)
        deployment.Spec.Replicas = &zero
        if err := r.Update(ctx, deployment); err != nil {
            return ctrl.Result{}, err
        }
    }

    // Update status
    r.updateStatus(ctx, webapp, appsv1alpha1.PhaseSuspended, "WebApp is suspended")

    return ctrl.Result{RequeueAfter: 60 * time.Second}, nil
}
```

### Setting Up the Controller

Configure the controller to watch resources:

```go
// SetupWithManager sets up the controller with the Manager
// This configures which resources the controller watches and how
func (r *WebAppReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&appsv1alpha1.WebApp{}).
        // Watch Deployments owned by WebApp
        Owns(&appsv1.Deployment{}).
        // Watch Services owned by WebApp
        Owns(&corev1.Service{}).
        Complete(r)
}
```

## Testing Operators

Testing is critical for operator reliability. Kubebuilder provides integration with envtest for testing against a real API server.

### Unit Testing the Controller

Create `internal/controller/webapp_controller_test.go`:

```go
package controller

import (
    "context"
    "time"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/types"

    appsv1alpha1 "github.com/example/webapp-operator/api/v1alpha1"
)

var _ = Describe("WebApp Controller", func() {
    const (
        WebAppName      = "test-webapp"
        WebAppNamespace = "default"
        timeout         = time.Second * 30
        interval        = time.Millisecond * 250
    )

    Context("When creating a WebApp", func() {
        It("Should create a Deployment and Service", func() {
            ctx := context.Background()

            // Create WebApp resource
            webapp := &appsv1alpha1.WebApp{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      WebAppName,
                    Namespace: WebAppNamespace,
                },
                Spec: appsv1alpha1.WebAppSpec{
                    Image:    "nginx:latest",
                    Replicas: 2,
                    Port:     8080,
                },
            }

            Expect(k8sClient.Create(ctx, webapp)).Should(Succeed())

            // Verify WebApp was created
            webappLookupKey := types.NamespacedName{
                Name:      WebAppName,
                Namespace: WebAppNamespace,
            }
            createdWebApp := &appsv1alpha1.WebApp{}

            Eventually(func() bool {
                err := k8sClient.Get(ctx, webappLookupKey, createdWebApp)
                return err == nil
            }, timeout, interval).Should(BeTrue())

            // Verify Deployment was created
            deploymentLookupKey := types.NamespacedName{
                Name:      WebAppName,
                Namespace: WebAppNamespace,
            }
            createdDeployment := &appsv1.Deployment{}

            Eventually(func() bool {
                err := k8sClient.Get(ctx, deploymentLookupKey, createdDeployment)
                return err == nil
            }, timeout, interval).Should(BeTrue())

            Expect(*createdDeployment.Spec.Replicas).Should(Equal(int32(2)))
            Expect(createdDeployment.Spec.Template.Spec.Containers[0].Image).Should(Equal("nginx:latest"))

            // Verify Service was created
            serviceLookupKey := types.NamespacedName{
                Name:      WebAppName,
                Namespace: WebAppNamespace,
            }
            createdService := &corev1.Service{}

            Eventually(func() bool {
                err := k8sClient.Get(ctx, serviceLookupKey, createdService)
                return err == nil
            }, timeout, interval).Should(BeTrue())

            Expect(createdService.Spec.Ports[0].Port).Should(Equal(int32(8080)))
        })
    })

    Context("When updating a WebApp", func() {
        It("Should update the Deployment replicas", func() {
            ctx := context.Background()

            webappLookupKey := types.NamespacedName{
                Name:      WebAppName,
                Namespace: WebAppNamespace,
            }
            webapp := &appsv1alpha1.WebApp{}

            Expect(k8sClient.Get(ctx, webappLookupKey, webapp)).Should(Succeed())

            // Update replicas
            webapp.Spec.Replicas = 5
            Expect(k8sClient.Update(ctx, webapp)).Should(Succeed())

            // Verify Deployment was updated
            deploymentLookupKey := types.NamespacedName{
                Name:      WebAppName,
                Namespace: WebAppNamespace,
            }

            Eventually(func() int32 {
                deployment := &appsv1.Deployment{}
                err := k8sClient.Get(ctx, deploymentLookupKey, deployment)
                if err != nil {
                    return 0
                }
                return *deployment.Spec.Replicas
            }, timeout, interval).Should(Equal(int32(5)))
        })
    })

    Context("When suspending a WebApp", func() {
        It("Should scale down the Deployment to zero", func() {
            ctx := context.Background()

            webappLookupKey := types.NamespacedName{
                Name:      WebAppName,
                Namespace: WebAppNamespace,
            }
            webapp := &appsv1alpha1.WebApp{}

            Expect(k8sClient.Get(ctx, webappLookupKey, webapp)).Should(Succeed())

            // Suspend the WebApp
            webapp.Spec.Suspend = true
            Expect(k8sClient.Update(ctx, webapp)).Should(Succeed())

            // Verify Deployment was scaled to zero
            deploymentLookupKey := types.NamespacedName{
                Name:      WebAppName,
                Namespace: WebAppNamespace,
            }

            Eventually(func() int32 {
                deployment := &appsv1.Deployment{}
                err := k8sClient.Get(ctx, deploymentLookupKey, deployment)
                if err != nil {
                    return -1
                }
                return *deployment.Spec.Replicas
            }, timeout, interval).Should(Equal(int32(0)))

            // Verify status shows suspended
            Eventually(func() string {
                wa := &appsv1alpha1.WebApp{}
                err := k8sClient.Get(ctx, webappLookupKey, wa)
                if err != nil {
                    return ""
                }
                return wa.Status.Phase
            }, timeout, interval).Should(Equal(appsv1alpha1.PhaseSuspended))
        })
    })

    Context("When deleting a WebApp", func() {
        It("Should clean up owned resources", func() {
            ctx := context.Background()

            webappLookupKey := types.NamespacedName{
                Name:      WebAppName,
                Namespace: WebAppNamespace,
            }
            webapp := &appsv1alpha1.WebApp{}

            Expect(k8sClient.Get(ctx, webappLookupKey, webapp)).Should(Succeed())

            // Delete the WebApp
            Expect(k8sClient.Delete(ctx, webapp)).Should(Succeed())

            // Verify WebApp is eventually deleted
            Eventually(func() bool {
                err := k8sClient.Get(ctx, webappLookupKey, &appsv1alpha1.WebApp{})
                return err != nil
            }, timeout, interval).Should(BeTrue())

            // Verify Deployment is deleted (garbage collected)
            deploymentLookupKey := types.NamespacedName{
                Name:      WebAppName,
                Namespace: WebAppNamespace,
            }

            Eventually(func() bool {
                err := k8sClient.Get(ctx, deploymentLookupKey, &appsv1.Deployment{})
                return err != nil
            }, timeout, interval).Should(BeTrue())
        })
    })
})
```

### Running Tests

Execute the tests using the Makefile:

```bash
# Run all tests with envtest
make test

# Run tests with verbose output
make test TESTARGS="-v"
```

## Deploying the Operator

### Build and Push the Image

```bash
# Build the Docker image
make docker-build IMG=your-registry/webapp-operator:v1.0.0

# Push to container registry
make docker-push IMG=your-registry/webapp-operator:v1.0.0
```

### Deploy to Cluster

```bash
# Install CRDs
make install

# Deploy the operator
make deploy IMG=your-registry/webapp-operator:v1.0.0
```

### Create a WebApp Instance

Create a sample WebApp custom resource:

```yaml
# config/samples/apps_v1alpha1_webapp.yaml
apiVersion: apps.example.com/v1alpha1
kind: WebApp
metadata:
  name: my-webapp
  namespace: default
spec:
  image: nginx:1.25
  replicas: 3
  port: 80
  resources:
    cpuLimit: "500m"
    memoryLimit: "256Mi"
    cpuRequest: "100m"
    memoryRequest: "128Mi"
  healthCheck:
    path: /
    initialDelaySeconds: 5
    periodSeconds: 10
  env:
    - name: ENVIRONMENT
      value: production
```

Apply the resource:

```bash
kubectl apply -f config/samples/apps_v1alpha1_webapp.yaml

# Watch the WebApp status
kubectl get webapps -w

# View detailed information
kubectl describe webapp my-webapp
```

## Best Practices

### Idempotency

Ensure your reconciliation logic is idempotent. The same desired state should produce the same actual state regardless of how many times reconcile runs.

### Error Handling

Return errors appropriately to trigger retries. Use exponential backoff for transient failures:

```go
// Example: Return error for retry with backoff
if transientError {
    return ctrl.Result{RequeueAfter: time.Second * 30}, err
}

// Example: Requeue without error for non-failure cases
return ctrl.Result{RequeueAfter: time.Minute * 5}, nil
```

### Event Recording

Use the event recorder to create events that users can see with `kubectl describe`:

```go
// Add to reconciler struct
Recorder record.EventRecorder

// Use in reconcile method
r.Recorder.Event(webapp, corev1.EventTypeNormal, "Reconciled", "Successfully reconciled WebApp")
r.Recorder.Eventf(webapp, corev1.EventTypeWarning, "Error", "Failed to create deployment: %v", err)
```

### Metrics

Expose Prometheus metrics for observability:

```go
// Define custom metrics
var (
    webappsTotal = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "webapps_total",
            Help: "Total number of WebApp resources",
        },
        []string{"namespace"},
    )

    reconcileErrors = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "webapp_reconcile_errors_total",
            Help: "Total number of reconciliation errors",
        },
        []string{"namespace", "name"},
    )
)

func init() {
    metrics.Registry.MustRegister(webappsTotal, reconcileErrors)
}
```

## Conclusion

Building Kubernetes operators with Kubebuilder provides a structured approach to extending Kubernetes functionality. By following the operator pattern, you can automate complex operational tasks and encode domain-specific knowledge into your cluster management.

Key takeaways from this guide:

1. **CRDs define your API** - Design your spec carefully as it is your contract with users
2. **Reconciliation is the core** - Keep it idempotent and handle errors gracefully
3. **Status subresources** - Always report current state for observability
4. **Finalizers enable cleanup** - Use them for managing external resources
5. **Testing is essential** - Leverage envtest for integration testing
6. **Follow best practices** - Use events, metrics, and proper error handling

With these fundamentals, you can build operators that automate day-2 operations, manage stateful applications, and extend Kubernetes to meet your specific requirements.

## Further Reading

- [Kubebuilder Book](https://book.kubebuilder.io/)
- [Kubernetes API Conventions](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md)
- [Operator SDK](https://sdk.operatorframework.io/)
- [controller-runtime Documentation](https://pkg.go.dev/sigs.k8s.io/controller-runtime)
