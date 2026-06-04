# How to Deploy Liqo for Seamless Multi-Cluster Resource Sharing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Liqo

Description: Learn how to install and configure Liqo to enable seamless resource sharing and pod scheduling across Kubernetes clusters with automatic network connectivity.

---

Liqo extends Kubernetes clusters dynamically by peering them together and sharing resources. Unlike federation which requires explicit resource propagation, Liqo makes remote cluster resources appear as virtual nodes in your local cluster. Pods scheduled to these virtual nodes actually run in the remote cluster, enabling transparent multi-cluster workloads.

## Understanding Liqo Architecture

Liqo creates peering relationships between clusters. A peering is unidirectional, and bidirectional resource sharing is achieved by creating one peering in each direction:

- **Virtual Nodes**: Remote clusters appear as nodes in the local cluster
- **Network Fabric**: Automatic cross-cluster pod and service connectivity
- **Resource Offloading**: Local pods can be scheduled to remote clusters transparently
- **Identity Management**: Secure authentication between clusters

This approach requires no application changes. Existing deployments work across clusters without modification.

## Installing Liqo

Install Liqo using liqoctl:

```bash
# Download liqoctl

curl --fail -LS "https://github.com/liqotech/liqo/releases/download/v1.1.2/liqoctl-linux-amd64.tar.gz" | tar -xz
sudo install -o root -g root -m 0755 liqoctl /usr/local/bin/liqoctl

# Install Liqo in cluster-1
liqoctl install kubeadm \
  --cluster-id cluster-1 \
  --kubeconfig ~/.kube/config

# Install Liqo in cluster-2
liqoctl install kubeadm \
  --cluster-id cluster-2 \
  --kubeconfig ~/.kube/config-cluster2
```

For cloud providers:

```bash
# For EKS clusters
liqoctl install eks \
  --eks-cluster-name eks-cluster-1 \
  --eks-cluster-region us-east-1

# For GKE clusters
liqoctl install gke \
  --cluster-id gke-cluster-1 \
  --project-id my-project \
  --region us-central1 \
  --credentials-path ~/.liqo/gcp_service_account
```

Verify installation:

```bash
liqoctl info
```

## Peering Clusters Together

Create a peering from cluster-1 to cluster-2:

```bash
liqoctl peer \
  --kubeconfig ~/.kube/config \
  --remote-kubeconfig ~/.kube/config-cluster2
```

This makes cluster-1 the consumer and cluster-2 the provider. If you want bidirectional sharing, create the reverse peering as well:

```bash
liqoctl peer \
  --kubeconfig ~/.kube/config-cluster2 \
  --remote-kubeconfig ~/.kube/config
```

Verify peering status:

```bash
# In cluster-1
kubectl get foreignclusters

# In cluster-2
kubectl get foreignclusters
```

Output shows peering status:

```text
NAME        ROLE       AGE
cluster-2   Provider   2m
```

## Viewing Virtual Nodes

After peering, remote clusters appear as virtual nodes:

```bash
# In cluster-1, see cluster-2 as a virtual node
kubectl get nodes -l liqo.io/type=virtual-node
```

Output:

```text
NAME                           STATUS   ROLES           AGE   VERSION
cluster-2                      Ready    agent           2m    v1.30.0
```

The `cluster-2` node represents the entire remote cluster.

## Offloading Workloads to Remote Clusters

Enable namespace offloading:

```bash
liqoctl offload namespace production \
  --namespace-mapping-strategy EnforceSameName \
  --pod-offloading-strategy LocalAndRemote \
  --selector 'liqo.io/enabled=true'
```

This creates a NamespaceOffloading resource:

```yaml
apiVersion: offloading.liqo.io/v1beta1
kind: NamespaceOffloading
metadata:
  name: offloading
  namespace: production
spec:
  namespaceMappingStrategy: EnforceSameName
  podOffloadingStrategy: LocalAndRemote
  clusterSelector:
    nodeSelectorTerms:
    - matchExpressions:
      - key: liqo.io/enabled
        operator: In
        values:
        - "true"
```

Label virtual nodes to enable offloading:

```bash
kubectl label node cluster-2 liqo.io/enabled=true
```

