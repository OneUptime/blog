# How to Configure Calico on Kind for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, Kind

Description: Learn how to configure Calico networking options on a fresh Kind cluster to match your development or testing requirements.

---

## Introduction

After installing Calico on a Kind cluster, the default configuration works for basic pod networking but may not reflect your production settings. Proper configuration of IP pools, encapsulation modes, and BGP settings ensures that your local Kind environment behaves consistently with staging or production clusters.

Calico stores its configuration in custom resources that you can manage with `kubectl` or `calicoctl`. On Kind, the most common customizations involve adjusting the IP pool CIDR, enabling or disabling IPIP encapsulation, and configuring node-to-node mesh settings.

This guide covers the essential Calico configuration steps you should perform after installing Calico on a new Kind cluster. You will use both `kubectl` and `calicoctl` to view and modify Calico resources.

## Prerequisites

- A Kind cluster with Calico installed (see the installation guide)
- kubectl configured to target the Kind cluster
- calicoctl installed (`v3.27.0` matching your Calico version)

## Step 1: Install calicoctl

Download and install the calicoctl CLI:

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl
sudo mv calicoctl /usr/local/bin/
```

Configure it to connect to the Kubernetes datastore:

```bash
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=~/.kube/config
```

## Step 2: View the Default IP Pool

Inspect the default IP pool that Calico created:

```bash
calicoctl get ippool -o yaml
```

You should see a pool with CIDR `192.168.0.0/16` and IPIP mode enabled.

## Step 3: Update the IP Pool Configuration

To disable IPIP encapsulation (if your Kind nodes support direct routing):

```bash
kubectl patch felixconfiguration default --type merge --patch '{"spec":{"ipipEnabled":false}}'
```

To change IPIP mode to CrossSubnet (more efficient for multi-node setups):

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
EOF
```

## Step 4: Configure Felix for Kind

Adjust Felix global settings for better performance in Kind:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  reportingInterval: 0s
EOF
```

## Step 5: Verify Configuration

Confirm the updated settings are applied:

```bash
calicoctl get felixconfiguration default -o yaml
calicoctl get ippool -o yaml
```

## Step 6: Restart Calico Nodes to Apply Changes

```bash
kubectl rollout restart daemonset calico-node -n kube-system
kubectl rollout status daemonset calico-node -n kube-system
```

## Conclusion

You have configured Calico on your Kind cluster by adjusting IP pool settings, encapsulation modes, and Felix parameters. These configuration steps ensure that your local Kind environment reflects the networking behavior you expect in production, enabling reliable testing of CNI-dependent features.
