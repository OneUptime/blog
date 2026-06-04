# How to Build a Custom Kubernetes API Server with apiserver-builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Server, Apiserver-builder

Description: Learn how to use apiserver-builder to scaffold and implement a custom Kubernetes API server with proper code generation, validation, and storage integration.

---

Building a Kubernetes API server from scratch is complicated. You need to handle serialization, versioning, authentication, authorization, storage, and dozens of other concerns. One misstep and you break compatibility with the entire ecosystem.

The apiserver-builder tool eliminates most of this complexity. It scaffolds a complete API server implementation with proper code generation, following Kubernetes conventions. You focus on defining your API types and business logic. This guide shows you how to use apiserver-builder effectively.

The Kubernetes SIG API Machinery project recommends Kubebuilder for most Kubernetes APIs. Use apiserver-builder when you specifically need the API aggregation layer, such as for a custom storage backend or custom long-running subresources.

## Installing apiserver-builder

Install the tool and its dependencies.

```bash
# Install apiserver-boot

go install sigs.k8s.io/apiserver-builder-alpha/cmd/apiserver-boot@v1.23.0

# Verify installation
apiserver-boot version
```

## Initializing a New API Server Project

Create a new project directory and initialize it.

```bash
mkdir analytics-apiserver
cd analytics-apiserver

# Initialize the repository
apiserver-boot init repo \
  --domain analytics.example.com \
  --module-name analytics.example.com/apiserver

# Download module dependencies
go mod tidy
```

This creates the basic project structure with a Go module, plus `pkg`, `cmd`, and `config` directories.

## Creating Resource Types

Use apiserver-boot to create new API groups and resources.

```bash
# Create a resource type
apiserver-boot create group version resource \
  --group datasets \
  --version v1alpha1 \
  --kind DataSet \
  --resource datasets
```

This generates the resource type definition in `pkg/apis/datasets/v1alpha1/dataset_types.go`.

Edit the generated file to add your fields.

```go
package v1alpha1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "sigs.k8s.io/apiserver-runtime/pkg/builder/resource"
)

// +genclient
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// DataSet represents a collection of data with metadata
// +k8s:openapi-gen=true
type DataSet struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   DataSetSpec   `json:"spec,omitempty"`
    Status DataSetStatus `json:"status,omitempty"`
}

var _ resource.Object = &DataSet{}
var _ resource.ObjectWithStatusSubResource = &DataSet{}

func (ds *DataSet) GetObjectMeta() *metav1.ObjectMeta {
    return &ds.ObjectMeta
}

func (ds *DataSet) NamespaceScoped() bool {
    return true
}

func (ds *DataSet) New() runtime.Object {
    return &DataSet{}
}

func (ds *DataSet) NewList() runtime.Object {
    return &DataSetList{}
}

func (ds *DataSet) GetGroupVersionResource() schema.GroupVersionResource {
    return schema.GroupVersionResource{
        Group:    "datasets.analytics.example.com",
        Version:  "v1alpha1",
        Resource: "datasets",
    }
}

func (ds *DataSet) IsStorageVersion() bool {
    return true
}

// DataSetSpec defines the desired state of DataSet
type DataSetSpec struct {
    // Source indicates where data is loaded from
    Source DataSource `json:"source"`

    // Schema defines the data structure
    Schema SchemaDefinition `json:"schema"`

    // RefreshInterval specifies how often to refresh data
    RefreshInterval string `json:"refreshInterval,omitempty"`

    // Partitioning defines how data is partitioned
    Partitioning *PartitionConfig `json:"partitioning,omitempty"`
}

type DataSource struct {
    // Type specifies the source type (s3, database, stream)
    Type string `json:"type"`

    // Connection contains source-specific connection details
    Connection map[string]string `json:"connection"`

    // Credentials references a secret with authentication info
    Credentials *CredentialRef `json:"credentials,omitempty"`
}

type SchemaDefinition struct {
    // Format specifies the data format (json, parquet, csv)
    Format string `json:"format"`

    // Fields defines the field structure
    Fields []FieldDefinition `json:"fields"`
}

type FieldDefinition struct {
    Name     string `json:"name"`
    Type     string `json:"type"`
    Required bool   `json:"required,omitempty"`
}

type PartitionConfig struct {
    // Field to partition by
    Field string `json:"field"`

    // Strategy for partitioning (range, hash, list)
    Strategy string `json:"strategy"`
}

type CredentialRef struct {
    Name string `json:"name"`
    Key  string `json:"key"`
}

// DataSetStatus defines the observed state of DataSet
type DataSetStatus struct {
    // Phase represents the current phase (Pending, Loading, Ready, Failed)
    Phase string `json:"phase,omitempty"`

    // RecordCount tracks the number of records loaded
    RecordCount int64 `json:"recordCount,omitempty"`

    // SizeBytes tracks the total data size
    SizeBytes int64 `json:"sizeBytes,omitempty"`

    // LastRefreshTime indicates when data was last refreshed
    LastRefreshTime metav1.Time `json:"lastRefreshTime,omitempty"`

    // Conditions track detailed status conditions
    Conditions []metav1.Condition `json:"conditions,omitempty"`

    // ErrorMessage contains error details if phase is Failed
    ErrorMessage string `json:"errorMessage,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// DataSetList contains a list of DataSet
