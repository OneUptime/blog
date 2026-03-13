# How to implement DaemonSet with custom scheduler for advanced placement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Schedulers

Description: Explore how to use custom schedulers with DaemonSets for advanced pod placement strategies beyond the default node-per-pod pattern.

---

While DaemonSets traditionally place one pod per node using the default scheduler, custom schedulers enable advanced placement strategies. You might want to schedule DaemonSet pods based on custom logic, hardware topology, or business requirements that the default scheduler cannot handle. Custom schedulers give you fine-grained control over where and how DaemonSet pods run.

## Understanding custom schedulers with DaemonSets

Kubernetes allows multiple schedulers to coexist in a cluster. When you specify a schedulerName in a pod spec, that scheduler takes responsibility for placing the pod. For DaemonSets, custom schedulers can implement logic like placing pods on specific CPU architectures, NUMA nodes, or based on custom resource availability.

The default DaemonSet behavior uses node affinity rather than the scheduler to ensure one pod per node. However, by combining a custom scheduler with appropriate node selectors and affinity rules, you can create sophisticated placement strategies.

## Basic DaemonSet with custom scheduler

Here's a DaemonSet configured to use a custom scheduler:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: high-priority-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: high-priority-monitor
  template:
    metadata:
      labels:
        app: high-priority-monitor
    spec:
      schedulerName: custom-priority-scheduler
      priorityClassName: system-node-critical
      containers:
      - name: monitor
        image: example/monitor:v1.0
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 200m
            memory: 200Mi
```

The schedulerName field tells Kubernetes to use your custom scheduler instead of the default.

## Custom scheduler implementation

Here's a simple custom scheduler that prioritizes nodes with specific labels:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-scheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      component: custom-scheduler
  template:
    metadata:
      labels:
        component: custom-scheduler
    spec:
      serviceAccountName: custom-scheduler
      containers:
      - name: scheduler
        image: example/custom-scheduler:v1.0
        command:
        - /usr/local/bin/custom-scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
        - --v=3
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
      volumes:
      - name: config
        configMap:
          name: scheduler-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: scheduler-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    profiles:
    - schedulerName: custom-priority-scheduler
      plugins:
        score:
          enabled:
          - name: NodeResourcesFit
            weight: 1
          - name: NodeAffinity
            weight: 2
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: custom-scheduler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: custom-scheduler-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-scheduler
subjects:
- kind: ServiceAccount
  name: custom-scheduler
  namespace: kube-system
```

This custom scheduler can apply different scoring algorithms to select optimal nodes.

## Topology-aware DaemonSet scheduling

Use a custom scheduler to implement topology-aware placement:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: numa-aware-service
  namespace: high-performance
spec:
  selector:
    matchLabels:
      app: numa-service
  template:
    metadata:
      labels:
        app: numa-service
    spec:
      schedulerName: topology-aware-scheduler
      nodeSelector:
        numa-topology: "true"
      containers:
      - name: service
        image: example/numa-service:v2.0
        resources:
          requests:
            cpu: "4"
            memory: 8Gi
          limits:
            cpu: "4"
            memory: 8Gi
        env:
        - name: NUMA_NODE
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['numa.node']
```

The custom scheduler analyzes NUMA topology and places pods optimally for memory locality.

## Hardware-specific DaemonSet scheduling

Create a custom scheduler that understands hardware capabilities:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: avx512-optimized-app
  namespace: compute
spec:
  selector:
    matchLabels:
      app: avx512-app
  template:
    metadata:
      labels:
        app: avx512-app
    spec:
      schedulerName: hardware-aware-scheduler
      nodeSelector:
        cpu.feature.node.kubernetes.io/avx512: "true"
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: cpu.model
                operator: In
                values:
                - "Intel-Xeon-Platinum-8380"
                - "AMD-EPYC-7763"
      containers:
      - name: compute
        image: example/avx512-compute:v1.0
        resources:
          requests:
            cpu: "16"
            memory: 32Gi
```

This ensures the DaemonSet only runs on nodes with AVX-512 CPU instructions.

## Cost-optimized DaemonSet scheduling

Implement a scheduler that considers spot instance pricing:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: batch-processor
  namespace: batch-jobs
