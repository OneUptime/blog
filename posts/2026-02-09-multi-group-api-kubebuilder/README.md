# How to Build a Multi-Group API with Kubebuilder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubebuilder, API Groups

Description: Learn how to organize related custom resources into multiple API groups using Kubebuilder, creating a well-structured operator with logical resource organization.

---

As your Kubernetes operator grows, you'll create multiple related custom resources. Organizing these resources into logical API groups makes your API easier to understand and use. Kubebuilder supports multi-group APIs, letting you separate resources by domain or functionality rather than cramming everything into a single group.

Multi-group APIs improve clarity, allow independent versioning of resource sets, and make it easier for users to understand which resources work together. A database operator might have separate groups for databases, backups, and monitoring, each with its own evolution path.

## Understanding API Groups

An API group is the domain portion of an API resource. For example, in `apps.example.com/v1`, the group is `apps.example.com`. Resources like Deployment use the `apps` group, while Pods use the core (empty) group.

When you create multiple groups, each has its own:
- Independent version history
- Separate resource types
- Distinct controllers
- Own conversion webhooks

## Creating a Multi-Group Project

Initialize a Kubebuilder project with multi-group support:

```bash
# Create project
kubebuilder init \
  --domain example.com \
  --repo github.com/myorg/myoperator \
  --multi-group

cd myoperator
```

The `--multi-group` flag changes the project structure to organize APIs by group.

## Adding Resources to Different Groups

Create resources in different groups:

```bash
# Create resources in the "compute" group
kubebuilder create api \
  --group compute \
  --version v1 \
  --kind Application \
  --resource \
  --controller

kubebuilder create api \
  --group compute \
  --version v1 \
  --kind Environment \
  --resource \
  --controller

# Create resources in the "storage" group
kubebuilder create api \
  --group storage \
  --version v1 \
  --kind Database \
  --resource \
  --controller

kubebuilder create api \
  --group storage \
  --version v1 \
  --kind Backup \
  --resource \
  --controller

# Create resources in the "networking" group
kubebuilder create api \
  --group networking \
  --version v1 \
  --kind Gateway \
  --resource \
  --controller
```

## Project Structure

Multi-group projects organize code by group:

```
myoperator/
├── api/
│   ├── compute/
│   │   └── v1/
│   │       ├── application_types.go
│   │       ├── environment_types.go
│   │       ├── groupversion_info.go
│   │       └── zz_generated.deepcopy.go
│   ├── storage/
│   │   └── v1/
│   │       ├── database_types.go
│   │       ├── backup_types.go
│   │       ├── groupversion_info.go
│   │       └── zz_generated.deepcopy.go
│   └── networking/
│       └── v1/
│           ├── gateway_types.go
│           ├── groupversion_info.go
│           └── zz_generated.deepcopy.go
├── controllers/
│   ├── compute/
│   │   ├── application_controller.go
│   │   └── environment_controller.go
│   ├── storage/
│   │   ├── database_controller.go
│   │   └── backup_controller.go
│   └── networking/
│       └── gateway_controller.go
└── main.go
```

## Defining Resources in Different Groups

Each group has its own types. Here's an example from the compute group:

```go
// api/compute/v1/application_types.go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Namespaced

type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

type ApplicationSpec struct {
    Image    string `json:"image"`
    Replicas int32  `json:"replicas"`

    // Reference to storage group resource
    DatabaseRef string `json:"databaseRef,omitempty"`
}

type ApplicationStatus struct {
    Phase string `json:"phase,omitempty"`
    Ready bool   `json:"ready,omitempty"`
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

And from the storage group:

```go
// api/storage/v1/database_types.go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

type Database struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   DatabaseSpec   `json:"spec,omitempty"`
    Status DatabaseStatus `json:"status,omitempty"`
}

type DatabaseSpec struct {
    Engine  string `json:"engine"`
    Version string `json:"version"`
    Storage string `json:"storage"`
}

type DatabaseStatus struct {
    Phase    string `json:"phase,omitempty"`
    Endpoint string `json:"endpoint,omitempty"`
}

// +kubebuilder:object:root=true

type DatabaseList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []Database `json:"items"`
}

func init() {
    SchemeBuilder.Register(&Database{}, &DatabaseList{})
}
```

## Updating main.go for Multiple Groups

Register all groups in your main function:

```go
package main

import (
    "flag"
    "os"

    "k8s.io/apimachinery/pkg/runtime"
    utilruntime "k8s.io/apimachinery/pkg/util/runtime"
    clientgoscheme "k8s.io/client-go/kubernetes/scheme"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"

    // Import all API groups
    computev1 "github.com/myorg/myoperator/api/compute/v1"
    storagev1 "github.com/myorg/myoperator/api/storage/v1"
    networkingv1 "github.com/myorg/myoperator/api/networking/v1"

    // Import all controllers
    computecontrollers "github.com/myorg/myoperator/controllers/compute"
    storagecontrollers "github.com/myorg/myoperator/controllers/storage"
    networkingcontrollers "github.com/myorg/myoperator/controllers/networking"
)

var (
    scheme   = runtime.NewScheme()
    setupLog = ctrl.Log.WithName("setup")
)

