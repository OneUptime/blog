# How to Use Capacity Scheduling for Resource Reservation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Resource Management, Capacity Planning

Description: Learn how to implement capacity scheduling in Kubernetes to reserve resources for critical workloads, prevent resource fragmentation, and ensure predictable capacity for future deployments.

---

Capacity scheduling addresses a common problem in Kubernetes clusters. You have available resources, but they're fragmented across nodes in ways that prevent large pods from being scheduled. Capacity scheduling solves this by reserving resources and maintaining the ability to run specific workload profiles.

This technique is particularly valuable for clusters that run both regular workloads and occasional large jobs. Without capacity scheduling, regular workloads might consume resources in patterns that prevent big jobs from running, even though the total cluster capacity is sufficient.

Understanding capacity scheduling helps you maintain predictable resource availability, reduce scheduling failures, and optimize cluster utilization for diverse workload types.

## Understanding Capacity Scheduling Challenges

Traditional Kubernetes scheduling works on a first-come, first-served basis. When a pod needs scheduling, the scheduler finds a node with available resources and places the pod there. This approach works well for homogeneous workloads but creates problems for heterogeneous environments.

Consider a cluster with five nodes, each having 16 CPU cores. If small 2-core pods gradually fill the cluster, you might end up with 3 cores free on each node. The cluster has 15 cores available total, but a single 8-core pod cannot schedule because no individual node has enough capacity.

Capacity scheduling prevents this fragmentation. It reserves resources on specific nodes, ensuring that large workloads can always find placement. This involves placeholder pods, pod priority and preemption, and careful capacity planning.

## Using Placeholder Pods for Capacity Reservation

Placeholder pods reserve capacity by consuming resources without doing meaningful work. When a high-priority workload needs resources, it can preempt these placeholders. Here is how to create placeholder pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: capacity-placeholder-1
  namespace: kube-system
  labels:
    purpose: capacity-reservation
spec:
  priorityClassName: low-priority-placeholder
  containers:
  - name: placeholder
    image: registry.k8s.io/pause:3.9
    resources:
      requests:
        cpu: "8"
        memory: "16Gi"
  nodeSelector:
    capacity-pool: reserved
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            purpose: capacity-reservation
        topologyKey: kubernetes.io/hostname
```

This placeholder reserves 8 cores and 16GB of memory. The `pause` container uses minimal actual resources while holding the reservation. The anti-affinity rule ensures placeholders spread across nodes rather than clustering on one node.

Create a priority class for these placeholders:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority-placeholder
value: -10
globalDefault: false
description: "Low priority for capacity reservation placeholders"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority-workload
value: 1000000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "High priority for workloads that can preempt placeholders"
```

The negative priority ensures placeholders are preempted by almost any real workload. When you schedule a high-priority pod, it can evict placeholders and use their resources:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: large-ml-job
spec:
  template:
    spec:
      priorityClassName: high-priority-workload
      containers:
      - name: trainer
        image: ml-trainer:latest
        resources:
          requests:
            cpu: "8"
            memory: "16Gi"
      restartPolicy: Never
```

## Implementing Dynamic Capacity Reservation

Static placeholders work but waste resources when the reserved capacity is not needed. Dynamic capacity reservation adjusts placeholder count based on actual demand. Use a controller to manage this:

```go
// capacity-controller.go
package main

import (
    "context"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/labels"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/klog/v2"
)

type CapacityController struct {
    clientset              *kubernetes.Clientset
    namespace              string
    targetReservedCores    int64
    targetReservedMemoryGi int64
}

func NewCapacityController(namespace string, cores int64, memoryGi int64) (*CapacityController, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &CapacityController{
        clientset:              clientset,
        namespace:              namespace,
        targetReservedCores:    cores,
        targetReservedMemoryGi: memoryGi,
    }, nil
}

func (c *CapacityController) Run(ctx context.Context) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            if err := c.reconcile(ctx); err != nil {
                klog.Errorf("Failed to reconcile capacity: %v", err)
            }
        }
    }
}

