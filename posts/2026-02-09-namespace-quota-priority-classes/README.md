# How to Configure Namespace Resource Quota for Different Priority Classes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Namespaces, Resource Management

Description: Learn how to implement namespace resource quotas for different priority classes in Kubernetes to ensure fair resource allocation and prevent resource starvation.

---

Resource management in Kubernetes becomes complex when you have workloads with different priorities competing for the same namespace resources. Without proper quota configuration, high-priority workloads might starve low-priority ones, or vice versa. Kubernetes provides a mechanism to set resource quotas based on priority classes, allowing you to allocate resources fairly across different workload types.

Priority classes help the scheduler make decisions about which pods to schedule first when resources are constrained. By combining priority classes with resource quotas, you can ensure each priority level gets its fair share of resources while preventing any single priority class from consuming all available capacity.

## Understanding Priority Classes and Resource Quotas

Priority classes assign numeric priority values to pods. Higher values indicate more important workloads that should be scheduled first. When combined with resource quotas, you can limit how many resources each priority class can consume within a namespace.

This is particularly useful in multi-tenant environments or when running mixed workloads like production services alongside batch jobs or development workloads.

## Creating Priority Classes

Start by defining priority classes for your workloads:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical-priority
value: 1000000
globalDefault: false
description: "Used for critical production workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 100000
globalDefault: false
description: "Used for important production workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: medium-priority
value: 10000
globalDefault: true
description: "Default priority for standard workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 1000
globalDefault: false
description: "Used for batch jobs and non-critical workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: best-effort-priority
value: 100
globalDefault: false
description: "Lowest priority for interruptible workloads"
```

## Configuring Namespace Resource Quotas by Priority Class

Create resource quotas that allocate resources based on priority classes:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
# Quota for critical priority workloads
apiVersion: v1
kind: ResourceQuota
metadata:
  name: critical-priority-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "50"
    persistentvolumeclaims: "20"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - critical-priority
---
# Quota for high priority workloads
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority-quota
  namespace: production
spec:
  hard:
    requests.cpu: "40"
    requests.memory: "80Gi"
    limits.cpu: "80"
    limits.memory: "160Gi"
    pods: "100"
    persistentvolumeclaims: "40"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - high-priority
---
# Quota for medium priority workloads
apiVersion: v1
kind: ResourceQuota
metadata:
  name: medium-priority-quota
  namespace: production
spec:
  hard:
    requests.cpu: "30"
    requests.memory: "60Gi"
    limits.cpu: "60"
    limits.memory: "120Gi"
    pods: "80"
    persistentvolumeclaims: "30"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - medium-priority
---
# Quota for low priority workloads
apiVersion: v1
kind: ResourceQuota
metadata:
  name: low-priority-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "50"
    persistentvolumeclaims: "10"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - low-priority
---
# Quota for best-effort priority workloads
apiVersion: v1
kind: ResourceQuota
metadata:
  name: best-effort-priority-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
    pods: "30"
    persistentvolumeclaims: "5"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - best-effort-priority
```

## Deploying Workloads with Priority Classes

Create deployments that use different priority classes:

```yaml
# Critical priority deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: critical-api
  template:
    metadata:
      labels:
        app: critical-api
    spec:
      priorityClassName: critical-priority
      containers:
      - name: api
        image: myapp/api:latest
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
        ports:
        - containerPort: 8080
---
# High priority deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-priority-service
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: high-priority-service
  template:
    metadata:
      labels:
        app: high-priority-service
    spec:
      priorityClassName: high-priority
      containers:
      - name: service
        image: myapp/service:latest
        resources:
          requests:
            cpu: "1"
            memory: "2Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
---
# Low priority batch job
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-processing
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          priorityClassName: low-priority
          containers:
          - name: processor
            image: myapp/processor:latest
            resources:
              requests:
                cpu: "4"
                memory: "8Gi"
              limits:
                cpu: "8"
                memory: "16Gi"
          restartPolicy: OnFailure
```

## Monitoring Quota Usage

Create a script to monitor quota usage across priority classes:

```bash
#!/bin/bash

NAMESPACE="production"

echo "Resource Quota Status by Priority Class"
echo "========================================"
echo

for priority in critical high medium low best-effort; do
    quota_name="${priority}-priority-quota"
    echo "Priority Class: ${priority}-priority"
    echo "------------------------------------"

    kubectl get resourcequota $quota_name -n $NAMESPACE -o json | \
        jq -r '.status | to_entries[] | "\(.key): \(.value)"' | \
        column -t -s ':'

    echo
done
```

## Implementing Dynamic Quota Adjustment

Create a controller that adjusts quotas based on cluster utilization:

