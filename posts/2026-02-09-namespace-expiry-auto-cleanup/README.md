# How to Implement Namespace Expiry and Auto-Cleanup for Temporary Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Namespaces, Automation

Description: Learn how to implement automatic namespace expiration and cleanup in Kubernetes for temporary development, testing, and preview environments to reduce resource waste.

---

Temporary environments like feature branches, pull request previews, and short-term testing namespaces can quickly accumulate in Kubernetes clusters, consuming resources long after they're needed. Without automatic cleanup, these orphaned namespaces waste compute capacity and increase cloud costs. Implementing namespace expiry and auto-cleanup ensures temporary environments are automatically removed after their usefulness has ended.

This is especially valuable for CI/CD pipelines that create ephemeral environments for every pull request or branch, development teams that spin up temporary test environments, and organizations running time-bound demos or proof-of-concepts.

## Understanding Namespace Lifecycle Management

Namespace expiry works by annotating namespaces with expiration timestamps. A controller continuously monitors these annotations and automatically deletes namespaces when they expire. This approach provides predictable cleanup without manual intervention.

## Building a Namespace Expiry Controller

Let's create a controller that handles namespace expiration:

```go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/informers"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/cache"
)

const (
    expiryAnnotation     = "expiry.example.com/expires-at"
    ttlAnnotation        = "expiry.example.com/ttl"
    warningAnnotation    = "expiry.example.com/warning-sent"
    webhookAnnotation    = "expiry.example.com/webhook-url"
)

type NamespaceExpiry struct {
    clientset *kubernetes.Clientset
}

func NewNamespaceExpiry() (*NamespaceExpiry, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &NamespaceExpiry{
        clientset: clientset,
    }, nil
}

func (ne *NamespaceExpiry) Run(ctx context.Context) error {
    factory := informers.NewSharedInformerFactory(ne.clientset, time.Minute*1)
    nsInformer := factory.Core().V1().Namespaces()

    nsInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            ns := obj.(*corev1.Namespace)
            ne.handleNamespace(ctx, ns)
        },
        UpdateFunc: func(old, new interface{}) {
            ns := new.(*corev1.Namespace)
            ne.handleNamespace(ctx, ns)
        },
    })

    factory.Start(ctx.Done())
    factory.WaitForCacheSync(ctx.Done())

    // Run cleanup loop
    ticker := time.NewTicker(time.Minute * 5)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return nil
        case <-ticker.C:
            ne.cleanupExpiredNamespaces(ctx)
        }
    }
}

func (ne *NamespaceExpiry) handleNamespace(ctx context.Context, ns *corev1.Namespace) {
    // Skip if namespace is being deleted
    if !ns.DeletionTimestamp.IsZero() {
        return
    }

    // Skip system namespaces
    if isSystemNamespace(ns.Name) {
        return
    }

    // Set expiry if TTL is specified but no expiry date
    if ttl := ns.Annotations[ttlAnnotation]; ttl != "" && ns.Annotations[expiryAnnotation] == "" {
        ne.setExpiryFromTTL(ctx, ns, ttl)
    }
}

func (ne *NamespaceExpiry) setExpiryFromTTL(ctx context.Context, ns *corev1.Namespace, ttl string) {
    duration, err := time.ParseDuration(ttl)
    if err != nil {
        fmt.Printf("Invalid TTL for namespace %s: %v\n", ns.Name, err)
        return
    }

    expiryTime := time.Now().Add(duration)
    ns.Annotations[expiryAnnotation] = expiryTime.Format(time.RFC3339)

    _, err = ne.clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
    if err != nil {
        fmt.Printf("Failed to set expiry for namespace %s: %v\n", ns.Name, err)
        return
    }

    fmt.Printf("Set expiry for namespace %s to %s\n", ns.Name, expiryTime.Format(time.RFC3339))
}

func (ne *NamespaceExpiry) cleanupExpiredNamespaces(ctx context.Context) {
    namespaces, err := ne.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
    if err != nil {
        fmt.Printf("Failed to list namespaces: %v\n", err)
        return
    }

    now := time.Now()

    for _, ns := range namespaces.Items {
        if isSystemNamespace(ns.Name) {
            continue
        }

        expiryStr := ns.Annotations[expiryAnnotation]
        if expiryStr == "" {
            continue
        }

        expiryTime, err := time.Parse(time.RFC3339, expiryStr)
        if err != nil {
            fmt.Printf("Invalid expiry time for namespace %s: %v\n", ns.Name, err)
            continue
        }

        // Send warning 1 hour before expiry
        if now.Add(time.Hour).After(expiryTime) && ns.Annotations[warningAnnotation] == "" {
            ne.sendExpiryWarning(ctx, &ns, expiryTime)
        }

        // Delete if expired
        if now.After(expiryTime) {
            ne.deleteNamespace(ctx, &ns)
        }
    }
}

func (ne *NamespaceExpiry) sendExpiryWarning(ctx context.Context, ns *corev1.Namespace, expiryTime time.Time) {
    fmt.Printf("Namespace %s will expire at %s\n", ns.Name, expiryTime.Format(time.RFC3339))

    // Send webhook notification if configured
    webhookURL := ns.Annotations[webhookAnnotation]
    if webhookURL != "" {
        ne.sendWebhook(webhookURL, ns.Name, expiryTime)
    }

    // Mark warning as sent
    ns.Annotations[warningAnnotation] = "true"
    _, err := ne.clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
    if err != nil {
        fmt.Printf("Failed to update warning annotation for namespace %s: %v\n", ns.Name, err)
    }
}

func (ne *NamespaceExpiry) sendWebhook(url, namespace string, expiryTime time.Time) {
    // Implement webhook notification
    fmt.Printf("Sending webhook to %s for namespace %s\n", url, namespace)
}

func (ne *NamespaceExpiry) deleteNamespace(ctx context.Context, ns *corev1.Namespace) {
    fmt.Printf("Deleting expired namespace: %s\n", ns.Name)

    // Backup namespace resources before deletion
    if err := ne.backupNamespace(ctx, ns); err != nil {
        fmt.Printf("Failed to backup namespace %s: %v\n", ns.Name, err)
    }

    // Delete namespace
    err := ne.clientset.CoreV1().Namespaces().Delete(ctx, ns.Name, metav1.DeleteOptions{})
    if err != nil {
        fmt.Printf("Failed to delete namespace %s: %v\n", ns.Name, err)
        return
    }

    fmt.Printf("Successfully deleted expired namespace: %s\n", ns.Name)
}

func (ne *NamespaceExpiry) backupNamespace(ctx context.Context, ns *corev1.Namespace) error {
    // Implement backup logic
    fmt.Printf("Backing up namespace %s before deletion\n", ns.Name)
    return nil
}

func isSystemNamespace(name string) bool {
    systemNamespaces := []string{
        "kube-system",
        "kube-public",
        "kube-node-lease",
        "default",
    }

    for _, sysNs := range systemNamespaces {
        if name == sysNs {
            return true
        }
    }

    return false
}

func main() {
    expiry, err := NewNamespaceExpiry()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    if err := expiry.Run(ctx); err != nil {
        panic(err)
    }
}
```

