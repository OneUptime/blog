# How to Build a Custom Kubernetes API Server with apiserver-builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Server, apiserver-builder

Description: Learn how to use apiserver-builder to scaffold and implement a custom Kubernetes API server with proper code generation, validation, and storage integration.

---

Building a Kubernetes API server from scratch is complicated. You need to handle serialization, versioning, authentication, authorization, storage, and dozens of other concerns. One misstep and you break compatibility with the entire ecosystem.

The apiserver-builder tool eliminates most of this complexity. It scaffolds a complete API server implementation with proper code generation, following Kubernetes conventions. You focus on defining your API types and business logic. This guide shows you how to use apiserver-builder effectively.

## Installing apiserver-builder

Install the tool and its dependencies.

```bash
# Install apiserver-boot
go install sigs.k8s.io/apiserver-builder-alpha/cmd/apiserver-boot@latest

# Verify installation
apiserver-boot version
```

You also need the Kubernetes code generators.

```bash
go install k8s.io/code-generator/cmd/...@latest
```

## Initializing a New API Server Project

Create a new project directory and initialize it.

```bash
mkdir analytics-apiserver
cd analytics-apiserver

# Initialize the repository
apiserver-boot init repo --domain analytics.example.com

# Initialize go module
go mod init analytics.example.com/apiserver
go mod tidy
```

This creates the basic project structure with pkg, cmd, and config directories.

## Creating Resource Types

Use apiserver-boot to create new API groups and resources.

```bash
# Create a resource type
apiserver-boot create group version resource \
  --group datasets \
  --version v1alpha1 \
  --kind DataSet
```

This generates the resource type definition in `pkg/apis/datasets/v1alpha1/dataset_types.go`.

Edit the generated file to add your fields.

```go
package v1alpha1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +genclient
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// DataSet represents a collection of data with metadata
type DataSet struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   DataSetSpec   `json:"spec,omitempty"`
    Status DataSetStatus `json:"status,omitempty"`
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

func init() {
    SchemeBuilder.Register(&DataSet{}, &DataSetList{})
}
```

## Adding Validation and Defaulting

Create validation and defaulting logic.

```go
// pkg/apis/datasets/v1alpha1/dataset_validation.go
package v1alpha1

import (
    "fmt"
    "regexp"
    "strings"

    "k8s.io/apimachinery/pkg/util/validation/field"
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

// ValidateDataSet validates a DataSet
func (ds *DataSet) ValidateDataSet() field.ErrorList {
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

// SetDefaults sets default values
func (ds *DataSet) SetDefaults() {
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

Run code generation to create clientsets, listers, and informers.

```bash
# Generate all code
apiserver-boot build generated

# This runs multiple generators:
# - deepcopy-gen (creates DeepCopy methods)
# - client-gen (creates typed clients)
# - lister-gen (creates listers)
# - informer-gen (creates informers)
# - openapi-gen (creates OpenAPI specs)
```

The generated code appears in `pkg/generated/`.

## Implementing Custom Storage Logic

You can customize how resources are stored and retrieved.

```go
// pkg/registry/datasets/dataset/storage.go
package dataset

import (
    "context"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apiserver/pkg/registry/generic"
    genericregistry "k8s.io/apiserver/pkg/registry/generic/registry"
    "k8s.io/apiserver/pkg/registry/rest"

    "analytics.example.com/apiserver/pkg/apis/datasets/v1alpha1"
)

type DataSetStorage struct {
    DataSet *REST
    Status  *StatusREST
}

type REST struct {
    *genericregistry.Store
}

// NewREST returns a REST storage for datasets
func NewREST(scheme *runtime.Scheme, optsGetter generic.RESTOptionsGetter) (*DataSetStorage, error) {
    strategy := NewStrategy(scheme)

    store := &genericregistry.Store{
        NewFunc:                  func() runtime.Object { return &v1alpha1.DataSet{} },
        NewListFunc:              func() runtime.Object { return &v1alpha1.DataSetList{} },
        PredicateFunc:            MatchDataSet,
        DefaultQualifiedResource: v1alpha1.Resource("datasets"),
        CreateStrategy:           strategy,
        UpdateStrategy:           strategy,
        DeleteStrategy:           strategy,
    }

    options := &generic.StoreOptions{RESTOptions: optsGetter, AttrFunc: GetAttrs}
    if err := store.CompleteWithOptions(options); err != nil {
        return nil, err
    }

    statusStore := *store
    statusStore.UpdateStrategy = NewStatusStrategy(strategy)

    return &DataSetStorage{
        DataSet: &REST{store},
        Status:  &StatusREST{&statusStore},
    }, nil
}