```go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type QuotaAdjuster struct {
    clientset *kubernetes.Clientset
    namespace string
}

func NewQuotaAdjuster(namespace string) (*QuotaAdjuster, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &QuotaAdjuster{
        clientset: clientset,
        namespace: namespace,
    }, nil
}

func (qa *QuotaAdjuster) Run(ctx context.Context) error {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return nil
        case <-ticker.C:
            if err := qa.adjustQuotas(ctx); err != nil {
                fmt.Printf("Error adjusting quotas: %v\n", err)
            }
        }
    }
}

func (qa *QuotaAdjuster) adjustQuotas(ctx context.Context) error {
    // Get all resource quotas in the namespace
    quotas, err := qa.clientset.CoreV1().ResourceQuotas(qa.namespace).List(ctx, metav1.ListOptions{})
    if err != nil {
        return err
    }

    for _, quota := range quotas.Items {
        // Calculate usage percentage
        cpuUsed := quota.Status.Used[corev1.ResourceRequestsCPU]
        cpuHard := quota.Status.Hard[corev1.ResourceRequestsCPU]

        if cpuHard.IsZero() {
            continue
        }

        usagePercent := float64(cpuUsed.MilliValue()) / float64(cpuHard.MilliValue()) * 100

        fmt.Printf("Quota %s: %.2f%% CPU used\n", quota.Name, usagePercent)

        // Adjust quota if usage is high
        if usagePercent > 85 {
            if err := qa.increaseQuota(ctx, &quota, 1.2); err != nil {
                fmt.Printf("Failed to increase quota %s: %v\n", quota.Name, err)
            }
        } else if usagePercent < 30 {
            if err := qa.decreaseQuota(ctx, &quota, 0.8); err != nil {
                fmt.Printf("Failed to decrease quota %s: %v\n", quota.Name, err)
            }
        }
    }

    return nil
}

func (qa *QuotaAdjuster) increaseQuota(ctx context.Context, quota *corev1.ResourceQuota, factor float64) error {
    fmt.Printf("Increasing quota %s by %.0f%%\n", quota.Name, (factor-1)*100)

    cpuHard := quota.Spec.Hard[corev1.ResourceRequestsCPU]
    newCPU := resource.NewMilliQuantity(int64(float64(cpuHard.MilliValue())*factor), resource.DecimalSI)
    quota.Spec.Hard[corev1.ResourceRequestsCPU] = *newCPU

    memHard := quota.Spec.Hard[corev1.ResourceRequestsMemory]
    newMem := resource.NewQuantity(int64(float64(memHard.Value())*factor), resource.BinarySI)
    quota.Spec.Hard[corev1.ResourceRequestsMemory] = *newMem

    _, err := qa.clientset.CoreV1().ResourceQuotas(qa.namespace).Update(ctx, quota, metav1.UpdateOptions{})
    return err
}

func (qa *QuotaAdjuster) decreaseQuota(ctx context.Context, quota *corev1.ResourceQuota, factor float64) error {
    fmt.Printf("Decreasing quota %s by %.0f%%\n", quota.Name, (1-factor)*100)

    cpuHard := quota.Spec.Hard[corev1.ResourceRequestsCPU]
    newCPU := resource.NewMilliQuantity(int64(float64(cpuHard.MilliValue())*factor), resource.DecimalSI)
    quota.Spec.Hard[corev1.ResourceRequestsCPU] = *newCPU

    memHard := quota.Spec.Hard[corev1.ResourceRequestsMemory]
    newMem := resource.NewQuantity(int64(float64(memHard.Value())*factor), resource.BinarySI)
    quota.Spec.Hard[corev1.ResourceRequestsMemory] = *newMem

    _, err := qa.clientset.CoreV1().ResourceQuotas(qa.namespace).Update(ctx, quota, metav1.UpdateOptions{})
    return err
}

func main() {
    adjuster, err := NewQuotaAdjuster("production")
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    if err := adjuster.Run(ctx); err != nil {
        panic(err)
    }
}
```

## Setting Up Alerts

Create Prometheus alerts for quota violations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  quota-alerts.yaml: |
    groups:
    - name: resource-quota-alerts
      interval: 30s
      rules:
      - alert: NamespaceQuotaExceeded
        expr: |
          kube_resourcequota{job="kube-state-metrics"}
          / on(resource,namespace,resourcequota)
          kube_resourcequota{type="hard"}
          > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Namespace quota nearly exceeded"
          description: "Namespace {{ $labels.namespace }} quota {{ $labels.resourcequota }} is at {{ $value | humanizePercentage }}"

      - alert: PriorityClassQuotaExhausted
        expr: |
          kube_resourcequota{job="kube-state-metrics"}
          / on(resource,namespace,resourcequota)
          kube_resourcequota{type="hard"}
          >= 1.0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Priority class quota exhausted"
          description: "Priority class quota {{ $labels.resourcequota }} in namespace {{ $labels.namespace }} is fully consumed"
```

## Validating Quota Configuration

Test quota enforcement by attempting to create pods that exceed limits:

```bash
# Test critical priority quota
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-critical-quota
  namespace: production
spec:
  priorityClassName: critical-priority
  containers:
  - name: test
    image: nginx
    resources:
      requests:
        cpu: "50"  # This should fail if quota is exceeded
        memory: "100Gi"
EOF

# Check quota status
kubectl describe resourcequota critical-priority-quota -n production

# Test low priority quota
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-low-quota
  namespace: production
spec:
  priorityClassName: low-priority
  containers:
  - name: test
    image: nginx
    resources:
      requests:
        cpu: "25"  # This should fail if low priority quota is exceeded
        memory: "50Gi"
EOF

# Verify quota enforcement
kubectl get events -n production --sort-by='.lastTimestamp' | grep -i quota
```

## Best Practices

Align quota limits with cluster capacity and business priorities. Regularly review and adjust quotas based on actual usage patterns. Set critical workloads with higher priority and more generous quotas. Use monitoring and alerting to detect quota exhaustion before it impacts services. Document priority class usage guidelines for development teams. Implement admission webhooks to validate pod priority class assignments. Consider implementing quota overcommit for best-effort workloads during off-peak hours.

By configuring namespace resource quotas for different priority classes, you ensure fair resource allocation across workload types while maintaining the ability to prioritize critical services when resources become constrained.