func (c *CapacityController) reconcile(ctx context.Context) error {
    // Get current placeholder pods
    labelSelector := metav1.LabelSelector{
        MatchLabels: map[string]string{
            "purpose": "capacity-reservation",
        },
    }
    listOptions := metav1.ListOptions{
        LabelSelector: labels.Set(labelSelector.MatchLabels).String(),
    }

    pods, err := c.clientset.CoreV1().Pods(c.namespace).List(ctx, listOptions)
    if err != nil {
        return err
    }

    // Calculate current reserved capacity
    var currentReservedCores int64
    var currentReservedMemoryGi int64
    activePlaceholders := 0

    for _, pod := range pods.Items {
        if pod.Status.Phase == corev1.PodRunning {
            activePlaceholders++
            for _, container := range pod.Spec.Containers {
                currentReservedCores += container.Resources.Requests.Cpu().MilliValue() / 1000
                currentReservedMemoryGi += container.Resources.Requests.Memory().Value() / (1024 * 1024 * 1024)
            }
        }
    }

    klog.V(2).Infof("Current reserved capacity: %d cores, %dGi memory (%d placeholders)",
        currentReservedCores, currentReservedMemoryGi, activePlaceholders)

    // Adjust placeholder count if needed
    if currentReservedCores < c.targetReservedCores {
        return c.scaleUpPlaceholders(ctx, activePlaceholders)
    } else if currentReservedCores > c.targetReservedCores {
        return c.scaleDownPlaceholders(ctx, activePlaceholders)
    }

    return nil
}

func (c *CapacityController) scaleUpPlaceholders(ctx context.Context, currentCount int) error {
    newPod := &corev1.Pod{
        ObjectMeta: metav1.ObjectMeta{
            GenerateName: "capacity-placeholder-",
            Namespace:    c.namespace,
            Labels: map[string]string{
                "purpose": "capacity-reservation",
            },
        },
        Spec: corev1.PodSpec{
            PriorityClassName: "low-priority-placeholder",
            Containers: []corev1.Container{
                {
                    Name:  "placeholder",
                    Image: "registry.k8s.io/pause:3.9",
                    Resources: corev1.ResourceRequirements{
                        Requests: corev1.ResourceList{
                            corev1.ResourceCPU:    parseQuantity("8"),
                            corev1.ResourceMemory: parseQuantity("16Gi"),
                        },
                    },
                },
            },
            Affinity: &corev1.Affinity{
                PodAntiAffinity: &corev1.PodAntiAffinity{
                    RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
                        {
                            LabelSelector: &metav1.LabelSelector{
                                MatchLabels: map[string]string{
                                    "purpose": "capacity-reservation",
                                },
                            },
                            TopologyKey: "kubernetes.io/hostname",
                        },
                    },
                },
            },
        },
    }

    _, err := c.clientset.CoreV1().Pods(c.namespace).Create(ctx, newPod, metav1.CreateOptions{})
    if err != nil {
        return err
    }

    klog.V(2).Infof("Created new capacity placeholder (total: %d)", currentCount+1)
    return nil
}

func (c *CapacityController) scaleDownPlaceholders(ctx context.Context, currentCount int) error {
    // Get one placeholder pod to delete
    labelSelector := metav1.LabelSelector{
        MatchLabels: map[string]string{
            "purpose": "capacity-reservation",
        },
    }
    listOptions := metav1.ListOptions{
        LabelSelector: labels.Set(labelSelector.MatchLabels).String(),
        Limit:         1,
    }

    pods, err := c.clientset.CoreV1().Pods(c.namespace).List(ctx, listOptions)
    if err != nil || len(pods.Items) == 0 {
        return err
    }

    pod := &pods.Items[0]
    if err := c.clientset.CoreV1().Pods(c.namespace).Delete(ctx, pod.Name, metav1.DeleteOptions{}); err != nil {
        return err
    }

    klog.V(2).Infof("Deleted capacity placeholder %s (remaining: %d)", pod.Name, currentCount-1)
    return nil
}

func parseQuantity(s string) resource.Quantity {
    // Simplified - use proper quantity parsing in production
    return resource.MustParse(s)
}
```

Deploy this controller as a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: capacity-controller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: capacity-controller
  template:
    metadata:
      labels:
        app: capacity-controller
    spec:
      serviceAccountName: capacity-controller
      containers:
      - name: controller
        image: yourorg/capacity-controller:latest
        env:
        - name: TARGET_RESERVED_CORES
          value: "32"
        - name: TARGET_RESERVED_MEMORY_GI
          value: "64"
```

