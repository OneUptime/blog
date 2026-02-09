# How to Implement CRD Status Conditions Following Kubernetes Conventions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, Status Conditions

Description: Learn how to implement status conditions in your custom resources following Kubernetes conventions, providing consistent and informative status reporting for better observability.

---

Kubernetes uses a standardized pattern for reporting resource status through conditions. Built-in resources like Pods and Deployments use conditions to communicate state changes and problems. Following these conventions in your custom resources makes them feel native and enables tools to understand their status automatically.

Status conditions provide detailed, machine-readable information about resource state beyond simple phase fields. They track specific aspects of readiness, availability, and health, making it easier for operators and monitoring systems to understand what's happening.

## Understanding Status Conditions

A condition represents a specific aspect of resource status. Each condition has:

- **Type**: What aspect of status this condition represents (e.g., Ready, Available)
- **Status**: True, False, or Unknown
- **Reason**: Machine-readable reason for the current status
- **Message**: Human-readable details
- **LastTransitionTime**: When the status last changed

## Defining Status Conditions in Your CRD

Add conditions to your status subresource:

```go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Ready",type="string",JSONPath=`.status.conditions[?(@.type=="Ready")].status`
// +kubebuilder:printcolumn:name="Status",type="string",JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=`.metadata.creationTimestamp`

type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

type ApplicationSpec struct {
    Image    string `json:"image"`
    Replicas int32  `json:"replicas"`
    Database string `json:"database,omitempty"`
}

type ApplicationStatus struct {
    // Phase is a simple, high-level summary of where the Application is
    Phase string `json:"phase,omitempty"`

    // Conditions represent detailed observations of the Application's state
    Conditions []metav1.Condition `json:"conditions,omitempty"`

    // ObservedGeneration reflects the generation most recently observed by the controller
    ObservedGeneration int64 `json:"observedGeneration,omitempty"`

    // Additional status fields
    AvailableReplicas int32 `json:"availableReplicas,omitempty"`
}
```

## Standard Condition Types

Use standard condition types when applicable:

**Ready**: Resource is ready to serve requests. Most resources should have this.

**Available**: Resource has minimum availability (e.g., minimum replicas running).

**Progressing**: Resource is actively making progress toward its desired state.

**Degraded**: Resource is working but not at full capacity.

**Reconciled**: Controller has successfully reconciled the resource.

You can add custom condition types for domain-specific states.

## Setting Conditions in Your Controller

Use the meta package helpers to manage conditions:

```go
import (
    "context"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/api/meta"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

type ApplicationReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    app := &examplev1.Application{}
    if err := r.Get(ctx, req.NamespacedName, app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Update observed generation
    app.Status.ObservedGeneration = app.Generation

    // Check if deployment is ready
    deployment := &appsv1.Deployment{}
    if err := r.Get(ctx, req.NamespacedName, deployment); err != nil {
        if apierrors.IsNotFound(err) {
            // Deployment doesn't exist yet
            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Ready",
                Status:             metav1.ConditionFalse,
                Reason:             "DeploymentNotFound",
                Message:            "Deployment has not been created yet",
                ObservedGeneration: app.Generation,
            })

            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Progressing",
                Status:             metav1.ConditionTrue,
                Reason:             "CreatingDeployment",
                Message:            "Creating deployment",
                ObservedGeneration: app.Generation,
            })

            app.Status.Phase = "Pending"
        }
    } else {
        // Deployment exists, check its status
        availableReplicas := deployment.Status.AvailableReplicas
        desiredReplicas := *deployment.Spec.Replicas

        app.Status.AvailableReplicas = availableReplicas

        if availableReplicas >= desiredReplicas && desiredReplicas > 0 {
            // All replicas are available
            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Ready",
                Status:             metav1.ConditionTrue,
                Reason:             "AllReplicasReady",
                Message:            "All replicas are available",
                ObservedGeneration: app.Generation,
            })

            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Available",
                Status:             metav1.ConditionTrue,
                Reason:             "MinimumReplicasAvailable",
                Message:            fmt.Sprintf("%d/%d replicas available", availableReplicas, desiredReplicas),
                ObservedGeneration: app.Generation,
            })

            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Progressing",
                Status:             metav1.ConditionFalse,
                Reason:             "DeploymentComplete",
                Message:            "Deployment has completed successfully",
                ObservedGeneration: app.Generation,
            })

            app.Status.Phase = "Running"
        } else if availableReplicas > 0 {
            // Some replicas available but not all
            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Ready",
                Status:             metav1.ConditionFalse,
                Reason:             "InsufficientReplicas",
                Message:            fmt.Sprintf("Only %d/%d replicas available", availableReplicas, desiredReplicas),
                ObservedGeneration: app.Generation,
            })

            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Available",
                Status:             metav1.ConditionTrue,
                Reason:             "PartialAvailability",
                Message:            fmt.Sprintf("%d/%d replicas available", availableReplicas, desiredReplicas),
                ObservedGeneration: app.Generation,
            })

            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Progressing",
                Status:             metav1.ConditionTrue,
                Reason:             "ScalingUp",
                Message:            "Waiting for additional replicas to become available",
                ObservedGeneration: app.Generation,
            })

            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Degraded",
                Status:             metav1.ConditionTrue,
                Reason:             "InsufficientReplicas",
                Message:            "Running with reduced capacity",
                ObservedGeneration: app.Generation,
            })

            app.Status.Phase = "Degraded"
        } else {
            // No replicas available
            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Ready",
                Status:             metav1.ConditionFalse,
                Reason:             "NoReplicasAvailable",
                Message:            "No replicas are currently available",
                ObservedGeneration: app.Generation,
            })

            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Available",
                Status:             metav1.ConditionFalse,
                Reason:             "NoReplicasAvailable",
                Message:            "No replicas are currently available",
                ObservedGeneration: app.Generation,
            })

            meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
                Type:               "Progressing",
                Status:             metav1.ConditionTrue,
                Reason:             "WaitingForReplicas",
                Message:            "Waiting for replicas to become available",
                ObservedGeneration: app.Generation,
            })

            app.Status.Phase = "Pending"
        }
    }

    // Update status
    if err := r.Status().Update(ctx, app); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}
```

