# How to Configure Calico on Bare Metal with Containers for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Containers, Configuration

Description: A guide to configuring Calico's networking settings for a new Kubernetes cluster running containerized workloads on bare metal servers.

---

## Introduction

A fresh Calico installation on bare metal with containers uses sensible defaults, but configuring it to match your specific hardware, network topology, and workload requirements unlocks its full potential. Bare metal environments give you hardware-level control - you can configure Calico to route at line rate using BGP, match your NIC's maximum MTU, and tune the eBPF dataplane for maximum throughput.

The configuration surface covers IP pools, BGP settings, FelixConfiguration, and the Installation CR. Each of these controls a distinct aspect of how Calico behaves in your environment. Getting these settings right from the start avoids costly reconfiguration later.

This guide covers the key configuration steps for a new Calico deployment on bare metal with containers.

## Prerequisites

- Calico installed on a bare metal Kubernetes cluster with containers
- `kubectl` and `calicoctl` installed
- Knowledge of your network: node subnet, upstream router IPs, physical MTU
- BGP-capable switches (recommended)

## Step 1: Configure IP Pool Encapsulation

For bare metal environments with BGP-capable switches, remove overlay encapsulation.

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  blockSize: 26
  encapsulation: None
  natOutgoing: true
  nodeSelector: all()
```

```bash
calicoctl apply -f ippool.yaml
```

## Step 2: Enable BGP Node-to-Node Mesh

For smaller clusters, the default BGP mesh is sufficient.

```yaml
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
calicoctl apply -f bgpconfig.yaml
```

## Step 3: Configure Felix for Bare Metal

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true,
    "iptablesRefreshInterval": "60s",
    "routeRefreshInterval": "30s"
  }}'
```

## Step 4: Set MTU for Your NICs

Check your NIC MTU:

```bash
ip link show <nic-name> | grep mtu
```

Configure Calico to match:

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1500}}}'
```

For jumbo frame environments (9000 MTU):

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":9000}}}'
```

## Step 5: Enable Node-Specific BGP Peers

For top-of-rack switch peering, add a BGP peer per node or use a global peer.

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rack1-switch
spec:
  peerIP: 10.0.1.1
  asNumber: 65000
```

```bash
calicoctl apply -f bgppeer.yaml
calicoctl node status
```

## Step 6: Verify Configuration

```bash
calicoctl get felixconfiguration default -o yaml
calicoctl get bgpconfiguration default -o yaml
calicoctl get ippool -o wide
kubectl get installation default -o yaml
```

## Conclusion

Configuring Calico for a new bare metal cluster with containers involves selecting no-encapsulation IP pools for native BGP routing, tuning Felix timers, setting the MTU to match your physical NICs, and enabling BGP peering with top-of-rack switches. These settings position Calico to deliver native hardware network performance to your containerized workloads.
