# How to Configure Multi-Scheduler Setup for Parallel Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Performance

Description: Learn how to deploy and configure multiple Kubernetes schedulers running in parallel to handle different workload types with custom scheduling logic and improve scheduling throughput.

---

The default Kubernetes scheduler works well for most clusters, but sometimes you need different scheduling behavior for different workloads. Maybe you want a bin-packing strategy for batch jobs and a spreading strategy for services. Or perhaps you need custom scheduling logic for specialized hardware.

Running multiple schedulers in parallel lets you implement different scheduling strategies for different workload types. Each scheduler operates independently, and you choose which scheduler handles each pod.

## Why Use Multiple Schedulers

Multiple schedulers solve several problems:

- **Different strategies**: Apply bin-packing for batch jobs and balanced allocation for services.
- **Custom logic**: Implement specialized scheduling for GPU allocation or network topology.
- **Isolation**: Prevent experimental scheduling algorithms from affecting production workloads.
- **Throughput**: Distribute scheduling load across multiple scheduler instances.
- **Gradual migration**: Test new scheduling configurations without disrupting existing workloads.

## Understanding the Default Scheduler

Before adding schedulers, understand what you're working with. The default scheduler runs as a pod in the kube-system namespace:

```bash
# View the default scheduler
kubectl get pods -n kube-system -l component=kube-scheduler

# Check its configuration
kubectl get configmap -n kube-system kube-scheduler -o yaml
```

The default scheduler is named `default-scheduler`, and pods use it unless you specify otherwise.

## Deploying a Second Scheduler

Create a custom scheduler with different behavior. Start with a configuration that implements bin-packing:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bin-packing-scheduler-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    leaderElection:
      leaderElect: true
      resourceName: bin-packing-scheduler
      resourceNamespace: kube-system
    profiles:
    - schedulerName: bin-packing-scheduler
      plugins:
        score:
          enabled:
          - name: NodeResourcesFit
            weight: 10  # Heavy weight for bin-packing
          - name: ImageLocality
            weight: 2
          disabled:
          - name: NodeResourcesBalancedAllocation  # Disable spreading
```

Deploy the scheduler as a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bin-packing-scheduler
  namespace: kube-system
  labels:
    component: scheduler
    tier: control-plane
spec:
  replicas: 2  # Run multiple instances for high availability
  selector:
    matchLabels:
      component: scheduler
      scheduler: bin-packing
  template:
    metadata:
      labels:
        component: scheduler
        scheduler: bin-packing
    spec:
      serviceAccountName: bin-packing-scheduler
      priorityClassName: system-cluster-critical
      containers:
      - name: scheduler
        image: registry.k8s.io/kube-scheduler:v1.28.0
        command:
        - kube-scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
        - --v=2
        livenessProbe:
          httpGet:
            path: /healthz
            port: 10259
            scheme: HTTPS
          initialDelaySeconds: 15
        readinessProbe:
          httpGet:
            path: /healthz
            port: 10259
            scheme: HTTPS
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: bin-packing-scheduler-config
```

Create the necessary RBAC permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bin-packing-scheduler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: bin-packing-scheduler-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-scheduler
subjects:
- kind: ServiceAccount
  name: bin-packing-scheduler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: bin-packing-scheduler-volume-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:volume-scheduler
subjects:
- kind: ServiceAccount
  name: bin-packing-scheduler
  namespace: kube-system
```

## Using Your Custom Scheduler

Specify the scheduler name in your pod spec:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processing
spec:
  parallelism: 10
  template:
    spec:
      schedulerName: bin-packing-scheduler  # Use custom scheduler
      containers:
      - name: processor
        image: myapp/processor:v1
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
      restartPolicy: Never
```

For regular services, stick with the default scheduler:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      # schedulerName: default-scheduler  # Optional, this is the default
      containers:
      - name: web
        image: nginx:1.21
```

## Creating a GPU-Aware Scheduler

Here's a more sophisticated example for GPU workloads:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gpu-scheduler-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    leaderElection:
      leaderElect: true
      resourceName: gpu-scheduler
      resourceNamespace: kube-system
    profiles:
    - schedulerName: gpu-scheduler
      plugins:
        # Filter plugins to find nodes with available GPUs
        filter:
          enabled:
          - name: NodeResourcesFit
        # Score plugins to optimize GPU placement
        score:
          enabled:
          - name: NodeResourcesFit
            weight: 5
          - name: NodeResourcesBalancedAllocation
            weight: 3
          - name: ImageLocality
            weight: 2
        # Bind plugins
        bind:
          enabled:
          - name: DefaultBinder
```

