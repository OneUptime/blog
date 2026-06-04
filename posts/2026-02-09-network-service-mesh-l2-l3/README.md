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
**Forwarder**: Provides the data plane (VPP, OVS, or another forwarder implementation)
**Network Service Endpoint (NSE)**: Provides a network service
**Network Service Client (NSC)**: Consumes a network service

When a pod requests a network service, NSM creates a new network interface, establishes connectivity through the forwarder, and configures routing as needed.

## Installing Network Service Mesh

Start by deploying NSM core components to your cluster.

### Deploy NSM Using Kustomize

```bash
# Install SPIRE first if your cluster does not already have it
kubectl apply -k https://github.com/networkservicemesh/deployments-k8s/examples/spire/single_cluster?ref=v1.14.0

# Install NSM core components for the basic single-cluster examples
kubectl apply -k https://github.com/networkservicemesh/deployments-k8s/examples/basic?ref=v1.14.0

# Wait for the admission webhook
WH=$(kubectl get pods -l app=admission-webhook-k8s -n nsm-system --template '{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}')
kubectl wait --for=condition=ready --timeout=1m pod ${WH} -n nsm-system

# Verify installation
kubectl get pods -n nsm-system
```

You should see pods for the registry, admission webhook, and nsmgr DaemonSet.

### Understanding Forwarder Options

NSM supports different data plane implementations:

**VPP (Vector Packet Processing)**: High-performance userspace forwarding, best for throughput
**OVS**: Integration with Open vSwitch
**Kernel, memif, VLAN, and other mechanisms**: Connection mechanisms that clients, endpoints, and forwarders can negotiate for specific use cases

For most production use cases, VPP provides the best performance. In the upstream basic deployment, the VPP forwarder runs as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: forwarder-vpp
spec:
  selector:
    matchLabels:
      app: forwarder-vpp
  template:
    metadata:
      labels:
        app: forwarder-vpp
        spiffe.io/spiffe-id: "true"
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: forwarder-vpp
        image: ghcr.io/networkservicemesh/cmd-forwarder-vpp:v1.14.0
        securityContext:
          privileged: true
        env:
        - name: NSM_CONNECT_TO
          value: unix:///var/lib/networkservicemesh/nsm.io.sock
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
```

This defines a network service that provides IP connectivity. The endpoint assigns addresses from the CIDR it advertises.

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
        image: ghcr.io/networkservicemesh/cmd-nse-icmp-responder:v1.14.0
        env:
        - name: NSM_SERVICE_NAMES
          value: "isolated-network"
        - name: NSM_CIDR_PREFIX
          value: "10.100.1.0/31"
        - name: NSM_PAYLOAD
          value: "IP"
        - name: NSM_CONNECT_TO
          value: unix:///var/lib/networkservicemesh/nsm.io.sock
        volumeMounts:
        - name: nsm-socket
          mountPath: /var/lib/networkservicemesh
          readOnly: true
      volumes:
      - name: nsm-socket
        hostPath:
          path: /var/lib/networkservicemesh
          type: DirectoryOrCreate
```

### Deploy a Client Pod

Create a client that consumes the network service:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: client
  annotations:
    networkservicemesh.io: kernel://isolated-network/nsm-1
  labels:
    app: client
spec:
  containers:
  - name: alpine
    image: alpine:latest
    command: ["/bin/sh", "-c", "sleep 3600"]
```

The annotation `networkservicemesh.io: kernel://isolated-network/nsm-1` tells NSM to connect this pod to the network service and request a kernel interface named `nsm-1`.

### Verify Connectivity

Check that the client received a new network interface:

```bash
# Exec into the client pod
kubectl exec -it client -- sh

# List network interfaces
ip addr show

# You should see nsm-1 or similar with IP from 10.100.1.0/31

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
        image: ghcr.io/networkservicemesh/cmd-nse-vlan-vpp:v1.14.0
        securityContext:
          privileged: true
        env:
        - name: NSM_SERVICE_NAMES
          value: "l2-bridge"
        - name: NSM_CONNECT_TO
          value: unix:///var/lib/networkservicemesh/nsm.io.sock
```

### Connect Multiple Clients to L2 Service

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: l2-client-1
  annotations:
    networkservicemesh.io: kernel://l2-bridge/nsm-1
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
    networkservicemesh.io: kernel://l2-bridge/nsm-1
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

For VLAN breakout use cases, deploy the upstream remote VLAN setup and the breakout example. The example connects NSCs to an external VLAN-backed entity through the NSM remote VLAN mechanism:

