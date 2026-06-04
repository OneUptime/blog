# How to Implement Overcommit Strategies for Kubernetes Dev and Test Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Resource Management, Development, Testing

Description: Implement strategic resource overcommitment in Kubernetes development and test environments to maximize cluster density, reduce costs.

---

Development and test environments typically waste massive amounts of resources. Developers request generous resource limits to avoid performance issues, but actual usage remains low most of the time. Pods sit idle during off-hours, lunch breaks, and between test runs. This waste directly translates to inflated cloud bills.

Overcommitment strategies let you safely pack more workloads onto fewer nodes by allowing container limits and admitted workload demand to exceed steady-state physical capacity while keeping requests right-sized for scheduling. This works because not all workloads peak simultaneously. Careful implementation can reduce dev/test infrastructure costs by 50% or more while maintaining acceptable performance for development workflows.

## Understanding Overcommit Concepts

Kubernetes resource management involves three key values: requests, limits, and actual usage. Requests represent resources reserved for scheduling decisions. Limits define the maximum resources a container can consume. Actual usage typically falls far below both requests and limits in non-production environments.

Overcommitment means allowing more potential resource consumption than steady-state physical capacity, usually by setting limits higher than requests and using quotas that admit burst capacity. The default scheduler does not over-subscribe node allocatable based on requests. If you have a 16-core node and schedule workloads with 12 cores of requests but 24 cores of CPU limits, you've allowed a 150% CPU burst ratio against node capacity. This works safely when actual combined usage stays below physical capacity.

The kubelet's eviction manager handles resource pressure by evicting pods when actual usage crosses eviction thresholds. Proper configuration of eviction thresholds and pod priorities helps critical workloads survive while less important pods get evicted first.

## Configuring Kubelet for Controlled Overcommit

Start by adjusting kubelet configuration to protect node stability with system reserves and eviction thresholds. These settings apply per node and define how the kubelet responds when actual usage creates resource pressure.

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

    # Reserve resources for OS and node daemons
    systemReserved:
      cpu: 100m
      memory: 512Mi

    # Adjust eviction thresholds for higher density while leaving headroom
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
  "apiVersion": "kubelet.config.k8s.io/v1beta1",
  "kind": "KubeletConfiguration",
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

Priority classes help determine which pods get evicted first during resource pressure. Create a hierarchy that gives critical development infrastructure a better chance of surviving pressure while allowing aggressive overcommit of ephemeral workloads.

```yaml
# priority-classes-dev.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: dev-critical
value: 1000000
globalDefault: false
description: "Critical dev infrastructure that should be evicted last"

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
      priorityClassName: dev-critical  # Higher priority during node-pressure eviction
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
# ResourceQuota controls admitted demand while limits allow burst capacity
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev-team-a
spec:
  hard:
    # Keep total requests within the namespace's expected schedulable share
    requests.cpu: "20"
    requests.memory: "40Gi"

    # Allow burst capacity above requests for dev/test workloads
    limits.cpu: "30"
    limits.memory: "60Gi"

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

The cluster autoscaler works from pod scheduling requirements and request-based node utilization, so overcommitted clusters depend on accurate, conservative requests. Without right-sized requests, it might add nodes unnecessarily or keep nodes that look busy by request even when actual usage is low.

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
        image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.36.0  # Match your Kubernetes minor version
        command:
        - ./cluster-autoscaler
        - --cloud-provider=aws
        - --namespace=kube-system
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/dev-cluster

        # Key flags for overcommit
        - --skip-nodes-with-local-storage=false
        - --skip-nodes-with-system-pods=false

        # More aggressive scale-down for dev/test clusters
        - --scale-down-delay-after-add=5m
        - --scale-down-unneeded-time=5m
        - --scale-down-utilization-threshold=0.4  # Lower threshold

        # Improve node group selection and balancing
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
    updateMode: "Recreate"  # Automatically apply recommendations by recreating pods

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

      # Let VPA manage this container's CPU and memory recommendations
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

VPA will gradually right-size your workloads, reducing requests to match actual usage and enabling higher overcommit ratios. For current VPA releases, use explicit update modes such as `Recreate` or `InPlaceOrRecreate` instead of the deprecated `Auto` update mode.

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
    # Node burst ratio from limits
    - record: node:limit_ratio:cpu
      expr: |
        sum by (node) (kube_pod_container_resource_limits{resource="cpu"})
        /
        sum by (node) (kube_node_status_capacity{resource="cpu"})

    - record: node:limit_ratio:memory
      expr: |
        sum by (node) (kube_pod_container_resource_limits{resource="memory"})
        /
        sum by (node) (kube_node_status_capacity{resource="memory"})

    # Currently evicted pods
    - record: cluster:pod_evictions:current
      expr: sum(kube_pod_status_reason{reason="Evicted"})

    # Alert on excessive evictions
    - alert: HighPodEvictionCount
      expr: cluster:pod_evictions:current > 5
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High pod eviction count detected"
        description: "{{ $value }} pods are currently reported as evicted"
```

Create a Grafana dashboard showing overcommit metrics:

```bash
# Key panels to include:
# - Node limit ratios (target: 150-200% for burstable dev/test workloads)
# - Pod eviction count over time
# - Scheduling latency (detect pressure)
# - Actual vs requested resource usage
```

## Handling Peak Load Scenarios

Even with overcommit, occasional peak loads can cause resource pressure. Implement safeguards to reduce voluntary disruption and scale workloads before they saturate nodes.

```yaml
# peak-load-handling.yaml
# Use PodDisruptionBudgets to limit voluntary disruption impact
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-dev-pdb
  namespace: dev
spec:
  minAvailable: 1  # Keep at least one replica during voluntary disruptions
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
