# How to Build Kubernetes Operators That Handle Cluster-Scoped Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operators, Cluster-Scoped Resources

Description: Learn how to build operators that manage cluster-scoped resources, understanding the differences from namespace-scoped resources and handling RBAC permissions correctly.

---

Most Kubernetes resources are namespace-scoped, existing within a specific namespace. But some resources like Nodes, PersistentVolumes, and ClusterRoles exist at the cluster level. When building operators, you need to handle cluster-scoped resources differently, especially regarding RBAC permissions, watches, and owner references.

Understanding these differences is critical when your operator manages infrastructure components, security policies, or cluster-wide configuration that doesn't belong to any single namespace.

## Namespace-Scoped vs Cluster-Scoped

Namespace-scoped resources have a namespace field and are isolated to that namespace. Users with namespace-level permissions can manage them. Examples: Pods, Deployments, Services, ConfigMaps.

Cluster-scoped resources don't have a namespace and are visible cluster-wide. They require cluster-level permissions to manage. Examples: Nodes, Namespaces, ClusterRoles, PersistentVolumes, CustomResourceDefinitions.

## Defining a Cluster-Scoped CRD

Set the scope to Cluster in your CRD:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: clusters.example.com
spec:
  group: example.com
  names:
    kind: Cluster
    plural: clusters
    singular: cluster
  scope: Cluster  # Not Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              region:
                type: string
              nodes:
                type: integer
```

With Kubebuilder:

```go
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status

type Cluster struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ClusterSpec   `json:"spec,omitempty"`
    Status ClusterStatus `json:"status,omitempty"`
}
```

## RBAC for Cluster-Scoped Resources

Cluster-scoped resources require ClusterRole permissions, not Role:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-manager
rules:
# Manage cluster-scoped custom resource
- apiGroups: ["example.com"]
  resources: ["clusters"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Update status subresource
- apiGroups: ["example.com"]
  resources: ["clusters/status"]
  verbs: ["get", "update", "patch"]
# Manage other cluster-scoped resources
- apiGroups: [""]
  resources: ["nodes", "persistentvolumes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["clusterroles", "clusterrolebindings"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-manager-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-manager
subjects:
- kind: ServiceAccount
  name: cluster-operator
  namespace: operator-system
```

Note the ClusterRoleBinding instead of RoleBinding.

## Reconciling Cluster-Scoped Resources

The reconciliation pattern is similar, but you don't specify namespaces:

```go
package controllers

import (
    "context"

    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"

    examplev1 "github.com/myorg/myoperator/api/v1"
)

type ClusterReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=example.com,resources=clusters,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=example.com,resources=clusters/status,verbs=get;update;patch
// +kubebuilder:rbac:groups="",resources=nodes,verbs=get;list;watch

func (r *ClusterReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)

    // Note: req.Namespace will be empty for cluster-scoped resources
    cluster := &examplev1.Cluster{}
    if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    log.Info("Reconciling cluster", "name", cluster.Name)

    // List nodes (cluster-scoped)
    nodes := &corev1.NodeList{}
    if err := r.List(ctx, nodes); err != nil {
        return ctrl.Result{}, err
    }

    // Update cluster status
    cluster.Status.NodeCount = len(nodes.Items)
    cluster.Status.Phase = "Running"

    if err := r.Status().Update(ctx, cluster); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}

func (r *ClusterReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&examplev1.Cluster{}).
        Complete(r)
}
```

## Watching Cluster-Scoped Resources

Watch cluster-scoped resources without namespace filters:

```go
func (r *ClusterReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&examplev1.Cluster{}).
        Owns(&rbacv1.ClusterRole{}).  // Watch cluster-scoped resources
        Complete(r)
}
```

List cluster-scoped resources:

```go
// List all PersistentVolumes (cluster-scoped)
pvList := &corev1.PersistentVolumeList{}
err := r.List(ctx, pvList)

// List all Namespaces
nsList := &corev1.NamespaceList{}
err := r.List(ctx, nsList)

// List with labels
err := r.List(ctx, pvList, client.MatchingLabels{"storage-class": "fast"})
```

## Owner References for Cluster-Scoped Resources

Owner references have restrictions with cluster-scoped resources:

**Cluster-scoped resources can own other cluster-scoped resources**:

```go
// Cluster owns ClusterRole (both cluster-scoped)
if err := ctrl.SetControllerReference(cluster, clusterRole, r.Scheme); err != nil {
    return err
}
```

**Cluster-scoped resources CANNOT own namespace-scoped resources**:

```go
// This will FAIL - cluster-scoped cannot own namespace-scoped
// cluster (cluster-scoped) cannot own deployment (namespace-scoped)
if err := ctrl.SetControllerReference(cluster, deployment, r.Scheme); err != nil {
    // Error: cross-namespace owner references are disallowed
    return err
}
```

Instead, use labels and custom cleanup logic:

```go
// Label namespace-scoped resources instead of using owner references
deployment := &appsv1.Deployment{
    ObjectMeta: metav1.ObjectMeta{
        Name:      "worker",
        Namespace: "default",
        Labels: map[string]string{
            "cluster.example.com/name": cluster.Name,
            "managed-by":               "cluster-operator",
        },
    },
    // ...
}

// Create without owner reference
if err := r.Create(ctx, deployment); err != nil {
    return err
}
```

