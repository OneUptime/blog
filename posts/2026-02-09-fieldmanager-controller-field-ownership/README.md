# How to Use FieldManager to Track Which Controller Owns Which Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, Server-Side Apply

Description: Learn how to use the FieldManager mechanism in Kubernetes to track field ownership, resolve conflicts between multiple controllers, and implement robust server-side apply patterns.

---

In complex Kubernetes environments, multiple controllers and operators often need to manage the same resources. When this happens, conflicts can arise: which controller should own which field? The FieldManager mechanism, introduced with Server-Side Apply, provides a solution by tracking who manages each field in a resource.

## The Problem with Multiple Managers

Imagine you have a Deployment managed by three different systems:

- Your GitOps tool manages the image version
- A security scanner adds security context fields
- An autoscaler modifies replica counts

Without field ownership tracking, these systems step on each other's toes. One controller might overwrite changes made by another, leading to configuration drift and unpredictable behavior.

## Understanding Field Management

Every time you update a Kubernetes resource using Server-Side Apply, the API server records which fields your client manages in the `managedFields` section of the resource metadata. This section tracks:

- The manager name (who made the change)
- The operation (Apply or Update)
- The API version used
- The exact fields managed

You can see this information by inspecting any resource:

```bash
kubectl get deployment nginx -o yaml --show-managed-fields
```

The output includes a `managedFields` section:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  managedFields:
  - apiVersion: apps/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        f:replicas: {}
        f:template:
          f:spec:
            f:containers:
              k:{"name":"nginx"}:
                f:image: {}
    manager: kubectl
    operation: Apply
    time: "2026-02-09T10:00:00Z"
  - apiVersion: apps/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        f:template:
          f:spec:
            f:securityContext: {}
    manager: security-controller
    operation: Apply
    time: "2026-02-09T10:05:00Z"
```

This shows that `kubectl` manages the replicas and container image, while `security-controller` manages the security context.

## Setting a Custom Field Manager Name

When using kubectl with Server-Side Apply, specify a field manager name:

```bash
# Apply with a custom field manager name

kubectl apply -f deployment.yaml --server-side --field-manager=my-gitops-tool

# This tells the API server that "my-gitops-tool" owns the fields in the manifest
```

The field manager name should identify your application or controller. Use descriptive names like `argocd`, `flux`, `my-custom-operator`, rather than generic names like `controller` or `manager`.

## Using FieldManager in client-go

When building controllers with client-go, set the field manager using the `FieldManager` option:

```go
package main

import (
    "context"
    "fmt"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    appsv1ac "k8s.io/client-go/applyconfigurations/apps/v1"
    corev1ac "k8s.io/client-go/applyconfigurations/core/v1"
    metav1ac "k8s.io/client-go/applyconfigurations/meta/v1"
    "k8s.io/client-go/kubernetes"
)

func updateDeploymentWithFieldManager(clientset *kubernetes.Clientset) error {
    // Define the deployment configuration this controller manages
    replicas := int32(3)
    deployment := appsv1ac.Deployment("nginx", "default").
        WithSpec(appsv1ac.DeploymentSpec().
            WithReplicas(replicas).
            WithSelector(metav1ac.LabelSelector().
                WithMatchLabels(map[string]string{"app": "nginx"})).
            WithTemplate(corev1ac.PodTemplateSpec().
                WithLabels(map[string]string{"app": "nginx"}).
                WithSpec(corev1ac.PodSpec().
                    WithContainers(corev1ac.Container().
                        WithName("nginx").
                        WithImage("nginx:1.21"),
                    ),
                ),
            ),
        )

    // Use Server-Side Apply with a field manager name
    applyOptions := metav1.ApplyOptions{
        FieldManager: "image-updater-controller",
        Force:        false, // Do not force conflicts
    }

    // Apply the deployment
    result, err := clientset.AppsV1().Deployments("default").Apply(
        context.TODO(),
        deployment,
        applyOptions,
    )
    if err != nil {
        return fmt.Errorf("failed to apply deployment: %v", err)
    }

    fmt.Printf("Applied deployment: %s\n", result.Name)
    return nil
}

```

This code uses Server-Side Apply with the field manager name `image-updater-controller`. The API server tracks that this controller owns the fields specified in the manifest.

## Handling Field Conflicts

Conflicts occur when two managers try to own the same field. By default, Server-Side Apply rejects conflicting changes. You can see which manager owns a conflicting field:

```bash
# This will fail if another manager owns the replicas field
kubectl apply -f deployment.yaml --server-side --field-manager=new-controller

