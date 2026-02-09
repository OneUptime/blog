# How to Set Up Network Service Mesh for Advanced L2 and L3 Kubernetes Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Service Mesh

Description: Learn how to deploy Network Service Mesh (NSM) for advanced Layer 2 and Layer 3 networking capabilities in Kubernetes, enabling complex network topologies and multi-cloud connectivity.

---

Traditional Kubernetes networking assumes a flat Layer 3 network where every pod can communicate with every other pod. This model works well for many applications but falls short for specialized workloads that need Layer 2 connectivity, network function virtualization, or complex multi-cloud topologies. Network Service Mesh (NSM) extends Kubernetes networking to support these advanced use cases without replacing your existing CNI.

This guide shows you how to deploy and use NSM for scenarios that require more sophisticated networking than standard Kubernetes provides.

## Understanding Network Service Mesh

Network Service Mesh is a CNCF project that provides a framework for composable network services in Kubernetes. Unlike traditional CNIs that provide basic connectivity, NSM allows you to:

- Create Layer 2 connections between pods across nodes
- Build Layer 3 VPNs and isolated network segments
- Connect pods to external networks with specific routing requirements
- Implement network functions like firewalls and load balancers as services
- Establish secure tunnels between clusters in different locations

NSM works alongside your existing CNI rather than replacing it. Your standard pod networking continues to function while NSM provides additional network interfaces and services on demand.

## Architecture Overview

NSM consists of several components:

**NSM Manager (nsmgr)**: Runs on each node, coordinates network service connections
**Registry**: Stores network service metadata and endpoint information
**Forwarder**: Provides the data plane (vpp, kernel, or other implementations)
**Network Service Endpoint (NSE)**: Provides a network service
**Network Service Client (NSC)**: Consumes a network service

When a pod requests a network service, NSM creates a new network interface, establishes connectivity through the forwarder, and configures routing as needed.

## Installing Network Service Mesh

Start by deploying NSM core components to your cluster.

### Deploy NSM Using Helm

```bash
# Add the NSM Helm repository
helm repo add nsm https://helm.nsm.dev/
helm repo update

# Install NSM with default settings
helm install nsm nsm/nsm \
  --namespace nsm-system \
  --create-namespace \
  --set forwarder.vpp.enabled=true \
  --set forwarder.kernel.enabled=false

# Verify installation
kubectl get pods -n nsm-system
```

You should see pods for the registry, admission webhook, and nsmgr DaemonSet.

### Understanding Forwarder Options

NSM supports different data plane implementations:

**VPP (Vector Packet Processing)**: High-performance userspace forwarding, best for throughput
**Kernel**: Uses standard Linux networking, easier to debug
**OVS**: Integration with Open vSwitch

For most production use cases, VPP provides the best performance:

```yaml
forwarder:
  vpp:
    enabled: true
    image:
      repository: ghcr.io/networkservicemesh/cmd-forwarder-vpp
      tag: v1.11.0
```

## Creating a Simple Layer 3 Network Service

Let's start with a basic example that creates an isolated Layer 3 network between pods.

### Define a Network Service

Create a NetworkService resource:

```yaml
apiVersion: networkservicemesh.io/v1
kind: NetworkService
metadata:
  name: isolated-network
  namespace: default
spec:
  payload: IP
  matches:
    - sourceSelector:
        app: client
      destinationSelector:
        app: server
      route:
        - destination: 10.100.1.0/24
```

This defines a network service that provides IP connectivity on the 10.100.1.0/24 subnet.

### Deploy a Network Service Endpoint

The endpoint provides the actual network service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nse-isolated
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nse-isolated
  template:
    metadata:
      labels:
        app: nse-isolated
    spec:
      containers:
      - name: nse
        image: ghcr.io/networkservicemesh/cmd-nse-icmp-responder:v1.11.0
        env:
        - name: NSM_NETWORK_SERVICES
          value: "isolated-network"
        - name: NSM_CIDR_PREFIX
          value: "10.100.1.0/24"
        - name: NSM_REGISTER_SERVICE
          value: "true"
```

### Deploy a Client Pod

Create a client that consumes the network service:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: client
  annotations:
    networkservicemesh.io: isolated-network
  labels:
    app: client
spec:
  containers:
  - name: alpine
    image: alpine:latest
    command: ["/bin/sh", "-c", "sleep 3600"]
```

