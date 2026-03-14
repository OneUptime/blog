# How to Configure Calico on Single-Node Kubernetes for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, Single-Node

Description: Learn how to configure Calico on a new single-node Kubernetes cluster with optimal settings for development and testing.

---

## Introduction

A newly installed Calico on a single-node Kubernetes cluster uses default settings that may not align with your development requirements or production configuration targets. Proper configuration of IP pools, Felix parameters, and encapsulation modes on a single-node cluster ensures consistency with what you will deploy in production multi-node environments.

Single-node Kubernetes clusters do not require BGP peering between nodes, but the IP pool CIDR, encapsulation mode, and Felix settings all apply equally. You can disable unnecessary multi-node features while maintaining the configuration structure that scales to production. This reduces confusion when promoting configurations from development to production.

This guide covers essential Calico configuration steps for a single-node Kubernetes cluster, using calicoctl and kubectl to manage Calico custom resources.

## Prerequisites

- Single-node Kubernetes cluster with Calico installed
- calicoctl v3.27.0 installed
- kubectl configured

## Step 1: Install and Configure calicoctl

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=~/.kube/config
calicoctl version
```

## Step 2: Inspect Default Configuration

```bash
calicoctl get ippool -o yaml
calicoctl get felixconfiguration -o yaml
calicoctl get node -o yaml
```

## Step 3: Set IP Pool for Single-Node

On a single-node cluster, disable IPIP since all traffic is local:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 4: Configure Felix for Single-Node Development

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Debug
  healthEnabled: true
  iptablesRefreshInterval: 30s
  ipv6Support: false
  reportingInterval: 0s
EOF
```

## Step 5: Disable Node-to-Node BGP Mesh

Not needed on single-node:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  nodeToNodeMeshEnabled: false
  asNumber: 63400
EOF
```

## Step 6: Verify All Settings

```bash
calicoctl get ippool -o yaml
calicoctl get felixconfiguration default -o yaml
calicoctl get bgpconfiguration default -o yaml
```

## Step 7: Restart Calico to Apply Changes

```bash
kubectl rollout restart daemonset calico-node -n kube-system
kubectl rollout status daemonset calico-node -n kube-system
```

## Conclusion

You have configured Calico on a single-node Kubernetes cluster by disabling unnecessary encapsulation, tuning Felix for development verbosity, and disabling the node-to-node BGP mesh. These settings make the single-node cluster an efficient development environment while preserving the configuration structure used in production.
