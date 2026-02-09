# How to Use Admiralty for Multi-Cluster Pod Scheduling Across Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Scheduling

Description: Learn how to deploy and configure Admiralty to enable intelligent pod scheduling across multiple Kubernetes clusters with automatic workload distribution and failover.

---

Admiralty is a multi-cluster scheduler that treats multiple Kubernetes clusters as a single resource pool. Instead of manually deciding which cluster runs which workload, Admiralty automatically schedules pods to the best-fit cluster based on available resources, locality, and custom constraints. This enables true multi-cluster workload distribution without complex orchestration.

## Understanding Admiralty Architecture

Admiralty uses a virtual kubelet pattern:

1. You create pods in a source cluster with special annotations
2. Admiralty creates proxy pods in the source cluster
3. Admiralty schedules the actual pods in target clusters
4. Pod status syncs back to the source cluster

This maintains the Kubernetes API experience while distributing workloads across clusters.

## Installing Admiralty

Install Admiralty in each cluster that will participate in multi-cluster scheduling:

```bash
# Install using Helm
helm repo add admiralty https://charts.admiralty.io
helm repo update

# Install in each cluster
helm install admiralty admiralty/multicluster-scheduler \
  --namespace admiralty \
  --create-namespace \
  --version 0.15.0
```

Verify installation:

```bash
kubectl get pods -n admiralty
kubectl get crd | grep admiralty
```

## Configuring Cluster Targets

Create Target resources to define which clusters can schedule workloads:

```yaml
# In source cluster (cluster-1), define targets
apiVersion: multicluster.admiralty.io/v1alpha1
kind: Target
metadata:
  name: cluster-2
  namespace: admiralty
spec:
  kubeconfigSecret:
    name: cluster-2-kubeconfig
---
apiVersion: multicluster.admiralty.io/v1alpha1
kind: Target
metadata:
  name: cluster-3
  namespace: admiralty
spec:
  kubeconfigSecret:
    name: cluster-3-kubeconfig
```

Create kubeconfig secrets for target clusters:

```bash
# Get kubeconfig for cluster-2
kubectl config view --context=cluster-2 --minify --flatten > cluster-2-config.yaml

# Create secret
kubectl create secret generic cluster-2-kubeconfig \
  --from-file=config=cluster-2-config.yaml \
  -n admiralty

# Repeat for cluster-3
kubectl config view --context=cluster-3 --minify --flatten > cluster-3-config.yaml
kubectl create secret generic cluster-3-kubeconfig \
  --from-file=config=cluster-3-config.yaml \
  -n admiralty
```

## Configuring Source Clusters

In each target cluster, create a Source to allow scheduling from source clusters:

```yaml
# In cluster-2, allow scheduling from cluster-1
apiVersion: multicluster.admiralty.io/v1alpha1
kind: Source
metadata:
  name: cluster-1
  namespace: admiralty
spec:
  userName: "cluster-1-scheduler"
```

