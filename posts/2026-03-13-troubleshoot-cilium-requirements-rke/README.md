# Troubleshoot Cilium Requirements on RKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, RKE, Rancher, eBPF

Description: Learn how to validate and troubleshoot Cilium installation requirements on Rancher Kubernetes Engine (RKE), covering Canal CNI replacement, node OS requirements, and RKE2 differences.

---

## Introduction

Rancher Kubernetes Engine (RKE and RKE2) ships with Canal (Flannel + Calico) or Cilium as selectable CNI options. When migrating an existing RKE cluster from Canal to Cilium, or when troubleshooting a fresh Cilium deployment on RKE, several RKE-specific configuration points require attention.

RKE uses a Docker-based or containerd-based node model where CNI configuration is managed through the `cluster.yml` configuration file rather than direct node access. This means CNI changes must go through RKE's cluster reconciliation process, which has its own ordering and validation logic.

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

# For RKE2, check node status in the rke2 server logs
journalctl -u rke2-server -n 100 | grep "kernel"
```

Minimum requirements: kernel 4.9.17+ for basic operation, 5.8+ for Cilium's WireGuard encryption, 5.10+ for full eBPF feature support.

## Step 2: Configure Cilium as CNI in RKE cluster.yml

For RKE1, Cilium is configured in the cluster configuration file. Incorrect settings here are the most common cause of failed deployments.

Set the CNI plugin to `cilium` in your RKE cluster configuration:

```yaml
# cluster.yml - RKE1 cluster configuration with Cilium CNI
network:
  plugin: cilium
  cilium_network_provider:
    # Set to true to enable Cilium's kube-proxy replacement
    kube_proxy_replacement: "strict"

# For RKE2, configure in /etc/rancher/rke2/config.yaml on the server node
# cni: cilium
# disable: rke2-kube-proxy  # required for kube-proxy replacement
```

After modifying `cluster.yml`, apply the change with RKE:

```bash
# Apply the updated cluster configuration
rke up --config cluster.yml

# Verify the Cilium DaemonSet was created
kubectl -n kube-system get daemonset cilium
```

## Step 3: Remove Residual Canal Components

When migrating from Canal to Cilium on an existing RKE cluster, Canal's components must be fully removed to prevent CNI conflicts.

Clean up Canal resources after the RKE cluster update:

```bash
# Delete Canal DaemonSet and related resources
kubectl -n kube-system delete daemonset canal
kubectl -n kube-system delete configmap canal-config

# Remove Canal CNI binaries from nodes (run on each node)
sudo rm -f /opt/cni/bin/flannel
sudo rm -f /opt/cni/bin/calico
sudo rm -f /etc/cni/net.d/10-canal.conflist

# Restart kubelet on each node to pick up the new CNI
sudo systemctl restart kubelet
```

## Step 4: Validate Cilium Health on RKE

After the CNI change, validate that Cilium is functioning correctly and that pods can communicate.

Run the Cilium status and connectivity checks:

```bash
# Check Cilium agent status - all nodes should show "OK"
cilium status --wait

# View Cilium endpoint list to confirm pods are managed
cilium endpoint list

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

Cilium on RKE requires careful configuration in `cluster.yml` (RKE1) or `config.yaml` (RKE2), complete removal of previous CNI components, and kernel version validation. Following these steps in order ensures a clean transition from Canal to Cilium and a stable networking foundation for your Rancher-managed cluster.
