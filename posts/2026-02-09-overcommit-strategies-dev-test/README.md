# How to Implement Overcommit Strategies for Kubernetes Dev and Test Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Resource Management, Development, Testing

Description: Implement strategic resource overcommitment in Kubernetes development and test environments to maximize cluster density, reduce costs, and improve resource utilization without impacting developer productivity.

---

Development and test environments typically waste massive amounts of resources. Developers request generous resource limits to avoid performance issues, but actual usage remains low most of the time. Pods sit idle during off-hours, lunch breaks, and between test runs. This waste directly translates to inflated cloud bills.

Overcommitment strategies let you safely pack more workloads onto fewer nodes by allowing resource requests to exceed physical capacity. This works because not all workloads peak simultaneously. Careful implementation can reduce dev/test infrastructure costs by 50% or more while maintaining acceptable performance for development workflows.

## Understanding Overcommit Concepts

Kubernetes resource management involves three key values: requests, limits, and actual usage. Requests represent guaranteed resources that the scheduler uses for placement decisions. Limits define the maximum resources a container can consume. Actual usage typically falls far below both requests and limits in non-production environments.

Overcommitment means scheduling more resource requests than physical node capacity. If you have a 16-core node and allow 24 cores worth of requests to schedule on it, you've overcommitted by 150%. This works safely when actual combined usage stays below physical capacity.

The kubelet's eviction manager handles resource pressure by evicting lower-priority pods when actual usage approaches node limits. Proper configuration of eviction thresholds and pod priorities ensures critical workloads survive while less important pods get evicted.

## Configuring Kubelet for Controlled Overcommit

Start by adjusting kubelet configuration to enable overcommitment through system reserves and eviction thresholds. These settings apply per node and control how aggressively the kubelet allows oversubscription.

```yaml
# kubelet-config-overcommit.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubelet-config-overcommit
  namespace: kube-system
data:
  kubelet: |
    apiVersion: kubelet.config.k8s.io/v1beta1
    kind: KubeletConfiguration

    # Reduce system reserved resources to allow more overcommit
    systemReserved:
      cpu: 100m
      memory: 512Mi
      ephemeral-storage: 1Gi

    # Adjust eviction thresholds for higher density
    evictionHard:
      memory.available: "256Mi"
      nodefs.available: "5%"
      nodefs.inodesFree: "3%"
      imagefs.available: "10%"

    evictionSoft:
      memory.available: "512Mi"
      nodefs.available: "8%"
      nodefs.inodesFree: "5%"
      imagefs.available: "15%"

    evictionSoftGracePeriod:
      memory.available: "1m"
      nodefs.available: "1m"
      nodefs.inodesFree: "1m"
      imagefs.available: "1m"

    # Allow higher eviction minimum reclaim
    evictionMinimumReclaim:
      memory.available: "256Mi"
      nodefs.available: "500Mi"
      imagefs.available: "1Gi"

    # Increase image garbage collection thresholds
    imageGCHighThresholdPercent: 90
    imageGCLowThresholdPercent: 80

    # Enable CPU CFS quota enforcement
    cpuCFSQuota: true
    cpuCFSQuotaPeriod: 100ms
```

Apply this configuration through node bootstrap scripts or configuration management tools. For example, with AWS EKS user data:

```bash
#!/bin/bash
# EKS node user data script

# Write kubelet config
cat > /etc/kubernetes/kubelet-config.json <<EOF
{
  "systemReserved": {
    "cpu": "100m",
    "memory": "512Mi"
  },
  "evictionHard": {
    "memory.available": "256Mi",
    "nodefs.available": "5%"
  }
}
EOF

# Bootstrap the node
/etc/eks/bootstrap.sh ${CLUSTER_NAME} \
  --kubelet-extra-args '--config /etc/kubernetes/kubelet-config.json'
```

For existing nodes, you'll need to drain, update, and uncordon them:

```bash
# Drain node for maintenance
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Update node configuration (method varies by platform)
# Then uncordon
kubectl uncordon <node-name>
```

## Setting Up Priority Classes for Eviction Control

