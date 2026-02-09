# Building Custom Kubernetes Operators with the Operator SDK Framework
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Operator SDK, Kubernetes, Custom Operator, Go, Automation
Description: A step-by-step guide to building custom Kubernetes operators using the Operator SDK framework, covering project scaffolding, API definition, controller logic, testing, and deployment.
---

Kubernetes operators extend the platform by encoding operational knowledge into software. Instead of manually managing complex stateful applications, an operator watches for custom resources and automatically performs the tasks a human operator would: provisioning, scaling, upgrading, backing up, and recovering. The Operator SDK, maintained by the Operator Framework project, provides the tools and scaffolding to build operators in Go, Ansible, or Helm. This guide focuses on the Go-based approach, walking through every stage from project initialization to production deployment.

## What Is an Operator

An operator is a Kubernetes controller that watches one or more custom resources and takes action to manage the lifecycle of an application or infrastructure component. The operator pattern combines two Kubernetes concepts:

- **Custom Resource Definitions (CRDs)**: Extend the Kubernetes API with new resource types.
- **Custom Controllers**: Watch those resources and execute business logic.

For example, a PostgreSQL operator might define a `PostgresCluster` CRD. When a user creates a `PostgresCluster` resource, the operator provisions a StatefulSet, creates PersistentVolumeClaims, sets up replication, configures backups, and monitors health, all automatically.

## Installing the Operator SDK

Install the Operator SDK CLI:

```bash
# macOS
brew install operator-sdk

# Linux
export ARCH=$(case $(uname -m) in x86_64) echo amd64 ;; aarch64) echo arm64 ;; esac)
export OS=$(uname | awk '{print tolower($0)}')
export OPERATOR_SDK_DL_URL=https://github.com/operator-framework/operator-sdk/releases/download/v1.34.0
curl -LO ${OPERATOR_SDK_DL_URL}/operator-sdk_${OS}_${ARCH}
chmod +x operator-sdk_${OS}_${ARCH}
sudo mv operator-sdk_${OS}_${ARCH} /usr/local/bin/operator-sdk
```

Verify the installation:

```bash
operator-sdk version
```

## Scaffolding a New Project

Create a new directory and initialize the project:

```bash
mkdir memcached-operator && cd memcached-operator
operator-sdk init --domain example.com --repo github.com/example/memcached-operator
```

This creates the project structure:

```
.
├── Dockerfile
├── Makefile
├── PROJECT
├── cmd/
│   └── main.go
├── config/
│   ├── crd/
│   ├── default/
│   ├── manager/
│   ├── prometheus/
│   └── rbac/
├── go.mod
├── go.sum
└── internal/
    └── controller/
```

The `config/` directory contains Kustomize bases for deploying the operator. The `cmd/main.go` file is the entry point that sets up the controller manager.

## Creating an API and Controller

Generate a new API type and controller:

```bash
operator-sdk create api --group cache --version v1alpha1 --kind Memcached --resource --controller
```

This creates two important files:

- `api/v1alpha1/memcached_types.go` - The Go type definition for your CRD
- `internal/controller/memcached_controller.go` - The controller with the Reconcile method

## Defining the Custom Resource Spec and Status

Edit `api/v1alpha1/memcached_types.go` to define the fields users can set and the status the operator reports:

```go
package v1alpha1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MemcachedSpec defines the desired state of Memcached
type MemcachedSpec struct {
    // Size defines the number of Memcached instances
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=10
    Size int32 `json:"size"`

    // Image defines the container image to use
    // +kubebuilder:default="memcached:1.6-alpine"
    Image string `json:"image,omitempty"`

    // Port defines the port Memcached listens on
    // +kubebuilder:default=11211
    Port int32 `json:"port,omitempty"`

    // MemoryLimit defines the maximum memory in megabytes
    // +kubebuilder:validation:Minimum=64
    // +kubebuilder:default=128
    MemoryLimit int32 `json:"memoryLimit,omitempty"`
}

// MemcachedStatus defines the observed state of Memcached
type MemcachedStatus struct {
    // Nodes are the names of the Memcached pods
    Nodes []string `json:"nodes,omitempty"`

    // ReadyReplicas is the number of ready pods
    ReadyReplicas int32 `json:"readyReplicas,omitempty"`

    // Conditions represent the latest available observations
    Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Size",type="integer",JSONPath=".spec.size"
//+kubebuilder:printcolumn:name="Ready",type="integer",JSONPath=".status.readyReplicas"
//+kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// Memcached is the Schema for the memcacheds API
type Memcached struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   MemcachedSpec   `json:"spec,omitempty"`
    Status MemcachedStatus `json:"status,omitempty"`
}
```

The kubebuilder markers above the `Memcached` struct define the CRD behavior: `+kubebuilder:subresource:status` enables the status subresource, and `+kubebuilder:printcolumn` adds columns to `kubectl get` output.

After editing the types, regenerate the CRD manifests and deep copy methods:

```bash
make generate
make manifests
```

## Implementing the Controller

Edit `internal/controller/memcached_controller.go`:

