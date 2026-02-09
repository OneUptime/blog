# How to Configure Cilium ClusterMesh for Multi-Cluster Pod Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, ClusterMesh, Multi-Cluster, Networking

Description: Set up Cilium ClusterMesh to enable pod-to-pod networking across multiple Kubernetes clusters for high availability, disaster recovery, and geographic distribution of workloads.

---

Running multiple Kubernetes clusters improves reliability and enables geographic distribution, but it creates a challenge for multi-cluster communication. Cilium ClusterMesh solves this by creating a flat network across clusters, allowing pods in one cluster to communicate directly with pods in another as if they were in the same cluster.

## Understanding ClusterMesh

ClusterMesh connects multiple Kubernetes clusters at the network layer. It provides:

- Direct pod-to-pod connectivity across clusters without gateways
- Service discovery across clusters
- Network policy enforcement across cluster boundaries
- Load balancing across multiple clusters
- Transparent failover between clusters

This differs from service mesh solutions that operate at Layer 7. ClusterMesh works at Layer 3/4, making it more performant and transparent to applications.

## Prerequisites

Before setting up ClusterMesh, ensure:

1. All clusters run Cilium as the CNI
2. Clusters use non-overlapping pod CIDR ranges
3. Clusters use non-overlapping node IP ranges
4. Network connectivity exists between cluster nodes (VPN, VPC peering, or direct routing)
5. Each cluster has a unique name and ID

## Installing Cilium with ClusterMesh Support

Install Cilium on each cluster with ClusterMesh enabled:

```bash
# Install Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz{,.sha256sum}
sha256sum --check cilium-linux-amd64.tar.gz.sha256sum
sudo tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin
rm cilium-linux-amd64.tar.gz{,.sha256sum}
```

Install Cilium on the first cluster:

```bash
# Switch to first cluster context
kubectl config use-context cluster-1

# Install Cilium with ClusterMesh enabled
cilium install \
  --cluster-name cluster-1 \
  --cluster-id 1 \
  --ipam kubernetes \
  --kube-proxy-replacement strict
```

Important configuration values:

- `cluster-name`: Unique identifier for the cluster (DNS-compatible)
- `cluster-id`: Unique integer ID (1-255)
- `ipam`: IP address management mode (kubernetes, cluster-pool, or azure)
- `kube-proxy-replacement`: Use Cilium for kube-proxy functionality

Verify installation:

```bash
cilium status --wait
```

Install on the second cluster with different ID and pod CIDR:

```bash
# Switch to second cluster
kubectl config use-context cluster-2

cilium install \
  --cluster-name cluster-2 \
  --cluster-id 2 \
  --ipam kubernetes \
  --kube-proxy-replacement strict
```

## Enabling ClusterMesh

Enable ClusterMesh on both clusters:

```bash
# On cluster-1
kubectl config use-context cluster-1
cilium clustermesh enable

# On cluster-2
kubectl config use-context cluster-2
cilium clustermesh enable
```

This creates a ClusterMesh API server in each cluster that synchronizes service and endpoint information.

Verify ClusterMesh is ready:

```bash
cilium clustermesh status --wait
```

You should see the ClusterMesh service and pods running:

```bash
kubectl get pods -n kube-system -l k8s-app=clustermesh-apiserver
```

## Connecting Clusters

Connect the two clusters:

```bash
# From cluster-1, connect to cluster-2
kubectl config use-context cluster-1
cilium clustermesh connect --context cluster-2

# Verify connection
cilium clustermesh status
```

The status should show cluster-2 as connected and ready:

```
ClusterMesh: OK
  - cluster-2: connected, 15 services, 3/3 endpoints
```

The connection is bidirectional, so you don't need to run the command from cluster-2.

## Verifying Pod-to-Pod Connectivity

Test direct pod-to-pod communication:

```yaml
# test-app.yaml (deploy to both clusters)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: echo-server
  template:
    metadata:
      labels:
        app: echo-server
    spec:
      containers:
      - name: echo
        image: hashicorp/http-echo
        args:
        - "-text=Cluster $(CLUSTER_NAME)"
        env:
        - name: CLUSTER_NAME
          value: "cluster-1"  # Change to cluster-2 in second cluster
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: echo-server
  annotations:
    service.cilium.io/global: "true"  # Enable global service
spec:
  type: ClusterIP
  selector:
    app: echo-server
  ports:
  - port: 80
    targetPort: 5678
```

Deploy to both clusters:

```bash
# Cluster 1
kubectl config use-context cluster-1
kubectl apply -f test-app.yaml

# Cluster 2 (change CLUSTER_NAME env var first)
kubectl config use-context cluster-2
kubectl apply -f test-app.yaml
```

Test connectivity from cluster-1:

```bash
kubectl config use-context cluster-1
kubectl run test-client --image=curlimages/curl -it --rm -- sh

# Inside the pod
for i in {1..10}; do
  curl http://echo-server.default.svc.cluster.local
  sleep 1
done
```

You should see responses from both cluster-1 and cluster-2 pods, proving cross-cluster load balancing works.

## Configuring Global Services

The annotation `service.cilium.io/global: "true"` makes a service global, meaning it load balances across all clusters. Without it, the service only includes local endpoints.

Create a global service explicitly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-global
  annotations:
    service.cilium.io/global: "true"
    service.cilium.io/shared: "true"  # Share service definition across clusters