## Deployment Configuration

Deploy the expiry controller:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: namespace-expiry
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-expiry
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch", "update", "delete"]
- apiGroups: [""]
  resources: ["*"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: namespace-expiry
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: namespace-expiry
subjects:
- kind: ServiceAccount
  name: namespace-expiry
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: namespace-expiry
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: namespace-expiry
  template:
    metadata:
      labels:
        app: namespace-expiry
    spec:
      serviceAccountName: namespace-expiry
      containers:
      - name: controller
        image: namespace-expiry:latest
        resources:
          limits:
            memory: "128Mi"
            cpu: "100m"
```

## Creating Temporary Namespaces

Create a namespace with automatic expiry:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: pr-1234-preview
  annotations:
    expiry.example.com/ttl: "24h"
    expiry.example.com/webhook-url: "https://slack.webhook.url"
  labels:
    type: preview
    pr-number: "1234"
```

The namespace will automatically be deleted after 24 hours.

## Integration with CI/CD

Create namespaces from your CI/CD pipeline:

```bash
#!/bin/bash

PR_NUMBER=$1
EXPIRY_HOURS=${2:-24}

NAMESPACE="pr-${PR_NUMBER}-preview"

kubectl create namespace "$NAMESPACE"

kubectl annotate namespace "$NAMESPACE" \
  expiry.example.com/ttl="${EXPIRY_HOURS}h" \
  expiry.example.com/webhook-url="https://hooks.slack.com/your-webhook"

kubectl label namespace "$NAMESPACE" \
  type=preview \
  pr-number="$PR_NUMBER"

echo "Created temporary namespace: $NAMESPACE"
echo "Will expire in $EXPIRY_HOURS hours"
```

## Extending Namespace Lifetime

Create a kubectl plugin to extend expiration:

```bash
#!/bin/bash
# Save as kubectl-extend-namespace

NAMESPACE=$1
EXTRA_TIME=${2:-24h}

CURRENT_EXPIRY=$(kubectl get namespace "$NAMESPACE" -o jsonpath='{.metadata.annotations.expiry\.example\.com/expires-at}')

if [ -z "$CURRENT_EXPIRY" ]; then
    echo "Namespace has no expiry set"
    exit 1
fi

CURRENT_TIME=$(date -d "$CURRENT_EXPIRY" +%s)
EXTRA_SECONDS=$(echo "$EXTRA_TIME" | sed 's/h$//' | awk '{print $1 * 3600}')
NEW_TIME=$(date -d "@$((CURRENT_TIME + EXTRA_SECONDS))" --rfc-3339=seconds)

kubectl annotate namespace "$NAMESPACE" \
  expiry.example.com/expires-at="$NEW_TIME" \
  --overwrite

echo "Extended $NAMESPACE expiry to $NEW_TIME"
```

Use it like:

```bash
kubectl extend-namespace pr-1234-preview 48h
```

## Monitoring Namespace Expiry

Create a dashboard to track namespace expiration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-namespace-expiry
  namespace: monitoring
data:
  namespace-expiry.json: |
    {
      "dashboard": {
        "title": "Namespace Expiry Tracking",
        "panels": [
          {
            "title": "Expiring Soon",
            "targets": [
              {
                "expr": "count(kube_namespace_annotations{annotation_expiry_example_com_expires_at!=\"\"}) by (namespace)"
              }
            ]
          }
        ]
      }
    }
```

This namespace expiry system ensures temporary environments are automatically cleaned up, reducing resource waste and cloud costs while maintaining a clean cluster environment.
