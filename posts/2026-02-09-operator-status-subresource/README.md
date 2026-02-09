# Implementing and Using the Status Subresource in Kubernetes Custom Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes Operator, Status Subresource, Custom Resource, API, Go

Description: A detailed guide to implementing the status subresource pattern in Kubernetes custom resources, covering API design, controller updates, RBAC configuration, and best practices for status reporting.

---

In Kubernetes, every well-designed resource separates its specification (what the user wants) from its status (what the system observes). This separation is not just a convention. It is enforced at the API level through the status subresource. When you enable the status subresource on a Custom Resource Definition (CRD), Kubernetes provides a dedicated API endpoint for updating the status independently from the spec. This guide explains why the status subresource matters, how to implement it in your custom resources, and the patterns that make status reporting reliable and informative.

## Why the Status Subresource Exists

Without the status subresource, a single update to a custom resource modifies both spec and status simultaneously. This creates several problems:

1. **Race conditions**: If a user updates the spec at the same time the controller updates the status, one of them will get a conflict error because the resource version has changed.
2. **RBAC confusion**: You cannot grant a user permission to change the spec but prevent them from changing the status, or vice versa.
3. **Validation issues**: Spec validation and status validation may have different requirements. Without separation, a status update could fail because of spec validation rules.

The status subresource solves all of these by providing a separate endpoint: `/apis/<group>/<version>/namespaces/<ns>/<resource>/<name>/status`. Updates to this endpoint only modify the status fields. Updates to the main endpoint only modify the spec fields (and metadata).

## Enabling the Status Subresource

In a Kubebuilder or Operator SDK project, enabling the status subresource requires a single marker on your root type:

```go
//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

type Database struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   DatabaseSpec   `json:"spec,omitempty"`
    Status DatabaseStatus `json:"status,omitempty"`
}
```

The `+kubebuilder:subresource:status` marker tells controller-gen to include `subresources.status` in the generated CRD. After adding this marker, run:

```bash
make manifests
```

The generated CRD will include:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.myapp.example.com
spec:
  group: myapp.example.com
  versions:
    - name: v1
      served: true
      storage: true
      subresources:
        status: {}
      schema:
        openAPIV3Schema:
          # ... schema definition
```

## Designing the Status Struct

A well-designed status struct communicates the current state of the resource clearly. There are several patterns used across the Kubernetes ecosystem.

### Simple Status Fields

For basic operators, simple scalar fields may suffice:

```go
type DatabaseStatus struct {
    // Phase represents the current lifecycle phase
    // +kubebuilder:validation:Enum=Pending;Running;Failed;Terminating
    Phase string `json:"phase,omitempty"`

    // ReadyReplicas is the number of ready database replicas
    ReadyReplicas int32 `json:"readyReplicas,omitempty"`

    // Endpoint is the connection string for the database
    Endpoint string `json:"endpoint,omitempty"`

    // LastBackupTime is the timestamp of the most recent backup
    LastBackupTime *metav1.Time `json:"lastBackupTime,omitempty"`
}
```

### Conditions

The standard pattern for rich status reporting in Kubernetes is the Conditions slice. Conditions provide a structured way to report multiple aspects of a resource's state:

```go
type DatabaseStatus struct {
    // Conditions represent the latest available observations
    // +listType=map
    // +listMapKey=type
    Conditions []metav1.Condition `json:"conditions,omitempty"`

    ReadyReplicas int32  `json:"readyReplicas,omitempty"`
    Endpoint      string `json:"endpoint,omitempty"`
}
```

Each condition has a type, status, reason, message, and timestamps:

```go
import "k8s.io/apimachinery/pkg/api/meta"