func init() {
    utilruntime.Must(clientgoscheme.AddToScheme(scheme))

    // Register all API groups
    utilruntime.Must(computev1.AddToScheme(scheme))
    utilruntime.Must(storagev1.AddToScheme(scheme))
    utilruntime.Must(networkingv1.AddToScheme(scheme))
}

func main() {
    var metricsAddr string
    var enableLeaderElection bool

    flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
    flag.BoolVar(&enableLeaderElection, "leader-elect", false, "Enable leader election for controller manager.")
    flag.Parse()

    ctrl.SetLogger(zap.New(zap.UseDevMode(true)))

    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
        Scheme:             scheme,
        MetricsBindAddress: metricsAddr,
        LeaderElection:     enableLeaderElection,
        LeaderElectionID:   "myoperator.example.com",
    })
    if err != nil {
        setupLog.Error(err, "unable to start manager")
        os.Exit(1)
    }

    // Setup compute controllers
    if err = (&computecontrollers.ApplicationReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create controller", "controller", "Application")
        os.Exit(1)
    }

    if err = (&computecontrollers.EnvironmentReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create controller", "controller", "Environment")
        os.Exit(1)
    }

    // Setup storage controllers
    if err = (&storagecontrollers.DatabaseReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create controller", "controller", "Database")
        os.Exit(1)
    }

    if err = (&storagecontrollers.BackupReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create controller", "controller", "Backup")
        os.Exit(1)
    }

    // Setup networking controllers
    if err = (&networkingcontrollers.GatewayReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create controller", "controller", "Gateway")
        os.Exit(1)
    }

    setupLog.Info("starting manager")
    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        setupLog.Error(err, "problem running manager")
        os.Exit(1)
    }
}
```

## Cross-Group References

Resources can reference resources from other groups:

```go
// api/compute/v1/application_types.go
type ApplicationSpec struct {
    Image    string `json:"image"`
    Replicas int32  `json:"replicas"`

    // Reference to a Database from storage group
    DatabaseRef *DatabaseReference `json:"databaseRef,omitempty"`
}

type DatabaseReference struct {
    Name      string `json:"name"`
    Namespace string `json:"namespace,omitempty"`
}
```

In the controller, fetch the referenced resource:

```go
// controllers/compute/application_controller.go
import (
    storagev1 "github.com/myorg/myoperator/api/storage/v1"
)

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    app := &computev1.Application{}
    if err := r.Get(ctx, req.NamespacedName, app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Fetch referenced database from storage group
    if app.Spec.DatabaseRef != nil {
        db := &storagev1.Database{}
        dbName := types.NamespacedName{
            Name:      app.Spec.DatabaseRef.Name,
            Namespace: app.Spec.DatabaseRef.Namespace,
        }

        if err := r.Get(ctx, dbName, db); err != nil {
            return ctrl.Result{}, err
        }

        // Use database endpoint in application configuration
        endpoint := db.Status.Endpoint
        // ... configure application with database endpoint ...
    }

    return ctrl.Result{}, nil
}
```

## Generating Manifests

Generate CRDs for all groups:

```bash
make manifests
```

This creates CRDs in `config/crd/bases/`:

```
config/crd/bases/
├── compute.example.com_applications.yaml
├── compute.example.com_environments.yaml
├── storage.example.com_databases.yaml
├── storage.example.com_backups.yaml
└── networking.example.com_gateways.yaml
```

## Installing CRDs

Install all CRDs:

```bash
make install
```

Verify:

```bash
kubectl get crd

NAME                                  CREATED AT
applications.compute.example.com     2026-02-09T10:00:00Z
environments.compute.example.com     2026-02-09T10:00:00Z
databases.storage.example.com        2026-02-09T10:00:00Z
backups.storage.example.com          2026-02-09T10:00:00Z
gateways.networking.example.com      2026-02-09T10:00:00Z
```

## Using Resources from Multiple Groups

Create resources from different groups:

```yaml
# Application from compute group
apiVersion: compute.example.com/v1
kind: Application
metadata:
  name: webapp
  namespace: default
spec:
  image: nginx:latest
  replicas: 3
  databaseRef:
    name: mydb
    namespace: default
---
# Database from storage group
apiVersion: storage.example.com/v1
kind: Database
metadata:
  name: mydb
  namespace: default
spec:
  engine: postgres
  version: "14"
  storage: 10Gi
---
# Gateway from networking group
apiVersion: networking.example.com/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: default
spec:
  listeners:
  - port: 80
    protocol: HTTP
```

## Versioning Groups Independently

Each group can evolve independently:

```bash
# Add v2 to compute group
kubebuilder create api \
  --group compute \
  --version v2 \
  --kind Application \
  --resource \
  --controller

# Storage group stays at v1
# This allows compute resources to evolve without affecting storage
```

## Best Practices for Multi-Group APIs

Group related resources together. Put databases, backups, and restores in a storage group. Put ingress, services, and routes in a networking group.

Use consistent naming within each group. If compute group has Applications and Environments, don't suddenly add an unrelated Backup resource there.

Keep cross-group dependencies minimal. Too many dependencies make the API harder to understand and version independently.

Document which groups exist and what each contains. Add comments to your API types explaining the organization.

Multi-group APIs create clean separation between different domains in your operator, making it easier to understand, maintain, and evolve your custom resources over time.
