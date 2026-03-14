# How to Configure Calico on Bare Metal with Binaries for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Configuration

Description: A guide to configuring Calico's network settings, BGP, and Felix when running Calico as native binaries on bare metal servers.

---

## Introduction

When running Calico as native binaries on bare metal, configuration is managed through a combination of environment variables for the calico-node service and CRDs in the Kubernetes API for runtime behavior. Unlike the operator-based approach, you do not have an Installation CR - instead, you control startup behavior through the systemd unit file and ongoing behavior through `calicoctl`.

This split configuration model gives you fine-grained control. You can set node-level configuration in environment variables on each node's service unit and apply cluster-wide configuration through Calico CRDs. Understanding which knobs belong where is the foundation of correctly configuring a binary-installed Calico deployment.

This guide covers the key configuration steps for binary-installed Calico on a new bare metal cluster.

## Prerequisites

- Calico binary installation running on all nodes
- `calicoctl` installed and configured
- `kubectl` with cluster admin access

## Step 1: Configure the IP Pool

Set the cluster IP pool through `calicoctl`.

```bash
cat <<EOF | calicoctl apply -f -
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
EOF
```

## Step 2: Configure BGP

Enable BGP and set the AS number.

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
EOF
```

## Step 3: Update Node Environment Variables

On each node, update the systemd unit file to match your environment.

```bash
sudo systemctl edit calico-node.service --force
```

Add or update:

```ini
[Service]
Environment=CALICO_IPV4POOL_CIDR=192.168.0.0/16
Environment=CALICO_IPV4POOL_IPIP=Never
Environment=IP_AUTODETECTION_METHOD=interface=bond0
Environment=AS=64512
Environment=CALICO_STARTUP_LOGLEVEL=INFO
```

Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart calico-node
```

## Step 4: Configure Felix via CRD

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true,
    "routeRefreshInterval": "30s"
  }}'
```

## Step 5: Add BGP Peers

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: tor-switch
spec:
  peerIP: 10.0.0.1
  asNumber: 65000
EOF
```

## Step 6: Verify Configuration

```bash
calicoctl node status
calicoctl get felixconfiguration default -o yaml
calicoctl get bgpconfiguration -o yaml
calicoctl get ippool -o wide
```

## Conclusion

Configuring binary-installed Calico on bare metal requires managing startup configuration through systemd environment variables and runtime configuration through Calico CRDs. Setting the IP pool encapsulation to None, enabling BGP with the correct AS number, and patching Felix for your environment are the core configuration steps that align Calico's behavior with a bare metal deployment's performance and network integration requirements.