Now deployments in the production namespace can schedule to cluster-2:

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

Liqo automatically distributes pods across local and remote clusters:

```bash
kubectl get pods -n production -o wide
```

Some pods run on local nodes, others on `cluster-2`.

## Configuring Resource Sharing Limits

Control how many resources remote clusters can consume at peering time:

```bash
liqoctl peer \
  --kubeconfig ~/.kube/config \
  --remote-kubeconfig ~/.kube/config-cluster2 \
  --cpu=20 \
  --memory=64Gi \
  --pods=100 \
  --resource=ephemeral-storage=500Gi
```

This limits cluster-1 to using 20 CPU cores, 64Gi memory, and 100 pods from cluster-2.

## Implementing Cross-Cluster Networking

Liqo automatically configures cross-cluster networking. Test connectivity:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: network-test
  namespace: production
spec:
  containers:
  - name: test
    image: nicolaka/netshoot
    command: ["/bin/sleep", "3600"]
```

After the pod starts (potentially in the remote cluster):

```bash
# Exec into pod
kubectl exec -it network-test -n production -- bash

# Ping a pod in the local cluster
ping webapp-local-pod-ip

# Access a local service
curl http://local-service.production.svc.cluster.local
```

Liqo's network fabric ensures connectivity works regardless of pod location.

## Using Cross-Cluster Services

Services work transparently across clusters:

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

This service load-balances across all webapp pods, whether they run locally or in remote clusters.

For external traffic, use LoadBalancer or Ingress as usual:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp-lb
  namespace: production
spec:
  selector:
    app: webapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

## Controlling Pod Placement

Use node affinity to control pod placement:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: local-only-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: local-app
  template:
    metadata:
      labels:
        app: local-app
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: liqo.io/type
                operator: DoesNotExist
      containers:
      - name: app
        image: local-app:latest
```

Or use affinity to prefer local scheduling:

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: liqo.io/type
                operator: DoesNotExist
```

## Monitoring Liqo Peering

Check peering health:

```bash
kubectl get foreignclusters -o wide
```

View network tunnel status:

```bash
kubectl get gatewayservers.networking.liqo.io -A
kubectl get gatewayclients.networking.liqo.io -A
```

Check virtual node status:

```bash
kubectl describe node cluster-2
```

Get detailed peering information:

```bash
liqoctl info peer cluster-2
```

## Implementing Disaster Recovery

Use Liqo to keep critical workloads on a remote cluster for disaster-recovery scenarios:

```yaml
apiVersion: offloading.liqo.io/v1beta1
kind: NamespaceOffloading
metadata:
  name: offloading
  namespace: critical-services
spec:
  namespaceMappingStrategy: EnforceSameName
  podOffloadingStrategy: Remote  # Force remote execution for DR
  clusterSelector:
    nodeSelectorTerms:
    - matchExpressions:
      - key: liqo.io/dr-site
        operator: In
        values:
        - "true"
```

Label the DR virtual node:

```bash
kubectl label node cluster-2 liqo.io/dr-site=true
```

All pods in critical-services namespace are scheduled to cluster-2.

## Best Practices

**Start with non-production workloads**: Test Liqo with development or staging environments before production.

**Monitor network latency**: Cross-cluster communication adds latency. Measure and ensure it's acceptable for your workloads.

**Set resource limits**: Request bounded CPU, memory, pod, and extended resources during peering, or manage the underlying ResourceSlice, to prevent one cluster from consuming all resources of another.

**Use pod topology spread**: Distribute replicas across virtual nodes for high availability:

```yaml
spec:
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: liqo.io/remote-cluster-id
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: webapp
```

**Plan for network policies**: Ensure network policies work correctly with cross-cluster pods.

**Test failover scenarios**: Regularly test what happens when peering breaks or a cluster becomes unavailable.

**Document cluster topology**: Maintain diagrams showing which clusters are peered and their roles (primary, DR, burst capacity, etc.).

Liqo transforms multiple Kubernetes clusters into a unified resource pool with transparent networking and pod scheduling. This simplifies multi-cluster operations by making remote clusters appear as natural extensions of your local cluster.
