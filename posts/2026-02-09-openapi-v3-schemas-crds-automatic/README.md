# How to Generate OpenAPI v3 Schemas for CRDs Automatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, OpenAPI

Description: Learn how to automatically generate OpenAPI v3 schemas for your custom resources using Kubebuilder markers and controller-gen, ensuring proper validation and documentation.

---

Custom Resource Definitions require OpenAPI v3 schemas to validate resource specifications and enable server-side features like defaulting and pruning. Writing these schemas manually is tedious and error-prone. Kubebuilder and controller-gen automatically generate OpenAPI schemas from your Go type definitions and special code annotations.

Automatic schema generation keeps your CRD validation in sync with your Go types, documents field constraints, and leverages Go's type system to catch errors at compile time rather than runtime.

## Basic Schema Generation with Kubebuilder

When you use Kubebuilder, schema generation happens automatically:

```go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

type ApplicationSpec struct {
    // Image is the container image to run
    Image string `json:"image"`

    // Replicas is the number of desired pods
    Replicas int32 `json:"replicas"`

    // Port is the container port
    // +optional
    Port *int32 `json:"port,omitempty"`
}
```

Run `make manifests` to generate the CRD with OpenAPI schema:

```bash
make manifests
```

This creates the schema in `config/crd/bases/`:

```yaml
openAPIV3Schema:
  type: object
  properties:
    spec:
      type: object
      required:
      - image
      - replicas
      properties:
        image:
          type: string
        replicas:
          type: integer
          format: int32
        port:
          type: integer
          format: int32
```

## Using Kubebuilder Validation Markers

Add validation constraints using markers:

```go
type ApplicationSpec struct {
    // Image is the container image to run
    // +kubebuilder:validation:Required
    // +kubebuilder:validation:MinLength=1
    Image string `json:"image"`

    // Replicas is the number of desired pods
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=100
    Replicas int32 `json:"replicas"`

    // Port is the container port
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=65535
    // +optional
    Port *int32 `json:"port,omitempty"`

    // Environment must be one of: dev, staging, production
    // +kubebuilder:validation:Enum=dev;staging;production
    Environment string `json:"environment"`

    // Version follows semantic versioning
    // +kubebuilder:validation:Pattern=`^v?[0-9]+\.[0-9]+\.[0-9]+$`
    Version string `json:"version"`

    // CPU request
    // +kubebuilder:validation:Pattern=`^[0-9]+m?$`
    CPU string `json:"cpu,omitempty"`

    // Tags can have at most 10 entries
    // +kubebuilder:validation:MaxItems=10
    Tags []string `json:"tags,omitempty"`

    // Config map with size limits
    // +kubebuilder:validation:MaxProperties=50
    Config map[string]string `json:"config,omitempty"`
}
```

## Default Values

Set default values using markers:

```go
type ApplicationSpec struct {
    // Replicas defaults to 1
    // +kubebuilder:default=1
    // +kubebuilder:validation:Minimum=1
    Replicas int32 `json:"replicas"`

    // Port defaults to 8080
    // +kubebuilder:default=8080
    Port int32 `json:"port"`

    // Protocol defaults to HTTP
    // +kubebuilder:default="HTTP"
    // +kubebuilder:validation:Enum=HTTP;HTTPS;TCP
    Protocol string `json:"protocol"`

    // EnableMetrics defaults to true
    // +kubebuilder:default=true
    EnableMetrics bool `json:"enableMetrics"`
}
```

## Complex Validation Rules

Validate nested structures:

```go
type ApplicationSpec struct {
    // Resources for the application
    // +optional
    Resources *ResourceRequirements `json:"resources,omitempty"`
}

type ResourceRequirements struct {
    // Requests describes minimum resource requirements
    // +kubebuilder:validation:Required
    Requests ResourceList `json:"requests"`

    // Limits describes maximum resource requirements
    // +optional
    Limits ResourceList `json:"limits,omitempty"`
}

type ResourceList struct {
    // CPU in cores or millicores (e.g., "100m" or "1")
    // +kubebuilder:validation:Pattern=`^[0-9]+m?$`
    CPU string `json:"cpu"`

    // Memory with units (e.g., "128Mi" or "1Gi")
    // +kubebuilder:validation:Pattern=`^[0-9]+[EPTGMK]i?$`
    Memory string `json:"memory"`
}
```

## Array Validation

Validate array properties:

```go
type ApplicationSpec struct {
    // Containers must have at least 1 and at most 10 entries
    // +kubebuilder:validation:MinItems=1
    // +kubebuilder:validation:MaxItems=10
    Containers []Container `json:"containers"`

    // Ports must be unique
    // +kubebuilder:validation:UniqueItems=true
    Ports []int32 `json:"ports,omitempty"`
}

type Container struct {
    // Name must be a valid DNS label
    // +kubebuilder:validation:Pattern=`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`
    // +kubebuilder:validation:MaxLength=63
    Name string `json:"name"`

    // Image is required
    // +kubebuilder:validation:Required
    Image string `json:"image"`

    // Command to run
    // +optional
    Command []string `json:"command,omitempty"`

    // Args for the command
    // +optional
    Args []string `json:"args,omitempty"`
}
```

## Field Descriptions

Add descriptions that appear in the schema and generated documentation:

```go
type ApplicationSpec struct {
    // Image specifies the container image to deploy. The image should follow
    // the format: [registry/]repository[:tag|@digest]
    // Examples:
    //   - nginx:1.21
    //   - gcr.io/myproject/myapp:v1.0.0
    //   - myregistry.com/app@sha256:abc123...
    // +kubebuilder:validation:Required
    Image string `json:"image"`

    // Replicas defines the desired number of pod replicas. The controller
    // will maintain this many replicas of the application. Must be between
    // 1 and 100.
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=100
    // +kubebuilder:default=1
    Replicas int32 `json:"replicas"`
}
```

