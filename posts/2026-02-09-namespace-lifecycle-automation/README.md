# How to Implement Namespace Lifecycle Automation with Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Automation, Controllers

Description: Learn how to build custom controllers for automating namespace lifecycle management including provisioning, configuration, monitoring, expiration, and decommissioning workflows.

---

Namespace lifecycle automation streamlines the creation, configuration, maintenance, and retirement of Kubernetes namespaces. Custom controllers watch namespace events and automatically apply policies, configure resources, and handle cleanup, reducing manual toil and ensuring consistency across environments.

This guide covers building controllers for complete namespace lifecycle automation.

## Controller Architecture

A namespace lifecycle controller handles:

- Creation events (apply default configurations)
- Update events (validate and reconcile state)
- Deletion events (cleanup and archival)
- Expiration management (temporary namespaces)
- Resource provisioning (quotas, RBAC, network policies)

## Building a Basic Namespace Controller

Create a controller using client-go:

```go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/watch"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type NamespaceController struct {
    clientset *kubernetes.Clientset
}

func NewController() (*NamespaceController, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &NamespaceController{clientset: clientset}, nil
}

func (c *NamespaceController) Run(ctx context.Context) error {
    watcher, err := c.clientset.CoreV1().Namespaces().Watch(
        ctx,
        metav1.ListOptions{},
    )
    if err != nil {
        return err
    }

    for event := range watcher.ResultChan() {
        namespace, ok := event.Object.(*corev1.Namespace)
        if !ok {
            continue
        }

        switch event.Type {
        case watch.Added:
            c.handleNamespaceCreated(ctx, namespace)
        case watch.Modified:
            c.handleNamespaceModified(ctx, namespace)
        case watch.Deleted:
            c.handleNamespaceDeleted(ctx, namespace)
        }
    }

    return nil
}

func (c *NamespaceController) handleNamespaceCreated(ctx context.Context, ns *corev1.Namespace) {
    fmt.Printf("Namespace created: %s\n", ns.Name)

    // Skip system namespaces
    if c.isSystemNamespace(ns.Name) {
        return
    }

    // Apply default configurations
    if err := c.applyResourceQuota(ctx, ns.Name); err != nil {
        fmt.Printf("Failed to apply resource quota: %v\n", err)
    }

    if err := c.applyLimitRange(ctx, ns.Name); err != nil {
        fmt.Printf("Failed to apply limit range: %v\n", err)
    }

    if err := c.applyNetworkPolicies(ctx, ns.Name); err != nil {
        fmt.Printf("Failed to apply network policies: %v\n", err)
    }

    if err := c.createDefaultServiceAccount(ctx, ns.Name); err != nil {
        fmt.Printf("Failed to create service account: %v\n", err)
    }

    // Set expiration if temporary
    if ns.Labels["temporary"] == "true" {
        c.setExpirationTimer(ctx, ns)
    }
}

func (c *NamespaceController) applyResourceQuota(ctx context.Context, namespace string) error {
    quota := &corev1.ResourceQuota{
        ObjectMeta: metav1.ObjectMeta{
            Name: "default-quota",
        },
        Spec: corev1.ResourceQuotaSpec{
            Hard: corev1.ResourceList{
                "requests.cpu":    resource.MustParse("50"),
                "requests.memory": resource.MustParse("100Gi"),
                "pods":           resource.MustParse("200"),
            },
        },
    }

    _, err := c.clientset.CoreV1().ResourceQuotas(namespace).Create(
        ctx,
        quota,
        metav1.CreateOptions{},
    )

    return err
}

func (c *NamespaceController) setExpirationTimer(ctx context.Context, ns *corev1.Namespace) {
    expirationDays := 7 // Default expiration
    if val, ok := ns.Annotations["expiration-days"]; ok {
        // Parse custom expiration
        days, _ := strconv.Atoi(val)
        expirationDays = days
    }

    go func() {
        time.Sleep(time.Duration(expirationDays) * 24 * time.Hour)
        c.expireNamespace(ctx, ns.Name)
    }()
}

func (c *NamespaceController) expireNamespace(ctx context.Context, namespace string) {
    // Send notification before deletion
    c.notifyExpiration(namespace)

    // Grace period for manual intervention
    time.Sleep(24 * time.Hour)

    // Delete namespace
    err := c.clientset.CoreV1().Namespaces().Delete(
        ctx,
        namespace,
        metav1.DeleteOptions{},
    )
    if err != nil {
        fmt.Printf("Failed to expire namespace %s: %v\n", namespace, err)
    }
}

func main() {
    controller, err := NewController()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    if err := controller.Run(ctx); err != nil {
        panic(err)
    }
}
```

