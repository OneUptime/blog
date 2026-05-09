# Troubleshoot Cilium Requirements on RKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, RKE, Rancher, eBPF

Description: Learn how to validate and troubleshoot Cilium installation requirements on Rancher Kubernetes Engine (RKE), covering Canal CNI replacement, node OS requirements, and RKE2 differences.

---

## Introduction

Rancher Kubernetes Engine differs between RKE1 and RKE2: RKE1 ships Canal (Flannel + Calico), Flannel, Calico, and Weave as built-in CNI add-ons, while RKE2 ships Canal, Cilium, Calico, and Flannel as selectable CNI options. When preparing an RKE1 cluster for a custom Cilium installation, or when troubleshooting a fresh Cilium deployment on RKE2, several RKE-specific configuration points require attention.

RKE1 uses a Docker-based node model where the built-in CNI add-on is managed through the `cluster.yml` configuration file rather than direct node access. RKE2 uses containerd and installs bundled CNIs through its Helm chart add-on system. This means CNI changes must go through the appropriate RKE reconciliation process, which has its own ordering and validation logic.

RKE2 differs from RKE1 in how it handles CNI installation and containerd integration, requiring separate validation steps. This guide covers both.

## Prerequisites

- `rke` or `rke2` CLI installed
- `kubectl` configured with kubeconfig from RKE
- SSH access to cluster nodes
- `cilium` CLI installed on your workstation

## Step 1: Verify Node OS and Kernel Compatibility

RKE supports multiple Linux distributions. Each has different default kernel versions that affect Cilium's eBPF capabilities.

Check kernel versions across all RKE nodes:

```bash
# List nodes with kernel version using kubectl

kubectl get nodes -o custom-columns="NAME:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion,OS:.status.nodeInfo.osImage"

# On each node, confirm the running kernel directly
uname -r
```

Current Cilium releases recommend Linux kernel 5.10+ or a distribution equivalent such as RHEL 8.10's 4.18 kernel. RKE2's Cilium guidance also notes that nodes must have at least kernel 4.9.17 and must meet Cilium's system requirements. For kube-proxy replacement, RKE2 recommends kernel 5.8 or newer; for WireGuard encryption, use Linux 5.6 or newer with in-kernel WireGuard support, or install the WireGuard module on older kernels.

## Step 2: Configure Cilium as CNI in RKE cluster.yml

For RKE1, Cilium is not configured as a built-in network plug-in. Configure RKE1 with no built-in CNI and then install Cilium separately with Helm or the Cilium CLI. Incorrect settings here are the most common cause of failed deployments.

Set the RKE1 network plugin to `none` in your cluster configuration:

```yaml
# cluster.yml - RKE1 cluster configuration prepared for a custom Cilium CNI
network:
  plugin: none

# For RKE2, configure in /etc/rancher/rke2/config.yaml on the server node
# cni: cilium
# disable-kube-proxy: true  # required only when enabling Cilium kube-proxy replacement
```

After modifying `cluster.yml`, apply the change with RKE and then install Cilium separately:

```bash
# Apply the updated cluster configuration
rke up --config cluster.yml

# Install Cilium after the cluster is created without a built-in CNI
cilium install

# Verify the Cilium DaemonSet was created after Cilium installation
kubectl -n kube-system get daemonset cilium
```

## Step 3: Remove Residual Canal Components

When preparing a cluster for Cilium, avoid leaving multiple CNIs active at the same time. RKE1 does not support changing the built-in network provider after cluster creation; if an RKE1 cluster was created with Canal, rebuild or recreate the cluster with `network.plugin: none` before installing Cilium. For RKE2, select `cni: cilium` or `cni: none` before startup, or follow the RKE2 migration procedure for your version.

Check for residual Canal resources after the intended CNI configuration is applied:

```bash
# RKE1 Canal resources, if the cluster was created with Canal
kubectl -n kube-system get daemonset canal
kubectl -n kube-system get configmap canal-config

# RKE2 Canal resources, if Canal is still deployed
kubectl -n kube-system get daemonset rke2-canal
kubectl -n kube-system get helmchart rke2-canal

# On each node, inspect the active CNI configuration
sudo ls -l /etc/cni/net.d/
```

## Step 4: Validate Cilium Health on RKE

After the CNI change, validate that Cilium is functioning correctly and that pods can communicate.

Run the Cilium status and connectivity checks:

```bash
# Check Cilium agent status - all nodes should show "OK"
cilium status --wait

# View CiliumEndpoint resources to confirm pods are managed
kubectl get ciliumendpoints.cilium.io -A

# Run the full connectivity test suite
cilium connectivity test
```

## Best Practices

- Always back up `cluster.yml` and etcd before changing the CNI plugin on a production RKE cluster
- For RKE2, use the built-in `rke2-cilium` Helm chart rather than installing Cilium manually
- Cordon and drain nodes one at a time when performing CNI migrations to minimize disruption
- Use RKE2's `--node-taint` feature to prevent workload scheduling during CNI transitions
- Enable Cilium's Hubble observability layer early to simplify future network troubleshooting

## Conclusion

Cilium on RKE requires careful configuration in `cluster.yml` (RKE1) or `config.yaml` (RKE2), avoiding conflicting CNI components, and kernel version validation. Following these steps in order ensures a clean Cilium deployment path and a stable networking foundation for your Rancher-managed cluster.
