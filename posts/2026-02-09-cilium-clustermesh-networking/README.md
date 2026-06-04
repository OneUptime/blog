# How to implement Cilium ClusterMesh for multi-cluster networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, Multi-Cluster, Networking, Service Mesh

Description: Implement Cilium ClusterMesh for seamless multi-cluster networking including setup, service discovery across clusters, global services, network policy enforcement.

---

Cilium ClusterMesh connects multiple Kubernetes clusters into a unified network, enabling pod-to-pod communication and service discovery across cluster boundaries. Unlike traditional multi-cluster approaches that rely on gateways or proxies, ClusterMesh provides direct pod connectivity using Cilium's configured datapath mode, making it ideal for distributed applications, disaster recovery, and gradual migrations.

## Understanding ClusterMesh Architecture

ClusterMesh works by connecting the control planes of multiple clusters. Each cluster runs its own Cilium agents and a clustermesh-apiserver that exposes cluster state (endpoints, services, identities) to other clusters. The agents use the synchronized state to route traffic through Cilium's configured datapath, allowing pods to communicate directly without NAT or proxies.

Every cluster maintains its own pod CIDR and service CIDR. ClusterMesh handles routing between non-overlapping pod CIDRs and synchronizes service information for global services, ensuring that pods can reach remote backends using the same mechanisms as local services. Network policy enforcement can span clusters, but policies must be applied in each cluster where they are needed.

## Prerequisites and Planning

Before deploying ClusterMesh, plan your network topology:

```bash
# Cluster 1 (us-east)

Pod CIDR: 10.1.0.0/16
Service CIDR: 10.96.0.0/16
Cluster ID: 1

# Cluster 2 (us-west)
Pod CIDR: 10.2.0.0/16
Service CIDR: 10.97.0.0/16
Cluster ID: 2
```

Key requirements:
- Pod CIDRs must not overlap between clusters
- All clusters must use the same datapath mode
- Clusters must have unique IDs (1-255)
- Network connectivity between cluster nodes (VPN, VPC peering, or direct routing)

Install Cilium CLI on your management machine:

```bash
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}

cilium version
```

## Installing Cilium with ClusterMesh Support

Install Cilium on the first cluster:

```bash
# Set context to cluster 1
kubectl config use-context cluster-1

# Install Cilium
cilium install \
  --set cluster.name=cluster-1 \
  --set cluster.id=1 \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true

# Wait for Cilium to be ready
cilium status --wait

# Verify installation
kubectl -n kube-system get pods -l k8s-app=cilium
```

Install on the second cluster:

```bash
kubectl config use-context cluster-2

cilium install \
  --set cluster.name=cluster-2 \
  --set cluster.id=2 \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true

cilium status --wait
```

## Enabling ClusterMesh

Enable ClusterMesh on both clusters. This deploys the clustermesh-apiserver and etcd:

```bash
# Enable on cluster 1
kubectl config use-context cluster-1
cilium clustermesh enable --service-type LoadBalancer

# Wait for the apiserver to be ready
kubectl -n kube-system rollout status deployment/clustermesh-apiserver

# Get the connection information
cilium clustermesh status

# Enable on cluster 2
kubectl config use-context cluster-2
cilium clustermesh enable --service-type LoadBalancer

cilium clustermesh status
```

The clustermesh-apiserver exposes an endpoint that other clusters connect to. The Cilium CLI supports LoadBalancer and NodePort service types; ClusterIP exposure requires routable ClusterIPs and is typically configured through Helm.

## Connecting Clusters

Connect cluster-1 to cluster-2:

```bash
# This establishes bidirectional connectivity
cilium clustermesh connect \
  --context cluster-1 \
  --destination-context cluster-2
```

Verify connectivity:

```bash
# Check status on cluster-1
kubectl config use-context cluster-1
cilium clustermesh status

# Expected output:
# ✅ ClusterMesh enabled
# ✅ Cluster connected to cluster-2
# ✅ Global services: [ min:0 / avg:0.0 / max:0 ]

# Check cluster-2
kubectl config use-context cluster-2
cilium clustermesh status
```

Check connectivity at the pod level:

```bash
# View ClusterMesh status from inside the Cilium agent
kubectl -n kube-system exec -ti ds/cilium -- cilium-dbg status --all-clusters
```

## Creating Global Services

Global services are accessible from all connected clusters. Create a global service by adding annotations:

```yaml
# Deploy app in cluster-1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: default
  annotations:
    service.cilium.io/global: "true"
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80
```

Apply in cluster-1:

```bash
kubectl config use-context cluster-1
kubectl apply -f web-app.yaml
```

Deploy similar app in cluster-2:

```bash
kubectl config use-context cluster-2
kubectl apply -f web-app.yaml
```

Now pods in either cluster can access `web-service` and get load-balanced to pods in both clusters. To verify which cluster served each response, serve cluster-specific content from each deployment:

