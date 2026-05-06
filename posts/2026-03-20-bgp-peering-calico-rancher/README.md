# How to Set Up BGP Peering with Calico in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, BGP, Calico, Networking, Kubernetes

Description: Step-by-step guide to configuring BGP peering with Calico CNI in Rancher for route advertisement.

## Introduction

How to Set Up BGP Peering with Calico in Rancher is an important networking capability for production Kubernetes clusters managed by Rancher. In Rancher-managed clusters that use Calico as the CNI, BGP peering is configured through Calico resources such as `BGPConfiguration` and `BGPPeer`, not by editing generic CNI JSON files. This guide provides practical configuration steps and examples for implementing this feature.

## Prerequisites

- Rancher-managed RKE or RKE2 cluster with Calico selected as the CNI
- Cluster admin access
- Understanding of Kubernetes networking fundamentals
- The IP address and ASN of the external BGP peer
- TCP port `179` open between Calico nodes and their BGP peers
- Access to Calico `projectcalico.org/v3` resources through `kubectl`, or a configured `calicoctl`
- `calicoctl` installed on a cluster node if you want to use `calicoctl node status`

## Architecture Overview

Calico treats each Kubernetes node as a virtual router. When BGP is enabled, Calico creates a full node-to-node mesh by default and can also peer with external routers such as ToR switches or route reflectors. This guide assumes a Calico deployment where BGP is enabled; if your cluster is using VXLAN encapsulation for inter-node routing, BGP is not used for that overlay path. If you are replacing the default full mesh with explicit peerings, make the change during a maintenance window.

## Step 1: Verify Current Network Configuration

```bash
# Confirm Calico is running and identify the namespace where calico-node pods live
kubectl get pods -A -l k8s-app=calico-node -o wide

# View node InternalIPs, which are commonly used as BGP source addresses
kubectl get nodes -o wide

# Inspect the current Calico BGP configuration
kubectl get bgpconfigurations.projectcalico.org default -o yaml

# List any existing BGP peers
kubectl get bgppeers.projectcalico.org -o yaml
```

If your Calico installation does not expose `projectcalico.org/v3` resources through `kubectl`, use the equivalent `calicoctl get` commands instead.

## Step 2: Configure the Network Feature

```yaml
# bgp-peering.yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: true # Set to false only after replacement peerings are in place
  serviceClusterIPs:
    - cidr: 10.43.0.0/16 # Replace with your cluster Service CIDR if you want ClusterIP advertisement
  serviceLoadBalancerIPs:
    - cidr: 198.51.100.0/24 # Optional; remove if you do not advertise LoadBalancer IPs
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: tor-router
spec:
  peerIP: 192.0.2.1   # Replace with your router or route-reflector IP
  asNumber: 64567     # Replace with the remote peer ASN
```

## Step 3: Apply the Network Feature

```bash
kubectl apply -f bgp-peering.yaml
```

If your environment uses `calicoctl` rather than the Calico API server for resource management, apply the same manifest with `calicoctl apply -f bgp-peering.yaml`.

## Step 4: Test Network Configuration

```bash
# Run this on a node where calicoctl is installed
sudo calicoctl node status

# Confirm the BGP peer resources were created
kubectl get bgppeers.projectcalico.org
```

## Step 5: Monitor Network Traffic

```bash
# Review calico-node pods and recent log messages
kubectl get pods -A -l k8s-app=calico-node -o wide
kubectl logs -n <calico-namespace> -l k8s-app=calico-node --all-containers=true --since=1h

# Re-check BGP session state from a cluster node
sudo calicoctl node status
```

## Step 6: Configure Prometheus Metrics for Network

If Rancher Monitoring is installed, you can add a `PrometheusRule` in the `cattle-monitoring-system` namespace to alert on Calico target health.

```yaml
# calico-bgp-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-bgp-health
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: calico-bgp.rules
    rules:
    - alert: CalicoNodeTargetDown
      expr: |
        up{job=~".*calico-node.*"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Calico node metrics target is down for {{ $labels.instance }}"

    - alert: CalicoTyphaTargetDown
      expr: |
        up{job=~".*calico-typha.*"} == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Calico Typha metrics target is down for {{ $labels.instance }}"
```

## Step 7: Troubleshooting Common Issues

```bash
# Review the applied BGP resources
kubectl get bgpconfigurations.projectcalico.org default -o yaml
kubectl get bgppeers.projectcalico.org -o yaml

# Check calico-node pod health and logs
kubectl get pods -A -l k8s-app=calico-node -o wide
kubectl logs -n <calico-namespace> -l k8s-app=calico-node --all-containers=true --since=1h

# Verify the BGP session state directly from the node
sudo calicoctl node status
```

## Conclusion

How to Set Up BGP Peering with Calico in Rancher requires configuring Calico's BGP resources directly and validating the resulting sessions from the Calico control plane, not from generic CNI configuration files. Test thoroughly in a staging environment before applying changes to production, ensure TCP port `179` is allowed between peers, and verify BGP sessions are established before disabling Calico's default node-to-node mesh.
