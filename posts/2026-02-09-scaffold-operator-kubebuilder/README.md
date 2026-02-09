# How to Scaffold a Kubernetes Operator with Kubebuilder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubebuilder, Operator, Scaffolding

Description: Learn how to use Kubebuilder to scaffold a complete Kubernetes operator project with API types, controllers, webhooks, and deployment manifests.

---

Starting an operator from scratch means creating dozens of files. You need API types, controller boilerplate, RBAC manifests, CRD definitions, Dockerfiles, Makefiles, and deployment configurations. Get the structure wrong and you're fighting the tooling instead of building features.

Kubebuilder scaffolds all of this for you. One command creates a complete operator project following Kubernetes best practices. You get working code, complete with tests, CI configuration, and documentation. This guide shows you how to use Kubebuilder effectively.

## Installing Kubebuilder

Install Kubebuilder on your system.

```bash
# macOS
brew install kubebuilder

# Linux
curl -L -o kubebuilder https://go.kubebuilder.io/dl/latest/$(go env GOOS)/$(go env GOARCH)
chmod +x kubebuilder
sudo mv kubebuilder /usr/local/bin/
```

Verify installation.

```bash
kubebuilder version
```

## Initializing a New Project

Create a new operator project.

```bash
mkdir application-operator
cd application-operator

kubebuilder init \
    --domain example.com \
    --repo github.com/yourorg/application-operator \
    --owner "Your Name"
```

This creates the project structure.

```
application-operator/
├── Dockerfile
├── Makefile
├── PROJECT
├── README.md
├── cmd/
│   └── main.go
├── config/
│   ├── default/
│   ├── manager/
│   ├── prometheus/
│   └── rbac/
├── go.mod
├── go.sum
└── hack/
    └── boilerplate.go.txt
```

## Creating an API

Add a new API group, version, and kind.

```bash
kubebuilder create api \
    --group apps \
    --version v1 \
    --kind Application \
    --resource \
    --controller
```

This generates:

- API types in `api/v1/application_types.go`
- Controller in `controllers/application_controller.go`
- Sample CR in `config/samples/apps_v1_application.yaml`
- RBAC markers and manifests

## Defining the API Types

Edit the generated types to add your fields.

```go
// api/v1/application_types.go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ApplicationSpec struct {
    // Image is the container image to run
    // +kubebuilder:validation:Required
    Image string `json:"image"`

    // Replicas is the desired number of replicas
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=100
    // +kubebuilder:default=1
    Replicas int32 `json:"replicas,omitempty"`

    // Port is the container port to expose
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=65535
    Port int32 `json:"port"`

    // Environment variables
    // +optional
    Env []EnvVar `json:"env,omitempty"`
}

type EnvVar struct {
    Name  string `json:"name"`
    Value string `json:"value"`
}

type ApplicationStatus struct {
    // Phase represents the current state
    Phase string `json:"phase,omitempty"`

    // Ready indicates if the application is ready
    Ready bool `json:"ready,omitempty"`

    // Conditions represent observations
    Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Image",type=string,JSONPath=`.spec.image`
// +kubebuilder:printcolumn:name="Replicas",type=integer,JSONPath=`.spec.replicas`
// +kubebuilder:printcolumn:name="Ready",type=boolean,JSONPath=`.status.ready`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
type ApplicationList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []Application `json:"items"`
}

func init() {
    SchemeBuilder.Register(&Application{}, &ApplicationList{})
}
```

## Implementing the Controller

Fill in the reconciliation logic.

```go
// controllers/application_controller.go
package controllers

import (
    "context"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"

    appsexamplev1 "github.com/yourorg/application-operator/api/v1"
)

// +kubebuilder:rbac:groups=apps.example.com,resources=applications,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps.example.com,resources=applications/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=apps.example.com,resources=applications/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete

type ApplicationReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    // Fetch the Application
    var app appsexamplev1.Application
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    logger.Info("Reconciling Application", "name", app.Name)

    // Create or update Deployment
    deployment := r.deploymentForApplication(&app)
    if err := ctrl.SetControllerReference(&app, deployment, r.Scheme); err != nil {
        return ctrl.Result{}, err
    }

    found := &appsv1.Deployment{}
    err := r.Get(ctx, client.ObjectKey{Name: deployment.Name, Namespace: deployment.Namespace}, found)
    if err != nil && errors.IsNotFound(err) {
        if err := r.Create(ctx, deployment); err != nil {
            logger.Error(err, "Failed to create Deployment")
            return ctrl.Result{}, err
        }
    } else if err != nil {
        return ctrl.Result{}, err
    } else {
        // Update existing deployment
        found.Spec = deployment.Spec
        if err := r.Update(ctx, found); err != nil {
            logger.Error(err, "Failed to update Deployment")
            return ctrl.Result{}, err
        }
    }

    // Update status
    app.Status.Phase = "Running"
    app.Status.Ready = true
    if err := r.Status().Update(ctx, &app); err != nil {
        logger.Error(err, "Failed to update status")
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}

func (r *ApplicationReconciler) deploymentForApplication(app *appsexamplev1.Application) *appsv1.Deployment {
    labels := map[string]string{
        "app": app.Name,
    }

    return &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      app.Name,
            Namespace: app.Namespace,
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
                            Name:  "app",
                            Image: app.Spec.Image,
                            Ports: []corev1.ContainerPort{
                                {
                                    ContainerPort: app.Spec.Port,
                                },
                            },
                            Env: convertEnvVars(app.Spec.Env),
                        },
                    },
                },
            },
        },
    }
}

func convertEnvVars(envVars []appsexamplev1.EnvVar) []corev1.EnvVar {
    result := make([]corev1.EnvVar, len(envVars))
    for i, ev := range envVars {
        result[i] = corev1.EnvVar{
            Name:  ev.Name,
            Value: ev.Value,
        }
    }
    return result
}

func (r *ApplicationReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&appsexamplev1.Application{}).
        Owns(&appsv1.Deployment{}).
        Complete(r)
}
```