type DataSetList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []DataSet `json:"items"`
}

var _ resource.ObjectList = &DataSetList{}

func (dsl *DataSetList) GetListMeta() *metav1.ListMeta {
    return &dsl.ListMeta
}

func (ds *DataSet) GetStatus() resource.StatusSubResource {
    return ds.Status
}

var _ resource.StatusSubResource = &DataSetStatus{}

func (s DataSetStatus) SubResourceName() string {
    return "status"
}

func (s DataSetStatus) CopyTo(parent resource.ObjectWithStatusSubResource) {
    parent.(*DataSet).Status = s
}
```

## Adding Validation and Defaulting

Create validation and defaulting logic.

```go
// pkg/apis/datasets/v1alpha1/dataset_validation.go
package v1alpha1

import (
    "context"
    "fmt"
    "regexp"

    "k8s.io/apimachinery/pkg/util/validation/field"
    "sigs.k8s.io/apiserver-runtime/pkg/builder/resource/resourcestrategy"
)

var validFormats = map[string]bool{
    "json":    true,
    "parquet": true,
    "csv":     true,
    "avro":    true,
}

var validFieldTypes = map[string]bool{
    "string":  true,
    "integer": true,
    "float":   true,
    "boolean": true,
    "date":    true,
}

var _ resourcestrategy.Validater = &DataSet{}
var _ resourcestrategy.Defaulter = &DataSet{}

// Validate validates a DataSet
func (ds *DataSet) Validate(ctx context.Context) field.ErrorList {
    allErrs := field.ErrorList{}
    specPath := field.NewPath("spec")

    // Validate source
    if ds.Spec.Source.Type == "" {
        allErrs = append(allErrs, field.Required(
            specPath.Child("source").Child("type"),
            "source type is required",
        ))
    }

    // Validate schema format
    if !validFormats[ds.Spec.Schema.Format] {
        allErrs = append(allErrs, field.Invalid(
            specPath.Child("schema").Child("format"),
            ds.Spec.Schema.Format,
            fmt.Sprintf("must be one of: %v", getMapKeys(validFormats)),
        ))
    }

    // Validate fields
    if len(ds.Spec.Schema.Fields) == 0 {
        allErrs = append(allErrs, field.Required(
            specPath.Child("schema").Child("fields"),
            "at least one field is required",
        ))
    }

    fieldNames := make(map[string]bool)
    for i, f := range ds.Spec.Schema.Fields {
        fieldPath := specPath.Child("schema").Child("fields").Index(i)

        // Check for duplicate names
        if fieldNames[f.Name] {
            allErrs = append(allErrs, field.Duplicate(
                fieldPath.Child("name"),
                f.Name,
            ))
        }
        fieldNames[f.Name] = true

        // Validate field type
        if !validFieldTypes[f.Type] {
            allErrs = append(allErrs, field.Invalid(
                fieldPath.Child("type"),
                f.Type,
                fmt.Sprintf("must be one of: %v", getMapKeys(validFieldTypes)),
            ))
        }
    }

    // Validate refresh interval format
    if ds.Spec.RefreshInterval != "" {
        matched, _ := regexp.MatchString(`^\d+[smh]$`, ds.Spec.RefreshInterval)
        if !matched {
            allErrs = append(allErrs, field.Invalid(
                specPath.Child("refreshInterval"),
                ds.Spec.RefreshInterval,
                "must be in format like 30s, 5m, or 1h",
            ))
        }
    }

    return allErrs
}

// Default sets default values
func (ds *DataSet) Default() {
    if ds.Spec.Schema.Format == "" {
        ds.Spec.Schema.Format = "json"
    }

    if ds.Spec.RefreshInterval == "" {
        ds.Spec.RefreshInterval = "1h"
    }

    if ds.Status.Phase == "" {
        ds.Status.Phase = "Pending"
    }
}

