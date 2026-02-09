# How to implement Cilium ClusterMesh for multi-cluster networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, Multi-Cluster, Networking, Service Mesh

Description: Implement Cilium ClusterMesh for seamless multi-cluster networking including setup, service discovery across clusters, global services, network policy enforcement, and troubleshooting connectivity issues.

---

Cilium ClusterMesh connects multiple Kubernetes clusters into a unified network, enabling pod-to-pod communication and service discovery across cluster boundaries. Unlike traditional multi-cluster approaches that rely on gateways or proxies, ClusterMesh provides direct pod connectivity using BGP or tunneling, making it ideal for distributed applications, disaster recovery, and gradual migrations.

## Understanding ClusterMesh Architecture

ClusterMesh works by connecting the control planes of multiple clusters. Each cluster runs its own Cilium agents and a clustermesh-apiserver that exposes cluster state (endpoints, services, identities) to other clusters. The agents establish secure tunnels between clusters, allowing pods to communicate directly without NAT or proxies.

Every cluster maintains its own pod CIDR and service CIDR. ClusterMesh handles routing between these ranges, ensuring that pods can reach services in remote clusters using the same mechanisms as local services. Network policies apply across clusters, so you can enforce security boundaries that span your entire infrastructure.

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
- Service CIDRs must not overlap if using global services
- Clusters must have unique IDs (1-255)
- Network connectivity between cluster nodes (VPN, VPC peering, or direct routing)

Install Cilium CLI on your management machine:

```bash
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
tar xzvf cilium-linux-amd64.tar.gz
sudo mv cilium /usr/local/bin/
rm cilium-linux-amd64.tar.gz

cilium version
```

## Installing Cilium with ClusterMesh Support

Install Cilium on the first cluster:

```bash
# Set context to cluster 1
kubectl config use-context cluster-1

# Install Cilium
cilium install \
  --cluster-name cluster-1 \
  --cluster-id 1 \
  --ipam kubernetes \
  --kube-proxy-replacement strict

# Wait for Cilium to be ready
cilium status --wait

# Verify installation
kubectl -n kube-system get pods -l k8s-app=cilium
```

Install on the second cluster:

```bash
kubectl config use-context cluster-2

cilium install \
  --cluster-name cluster-2 \
  --cluster-id 2 \
  --ipam kubernetes \
  --kube-proxy-replacement strict

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

The clustermesh-apiserver exposes an endpoint that other clusters connect to. It can use LoadBalancer, NodePort, or ClusterIP with external access configured manually.

## Connecting Clusters

Connect cluster-2 to cluster-1:

```bash
# From cluster-2 context, connect to cluster-1
kubectl config use-context cluster-2
cilium clustermesh connect \
  --context cluster-1 \
  --destination-context cluster-2

# This establishes bidirectional connectivity
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
# View clustermesh metrics
kubectl -n kube-system exec -ti ds/cilium -- cilium status --verbose | grep -A 10 "ClusterMesh"
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

Now pods in either cluster can access `web-service` and get load-balanced to pods in both clusters:

```bash
# Test from cluster-1
kubectl config use-context cluster-1
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  sh -c 'for i in $(seq 1 10); do curl -s web-service | grep "Server address"; done'

# You'll see responses from pods in both clusters
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
kubectl -n kube-system exec -ti ds/cilium -- cilium policy get
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
  cilium endpoint list

# View clustermesh connections
kubectl -n kube-system logs deployment/clustermesh-apiserver | grep -i "connection"

# Monitor global service endpoints
kubectl -n kube-system exec -ti ds/cilium -- \
  cilium service list --clustermesh-affinity
```

Export metrics to Prometheus:

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: cilium-clustermesh
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: cilium
  endpoints:
  - port: prometheus
    interval: 30s
    path: /metrics
```

Key metrics to monitor:
- `cilium_clustermesh_global_services`: Number of global services
- `cilium_clustermesh_remote_clusters`: Connected clusters
- `cilium_clustermesh_endpoints_total`: Total synchronized endpoints

## Troubleshooting ClusterMesh

Common issues and solutions:

```bash
# Issue: Clusters not connecting
# Check clustermesh-apiserver logs
kubectl -n kube-system logs deployment/clustermesh-apiserver

# Verify network connectivity between clusters
kubectl -n kube-system get svc clustermesh-apiserver

# Test connectivity from cluster-2 to cluster-1 apiserver
APISERVER_IP=$(kubectl --context cluster-1 -n kube-system get svc clustermesh-apiserver -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
kubectl --context cluster-2 run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -k https://$APISERVER_IP:2379/health

# Issue: Global services not working
# Check service annotations
kubectl get svc web-service -o yaml | grep annotations -A 5

# Verify endpoints are synchronized
kubectl -n kube-system exec -ti ds/cilium -- \
  cilium service list | grep web-service

# Issue: High latency for cross-cluster traffic
# Check if direct routing is being used
kubectl -n kube-system exec -ti ds/cilium -- cilium status | grep Routing

# Consider enabling WireGuard encryption for better performance
cilium config set enable-wireguard true
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

Clients automatically fail over to the new endpoints thanks to ClusterMesh synchronization.

Cilium ClusterMesh provides powerful multi-cluster networking capabilities with minimal operational overhead. By connecting clusters at the CNI level, you gain true pod-to-pod connectivity, unified service discovery, and consistent network policy enforcement across your entire infrastructure.
