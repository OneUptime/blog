# How to Configure Scheduler Score Plugins for Custom Prioritization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Customization

Description: Master Kubernetes scheduler score plugins to create custom pod placement prioritization strategies by configuring weights, enabling/disabling plugins, and implementing sophisticated scoring logic.

---

The Kubernetes scheduler doesn't just find nodes that can run a pod. It ranks all suitable nodes and picks the best one. This ranking happens through score plugins, each evaluating nodes based on different criteria.

Understanding score plugins lets you fine-tune how the scheduler prioritizes nodes. Want to prefer nodes with cached images? Favor even resource distribution? Pack pods tightly for cost savings? Score plugins make it happen.

## How Scoring Works

After filtering nodes that meet pod requirements, the scheduler runs score plugins. Each plugin gives every node a score from 0 to 100. The scheduler combines these scores using weights, and the node with the highest total score wins.

Here's a simple example:

- **NodeResourcesFit**: Scores based on available resources (weight: 1)
- **ImageLocality**: Scores based on cached images (weight: 2)
- **NodeResourcesBalancedAllocation**: Scores based on balanced CPU/memory usage (weight: 1)

If Node A gets scores [80, 60, 40] and Node B gets [70, 90, 50], the weighted totals are:

- Node A: 80\*1 + 60\*2 + 40\*1 = 240
- Node B: 70\*1 + 90\*2 + 50\*1 = 290

Node B wins.

## Built-in Score Plugins

Kubernetes includes several score plugins:

- **NodeResourcesFit**: Scores based on resource availability
- **NodeResourcesBalancedAllocation**: Prefers nodes with balanced resource usage
- **ImageLocality**: Prefers nodes that already have required images
- **InterPodAffinity**: Scores based on pod affinity/anti-affinity rules
- **PodTopologySpread**: Scores based on topology spread constraints
- **TaintToleration**: Scores based on taints and tolerations
- **NodeAffinity**: Scores based on node affinity rules
- **NodePreferAvoidPods**: Avoids nodes with certain annotations

## Basic Configuration

Configure score plugins in the scheduler config:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 1
      - name: ImageLocality
        weight: 1
      - name: NodeResourcesBalancedAllocation
        weight: 1
```

These are the defaults. Now let's customize them.

## Prioritizing Resource Availability

To strongly prefer nodes with more free resources:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: resource-aware-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 10  # Very important
      - name: ImageLocality
        weight: 1
      - name: NodeResourcesBalancedAllocation
        weight: 2
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

Deploy this scheduler:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-aware-scheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      component: scheduler
  template:
    metadata:
      labels:
        component: scheduler
    spec:
      serviceAccountName: resource-aware-scheduler
      containers:
      - name: scheduler
        image: registry.k8s.io/kube-scheduler:v1.28.0
        command:
        - kube-scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
      volumes:
      - name: config
        configMap:
          name: resource-aware-scheduler-config
```

Create the necessary RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: resource-aware-scheduler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: resource-aware-scheduler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-scheduler
subjects:
- kind: ServiceAccount
  name: resource-aware-scheduler
  namespace: kube-system
```

## Prioritizing Image Locality

To minimize image pull time by preferring nodes with cached images:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: image-locality-scheduler
  plugins:
    score:
      enabled:
      - name: ImageLocality
        weight: 10  # Heavily prefer nodes with images
      - name: NodeResourcesFit
        weight: 1
      - name: NodeResourcesBalancedAllocation
        weight: 1
```

This is useful for clusters with large images or slow registries:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-service
spec:
  replicas: 10
  selector:
    matchLabels:
      app: ml
  template:
    metadata:
      labels:
        app: ml
    spec:
      schedulerName: image-locality-scheduler
      containers:
      - name: model
        image: myregistry.com/ml-model:v2  # Large 5GB image
        resources:
          requests:
            cpu: 1000m
            memory: 4Gi
```

After the first few pods pull the image, subsequent pods will be scheduled on those nodes, avoiding redundant pulls.

## Prioritizing Even Distribution

To spread load evenly across nodes:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: balanced-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesBalancedAllocation
        weight: 10  # Strongly prefer balanced allocation
      - name: NodeResourcesFit
        weight: 1
      - name: ImageLocality
        weight: 1
```

This prevents hotspots where some nodes are heavily utilized while others are idle:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
spec:
  replicas: 20
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      schedulerName: balanced-scheduler
      containers:
      - name: nginx
        image: nginx:1.21
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
```

## Disabling Plugins

Sometimes you want to disable plugins entirely:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: simple-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 1
      disabled:
      - name: ImageLocality  # Don't consider image locality
      - name: InterPodAffinity  # Don't consider pod affinity (expensive)
```

Disabling expensive plugins like InterPodAffinity can significantly improve scheduling performance in large clusters.

## Combining Multiple Priorities

Create sophisticated strategies by combining plugins with different weights:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: production-scheduler
  plugins:
    score:
      enabled:
      # Primary: ensure resources available
      - name: NodeResourcesFit
        weight: 5
      # Secondary: balance across zones
      - name: PodTopologySpread
        weight: 3
      # Tertiary: avoid image pulls
      - name: ImageLocality
        weight: 2
      # Quaternary: balance node resources
      - name: NodeResourcesBalancedAllocation
        weight: 1
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 2  # Memory more important than CPU
  - name: PodTopologySpread
    args:
      defaultConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
