# How to Configure Calico on K3s for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, K3s

Description: Learn how to configure Calico networking on a new K3s cluster for edge and IoT environments with optimal settings.

---

## Introduction

K3s clusters deployed for edge and IoT workloads have specific networking requirements that differ from standard data center deployments. Configuring Calico correctly on K3s ensures that the networking layer matches the constraints of the edge environment - including limited bandwidth, specific CIDR ranges, and potential for cross-subnet routing.

K3s with Calico supports the same configuration API as other Kubernetes distributions, allowing you to use calicoctl to manage IP pools, Felix settings, and BGP configuration. However, K3s-specific considerations such as the embedded etcd or external datastore affect how Calico stores its state.

This guide covers essential Calico configuration steps for a new K3s cluster, including IP pool management, encapsulation mode tuning, and Felix settings appropriate for edge environments.

## Prerequisites

- K3s cluster with Calico installed
- calicoctl installed and configured
- kubectl access configured via `~/.kube/config`

## Step 1: Verify Calico Is Running

```bash
kubectl get pods -n kube-system | grep calico
calicoctl node status
```

## Step 2: View Default IP Pool

```bash
calicoctl get ippool -o yaml
```

The default pool should use the CIDR specified with `--cluster-cidr` during K3s installation (`192.168.0.0/16`).

## Step 3: Tune Encapsulation for Edge Environments

For edge deployments where cross-subnet routing is needed:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  ipipMode: CrossSubnet
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 4: Configure Felix for K3s Edge

Edge environments often have limited resources. Tune Felix accordingly:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  iptablesRefreshInterval: 120s
  routeRefreshInterval: 120s
  healthEnabled: true
  ipv6Support: false
  reportingInterval: 60s
EOF
```

## Step 5: Configure Node Selector for Multiple K3s Node Types

In K3s clusters with mixed agent and server nodes:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: agent-pool
spec:
  cidr: 192.168.128.0/17
  ipipMode: Always
  natOutgoing: true
  nodeSelector: "node-role.kubernetes.io/agent == 'true'"
EOF
```

## Step 6: Disable Unnecessary Calico Components

If BGP is not needed in a single-node K3s edge setup:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  nodeToNodeMeshEnabled: false
EOF
```

## Step 7: Verify All Configuration

```bash
calicoctl get ippool -o yaml
calicoctl get felixconfiguration -o yaml
calicoctl get bgpconfiguration -o yaml
kubectl rollout restart daemonset calico-node -n kube-system
```

## Conclusion

You have configured Calico on K3s with edge-optimized settings including appropriate encapsulation mode, reduced iptables refresh intervals, and targeted IP pool node selectors. These configurations make Calico on K3s suitable for resource-constrained edge and IoT environments.