## Node Pools for Capacity Management

Another approach uses dedicated node pools for specific workload types. This provides hard isolation and prevents resource fragmentation:

```yaml
# Label nodes in the reserved pool
apiVersion: v1
kind: Node
metadata:
  name: node-reserved-1
  labels:
    capacity-pool: reserved
    workload-type: large-batch
```

Create node taints to prevent regular workloads from using reserved capacity:

```bash
# Taint nodes in the reserved pool
kubectl taint nodes node-reserved-1 reserved=true:NoSchedule
kubectl taint nodes node-reserved-2 reserved=true:NoSchedule
kubectl taint nodes node-reserved-3 reserved=true:NoSchedule
```

Now only pods with matching tolerations can schedule on these nodes:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: large-batch-job
spec:
  template:
    spec:
      tolerations:
      - key: reserved
        operator: Equal
        value: "true"
        effect: NoSchedule
      nodeSelector:
        capacity-pool: reserved
      containers:
      - name: processor
        image: batch-processor:latest
        resources:
          requests:
            cpu: "16"
            memory: "32Gi"
```

## Capacity-Aware Autoscaling

Integrate capacity scheduling with cluster autoscaling to maintain reserved capacity as the cluster scales:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |-
    10:
      - .*-reserved-.*
    5:
      - .*-standard-.*
    1:
      - .*
```

This configuration tells the cluster autoscaler to prefer creating reserved node pools when scaling up. Combined with placeholder pods, this ensures that capacity is always available for large workloads.

Configure the autoscaler to maintain minimum capacity:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: cluster-autoscaler
        image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.29.0
        command:
          - ./cluster-autoscaler
          - --cloud-provider=aws
          - --namespace=kube-system
          - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled
          - --balance-similar-node-groups
          - --skip-nodes-with-system-pods=false
          - --expander=priority
```

## Monitoring Capacity Utilization

Track capacity reservation effectiveness with custom metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: capacity-metrics
  namespace: kube-system
data:
  query.yaml: |
    # Prometheus queries for capacity monitoring
    - name: reserved_capacity_utilization
      query: |
        sum(kube_pod_container_resource_requests{pod=~"capacity-placeholder.*"})
        / sum(kube_node_status_allocatable)

    - name: placeholder_preemption_rate
      query: |
        rate(kube_pod_status_phase{pod=~"capacity-placeholder.*",phase="Failed"}[5m])

    - name: large_pod_scheduling_failures
      query: |
        sum(rate(scheduler_schedule_attempts_total{result="error"}[5m]))
```

Create a Grafana dashboard to visualize capacity metrics:

```json
{
  "dashboard": {
    "title": "Capacity Scheduling",
    "panels": [
      {
        "title": "Reserved Capacity",
        "targets": [
          {
            "expr": "sum(kube_pod_container_resource_requests{pod=~'capacity-placeholder.*', resource='cpu'})"
          }
        ]
      },
      {
        "title": "Placeholder Preemptions",
        "targets": [
          {
            "expr": "rate(kube_pod_status_phase{pod=~'capacity-placeholder.*',phase='Failed'}[5m])"
          }
        ]
      }
    ]
  }
}
```

## Best Practices for Capacity Scheduling

Start with conservative capacity reservations. Reserve 10-15% of cluster resources initially and adjust based on actual workload patterns. Monitor preemption rates to ensure placeholders are being used effectively.

Use node pools when you need hard isolation between workload types. Use placeholder pods when you need flexible capacity that can be reclaimed by regular workloads during low demand periods.

Document your capacity requirements clearly. Include expected workload sizes, frequency, and priority levels in your capacity planning documentation. This helps operators understand why capacity is reserved and how to adjust it.

Test capacity scheduling thoroughly before deploying to production. Create test workloads that simulate your largest jobs and verify they can schedule successfully even when the cluster is busy with smaller workloads.

Capacity scheduling ensures that critical workloads can always find resources, even in busy clusters. By reserving resources strategically and using priority-based preemption, you maintain predictable capacity without wasting resources.
