# How to Configure Scheduler Profiles for Different Workload Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Performance, Best Practices

Description: Learn how to configure Kubernetes scheduler profiles to optimize pod placement for different workload types including batch jobs, latency-sensitive apps, and high-throughput services.

---

Kubernetes scheduler profiles allow you to configure different scheduling behaviors for different workload types. Instead of using a single scheduling configuration for all pods, you can define multiple profiles that optimize placement decisions based on specific workload characteristics.

This capability is particularly valuable in multi-tenant clusters where batch jobs, real-time applications, and background tasks need different scheduling strategies. Understanding how to configure scheduler profiles helps you optimize resource utilization, reduce latency, and improve overall cluster performance.

## Understanding Scheduler Profiles

Scheduler profiles are named configurations within the Kubernetes scheduler that define how pods are evaluated and placed. Each profile contains a set of plugins that implement specific scheduling logic during different phases of the scheduling cycle.

The scheduler processes pods through several stages. First, it filters out nodes that cannot run the pod. Then it scores the remaining nodes based on various criteria. Finally, it selects the highest-scoring node for placement. Scheduler profiles let you customize which plugins run during these stages and how they behave.

When you configure multiple profiles, pods can request specific profiles using the `schedulerName` field in their spec. This gives workload authors control over how their pods are scheduled without requiring cluster-wide configuration changes.

## Default Scheduler Profile Structure

The default scheduler profile includes plugins for common scheduling concerns. Here is what a basic profile configuration looks like:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: default-scheduler
    plugins:
      # Filter plugins run first to eliminate unsuitable nodes
      filter:
        enabled:
          - name: NodeResourcesFit
          - name: NodePorts
          - name: PodTopologySpread
          - name: InterPodAffinity
          - name: VolumeBinding
      # Score plugins evaluate remaining nodes
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
```

This configuration shows the two main plugin phases. Filter plugins eliminate nodes that cannot satisfy pod requirements. Score plugins assign numeric values to remaining nodes, and the scheduler picks the node with the highest total score.

## Creating a Profile for Batch Jobs

Batch jobs have different requirements than interactive applications. They typically need maximum resource availability and can tolerate less predictable scheduling latency. Here is a profile optimized for batch workloads:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: batch-scheduler
    plugins:
      filter:
        enabled:
          - name: NodeResourcesFit
          - name: PodTopologySpread
      score:
        enabled:
          # Prioritize nodes with most available resources
          - name: NodeResourcesMostAllocated
            weight: 5
          # Deprioritize spread concerns
          - name: PodTopologySpread
            weight: 1
        disabled:
          # Disable balanced allocation for batch jobs
          - name: NodeResourcesBalancedAllocation
      # Allow longer scheduling cycles
      preempt:
        enabled:
          - name: DefaultPreemption
```

This profile uses `NodeResourcesMostAllocated` instead of `NodeResourcesBalancedAllocation`. This plugin prefers nodes that already have high resource utilization, which helps with bin-packing and leaves larger nodes free for jobs that need them.

To use this profile, set the scheduler name in your batch job spec:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  template:
    spec:
      schedulerName: batch-scheduler
      containers:
      - name: processor
        image: data-processor:latest
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
```

## Creating a Profile for Latency-Sensitive Workloads

Applications that serve user traffic need consistent, low-latency scheduling. They benefit from being spread across failure domains and having resources readily available. Here is a profile for these workloads:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: latency-sensitive-scheduler
    plugins:
      filter:
        enabled:
          - name: NodeResourcesFit
          - name: PodTopologySpread
          - name: InterPodAffinity
      score:
        enabled:
          # Ensure even distribution
          - name: NodeResourcesBalancedAllocation
            weight: 3
          # Strong preference for spreading
          - name: PodTopologySpread
            weight: 5
          # Consider pod affinity/anti-affinity strongly
          - name: InterPodAffinity
            weight: 3
          # Prefer nodes with images already pulled
          - name: ImageLocality
            weight: 2
      # Minimize scheduling latency
      bind:
        enabled:
          - name: DefaultBinder
```

This profile emphasizes spreading pods across zones and nodes using higher weights for `PodTopologySpread`. It also gives significant weight to `ImageLocality`, which reduces startup time by preferring nodes that already have container images cached.

