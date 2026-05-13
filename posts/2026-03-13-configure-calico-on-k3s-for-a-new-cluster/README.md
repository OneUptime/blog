# How to Configure Calico on K3s for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, k3s

Description: Learn how to configure Calico networking on a new K3s cluster for edge and IoT environments with optimal settings.

---

## Introduction

K3s clusters deployed for edge and IoT workloads have specific networking requirements that differ from standard data center deployments. Configuring Calico correctly on K3s ensures that the networking layer matches the constraints of the edge environment - including limited bandwidth, specific CIDR ranges, and potential for cross-subnet routing.

K3s with Calico supports the same configuration API as other Kubernetes distributions, allowing you to use calicoctl to manage IP pools, Felix settings, and BGP configuration. In a standard Kubernetes installation, Calico uses the Kubernetes API datastore, so Calico state is stored as Kubernetes API resources even if K3s itself is backed by sqlite, embedded etcd, or an external datastore.

This guide covers essential Calico configuration steps for a new K3s cluster, including IP pool management, encapsulation mode tuning, and Felix settings appropriate for edge environments.

## Prerequisites

- K3s cluster with Calico installed
- calicoctl installed and configured
- kubectl access configured via `~/.kube/config`
- K3s started with `--flannel-backend=none` and `--disable-network-policy` before installing Calico

## Step 1: Verify Calico Is Running

```bash
kubectl get pods -A | grep -E 'calico|tigera'
sudo calicoctl node status
```

Run `calicoctl node status` on a K3s node host. It reports BGP status, so it is most useful when Calico BGP is in use.

## Step 2: View Default IP Pool

```bash
calicoctl get ippool -o yaml
```

The default pool should use the pod CIDR specified with `--cluster-cidr` during K3s installation. K3s defaults to `10.42.0.0/16`; Calico's K3s examples often use `192.168.0.0/16` by passing `--cluster-cidr=192.168.0.0/16`.

## Step 3: Tune Encapsulation for Edge Environments

For edge deployments where cross-subnet routing is needed, update the default pool to match the pod CIDR used when the cluster was created:

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

If you installed Calico with the Tigera operator and let the operator manage IP pools, make this change in the operator `Installation` resource instead, or disable operator IP pool management before managing pools with calicoctl.

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
  iptablesRefreshInterval: 300s
  routeRefreshInterval: 300s
  healthEnabled: true
  ipv6Support: false
  reportingInterval: 60s
EOF
```

## Step 5: Configure Node Selector for K3s Agent Nodes

In K3s clusters where workloads should use an agent-node-specific pool, label the nodes you want to use the pool first. IP pools must not overlap, so disable or replace any existing pool that covers the same CIDR before creating this one:

```bash
AGENT_NODE=agent-1
kubectl label node "$AGENT_NODE" node-role.kubernetes.io/agent=true
calicoctl patch ippool default-ipv4-ippool -p '{"spec": {"disabled": true}}'
```

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

## Step 6: Disable BGP Node-to-Node Mesh

If BGP node-to-node mesh is not needed in a single-node K3s edge setup:

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

Do not disable node-to-node BGP mesh for a multi-node IPIP deployment unless you have another supported way to distribute pod routes.

## Step 7: Verify All Configuration

```bash
calicoctl get ippool -o yaml
calicoctl get felixconfiguration -o yaml
calicoctl get bgpconfiguration -o yaml
CALICO_NS=$(kubectl get daemonset -A | awk '$2=="calico-node"{print $1; exit}')
kubectl rollout restart daemonset calico-node -n "$CALICO_NS"
```

## Conclusion

You have configured Calico on K3s with edge-optimized settings including appropriate encapsulation mode, longer refresh intervals to reduce Felix CPU usage, and targeted IP pool node selectors. These configurations make Calico on K3s suitable for resource-constrained edge and IoT environments.