Deploy this scheduler:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-scheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      component: scheduler
      scheduler: gpu
  template:
    metadata:
      labels:
        component: scheduler
        scheduler: gpu
    spec:
      serviceAccountName: gpu-scheduler
      priorityClassName: system-cluster-critical
      containers:
      - name: scheduler
        image: registry.k8s.io/kube-scheduler:v1.28.0
        command:
        - kube-scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
        - --v=2
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
      volumes:
      - name: config
        configMap:
          name: gpu-scheduler-config
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gpu-scheduler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: gpu-scheduler-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-scheduler
subjects:
- kind: ServiceAccount
  name: gpu-scheduler
  namespace: kube-system
```

Use it for GPU workloads:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-training
spec:
  schedulerName: gpu-scheduler
  containers:
  - name: training
    image: ml/training:v2
    resources:
      limits:
        nvidia.com/gpu: 2
      requests:
        cpu: 4000m
        memory: 16Gi
```

## Scheduler Profiles: Multiple Strategies in One Scheduler

Instead of separate scheduler deployments, you can run multiple profiles in a single scheduler:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: multi-profile-scheduler-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    profiles:
    # Default balanced profile
    - schedulerName: default-scheduler
      plugins:
        score:
          enabled:
          - name: NodeResourcesBalancedAllocation
            weight: 1
          - name: NodeResourcesFit
            weight: 1
    # Bin-packing profile
    - schedulerName: bin-packing-scheduler
      plugins:
        score:
          enabled:
          - name: NodeResourcesFit
            weight: 10
          disabled:
          - name: NodeResourcesBalancedAllocation
    # Spreading profile
    - schedulerName: spreading-scheduler
      plugins:
        score:
          enabled:
          - name: NodeResourcesBalancedAllocation
            weight: 10
          - name: NodeResourcesFit
            weight: 1
      pluginConfig:
      - name: PodTopologySpread
        args:
          defaultConstraints:
          - maxSkew: 1
            topologyKey: topology.kubernetes.io/zone
            whenUnsatisfiable: ScheduleAnyway
```

This single scheduler process handles three different scheduling strategies. Pods choose their strategy by specifying the appropriate scheduler name.

## Monitoring Multiple Schedulers

Track the performance of your schedulers:

```bash
# Check scheduler pod status
kubectl get pods -n kube-system -l component=scheduler

# View scheduler metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/kube-system/pods | \
  jq '.items[] | select(.metadata.labels.component=="scheduler") |
    {name: .metadata.name, cpu: .containers[0].usage.cpu, memory: .containers[0].usage.memory}'

# Check scheduler logs
kubectl logs -n kube-system -l scheduler=bin-packing --tail=100
```

Create a monitoring dashboard to track:

- Scheduling latency per scheduler
- Pending pod count per scheduler
- Scheduling success rate
- Resource utilization of scheduler pods

## Handling Scheduler Failures

When a custom scheduler fails, pods using that scheduler remain pending. Implement fallback behavior:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resilient-workload
spec:
  schedulerName: custom-scheduler
  # If custom scheduler fails, you'll need to update the pod
  containers:
  - name: app
    image: myapp:latest
```

Consider using an admission webhook that automatically falls back to the default scheduler if the specified scheduler is unhealthy.

## Testing Scheduler Behavior

Verify that your schedulers behave differently:

```bash
# Create test workloads for each scheduler
for i in {1..5}; do
  kubectl run test-default-$i --image=nginx --restart=Never \
    --overrides='{"spec":{"schedulerName":"default-scheduler"}}' \
    --requests=cpu=100m,memory=128Mi

  kubectl run test-binpack-$i --image=nginx --restart=Never \
    --overrides='{"spec":{"schedulerName":"bin-packing-scheduler"}}' \
    --requests=cpu=100m,memory=128Mi
done

# Compare pod distribution
echo "Default scheduler distribution:"
kubectl get pods -l run=test-default -o wide | awk '{print $7}' | sort | uniq -c

echo "Bin-packing scheduler distribution:"
kubectl get pods -l run=test-binpack -o wide | awk '{print $7}' | sort | uniq -c
```

The bin-packing scheduler should concentrate pods on fewer nodes, while the default scheduler should spread them more evenly.

## Best Practices

Follow these guidelines for multi-scheduler setups:

1. **Clear naming**: Use descriptive scheduler names that indicate their purpose.
2. **Documentation**: Document which workloads should use which scheduler.
3. **High availability**: Run multiple replicas of custom schedulers with leader election.
4. **Resource limits**: Set appropriate resource requests and limits for scheduler pods.
5. **Monitoring**: Track scheduling metrics for each scheduler separately.
6. **Gradual rollout**: Test new schedulers on non-critical workloads first.
7. **Fallback strategy**: Have a plan for when custom schedulers fail.

Multiple schedulers give you flexibility to optimize scheduling for different workload types while maintaining the simplicity of the default scheduler for most workloads. This approach scales well as your cluster and requirements grow.
