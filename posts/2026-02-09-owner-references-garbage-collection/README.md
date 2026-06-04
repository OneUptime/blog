# How to Handle OwnerReferences and Garbage Collection in Custom Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OwnerReferences, Garbage Collection, Controller

Description: Learn how to use OwnerReferences in Kubernetes to establish parent-child relationships between resources and enable automatic garbage collection when owners are deleted.

---

Your controller creates Deployments, Services, and ConfigMaps to support a custom resource. When someone deletes that custom resource, what happens to all the child resources? Without owner references, they become orphaned and clutter the cluster until someone manually deletes them.

OwnerReferences solve this by establishing parent-child relationships. When Kubernetes deletes a parent resource, it automatically garbage collects the children. This keeps your cluster clean and ensures resources are properly cleaned up. This guide shows you how to use owner references effectively.

## Understanding OwnerReferences

Each Kubernetes resource has a metadata.ownerReferences field. This field contains references to other resources that own it. When an owner is deleted, the garbage collector automatically deletes resources that reference it as an owner.

The controller field in an owner reference indicates which owner controls the resource. Only one owner can be the controller. This prevents conflicts when multiple resources claim ownership.

## Setting Basic OwnerReferences

Use controller-runtime's controllerutil.SetControllerReference to create owner relationships.

```go
package main

import (
    "context"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

type MyReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *MyReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var myResource MyResource
    if err := r.Get(ctx, req.NamespacedName, &myResource); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Create a Deployment owned by the custom resource
    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      myResource.Name + "-deployment",
            Namespace: myResource.Namespace,
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &myResource.Spec.Replicas,
            Selector: &metav1.LabelSelector{
                MatchLabels: map[string]string{
                    "app": myResource.Name,
                },
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: map[string]string{
                        "app": myResource.Name,
                    },
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "app",
                            Image: myResource.Spec.Image,
                        },
                    },
                },
            },
        },
    }

    // Set owner reference
    if err := controllerutil.SetControllerReference(&myResource, deployment, r.Scheme); err != nil {
        return ctrl.Result{}, err
    }

    // Create the deployment
    if err := r.Create(ctx, deployment); err != nil {
        return ctrl.Result{}, client.IgnoreAlreadyExists(err)
    }

    return ctrl.Result{}, nil
}
```

## Creating Multiple Owned Resources

Establish ownership for all resources your controller creates.

```go
func (r *MyReconciler) createOwnedResources(ctx context.Context, owner *MyResource) error {
    // Create Deployment
    deployment := r.buildDeployment(owner)
    if err := controllerutil.SetControllerReference(owner, deployment, r.Scheme); err != nil {
        return err
    }
    if err := r.Create(ctx, deployment); err != nil && !apierrors.IsAlreadyExists(err) {
        return err
    }

    // Create Service
    service := r.buildService(owner)
    if err := controllerutil.SetControllerReference(owner, service, r.Scheme); err != nil {
        return err
    }
    if err := r.Create(ctx, service); err != nil && !apierrors.IsAlreadyExists(err) {
        return err
    }

    // Create ConfigMap
    configMap := r.buildConfigMap(owner)
    if err := controllerutil.SetControllerReference(owner, configMap, r.Scheme); err != nil {
        return err
    }
    if err := r.Create(ctx, configMap); err != nil && !apierrors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (r *MyReconciler) buildDeployment(owner *MyResource) *appsv1.Deployment {
    return &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      owner.Name + "-deployment",
            Namespace: owner.Namespace,
        },
        Spec: appsv1.DeploymentSpec{
            // Deployment spec
        },
    }
}

func (r *MyReconciler) buildService(owner *MyResource) *corev1.Service {
    return &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      owner.Name + "-service",
            Namespace: owner.Namespace,
        },
        Spec: corev1.ServiceSpec{
            // Service spec
        },
    }
}

func (r *MyReconciler) buildConfigMap(owner *MyResource) *corev1.ConfigMap {
    return &corev1.ConfigMap{
        ObjectMeta: metav1.ObjectMeta{
            Name:      owner.Name + "-config",
            Namespace: owner.Namespace,
        },
        Data: map[string]string{
            // ConfigMap data
        },
    }
}
```

## Understanding Garbage Collection Policies

Kubernetes supports two cascading deletion policies: Foreground and Background. You can also choose Orphan deletion to leave dependents behind.

Background deletion (default) deletes the owner immediately and garbage collects dependents asynchronously.

Foreground deletion keeps the owner visible until the garbage collector deletes the dependents that block owner deletion.

```go
// Delete with foreground cascading
foregroundDeletion := metav1.DeletePropagationForeground
deleteOptions := &client.DeleteOptions{
    PropagationPolicy: &foregroundDeletion,
}
err := r.Delete(ctx, &myResource, deleteOptions)

// Delete with background cascading (default)
err := r.Delete(ctx, &myResource)

// Orphan deletion - don't delete dependents
orphanPolicy := metav1.DeletePropagationOrphan
deleteOptions := &client.DeleteOptions{
    PropagationPolicy: &orphanPolicy,
}
err := r.Delete(ctx, &myResource, deleteOptions)
```

## Listing Owned Resources

Find all resources owned by a parent.