Clean up manually in a finalizer:

```go
func (r *ClusterReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    cluster := &examplev1.Cluster{}
    if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Add finalizer if not present
    if !controllerutil.ContainsFinalizer(cluster, "cluster.example.com/finalizer") {
        controllerutil.AddFinalizer(cluster, "cluster.example.com/finalizer")
        if err := r.Update(ctx, cluster); err != nil {
            return ctrl.Result{}, err
        }
    }

    // Handle deletion
    if !cluster.DeletionTimestamp.IsZero() {
        if controllerutil.ContainsFinalizer(cluster, "cluster.example.com/finalizer") {
            // Clean up namespace-scoped resources
            if err := r.cleanupNamespacedResources(ctx, cluster); err != nil {
                return ctrl.Result{}, err
            }

            // Remove finalizer
            controllerutil.RemoveFinalizer(cluster, "cluster.example.com/finalizer")
            if err := r.Update(ctx, cluster); err != nil {
                return ctrl.Result{}, err
            }
        }
        return ctrl.Result{}, nil
    }

    // Normal reconciliation
    return ctrl.Result{}, nil
}

func (r *ClusterReconciler) cleanupNamespacedResources(ctx context.Context, cluster *examplev1.Cluster) error {
    // Delete deployments labeled with this cluster
    deployments := &appsv1.DeploymentList{}
    if err := r.List(ctx, deployments, client.MatchingLabels{
        "cluster.example.com/name": cluster.Name,
    }); err != nil {
        return err
    }

    for _, deployment := range deployments.Items {
        if err := r.Delete(ctx, &deployment); err != nil {
            return err
        }
    }

    return nil
}
```

## Managing Resources Across Namespaces

Cluster-scoped operators often create resources in multiple namespaces:

```go
func (r *ClusterReconciler) reconcileNamespaceResources(ctx context.Context, cluster *examplev1.Cluster) error {
    // Get all namespaces
    namespaces := &corev1.NamespaceList{}
    if err := r.List(ctx, namespaces); err != nil {
        return err
    }

    // Create a ConfigMap in each namespace
    for _, ns := range namespaces.Items {
        // Skip system namespaces
        if ns.Name == "kube-system" || ns.Name == "kube-public" {
            continue
        }

        configMap := &corev1.ConfigMap{
            ObjectMeta: metav1.ObjectMeta{
                Name:      "cluster-config",
                Namespace: ns.Name,
                Labels: map[string]string{
                    "cluster.example.com/name": cluster.Name,
                },
            },
            Data: map[string]string{
                "region":      cluster.Spec.Region,
                "cluster-id":  cluster.Name,
            },
        }

        // Create or update
        existing := &corev1.ConfigMap{}
        err := r.Get(ctx, client.ObjectKey{
            Name:      configMap.Name,
            Namespace: configMap.Namespace,
        }, existing)

        if err != nil {
            if apierrors.IsNotFound(err) {
                if err := r.Create(ctx, configMap); err != nil {
                    return err
                }
            } else {
                return err
            }
        } else {
            configMap.ResourceVersion = existing.ResourceVersion
            if err := r.Update(ctx, configMap); err != nil {
                return err
            }
        }
    }

    return nil
}
```

## RBAC for Multi-Namespace Resources

When creating resources across namespaces, you need cluster-wide permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-operator
rules:
# Cluster-scoped custom resource
- apiGroups: ["example.com"]
  resources: ["clusters"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Namespace-scoped resources across all namespaces
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# List namespaces
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch"]
```

## Using Cluster-Scoped Resources

Create and manage cluster-scoped resources:

```bash
# Create cluster resource (no namespace)
kubectl apply -f - <<EOF
apiVersion: example.com/v1
kind: Cluster
metadata:
  name: production-cluster
spec:
  region: us-west-2
  nodes: 10
EOF

# List cluster resources
kubectl get clusters

# Describe (no -n flag needed)
kubectl describe cluster production-cluster

# Delete
kubectl delete cluster production-cluster
```

## Combining Cluster and Namespace Scoped Resources

Operators often manage both:

```go
// ClusterPolicy (cluster-scoped) applies to all namespaces
type ClusterPolicy struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec   ClusterPolicySpec `json:"spec,omitempty"`
}

// Policy (namespace-scoped) applies to one namespace
type Policy struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec   PolicySpec `json:"spec,omitempty"`
}
```

## Testing Cluster-Scoped Operators

Test with appropriate permissions:

```bash
# Create service account
kubectl create serviceaccount test-operator -n operator-system

# Bind cluster role
kubectl create clusterrolebinding test-operator-binding \
  --clusterrole=cluster-operator \
  --serviceaccount=operator-system:test-operator

# Run operator with service account
kubectl run operator \
  --image=myoperator:latest \
  --serviceaccount=test-operator \
  -n operator-system
```

Cluster-scoped resources enable operators to manage cluster-wide infrastructure and policies, but require careful handling of RBAC permissions and resource ownership patterns.