```go
package controller

import (
    "context"
    "reflect"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/types"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"

    cachev1alpha1 "github.com/example/memcached-operator/api/v1alpha1"
)

type MemcachedReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=cache.example.com,resources=memcacheds,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cache.example.com,resources=memcacheds/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cache.example.com,resources=memcacheds/finalizers,verbs=update
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=pods,verbs=get;list;watch

func (r *MemcachedReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    // Fetch the Memcached instance
    memcached := &cachev1alpha1.Memcached{}
    err := r.Get(ctx, req.NamespacedName, memcached)
    if err != nil {
        if errors.IsNotFound(err) {
            logger.Info("Memcached resource not found")
            return ctrl.Result{}, nil
        }
        return ctrl.Result{}, err
    }

    // Check if the Deployment already exists
    found := &appsv1.Deployment{}
    err = r.Get(ctx, types.NamespacedName{
        Name:      memcached.Name,
        Namespace: memcached.Namespace,
    }, found)

    if err != nil && errors.IsNotFound(err) {
        dep := r.deploymentForMemcached(memcached)
        logger.Info("Creating a new Deployment",
            "Deployment.Namespace", dep.Namespace,
            "Deployment.Name", dep.Name)
        err = r.Create(ctx, dep)
        if err != nil {
            return ctrl.Result{}, err
        }
        return ctrl.Result{Requeue: true}, nil
    } else if err != nil {
        return ctrl.Result{}, err
    }

    // Ensure the deployment size matches the spec
    size := memcached.Spec.Size
    if *found.Spec.Replicas != size {
        found.Spec.Replicas = &size
        err = r.Update(ctx, found)
        if err != nil {
            return ctrl.Result{}, err
        }
        return ctrl.Result{Requeue: true}, nil
    }

    // Update status with pod names
    podList := &corev1.PodList{}
    listOpts := []client.ListOption{
        client.InNamespace(memcached.Namespace),
        client.MatchingLabels(labelsForMemcached(memcached.Name)),
    }
    if err = r.List(ctx, podList, listOpts...); err != nil {
        return ctrl.Result{}, err
    }
    podNames := getPodNames(podList.Items)

    if !reflect.DeepEqual(podNames, memcached.Status.Nodes) {
        memcached.Status.Nodes = podNames
        memcached.Status.ReadyReplicas = int32(len(podNames))
        err := r.Status().Update(ctx, memcached)
        if err != nil {
            return ctrl.Result{}, err
        }
    }

    return ctrl.Result{}, nil
}

func (r *MemcachedReconciler) deploymentForMemcached(m *cachev1alpha1.Memcached) *appsv1.Deployment {
    labels := labelsForMemcached(m.Name)
    replicas := m.Spec.Size

    dep := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      m.Name,
            Namespace: m.Namespace,
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
                        Image:   m.Spec.Image,
                        Name:    "memcached",
                        Command: []string{"memcached", "-m", fmt.Sprintf("%d", m.Spec.MemoryLimit), "-o", "modern", "-v"},
                        Ports: []corev1.ContainerPort{{
                            ContainerPort: m.Spec.Port,
                            Name:          "memcached",
                        }},
                    }},
                },
            },
        },
    }
    ctrl.SetControllerReference(m, dep, r.Scheme)
    return dep
}

func labelsForMemcached(name string) map[string]string {
    return map[string]string{
        "app":                          "memcached",
        "app.kubernetes.io/name":       "memcached",
        "app.kubernetes.io/instance":   name,
        "app.kubernetes.io/managed-by": "memcached-operator",
    }
}

func getPodNames(pods []corev1.Pod) []string {
    var podNames []string
    for _, pod := range pods {
        podNames = append(podNames, pod.Name)
    }
    return podNames
}
```

## Building and Deploying the Operator

Build the operator image:

```bash
make docker-build IMG=example.com/memcached-operator:v0.1.0
```

Push to a container registry:

```bash
make docker-push IMG=example.com/memcached-operator:v0.1.0
```

Deploy to the cluster:

```bash
make deploy IMG=example.com/memcached-operator:v0.1.0
```

This installs the CRD, creates the operator namespace, deploys the controller manager, and sets up RBAC.

## Testing with a Sample Resource

Create a sample Memcached resource:

```yaml
apiVersion: cache.example.com/v1alpha1
kind: Memcached
metadata:
  name: memcached-sample
  namespace: default
spec:
  size: 3
  image: memcached:1.6-alpine
  port: 11211
  memoryLimit: 256
```

Apply it and watch the operator work:

```bash
kubectl apply -f config/samples/cache_v1alpha1_memcached.yaml
kubectl get memcached
kubectl get deployments
kubectl get pods
```

## Writing Tests

The Operator SDK scaffolds integration test infrastructure using envtest, which runs a local control plane. Write tests in `internal/controller/memcached_controller_test.go`:

```go
var _ = Describe("Memcached Controller", func() {
    Context("When creating a Memcached resource", func() {
        It("Should create a Deployment with the correct replicas", func() {
            ctx := context.Background()
            memcached := &cachev1alpha1.Memcached{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "test-memcached",
                    Namespace: "default",
                },
                Spec: cachev1alpha1.MemcachedSpec{
                    Size:        3,
                    Image:       "memcached:1.6-alpine",
                    Port:        11211,
                    MemoryLimit: 128,
                },
            }
            Expect(k8sClient.Create(ctx, memcached)).To(Succeed())

            deployment := &appsv1.Deployment{}
            Eventually(func() error {
                return k8sClient.Get(ctx, types.NamespacedName{
                    Name:      "test-memcached",
                    Namespace: "default",
                }, deployment)
            }, timeout, interval).Should(Succeed())

            Expect(*deployment.Spec.Replicas).To(Equal(int32(3)))
        })
    })
})
```

Run the tests:

```bash
make test
```

## Cleanup and Uninstall

To remove the operator and all its resources:

```bash
make undeploy
```

## Conclusion

The Operator SDK dramatically reduces the boilerplate involved in building Kubernetes operators. It handles project scaffolding, CRD generation, RBAC configuration, and test infrastructure, letting you focus on the business logic in your reconciliation loop. Start with a simple operator that manages a single child resource, get comfortable with the patterns, and gradually add complexity like finalizers, validation webhooks, and multi-resource management. The operator pattern is one of the most powerful extension mechanisms in Kubernetes, and the Operator SDK makes it accessible to any Go developer.