spec:
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      schedulerName: cost-optimizer-scheduler
      priorityClassName: low-priority
      tolerations:
      - key: node.kubernetes.io/instance-type
        operator: Equal
        value: spot
        effect: NoSchedule
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: node.kubernetes.io/instance-pricing
                operator: In
                values:
                - spot
                - preemptible
      containers:
      - name: processor
        image: example/batch-processor:v3.0
```

The custom scheduler prioritizes cheaper spot instances while maintaining service availability.

## Network-topology-aware scheduling

Schedule DaemonSets based on network topology:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: low-latency-service
  namespace: networking
spec:
  selector:
    matchLabels:
      app: low-latency
  template:
    metadata:
      labels:
        app: low-latency
    spec:
      schedulerName: network-topology-scheduler
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values:
                - us-west-2a
              - key: network.tier
                operator: In
                values:
                - enhanced
                - ultra-low-latency
      containers:
      - name: service
        image: example/low-latency:v1.0
        ports:
        - containerPort: 8080
          hostPort: 8080
          protocol: TCP
```

This places pods only on nodes with enhanced networking capabilities in specific availability zones.

## Multi-scheduler DaemonSet deployment

Deploy multiple DaemonSets using different schedulers for different node types:

```yaml
# DaemonSet for GPU nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gpu-workload-scheduler
  namespace: ml-workloads
spec:
  selector:
    matchLabels:
      app: gpu-scheduler
  template:
    metadata:
      labels:
        app: gpu-scheduler
    spec:
      schedulerName: gpu-aware-scheduler
      nodeSelector:
        accelerator: nvidia-gpu
      containers:
      - name: gpu-scheduler
        image: example/gpu-scheduler:v1.0
---
# DaemonSet for CPU nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cpu-workload-scheduler
  namespace: ml-workloads
spec:
  selector:
    matchLabels:
      app: cpu-scheduler
  template:
    metadata:
      labels:
        app: cpu-scheduler
    spec:
      schedulerName: cpu-aware-scheduler
      nodeSelector:
        node-type: cpu-optimized
      containers:
      - name: cpu-scheduler
        image: example/cpu-scheduler:v1.0
```

Each DaemonSet uses a specialized scheduler optimized for its hardware type.

## Scheduler extender for DaemonSets

Use a scheduler extender to add custom logic:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: scheduler-extender-config
  namespace: kube-system
data:
  config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    profiles:
    - schedulerName: extender-scheduler
    extenders:
    - urlPrefix: "http://scheduler-extender.kube-system.svc:8080"
      filterVerb: "filter"
      prioritizeVerb: "prioritize"
      weight: 1
      nodeCacheCapable: true
      ignorable: true
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: extender-scheduled-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: extender-service
  template:
    metadata:
      labels:
        app: extender-service
    spec:
      schedulerName: extender-scheduler
      containers:
      - name: service
        image: example/service:v2.0
```

The extender can call external APIs to make scheduling decisions based on real-time data.

## Monitoring custom scheduler performance

Track your custom scheduler's behavior:

```bash
# Check scheduler pod status
kubectl get pods -n kube-system -l component=custom-scheduler

# View scheduler logs
kubectl logs -n kube-system -l component=custom-scheduler

# Check DaemonSet pods scheduled by custom scheduler
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.schedulerName=="custom-priority-scheduler") | "\(.metadata.namespace)/\(.metadata.name)"'

# Verify scheduling decisions
kubectl get events --sort-by='.lastTimestamp' | grep -i scheduled
```

## Troubleshooting custom schedulers

Common issues with custom schedulers and DaemonSets:

```bash
# Check if custom scheduler is registered
kubectl get events --all-namespaces | grep "FailedScheduling"

# Verify scheduler permissions
kubectl auth can-i --as=system:serviceaccount:kube-system:custom-scheduler list nodes

# Test scheduler connectivity
kubectl run test-pod --image=busybox --restart=Never --overrides='{"spec":{"schedulerName":"custom-priority-scheduler"}}' -- sleep 3600

# Check scheduler decision logs
kubectl logs -n kube-system deployment/custom-scheduler --tail=100
```

## Conclusion

Custom schedulers with DaemonSets unlock advanced placement strategies beyond simple one-pod-per-node deployment. Whether you need topology awareness, hardware-specific placement, cost optimization, or network-aware scheduling, custom schedulers provide the flexibility to implement complex logic. Combine custom schedulers with node selectors, affinity rules, and tolerations to create sophisticated DaemonSet deployment patterns that match your infrastructure requirements.