func getMapKeys(m map[string]bool) []string {
    keys := make([]string, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    return keys
}
```

## Generating Code

Run code generation to create the DeepCopy methods required by Kubernetes runtime objects.

```bash
# Install the generator used by the scaffolded go:generate directives
go install k8s.io/code-generator/cmd/deepcopy-gen@v0.23.0

# Generate DeepCopy methods for API packages
go generate ./pkg/apis/...
```

The generated DeepCopy code appears next to the API types as files such as `zz_generated.deepcopy.go`. OpenAPI-based documentation can be generated separately with `apiserver-boot build docs` after building the server.

## Implementing Custom Storage Logic

You can customize how resources are stored and retrieved.

```go
// cmd/apiserver/main.go
package main

import (
    "k8s.io/klog/v2"
    "analytics.example.com/apiserver/pkg/apis/datasets/v1alpha1"
    "sigs.k8s.io/apiserver-runtime/pkg/builder"
    "sigs.k8s.io/apiserver-runtime/pkg/experimental/storage/filepath"
)

func main() {
    err := builder.APIServer.
        WithResourceAndHandler(
            &v1alpha1.DataSet{},
            filepath.NewJSONFilepathStorageProvider(&v1alpha1.DataSet{}, "data"),
        ).
        WithLocalDebugExtension().
        WithoutEtcd().
        Execute()
    if err != nil {
        klog.Fatal(err)
    }
}
```

This example uses the apiserver-runtime JSON file storage provider instead of etcd. If you keep the default generated `WithResource(&v1alpha1.DataSet{})` registration, the server uses the standard etcd-backed storage path.

## Building the API Server

Build the API server executable.

```bash
# Build for local testing
apiserver-boot build executables

# This creates binaries in bin/
# - apiserver (the API server)
# - controller-manager (for running controllers)
```

You can also build container images.

```bash
# Build Docker image
apiserver-boot build container --image registry.example.com/analytics-apiserver:v1.0.0

# Push to registry
docker push registry.example.com/analytics-apiserver:v1.0.0
```

## Running Locally for Testing

Build and run the local API server.

```bash
# Build binaries under bin/
apiserver-boot build executables

# Start the apiserver and controller-manager
apiserver-boot run local
```

The local run command expects `etcd` to be available on your `PATH`. It starts the API server and controller-manager binaries under `bin/` and writes a local `kubeconfig`.

```bash
# If binaries are already built, skip the build step
apiserver-boot run local --build=false
```

## Testing the API

Use the generated local kubeconfig to test your API.

```bash
# Check API availability
kubectl --kubeconfig kubeconfig api-resources | grep datasets

# Create a DataSet
cat <<EOF | kubectl --kubeconfig kubeconfig apply -f -
apiVersion: datasets.analytics.example.com/v1alpha1
kind: DataSet
metadata:
  name: user-events
spec:
  source:
    type: s3
    connection:
      bucket: analytics-data
      prefix: events/
  schema:
    format: parquet
    fields:
    - name: user_id
      type: string
      required: true
    - name: event_type
      type: string
      required: true
    - name: timestamp
      type: date
      required: true
  refreshInterval: 5m
EOF

# List DataSets
kubectl --kubeconfig kubeconfig get datasets

# Get details
kubectl --kubeconfig kubeconfig get dataset user-events -o yaml
```

## Deploying to Kubernetes

Generate deployment manifests.

```bash
apiserver-boot build config \
  --name analytics-apiserver \
  --namespace analytics-system \
  --image registry.example.com/analytics-apiserver:v1.0.0
```

This writes the APIService, Deployment, Service, Secret, and etcd manifests under `config/`. The generated APIService includes a `caBundle` so the Kubernetes aggregation layer can verify the API server's serving certificate.

```bash
kubectl create namespace analytics-system --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f config/

# Clear discovery cache before checking for the new API
rm -rf ~/.kube/cache/discovery/
kubectl api-versions | grep datasets.analytics.example.com
```

## Conclusion

apiserver-builder dramatically simplifies custom API server development. It handles scaffolding, follows Kubernetes conventions, and produces working aggregated API server implementations.

Use it when you need capabilities beyond CRDs such as custom storage backends, complex validation logic, or integration with external systems. Define your types carefully, implement validation and defaulting, and keep the generated DeepCopy and OpenAPI output up to date.

The initial learning curve is steep, and production deployments still need careful certificate, authentication, authorization, and RBAC configuration. The result is a fully-featured API server that integrates with Kubernetes through the aggregation layer.
