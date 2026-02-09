# How to Set Up Submariner for Cross-Cluster Service Discovery and L3 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Networking

Description: Learn how to deploy Submariner to establish Layer 3 connectivity and service discovery between Kubernetes clusters across different networks, clouds, or data centers for true multi-cluster applications.

---

Running applications across multiple Kubernetes clusters introduces significant networking challenges. Pods in one cluster cannot reach services in another cluster, DNS resolution fails across cluster boundaries, and network policies don't extend beyond a single cluster. Submariner solves these problems by creating encrypted tunnels between clusters and enabling cross-cluster service discovery.

This guide walks you through deploying Submariner to connect multiple Kubernetes clusters, whether they run in different clouds, data centers, or network segments.

## What is Submariner?

Submariner is a CNCF sandbox project that enables direct networking between pods and services across Kubernetes clusters. It provides:

1. **Cross-Cluster L3 Connectivity**: Direct pod-to-pod communication between clusters
2. **Service Discovery**: DNS-based discovery of services in remote clusters
3. **Network Encryption**: Secure tunnels using WireGuard or IPsec
4. **Multi-Cloud Support**: Works across any network topology
5. **NetworkPolicy Federation**: Extend security policies across clusters

Unlike mesh solutions that require sidecars, Submariner operates at the infrastructure level, making it transparent to applications.

## Architecture Components

Submariner consists of several components:

**Broker**: Coordinates information sharing between clusters (runs in one cluster)
**Gateway Engine**: Establishes tunnels between clusters (runs on gateway nodes)
**Route Agent**: Configures routing on all nodes (runs as DaemonSet)
**Lighthouse**: Provides cross-cluster service discovery (DNS)
**Globalnet**: Handles overlapping pod CIDR ranges (optional)

The Gateway Engine on designated nodes creates encrypted tunnels to peer clusters, while Route Agents ensure all nodes can route traffic to remote clusters.

## Prerequisites and Planning

Before deploying Submariner, you need:

### Network Requirements

- **Non-overlapping Pod CIDRs**: Each cluster must use different pod IP ranges (unless using Globalnet)
- **Non-overlapping Service CIDRs**: Service IP ranges should not conflict
- **Gateway Connectivity**: Gateway nodes need public IPs or a way to reach each other
- **Open Ports**: UDP/4500 (IPsec NAT-T) or UDP/4800 (WireGuard) and UDP/4490 (VXLAN)

### Cluster Configuration

For this guide, I'll use two clusters:

```bash
# Cluster A
Pod CIDR: 10.244.0.0/16
Service CIDR: 10.96.0.0/16
Gateway Node: 203.0.113.10

# Cluster B
Pod CIDR: 10.245.0.0/16
Service CIDR: 10.97.0.0/16
Gateway Node: 203.0.113.20
```

## Installing Submariner CLI

Download and install the subctl command-line tool:

```bash
# Download latest version
curl -Ls https://get.submariner.io | bash

# Add to PATH
export PATH=$PATH:~/.local/bin

# Verify installation
subctl version
```

The subctl tool simplifies Submariner deployment and troubleshooting.

## Setting Up the Broker

The broker facilitates information exchange between clusters. Deploy it in one of your clusters (often a management cluster).

### Deploy Broker in Cluster A

```bash
# Switch to cluster A context
kubectl config use-context cluster-a

# Deploy the broker
subctl deploy-broker --kubeconfig ~/.kube/config

# This creates:
# - submariner-k8s-broker namespace
# - ServiceAccounts and RBAC for cluster registration
# - CRDs for sharing cluster information
```

The broker doesn't handle data plane traffic, only control plane metadata.

### Extract Broker Information

After deploying the broker, extract the broker-info.subm file:

```bash
subctl show connections --kubeconfig ~/.kube/config \
  --context cluster-a > /tmp/broker-info.subm
```

This file contains credentials and connection information needed by other clusters.

## Joining Clusters to the Broker

Now join both clusters to the broker.

### Join Cluster A

```bash
kubectl config use-context cluster-a

subctl join broker-info.subm \
  --kubeconfig ~/.kube/config \
  --clusterid cluster-a \
  --cable-driver wireguard \
  --natt=false \
  --enable-globalnet=false
```

Let me explain the flags:

- `--clusterid`: Unique identifier for this cluster
- `--cable-driver`: Tunnel technology (wireguard or libreswan for IPsec)
- `--natt`: Enable NAT traversal if gateways are behind NAT
- `--enable-globalnet`: Required only if pod CIDRs overlap

### Join Cluster B