Here is how to use it in a deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 6
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      schedulerName: latency-sensitive-scheduler
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: api-server
      containers:
      - name: api
        image: api-server:latest
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
```

## Creating a Profile for High-Throughput Data Processing

Data processing workloads often benefit from locality optimizations and can use gang scheduling patterns where all pods in a group need to be scheduled together. Here is a specialized profile:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: data-processing-scheduler
    plugins:
      filter:
        enabled:
          - name: NodeResourcesFit
          - name: VolumeBinding
          - name: NodeAffinity
      score:
        enabled:
          # Prefer nodes with local storage
          - name: VolumeBinding
            weight: 5
          # Pack pods on fewer nodes for better data locality
          - name: NodeResourcesMostAllocated
            weight: 3
          # Respect node affinity for storage-optimized nodes
          - name: NodeAffinity
            weight: 4
          - name: InterPodAffinity
            weight: 2
```

This profile prioritizes volume binding and node affinity, which is important for workloads that need access to specific storage resources. The higher weight on `VolumeBinding` ensures that pods are placed near their data.

Use this profile with StatefulSets that have local storage requirements:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: data-worker
spec:
  serviceName: data-worker
  replicas: 4
  selector:
    matchLabels:
      app: data-worker
  template:
    metadata:
      labels:
        app: data-worker
    spec:
      schedulerName: data-processing-scheduler
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: workload-type
                operator: In
                values:
                - data-processing
      containers:
      - name: worker
        image: data-worker:latest
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: local-storage
      resources:
        requests:
          storage: 100Gi
```

## Deploying Custom Scheduler Profiles

To deploy scheduler profiles, you need to configure the kube-scheduler component. If you're using kubeadm, you can modify the scheduler configuration file:

```yaml
# /etc/kubernetes/scheduler-config.yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: default-scheduler
    plugins:
      score:
        enabled:
          - name: NodeResourcesBalancedAllocation
            weight: 1
  - schedulerName: batch-scheduler
    plugins:
      score:
        enabled:
          - name: NodeResourcesMostAllocated
            weight: 5
  - schedulerName: latency-sensitive-scheduler
    plugins:
      score:
        enabled:
          - name: PodTopologySpread
            weight: 5
          - name: NodeResourcesBalancedAllocation
            weight: 3
```

Then update the scheduler manifest to use this configuration:

```yaml
# /etc/kubernetes/manifests/kube-scheduler.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-scheduler
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-scheduler
    - --config=/etc/kubernetes/scheduler-config.yaml
    - --v=2
    image: registry.k8s.io/kube-scheduler:v1.29.0
    name: kube-scheduler
    volumeMounts:
    - mountPath: /etc/kubernetes/scheduler-config.yaml
      name: scheduler-config
      readOnly: true
  volumes:
  - hostPath:
      path: /etc/kubernetes/scheduler-config.yaml
      type: FileOrCreate
    name: scheduler-config
```

## Monitoring Scheduler Performance

After deploying custom profiles, monitor their performance using scheduler metrics. The scheduler exposes metrics about scheduling latency and success rates:

```bash
# View scheduling attempt metrics
kubectl get --raw /metrics | grep scheduler_scheduling_attempt_duration

# Check for scheduling failures
kubectl get --raw /metrics | grep scheduler_schedule_attempts_total

# Monitor queue wait times
kubectl get --raw /metrics | grep scheduler_queue_incoming_pods_total
```

You can also check which scheduler was used for a pod:

```bash
# Get the scheduler name for a pod
kubectl get pod <pod-name> -o jsonpath='{.spec.schedulerName}'

# Find all pods using a specific scheduler
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.schedulerName=="batch-scheduler") | .metadata.name'
```

## Best Practices for Scheduler Profiles

Keep your scheduler profiles focused on specific use cases. Avoid creating too many profiles, as this increases operational complexity. Three to five well-designed profiles usually cover most scenarios.

Test scheduler profiles in development environments before deploying to production. Monitor scheduling latency and pod startup times to verify that your profiles improve performance for their intended workloads.

Document which workloads should use each profile. Include this information in your deployment documentation so that application teams know which scheduler to specify. Consider creating admission webhooks that automatically assign the appropriate scheduler based on labels or annotations.

Scheduler profiles give you fine-grained control over pod placement decisions. By optimizing scheduling behavior for different workload types, you can improve resource utilization, reduce latency, and ensure that critical applications get the scheduling characteristics they need.
