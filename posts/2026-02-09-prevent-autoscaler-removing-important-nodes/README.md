# How to Prevent Cluster Autoscaler from Removing Nodes with Important Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Autoscaler, Node Management

Description: Learn how to configure Cluster Autoscaler annotations and pod disruption budgets to prevent it from removing nodes running critical workloads.

---

Cluster Autoscaler removes underutilized nodes to save costs. However, some pods shouldn't trigger node removal: monitoring agents, logging collectors, local storage pods, or long-running batch jobs. Kubernetes provides several mechanisms to control which nodes Cluster Autoscaler can remove and which pods prevent removal.

## Understanding Cluster Autoscaler Scale-Down Logic

Cluster Autoscaler considers a node for removal when:

1. Node utilization is below threshold (default 50%)
2. All pods can be rescheduled elsewhere
3. No pods have restrictions preventing eviction
4. The node has been underutilized for at least 10 minutes

Several pod characteristics prevent node removal:

- Pods with local storage
- Pods controlled by DaemonSets
- Pods with restrictive PodDisruptionBudgets
- Pods with specific annotations

## Using cluster-autoscaler.kubernetes.io Annotations

Annotate pods to prevent their nodes from scale-down:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stateful-cache
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
      annotations:
        # Prevent node scale-down if this pod is present
        cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
    spec:
      containers:
      - name: redis
        image: redis:7.2
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
```

With `safe-to-evict: "false"`, Cluster Autoscaler will not remove nodes running this pod. Use this for:

- Pods with local state that can't be quickly restored
- Long-running jobs that are expensive to restart
- Pods providing critical infrastructure services

## Preventing Eviction of Pods with Local Storage

Pods using emptyDir volumes with local storage prevent scale-down by default:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: logging
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: elasticsearch:8.11
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
      volumes:
      - name: data
        emptyDir: {}  # Local storage prevents scale-down
```

However, if you use emptyDir only for temporary data that's safe to lose, explicitly allow eviction:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: temp-cache
  annotations:
    cluster-autoscaler.kubernetes.io/safe-to-evict: "true"
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: temp
      mountPath: /tmp/cache
  volumes:
  - name: temp
    emptyDir: {}  # Temporary data, safe to evict
```

## Using PodDisruptionBudgets to Control Evictions

PodDisruptionBudgets (PDBs) limit how many pods can be unavailable simultaneously. Cluster Autoscaler respects PDBs:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
  namespace: production
spec:
  maxUnavailable: 1  # Allow only 1 pod down at a time
  selector:
    matchLabels:
      app: api-server
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: server
        image: api:v2.1
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
```

If evicting a pod would violate the PDB (reducing available pods below the threshold), Cluster Autoscaler won't remove that node.

For critical services, use minAvailable to ensure minimum capacity:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
  namespace: production
spec:
  minAvailable: 3  # Must have at least 3 pods available
  selector:
    matchLabels:
      app: postgres
```

## Annotating Nodes to Prevent Scale-Down

Annotate nodes themselves to prevent removal:

```bash
# Prevent scale-down of a specific node
kubectl annotate node node-1 \
  cluster-autoscaler.kubernetes.io/scale-down-disabled="true"
```

Check which nodes have this annotation:

```bash
kubectl get nodes -o json | jq -r '.items[] | select(.metadata.annotations["cluster-autoscaler.kubernetes.io/scale-down-disabled"] == "true") | .metadata.name'
```

Remove the annotation to allow scale-down again:

```bash
kubectl annotate node node-1 \
  cluster-autoscaler.kubernetes.io/scale-down-disabled-
```

This is useful for:

- Nodes undergoing maintenance but not yet cordoned
- Nodes running unmanaged workloads (pods not in Deployments)
- Temporary protection during debugging

## Protecting System Pods

System pods created outside DaemonSets need protection. Add the annotation to critical system workloads:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dns-cache
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dns-cache
  template:
    metadata:
      labels:
        app: dns-cache
      annotations:
        cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
    spec:
      priorityClassName: system-cluster-critical
      containers:
      - name: dnsmasq
        image: dnsmasq:latest
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
```

The combination of `safe-to-evict: "false"` and `system-cluster-critical` priority ensures these pods are never evicted for scale-down.

## Handling Long-Running Batch Jobs

Batch jobs that take hours to complete shouldn't be interrupted:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
  namespace: batch
spec:
  template:
    metadata:
      annotations:
        cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
    spec:
      restartPolicy: Never
      containers:
      - name: processor
        image: data-processor:v3
        command: ["./process_large_dataset.sh"]
        resources:
          requests:
            cpu: 4
            memory: 16Gi