```go
func (r *MyReconciler) listOwnedDeployments(ctx context.Context, owner *MyResource) ([]appsv1.Deployment, error) {
    var deployments appsv1.DeploymentList

    // List deployments in the same namespace
    if err := r.List(ctx, &deployments, client.InNamespace(owner.Namespace)); err != nil {
        return nil, err
    }

    // Filter by owner reference
    var ownedDeployments []appsv1.Deployment
    for _, deployment := range deployments.Items {
        if metav1.IsControlledBy(&deployment, owner) {
            ownedDeployments = append(ownedDeployments, deployment)
        }
    }

    return ownedDeployments, nil
}

// Alternative: use cache field indexes for efficient filtering
func (r *MyReconciler) listOwnedResourcesEfficiently(ctx context.Context, owner *MyResource) error {
    // This requires setting up field indexes in your controller setup
    var deployments appsv1.DeploymentList

    if err := r.List(ctx, &deployments,
        client.InNamespace(owner.Namespace),
        client.MatchingFields{".metadata.ownerReferences.uid": string(owner.UID)},
    ); err != nil {
        return err
    }

    return nil
}
```

## Watching Owned Resources

Set up your controller to watch resources it owns.

```go
func SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&MyResource{}). // Primary resource
        Owns(&appsv1.Deployment{}). // Watch owned Deployments
        Owns(&corev1.Service{}). // Watch owned Services
        Owns(&corev1.ConfigMap{}). // Watch owned ConfigMaps
        Complete(&MyReconciler{
            Client: mgr.GetClient(),
            Scheme: mgr.GetScheme(),
        })
}
```

When an owned resource changes, the controller reconciles the owner.

## Multiple Owners (Non-Controller References)

Resources can have multiple owners, but only one controller.

```go
func (r *MyReconciler) addAdditionalOwner(ctx context.Context, resource client.Object, additionalOwner *OtherResource) error {
    // Add new owner reference (not as controller)
    if err := controllerutil.SetOwnerReference(additionalOwner, resource, r.Scheme); err != nil {
        return err
    }

    // Update resource
    return r.Update(ctx, resource)
}
```

## Preventing Accidental Deletion

Use finalizers for cleanup that owner references cannot handle, such as external systems or cluster-scoped resources tracked with labels.

```go
const myResourceFinalizer = "example.com/myresource-finalizer"

func (r *MyReconciler) handleDeletion(ctx context.Context, resource *MyResource) error {
    if resource.DeletionTimestamp.IsZero() {
        if !controllerutil.ContainsFinalizer(resource, myResourceFinalizer) {
            controllerutil.AddFinalizer(resource, myResourceFinalizer)
            return r.Update(ctx, resource)
        }
        return nil
    }

    if controllerutil.ContainsFinalizer(resource, myResourceFinalizer) {
        if err := r.cleanupClusterResources(ctx, resource); err != nil {
            return err
        }
        controllerutil.RemoveFinalizer(resource, myResourceFinalizer)
        return r.Update(ctx, resource)
    }

    return nil
}
```

## Cross-Namespace OwnerReferences

For namespaced dependents, owner references can point to owners in the same namespace or to cluster-scoped owners. Cross-namespace owner references are invalid, and cluster-scoped dependents cannot use namespaced owners.

```go
func (r *MyReconciler) createClusterScopedResource(ctx context.Context, owner *MyResource) error {
    // Cannot set namespace-scoped resource as owner of cluster-scoped resource
    // Use labels instead for tracking

    clusterRole := &rbacv1.ClusterRole{
        ObjectMeta: metav1.ObjectMeta{
            Name: owner.Name + "-role",
            Labels: map[string]string{
                "owned-by": owner.Namespace + "/" + owner.Name,
                "owner-uid": string(owner.UID),
            },
        },
        Rules: []rbacv1.PolicyRule{
            // Rules
        },
    }

    return r.Create(ctx, clusterRole)
}

// Manually clean up cluster-scoped resources
func (r *MyReconciler) cleanupClusterResources(ctx context.Context, owner *MyResource) error {
    var clusterRoles rbacv1.ClusterRoleList
    if err := r.List(ctx, &clusterRoles, client.MatchingLabels{
        "owner-uid": string(owner.UID),
    }); err != nil {
        return err
    }

    for _, role := range clusterRoles.Items {
        if err := r.Delete(ctx, &role); err != nil {
            return err
        }
    }

    return nil
}
```

## Best Practices

Always set owner references when creating resources from a controller. This ensures proper cleanup.

Use controllerutil.SetControllerReference for the primary owner. This sets both the owner reference and the controller flag.

Only one owner can be the controller. Multiple owners are allowed, but only one controls the resource.

Watch owned resources with Owns() in your controller setup. This ensures the controller reconciles when owned resources change.

Remember that namespaced dependents can use owner references to owners in the same namespace or to cluster-scoped owners. Cross-namespace owner references are invalid.

Use labels for cross-namespace or cluster-scoped dependencies that can't use owner references.

Test deletion scenarios to ensure garbage collection works as expected.

## Conclusion

OwnerReferences automate resource cleanup and establish clear parent-child relationships in Kubernetes. They ensure that when you delete a custom resource, all its dependents are garbage collected automatically.

Use controllerutil.SetControllerReference for all resources your controller creates. Set up your controller to watch owned resources. Test deletion to verify garbage collection works correctly.

Proper use of owner references keeps your cluster clean and prevents resource leaks when custom resources are deleted.
