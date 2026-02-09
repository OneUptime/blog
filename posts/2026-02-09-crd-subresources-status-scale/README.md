# How to Use CRD SubResources for Status and Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, SubResources

Description: Learn how to configure status and scale subresources for Custom Resource Definitions to enable proper status management and horizontal pod autoscaling in Kubernetes.

---

When you create a Deployment in Kubernetes, updating the spec and updating the status are separate operations. This separation is crucial for proper resource management. But Custom Resource Definitions don't get this behavior by default. You need to enable subresources explicitly.

Subresources give your CRDs the same capabilities as built-in Kubernetes resources. The status subresource separates spec from status updates. The scale subresource enables integration with kubectl scale and the Horizontal Pod Autoscaler. This guide shows you how to configure both.

## Understanding Subresources

Without subresources, any update to your custom resource modifies the entire object. Users can change status fields directly. Controllers can accidentally trigger spec changes. The resource version increments on every update regardless of what changed.

Subresources solve these problems by creating separate endpoints for specific operations. The /status endpoint only updates status fields. The /scale endpoint provides a standard interface for replica management.

## Enabling the Status Subresource

The status subresource is essential for any CRD that has controllers managing its lifecycle. Here's how to enable it.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.example.com
spec:
  group: example.com
  names:
    kind: Application
    plural: applications
  scope: Namespaced
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
              image:
                type: string
              replicas:
                type: integer
                minimum: 1
              ports:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    port:
                      type: integer
          status:
            type: object
            properties:
              conditions:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                      enum:
                      - "True"
                      - "False"
                      - "Unknown"
                    lastTransitionTime:
                      type: string
                      format: date-time
                    reason:
                      type: string
                    message:
                      type: string
              availableReplicas:
                type: integer
              readyReplicas:
                type: integer
              phase:
                type: string
    # Enable status subresource
    subresources:
      status: {}
```

With this configuration, status updates happen through a separate endpoint and don't increment the main resource version.

## Updating Status from a Controller

In your controller code, update status separately from spec changes.

```go
package main

import (
    "context"
    "time"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes/scheme"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

// Application represents our custom resource
type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec              ApplicationSpec   `json:"spec"`
    Status            ApplicationStatus `json:"status,omitempty"`
}

type ApplicationSpec struct {
    Image    string `json:"image"`
    Replicas int32  `json:"replicas"`
}

type ApplicationStatus struct {
    Conditions        []Condition `json:"conditions,omitempty"`
    AvailableReplicas int32       `json:"availableReplicas"`
    ReadyReplicas     int32       `json:"readyReplicas"`
    Phase             string      `json:"phase"`
}

type Condition struct {
    Type               string      `json:"type"`
    Status             string      `json:"status"`
    LastTransitionTime metav1.Time `json:"lastTransitionTime"`
    Reason             string      `json:"reason"`
    Message            string      `json:"message"`
}

// UpdateStatus updates the application status
func UpdateStatus(ctx context.Context, k8sClient client.Client, app *Application) error {
    // Update status fields
    app.Status.Phase = "Running"
    app.Status.AvailableReplicas = 3
    app.Status.ReadyReplicas = 3

    // Add condition
    condition := Condition{
        Type:               "Ready",
        Status:             "True",
        LastTransitionTime: metav1.NewTime(time.Now()),
        Reason:             "DeploymentReady",
        Message:            "All replicas are ready",
    }

    app.Status.Conditions = updateConditions(app.Status.Conditions, condition)

    // Update status subresource
    return k8sClient.Status().Update(ctx, app)
}

// updateConditions adds or updates a condition
func updateConditions(conditions []Condition, newCondition Condition) []Condition {
    for i, c := range conditions {
        if c.Type == newCondition.Type {
            // Update existing condition
            if c.Status != newCondition.Status {
                newCondition.LastTransitionTime = metav1.NewTime(time.Now())
            } else {
                newCondition.LastTransitionTime = c.LastTransitionTime
            }
            conditions[i] = newCondition
            return conditions
        }
    }
    // Add new condition
    return append(conditions, newCondition)
}
```

The key is using `k8sClient.Status().Update()` instead of a regular update. This ensures only status fields change.

## Configuring the Scale Subresource

The scale subresource enables kubectl scale and HPA integration. Configure it by mapping fields to the scale spec and status.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.example.com
spec:
  group: example.com
  names:
    kind: Application
    plural: applications
  scope: Namespaced
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
              replicas:
                type: integer
              image:
                type: string
              selector:
                type: string
          status:
            type: object
            properties:
              replicas:
                type: integer
              availableReplicas:
                type: integer
              selector:
                type: string
    subresources:
      # Enable status subresource
      status: {}
      # Enable scale subresource
      scale:
        # Path to replica count in spec
        specReplicasPath: .spec.replicas
        # Path to current replica count in status
        statusReplicasPath: .status.replicas
        # Optional: path to label selector
        labelSelectorPath: .status.selector
```

