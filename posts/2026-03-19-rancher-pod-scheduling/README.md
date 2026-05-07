# How to Configure Pod Scheduling in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Workload

Description: Learn how to configure pod scheduling in Rancher using node selectors, affinity rules, taints, tolerations, and topology spread constraints.

Kubernetes provides multiple mechanisms to control where pods are scheduled across your cluster nodes. Rancher exposes these scheduling options through its UI, making it easier to configure node selectors, affinity rules, taints, tolerations, and topology spread constraints. This guide covers each scheduling method and how to apply them in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster with multiple nodes
- Access to a project and namespace
- Nodes with varying labels or hardware configurations for testing

## Method 1: Node Selectors

Node selectors are the simplest way to constrain pods to specific nodes. They use label matching to determine eligible nodes.

### Label Your Nodes

First, add labels to your nodes. In Rancher, click **Cluster Management**, open the cluster with **Explore**, go to **Nodes**, click the three-dot menu on a node, and select **Edit**. Add labels such as:

- `disktype: ssd`
- `env: production`
- `gpu: nvidia`

Or use kubectl:

```bash
kubectl label nodes worker-1 disktype=ssd
kubectl label nodes worker-2 disktype=hdd
kubectl label nodes worker-3 gpu=nvidia
```

### Apply Node Selectors to a Workload

When creating or editing a workload in Rancher:

1. Scroll to the **Node Scheduling** section
2. Select **Run pods on specific nodes**
3. Add the label key-value pair (e.g., `disktype: ssd`)

In YAML:

```yaml
spec:
  template:
    spec:
      nodeSelector:
        disktype: ssd
```

## Method 2: Node Affinity

Node affinity provides more expressive rules than node selectors, supporting soft preferences and complex matching.

### Required Node Affinity

This is a hard requirement. The pod will not be scheduled if no matching node exists.

In the Rancher workload form:

1. Go to the **Node Scheduling** section
2. Select **Advanced**
3. Under **Required Rules**, add a rule:
   - **Key**: `env`
   - **Operator**: `In`
   - **Values**: `production, staging`

YAML equivalent:

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: env
                    operator: In
                    values:
                      - production
                      - staging
```

### Preferred Node Affinity

This is a soft preference. The scheduler will try to place the pod on a matching node, but will schedule elsewhere if needed.

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 80
              preference:
                matchExpressions:
                  - key: disktype
                    operator: In
                    values:
                      - ssd
```

The `weight` (1-100) determines priority when multiple preferences exist.

## Method 3: Pod Affinity and Anti-Affinity

Pod affinity co-locates pods with other pods. Pod anti-affinity keeps pods apart.

### Pod Affinity

Schedule your web servers on the same nodes as your cache pods:

```yaml
spec:
  template:
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - redis-cache
              topologyKey: kubernetes.io/hostname
```

### Pod Anti-Affinity

Spread database replicas across different nodes:

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - postgres
              topologyKey: kubernetes.io/hostname
```

In Rancher, configure this in the workload form's scheduling options.

## Method 4: Taints and Tolerations

Taints prevent pods from being scheduled on nodes unless the pod has a matching toleration.

### Add a Taint to a Node

In Rancher, click **Cluster Management**, open the cluster with **Explore**, go to **Nodes**, edit the node, and add a taint:

- **Key**: `dedicated`
- **Value**: `gpu-workloads`
- **Effect**: `NoSchedule`

Or with kubectl:

```bash
kubectl taint nodes gpu-node-1 dedicated=gpu-workloads:NoSchedule
```

### Add Tolerations to a Workload

In the Rancher workload form:

1. Scroll to the **Tolerations** section
2. Click **Add Toleration**
3. Set **Key**: `dedicated`, **Value**: `gpu-workloads`, **Effect**: `NoSchedule`, **Operator**: `Equal`

YAML:

```yaml
spec:
  template:
    spec:
      tolerations:
        - key: dedicated
          operator: Equal
          value: gpu-workloads
          effect: NoSchedule
```

A toleration allows the pod to be scheduled onto matching tainted nodes, but it does not guarantee placement there. If you want the workload to run only on those nodes, combine the toleration with a node selector or node affinity rule.

### Taint Effects

- **NoSchedule**: New pods without a matching toleration will not be scheduled
- **PreferNoSchedule**: Soft version of NoSchedule; the scheduler tries to avoid the node
- **NoExecute**: Pods without a matching toleration are not scheduled onto the node, and any existing pods without a matching toleration are evicted

## Method 5: Topology Spread Constraints

Topology spread constraints distribute pods evenly across failure domains such as zones, regions, or nodes.

```yaml
spec:
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: my-app
```

- **maxSkew**: Maximum difference in pod count between zones
- **topologyKey**: The node label to define the topology domain
- **whenUnsatisfiable**: `DoNotSchedule` (hard) or `ScheduleAnyway` (soft)

## Combining Scheduling Rules

You can combine multiple scheduling methods for precise control:

```yaml
spec:
  template:
    spec:
      nodeSelector:
        env: production
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - my-app
                topologyKey: kubernetes.io/hostname
      tolerations:
        - key: dedicated
          operator: Equal
          value: high-memory
          effect: NoSchedule
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: my-app
```

## Verifying Scheduling

After deploying, verify pod placement:

```bash
kubectl get pods -o wide -l app=my-app
```

If a pod is in `Pending` state, check events for scheduling failures:

```bash
kubectl describe pod <pod-name>
```

Look for events like `FailedScheduling` to understand why the scheduler could not place the pod.

## Summary

Rancher provides a comprehensive interface for configuring pod scheduling rules. Use node selectors for simple label matching, node affinity for expressive requirements, pod affinity and anti-affinity for inter-pod relationships, taints and tolerations to repel pods from specific nodes or allow placement on tainted nodes, and topology spread constraints for even distribution. Combining these methods gives you fine-grained control over where your workloads run across the cluster.
