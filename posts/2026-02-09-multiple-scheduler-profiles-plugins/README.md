# How to Configure Multiple Scheduler Profiles with Different Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Configuration

Description: Learn how to configure multiple scheduler profiles within a single kube-scheduler instance to handle different workload types with specialized scheduling policies.

---

Running separate scheduler instances for different workload types creates operational overhead and resource waste. Kubernetes scheduler profiles allow you to configure multiple scheduling policies within a single scheduler deployment, each with its own set of plugins and configurations. This approach provides flexibility without the complexity of managing multiple schedulers.

This guide will show you how to configure and use multiple scheduler profiles to handle diverse workload requirements efficiently.

## Understanding Scheduler Profiles

Scheduler profiles let you define multiple named configurations within kube-scheduler. Each profile can enable different plugins, configure plugin weights, and implement distinct scheduling behaviors. Pods select profiles using the `schedulerName` field, while a single scheduler process handles all profiles.

Profiles share the same filtering and scoring framework but configure plugins differently. This reduces resource consumption compared to running separate scheduler instances while maintaining scheduling flexibility.

## Configuring the Default Profile

Start by understanding the default profile configuration:

```yaml
# scheduler-config.yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  plugins:
    queueSort:
      enabled:
      - name: PrioritySort
    preFilter:
      enabled:
      - name: NodeResourcesFit
      - name: NodePorts
      - name: PodTopologySpread
      - name: InterPodAffinity
      - name: VolumeBinding
    filter:
      enabled:
      - name: NodeUnschedulable
      - name: NodeName
      - name: TaintToleration
      - name: NodeAffinity
      - name: NodePorts
      - name: NodeResourcesFit
      - name: VolumeBinding
      - name: PodTopologySpread
      - name: InterPodAffinity
    postFilter:
      enabled:
      - name: DefaultPreemption
    preScore:
      enabled:
      - name: InterPodAffinity
      - name: PodTopologySpread
      - name: TaintToleration
    score:
      enabled:
      - name: NodeResourcesBalancedAllocation
        weight: 1
      - name: ImageLocality
        weight: 1
      - name: InterPodAffinity
        weight: 1
      - name: NodeAffinity
        weight: 1
      - name: PodTopologySpread
        weight: 2
    reserve:
      enabled:
      - name: VolumeBinding
    preBind:
      enabled:
      - name: VolumeBinding
    bind:
      enabled:
      - name: DefaultBinder
```

This represents the standard scheduling behavior that works for most workloads.

## Creating a High-Performance Profile

Define a profile optimized for latency-sensitive workloads:

```yaml
# scheduler-config.yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  # ... default configuration ...

- schedulerName: high-performance-scheduler
  plugins:
    queueSort:
      enabled:
      - name: PrioritySort
    filter:
      enabled:
      - name: NodeUnschedulable
      - name: NodeName
      - name: TaintToleration
      - name: NodeAffinity
      - name: NodeResourcesFit
    score:
      enabled:
      # Prioritize nodes with most available resources
      - name: NodeResourcesBalancedAllocation
        weight: 5
      # Prefer nodes with images already present
      - name: ImageLocality
        weight: 3
      # Spread across zones for high availability
      - name: PodTopologySpread
        weight: 4
    bind:
      enabled:
      - name: DefaultBinder
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: MostAllocated  # Pack pods tightly for performance
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

This profile emphasizes resource availability and reduces scheduling overhead by disabling unnecessary plugins.

## Creating a Cost-Optimization Profile

Configure a profile that packs pods densely to minimize infrastructure costs:

```yaml
- schedulerName: cost-optimizer-scheduler
  plugins:
    filter:
      enabled:
      - name: NodeUnschedulable
      - name: NodeName
      - name: TaintToleration
      - name: NodeAffinity
      - name: NodeResourcesFit
    score:
      enabled:
      # Bin packing: prefer nodes with least available resources
      - name: NodeResourcesFit
        weight: 10
      # Minimize spread to keep nodes fully utilized
      - name: PodTopologySpread
        weight: 1
    bind:
      enabled:
      - name: DefaultBinder
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: MostAllocated  # Bin packing strategy
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
  - name: PodTopologySpread
    args:
      defaultConstraints:
      - maxSkew: 5  # Allow more skew for better packing
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
```

This profile maximizes node utilization to reduce the number of active nodes.

## Creating a GPU Workload Profile

Optimize scheduling for GPU-intensive workloads:

```yaml
- schedulerName: gpu-scheduler
  plugins:
    filter:
      enabled:
      - name: NodeUnschedulable
      - name: NodeName
      - name: TaintToleration
      - name: NodeAffinity
      - name: NodeResourcesFit
      # Add custom GPU filter plugin if available
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 5
      - name: NodeAffinity
        weight: 3
    bind:
      enabled:
      - name: DefaultBinder
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: nvidia.com/gpu
          weight: 10  # Heavily weight GPU availability
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
  - name: NodeAffinity
    args:
      addedAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: accelerator
              operator: In
              values:
              - nvidia-tesla-v100
              - nvidia-tesla-a100
