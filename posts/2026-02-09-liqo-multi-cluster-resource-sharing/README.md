# How to Deploy Liqo for Seamless Multi-Cluster Resource Sharing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Liqo

Description: Learn how to install and configure Liqo to enable seamless resource sharing and pod scheduling across Kubernetes clusters with automatic network connectivity.

---

Liqo extends Kubernetes clusters dynamically by peering them together and sharing resources. Unlike federation which requires explicit resource propagation, Liqo makes remote cluster resources appear as virtual nodes in your local cluster. Pods scheduled to these virtual nodes actually run in the remote cluster, enabling transparent multi-cluster workloads.

## Understanding Liqo Architecture

Liqo creates bidirectional peering between clusters:

- **Virtual Nodes**: Remote clusters appear as nodes in the local cluster
- **Network Fabric**: Automatic cross-cluster pod and service connectivity
- **Resource Offloading**: Local pods can be scheduled to remote clusters transparently
- **Identity Management**: Secure authentication between clusters

This approach requires no application changes. Existing deployments work across clusters without modification.

## Installing Liqo

Install Liqo using liqoctl:

```bash
# Download liqoctl
curl --fail -LSO "https://github.com/liqotech/liqo/releases/download/v0.10.0/liqoctl-linux-amd64.tar.gz"
tar -xzf liqoctl-linux-amd64.tar.gz
sudo install -o root -g root -m 0755 liqoctl /usr/local/bin/liqoctl

# Install Liqo in cluster-1
liqoctl install kubeadm \
  --cluster-name cluster-1 \
  --kubeconfig ~/.kube/config

# Install Liqo in cluster-2
liqoctl install kubeadm \
  --cluster-name cluster-2 \
  --kubeconfig ~/.kube/config-cluster2
```

For cloud providers:

```bash
# For EKS clusters
liqoctl install eks \
  --cluster-name eks-cluster-1 \
  --eks-cluster-region us-east-1

# For GKE clusters
liqoctl install gke \
  --cluster-name gke-cluster-1 \
  --project-id my-project
```

Verify installation:

```bash
kubectl get pods -n liqo
```

## Peering Clusters Together

Generate a peering configuration from cluster-1:

```bash
liqoctl generate peer-command \
  --kubeconfig ~/.kube/config
```

Output shows a command like:

```bash
liqoctl peer out-of-band cluster-1 \
  --auth-url https://10.0.1.100:443 \
  --cluster-id 5f3d2c1a-8b4e-4f9c-9d8e-7a6b5c4d3e2f \
  --auth-token eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Run this command in cluster-2 to establish peering:

```bash
# Switch to cluster-2 context
kubectl config use-context cluster-2

# Execute the peer command
liqoctl peer out-of-band cluster-1 \
  --auth-url https://10.0.1.100:443 \
  --cluster-id 5f3d2c1a-8b4e-4f9c-9d8e-7a6b5c4d3e2f \
  --auth-token eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9... \
  --kubeconfig ~/.kube/config-cluster2
```

Verify peering status:

```bash
# In cluster-1
kubectl get foreignclusters

# In cluster-2
kubectl get foreignclusters
```

Output shows peering status:

```
NAME        TYPE        OUTGOING PEERING   INCOMING PEERING   AGE
cluster-2   OutOfBand   Established        Established        2m
```

## Viewing Virtual Nodes

After peering, remote clusters appear as virtual nodes:

```bash
# In cluster-1, see cluster-2 as a virtual node
kubectl get nodes
```

Output:

```
NAME                           STATUS   ROLES           AGE   VERSION
node-1                         Ready    control-plane   10d   v1.28.0
node-2                         Ready    worker          10d   v1.28.0
liqo-cluster-2                 Ready    agent           2m    v1.28.0
```

The `liqo-cluster-2` node represents the entire remote cluster.

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
apiVersion: offloading.liqo.io/v1alpha1
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

Label remote clusters to enable offloading:

```bash
kubectl label foreigncluster cluster-2 liqo.io/enabled=true
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

Some pods run on local nodes, others on `liqo-cluster-2`.

## Configuring Resource Sharing Limits

Control how many resources remote clusters can consume:

```yaml
apiVersion: sharing.liqo.io/v1alpha1
kind: ResourceOffer
metadata:
  name: cluster-2-offer
  namespace: liqo
spec:
  clusterId: "cluster-2-id"
  resources:
    cpu: "20"
    memory: "64Gi"
    pods: "100"
    storage: "500Gi"
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

Use node selectors to control pod placement:

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
      nodeSelector:
        # Exclude virtual nodes
        liqo.io/type: "local"
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
kubectl get tunnelendpoints -n liqo
```

Check virtual node status:

```bash
kubectl describe node liqo-cluster-2
```

Monitor Liqo controller logs:

```bash
kubectl logs -n liqo deployment/liqo-controller-manager -f
```

## Implementing Disaster Recovery

Use Liqo for automatic failover. If cluster-1 fails, workloads automatically move to cluster-2:

```yaml
apiVersion: offloading.liqo.io/v1alpha1
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

Label the DR cluster:

```bash
kubectl label foreigncluster cluster-2 liqo.io/dr-site=true
```

All pods in critical-services namespace run in cluster-2, providing instant failover if cluster-1 fails.

## Best Practices

**Start with non-production workloads**: Test Liqo with development or staging environments before production.

**Monitor network latency**: Cross-cluster communication adds latency. Measure and ensure it's acceptable for your workloads.

**Set resource limits**: Use ResourceOffer to prevent one cluster from consuming all resources of another.

**Use pod topology spread**: Distribute replicas across clusters for high availability:

```yaml
spec:
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: liqo.io/cluster-id
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: webapp
```

**Plan for network policies**: Ensure network policies work correctly with cross-cluster pods.

**Test failover scenarios**: Regularly test what happens when peering breaks or a cluster becomes unavailable.

**Document cluster topology**: Maintain diagrams showing which clusters are peered and their roles (primary, DR, burst capacity, etc.).

Liqo transforms multiple Kubernetes clusters into a unified resource pool with transparent networking and pod scheduling. This simplifies multi-cluster operations by making remote clusters appear as natural extensions of your local cluster.