The annotation `networkservicemesh.io: isolated-network` tells NSM to connect this pod to the network service.

### Verify Connectivity

Check that the client received a new network interface:

```bash
# Exec into the client pod
kubectl exec -it client -- sh

# List network interfaces
ip addr show

# You should see nsm-1 or similar with IP from 10.100.1.0/24
# Example: nsm-1: 10.100.1.2/24

# Test connectivity to the network service endpoint
ping 10.100.1.1
```

## Creating Layer 2 Network Services

Layer 2 connectivity allows pods to communicate at the Ethernet level, useful for network functions and legacy applications.

### Define L2 Network Service

```yaml
apiVersion: networkservicemesh.io/v1
kind: NetworkService
metadata:
  name: l2-bridge
  namespace: default
spec:
  payload: ETHERNET
  matches:
    - sourceSelector:
        layer: "2"
      route: []
```

### Deploy L2 Network Service Endpoint

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nse-l2-bridge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nse-l2-bridge
  template:
    metadata:
      labels:
        app: nse-l2-bridge
        layer: "2"
    spec:
      containers:
      - name: nse
        image: ghcr.io/networkservicemesh/cmd-nse-vlan-vpp:v1.11.0
        env:
        - name: NSM_NETWORK_SERVICES
          value: "l2-bridge"
        - name: NSM_VLAN_ID
          value: "100"
```

### Connect Multiple Clients to L2 Service

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: l2-client-1
  annotations:
    networkservicemesh.io: l2-bridge
  labels:
    layer: "2"
spec:
  containers:
  - name: ubuntu
    image: ubuntu:22.04
    command: ["/bin/bash", "-c", "apt-get update && apt-get install -y iproute2 iputils-ping && sleep 3600"]
---
apiVersion: v1
kind: Pod
metadata:
  name: l2-client-2
  annotations:
    networkservicemesh.io: l2-bridge
  labels:
    layer: "2"
spec:
  containers:
  - name: ubuntu
    image: ubuntu:22.04
    command: ["/bin/bash", "-c", "apt-get update && apt-get install -y iproute2 iputils-ping && sleep 3600"]
```

Configure IP addresses manually on each client:

```bash
# On l2-client-1
kubectl exec -it l2-client-1 -- bash
ip addr add 192.168.100.10/24 dev nsm-1
ip link set nsm-1 up

# On l2-client-2
kubectl exec -it l2-client-2 -- bash
ip addr add 192.168.100.11/24 dev nsm-1
ip link set nsm-1 up

# Test L2 connectivity
ping 192.168.100.11
```

The pods communicate over a Layer 2 bridge, receiving raw Ethernet frames.

## Connecting to External Networks

NSM can connect pods to networks outside the cluster, such as physical networks or VPNs.

### External Network Service Endpoint

Deploy an NSE on a specific node with access to the external network:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nse-external-bridge
spec:
  selector:
    matchLabels:
      app: nse-external
  template:
    metadata:
      labels:
        app: nse-external
    spec:
      nodeSelector:
        external-network: "true"  # Only nodes with this label
      hostNetwork: true
      containers:
      - name: nse
        image: ghcr.io/networkservicemesh/cmd-nse-kernel:v1.11.0
        env:
        - name: NSM_NETWORK_SERVICES
          value: "external-net"
        - name: NSM_CIDR_PREFIX
          value: "10.200.0.0/24"
        - name: NSM_DEVICE_NAME
          value: "eth1"  # Physical interface connected to external network
        securityContext:
          privileged: true
```

Label the appropriate nodes:

```bash
kubectl label node worker-1 external-network=true
```

### Client Connecting to External Network

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: external-client
  annotations:
    networkservicemesh.io: external-net
spec:
  containers:
  - name: alpine
    image: alpine:latest
    command: ["/bin/sh", "-c", "apk add --no-cache curl && sleep 3600"]
```

This pod receives an interface connected to the external network and can reach external resources directly.

## Multi-Cluster Networking with NSM

Connect services across Kubernetes clusters using NSM's floating interdomain feature.

### Register Remote Network Service

In cluster A, export a network service:

```yaml
apiVersion: networkservicemesh.io/v1
kind: NetworkService
metadata:
  name: cross-cluster-service
spec:
  payload: IP
  matches:
    - sourceSelector: {}
      destinationSelector:
        cluster: "cluster-b"
      route:
        - destination: 10.150.0.0/24
```

