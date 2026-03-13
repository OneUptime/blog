# How to Use controller-gen to Generate CRD Manifests and RBAC Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, controller-gen, CRD, RBAC

Description: Learn how to use controller-gen to automatically generate Custom Resource Definitions, RBAC roles, and webhooks from annotated Go types in Kubernetes operators.

---

Writing CRD manifests by hand is tedious and error-prone. You define your Go structs, then manually translate them to OpenAPI schemas. You forget a field or get the type wrong. When you update the struct, you have to remember to update the YAML. Your CRD and code drift out of sync.

controller-gen solves this by generating CRD manifests from your Go code. Add annotations to your structs and it produces complete CRDs with validation, printer columns, and subresources. It also generates RBAC rules from your controller's API calls. This guide shows you how to use it.

## Installing controller-gen

Install controller-gen as part of your project's tools.

```bash
# Create tools.go to track tool dependencies
cat > tools.go <<EOF
//go:build tools
// +build tools

package tools

import (
    _ "sigs.k8s.io/controller-tools/cmd/controller-gen"
)
EOF

# Install
go mod tidy
go install sigs.k8s.io/controller-tools/cmd/controller-gen@latest
```

## Defining API Types with Annotations

Create your API types with kubebuilder annotations.

```go
// api/v1/application_types.go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Application is the Schema for the applications API
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:subresource:scale:specpath=.spec.replicas,statuspath=.status.replicas
// +kubebuilder:printcolumn:name="Image",type=string,JSONPath=`.spec.image`
// +kubebuilder:printcolumn:name="Replicas",type=integer,JSONPath=`.spec.replicas`
// +kubebuilder:printcolumn:name="Status",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
// +kubebuilder:resource:shortName=app
type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

// ApplicationSpec defines the desired state of Application
type ApplicationSpec struct {
    // Image is the container image to deploy
    // +kubebuilder:validation:Required
    // +kubebuilder:validation:Pattern=`^[a-z0-9]+([\.-][a-z0-9]+)*/[a-z0-9]+([\.-][a-z0-9]+)*:[a-z0-9]+([\.-][a-z0-9]+)*$`
    Image string `json:"image"`

    // Replicas is the number of desired pods
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=100
    // +kubebuilder:default=1
    Replicas int32 `json:"replicas,omitempty"`

    // Port is the container port to expose
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=65535
    Port int32 `json:"port"`

    // Environment specifies the deployment environment
    // +kubebuilder:validation:Enum=dev;staging;prod
    // +kubebuilder:default=dev
    Environment string `json:"environment,omitempty"`

    // Resources specifies compute resources
    // +optional
    Resources ResourceRequirements `json:"resources,omitempty"`
}

type ResourceRequirements struct {
    // CPU request in millicores
    // +kubebuilder:validation:Pattern=`^[0-9]+m?$`
    CPU string `json:"cpu,omitempty"`

    // Memory request (e.g. "128Mi", "1Gi")
    // +kubebuilder:validation:Pattern=`^[0-9]+[MG]i$`
    Memory string `json:"memory,omitempty"`
}

// ApplicationStatus defines the observed state of Application
type ApplicationStatus struct {
    // Phase represents the current deployment phase
    // +optional
    Phase string `json:"phase,omitempty"`

    // Replicas is the current replica count
    // +optional
    Replicas int32 `json:"replicas,omitempty"`

    // Conditions represent the latest observations
    // +optional
    Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// ApplicationList contains a list of Application
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

## Generating CRD Manifests

Run controller-gen to generate CRDs.

```bash
# Generate CRDs
controller-gen crd:crdVersions=v1 \
    paths=./api/... \
    output:crd:dir=./config/crd/bases

# Output will be in config/crd/bases/
```

The generated CRD includes all validation rules, printer columns, and subresources from your annotations.

## Common Validation Annotations

Here are the most useful validation annotations.

```go
type ValidationExamples struct {
    // Required field
    // +kubebuilder:validation:Required
    RequiredField string `json:"requiredField"`

    // Numeric constraints
    // +kubebuilder:validation:Minimum=0
    // +kubebuilder:validation:Maximum=100
    Percentage int `json:"percentage"`

    // String patterns
    // +kubebuilder:validation:Pattern=`^[a-z0-9-]+$`
    Name string `json:"name"`

    // Enum values
    // +kubebuilder:validation:Enum=small;medium;large
    Size string `json:"size"`

    // Min/max length
    // +kubebuilder:validation:MinLength=1
    // +kubebuilder:validation:MaxLength=253
    Domain string `json:"domain"`

    // Array constraints
    // +kubebuilder:validation:MinItems=1
    // +kubebuilder:validation:MaxItems=10
    Tags []string `json:"tags"`

    // Default value
    // +kubebuilder:default=true
    Enabled bool `json:"enabled,omitempty"`

    // Optional field (omit if zero value)
    // +optional
    OptionalField string `json:"optionalField,omitempty"`
}
```

## Printer Column Annotations

Configure kubectl output columns.

```go
// +kubebuilder:printcolumn:name="Status",type=string,JSONPath=`.status.phase`,description="Current status"
// +kubebuilder:printcolumn:name="Replicas",type=integer,JSONPath=`.spec.replicas`,priority=0
// +kubebuilder:printcolumn:name="Image",type=string,JSONPath=`.spec.image`,priority=1
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type MyResource struct {
    // ...
}
```

Priority 0 columns show by default. Priority 1 columns show with kubectl get -o wide.

## Subresource Annotations

Enable status and scale subresources.

```go
// Enable status subresource
// +kubebuilder:subresource:status

