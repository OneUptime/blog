# How to Use Kubernetes Subresource API for Status Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, Controllers

Description: Master the Kubernetes subresource API to separate status updates from spec changes, build better controllers, and avoid conflicts between user intent and controller observations.

---

In Kubernetes, many resources are split into two logical parts: the spec (what you want) and the status (what you have). The subresource API allows you to update these independently, which is crucial for building controllers that do not conflict with user modifications and for implementing proper separation of concerns.

## Understanding Spec vs Status

Most Kubernetes resources follow a pattern:

- **Spec**: The desired state, set by users or higher-level controllers
- **Status**: The observed state, set by controllers watching the actual system

For example, in a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3  # User declares: "I want 3 replicas"
status:
  replicas: 3  # Controller reports: "I see 3 replicas"
  availableReplicas: 3
  readyReplicas: 3
```

Users modify the spec. Controllers modify the status. This separation prevents conflicts.

## Why Subresources Matter

Without subresources, updating status would require updating the entire resource, which causes problems:

1. **Version conflicts**: User updates spec while controller updates status
2. **Permission issues**: Controllers need full update permissions
3. **Accidental overwrites**: Controller might accidentally reset spec fields

Subresources solve this by providing separate API endpoints:

- `/apis/apps/v1/namespaces/default/deployments/nginx` (main resource)
- `/apis/apps/v1/namespaces/default/deployments/nginx/status` (status subresource)

## Updating Status in client-go

Here is how to update status properly:

```go
package main

import (
    "context"
    "fmt"

    appsv1 "k8s.io/api/apps/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/util/retry"
)

func updateDeploymentStatus(clientset *kubernetes.Clientset) error {
    namespace := "default"
    name := "nginx"

    // Use retry logic to handle conflicts
    err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
        // Get the current Deployment
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return err
        }

        // Modify only the status
        deployment.Status.Replicas = 3
        deployment.Status.AvailableReplicas = 3
        deployment.Status.ReadyReplicas = 3
        deployment.Status.UpdatedReplicas = 3

        // Update using the status subresource
        _, updateErr := clientset.AppsV1().Deployments(namespace).UpdateStatus(
            context.TODO(),
            deployment,
            metav1.UpdateOptions{},
        )
        return updateErr
    })

    if err != nil {
        return fmt.Errorf("failed to update status: %v", err)
    }

    fmt.Println("Status updated successfully")
    return nil
}
```

The key is using `UpdateStatus()` instead of `Update()`. This updates only the status subresource.

## Custom Resource Status Subresources

When you create Custom Resource Definitions, you can enable status subresources:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    kind: Database
    plural: databases
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    # Enable status subresource
    subresources:
      status: {}
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              version:
                type: string
              storageGB:
                type: integer
          status:
            type: object
            properties:
              phase:
                type: string
              conditions:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                    lastTransitionTime:
                      type: string
                      format: date-time
                    reason:
                      type: string
                    message:
                      type: string
```

With `subresources.status: {}` enabled, your CRD gets a dedicated status endpoint.

## Updating Custom Resource Status

Once enabled, update custom resource status similarly:

```go
import (
    "context"
    "fmt"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/client-go/dynamic"
    "k8s.io/client-go/util/retry"
)

func updateDatabaseStatus(dynamicClient dynamic.Interface) error {
    gvr := schema.GroupVersionResource{
        Group:    "example.com",
        Version:  "v1",
        Resource: "databases",
    }

    namespace := "default"
    name := "my-database"

    err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
        // Get the current Database
        database, err := dynamicClient.Resource(gvr).Namespace(namespace).Get(
            context.TODO(),
            name,
            metav1.GetOptions{},
        )
        if err != nil {
            return err
        }

        // Modify the status
        status := map[string]interface{}{
            "phase": "Ready",
            "conditions": []interface{}{
                map[string]interface{}{
                    "type":               "Ready",
                    "status":             "True",
                    "lastTransitionTime": metav1.Now().Format(metav1.RFC3339),
                    "reason":             "DatabaseReady",
                    "message":            "Database is ready to accept connections",
                },
            },
        }

        // Set the status in the unstructured object
        if err := unstructured.SetNestedField(database.Object, status, "status"); err != nil {
            return err
        }

        // Update using the status subresource
        _, updateErr := dynamicClient.Resource(gvr).Namespace(namespace).UpdateStatus(
            context.TODO(),
            database,
            metav1.UpdateOptions{},
        )
        return updateErr
    })

    if err != nil {
        return fmt.Errorf("failed to update database status: %v", err)
    }

    fmt.Println("Database status updated")
    return nil
}
```

## RBAC Permissions for Status Updates

Status subresources require separate permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: database-controller
  namespace: default
rules:
# Permission to read databases
- apiGroups: ["example.com"]
  resources: ["databases"]
  verbs: ["get", "list", "watch"]

# Permission to update database status
- apiGroups: ["example.com"]
  resources: ["databases/status"]
  verbs: ["update", "patch"]
```

Notice the resource name is `databases/status` for the status subresource. This allows you to grant status update permissions to controllers while restricting spec modifications.

## The Scale Subresource

Besides status, many resources support a scale subresource for adjusting replicas:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    kind: Database
    plural: databases
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    subresources:
      status: {}
      # Enable scale subresource
      scale:
        # Path to the field in spec containing replica count
        specReplicasPath: .spec.replicas
        # Path to the field in status containing replica count
        statusReplicasPath: .status.replicas
        # Optional: path to label selector
        labelSelectorPath: .spec.selector
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              replicas:
                type: integer
              selector:
                type: object
          status:
            type: object
            properties:
              replicas:
                type: integer
```