```bash
kubectl apply -k https://github.com/networkservicemesh/deployments-k8s/examples/remotevlan_vpp?ref=v1.14.0
kubectl apply -k https://github.com/networkservicemesh/deployments-k8s/examples/use-cases/Kernel2RVlanBreakout?ref=v1.14.0
kubectl -n ns-kernel2rvlan-breakout wait --for=condition=ready --timeout=1m pod -l app=iperf1-s
```

To test against an external VLAN peer, create a host or container on the same VLAN and use the addresses from the NSM interface:

```bash
NSCS=($(kubectl get pods -l app=iperf1-s -n ns-kernel2rvlan-breakout --template '{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}'))
kubectl exec ${NSCS[0]} -c cmd-nsc -n ns-kernel2rvlan-breakout -- ip -4 addr show nsm-1
```

### Client Connecting to External Network

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: external-client
  annotations:
    networkservicemesh.io: kernel://kernel2rvlan-breakout/nsm-1
spec:
  containers:
  - name: alpine
    image: alpine:latest
    command: ["/bin/sh", "-c", "apk add --no-cache curl && sleep 3600"]
```

This pod receives an NSM interface. The external reachability depends on the remote VLAN setup and the external peer attached to that VLAN.

## Multi-Cluster Networking with NSM

Connect services across Kubernetes clusters using NSM's interdomain examples.

### Register Remote Network Service

In cluster A, define the network service that clients will request:

```yaml
apiVersion: networkservicemesh.io/v1
kind: NetworkService
metadata:
  name: floating-kernel2ethernet2kernel
spec:
  payload: ETHERNET
```

### Configure NSM for Inter-Cluster Communication

Set up the NSM interdomain components from the upstream two-cluster examples rather than a custom ConfigMap. The registry proxy DNS and NSMgr proxy components are the parts that proxy requests across NSM domains:

```bash
kubectl --kubeconfig=$KUBECONFIG1 apply -k https://github.com/networkservicemesh/deployments-k8s/examples/interdomain/two_cluster_configuration/basic/cluster1?ref=v1.14.0
kubectl --kubeconfig=$KUBECONFIG2 apply -k https://github.com/networkservicemesh/deployments-k8s/examples/interdomain/two_cluster_configuration/basic/cluster2?ref=v1.14.0
kubectl --kubeconfig=$KUBECONFIG1 wait --for=condition=ready --timeout=1m pod -n nsm-system -l app=admission-webhook-k8s
kubectl --kubeconfig=$KUBECONFIG2 wait --for=condition=ready --timeout=1m pod -n nsm-system -l app=admission-webhook-k8s
```

### Consume Cross-Cluster Service

In cluster A, pods can now request services from cluster B:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cross-cluster-client
  annotations:
    networkservicemesh.io: kernel://floating-kernel2ethernet2kernel@my.cluster3/nsm-1
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
        image: ghcr.io/networkservicemesh/cmd-nse-firewall-vpp:v1.14.0
        env:
        - name: NSM_SERVICE_NAMES
          value: "firewall-service"
        - name: NSM_CONNECT_TO
          value: unix:///var/lib/networkservicemesh/nsm.io.sock
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
  - source_selector:
      security: "high"
    routes:
    - destination_selector:
        app: firewall
    - destination_selector:
        app: ids
    - destination_selector:
        app: application
```

Pods requesting `secure-path` with the `security=high` label in the NSM annotation will be matched to this route chain.

## Monitoring and Troubleshooting

### Check NSM Component Status

```bash
# List all NSM components
kubectl get pods -n nsm-system

# Check nsmgr logs
kubectl logs -n nsm-system -l app=nsmgr

# View registry contents
kubectl logs -n nsm-system -l app=registry
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
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: forwarder-vpp
  namespace: nsm-system
spec:
  template:
    spec:
      containers:
      - name: forwarder-vpp
        resources:
          requests:
            cpu: "2"
            memory: "2Gi"
          limits:
            cpu: "4"
            memory: "4Gi"
```

In current upstream manifests, tune the `forwarder-vpp` DaemonSet resources directly or through a Kustomize patch.

### Enable Jumbo Frames

Set MTU through the forwarder or endpoint configuration used by your selected NSM deployment, then verify the negotiated MTU on the injected NSM interface with `ip link show nsm-1`.

## Conclusion

Network Service Mesh extends Kubernetes networking beyond the basic flat Layer 3 model, enabling advanced use cases like Layer 2 connectivity, network function virtualization, and multi-cloud networking. By working alongside your existing CNI, NSM provides these capabilities without disrupting your standard pod networking.

Whether you're running telco workloads that require Layer 2 connectivity, implementing security functions as network services, or connecting Kubernetes clusters across different cloud providers, NSM provides the flexible networking framework you need. Start with simple Layer 3 services to understand the concepts, then expand to more complex topologies as your requirements grow.