// StatusREST implements the REST endpoint for changing the status of a DataSet
type StatusREST struct {
    store *genericregistry.Store
}

func (r *StatusREST) New() runtime.Object {
    return &v1alpha1.DataSet{}
}

func (r *StatusREST) Get(ctx context.Context, name string, options *metav1.GetOptions) (runtime.Object, error) {
    return r.store.Get(ctx, name, options)
}

func (r *StatusREST) Update(ctx context.Context, name string, objInfo rest.UpdatedObjectInfo, createValidation rest.ValidateObjectFunc, updateValidation rest.ValidateObjectUpdateFunc, forceAllowCreate bool, options *metav1.UpdateOptions) (runtime.Object, bool, error) {
    return r.store.Update(ctx, name, objInfo, createValidation, updateValidation, false, options)
}
```

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

Start etcd for local testing.

```bash
# Download and run etcd
wget https://github.com/etcd-io/etcd/releases/download/v3.5.10/etcd-v3.5.10-linux-amd64.tar.gz
tar xzf etcd-v3.5.10-linux-amd64.tar.gz
./etcd-v3.5.10-linux-amd64/etcd
```

In another terminal, run the API server.

```bash
./bin/apiserver \
  --etcd-servers=http://localhost:2379 \
  --secure-port=9443 \
  --cert-dir=/tmp/apiserver-certs \
  --print-bearer-token
```

The API server generates self-signed certificates and prints a bearer token for authentication.

## Testing the API

Create a kubeconfig to access your local API server.

```bash
kubectl config set-cluster local-analytics \
  --server=https://localhost:9443 \
  --insecure-skip-tls-verify=true

kubectl config set-credentials local-analytics \
  --token=<bearer-token-from-apiserver-output>

kubectl config set-context local-analytics \
  --cluster=local-analytics \
  --user=local-analytics

kubectl config use-context local-analytics
```

Now test your API.

```bash
# Check API availability
kubectl api-resources | grep datasets

# Create a DataSet
cat <<EOF | kubectl apply -f -
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
kubectl get datasets

# Get details
kubectl get dataset user-events -o yaml
```

## Deploying to Kubernetes

Create deployment manifests.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: analytics-system

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-apiserver
  namespace: analytics-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics-apiserver
  template:
    metadata:
      labels:
        app: analytics-apiserver
    spec:
      containers:
      - name: apiserver
        image: registry.example.com/analytics-apiserver:v1.0.0
        args:
        - --etcd-servers=http://etcd:2379
        - --secure-port=6443
        - --audit-log-path=/var/log/apiserver-audit.log
        ports:
        - containerPort: 6443
          name: secure
        livenessProbe:
          httpGet:
            path: /healthz
            port: 6443
            scheme: HTTPS
        readinessProbe:
          httpGet:
            path: /readyz
            port: 6443
            scheme: HTTPS
```

Register with API aggregation.

```yaml
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  name: v1alpha1.datasets.analytics.example.com
spec:
  service:
    name: analytics-apiserver
    namespace: analytics-system
  group: datasets.analytics.example.com
  version: v1alpha1
  groupPriorityMinimum: 1000
  versionPriority: 15
```

## Conclusion

apiserver-builder dramatically simplifies custom API server development. It handles code generation, follows Kubernetes conventions, and produces production-ready implementations.

Use it when you need capabilities beyond CRDs such as custom storage backends, complex validation logic, or integration with external systems. Define your types carefully, implement validation and defaulting, and leverage the generated code for clients and listers.

The initial learning curve is steep, but the result is a fully-featured API server that integrates seamlessly with Kubernetes.