Now users can scale your resource with kubectl scale.

```bash
kubectl scale application myapp --replicas=5
```

## Integrating with Horizontal Pod Autoscaler

With the scale subresource configured, you can use HPA with your custom resources.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: example.com/v1
    kind: Application
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

The HPA will automatically adjust the replicas field in your Application spec based on metrics.

## Implementing Scale in Your Controller

Your controller needs to watch for replica changes and update the actual deployment.

```go
func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var app Application
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Get or create underlying Deployment
    var deployment appsv1.Deployment
    deploymentName := app.Name + "-deployment"
    err := r.Get(ctx, client.ObjectKey{
        Namespace: app.Namespace,
        Name:      deploymentName,
    }, &deployment)

    if err != nil {
        if errors.IsNotFound(err) {
            // Create new deployment
            deployment = r.buildDeployment(&app)
            if err := r.Create(ctx, &deployment); err != nil {
                return ctrl.Result{}, err
            }
        } else {
            return ctrl.Result{}, err
        }
    } else {
        // Update existing deployment if replicas changed
        if *deployment.Spec.Replicas != app.Spec.Replicas {
            deployment.Spec.Replicas = &app.Spec.Replicas
            if err := r.Update(ctx, &deployment); err != nil {
                return ctrl.Result{}, err
            }
        }
    }

    // Update Application status with current replica counts
    app.Status.Replicas = deployment.Status.Replicas
    app.Status.AvailableReplicas = deployment.Status.AvailableReplicas
    app.Status.Selector = metav1.FormatLabelSelector(deployment.Spec.Selector)

    if err := r.Status().Update(ctx, &app); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}

func (r *ApplicationReconciler) buildDeployment(app *Application) appsv1.Deployment {
    labels := map[string]string{
        "app": app.Name,
    }

    return appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      app.Name + "-deployment",
            Namespace: app.Namespace,
            OwnerReferences: []metav1.OwnerReference{
                *metav1.NewControllerRef(app, schema.GroupVersionKind{
                    Group:   "example.com",
                    Version: "v1",
                    Kind:    "Application",
                }),
            },
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &app.Spec.Replicas,
            Selector: &metav1.LabelSelector{
                MatchLabels: labels,
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: labels,
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "app",
                            Image: app.Spec.Image,
                        },
                    },
                },
            },
        },
    }
}
```

This controller syncs the Application replica count with the underlying Deployment and keeps status updated.

## Status Condition Patterns

Follow Kubernetes conventions for status conditions.

```go
const (
    ConditionTypeReady      = "Ready"
    ConditionTypeProgressing = "Progressing"
    ConditionTypeDegraded   = "Degraded"
)

func setReadyCondition(app *Application, ready bool, reason, message string) {
    status := "False"
    if ready {
        status = "True"
    }

    condition := Condition{
        Type:               ConditionTypeReady,
        Status:             status,
        LastTransitionTime: metav1.NewTime(time.Now()),
        Reason:             reason,
        Message:            message,
    }

    app.Status.Conditions = updateConditions(app.Status.Conditions, condition)
}

// Usage in reconciliation
if app.Status.ReadyReplicas == app.Spec.Replicas {
    setReadyCondition(&app, true, "AllReplicasReady",
        "All replicas are running and ready")
} else {
    setReadyCondition(&app, false, "ReplicasNotReady",
        fmt.Sprintf("%d/%d replicas ready", app.Status.ReadyReplicas, app.Spec.Replicas))
}
```

## Testing Subresources

Test that status and scale work independently.

```bash
# Create an application
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Application
metadata:
  name: test-app
spec:
  replicas: 3
  image: nginx:latest
EOF

# Try to update status directly (should fail)
kubectl patch application test-app --type=merge -p '{"status":{"phase":"Running"}}'

# Update status via subresource (should work)
kubectl patch application test-app --subresource=status --type=merge -p '{"status":{"phase":"Running"}}'

# Scale the application
kubectl scale application test-app --replicas=5

# Verify the change
kubectl get application test-app -o jsonpath='{.spec.replicas}'
```

## Best Practices

Always enable the status subresource for CRDs with controllers. This prevents accidental status overwrites and improves performance.

Use the scale subresource if your resource manages replicas. This gives users familiar kubectl scale commands and enables HPA integration.

Follow Kubernetes condition patterns for status. Use standard condition types like Ready, Progressing, and Degraded. Always include reason and message fields.

Update status frequently to reflect current state. Users rely on status to understand resource health.

## Conclusion

Subresources make Custom Resource Definitions behave like native Kubernetes resources. The status subresource ensures clean separation between desired and current state. The scale subresource enables standard scaling interfaces and autoscaling.

Configure both subresources for resources that manage workloads. Implement proper status updates in your controller. Follow Kubernetes conventions for conditions and phase indicators. Test that scaling and status updates work as expected.

These configurations seem simple but they fundamentally change how your CRDs integrate with the Kubernetes ecosystem.
