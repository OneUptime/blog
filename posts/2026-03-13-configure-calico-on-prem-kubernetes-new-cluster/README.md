# How to Configure Calico on On-Prem Kubernetes for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premise, Configuration

Description: A guide to configuring Calico's core settings - IP pools, BGP, encapsulation, and Felix - for a newly installed on-premises Kubernetes cluster.

---

## Introduction

After installing Calico on an on-premises cluster, the default configuration works but is not optimized for your specific environment. On-prem clusters often have layer-2 or layer-3 connectivity between nodes, physical router infrastructure that can participate in BGP routing, and specific MTU values set by the network team. Calico's default settings assume none of this - configuring it to match your environment unlocks its full potential.

The Tigera Operator exposes Calico's core configuration through the `Installation` and `FelixConfiguration` CRDs. BGP configuration is managed through `BGPConfiguration` and `BGPPeer` resources. Understanding how these interact lets you build a networking layer that integrates cleanly with your on-prem infrastructure.

This guide covers the key configuration steps for a new on-prem Calico deployment.

## Prerequisites

- Calico installed on an on-prem Kubernetes cluster via the Tigera Operator
- `kubectl` with cluster admin access
- `calicoctl` installed
- Knowledge of your network topology: node subnets, router IPs, MTU values

## Step 1: Configure the IP Pool

Adjust the IP pool to match your pod CIDR and choose the appropriate encapsulation mode.

```bash
calicoctl get ippool default-ipv4-ippool -o yaml > ippool.yaml
```

Edit `ippool.yaml` to set encapsulation. For on-prem environments where all nodes are on the same L2 segment, use `None` (no encapsulation):

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  encapsulation: None
  natOutgoing: true
  nodeSelector: all()
```

```bash
calicoctl apply -f ippool.yaml
```

## Step 2: Configure BGP for Physical Router Peering

Enable BGP peering with your top-of-rack switches or routers to advertise pod routes.

```yaml
# bgp-config.yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
```

```bash
calicoctl apply -f bgp-config.yaml
```

Add a BGP peer for your upstream router:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: upstream-router
spec:
  peerIP: 10.0.0.1
  asNumber: 65000
```

```bash
calicoctl apply -f bgppeer.yaml
```

## Step 3: Set the MTU

Set the MTU to match your physical network. For standard Ethernet without encapsulation:

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1500}}}'
```

## Step 4: Configure Felix

Tune Felix for your on-prem environment:

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"logSeverityScreen":"Warning","prometheusMetricsEnabled":true,"routeRefreshInterval":"30s"}}'
```

## Step 5: Verify BGP Sessions

```bash
calicoctl node status
```

Look for `Established` state on all BGP peers. If sessions are in `Idle` or `Active`, check firewall rules on TCP port 179.

## Conclusion

Configuring Calico on a new on-prem Kubernetes cluster involves selecting the right encapsulation mode for your network topology, enabling BGP peering with physical routers, setting the correct MTU, and tuning Felix. These settings transform the default Calico installation into a network that integrates tightly with your existing on-prem infrastructure.