## Generating Manifests

Generate CRDs and RBAC.

```bash
make manifests
```

This updates files in the config/ directory based on your code annotations.

## Adding Webhooks

Create validation and defaulting webhooks.

```bash
kubebuilder create webhook \
    --group apps \
    --version v1 \
    --kind Application \
    --defaulting \
    --programmatic-validation
```

Implement webhook logic.

```go
// api/v1/application_webhook.go
package v1

import (
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/webhook"
)

func (r *Application) SetupWebhookWithManager(mgr ctrl.Manager) error {
    return ctrl.NewWebhookManagedBy(mgr).
        For(r).
        Complete()
}

// +kubebuilder:webhook:path=/mutate-apps-example-com-v1-application,mutating=true,failurePolicy=fail,sideEffects=None,groups=apps.example.com,resources=applications,verbs=create;update,versions=v1,name=mapplication.kb.io,admissionReviewVersions=v1

var _ webhook.Defaulter = &Application{}

func (r *Application) Default() {
    if r.Spec.Replicas == 0 {
        r.Spec.Replicas = 1
    }
}

// +kubebuilder:webhook:path=/validate-apps-example-com-v1-application,mutating=false,failurePolicy=fail,sideEffects=None,groups=apps.example.com,resources=applications,verbs=create;update,versions=v1,name=vapplication.kb.io,admissionReviewVersions=v1

var _ webhook.Validator = &Application{}

func (r *Application) ValidateCreate() error {
    if r.Spec.Port < 1 || r.Spec.Port > 65535 {
        return fmt.Errorf("port must be between 1 and 65535")
    }
    return nil
}

func (r *Application) ValidateUpdate(old runtime.Object) error {
    return r.ValidateCreate()
}

func (r *Application) ValidateDelete() error {
    return nil
}
```

## Building and Running Locally

Test your operator locally.

```bash
# Install CRDs
make install

# Run locally
make run

# In another terminal, create a sample resource
kubectl apply -f config/samples/apps_v1_application.yaml

# Check the result
kubectl get applications
kubectl get deployments
```

## Building and Deploying

Build and push the container image.

```bash
# Build image
make docker-build IMG=registry.example.com/application-operator:v1.0.0

# Push image
make docker-push IMG=registry.example.com/application-operator:v1.0.0

# Deploy to cluster
make deploy IMG=registry.example.com/application-operator:v1.0.0
```

## Running Tests

Kubebuilder generates test scaffolding.

```bash
# Run unit tests
make test

# Run with coverage
go test ./... -coverprofile cover.out

# View coverage
go tool cover -html=cover.out
```

## Project Structure

Understanding the generated structure helps customize it.

```
├── api/v1/              # API type definitions
├── config/              # Kubernetes manifests
│   ├── crd/            # CRD definitions
│   ├── default/        # Kustomize defaults
│   ├── manager/        # Deployment manifests
│   ├── rbac/           # RBAC rules
│   ├── samples/        # Example CRs
│   └── webhook/        # Webhook configs
├── controllers/         # Controller implementations
├── cmd/main.go         # Entry point
└── Makefile           # Build automation
```

## Best Practices

Run make manifests after changing API types. This regenerates CRDs and RBAC.

Use make test before committing. The generated tests verify basic functionality.

Customize the Makefile for your CI/CD pipeline. It's designed to be extended.

Follow Kubernetes API conventions for field names and types.

Add comprehensive comments to your API types. They appear in generated documentation.

Use kubebuilder markers for validation instead of writing webhooks when possible.

## Conclusion

Kubebuilder eliminates the tedious setup work for Kubernetes operators. You get a complete, working project structure following best practices in seconds.

Use kubebuilder init to create projects. Add APIs with kubebuilder create api. Generate webhooks with kubebuilder create webhook. The Makefile automates building, testing, and deployment.

Focus on implementing your reconciliation logic instead of fighting project structure. Kubebuilder handles the boilerplate so you can solve real problems.
