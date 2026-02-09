# How to Build a Custom Crossplane Provider for Internal Kubernetes Platform APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Go

Description: Learn how to build custom Crossplane providers that integrate internal platform APIs and services with Crossplane compositions, enabling unified infrastructure management across cloud and on-premise systems.

---

Crossplane providers exist for major cloud platforms, but organizations often have internal APIs for legacy systems, custom platforms, or proprietary services. Building a custom provider lets you manage these through Crossplane compositions, creating a unified control plane for all infrastructure.

This guide shows you how to build a custom provider using Upjet, which generates most code automatically from an OpenAPI specification or Go API client.

## Understanding Crossplane Provider Architecture

Providers contain controllers that reconcile managed resources. When you create a resource, the controller calls external APIs to provision infrastructure. Controllers watch for changes, updating external resources to match desired state.

Custom providers follow the same pattern. You define managed resources, implement controllers that call your APIs, and package everything as a container image.

## Setting Up Provider Development Environment

Install required tools:

```bash
# Install Go 1.21+
brew install go

# Install Crossplane CLI
curl -sL https://raw.githubusercontent.com/crossplane/crossplane/master/install.sh | sh

# Install kubebuilder
curl -L -o kubebuilder https://go.kubebuilder.io/dl/latest/$(go env GOOS)/$(go env GOARCH)
chmod +x kubebuilder && sudo mv kubebuilder /usr/local/bin/

# Install Upjet
go install github.com/crossplane/upjet/cmd/upjet@latest
```

## Creating Provider Scaffold

Initialize a new provider project:

```bash
# Create project directory
mkdir provider-platform && cd provider-platform

# Initialize Go module
go mod init github.com/yourorg/provider-platform

# Create provider structure
mkdir -p apis pkg/controller config
```

Create the provider configuration:

```go
// apis/provider.go
package apis

import (
    "k8s.io/apimachinery/pkg/runtime"
    "sigs.k8s.io/controller-runtime/pkg/scheme"
)

var (
    // Scheme is the runtime scheme
    Scheme = runtime.NewScheme()
)

func init() {
    AddToScheme(Scheme)
}

// AddToScheme adds all types to the scheme
func AddToScheme(s *runtime.Scheme) error {
    return scheme.AddToScheme(s)
}
```

## Defining Custom Managed Resources

Create API types for your platform:

```go
// apis/database/v1alpha1/database_types.go
package v1alpha1

import (
    "reflect"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "github.com/crossplane/crossplane-runtime/apis/common/v1"
)

// DatabaseParameters defines configuration for the database
type DatabaseParameters struct {
    // Name of the database
    // +kubebuilder:validation:Required
    Name string `json:"name"`

    // Engine type (postgres, mysql, etc)
    // +kubebuilder:validation:Required
    // +kubebuilder:validation:Enum=postgres;mysql;mongodb
    Engine string `json:"engine"`

    // Version of the database engine
    // +optional
    Version string `json:"version,omitempty"`

    // Size of the database (small, medium, large)
    // +kubebuilder:validation:Required
    // +kubebuilder:validation:Enum=small;medium;large
    Size string `json:"size"`

    // Region where database is deployed
    // +optional
    Region string `json:"region,omitempty"`

    // Enable backups
    // +optional
    BackupEnabled *bool `json:"backupEnabled,omitempty"`
}

// DatabaseObservation reflects the observed state
type DatabaseObservation struct {
    // Endpoint is the connection endpoint
    Endpoint string `json:"endpoint,omitempty"`

    // Port is the connection port
    Port int `json:"port,omitempty"`

    // Status is the current status
    Status string `json:"status,omitempty"`

    // Created timestamp
    CreatedAt string `json:"createdAt,omitempty"`
}

// DatabaseSpec defines the desired state
type DatabaseSpec struct {
    v1.ResourceSpec `json:",inline"`
    ForProvider     DatabaseParameters `json:"forProvider"`
}

// DatabaseStatus defines the observed state
type DatabaseStatus struct {
    v1.ResourceStatus `json:",inline"`
    AtProvider        DatabaseObservation `json:"atProvider,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster,categories={crossplane,managed,platform}
// +kubebuilder:printcolumn:name="READY",type="string",JSONPath=".status.conditions[?(@.type=='Ready')].status"
// +kubebuilder:printcolumn:name="SYNCED",type="string",JSONPath=".status.conditions[?(@.type=='Synced')].status"
// +kubebuilder:printcolumn:name="ENGINE",type="string",JSONPath=".spec.forProvider.engine"
// +kubebuilder:printcolumn:name="AGE",type="date",JSONPath=".metadata.creationTimestamp"

// Database is a managed resource representing a platform database
type Database struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   DatabaseSpec   `json:"spec"`
    Status DatabaseStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// DatabaseList contains a list of Database resources
type DatabaseList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []Database `json:"items"`
}
```

## Implementing the Controller

Create the reconciliation logic:

```go
// pkg/controller/database/database.go
package database

