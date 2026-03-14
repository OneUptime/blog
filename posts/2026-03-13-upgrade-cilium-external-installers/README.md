# Upgrade Cilium with External Installers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: Learn how to upgrade Cilium when it was installed via external Kubernetes provisioning tools like kubeadm, kops, or kubespray, with tool-specific upgrade procedures and validation steps.

---

## Introduction

Many Kubernetes clusters are provisioned using external tools like kubeadm, kops, kubespray, or Cluster API that bundle CNI installation as part of cluster provisioning. When Cilium is installed via one of these external installers, upgrading it requires a different approach than upgrading a standalone Cilium installation - you must coordinate with the installer's lifecycle management or bypass it appropriately.

External installers often manage Cilium manifests in their own configuration format, which means a direct `helm upgrade` or `kubectl apply` may not be recognized by the installer's drift detection. Understanding the boundaries between the installer's managed resources and your operational changes is critical for safe upgrades.

This guide covers Cilium upgrade procedures for clusters provisioned with common external installers, including kubeadm, kops, and kubespray.

## Prerequisites

- Kubernetes cluster provisioned with an external installer
- Knowledge of which installer was used and its version
- `kubectl` with cluster-admin access
- `cilium` CLI and Helm installed
- Access to the installer's configuration files

## Step 1: Identify the Installation Method

Determine how Cilium was originally installed.

```bash
# Check if Cilium was installed via Helm (check for Helm release)
helm list -A | grep -i cilium

# Check if installed via raw manifests
kubectl get daemonset -n kube-system cilium -o yaml | grep -i "helm.sh\|managed-by"

# Check for kops-managed Cilium
# In kops: kops get cluster --output yaml | grep -A 10 networking

# Check for kubespray-installed Cilium
# Look for kubespray annotations
kubectl get configmap -n kube-system cilium-config \
  -o jsonpath='{.metadata.labels}'
```

## Step 2: Upgrade Cilium on kubeadm-provisioned Clusters

kubeadm doesn't manage CNI - Cilium can be upgraded independently.

```bash
# For kubeadm clusters, Cilium is a post-cluster addon
# Upgrade via Helm (preferred if originally installed via Helm)
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --version 1.15.0

# If installed via manifest, apply the new manifest directly
kubectl apply -f https://raw.githubusercontent.com/cilium/cilium/v1.15.0/install/kubernetes/quick-install.yaml

# Monitor the rolling upgrade
kubectl rollout status daemonset/cilium -n kube-system --timeout=10m
```

## Step 3: Upgrade Cilium on kops-provisioned Clusters

kops manages the Cilium manifest as part of the cluster spec.

```bash
# Edit the kops cluster spec to update Cilium version
kops edit cluster <cluster-name>

# In the cluster spec, update the networking.cilium.version field:
# networking:
#   cilium:
#     version: "v1.15.0"

# Preview the kops update
kops update cluster <cluster-name> --yes --dry-run

# Apply the kops update (updates Cilium manifest in S3)
kops update cluster <cluster-name> --yes

# Perform a rolling update to apply the new Cilium version to nodes
kops rolling-update cluster <cluster-name> --yes

# Monitor nodes coming back up
kubectl get nodes -w
```

## Step 4: Upgrade Cilium on kubespray Clusters

kubespray manages Cilium via Ansible playbooks.

```bash
# Update Cilium version in kubespray group_vars
# Edit: inventory/<cluster-name>/group_vars/k8s_cluster/k8s-net-cilium.yml
# Set: cilium_version: "v1.15.0"

# Run the network plugin upgrade playbook
ansible-playbook \
  -i inventory/<cluster-name>/hosts.yml \
  --become \
  network_plugin.yml \
  --tags cilium

# Verify Cilium was upgraded
kubectl get pods -n kube-system -l k8s-app=cilium \
  -o jsonpath='{.items[0].spec.containers[0].image}'
```

## Step 5: Post-Upgrade Validation

Verify Cilium is working correctly after upgrade via external installer.

```bash
# Check new Cilium version
cilium version

# Verify all Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium

# Run connectivity tests
cilium connectivity test

# Verify network policies are enforced
kubectl get ciliumnetworkpolicies -A

# If issues detected, check installer-managed configmaps for version conflicts
kubectl get configmap -n kube-system cilium-config -o yaml | grep "cilium-image"
```

## Best Practices

- Check your installer's documentation for supported Cilium version ranges before upgrading
- For kops, test Cilium upgrades in a kops dev cluster before production
- For kubespray, run playbooks in check mode (`--check`) before applying
- Keep installer configuration files in version control alongside your cluster configuration
- After every external installer Cilium upgrade, verify with `cilium connectivity test`

## Conclusion

Upgrading Cilium installed via external provisioning tools requires understanding each tool's lifecycle management approach. kubeadm clusters allow independent Cilium upgrades via Helm, kops integrates Cilium into its cluster spec and rolling updates, and kubespray handles upgrades through Ansible playbooks. In all cases, the key is to work with the installer's lifecycle rather than around it, ensuring configuration consistency and enabling rollback if needed.