```bash
# Test from cluster-1
kubectl config use-context cluster-1
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  sh -c 'for i in $(seq 1 10); do curl -s web-service; done'

# You'll see responses from pods in both clusters if each cluster serves distinct content
```

## Implementing Cross-Cluster Network Policies

Extend network policies across clusters by using cluster names in selectors:

```yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: allow-cross-cluster
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    - matchLabels:
        app: frontend
        io.cilium.k8s.policy.cluster: cluster-2
  egress:
  - toEndpoints:
    - matchLabels:
        app: database
```

The `io.cilium.k8s.policy.cluster` label allows policies to reference pods in specific clusters. Apply the policy:

```bash
kubectl apply -f cross-cluster-policy.yaml

# Verify policy is enforced
kubectl -n kube-system exec -ti ds/cilium -- cilium-dbg policy get
```

## Configuring Service Affinity

Control how global services distribute traffic:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: affinity-service
  annotations:
    service.cilium.io/global: "true"
    service.cilium.io/affinity: "local"
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
  - port: 80
```

Affinity options:
- `local`: Prefer endpoints in the same cluster
- `remote`: Prefer endpoints in remote clusters
- `none` (default): Load balance across all endpoints equally

Local affinity reduces cross-cluster traffic while maintaining failover capability when local endpoints are unavailable.

## Monitoring ClusterMesh

Check ClusterMesh metrics and connectivity:

```bash
# View detailed status
cilium clustermesh status --verbose

# Check endpoint synchronization
kubectl -n kube-system exec -ti ds/cilium -- \
  cilium-dbg endpoint list

# View clustermesh connections
kubectl -n kube-system logs deployment/clustermesh-apiserver | grep -i "connection"

# Monitor global service endpoints
kubectl -n kube-system exec -ti ds/cilium -- \
  cilium-dbg service list --clustermesh-affinity
```

Export metrics to Prometheus:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system --reuse-values \
  --set clustermesh.apiserver.metrics.enabled=true \
  --set clustermesh.apiserver.metrics.serviceMonitor.enabled=true
```

Key metrics to monitor:
- `cilium_kvstoremesh_remote_clusters`: Connected remote clusters
- `cilium_kvstoremesh_remote_cluster_readiness_status`: Readiness of each remote cluster
- `cilium_clustermesh_apiserver_kvstore_sync_errors_total`: ClusterMesh API server kvstore synchronization errors

## Troubleshooting ClusterMesh

Common issues and solutions:

```bash
# Issue: Clusters not connecting
# Check clustermesh-apiserver logs
kubectl -n kube-system logs deployment/clustermesh-apiserver

# Verify network connectivity between clusters
kubectl -n kube-system get svc clustermesh-apiserver

# Run ClusterMesh troubleshooting checks from a Cilium agent
kubectl -n kube-system exec -it ds/cilium -c cilium-agent -- \
  cilium-dbg troubleshoot clustermesh

# Issue: Global services not working
# Check service annotations
kubectl get svc web-service -o yaml | grep annotations -A 5

# Verify endpoints are synchronized
kubectl -n kube-system exec -ti ds/cilium -- \
  cilium-dbg service list | grep web-service

# Issue: High latency for cross-cluster traffic
# Check if direct routing is being used
kubectl -n kube-system exec -ti ds/cilium -- cilium-dbg status | grep Routing

# If encryption is required, enable WireGuard through Helm and restart Cilium
helm upgrade cilium cilium/cilium --namespace kube-system --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard
```

## Implementing Disaster Recovery with ClusterMesh

Use ClusterMesh for active-active or active-passive DR:

```yaml
# Primary cluster (cluster-1) - active
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: database
      region: us-east
  template:
    metadata:
      labels:
        app: database
        region: us-east
    spec:
      containers:
      - name: postgres
        image: postgres:14
---
# DR cluster (cluster-2) - standby
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
  namespace: production
spec:
  replicas: 0  # Scaled to 0 in standby mode
  selector:
    matchLabels:
      app: database
      region: us-west
  template:
    metadata:
      labels:
        app: database
        region: us-west
    spec:
      containers:
      - name: postgres
        image: postgres:14
---
apiVersion: v1
kind: Service
metadata:
  name: database
  namespace: production
  annotations:
    service.cilium.io/global: "true"
    service.cilium.io/affinity: "local"
spec:
  selector:
    app: database
  ports:
  - port: 5432
```

During failover, scale up the DR deployment:

```bash
kubectl --context cluster-2 scale deployment/database --replicas=3 -n production
```

Clients can fail over to the new network endpoints thanks to ClusterMesh synchronization, while database replication and application-level failover still need to be handled separately.

Cilium ClusterMesh provides powerful multi-cluster networking capabilities with minimal operational overhead. By connecting clusters at the CNI level, you gain true pod-to-pod connectivity, unified service discovery, and consistent network policy enforcement across your entire infrastructure.