import (
    "context"
    "fmt"

    "github.com/pkg/errors"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"

    "github.com/crossplane/crossplane-runtime/pkg/reconciler/managed"
    "github.com/crossplane/crossplane-runtime/pkg/resource"

    "github.com/yourorg/provider-platform/apis/database/v1alpha1"
    "github.com/yourorg/provider-platform/pkg/clients/platform"
)

const (
    errNotDatabase    = "managed resource is not a Database"
    errCreateDatabase = "cannot create database"
    errDeleteDatabase = "cannot delete database"
    errDescribeDatabase = "cannot describe database"
)

// Setup adds a controller for Database managed resources
func Setup(mgr ctrl.Manager, o controller.Options) error {
    name := managed.ControllerName(v1alpha1.DatabaseGroupKind)

    r := managed.NewReconciler(mgr,
        resource.ManagedKind(v1alpha1.DatabaseGroupVersionKind),
        managed.WithExternalConnecter(&connector{
            kube:   mgr.GetClient(),
            client: platform.NewClient(),
        }),
        managed.WithLogger(o.Logger.WithValues("controller", name)),
        managed.WithRecorder(event.NewAPIRecorder(mgr.GetEventRecorderFor(name))),
    )

    return ctrl.NewControllerManagedBy(mgr).
        Named(name).
        For(&v1alpha1.Database{}).
        Complete(r)
}

type connector struct {
    kube   client.Client
    client *platform.Client
}

type external struct {
    client *platform.Client
}

func (c *connector) Connect(ctx context.Context, mg resource.Managed) (managed.ExternalClient, error) {
    return &external{client: c.client}, nil
}

func (e *external) Observe(ctx context.Context, mg resource.Managed) (managed.ExternalObservation, error) {
    cr, ok := mg.(*v1alpha1.Database)
    if !ok {
        return managed.ExternalObservation{}, errors.New(errNotDatabase)
    }

    // Call platform API to get database status
    db, err := e.client.GetDatabase(ctx, cr.Spec.ForProvider.Name)
    if err != nil {
        if platform.IsNotFound(err) {
            return managed.ExternalObservation{
                ResourceExists: false,
            }, nil
        }
        return managed.ExternalObservation{}, errors.Wrap(err, errDescribeDatabase)
    }

    // Update status with observed values
    cr.Status.AtProvider = v1alpha1.DatabaseObservation{
        Endpoint:  db.Endpoint,
        Port:      db.Port,
        Status:    db.Status,
        CreatedAt: db.CreatedAt,
    }

    // Set connection details
    cd := managed.ConnectionDetails{
        "endpoint": []byte(db.Endpoint),
        "port":     []byte(fmt.Sprintf("%d", db.Port)),
        "username": []byte(db.Username),
        "password": []byte(db.Password),
    }

    return managed.ExternalObservation{
        ResourceExists:    true,
        ResourceUpToDate:  true,
        ConnectionDetails: cd,
    }, nil
}

func (e *external) Create(ctx context.Context, mg resource.Managed) (managed.ExternalCreation, error) {
    cr, ok := mg.(*v1alpha1.Database)
    if !ok {
        return managed.ExternalCreation{}, errors.New(errNotDatabase)
    }

    // Create database via platform API
    req := &platform.CreateDatabaseRequest{
        Name:          cr.Spec.ForProvider.Name,
        Engine:        cr.Spec.ForProvider.Engine,
        Version:       cr.Spec.ForProvider.Version,
        Size:          cr.Spec.ForProvider.Size,
        Region:        cr.Spec.ForProvider.Region,
        BackupEnabled: cr.Spec.ForProvider.BackupEnabled,
    }

    db, err := e.client.CreateDatabase(ctx, req)
    if err != nil {
        return managed.ExternalCreation{}, errors.Wrap(err, errCreateDatabase)
    }

    return managed.ExternalCreation{
        ConnectionDetails: managed.ConnectionDetails{
            "endpoint": []byte(db.Endpoint),
            "username": []byte(db.Username),
            "password": []byte(db.Password),
        },
    }, nil
}

func (e *external) Update(ctx context.Context, mg resource.Managed) (managed.ExternalUpdate, error) {
    cr, ok := mg.(*v1alpha1.Database)
    if !ok {
        return managed.ExternalUpdate{}, errors.New(errNotDatabase)
    }

    // Update database via platform API
    req := &platform.UpdateDatabaseRequest{
        Name:          cr.Spec.ForProvider.Name,
        Size:          cr.Spec.ForProvider.Size,
        BackupEnabled: cr.Spec.ForProvider.BackupEnabled,
    }

    _, err := e.client.UpdateDatabase(ctx, req)
    return managed.ExternalUpdate{}, err
}

func (e *external) Delete(ctx context.Context, mg resource.Managed) error {
    cr, ok := mg.(*v1alpha1.Database)
    if !ok {
        return errors.New(errNotDatabase)
    }

    // Delete database via platform API
    err := e.client.DeleteDatabase(ctx, cr.Spec.ForProvider.Name)
    if err != nil && !platform.IsNotFound(err) {
        return errors.Wrap(err, errDeleteDatabase)
    }

    return nil
}
```

## Creating the Platform API Client

Implement the client for your platform:

```go
// pkg/clients/platform/client.go
package platform

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
)

