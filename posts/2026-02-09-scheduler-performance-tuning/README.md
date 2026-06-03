# How to Implement Scheduler Performance Tuning for Large Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Performance

Description: Optimize Kubernetes scheduler performance for large clusters with hundreds of nodes and thousands of pods through configuration tuning, caching strategies, and parallel scheduling techniques.

---

As your Kubernetes cluster grows, the scheduler can become a bottleneck. When you have hundreds of nodes and thousands of pods, scheduling decisions that took milliseconds now take seconds. Pods pile up in pending state, and deployment rollouts slow to a crawl.

Scheduler performance tuning becomes critical at scale. The good news is that the Kubernetes scheduler has many knobs you can turn to optimize for your specific workload patterns and cluster size.

## Understanding Scheduler Performance

The scheduler goes through several phases for each pod:

1. **Filter phase**: Eliminate nodes that don't meet requirements
2. **Score phase**: Rank remaining nodes based on various factors
3. **Bind phase**: Actually assign the pod to the chosen node

Each phase has a cost. With 1000 nodes and 100 pending pods, the scheduler potentially evaluates 100,000 node-pod combinations. That's a lot of work.

## Measuring Current Performance

Before tuning, establish baselines. Check current scheduling latency:

```bash
# View scheduler metrics. If your cluster exposes kube-scheduler through a Service:

kubectl get --raw /api/v1/namespaces/kube-system/services/https:kube-scheduler:/proxy/metrics | grep scheduler_

# Key metrics to watch:
# scheduler_pending_pods - pods waiting to be scheduled
# scheduler_schedule_attempts_total - total scheduling attempts
# scheduler_scheduling_attempt_duration_seconds - time for scheduling attempts
# scheduler_framework_extension_point_duration_seconds - plugin execution time
```

Create a simple test to measure scheduling performance:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: scheduler-perf-test
spec:
  parallelism: 100
  completions: 100
  template:
    metadata:
      labels:
        test: scheduler-perf
    spec:
      containers:
      - name: sleep
        image: busybox
        command: ["sleep", "3600"]
        resources:
          requests:
            cpu: 10m
            memory: 16Mi
      restartPolicy: Never
```

Time how long it takes for all 100 pods to be scheduled:

```bash
# Create the job
kubectl apply -f scheduler-perf-test.yaml

# Watch scheduling progress
time kubectl wait --for=condition=Ready pod -l test=scheduler-perf --timeout=300s

# Check actual scheduling times
kubectl get events --sort-by='.lastTimestamp' | grep Scheduled | tail -20
```

## Tuning Scheduler Configuration

The scheduler configuration file lets you control many performance aspects. Create an optimized configuration:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
# Control how many feasible nodes to find before scoring
percentageOfNodesToScore: 30  # Use 0 for the cluster-size-based default
# Control parallelism inside scheduling algorithms
parallelism: 16
profiles:
- schedulerName: default-scheduler
  plugins:
    multiPoint:
      disabled:
      - name: InterPodAffinity  # Expensive at scale
    # Optimize score plugins with weights
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 1
      - name: ImageLocality
        weight: 1
      - name: NodeResourcesBalancedAllocation
        weight: 1
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated  # Default strategy; favors nodes with more free resources
```

Apply this configuration by updating the scheduler:

```bash
# Create ConfigMap with optimized configuration
kubectl create configmap scheduler-config \
  -n kube-system \
  --from-file=scheduler-config.yaml \
  --dry-run=client -o yaml | kubectl apply -f -

# For clusters where kube-scheduler is a Deployment, mount the ConfigMap
# at /etc/kubernetes/scheduler-config.yaml and add:
# --config=/etc/kubernetes/scheduler-config.yaml
kubectl edit deployment kube-scheduler -n kube-system

# For kubeadm clusters, kube-scheduler is usually a static Pod. Put the
# file on the control-plane node and update /etc/kubernetes/manifests/kube-scheduler.yaml.
```

## Reducing Nodes to Score

The most impactful optimization is limiting how many feasible nodes the scheduler finds before scoring. By default, Kubernetes calculates this percentage from cluster size: about 50% for a 100-node cluster, about 10% for a 5000-node cluster, with a 5% lower bound for the automatic value.

Reduce this percentage based on your cluster size:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
# For clusters with 100-500 nodes
percentageOfNodesToScore: 40

# For clusters with 500-1000 nodes
# percentageOfNodesToScore: 30

# For clusters with 1000+ nodes
# percentageOfNodesToScore: 20
```

The scheduler does not necessarily filter every node. It stops looking for more feasible nodes once it has found enough nodes for the configured percentage, then scores those feasible nodes. Lower values can improve latency, but avoid values below 10% unless scheduling throughput matters more than placement quality.

## Optimizing Inter-Pod Affinity

Inter-pod affinity is expensive because it requires examining all pods on each node. If you use it, optimize the topology key:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
spec:
  replicas: 10
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
    spec:
      affinity:
        podAffinity:
          # Use zone-level topology, not node-level
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: web
              # Zone-level is much faster than hostname-level
              topologyKey: topology.kubernetes.io/zone
      containers:
      - name: redis
        image: redis:6.2
```

Zone-level topology reduces the number of topology domains the scheduler has to compare for this preference. It can be much cheaper than hostname-level affinity in large clusters, although the scheduler still has to process the relevant pods and nodes.

If you don't need inter-pod affinity, disable the plugin entirely:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  plugins:
    multiPoint:
      disabled:
      - name: InterPodAffinity