```

This creates a hierarchy: first ensure resources, then spread across zones, then prefer cached images, then balance node usage.

## Custom Scoring for GPU Workloads

Optimize for GPU placement:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: gpu-scheduler
  plugins:
    score:
      enabled:
      # Most important: GPU availability
      - name: NodeResourcesFit
        weight: 10
      # Also important: spread across zones
      - name: PodTopologySpread
        weight: 3
      # Less important: image locality
      - name: ImageLocality
        weight: 1
      # Disable irrelevant plugins
      disabled:
      - name: NodeResourcesBalancedAllocation
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: nvidia.com/gpu
          weight: 10  # GPU is critical
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

Use for GPU workloads:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: training-job
spec:
  template:
    spec:
      schedulerName: gpu-scheduler
      containers:
      - name: training
        image: ml/training:v3
        resources:
          limits:
            nvidia.com/gpu: 2
      restartPolicy: Never
```

## Cost-Optimized Scoring

For cloud environments where you pay per node, optimize for bin-packing:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: cost-optimizer
  plugins:
    score:
      enabled:
      # Pack tightly to minimize node count
      - name: NodeResourcesFit
        weight: 10
      # Image locality helps reduce pulls (saves time/bandwidth)
      - name: ImageLocality
        weight: 2
      # Disable spreading
      disabled:
      - name: NodeResourcesBalancedAllocation
      - name: PodTopologySpread
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: MostAllocated  # Pack pods tightly
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

## Monitoring Score Plugin Performance

Track how score plugins affect scheduling:

```bash
# View scheduler metrics
kubectl get --raw /metrics | grep scheduler_framework_extension_point_duration_seconds

# Filter for score plugins
kubectl get --raw /metrics | \
  grep scheduler_framework_extension_point_duration_seconds | \
  grep score

# Check which plugins take the most time
kubectl get --raw /metrics | \
  grep scheduler_framework_extension_point_duration_seconds | \
  sort -t= -k2 -nr | head -20
```

If a plugin is slow, consider reducing its weight or disabling it.

## Testing Score Plugin Configurations

Validate your configuration before deploying:

```bash
# Create test pods with different characteristics
kubectl run test-cpu-heavy --image=nginx --restart=Never \
  --requests=cpu=2000m,memory=512Mi \
  --overrides='{"spec":{"schedulerName":"production-scheduler"}}'

kubectl run test-memory-heavy --image=nginx --restart=Never \
  --requests=cpu=100m,memory=4Gi \
  --overrides='{"spec":{"schedulerName":"production-scheduler"}}'

kubectl run test-balanced --image=nginx --restart=Never \
  --requests=cpu=1000m,memory=1Gi \
  --overrides='{"spec":{"schedulerName":"production-scheduler"}}'

# Check where they landed
kubectl get pods -o wide | grep test-

# Verify they landed on appropriate nodes
kubectl describe node <node-name> | grep -A 5 "Allocated resources"
```

## Debugging Score Plugin Issues

When pods land on unexpected nodes:

```bash
# Enable verbose scheduler logging
kubectl edit deployment kube-scheduler -n kube-system
# Add: --v=4 to command args

# View detailed scoring
kubectl logs -n kube-system -l component=kube-scheduler | \
  grep "Prioritizing" -A 20

# Look for lines like:
# "node score: Node1=200, Node2=150, Node3=175"

# Check specific plugin scores
kubectl logs -n kube-system -l component=kube-scheduler | \
  grep "NodeResourcesFit score" | tail -20
```

## Best Practices

Follow these guidelines for effective score plugin configuration:

1. **Start with defaults**: Only customize when you have specific requirements.
2. **Test thoroughly**: Validate configurations in non-production environments first.
3. **Monitor performance**: Track scheduling latency and plugin execution time.
4. **Document decisions**: Explain why certain weights are chosen.
5. **Keep it simple**: Don't over-complicate with too many weighted plugins.
6. **Consider workload types**: Use different schedulers for different workload patterns.
7. **Review regularly**: Reassess configuration as cluster usage evolves.

## Advanced: Multiple Scheduler Profiles

Run multiple scoring strategies in one scheduler:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
# For services: spread and balance
- schedulerName: service-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesBalancedAllocation
        weight: 5
      - name: PodTopologySpread
        weight: 3
      - name: NodeResourcesFit
        weight: 1

# For batch: pack tightly
- schedulerName: batch-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 10
      disabled:
      - name: NodeResourcesBalancedAllocation
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: MostAllocated

# For ML: optimize for GPU
- schedulerName: ml-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 10
      - name: ImageLocality
        weight: 3
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: nvidia.com/gpu
          weight: 10
        - name: cpu
          weight: 1
```

This single scheduler process handles three different scoring strategies, each optimized for a specific workload type.

Score plugins give you powerful control over pod placement. By understanding how they work and configuring them appropriately, you can optimize your cluster for cost, performance, reliability, or any combination of these goals.