This allows kubectl scale to work with your custom resource:

```bash
kubectl scale database my-database --replicas=5
```

## Using the Scale Subresource in Code

```go
import (
    autoscalingv1 "k8s.io/api/autoscaling/v1"
)

func scaleDatabase(dynamicClient dynamic.Interface) error {
    gvr := schema.GroupVersionResource{
        Group:    "example.com",
        Version:  "v1",
        Resource: "databases",
    }

    namespace := "default"
    name := "my-database"

    // Get the current scale
    scale, err := dynamicClient.Resource(gvr).Namespace(namespace).Get(
        context.TODO(),
        name,
        metav1.GetOptions{},
        "scale", // Specify scale subresource
    )
    if err != nil {
        return err
    }

    // Modify replica count
    scaleObj := &autoscalingv1.Scale{}
    if err := runtime.DefaultUnstructuredConverter.FromUnstructured(scale.Object, scaleObj); err != nil {
        return err
    }

    scaleObj.Spec.Replicas = 5

    // Update the scale
    scaleUnstructured, err := runtime.DefaultUnstructuredConverter.ToUnstructured(scaleObj)
    if err != nil {
        return err
    }

    _, err = dynamicClient.Resource(gvr).Namespace(namespace).Update(
        context.TODO(),
        &unstructured.Unstructured{Object: scaleUnstructured},
        metav1.UpdateOptions{},
        "scale",
    )

    return err
}
```

## Conditions in Status

A common pattern is using conditions to represent resource state:

```go
import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type DatabaseConditionType string

const (
    DatabaseReady     DatabaseConditionType = "Ready"
    DatabaseAvailable DatabaseConditionType = "Available"
)

type DatabaseCondition struct {
    Type               DatabaseConditionType
    Status             metav1.ConditionStatus
    LastTransitionTime metav1.Time
    Reason             string
    Message            string
}

func setDatabaseCondition(status *DatabaseStatus, condition DatabaseCondition) {
    // Find existing condition of this type
    for i, c := range status.Conditions {
        if c.Type == condition.Type {
            // Update existing condition
            status.Conditions[i] = condition
            return
        }
    }
    // Add new condition
    status.Conditions = append(status.Conditions, condition)
}

func updateWithCondition(dynamicClient dynamic.Interface) error {
    // ... get the database resource ...

    condition := DatabaseCondition{
        Type:               DatabaseReady,
        Status:             metav1.ConditionTrue,
        LastTransitionTime: metav1.Now(),
        Reason:             "DatabaseInitialized",
        Message:            "Database has been successfully initialized",
    }

    // Update status with condition
    // ... implementation details ...

    return nil
}
```

## Watching Status Changes

You can watch for status changes specifically:

```go
func watchDatabaseStatus(dynamicClient dynamic.Interface) error {
    gvr := schema.GroupVersionResource{
        Group:    "example.com",
        Version:  "v1",
        Resource: "databases",
    }

    watcher, err := dynamicClient.Resource(gvr).Namespace("default").Watch(
        context.TODO(),
        metav1.ListOptions{},
    )
    if err != nil {
        return err
    }
    defer watcher.Stop()

    for event := range watcher.ResultChan() {
        database := event.Object.(*unstructured.Unstructured)

        // Extract status
        status, found, err := unstructured.NestedMap(database.Object, "status")
        if err != nil || !found {
            continue
        }

        phase, _, _ := unstructured.NestedString(status, "phase")
        fmt.Printf("Database status phase: %s\n", phase)
    }

    return nil
}
```

## Best Practices

1. **Always use status subresource**: Never update status through the main resource endpoint

2. **Use retry logic**: Status updates can conflict just like spec updates

3. **Set conditions properly**: Include all required fields (type, status, reason, message, lastTransitionTime)

4. **Grant minimal permissions**: Give controllers only status update permissions, not full update

5. **Document status fields**: Clearly document what each status field represents

6. **Use standard condition types**: Follow Kubernetes conventions for condition types (Ready, Available, Progressing)

7. **Update status after reconciliation**: Only update status after you have observed the actual state

## Common Mistakes

**Updating spec and status together**: Do not mix spec and status updates:

```go
// Wrong: updates both spec and status
deployment.Spec.Replicas = 5
deployment.Status.Replicas = 3
clientset.AppsV1().Deployments(ns).Update(ctx, deployment, opts)

// Correct: separate updates
deployment.Spec.Replicas = 5
clientset.AppsV1().Deployments(ns).Update(ctx, deployment, opts)

// Then update status separately
deployment.Status.Replicas = 3
clientset.AppsV1().Deployments(ns).UpdateStatus(ctx, deployment, opts)
```

**Forgetting to enable subresource in CRD**: Without `subresources.status: {}`, you cannot use UpdateStatus.

**Not handling conflicts**: Status updates can conflict too; always use retry logic.

## Conclusion

The subresource API for status updates is fundamental to building proper Kubernetes controllers. By separating spec and status updates, you avoid conflicts between user intent and controller observations, enable fine-grained RBAC controls, and follow Kubernetes best practices. Whether you are working with built-in resources or custom resources, always use the dedicated status subresource endpoint for status updates. This pattern ensures your controllers are robust, maintainable, and play nicely with other components in the Kubernetes ecosystem.
