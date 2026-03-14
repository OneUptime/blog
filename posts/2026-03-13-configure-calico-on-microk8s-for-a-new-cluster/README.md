# How to Configure Calico on MicroK8s for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, MicroK8s

Description: Learn how to configure Calico networking parameters on a new MicroK8s cluster to match your environment requirements.

---

## Introduction

After enabling Calico on MicroK8s, the default configuration works out of the box but may need adjustments to align with your networking environment or production settings. MicroK8s provides a specific default CIDR for Calico (`10.1.0.0/16`), but you may need to change this or tune other settings such as IP-in-IP mode and Felix parameters.

MicroK8s stores its configuration in `/var/snap/microk8s/current/args/cni-network/` and Calico-specific settings can be managed through calicoctl and kubectl. Configuration changes in MicroK8s follow the same pattern as other Kubernetes distributions but with MicroK8s-specific paths and tools.

This guide covers essential Calico configuration steps for MicroK8s, including IP pool management, Felix tuning, and verifying that configuration changes take effect.

## Prerequisites

- MicroK8s cluster with Calico enabled
- calicoctl installed and configured for MicroK8s
- sudo access on the MicroK8s host

## Step 1: Set Up calicoctl for MicroK8s

```bash
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/var/snap/microk8s/current/credentials/client.config
calicoctl get nodes
```

## Step 2: View Current IP Pool Configuration

```bash
calicoctl get ippool -o yaml
```

The default MicroK8s IP pool uses `10.1.0.0/16`.

## Step 3: Modify the IP Pool CIDR

If you need a different CIDR:

```bash
calicoctl delete ippool default-ipv4-ippool

calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 172.16.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 4: Adjust Encapsulation Mode

For single-node MicroK8s, disable encapsulation:

```bash
calicoctl patch ippool default-ipv4-ippool \
  -p '{"spec":{"ipipMode":"Never","vxlanMode":"Never"}}'
```

## Step 5: Configure Felix Parameters

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  healthEnabled: true
  iptablesRefreshInterval: 60s
  ipv6Support: false
EOF
```

## Step 6: Restart Calico to Apply Changes

```bash
microk8s kubectl rollout restart daemonset calico-node -n kube-system
microk8s kubectl rollout status daemonset calico-node -n kube-system
```

## Step 7: Verify Configuration

```bash
calicoctl get ippool -o yaml
calicoctl get felixconfiguration default -o yaml
microk8s kubectl get pods -n kube-system | grep calico
```

## Conclusion

You have configured Calico on MicroK8s by adjusting the IP pool CIDR, encapsulation mode, and Felix parameters. These configuration changes allow MicroK8s to serve as an accurate representation of your target production Calico setup for local development and testing.