## Condition Naming Conventions

**Type**: PascalCase, describes the condition (e.g., Ready, DatabaseConnected)

**Reason**: PascalCase, terse machine-readable explanation (e.g., AllReplicasReady, DatabaseNotFound)

**Message**: Sentence case, human-readable details (e.g., "All 3 replicas are available and healthy")

## Checking Conditions

Check if a condition is true:

```go
import (
    "k8s.io/apimachinery/pkg/api/meta"
)

func isApplicationReady(app *examplev1.Application) bool {
    condition := meta.FindStatusCondition(app.Status.Conditions, "Ready")
    return condition != nil && condition.Status == metav1.ConditionTrue
}

func getConditionMessage(app *examplev1.Application, conditionType string) string {
    condition := meta.FindStatusCondition(app.Status.Conditions, conditionType)
    if condition != nil {
        return condition.Message
    }
    return ""
}
```

## Multiple Conditions for Complex State

Use multiple conditions to represent different aspects:

```go
// Database-related condition
meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
    Type:               "DatabaseConnected",
    Status:             metav1.ConditionTrue,
    Reason:             "ConnectionSuccessful",
    Message:            fmt.Sprintf("Connected to database %s", dbEndpoint),
    ObservedGeneration: app.Generation,
})

// Cache-related condition
meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
    Type:               "CacheAvailable",
    Status:             metav1.ConditionTrue,
    Reason:             "CacheReady",
    Message:            "Redis cache is available",
    ObservedGeneration: app.Generation,
})

// Overall readiness depends on multiple conditions
dbReady := meta.IsStatusConditionTrue(app.Status.Conditions, "DatabaseConnected")
cacheReady := meta.IsStatusConditionTrue(app.Status.Conditions, "CacheAvailable")
replicasReady := meta.IsStatusConditionTrue(app.Status.Conditions, "Available")

if dbReady && cacheReady && replicasReady {
    meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
        Type:               "Ready",
        Status:             metav1.ConditionTrue,
        Reason:             "AllComponentsReady",
        Message:            "Application is fully operational",
        ObservedGeneration: app.Generation,
    })
}
```

## Viewing Conditions

Users see conditions with kubectl describe:

```bash
kubectl describe application webapp

Status:
  Available Replicas:  3
  Conditions:
    Last Transition Time:  2026-02-09T10:00:00Z
    Message:              All replicas are available
    Observed Generation:   1
    Reason:               AllReplicasReady
    Status:               True
    Type:                 Ready
    Last Transition Time:  2026-02-09T10:00:00Z
    Message:              3/3 replicas available
    Observed Generation:   1
    Reason:               MinimumReplicasAvailable
    Status:               True
    Type:                 Available
    Last Transition Time:  2026-02-09T09:55:00Z
    Message:              Deployment has completed successfully
    Observed Generation:   1
    Reason:               DeploymentComplete
    Status:               False
    Type:                 Progressing
  Observed Generation:   1
  Phase:                Running
```

## Condition Transitions

Track when conditions change:

```go
func (r *ApplicationReconciler) updateCondition(app *examplev1.Application, condType, reason, message string, status metav1.ConditionStatus) {
    // Find existing condition
    oldCondition := meta.FindStatusCondition(app.Status.Conditions, condType)

    // Set new condition
    meta.SetStatusCondition(&app.Status.Conditions, metav1.Condition{
        Type:               condType,
        Status:             status,
        Reason:             reason,
        Message:            message,
        ObservedGeneration: app.Generation,
    })

    // Log transition if status changed
    if oldCondition != nil && oldCondition.Status != status {
        r.Log.Info("Condition changed",
            "application", app.Name,
            "type", condType,
            "from", oldCondition.Status,
            "to", status,
            "reason", reason)
    }
}
```

## Using Conditions for Health Checks

Expose conditions through readiness probes:

```go
func (r *ApplicationReconciler) healthHandler(w http.ResponseWriter, req *http.Request) {
    name := req.URL.Query().Get("name")
    namespace := req.URL.Query().Get("namespace")

    app := &examplev1.Application{}
    if err := r.Get(context.Background(), types.NamespacedName{
        Name:      name,
        Namespace: namespace,
    }, app); err != nil {
        w.WriteHeader(http.StatusNotFound)
        return
    }

    if meta.IsStatusConditionTrue(app.Status.Conditions, "Ready") {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{
            "status": "ready",
        })
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        condition := meta.FindStatusCondition(app.Status.Conditions, "Ready")
        json.NewEncoder(w).Encode(map[string]string{
            "status":  "not ready",
            "reason":  condition.Reason,
            "message": condition.Message,
        })
    }
}
```

## Best Practices

Always set ObservedGeneration to track which generation the condition applies to. This helps users understand if the status reflects the latest spec.

Use consistent condition types across your CRDs. If you use "Ready" for one resource, use it for all of them.

Provide useful messages. "Deployment failed" is not helpful. "Deployment failed: image pull error for nginx:invalid-tag" is much better.

Don't create conditions for every possible state. Focus on the most important aspects users need to monitor.

Update conditions on every reconcile even if they don't change. This refreshes the timestamp and shows the controller is actively managing the resource.

Status conditions following Kubernetes conventions make your custom resources easier to understand, monitor, and integrate with existing tooling.
