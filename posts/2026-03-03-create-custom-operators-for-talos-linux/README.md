# How to Create Custom Operators for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Custom Operators, Operator SDK, Go, Controller

Description: A developer-focused guide to building custom Kubernetes Operators for Talos Linux using the Operator SDK and Go programming language.

---

While there are hundreds of pre-built Operators available, sometimes your organization needs an Operator tailored to its specific requirements. Building a custom Operator lets you automate domain-specific operational tasks that no off-the-shelf solution covers. On Talos Linux, custom Operators are especially powerful because they can encode your entire operational playbook into software that runs continuously in your cluster.

This guide walks through building a custom Kubernetes Operator from scratch using the Operator SDK and Go.

## When to Build a Custom Operator

You should consider building a custom Operator when:

- You have a complex application with specific deployment and operational requirements
- You find yourself repeatedly performing the same manual operations
- Your application has custom scaling, backup, or recovery logic
- You want to provide a simplified API for your development teams to deploy services
- No existing Operator meets your needs

## Prerequisites

- Go 1.21 or later installed
- Docker installed (for building images)
- `kubectl` configured for your Talos Linux cluster
- `operator-sdk` CLI installed

```bash
# Install the Operator SDK
brew install operator-sdk

# Or download directly
export ARCH=$(case $(uname -m) in x86_64) echo -n amd64 ;; aarch64) echo -n arm64 ;; esac)
export OS=$(uname | awk '{print tolower($0)}')
curl -LO https://github.com/operator-framework/operator-sdk/releases/download/v1.33.0/operator-sdk_${OS}_${ARCH}
chmod +x operator-sdk_${OS}_${ARCH}
sudo mv operator-sdk_${OS}_${ARCH} /usr/local/bin/operator-sdk

# Verify
operator-sdk version
```

## Scaffolding the Operator

Let us create an Operator that manages a custom "WebApp" resource. When a user creates a WebApp, the Operator will automatically create a Deployment, Service, and optionally an Ingress.

```bash
# Create the project
mkdir webapp-operator && cd webapp-operator

# Initialize the project
operator-sdk init --domain example.com --repo github.com/myorg/webapp-operator

# Create the API and controller
operator-sdk create api \
  --group apps \
  --version v1alpha1 \
  --kind WebApp \
  --resource --controller
```

This generates a project structure:

```
webapp-operator/
  api/v1alpha1/
    webapp_types.go      # Custom resource type definition
    groupversion_info.go
    zz_generated.deepcopy.go
  cmd/
    main.go             # Entry point
  config/               # Deployment manifests
  controllers/
    webapp_controller.go # Reconciliation logic
```

## Defining the Custom Resource

Edit the WebApp type definition to specify what fields users can set:

```go
// api/v1alpha1/webapp_types.go
package v1alpha1

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
    // +kubebuilder:validation:Maximum=20
    Replicas int32 `json:"replicas,omitempty"`

    // Port is the container port
    // +kubebuilder:default=8080
    Port int32 `json:"port,omitempty"`

    // Host is the hostname for the Ingress (optional)
    // +optional
    Host string `json:"host,omitempty"`

    // Resources defines CPU and memory requests/limits
    // +optional
    Resources *ResourceRequirements `json:"resources,omitempty"`
}

// ResourceRequirements defines resource requests and limits
type ResourceRequirements struct {
    CPURequest    string `json:"cpuRequest,omitempty"`
    MemoryRequest string `json:"memoryRequest,omitempty"`
    CPULimit      string `json:"cpuLimit,omitempty"`
    MemoryLimit   string `json:"memoryLimit,omitempty"`
}

// WebAppStatus defines the observed state of WebApp
type WebAppStatus struct {
    // AvailableReplicas is the number of ready pods
    AvailableReplicas int32 `json:"availableReplicas,omitempty"`

    // URL is the access URL for the application
    URL string `json:"url,omitempty"`

    // Conditions represent the latest observations
    Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Image",type=string,JSONPath=`.spec.image`
// +kubebuilder:printcolumn:name="Replicas",type=integer,JSONPath=`.spec.replicas`
// +kubebuilder:printcolumn:name="Available",type=integer,JSONPath=`.status.availableReplicas`
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// WebApp is the Schema for the webapps API
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

## Implementing the Controller

The controller contains the reconciliation logic - what should happen when a WebApp resource is created, updated, or deleted:

```go
// controllers/webapp_controller.go
package controllers

