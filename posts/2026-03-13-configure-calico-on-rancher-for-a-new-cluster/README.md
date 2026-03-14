# How to Configure Calico on Rancher for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, Rancher

Description: Learn how to configure Calico networking options when provisioning new Kubernetes clusters through Rancher.

---

## Introduction

Rancher exposes Calico configuration options both through its cluster creation UI and through the underlying RKE/RKE2 configuration files. Configuring Calico correctly at cluster creation time is important because some settings — such as the pod CIDR — cannot be changed after the cluster is running without a full rebuild.

Rancher's Calico configuration covers the pod network CIDR, MTU, VXLAN vs BGP routing, and cloud provider settings that affect how Calico routes traffic. For multi-cloud or multi-region Rancher deployments, getting the BGP vs VXLAN decision right at creation time prevents costly cluster rebuilds later.

This guide covers Calico configuration for new Rancher-managed clusters using both the Rancher UI and the RKE configuration file, with explanations of the key configuration choices.

## Prerequisites

- Rancher v2.6+ with admin access
- New cluster being provisioned
- Understanding of your network infrastructure (BGP routing, MTU, cloud provider)

## Step 1: Configure Calico During Cluster Creation (RKE1)

In the Rancher UI cluster creation wizard, expand **Advanced Options** and set:
- Network Plugin: Calico
- Cloud Provider: (match your infrastructure)
- Pod Security Policy: (choose appropriate policy)

For `cluster.yml` (RKE1):

```yaml
network:
  plugin: calico
  calico_network_provider:
    cloud_provider: none
  mtu: 0
  options:
    flannel_backend_type: vxlan
```

## Step 2: Set Custom Pod CIDR

In the Rancher UI, under **Cluster Options** > **Pod Security**, set the pod CIDR to match your network planning:

For `cluster.yml`:

```yaml
services:
  kube-controller:
    cluster_cidr: 10.244.0.0/16
    service_cluster_ip_range: 10.96.0.0/12
```

## Step 3: Configure RKE2 Calico Options

For RKE2 clusters, on server nodes create `/etc/rancher/rke2/config.yaml`:

```yaml
cni: calico
cluster-cidr: 192.168.0.0/16
service-cidr: 10.96.0.0/12
```

## Step 4: Post-Creation Calico Configuration

After cluster creation, fine-tune Calico settings:

```bash
# Install calicoctl
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl

# Set KUBECONFIG from Rancher
export KUBECONFIG=~/rancher-cluster.yaml

# View IP pool configuration
calicoctl get ippool -o yaml
```

## Step 5: Adjust Encapsulation Mode

```bash
calicoctl patch ippool default-ipv4-ippool \
  -p '{"spec":{"ipipMode":"CrossSubnet","vxlanMode":"Never"}}'
```

## Step 6: Configure Felix via Rancher Cluster

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  healthEnabled: true
  iptablesRefreshInterval: 90s
EOF
```

## Step 7: Verify Configuration

```bash
calicoctl get ippool -o yaml
calicoctl get felixconfiguration -o yaml
kubectl get pods -n kube-system | grep calico
```

## Conclusion

You have configured Calico for a new Rancher-managed cluster by setting the pod CIDR, encapsulation mode, and Felix parameters at both the cluster creation stage and post-deployment. Getting these settings right during provisioning ensures that your Rancher cluster's networking is optimized for your specific infrastructure from day one.
