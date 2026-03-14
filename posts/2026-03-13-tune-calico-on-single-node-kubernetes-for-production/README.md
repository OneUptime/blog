# Tune Calico on Single-Node Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, Single-Node

Description: Learn how to tune Calico networking on single-node Kubernetes deployments for production use cases such as edge computing, embedded systems, and resource-constrained environments.

---

## Introduction

Single-node Kubernetes deployments are increasingly common in edge computing, IoT gateways, retail kiosks, and branch office scenarios where full cluster infrastructure is impractical. Running Calico in production on a single node requires a different tuning philosophy than multi-node clusters - the focus shifts from distributed routing to minimizing resource overhead while maintaining security policy enforcement.

On a single node, Calico's BGP peering, VXLAN tunnels, and Typha are all unnecessary - all pod-to-pod traffic stays local. Stripping away these distributed components and tuning for local traffic patterns dramatically reduces memory usage and CPU overhead, making Calico viable on constrained hardware like Raspberry Pi, industrial PCs, and edge servers.

This guide covers practical Calico tuning for single-node Kubernetes production deployments, focusing on minimal resource footprint while preserving full NetworkPolicy enforcement capabilities.

## Prerequisites

- Single-node Kubernetes cluster (kubeadm, k3s, or similar)
- Calico v3.x installed
- `calicoctl` v3.x configured
- At least 1 GB RAM available for Kubernetes system pods
- `kubectl` with cluster-admin access

## Step 1: Disable BGP and Overlay Modes

On a single node, all pod traffic is local, making BGP and overlay encapsulation unnecessary.

```bash
# Disable BGP on the default BGPConfiguration
calicoctl patch bgpconfiguration default \
  --patch='{"spec": {"nodeToNodeMeshEnabled": false}}'

# Verify BGP is disabled
calicoctl get bgpconfiguration default -o yaml
```

Configure the IP pool for local routing only:

```yaml
# IP pool configured for single-node local routing
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: single-node-pool
spec:
  cidr: 10.244.0.0/16
  # Disable all overlay modes - not needed on single node
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: true
  # Larger block size is fine since only one node uses it
  blockSize: 24
  nodeSelector: all()
```

## Step 2: Reduce Felix Resource Consumption

Felix is the most resource-intensive Calico component on a single node. Tune it to use less memory and CPU.

```bash
# Apply resource-minimized Felix configuration
calicoctl patch felixconfiguration default --patch='{
  "spec": {
    "iptablesRefreshInterval": "300s",
    "routeRefreshInterval": "300s",
    "reportingInterval": "0s",
    "ipv6Support": false,
    "prometheusMetricsEnabled": false,
    "healthEnabled": true
  }
}'
```

## Step 3: Configure Resource Limits on Calico Pods

Set appropriate resource limits to prevent Calico from starving other workloads on the single node.

```yaml
# Patch calico-node DaemonSet with resource limits for single-node use
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-node
  namespace: calico-system
spec:
  template:
    spec:
      containers:
      - name: calico-node
        resources:
          # Limit CPU and memory to leave room for workloads
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

## Step 4: Tune MTU for Local Traffic

On a single node, all traffic is looped through the Linux kernel without entering a physical network. MTU can be set to the maximum for better container-to-container throughput.

```bash
# Set MTU to 1500 for local single-node traffic
# No encapsulation overhead needed since there's no inter-node routing
calicoctl patch felixconfiguration default \
  --patch='{"spec": {"vethMTU": 1500}}'
```

## Step 5: Apply a Minimal Network Policy

Even on a single node, network policies provide critical security isolation between namespaces and workloads.

```yaml
# Default deny all ingress policy - explicit allow rules required per namespace
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  # Apply to all non-system pods
  selector: "!has(projectcalico.org/system-pod)"
  types:
  - Ingress
  # No ingress rules = deny all ingress by default
```

## Best Practices

- Disable node-to-node BGP mesh on single-node clusters - it wastes resources
- Use `iptablesRefreshInterval: 300s` to reduce periodic iptables scans
- Set Prometheus metrics to disabled unless you have a monitoring stack running
- Use resource limits on calico-node to prevent memory pressure on edge hardware
- Keep Calico pod count minimal: skip Typha, reduce calico-kube-controllers replicas to 1
- Test network policies thoroughly before deploying to single-node production edge sites

## Conclusion

Running Calico in production on a single-node Kubernetes cluster is entirely feasible when tuned correctly. By disabling unnecessary distributed features like BGP and overlays, reducing Felix refresh intervals, setting appropriate resource limits, and configuring efficient MTU settings, you achieve a lean Calico deployment that provides robust network policy enforcement with minimal overhead on resource-constrained edge hardware.