// Enable scale subresource
// +kubebuilder:subresource:scale:specpath=.spec.replicas,statuspath=.status.replicas,selectorpath=.status.selector

type ScalableResource struct {
    Spec   ScalableResourceSpec   `json:"spec"`
    Status ScalableResourceStatus `json:"status,omitempty"`
}
```

## Generating RBAC Manifests

Add RBAC markers to your controller.

```go
// controllers/application_controller.go
package controllers

import (
    ctrl "sigs.k8s.io/controller-runtime"
)

// +kubebuilder:rbac:groups=apps.example.com,resources=applications,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps.example.com,resources=applications/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=apps.example.com,resources=applications/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch;create;update;patch
// +kubebuilder:rbac:groups="",resources=events,verbs=create;patch

type ApplicationReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // Controller logic
    return ctrl.Result{}, nil
}
```

Generate RBAC manifests.

```bash
controller-gen rbac:roleName=manager-role \
    paths=./controllers/... \
    output:rbac:dir=./config/rbac
```

## Generating Webhook Configurations

Add webhook markers for admission webhooks.

```go
// api/v1/application_webhook.go
package v1

import (
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/webhook"
)

// +kubebuilder:webhook:path=/mutate-apps-example-com-v1-application,mutating=true,failurePolicy=fail,groups=apps.example.com,resources=applications,verbs=create;update,versions=v1,name=mapplication.kb.io,sideEffects=None,admissionReviewVersions=v1

var _ webhook.Defaulter = &Application{}

func (r *Application) Default() {
    if r.Spec.Replicas == 0 {
        r.Spec.Replicas = 1
    }
    if r.Spec.Environment == "" {
        r.Spec.Environment = "dev"
    }
}

// +kubebuilder:webhook:path=/validate-apps-example-com-v1-application,mutating=false,failurePolicy=fail,groups=apps.example.com,resources=applications,verbs=create;update,versions=v1,name=vapplication.kb.io,sideEffects=None,admissionReviewVersions=v1

var _ webhook.Validator = &Application{}

func (r *Application) ValidateCreate() error {
    return r.validateApplication()
}

func (r *Application) ValidateUpdate(old runtime.Object) error {
    return r.validateApplication()
}

func (r *Application) ValidateDelete() error {
    return nil
}

func (r *Application) validateApplication() error {
    // Validation logic
    return nil
}
```

Generate webhook configurations.

```bash
controller-gen webhook \
    paths=./api/... \
    output:webhook:dir=./config/webhook
```

## Creating a Makefile for Generation

Automate code generation with make.

```makefile
# Makefile
.PHONY: generate
generate: controller-gen
	$(CONTROLLER_GEN) object:headerFile="hack/boilerplate.go.txt" paths="./..."

.PHONY: manifests
manifests: controller-gen
	$(CONTROLLER_GEN) crd:crdVersions=v1 rbac:roleName=manager-role webhook \
		paths="./..." \
		output:crd:artifacts:config=config/crd/bases \
		output:rbac:artifacts:config=config/rbac \
		output:webhook:artifacts:config=config/webhook

.PHONY: controller-gen
controller-gen:
	go install sigs.k8s.io/controller-tools/cmd/controller-gen@latest

# Use it
all: manifests generate
```

## Grouping Resources

Organize API groups and versions.

```go
// api/v1/groupversion_info.go
package v1

import (
    "k8s.io/apimachinery/pkg/runtime/schema"
    "sigs.k8s.io/controller-runtime/pkg/scheme"
)

var (
    // GroupVersion is group version used to register these objects
    GroupVersion = schema.GroupVersion{Group: "apps.example.com", Version: "v1"}

    // SchemeBuilder is used to add go types to the GroupVersionKind scheme
    SchemeBuilder = &scheme.Builder{GroupVersion: GroupVersion}

    // AddToScheme adds the types in this group-version to the given scheme.
    AddToScheme = SchemeBuilder.AddToScheme
)
```

## Generating DeepCopy Methods

controller-gen also generates DeepCopy methods required by the Kubernetes runtime.

```go
// Add this marker to types that need DeepCopy
// +kubebuilder:object:root=true

type MyResource struct {
    // ...
}

// Generated DeepCopy methods will look like:
// func (in *MyResource) DeepCopy() *MyResource
// func (in *MyResource) DeepCopyInto(out *MyResource)
// func (in *MyResource) DeepCopyObject() runtime.Object
```

## Best Practices

Run code generation before every build. Add it to your CI pipeline.

Use validation annotations instead of admission webhooks when possible. Schema validation is faster and simpler.

Document your API types with comments. These comments appear in generated documentation.

Version your APIs properly. Use v1alpha1, v1beta1, v1 to indicate stability.

Test generated CRDs by applying them to a cluster and creating sample resources.

Keep annotations close to the code they describe. This makes it easier to keep them in sync.

## Conclusion

controller-gen eliminates manual CRD and RBAC manifest creation. Your Go types become the source of truth and manifests generate automatically.

Annotate your types with validation rules, printer columns, and subresources. Add RBAC markers to your controllers. Run controller-gen to generate manifests. Automate this with make or CI pipelines.

Generated manifests stay in sync with your code, reducing errors and maintenance burden. This is how modern Kubernetes operators should be built.