```

## Caching and Node Updates

The scheduler caches node information to avoid repeated API calls. Most cache behavior is internal, but your scoring configuration still affects how much work the scheduler does with cached node information:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
# Cache settings (not directly exposed, but understanding helps)
profiles:
- schedulerName: default-scheduler
  pluginConfig:
  - name: NodeResourcesFit
    args:
      # Use cached node info efficiently
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

Monitor scheduler cache size and event handling:

```bash
# Check scheduler metrics
kubectl get --raw /api/v1/namespaces/kube-system/services/https:kube-scheduler:/proxy/metrics | grep scheduler_cache

# Look for:
# scheduler_cache_size - number of nodes, pods, and assumed pods in the scheduler cache
# scheduler_event_handling_duration_seconds - event handling latency
```

## Parallel Scheduling

Run multiple scheduler replicas for high availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube-scheduler
  namespace: kube-system
spec:
  replicas: 3  # Run 3 scheduler instances
  selector:
    matchLabels:
      component: kube-scheduler
  template:
    metadata:
      labels:
        component: kube-scheduler
    spec:
      containers:
      - name: kube-scheduler
        image: registry.k8s.io/kube-scheduler:v1.28.0
        command:
        - kube-scheduler
        - --leader-elect=true  # Only one is active
        - --config=/etc/kubernetes/scheduler-config.yaml
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

With leader election, only one scheduler replica is active at a time, so this does not increase scheduling throughput. It improves availability because another replica can take over after the leader lease expires.

## Optimizing for Batch Workloads

If you run many batch jobs, optimize for high pod creation rates:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
- schedulerName: batch-scheduler
  plugins:
    # Simple scoring
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 1
      disabled:
      - name: NodeResourcesBalancedAllocation
      - name: InterPodAffinity
      - name: PodTopologySpread
      - name: ImageLocality
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: MostAllocated  # Bin-packing for batch
```

Use this scheduler for batch jobs:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  parallelism: 100
  template:
    spec:
      schedulerName: batch-scheduler
      containers:
      - name: processor
        image: myapp/processor:v1
      restartPolicy: Never
```

## Node Indexing and Filtering

Node labels are central to filtering. Ensure nodes have consistent labels:

```bash
# Label nodes systematically
kubectl label nodes node-1 node-2 node-3 \
  workload-type=general \
  topology.kubernetes.io/zone=us-east-1a

# Avoid one-off labels that make placement rules hard to reason about
# Bad: node-color=blue, node-color=green, node-color=red (too many values)
# Good: node-role=worker, node-role=gpu (few distinct values)
```

Use label selectors efficiently:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  nodeSelector:
    # Good: uses consistent labels
    workload-type: general
    topology.kubernetes.io/zone: us-east-1a
  containers:
  - name: app
    image: myapp:latest
```

## Monitoring and Alerting

Set up monitoring to catch scheduler performance issues:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: scheduler-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: scheduler
      interval: 30s
      rules:
      # Alert on high pending pods
      - alert: HighPendingPods
        expr: sum(scheduler_pending_pods) > 100
        for: 5m
        annotations:
          summary: "High number of pending pods"

      # Alert on slow scheduling
      - alert: SlowScheduling
        expr: histogram_quantile(0.99, scheduler_scheduling_attempt_duration_seconds_bucket) > 1
        for: 5m
        annotations:
          summary: "99th percentile scheduling latency above 1 second"

      # Alert on scheduling failures
      - alert: SchedulingFailures
        expr: rate(scheduler_schedule_attempts_total{result="error"}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High rate of scheduling failures"
```

## Debugging Slow Scheduling

When scheduling is slow, use these techniques to diagnose:

```bash
# Check which pods are pending
kubectl get pods --field-selector=status.phase=Pending -A

# Get detailed pod events
kubectl describe pod <pending-pod> | grep -A 20 Events

# Enable scheduler debug logging temporarily
kubectl edit deployment kube-scheduler -n kube-system
# Or edit /etc/kubernetes/manifests/kube-scheduler.yaml for static Pod deployments.
# Add: --v=4 to command args

# View detailed scheduler logs
kubectl logs -n kube-system -l component=kube-scheduler --tail=1000 | \
  grep "attempted to schedule"

# Check plugin execution time
kubectl get --raw /api/v1/namespaces/kube-system/services/https:kube-scheduler:/proxy/metrics | \
  grep scheduler_plugin_execution_duration_seconds | \
  sort -t= -k2 -nr | head -20
```

## Hardware Considerations

The scheduler is CPU-bound. Give it adequate resources:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube-scheduler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: kube-scheduler
        resources:
          requests:
            # For clusters with 500+ nodes
            cpu: 500m
            memory: 512Mi
          limits:
            # Allow bursting for scheduling storms
            cpu: 2000m
            memory: 1Gi
```

Run the scheduler on nodes with adequate CPU. The scheduler uses configurable parallelism inside scheduling algorithms, so both CPU capacity and per-core performance matter during scheduling spikes.

## Best Practices

Follow these guidelines for optimal scheduler performance:

1. **Start conservative**: Begin with default settings and tune based on metrics.
2. **Monitor continuously**: Track scheduling latency and pending pods.
3. **Test changes**: Use canary schedulers to validate configuration changes.
4. **Reduce complexity**: Disable plugins you don't need.
5. **Optimize workloads**: Reduce use of expensive features like inter-pod affinity.
6. **Scale horizontally**: Consider multiple schedulers for different workload types.
7. **Regular reviews**: Revisit configuration as cluster size and patterns change.

Scheduler performance tuning is an ongoing process. As your cluster evolves, so should your scheduler configuration. The key is measuring, tuning, and validating that changes actually improve performance in your specific environment.