```

For CronJobs running critical tasks:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-backup
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: backup-tool:latest
            command: ["./backup.sh"]
```

## Configuring Cluster Autoscaler Scale-Down Parameters

Adjust Cluster Autoscaler's scale-down behavior globally:

```yaml
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
        image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.2
        command:
        - ./cluster-autoscaler
        - --cloud-provider=aws
        - --namespace=kube-system
        - --nodes=1:10:k8s-worker-nodes
        # Scale-down configuration
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=10m  # Wait 10 min after scale-up
        - --scale-down-unneeded-time=10m    # Node must be unneeded for 10 min
        - --scale-down-utilization-threshold=0.5  # Scale down if <50% utilized
        - --max-node-provision-time=15m     # Max time to provision new node
        - --skip-nodes-with-local-storage=true  # Don't remove nodes with local storage
        - --skip-nodes-with-system-pods=false   # Can remove nodes with system pods
        resources:
          requests:
            cpu: 100m
            memory: 300Mi
```

Key parameters:

- **scale-down-delay-after-add**: How long to wait after adding nodes before considering removal
- **scale-down-unneeded-time**: How long a node must be underutilized before removal
- **scale-down-utilization-threshold**: CPU/memory threshold below which nodes are considered underutilized
- **skip-nodes-with-local-storage**: Never remove nodes with emptyDir volumes

## Creating Node Pools for Different Workload Types

Separate workloads into different node pools with different autoscaling configurations:

```yaml
# Node pool for stateful workloads - scale-down disabled
apiVersion: v1
kind: ConfigMap
metadata:
  name: stateful-node-pool-config
  namespace: kube-system
data:
  scale-down-enabled: "false"
---
# Deployment affinity to stateful node pool
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stateful-app
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-pool
                operator: In
                values:
                - stateful
      containers:
      - name: app
        image: stateful-app:latest
```

Apply node labels:

```bash
# Label nodes in stateful pool
kubectl label nodes node-4 node-5 node-6 node-pool=stateful

# Annotate to disable scale-down
kubectl annotate nodes node-4 node-5 node-6 \
  cluster-autoscaler.kubernetes.io/scale-down-disabled="true"
```

## Monitoring Scale-Down Prevention

Check why nodes aren't being removed:

```bash
# View Cluster Autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler | grep "scale down"
```

Logs show reasons for skipping nodes:

```
I0209 10:30:15 Skipping node-3: node has pod with local storage
I0209 10:30:16 Skipping node-5: node has safe-to-evict=false pod
I0209 10:30:17 Skipping node-7: removing would violate PodDisruptionBudget
```

Create alerts for nodes that can't scale down:

```yaml
groups:
- name: cluster-autoscaler
  rules:
  - alert: NodeScaleDownBlocked
    expr: |
      cluster_autoscaler_unschedulable_pods_count == 0
      and cluster_autoscaler_nodes_count{state="ready"} > cluster_autoscaler_nodes_count{state="ready"} offset 1h
    for: 2h
    annotations:
      summary: "Cluster has underutilized nodes that cannot scale down"
      description: "Node count hasn't decreased in 2 hours despite no pending pods"
```

## Best Practices

**Use safe-to-evict sparingly**: Only annotate pods that truly can't be rescheduled. Overusing this annotation defeats the purpose of autoscaling and wastes resources.

**Combine PDBs with safe-to-evict**: For critical services, use both mechanisms. PDBs ensure availability during voluntary disruptions, while safe-to-evict provides additional protection.

**Set appropriate PDB thresholds**: Don't set minAvailable too high. If minAvailable equals replica count, no pods can ever be evicted, preventing all scale-downs.

**Monitor annotation usage**: Track how many pods have safe-to-evict annotations:

```bash
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.annotations["cluster-autoscaler.kubernetes.io/safe-to-evict"] == "false") | .metadata.name'
```

**Test scale-down behavior**: In non-production environments, verify that protected pods actually prevent node removal and that unprotected pods allow it.

**Document protection reasons**: Add annotations explaining why pods are protected:

```yaml
metadata:
  annotations:
    cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
    safe-to-evict-reason: "Stores unbackedup cache data in emptyDir volume"
```

Cluster Autoscaler provides powerful cost optimization, but critical workloads need protection from premature eviction. By using annotations, PodDisruptionBudgets, and proper configuration, you can balance cost savings with workload reliability.