// Define condition types as constants
const (
    ConditionTypeReady         = "Ready"
    ConditionTypeProvisioned   = "Provisioned"
    ConditionTypeBackedUp      = "BackedUp"
    ConditionTypeDegraded      = "Degraded"
)
```

### Setting Conditions in the Controller

Use the `meta.SetStatusCondition` helper to update conditions:

```go
func (r *DatabaseReconciler) setCondition(
    db *myappv1.Database,
    condType string,
    status metav1.ConditionStatus,
    reason string,
    message string,
) {
    meta.SetStatusCondition(&db.Status.Conditions, metav1.Condition{
        Type:               condType,
        Status:             status,
        ObservedGeneration: db.Generation,
        Reason:             reason,
        Message:            message,
    })
}
```

The `ObservedGeneration` field is important. It tells consumers which generation of the spec the controller was looking at when it set this condition. If `ObservedGeneration` is less than `metadata.generation`, the condition is stale and the controller has not yet reconciled the latest spec change.

## Updating Status in the Controller

With the status subresource enabled, you must use the status client to update status:

```go
func (r *DatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    db := &myappv1.Database{}
    if err := r.Get(ctx, req.NamespacedName, db); err != nil {
        if errors.IsNotFound(err) {
            return ctrl.Result{}, nil
        }
        return ctrl.Result{}, err
    }

    // Reconcile child resources...
    statefulSet, err := r.reconcileStatefulSet(ctx, db)
    if err != nil {
        r.setCondition(db, ConditionTypeReady, metav1.ConditionFalse,
            "ReconciliationFailed", fmt.Sprintf("Failed to reconcile StatefulSet: %v", err))
        if statusErr := r.Status().Update(ctx, db); statusErr != nil {
            logger.Error(statusErr, "Failed to update status after error")
        }
        return ctrl.Result{}, err
    }

    // Update status based on StatefulSet state
    db.Status.ReadyReplicas = statefulSet.Status.ReadyReplicas

    if statefulSet.Status.ReadyReplicas == *statefulSet.Spec.Replicas {
        r.setCondition(db, ConditionTypeReady, metav1.ConditionTrue,
            "AllReplicasReady", "All database replicas are ready and accepting connections")
        db.Status.Endpoint = fmt.Sprintf("%s.%s.svc.cluster.local:5432",
            db.Name, db.Namespace)
    } else {
        r.setCondition(db, ConditionTypeReady, metav1.ConditionFalse,
            "ReplicasNotReady",
            fmt.Sprintf("%d/%d replicas ready",
                statefulSet.Status.ReadyReplicas,
                *statefulSet.Spec.Replicas))
    }

    // This uses the status subresource endpoint
    if err := r.Status().Update(ctx, db); err != nil {
        logger.Error(err, "Failed to update Database status")
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}
```

Note the critical difference: `r.Update(ctx, db)` updates the spec (main resource), while `r.Status().Update(ctx, db)` updates only the status through the subresource endpoint. Using the wrong one is a common source of bugs.

## RBAC for the Status Subresource

Your controller needs explicit RBAC permission to update the status subresource. This is a separate permission from updating the main resource:

```go
//+kubebuilder:rbac:groups=myapp.example.com,resources=databases,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=myapp.example.com,resources=databases/status,verbs=get;update;patch
```

Without the second marker, status updates will fail with a 403 Forbidden error. This is one of the most common mistakes when first implementing the status subresource.

## Conflict Handling with Status Updates

Since the status subresource has its own resource version tracking, conflicts between spec updates and status updates are eliminated. However, two concurrent status updates can still conflict. Handle this with a retry loop:

```go
import "k8s.io/client-go/util/retry"

func (r *DatabaseReconciler) updateStatusWithRetry(ctx context.Context, db *myappv1.Database) error {
    return retry.RetryOnConflict(retry.DefaultRetry, func() error {
        // Re-fetch the latest version
        latest := &myappv1.Database{}
        if err := r.Get(ctx, types.NamespacedName{
            Name:      db.Name,
            Namespace: db.Namespace,
        }, latest); err != nil {
            return err
        }

        // Apply our status changes to the latest version
        latest.Status = db.Status

        return r.Status().Update(ctx, latest)
    })
}
```

This pattern re-fetches the resource if a conflict occurs, applies the status changes to the fresh copy, and retries the update.

## Viewing Status with kubectl

Once the status subresource is enabled and your controller populates it, users can view the status:

```bash
kubectl get databases
NAME        READY-REPLICAS   ENDPOINT                                    AGE
mydb        3                mydb.default.svc.cluster.local:5432        5m

kubectl get database mydb -o jsonpath='{.status.conditions}'
```

For better formatting with conditions:

```bash
kubectl get database mydb -o jsonpath='{range .status.conditions[*]}{.type}{"\t"}{.status}{"\t"}{.reason}{"\t"}{.message}{"\n"}{end}'
```

Output:

```
Ready       True    AllReplicasReady    All database replicas are ready and accepting connections
Provisioned True    StorageReady        PersistentVolumeClaims are bound
BackedUp    True    BackupComplete      Last backup completed at 2026-02-09T02:30:00Z
```

## Print Columns for kubectl get

Use kubebuilder markers to add useful columns to the default `kubectl get` output:

```go
//+kubebuilder:printcolumn:name="Ready",type="string",JSONPath=".status.conditions[?(@.type=='Ready')].status"
//+kubebuilder:printcolumn:name="Replicas",type="integer",JSONPath=".status.readyReplicas"
//+kubebuilder:printcolumn:name="Endpoint",type="string",JSONPath=".status.endpoint"
//+kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"
```

## Best Practices

**Always set ObservedGeneration on conditions.** This lets consumers distinguish between stale and current conditions. A condition with `ObservedGeneration` less than `metadata.generation` means the controller has not yet processed the latest spec change.

**Use standard condition types.** The `Ready` condition type is universally understood. Use it as the primary indicator of whether the resource is operational.

**Make conditions additive.** Add new condition types as your operator gains features. Do not remove existing condition types, as consumers may depend on them.

**Keep reason values stable.** Reasons are meant for programmatic consumption. Use PascalCase strings like `AllReplicasReady`, `StorageNotBound`, or `BackupFailed`. Messages are for human consumption and can be more descriptive.

**Use Patch instead of Update when possible.** The `r.Status().Patch()` method applies a partial update and is less likely to conflict than a full update. Use server-side apply for the most robust approach:

```go
patch := client.MergeFrom(db.DeepCopy())
db.Status.ReadyReplicas = 3
r.Status().Patch(ctx, db, patch)
```

## Conclusion

The status subresource is a fundamental building block of well-designed Kubernetes operators. It provides clean separation between user intent and observed state, eliminates a class of update conflicts, enables fine-grained RBAC, and gives users clear visibility into what the operator is doing. Enable it from day one on every custom resource you create, design your status struct thoughtfully with conditions and observable fields, and always use the status client for status updates. Your users and your future self will thank you for the clarity and reliability it brings.