# Error message shows:
# Apply failed with 1 conflict: conflict with "old-controller": .spec.replicas
```

You have three options to resolve conflicts:

**1. Force the ownership transfer:**

```bash
kubectl apply -f deployment.yaml --server-side --field-manager=new-controller --force-conflicts
```

This transfers ownership from the old manager to the new one. Use this carefully, as it may break assumptions made by the previous manager.

**2. Remove the field from your manifest:**

If another controller should manage that field, remove it from your configuration and let the existing manager continue owning it.

**3. Match the current value and share ownership:**

If you still care about the field but do not want to overwrite it, update your local configuration to match the value currently on the server and apply again. Kubernetes will leave the value unchanged and record shared ownership for that field.

## Implementing Multiple Controllers Safely

When building systems where multiple controllers manage different aspects of the same resource, each controller should:

1. Use a unique field manager name
2. Only include fields it actually manages in the apply manifest
3. Avoid forcing conflicts unless absolutely necessary

Here is an example of a security controller that only manages security-related fields:

```go
package main

import (
    "context"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    appsv1ac "k8s.io/client-go/applyconfigurations/apps/v1"
    corev1ac "k8s.io/client-go/applyconfigurations/core/v1"
    "k8s.io/client-go/kubernetes"
)

func applySecurityContext(clientset *kubernetes.Clientset, name, namespace string) error {
    // Only specify the security-related fields this controller manages
    deployment := appsv1ac.Deployment(name, namespace).
        WithSpec(appsv1ac.DeploymentSpec().
            WithTemplate(corev1ac.PodTemplateSpec().
                WithSpec(corev1ac.PodSpec().
                    // Only the security context
                    WithSecurityContext(corev1ac.PodSecurityContext().
                        WithRunAsNonRoot(true).
                        WithRunAsUser(1000).
                        WithFSGroup(2000)).
                    WithContainers(corev1ac.Container().
                        WithName("nginx"). // Must specify name to target the right container
                        WithSecurityContext(corev1ac.SecurityContext().
                            WithAllowPrivilegeEscalation(false).
                            WithReadOnlyRootFilesystem(true)),
                    ),
                ),
            ),
        )

    applyOptions := metav1.ApplyOptions{
        FieldManager: "security-enforcer-controller",
    }

    _, err := clientset.AppsV1().Deployments(namespace).Apply(
        context.TODO(),
        deployment,
        applyOptions,
    )

    return err
}

```

This controller only claims ownership of security context fields. Other controllers can manage replicas, images, and other fields without conflict.

## Viewing Field Ownership

To see which manager owns which fields, use kubectl:

```bash
# View managed fields for a deployment
kubectl get deployment nginx -o json --show-managed-fields | jq '.metadata.managedFields'

# Filter to show only a specific manager
kubectl get deployment nginx -o json --show-managed-fields | jq '.metadata.managedFields[] | select(.manager=="security-enforcer-controller")'
```

## Best Practices

1. **Use descriptive manager names**: Choose names that clearly identify your application or controller, such as `flux-controller` or `custom-autoscaler`.

2. **Apply only what you manage**: Do not include fields in your manifests that you do not intend to manage. This prevents accidental ownership conflicts.

3. **Coordinate between teams**: When multiple teams manage the same resources, agree on which fields each controller owns.

4. **Avoid force unless necessary**: Only use `--force-conflicts` when you intentionally want to take over field ownership.

5. **Monitor for conflicts**: Implement error handling in your controllers to detect and log field conflicts so you can resolve them proactively.

6. **Version your field manager**: If you make significant changes to which fields your controller manages, consider changing the field manager name to reflect the new version.

## Cleaning Up Managed Fields

Over time, the `managedFields` section can grow large. Kubernetes automatically prunes entries from managers that no longer own any fields, but you can also manually clear managed fields if needed:

```bash
# This removes all managed fields metadata (use with caution)
kubectl patch deployment nginx --type=merge -p '{"metadata":{"managedFields":[{}]}}'
```

However, removing managed fields is rarely necessary and should be done with care.

## Conclusion

The FieldManager mechanism provides a robust way to coordinate between multiple controllers managing the same Kubernetes resources. By setting appropriate field manager names and using Server-Side Apply, you can build systems where different controllers safely manage different aspects of resources without stepping on each other. This is essential for modern Kubernetes environments where GitOps tools, security controllers, autoscalers, and custom operators all need to work together harmoniously.