## Using CEL for Advanced Validation

Common Expression Language (CEL) enables complex validation rules:

```go
type ApplicationSpec struct {
    // +kubebuilder:validation:Required
    MinReplicas int32 `json:"minReplicas"`

    // +kubebuilder:validation:Required
    MaxReplicas int32 `json:"maxReplicas"`

    // Validate that maxReplicas >= minReplicas
    // +kubebuilder:validation:XValidation:rule="self.maxReplicas >= self.minReplicas",message="maxReplicas must be greater than or equal to minReplicas"
}

type Database struct {
    // Engine type
    // +kubebuilder:validation:Enum=postgres;mysql;mongodb
    Engine string `json:"engine"`

    // Version (format depends on engine)
    // Postgres: major.minor (e.g., "14.2")
    // MySQL: major.minor.patch (e.g., "8.0.28")
    // +kubebuilder:validation:XValidation:rule="(self.engine == 'postgres' && self.version.matches('^[0-9]+\\.[0-9]+$')) || (self.engine == 'mysql' && self.version.matches('^[0-9]+\\.[0-9]+\\.[0-9]+$')) || self.engine == 'mongodb'",message="version format must match engine requirements"
    Version string `json:"version"`
}
```

## Immutable Fields

Mark fields as immutable after creation:

```go
type ApplicationSpec struct {
    // Name cannot be changed after creation
    // +kubebuilder:validation:Required
    // +kubebuilder:validation:XValidation:rule="self == oldSelf",message="name is immutable"
    Name string `json:"name"`

    // Environment cannot be changed
    // +kubebuilder:validation:Enum=dev;staging;production
    // +kubebuilder:validation:XValidation:rule="self == oldSelf",message="environment is immutable"
    Environment string `json:"environment"`

    // Replicas can be changed
    Replicas int32 `json:"replicas"`
}
```

## Conditional Fields

Validate fields based on other field values:

```go
type BackupSpec struct {
    // Enabled indicates if backups should be taken
    Enabled bool `json:"enabled"`

    // Schedule is required when enabled is true
    // +kubebuilder:validation:XValidation:rule="!self.enabled || has(self.schedule)",message="schedule is required when enabled is true"
    // +optional
    Schedule *string `json:"schedule,omitempty"`

    // Retention is required when enabled is true
    // +kubebuilder:validation:XValidation:rule="!self.enabled || has(self.retention)",message="retention is required when enabled is true"
    // +optional
    Retention *int32 `json:"retention,omitempty"`
}
```

## OneOf Validation

Ensure exactly one field from a group is set:

```go
type StorageSpec struct {
    // Exactly one storage type must be specified
    // +kubebuilder:validation:XValidation:rule="(has(self.disk) ? 1 : 0) + (has(self.nfs) ? 1 : 0) + (has(self.s3) ? 1 : 0) == 1",message="exactly one of disk, nfs, or s3 must be specified"

    // +optional
    Disk *DiskStorage `json:"disk,omitempty"`

    // +optional
    NFS *NFSStorage `json:"nfs,omitempty"`

    // +optional
    S3 *S3Storage `json:"s3,omitempty"`
}
```

## Preserving Unknown Fields

By default, CRDs reject unknown fields. To preserve them:

```go
// +kubebuilder:pruning:PreserveUnknownFields
type FlexibleConfig struct {
    // Standard fields
    Type string `json:"type"`

    // Unknown fields will be preserved
}
```

Or allow at the root:

```go
// +kubebuilder:object:root=true
// +kubebuilder:pruning:PreserveUnknownFields
type Application struct {
    // ...
}
```

## Generating Schemas with controller-gen

If you're not using Kubebuilder's Makefile:

```bash
# Install controller-gen
go install sigs.k8s.io/controller-tools/cmd/controller-gen@latest

# Generate CRDs
controller-gen crd \
  paths=./api/... \
  output:crd:dir=./config/crd/bases

# Generate with validation
controller-gen crd:crdVersions=v1 \
  paths=./api/... \
  output:crd:dir=./config/crd/bases
```

## Viewing Generated Schemas

Check the generated schema:

```bash
# View the CRD
cat config/crd/bases/example.com_applications.yaml

# Apply and inspect
kubectl apply -f config/crd/bases/example.com_applications.yaml
kubectl get crd applications.example.com -o yaml
```

## Testing Validation

Test that validation works:

```bash
# Valid resource
kubectl apply -f - <<EOF
apiVersion: example.com/v1
kind: Application
metadata:
  name: valid-app
spec:
  image: nginx:latest
  replicas: 3
  environment: production
  version: v1.0.0
EOF

# Invalid: replicas too high
kubectl apply -f - <<EOF
apiVersion: example.com/v1
kind: Application
metadata:
  name: invalid-replicas
spec:
  image: nginx:latest
  replicas: 200  # Max is 100
  environment: production
EOF

# Should fail with validation error
```

## Documentation Generation

Generate documentation from schemas:

```bash
# Generate API reference documentation
controller-gen crd:crdVersions=v1 \
  paths=./api/... \
  output:crd:dir=./docs/api
```

Many tools can consume OpenAPI schemas to generate documentation, including:
- crd-ref-docs
- gen-crd-api-reference-docs
- Docusaurus with OpenAPI plugins

Automatic schema generation from Go types ensures your CRD validation stays synchronized with your code, reduces manual errors, and provides rich validation that makes your custom resources reliable and user-friendly.
