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

# Install in each cluster
helm install admiralty oci://public.ecr.aws/admiralty/admiralty \
  --namespace admiralty \
  --create-namespace \
  --version 0.17.0 \
  --wait
```

Admiralty Open Source uses cert-manager for its mutating admission webhook certificate, so install cert-manager before installing the Admiralty agent if it is not already present.

Verify installation:

```bash
kubectl get pods -n admiralty
kubectl get crd | grep admiralty
```

## Configuring Cluster Targets

Create Target resources to define which clusters can schedule workloads:

```yaml
# In source cluster (cluster-1), define targets for the production namespace
apiVersion: multicluster.admiralty.io/v1alpha1
kind: Target
metadata:
  name: cluster-1
  namespace: production
spec:
  self: true
---
apiVersion: multicluster.admiralty.io/v1alpha1
kind: Target
metadata:
  name: cluster-2
  namespace: production
spec:
  kubeconfigSecret:
    name: cluster-2-kubeconfig
---
apiVersion: multicluster.admiralty.io/v1alpha1
kind: Target
metadata:
  name: cluster-3
  namespace: production
spec:
  kubeconfigSecret:
    name: cluster-3-kubeconfig
```

Create kubeconfig secrets for target clusters. The example below uses `jq` to build kubeconfigs for the remote ServiceAccounts:

```bash
# Create the remote identity in cluster-2
kubectl create serviceaccount cluster-1-scheduler \
  -n production \
  --context cluster-2

# Build a kubeconfig that authenticates as that ServiceAccount
TOKEN=$(kubectl create token cluster-1-scheduler \
  -n production \
  --context cluster-2)

kubectl config view --context=cluster-2 --minify --flatten --raw -o json | \
  jq '.users[0].user={token: env.TOKEN}' > cluster-2-config.json

# Create secret
kubectl create secret generic cluster-2-kubeconfig \
  --from-file=config=cluster-2-config.json \
  -n production \
  --context cluster-1

# Repeat for cluster-3
kubectl create serviceaccount cluster-1-scheduler \
  -n production \
  --context cluster-3

TOKEN=$(kubectl create token cluster-1-scheduler \
  -n production \
  --context cluster-3)

kubectl config view --context=cluster-3 --minify --flatten --raw -o json | \
  jq '.users[0].user={token: env.TOKEN}' > cluster-3-config.json

kubectl create secret generic cluster-3-kubeconfig \
  --from-file=config=cluster-3-config.json \
  -n production \
  --context cluster-1
```

## Configuring Source Clusters

In each target cluster, create a Source to allow scheduling from source clusters:

```yaml
# In cluster-2, allow scheduling from cluster-1
apiVersion: multicluster.admiralty.io/v1alpha1
kind: Source
metadata:
  name: cluster-1
  namespace: production
spec:
  serviceAccountName: cluster-1-scheduler
```

The Source controller creates the ServiceAccount if it does not exist. If you disable the Source controller with `sourceController.enabled=false`, create the ServiceAccount and RBAC yourself:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-1-scheduler
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: admiralty-source-cluster-1
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admiralty-source
subjects:
- kind: ServiceAccount
  name: cluster-1-scheduler
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admiralty-source-production-cluster-1-cluster-summary-viewer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admiralty-cluster-summary-viewer
subjects:
- kind: ServiceAccount
  name: cluster-1-scheduler
  namespace: production
```

## Scheduling Pods Across Clusters

Label the source namespace and annotate pods to enable multi-cluster scheduling:

```bash
kubectl label namespace production multicluster-scheduler=enabled --context cluster-1
```

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

Use standard Kubernetes node affinity to express cluster preferences. For example, if nodes in cluster-2 are labeled `topology.kubernetes.io/region: cluster-2`, prefer that cluster while allowing fallback to other clusters:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-processor
  namespace: production
  annotations:
    multicluster.admiralty.io/elect: ""
spec:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: topology.kubernetes.io/region
            operator: In
            values:
            - cluster-2
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

StatefulSets can be annotated for multi-cluster scheduling, but do not split a single StatefulSet across clusters unless the storage and network identity model is designed for it. Constrain the workload to a storage domain using standard Kubernetes scheduling constraints:

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
    spec:
      nodeSelector:
        storage-domain: cluster-1
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

This keeps the StatefulSet in a cluster or storage domain where its `ReadWriteOnce` volumes and stable network identity can be satisfied.

## Implementing Burst Scheduling

Use Admiralty for burst capacity by targeting the local cluster with `spec.self: true` and adding remote targets. Then use standard Kubernetes scheduling preferences to prefer local nodes while allowing remote clusters when local capacity is unavailable:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processing
  namespace: production
spec:
  parallelism: 100
  template:
    metadata:
      annotations:
        multicluster.admiralty.io/elect: ""
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: topology.kubernetes.io/region
                operator: In
                values:
                - cluster-1
      containers:
      - name: worker
        image: batch-worker:latest
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
      restartPolicy: Never
```

Admiralty prefers cluster-1 when matching nodes are available, then can use other configured targets if the preference cannot be satisfied.

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
    labels:
      severity: warning
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