```bash
kubectl config use-context cluster-b

subctl join broker-info.subm \
  --kubeconfig ~/.kube/config \
  --clusterid cluster-b \
  --cable-driver wireguard \
  --natt=false \
  --enable-globalnet=false
```

### Designate Gateway Nodes

Submariner automatically selects gateway nodes, but you can control this with labels:

```bash
# In cluster A
kubectl label node gateway-node-1 submariner.io/gateway=true

# In cluster B
kubectl label node gateway-node-2 submariner.io/gateway=true
```

Gateway nodes need:
- Public IP or reachable IP by peer cluster gateways
- Open firewall ports for tunnel establishment
- Adequate CPU and network bandwidth

## Verifying Connectivity

Check that clusters can communicate through the tunnels.

### Check Gateway Status

```bash
# Switch to cluster A
kubectl config use-context cluster-a

# View gateway status
subctl show connections
```

You should see output like:

```
Cluster "cluster-a"
 ✓ Showing Connections
GATEWAY                      CLUSTER    REMOTE IP       CABLE DRIVER  SUBNETS                   STATUS
gateway-node-1               cluster-a  203.0.113.10    wireguard     10.244.0.0/16,10.96.0.0/16  connected
gateway-node-2               cluster-b  203.0.113.20    wireguard     10.245.0.0/16,10.97.0.0/16  connected
```

### Verify Network Connectivity

```bash
# Check if routes are programmed
subctl show networks
```

### Run Connectivity Tests

Submariner includes end-to-end tests:

```bash
# Run connectivity tests between clusters
subctl verify --kubeconfig ~/.kube/config \
  --context cluster-a \
  --tocontext cluster-b \
  --verbose

# This tests:
# - Gateway connectivity
# - Pod-to-Pod communication across clusters
# - Service discovery
```

## Enabling Cross-Cluster Service Discovery

Lighthouse provides DNS-based service discovery across clusters.

### Deploy Lighthouse

Lighthouse is automatically deployed when you join clusters, but verify it's running:

```bash
kubectl get pods -n submariner-operator -l app=submariner-lighthouse
```

### Export Services for Discovery

Services are not automatically available across clusters. You must explicitly export them:

```bash
# In cluster A, export the nginx service
kubectl label service nginx submariner.io/export=true -n default
```

This makes the service discoverable from other clusters.

### Create ServiceExport Resources

Alternatively, use ServiceExport resources:

```yaml
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: nginx
  namespace: default
```

Apply in cluster A:

```bash
kubectl apply -f service-export.yaml
```

### Access Services from Remote Clusters

From cluster B, access the exported service using clusterset DNS:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: client
  namespace: default
spec:
  containers:
  - name: alpine
    image: alpine:latest
    command:
    - /bin/sh
    - -c
    - |
      apk add --no-cache curl
      # Access service in cluster A using clusterset DNS
      # Format: <service>.<namespace>.svc.clusterset.local
      while true; do
        curl nginx.default.svc.clusterset.local
        sleep 5
      done
```

Apply in cluster B:

```bash
kubectl apply -f client-pod.yaml

# Check logs to verify connectivity
kubectl logs client -f
```

The DNS name `nginx.default.svc.clusterset.local` resolves to the nginx service in cluster A.

## Configuring Globalnet for Overlapping CIDRs

If your clusters have overlapping pod or service CIDRs, enable Globalnet.

### Deploy with Globalnet Enabled

```bash
# Deploy broker with Globalnet support
subctl deploy-broker --globalnet

# Join clusters with Globalnet
subctl join broker-info.subm \
  --clusterid cluster-a \
  --cable-driver wireguard \
  --enable-globalnet \
  --globalnet-cidr 242.0.0.0/16
```

Globalnet assigns a unique global CIDR to each cluster and performs NAT at the gateway.

### Assign Global IPs to Services

```bash
# Export service with global IP
kubectl label service nginx submariner.io/export=true

# Check assigned global IP
kubectl get globalingressip nginx -n default
```

Other clusters access the service through its global IP, which Submariner translates.

## Advanced Configuration

### Configure Specific Gateway Instances

Run multiple gateways for redundancy:

```bash
# Label multiple nodes as gateways
kubectl label node gateway-1 submariner.io/gateway=true
kubectl label node gateway-2 submariner.io/gateway=true

# Configure gateway count
subctl join broker-info.subm \
  --clusterid cluster-a \
  --cable-driver wireguard \
  --gateway-count 2
```

### Use IPsec Instead of WireGuard

For environments where WireGuard is unavailable:

```bash
subctl join broker-info.subm \
  --clusterid cluster-a \
  --cable-driver libreswan \
  --ipsec-psk-from secret:submariner-operator/submariner-ipsec-psk