### Configure NSM for Inter-Cluster Communication

Set up a secure tunnel between clusters using WireGuard or IPSec:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nsm-config
  namespace: nsm-system
data:
  nsm.yaml: |
    registry:
      url: "tcp://registry.cluster-b.example.com:5001"
    tunnel:
      type: wireguard
      privateKey: <base64-encoded-key>
      peerPublicKey: <peer-public-key>
      peerEndpoint: "203.0.113.50:51820"
```

### Consume Cross-Cluster Service

In cluster A, pods can now request services from cluster B:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cross-cluster-client
  annotations:
    networkservicemesh.io: cross-cluster-service
spec:
  containers:
  - name: alpine
    image: alpine:latest
    command: ["/bin/sh", "-c", "sleep 3600"]
```

## Implementing Network Functions as Services

NSM enables network function virtualization by deploying functions as services that process traffic.

### Deploy a Firewall Network Function

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nse-firewall
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nse-firewall
  template:
    metadata:
      labels:
        app: nse-firewall
    spec:
      containers:
      - name: firewall
        image: ghcr.io/networkservicemesh/cmd-nse-firewall-vpp:v1.11.0
        env:
        - name: NSM_NETWORK_SERVICES
          value: "firewall-service"
        - name: NSM_FIREWALL_RULES
          value: |
            permit tcp any any port 80
            permit tcp any any port 443
            deny ip any any
```

### Chain Network Services

Create a service chain where traffic flows through multiple network functions:

```yaml
apiVersion: networkservicemesh.io/v1
kind: NetworkService
metadata:
  name: secure-path
spec:
  payload: IP
  matches:
    - sourceSelector:
        security: "high"
      route:
        - via: firewall-service
        - via: ids-service
        - destination: application-network
```

Pods annotated with `security: high` will have their traffic routed through both the firewall and intrusion detection system before reaching the application network.

## Monitoring and Troubleshooting

### Check NSM Component Status

```bash
# List all NSM components
kubectl get pods -n nsm-system

# Check nsmgr logs
kubectl logs -n nsm-system -l app=nsmgr

# View registry contents
kubectl logs -n nsm-system -l app=nsm-registry
```

### Debug Network Service Connections

```bash
# List network services
kubectl get networkservices

# Describe a network service
kubectl describe networkservice isolated-network

# Check NSE endpoints
kubectl get pods -l app=nse-isolated -o wide
```

### Inspect NSM Interfaces in Pods

```bash
# Exec into a client pod
kubectl exec -it client -- sh

# List all interfaces
ip addr show

# Check routing table
ip route show

# View NSM-specific routes
ip route show table all
```

### Common Issues

**Pod doesn't receive NSM interface**:
- Verify the annotation is correct
- Check nsmgr is running on the node
- Review nsmgr logs for errors

**Connectivity fails between NSM interfaces**:
- Verify the network service endpoint is running
- Check IP addressing matches the CIDR configuration
- Ensure forwarder pods are healthy

**Performance issues**:
- Consider switching to VPP forwarder if using kernel
- Check for resource constraints on forwarder pods
- Verify MTU settings are appropriate for your network

## Performance Optimization

### Configure VPP for High Throughput

```yaml
forwarder:
  vpp:
    enabled: true
    resources:
      requests:
        cpu: "2"
        memory: "2Gi"
      limits:
        cpu: "4"
        memory: "4Gi"
    hugepages:
      enabled: true
      size: 2Mi
      count: 512
```

### Enable Jumbo Frames

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nsm-forwarder-config
  namespace: nsm-system
data:
  forwarder.yaml: |
    mtu: 9000
```

## Conclusion

Network Service Mesh extends Kubernetes networking beyond the basic flat Layer 3 model, enabling advanced use cases like Layer 2 connectivity, network function virtualization, and multi-cloud networking. By working alongside your existing CNI, NSM provides these capabilities without disrupting your standard pod networking.

Whether you're running telco workloads that require Layer 2 connectivity, implementing security functions as network services, or connecting Kubernetes clusters across different cloud providers, NSM provides the flexible networking framework you need. Start with simple Layer 3 services to understand the concepts, then expand to more complex topologies as your requirements grow.