Priority classes determine which pods get evicted first during resource pressure. Create a hierarchy that protects critical development infrastructure while allowing aggressive overcommit of ephemeral workloads.

```yaml
# priority-classes-dev.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: dev-critical
value: 1000000
globalDefault: false
description: "Critical dev infrastructure that should never be evicted"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: dev-standard
value: 100000
globalDefault: true
description: "Standard development workloads with normal priority"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: dev-low
value: 10000
globalDefault: false
description: "Low priority workloads that can be evicted easily"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: dev-best-effort
value: 1000
globalDefault: false
description: "Best effort workloads, first to be evicted"
```

Apply the priority classes:

```bash
kubectl apply -f priority-classes-dev.yaml

# Verify creation
kubectl get priorityclasses
```

Now assign appropriate priority classes to different workload types:

```yaml
# Critical infrastructure example (CI/CD runners)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gitlab-runner
  namespace: ci
spec:
  replicas: 5
  selector:
    matchLabels:
      app: gitlab-runner
  template:
    metadata:
      labels:
        app: gitlab-runner
    spec:
      priorityClassName: dev-critical  # Protected from eviction
      containers:
      - name: runner
        image: gitlab/gitlab-runner:latest
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"

---
# Standard development workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-dev
  namespace: dev
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      priorityClassName: dev-standard  # Default priority
      containers:
      - name: api
        image: myapp/api:dev
        resources:
          requests:
            cpu: "200m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "2Gi"

---
# Ephemeral test workload
apiVersion: batch/v1
kind: Job
metadata:
  name: integration-tests
  namespace: test
spec:
  template:
    metadata:
      labels:
        app: integration-tests
    spec:
      priorityClassName: dev-low  # Can be evicted under pressure
      restartPolicy: OnFailure
      containers:
      - name: tests
        image: myapp/tests:latest
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
```

## Implementing Namespace-Level Overcommit Policies

Use LimitRanges and ResourceQuotas to control overcommitment at the namespace level. This prevents runaway overcommit while allowing controlled density increases.

```yaml
# dev-namespace-policies.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev-team-a

---
# Set default requests lower than typical to enable overcommit
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-defaults
  namespace: dev-team-a
spec:
  limits:
  - default:  # Default limits
      cpu: "1000m"
      memory: "2Gi"
    defaultRequest:  # Default requests (conservative for overcommit)
      cpu: "100m"
      memory: "256Mi"
    max:  # Maximum allowed
      cpu: "4000m"
      memory: "8Gi"
    min:  # Minimum required
      cpu: "10m"
      memory: "64Mi"
    type: Container

  - max:  # Pod-level maximums
      cpu: "8000m"
      memory: "16Gi"
    type: Pod

---
# ResourceQuota allows more requests than physical capacity
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev-team-a
spec:
  hard:
    # Allow 150% overcommit (if cluster has 20 cores, allow 30)
    requests.cpu: "30"
    requests.memory: "60Gi"

    # Limit totals should still respect physical capacity
    limits.cpu: "40"
    limits.memory: "80Gi"

    # Limit pod count to prevent excessive scheduling
    pods: "100"
```

Apply these policies to all development namespaces:

```bash
# Apply to multiple namespaces
for ns in dev-team-a dev-team-b dev-team-c; do
  kubectl create namespace $ns --dry-run=client -o yaml | kubectl apply -f -
  cat dev-namespace-policies.yaml | \
    sed "s/dev-team-a/$ns/g" | \
    kubectl apply -f -
done
```

## Configuring Cluster Autoscaler for Overcommitted Nodes

The cluster autoscaler needs special configuration to work correctly with overcommitted nodes. Without adjustments, it might add nodes unnecessarily based on requested resources rather than actual usage.