import (
    "context"
    "fmt"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    networkingv1 "k8s.io/api/networking/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/types"
    "k8s.io/apimachinery/pkg/util/intstr"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"

    appsv1alpha1 "github.com/myorg/webapp-operator/api/v1alpha1"
)

// WebAppReconciler reconciles a WebApp object
type WebAppReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=apps.example.com,resources=webapps,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps.example.com,resources=webapps/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete

func (r *WebAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    // Fetch the WebApp resource
    webapp := &appsv1alpha1.WebApp{}
    if err := r.Get(ctx, req.NamespacedName, webapp); err != nil {
        if errors.IsNotFound(err) {
            logger.Info("WebApp resource not found, likely deleted")
            return ctrl.Result{}, nil
        }
        return ctrl.Result{}, err
    }

    // Reconcile the Deployment
    if err := r.reconcileDeployment(ctx, webapp); err != nil {
        logger.Error(err, "Failed to reconcile Deployment")
        return ctrl.Result{}, err
    }

    // Reconcile the Service
    if err := r.reconcileService(ctx, webapp); err != nil {
        logger.Error(err, "Failed to reconcile Service")
        return ctrl.Result{}, err
    }

    // Reconcile Ingress if host is specified
    if webapp.Spec.Host != "" {
        if err := r.reconcileIngress(ctx, webapp); err != nil {
            logger.Error(err, "Failed to reconcile Ingress")
            return ctrl.Result{}, err
        }
    }

    // Update status
    if err := r.updateStatus(ctx, webapp); err != nil {
        logger.Error(err, "Failed to update status")
        return ctrl.Result{}, err
    }

    logger.Info("Successfully reconciled WebApp")
    return ctrl.Result{}, nil
}

func (r *WebAppReconciler) reconcileDeployment(ctx context.Context, webapp *appsv1alpha1.WebApp) error {
    deploy := &appsv1.Deployment{}
    err := r.Get(ctx, types.NamespacedName{Name: webapp.Name, Namespace: webapp.Namespace}, deploy)

    if errors.IsNotFound(err) {
        // Create a new Deployment
        deploy = r.buildDeployment(webapp)
        if err := ctrl.SetControllerReference(webapp, deploy, r.Scheme); err != nil {
            return err
        }
        return r.Create(ctx, deploy)
    }

    // Update existing Deployment
    deploy.Spec.Replicas = &webapp.Spec.Replicas
    deploy.Spec.Template.Spec.Containers[0].Image = webapp.Spec.Image
    return r.Update(ctx, deploy)
}

func (r *WebAppReconciler) buildDeployment(webapp *appsv1alpha1.WebApp) *appsv1.Deployment {
    labels := map[string]string{
        "app":        webapp.Name,
        "managed-by": "webapp-operator",
    }

    container := corev1.Container{
        Name:  "webapp",
        Image: webapp.Spec.Image,
        Ports: []corev1.ContainerPort{
            {ContainerPort: webapp.Spec.Port},
        },
    }

    // Set resource requirements if specified
    if webapp.Spec.Resources != nil {
        container.Resources = corev1.ResourceRequirements{
            Requests: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse(webapp.Spec.Resources.CPURequest),
                corev1.ResourceMemory: resource.MustParse(webapp.Spec.Resources.MemoryRequest),
            },
            Limits: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse(webapp.Spec.Resources.CPULimit),
                corev1.ResourceMemory: resource.MustParse(webapp.Spec.Resources.MemoryLimit),
            },
        }
    }

    return &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      webapp.Name,
            Namespace: webapp.Namespace,
            Labels:    labels,
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &webapp.Spec.Replicas,
            Selector: &metav1.LabelSelector{MatchLabels: labels},
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{Labels: labels},
                Spec:       corev1.PodSpec{Containers: []corev1.Container{container}},
            },
        },
    }
}