type Client struct {
    baseURL    string
    httpClient *http.Client
    apiKey     string
}

func NewClient() *Client {
    return &Client{
        baseURL:    "https://platform.example.com/api/v1",
        httpClient: &http.Client{},
        apiKey:     "", // Load from credentials
    }
}

type CreateDatabaseRequest struct {
    Name          string `json:"name"`
    Engine        string `json:"engine"`
    Version       string `json:"version,omitempty"`
    Size          string `json:"size"`
    Region        string `json:"region,omitempty"`
    BackupEnabled *bool  `json:"backupEnabled,omitempty"`
}

type DatabaseResponse struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    Engine    string `json:"engine"`
    Endpoint  string `json:"endpoint"`
    Port      int    `json:"port"`
    Status    string `json:"status"`
    Username  string `json:"username"`
    Password  string `json:"password"`
    CreatedAt string `json:"createdAt"`
}

func (c *Client) CreateDatabase(ctx context.Context, req *CreateDatabaseRequest) (*DatabaseResponse, error) {
    data, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }

    httpReq, err := http.NewRequestWithContext(ctx, "POST",
        fmt.Sprintf("%s/databases", c.baseURL),
        bytes.NewReader(data))
    if err != nil {
        return nil, err
    }

    httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
    httpReq.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
    }

    var db DatabaseResponse
    if err := json.NewDecoder(resp.Body).Decode(&db); err != nil {
        return nil, err
    }

    return &db, nil
}

func (c *Client) GetDatabase(ctx context.Context, name string) (*DatabaseResponse, error) {
    httpReq, err := http.NewRequestWithContext(ctx, "GET",
        fmt.Sprintf("%s/databases/%s", c.baseURL, name), nil)
    if err != nil {
        return nil, err
    }

    httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusNotFound {
        return nil, &NotFoundError{}
    }

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
    }

    var db DatabaseResponse
    if err := json.NewDecoder(resp.Body).Decode(&db); err != nil {
        return nil, err
    }

    return &db, nil
}

func (c *Client) DeleteDatabase(ctx context.Context, name string) error {
    httpReq, err := http.NewRequestWithContext(ctx, "DELETE",
        fmt.Sprintf("%s/databases/%s", c.baseURL, name), nil)
    if err != nil {
        return err
    }

    httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusNotFound {
        return &NotFoundError{}
    }

    if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
        return fmt.Errorf("API returned status %d", resp.StatusCode)
    }

    return nil
}

type NotFoundError struct{}

func (e *NotFoundError) Error() string {
    return "resource not found"
}

func IsNotFound(err error) bool {
    _, ok := err.(*NotFoundError)
    return ok
}
```

## Building and Packaging the Provider

Create Dockerfile:

```dockerfile
# Dockerfile
FROM golang:1.21 as builder

WORKDIR /workspace

# Copy go mod files
COPY go.mod go.mod
COPY go.sum go.sum
RUN go mod download

# Copy source
COPY apis/ apis/
COPY pkg/ pkg/
COPY cmd/ cmd/

# Build
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -o provider cmd/provider/main.go

# Final image
FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=builder /workspace/provider .
USER 65532:65532

ENTRYPOINT ["/provider"]
```

Build and push:

```bash
# Build image
docker build -t yourorg/provider-platform:v0.1.0 .

# Push to registry
docker push yourorg/provider-platform:v0.1.0
```

## Installing the Custom Provider

Create provider package:

```yaml
# provider.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-platform
spec:
  package: yourorg/provider-platform:v0.1.0
  controllerConfigRef:
    name: platform-config
---
apiVersion: pkg.crossplane.io/v1alpha1
kind: ControllerConfig
metadata:
  name: platform-config
spec:
  serviceAccountName: provider-platform
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: provider-platform
  namespace: crossplane-system
```

Install the provider:

```bash
kubectl apply -f provider.yaml
kubectl wait --for=condition=Healthy provider/provider-platform --timeout=300s
```

## Using the Custom Provider

Create a database:

```yaml
# database.yaml
apiVersion: database.platform.example.com/v1alpha1
kind: Database
metadata:
  name: myapp-db
spec:
  forProvider:
    name: myapp-production
    engine: postgres
    version: "15"
    size: large
    region: us-west-2
    backupEnabled: true
  writeConnectionSecretToRef:
    name: myapp-db-credentials
    namespace: default
```

Apply and verify:

```bash
kubectl apply -f database.yaml
kubectl get database myapp-db
kubectl get secret myapp-db-credentials
```

## Summary

Custom Crossplane providers extend Crossplane to manage any infrastructure through consistent Kubernetes APIs. By implementing managed resources and controllers, you integrate internal platforms, legacy systems, or proprietary services into Crossplane compositions. This creates a unified control plane where cloud resources, Kubernetes workloads, and custom infrastructure are all managed declaratively through the same patterns and tooling.