spec:
  selector:
    app: api
  ports:
  - port: 443
    targetPort: 8443
```

Deploy the same service definition to all clusters in ClusterMesh. Cilium automatically merges the endpoints.

## Affinity-Based Routing

By default, global services load balance randomly across all clusters. Configure affinity to prefer local endpoints:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-with-affinity
  annotations:
    service.cilium.io/global: "true"
    service.cilium.io/affinity: "local"  # Prefer local, failover to remote
spec:
  selector:
    app: api
  ports:
  - port: 443
```

Affinity modes:

- `local`: Use local endpoints if available, failover to remote
- `remote`: Prefer remote endpoints (useful for active-passive scenarios)
- `none`: Random load balancing across all clusters (default)

## Network Policy Across Clusters

Cilium network policies work across cluster boundaries:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-from-cluster-1
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: database
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: api-server
        io.cilium.k8s.policy.cluster: cluster-1  # Only from cluster-1
```

This policy allows database pods to receive traffic only from api-server pods in cluster-1, even though the database might be in cluster-2.

## Implementing Multi-Cluster HA

Use ClusterMesh for active-active high availability:

```yaml
# Deploy application to both clusters
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: critical-app
  template:
    metadata:
      labels:
        app: critical-app
    spec:
      containers:
      - name: app
        image: myapp:latest
---
apiVersion: v1
kind: Service
metadata:
  name: critical-app
  annotations:
    service.cilium.io/global: "true"
    service.cilium.io/affinity: "local"
spec:
  selector:
    app: critical-app
  ports:
  - port: 80
    targetPort: 8080
```

Deploy to all clusters. If one cluster fails, traffic automatically routes to surviving clusters.

## Monitoring ClusterMesh

Monitor ClusterMesh health:

```bash
# Check overall status
cilium clustermesh status

# View detailed connection info
kubectl exec -n kube-system ds/cilium -- cilium clustermesh status --verbose
```

Export Prometheus metrics:

```bash
# Port forward to Cilium agent
kubectl port-forward -n kube-system ds/cilium 9090:9090

# Query metrics
curl http://localhost:9090/metrics | grep clustermesh
```

Key metrics:

- `cilium_clustermesh_remote_clusters`: Number of connected clusters
- `cilium_clustermesh_endpoints_total`: Total endpoints across clusters
- `cilium_clustermesh_global_services`: Number of global services
- `cilium_clustermesh_remote_cluster_readiness`: Cluster connection status

## Troubleshooting ClusterMesh

If cross-cluster connectivity fails:

### Check ClusterMesh Status

```bash
cilium clustermesh status
```

Look for:
- All clusters showing as "connected"
- Non-zero endpoint counts
- No error messages

### Verify Network Connectivity

Test connectivity between cluster API servers:

```bash
# Get ClusterMesh API server IPs
kubectl get svc -n kube-system clustermesh-apiserver

# From cluster-1 node, test connectivity to cluster-2 API server
telnet <cluster-2-apiserver-ip> 2379
```

### Check Certificate Trust

ClusterMesh uses mTLS for cluster-to-cluster communication:

```bash
# View ClusterMesh certificates
kubectl get secret -n kube-system clustermesh-apiserver-remote-cert -o yaml

# Check certificate validity
kubectl get secret -n kube-system clustermesh-apiserver-remote-cert -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

### Examine Logs

```bash
# ClusterMesh API server logs
kubectl logs -n kube-system deployment/clustermesh-apiserver -f

# Cilium agent logs (look for clustermesh entries)
kubectl logs -n kube-system ds/cilium -f | grep clustermesh
```

### Verify Pod CIDR Non-Overlap

```bash
# Check pod CIDR in each cluster
kubectl cluster-info dump | grep -m 1 cluster-cidr
```

Overlapping CIDRs cause routing conflicts.

## Advanced Configuration

### Custom API Server Exposure

Expose ClusterMesh API server through LoadBalancer:

```bash
cilium clustermesh enable --service-type LoadBalancer
```

Useful when clusters are in different networks without direct node connectivity.

### Configuring External IPs

For clusters behind NAT:

```bash
cilium clustermesh enable \
  --apiserver-advertise-address <external-ip>
```

### IPsec Encryption

Enable encryption for cross-cluster traffic:

```bash
cilium install \
  --cluster-name cluster-1 \
  --cluster-id 1 \
  --encryption ipsec
```

Generate and share IPsec keys across clusters:

```bash
kubectl create secret generic cilium-ipsec-keys \
  --from-literal=keys="3 rfc4106(gcm(aes)) $(echo $(dd if=/dev/urandom count=20 bs=1 2> /dev/null | xxd -p -c 64)) 128"
```

## Best Practices

When implementing ClusterMesh:

- Use non-overlapping pod and service CIDRs across all clusters
- Implement proper firewall rules allowing cluster-to-cluster communication
- Monitor ClusterMesh metrics for connectivity issues
- Use affinity settings appropriate to your workload
- Test failover scenarios regularly
- Document cluster IDs and names clearly
- Implement network policies that work across clusters
- Use IPsec encryption for clusters over untrusted networks
- Keep Cilium versions consistent across clusters
- Plan for certificate rotation

ClusterMesh transforms multiple isolated Kubernetes clusters into a unified networking fabric, enabling true multi-cluster applications with seamless failover and geographic distribution.