```

This ensures GPU pods land on appropriate hardware with available GPU resources.

## Creating a Batch Processing Profile

Configure a profile for batch workloads that can tolerate longer scheduling times:

```yaml
- schedulerName: batch-scheduler
  plugins:
    queueSort:
      enabled:
      - name: PrioritySort
    filter:
      enabled:
      - name: NodeUnschedulable
      - name: NodeName
      - name: TaintToleration
      - name: NodeAffinity
      - name: NodeResourcesFit
      - name: PodTopologySpread
    score:
      enabled:
      # Balance resources across nodes
      - name: NodeResourcesBalancedAllocation
        weight: 3
      # Spread across failure domains
      - name: PodTopologySpread
        weight: 5
      # Consider node affinity but with lower weight
      - name: NodeAffinity
        weight: 2
    bind:
      enabled:
      - name: DefaultBinder
  pluginConfig:
  - name: PodTopologySpread
    args:
      defaultConstraints:
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
```

## Deploying the Multi-Profile Configuration

Create a ConfigMap with your scheduler configuration:

```bash
kubectl create configmap scheduler-config \
  --from-file=scheduler-config.yaml \
  -n kube-system
```

Update the kube-scheduler deployment to use the configuration:

```yaml
# scheduler-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube-scheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      component: kube-scheduler
  template:
    metadata:
      labels:
        component: kube-scheduler
    spec:
      serviceAccountName: kube-scheduler
      containers:
      - name: kube-scheduler
        image: registry.k8s.io/kube-scheduler:v1.28.0
        command:
        - kube-scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
        - --authentication-kubeconfig=/etc/kubernetes/scheduler.conf
        - --authorization-kubeconfig=/etc/kubernetes/scheduler.conf
        - --bind-address=0.0.0.0
        - --leader-elect=true
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: scheduler-config
```

## Using Different Profiles

Deploy pods with specific scheduler profiles:

```yaml
# high-perf-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: latency-sensitive-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: latency-app
  template:
    metadata:
      labels:
        app: latency-app
    spec:
      schedulerName: high-performance-scheduler
      containers:
      - name: app
        image: myapp:latest
        resources:
          requests:
            cpu: "2"
            memory: 4Gi
---
# cost-optimized-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  replicas: 10
  selector:
    matchLabels:
      app: batch
  template:
    metadata:
      labels:
        app: batch
    spec:
      schedulerName: cost-optimizer-scheduler
      containers:
      - name: processor
        image: batch-processor:latest
```

## Monitoring Profile Performance

Check which scheduler profile handled each pod:

```bash
# View scheduler events
kubectl get events --all-namespaces --field-selector reason=Scheduled

# Check pod scheduling details
kubectl describe pod POD_NAME | grep -A5 Events

# View scheduler logs for specific profile
kubectl logs -n kube-system kube-scheduler-xxx | grep "high-performance-scheduler"
```

Export metrics to track profile usage:

```yaml
# Add metrics server configuration
apiVersion: v1
kind: Service
metadata:
  name: kube-scheduler-metrics
  namespace: kube-system
spec:
  selector:
    component: kube-scheduler
  ports:
  - port: 10259
    name: metrics
```

Query scheduler metrics:

```bash
# Get scheduling attempts by profile
curl -s http://kube-scheduler-metrics:10259/metrics | \
  grep scheduler_scheduling_attempts_total

# Check scheduling latency by profile
curl -s http://kube-scheduler-metrics:10259/metrics | \
  grep scheduler_scheduling_duration_seconds
```

## Best Practices

Start with two or three well-defined profiles rather than creating many specialized ones. Common patterns include default, high-performance, and cost-optimized profiles. Test profile configurations in non-production environments before deploying.

Document which workloads should use each profile and create admission webhooks to automatically assign profiles based on pod labels or namespaces. Monitor scheduling performance metrics to ensure profiles achieve their intended goals.

Avoid over-complicating plugin configurations. Simpler profiles are easier to understand and debug. Review and update profiles as workload requirements evolve.

## Conclusion

Multiple scheduler profiles provide flexible scheduling policies without operational overhead of separate schedulers. By configuring profiles for different workload types, you can optimize for performance, cost, or specific hardware requirements while maintaining a single scheduler deployment.

Start with a few well-tested profiles and expand as needed. Use clear naming conventions and document the intended use case for each profile. Monitor scheduling decisions to verify profiles behave as expected and adjust configurations based on real-world performance.