## Deploying the Controller

Deploy as a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: namespace-controller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: namespace-controller
  template:
    metadata:
      labels:
        app: namespace-controller
    spec:
      serviceAccountName: namespace-controller
      containers:
      - name: controller
        image: myorg/namespace-controller:v1.0.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: namespace-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-controller
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch", "update"]
- apiGroups: [""]
  resources: ["resourcequotas", "limitranges", "serviceaccounts"]
  verbs: ["create", "get", "list", "update"]
- apiGroups: ["networking.k8s.io"]
  resources: ["networkpolicies"]
  verbs: ["create", "get", "list"]
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "rolebindings"]
  verbs: ["create", "get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: namespace-controller
subjects:
- kind: ServiceAccount
  name: namespace-controller
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: namespace-controller
  apiGroup: rbac.authorization.k8s.io
```

## Implementing Expiration Management

Manage temporary namespaces:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: temp-dev-feature-x
  labels:
    temporary: "true"
    team: backend
  annotations:
    expiration-days: "14"
    notification-email: "backend-team@company.com"
    created-by: "john.doe@company.com"
```

Controller logic for expiration:

```go
func (c *NamespaceController) checkExpiredNamespaces(ctx context.Context) {
    namespaces, _ := c.clientset.CoreV1().Namespaces().List(
        ctx,
        metav1.ListOptions{
            LabelSelector: "temporary=true",
        },
    )

    for _, ns := range namespaces.Items {
        expirationDate := c.getExpirationDate(&ns)
        if time.Now().After(expirationDate) {
            // Send warning notification
            c.sendExpirationWarning(&ns)

            // Delete if past grace period
            gracePeriod, _ := time.Parse(ns.Annotations["grace-period"])
            if time.Now().After(expirationDate.Add(gracePeriod)) {
                c.clientset.CoreV1().Namespaces().Delete(
                    ctx,
                    ns.Name,
                    metav1.DeleteOptions{},
                )
            }
        }
    }
}
```

## Implementing Cleanup Automation

Automate resource cleanup before deletion:

```go
func (c *NamespaceController) handleNamespaceDeleted(ctx context.Context, ns *corev1.Namespace) {
    // Archive important resources
    c.archiveConfigMaps(ctx, ns.Name)
    c.archiveSecrets(ctx, ns.Name)

    // Export metrics
    c.exportFinalMetrics(ns.Name)

    // Update cost tracking
    c.finalizeCostAllocation(ns.Name)

    // Send notifications
    c.notifyDeletion(ns)
}

func (c *NamespaceController) archiveConfigMaps(ctx context.Context, namespace string) {
    configMaps, _ := c.clientset.CoreV1().ConfigMaps(namespace).List(
        ctx,
        metav1.ListOptions{},
    )

    for _, cm := range configMaps.Items {
        // Export to backup storage
        backup := map[string]interface{}{
            "namespace": namespace,
            "name":      cm.Name,
            "data":      cm.Data,
            "timestamp": time.Now(),
        }
        c.saveToBackup(backup)
    }
}
```

## Monitoring Controller Health

Create metrics for the controller:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    namespacesCreated = promauto.NewCounter(prometheus.CounterOpts{
        Name: "namespace_controller_created_total",
        Help: "Total number of namespaces created",
    })

    namespacesExpired = promauto.NewCounter(prometheus.CounterOpts{
        Name: "namespace_controller_expired_total",
        Help: "Total number of namespaces expired",
    })

    reconciliationDuration = promauto.NewHistogram(prometheus.HistogramOpts{
        Name: "namespace_controller_reconciliation_duration_seconds",
        Help: "Duration of reconciliation loops",
    })
)
```

## Best Practices

Follow these guidelines:

1. Handle edge cases and failures gracefully
2. Implement idempotent operations
3. Use informers for efficient watching
4. Add metrics and logging
5. Implement leader election for HA
6. Test controller thoroughly
7. Handle namespace finalization
8. Implement retry logic with backoff
9. Monitor controller performance
10. Document controller behavior

## Conclusion

Namespace lifecycle automation through custom controllers eliminates manual toil and ensures consistent application of policies across environments. By automatically provisioning resources, managing expiration, and handling cleanup, controllers enable self-service platforms while maintaining governance and reliability.

Key capabilities include automatic resource provisioning on namespace creation, expiration management for temporary environments, cleanup automation before deletion, comprehensive monitoring and alerting, and integration with external systems for notifications and backup. With proper lifecycle automation, namespaces become fully managed resources that align with organizational policies from creation to decommissioning.