```yaml
# cluster-autoscaler-overcommit.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0
        command:
        - ./cluster-autoscaler
        - --cloud-provider=aws
        - --namespace=kube-system
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/dev-cluster

        # Key flags for overcommit
        - --skip-nodes-with-local-storage=false
        - --skip-nodes-with-system-pods=false

        # More aggressive scale-down for overcommitted clusters
        - --scale-down-delay-after-add=5m
        - --scale-down-unneeded-time=5m
        - --scale-down-utilization-threshold=0.4  # Lower threshold

        # Consider actual usage, not just requests
        - --balance-similar-node-groups=true
        - --expander=least-waste

        resources:
          requests:
            cpu: 100m
            memory: 300Mi
          limits:
            cpu: 200m
            memory: 600Mi
```

Apply the autoscaler configuration:

```bash
kubectl apply -f cluster-autoscaler-overcommit.yaml
```

## Implementing Automated Right-Sizing with VPA

Vertical Pod Autoscaler (VPA) automatically adjusts resource requests based on actual usage, which is perfect for overcommitted environments. It prevents over-requesting while ensuring pods have enough resources.

```bash
# Install VPA
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh

# Verify VPA components
kubectl get pods -n kube-system | grep vpa
```

Create VPA resources for development workloads:

```yaml
# vpa-dev-workloads.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-dev-vpa
  namespace: dev
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-dev

  updatePolicy:
    updateMode: "Auto"  # Automatically apply recommendations

  resourcePolicy:
    containerPolicies:
    - containerName: "*"
      minAllowed:  # Minimum resources
        cpu: 50m
        memory: 128Mi
      maxAllowed:  # Maximum resources
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]

      # Use aggressive scaling for dev environments
      mode: Auto
```

Apply VPA to all development deployments:

```bash
kubectl apply -f vpa-dev-workloads.yaml

# Monitor VPA recommendations
kubectl describe vpa api-dev-vpa -n dev

# Check current vs recommended resources
kubectl get vpa -n dev
```

VPA will gradually right-size your workloads, reducing requests to match actual usage and enabling higher overcommit ratios.

## Monitoring Overcommit Health

Track key metrics to ensure overcommitment doesn't degrade developer experience. Watch for eviction rates, scheduling failures, and node resource pressure.

```yaml
# prometheus-overcommit-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: overcommit-health
  namespace: monitoring
spec:
  groups:
  - name: overcommit_metrics
    interval: 1m
    rules:
    # Node overcommit ratio
    - record: node:overcommit_ratio:cpu
      expr: |
        sum by (node) (kube_pod_container_resource_requests{resource="cpu"})
        /
        sum by (node) (kube_node_status_capacity{resource="cpu"})

    - record: node:overcommit_ratio:memory
      expr: |
        sum by (node) (kube_pod_container_resource_requests{resource="memory"})
        /
        sum by (node) (kube_node_status_capacity{resource="memory"})

    # Pod eviction rate
    - record: cluster:pod_evictions:rate5m
      expr: rate(kube_pod_status_reason{reason="Evicted"}[5m])

    # Alert on excessive evictions
    - alert: HighPodEvictionRate
      expr: cluster:pod_evictions:rate5m > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High pod eviction rate detected"
        description: "Pod eviction rate is {{ $value }} pods/sec"
```

Create a Grafana dashboard showing overcommit metrics:

```bash
# Key panels to include:
# - Node overcommit ratios (target: 150-200%)
# - Pod eviction rate over time
# - Scheduling latency (detect pressure)
# - Actual vs requested resource usage
```

## Handling Peak Load Scenarios

Even with overcommit, occasional peak loads can cause resource pressure. Implement safeguards to handle these scenarios gracefully.

```yaml
# peak-load-handling.yaml
# Use PodDisruptionBudgets to limit eviction impact
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-dev-pdb
  namespace: dev
spec:
  minAvailable: 1  # Always keep at least one replica running
  selector:
    matchLabels:
      app: api

---
# Configure horizontal autoscaling as backup
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-dev-hpa
  namespace: dev
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-dev
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale before hitting limits
```

Overcommit strategies can cut dev/test costs in half while maintaining developer productivity. Start conservatively with 125-150% overcommit ratios, monitor eviction rates and scheduling latency, and gradually increase density as you gain confidence. The key is balancing cost savings against occasional resource pressure during peak usage periods.