// SetupWithManager sets up the controller with the Manager
func (r *WebAppReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&appsv1alpha1.WebApp{}).
        Owns(&appsv1.Deployment{}).
        Owns(&corev1.Service{}).
        Complete(r)
}
```

## Building and Deploying

```bash
# Generate CRD manifests
make manifests

# Build the operator image
make docker-build IMG=registry.example.com/webapp-operator:v0.1.0

# Push to your registry
make docker-push IMG=registry.example.com/webapp-operator:v0.1.0

# Deploy to your Talos cluster
make deploy IMG=registry.example.com/webapp-operator:v0.1.0
```

Verify the deployment:

```bash
# Check the operator pod
kubectl get pods -n webapp-operator-system

# Verify CRDs are installed
kubectl get crd webapps.apps.example.com
```

## Using Your Custom Operator

Now users can create WebApp resources:

```yaml
# my-webapp.yaml
apiVersion: apps.example.com/v1alpha1
kind: WebApp
metadata:
  name: my-frontend
  namespace: default
spec:
  image: nginx:1.25
  replicas: 3
  port: 80
  host: frontend.example.com
  resources:
    cpuRequest: "100m"
    memoryRequest: "128Mi"
    cpuLimit: "500m"
    memoryLimit: "256Mi"
```

```bash
kubectl apply -f my-webapp.yaml

# Check the created resources
kubectl get webapp my-frontend
kubectl get deployment my-frontend
kubectl get service my-frontend
kubectl get ingress my-frontend
```

## Writing Tests

Test your Operator using the envtest framework:

```go
// controllers/webapp_controller_test.go
package controllers

import (
    "context"
    "time"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    appsv1 "k8s.io/api/apps/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/types"

    appsv1alpha1 "github.com/myorg/webapp-operator/api/v1alpha1"
)

var _ = Describe("WebApp Controller", func() {
    Context("When creating a WebApp", func() {
        It("Should create a Deployment", func() {
            ctx := context.Background()

            webapp := &appsv1alpha1.WebApp{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "test-webapp",
                    Namespace: "default",
                },
                Spec: appsv1alpha1.WebAppSpec{
                    Image:    "nginx:1.25",
                    Replicas: 2,
                    Port:     80,
                },
            }

            Expect(k8sClient.Create(ctx, webapp)).Should(Succeed())

            // Wait for the Deployment to be created
            deploy := &appsv1.Deployment{}
            Eventually(func() error {
                return k8sClient.Get(ctx, types.NamespacedName{
                    Name:      "test-webapp",
                    Namespace: "default",
                }, deploy)
            }, time.Second*10, time.Millisecond*250).Should(Succeed())

            Expect(*deploy.Spec.Replicas).Should(Equal(int32(2)))
        })
    })
})
```

```bash
# Run tests
make test
```

## Local Development and Debugging

During development, run the Operator locally against your Talos cluster:

```bash
# Run the operator locally (outside the cluster)
make install  # Install CRDs
make run      # Run the operator process locally

# In another terminal, create test resources
kubectl apply -f my-webapp.yaml
```

## Wrapping Up

Building custom Operators for Talos Linux lets you encode your operational expertise into software that runs continuously in your cluster. The Operator SDK handles the boilerplate, letting you focus on the reconciliation logic that makes your Operator valuable. Start simple - create a basic custom resource and controller - then gradually add features like status updates, event recording, and advanced lifecycle management. Test thoroughly with envtest before deploying to production, and monitor your Operator's logs and resource usage once it is running.