Create ServiceAccount and RBAC for remote scheduling:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-1-scheduler
  namespace: admiralty
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: admiralty-remote-scheduler
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["create", "delete", "get", "list", "watch", "patch"]
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["patch"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admiralty-remote-scheduler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admiralty-remote-scheduler
subjects:
- kind: ServiceAccount
  name: cluster-1-scheduler
  namespace: admiralty
```

## Scheduling Pods Across Clusters

Annotate pods to enable multi-cluster scheduling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
      annotations:
        # Enable multi-cluster scheduling
        multicluster.admiralty.io/elect: ""
    spec:
      containers:
      - name: webapp
        image: webapp:v2.1
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
```

Admiralty distributes the 10 replicas across cluster-1, cluster-2, and cluster-3 based on available capacity.

Check pod placement:

```bash
# View pods in source cluster (shows proxy pods)
kubectl get pods -n production --context cluster-1

# View actual pods in target clusters
kubectl get pods -n production --context cluster-2
kubectl get pods -n production --context cluster-3
```

## Using Cluster Selectors

Control which clusters can receive workloads using node selectors:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-workload
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gpu-job
  template:
    metadata:
      labels:
        app: gpu-job
      annotations:
        multicluster.admiralty.io/elect: ""
    spec:
      nodeSelector:
        # Only schedule to nodes with GPUs
        accelerator: nvidia-tesla-v100
      containers:
      - name: ml-training
        image: ml-trainer:latest
        resources:
          requests:
            cpu: 4
            memory: 16Gi
            nvidia.com/gpu: 1
```

Admiralty only schedules these pods to clusters that have nodes matching the selector.

## Implementing Cluster Affinity

Use pod annotations to express cluster preferences:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-processor
  namespace: production
  annotations:
    multicluster.admiralty.io/elect: ""
    # Prefer cluster-2 (e.g., data locality)
    multicluster.admiralty.io/cluster-affinity: |
      - matchExpressions:
        - key: admiralty.io/cluster-name
          operator: In
          values:
          - cluster-2
spec:
  containers:
  - name: processor
    image: data-processor:v1
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
```

Admiralty tries to schedule to cluster-2 first, falling back to other clusters if resources aren't available.

## Configuring Multi-Cluster Services

Services need special handling for multi-cluster deployments. Use Admiralty with service mesh or multi-cluster service discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp-service
  namespace: production
  annotations:
    # Export service across clusters
    multicluster.admiralty.io/export: "true"
spec:
  selector:
    app: webapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

Install service mesh (Istio or Linkerd) for cross-cluster service discovery, or use tools like Submariner covered in other posts.

## Handling Stateful Workloads

StatefulSets can be multi-cluster scheduled with careful configuration:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
      annotations:
        multicluster.admiralty.io/elect: ""
        # Pin each pod to a specific cluster for stable storage
        multicluster.admiralty.io/pod-index-cluster-map: |
          0: cluster-1
          1: cluster-2
          2: cluster-3
    spec:
      containers:
      - name: postgres
        image: postgres:14
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

This ensures database-0 always runs in cluster-1, database-1 in cluster-2, and database-2 in cluster-3.

## Implementing Burst Scheduling

Use Admiralty for burst capacity by prioritizing local cluster:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processing
  namespace: production
  annotations:
    multicluster.admiralty.io/elect: ""
spec:
  parallelism: 100
  template:
    metadata:
      annotations:
        # Try local cluster first, overflow to remote
        multicluster.admiralty.io/scheduling-policy: |
          - weight: 100
            clusterName: cluster-1  # Local cluster
          - weight: 50
            clusterName: cluster-2  # Remote clusters
          - weight: 50
            clusterName: cluster-3
    spec:
      containers:
      - name: worker
        image: batch-worker:latest
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
      restartPolicy: Never
```

Admiralty fills cluster-1 first, then distributes overflow to cluster-2 and cluster-3.

## Monitoring Multi-Cluster Scheduling

Check Admiralty controller logs:

```bash
kubectl logs -n admiralty deployment/admiralty-controller-manager -f
```

View pod delegation decisions:

```bash
# Get podchaperons (Admiralty's internal tracking objects)
kubectl get podchaperons -n production

# Describe to see delegation details
kubectl describe podchaperon webapp-xxxxx-yyyyy -n production
```

Create Prometheus alerts for scheduling failures:

```yaml
groups:
- name: admiralty
  rules:
  - alert: MultiClusterSchedulingFailed
    expr: |
      kube_pod_status_phase{namespace="production",phase="Pending"} == 1
      and kube_pod_annotations{annotation_multicluster_admiralty_io_elect=""}
    for: 5m
    annotations:
      summary: "Pod {{ $labels.pod }} cannot be scheduled to any cluster"
```

## Best Practices

**Start with stateless workloads**: Begin multi-cluster scheduling with stateless applications. StatefulSets and persistent storage add complexity.

**Use resource requests**: Admiralty relies on resource requests to make scheduling decisions. Always set CPU and memory requests.

**Monitor cross-cluster latency**: If services span clusters, track latency between clusters. High latency can impact performance.

**Implement gradual rollout**: Don't enable multi-cluster scheduling for all workloads at once. Start with non-critical deployments.

**Plan for cluster failures**: Test what happens when a target cluster becomes unavailable. Admiralty should reschedule pods to healthy clusters.

**Use cluster affinity wisely**: Overusing hard affinity defeats the purpose of multi-cluster scheduling. Prefer soft affinity for most workloads.

**Consider data locality**: For data-intensive workloads, schedule pods close to their data sources using affinity rules.

**Document cluster topology**: Maintain documentation showing which clusters are targets, their capacity, and any special characteristics (GPU nodes, high-memory nodes, etc.).

Admiralty provides transparent multi-cluster pod scheduling without requiring application changes. By treating multiple clusters as a unified resource pool, it simplifies capacity management and enables automatic workload distribution for better resource utilization and resilience.