```

IPsec provides similar security but with different performance characteristics.

### Configure NAT Traversal

When gateways are behind NAT:

```bash
subctl join broker-info.subm \
  --clusterid cluster-a \
  --cable-driver wireguard \
  --natt \
  --natt-port 4501
```

This enables UDP encapsulation for traversing NAT devices.

## Federating Network Policies

Extend Kubernetes NetworkPolicies across clusters using Submariner's policy federation.

### Create Cross-Cluster Network Policy

```yaml
apiVersion: submarine.io/v1alpha1
kind: NetworkPolicy
metadata:
  name: allow-from-cluster-b
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: nginx
  ingress:
  - from:
    - clusterSelector:
        matchLabels:
          cluster: cluster-b
    ports:
    - protocol: TCP
      port: 80
```

This policy allows traffic to nginx pods only from pods in cluster-b.

### Apply Cluster Labels

Label clusters for policy matching:

```bash
# In cluster B
kubectl label cluster cluster-b cluster=cluster-b
```

## Monitoring and Troubleshooting

### Check Submariner Component Health

```bash
# View all Submariner components
kubectl get pods -n submariner-operator

# Expected components:
# - submariner-gateway (on gateway nodes)
# - submariner-routeagent (on all nodes)
# - submariner-lighthouse-agent
# - submariner-lighthouse-coredns
```

### View Gateway Logs

```bash
# Gateway engine logs
kubectl logs -n submariner-operator -l app=submariner-gateway

# Look for:
# - Tunnel establishment messages
# - Cable driver status
# - Connection errors
```

### Diagnose Connectivity Issues

```bash
# Run diagnostics
subctl diagnose all

# Check firewall rules
subctl diagnose firewall inter-cluster

# Verify deployment
subctl show all
```

### Common Issues

**Tunnel not establishing**:
- Verify gateway nodes can reach each other
- Check firewall rules allow UDP/4500 or UDP/4800
- Review gateway logs for errors

**DNS resolution fails**:
- Ensure services are exported with submariner.io/export=true
- Check lighthouse-coredns pods are running
- Verify CoreDNS configuration includes lighthouse plugin

**Asymmetric routing**:
- Ensure route agents run on all nodes
- Check routes are properly programmed with `ip route show`
- Verify CNI compatibility

## Performance Considerations

### Gateway Resource Allocation

Gateways handle all cross-cluster traffic, so size appropriately:

```yaml
apiVersion: submariner.io/v1alpha1
kind: Gateway
metadata:
  name: gateway
spec:
  replicas: 2
  resources:
    requests:
      cpu: "2"
      memory: "2Gi"
    limits:
      cpu: "4"
      memory: "4Gi"
```

### WireGuard vs IPsec Performance

WireGuard typically offers better performance:

- **WireGuard**: 20-30% less CPU overhead, simpler codebase
- **IPsec**: More mature, better compatibility with legacy systems

Choose based on your performance requirements and environment constraints.

### Multiple Gateway Nodes

Distribute load across multiple gateways:

```bash
# Configure 3 gateway nodes for high throughput
subctl join broker-info.subm \
  --clusterid cluster-a \
  --cable-driver wireguard \
  --gateway-count 3
```

## Real-World Use Cases

### Multi-Region Application Deployment

Deploy stateful services in one region, stateless services in another:

```yaml
# In cluster A (us-east): Database
apiVersion: v1
kind: Service
metadata:
  name: postgres
  labels:
    submariner.io/export: "true"
spec:
  selector:
    app: postgres
  ports:
  - port: 5432

---
# In cluster B (us-west): Application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: DB_HOST
          value: "postgres.default.svc.clusterset.local"
```

### Disaster Recovery Setup

Maintain active-passive clusters:

```bash
# Primary cluster exports all services
kubectl label service myapp submariner.io/export=true -n production

# DR cluster can immediately access services if primary fails
# Update DNS to point to DR cluster gateway
```

### Edge Computing with Central Services

Edge clusters consume services from central cluster:

```bash
# Central cluster: ML inference service
# Edge clusters: Data collection pods that call inference API
# Submariner enables direct communication without exposing services publicly
```

## Conclusion

Submariner transforms multiple independent Kubernetes clusters into a cohesive multi-cluster environment with transparent networking and service discovery. Whether you're building multi-region applications, implementing disaster recovery, or connecting edge locations to central services, Submariner provides the connectivity layer you need.

By establishing encrypted Layer 3 tunnels and extending service discovery across clusters, Submariner enables truly distributed applications without the complexity of service mesh sidecars or application-level federation logic. Start with a simple two-cluster setup to understand the concepts, then expand to more complex multi-cluster topologies as your needs grow.
