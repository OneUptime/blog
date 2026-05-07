# How to Check Rancher Version Compatibility Before Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Upgrade

Description: Learn how to verify version compatibility between Rancher, Kubernetes, and downstream cluster components before performing an upgrade.

Upgrading Rancher without checking version compatibility can lead to broken clusters, failed deployments, and hours of troubleshooting. This guide shows you how to verify that your target Rancher version is compatible with your Kubernetes clusters, operating systems, and infrastructure before you begin the upgrade.

## Why Version Compatibility Matters

Rancher interacts with multiple components that each have their own version requirements:

- The Kubernetes version of the management cluster
- The Kubernetes versions of downstream managed clusters
- The container runtime (containerd, Docker)
- The operating system on cluster nodes
- Helm and kubectl client versions
- cert-manager version
- Ingress controller version

A mismatch in any of these can cause upgrade failures or instability.

## Step 1: Check the Rancher Support Matrix

The Rancher support matrix is the primary reference for version compatibility. It documents which versions of Kubernetes, operating systems, and container runtimes are supported for each Rancher release.

Access the support matrix from the official SUSE Rancher support matrix site for the Rancher version you plan to upgrade to.

Key things to check:

- **Minimum and maximum Kubernetes versions** supported for the management cluster
- **Supported downstream Kubernetes versions** for managed clusters
- **Supported RKE, RKE2, and K3s versions**
- **Operating system requirements** (RHEL, Ubuntu, SLES versions)
- **Docker version requirements** (if using Docker-based RKE)

## Step 2: Check Your Current Kubernetes Version

Verify the Kubernetes version of your management cluster:

```bash
kubectl version
```

Or get the version information in structured form:

```bash
kubectl version -o yaml
```

Compare this version against the support matrix for your target Rancher version. If your Kubernetes version is too old or too new, you may need to upgrade or adjust your cluster before upgrading Rancher.

## Step 3: Check Downstream Cluster Versions

List all managed clusters and their Kubernetes versions:

```bash
kubectl get clusters.management.cattle.io -o custom-columns=\
NAME:.metadata.name,\
DISPLAY:.spec.displayName,\
K8S_VERSION:.status.version.gitVersion
```

Verify that each downstream cluster's Kubernetes version falls within the supported range for the target Rancher version.

## Step 4: Check cert-manager Compatibility

If your Rancher installation uses Rancher-generated or Let's Encrypt certificates, cert-manager is part of the TLS setup. Check your current cert-manager version:

```bash
kubectl get deployment cert-manager -n cert-manager -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Or check via Helm:

```bash
helm list -n cert-manager
```

The Rancher installation and upgrade documentation, along with the release notes for your target version, specify the supported cert-manager version or required upgrade path. You may need to upgrade cert-manager before upgrading Rancher.

## Step 5: Check Helm Version

Verify your Helm version:

```bash
helm version --short
```

For Helm-based Rancher installs, the current installation and upgrade instructions assume Helm 3. Helm v2 was deprecated in the Rancher v2.7 line and removed in Rancher v2.9, so migrate to Helm 3 before proceeding.

## Step 6: Check Node Operating Systems

List the operating systems running on your cluster nodes:

```bash
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
OS:.status.nodeInfo.osImage,\
KERNEL:.status.nodeInfo.kernelVersion,\
CONTAINER_RUNTIME:.status.nodeInfo.containerRuntimeVersion
```

Cross-reference these against the support matrix. Pay attention to:

- Supported Linux distributions and their minimum versions
- Kernel version requirements
- Container runtime compatibility (Docker vs containerd)

## Step 7: Check for Deprecated APIs

Newer versions of Rancher may run on newer Kubernetes versions that have removed deprecated APIs. Check whether the API server has recorded requests to deprecated APIs:

```bash
kubectl get --raw /metrics | grep '^apiserver_requested_deprecated_apis{'
```

You can also use tools like `kubent` (Kube No Trouble) to scan for deprecated resources:

```bash
kubent
```

If deprecated APIs are in use, update those resources before upgrading.

## Step 8: Review Upgrade Path Requirements

Rancher sometimes requires sequential upgrades. You cannot always skip versions. Check the release notes for your target version to see if there are mandatory intermediate upgrades.

For example, if you are on Rancher v2.6.x and want to upgrade to v2.8.x, you may need to upgrade to v2.7.x first.

Check your current version:

```bash
helm list -n cattle-system
kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'
```

## Step 9: Check Ingress Controller Compatibility

Verify your ingress controller version:

```bash
kubectl get deployment -n ingress-nginx -o jsonpath='{.items[0].spec.template.spec.containers[0].image}'
```

Or for Traefik (common with K3s):

```bash
kubectl get deployment traefik -n kube-system -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Some Rancher versions require specific ingress controller versions or configurations.

## Step 10: Create a Compatibility Checklist

Before proceeding with the upgrade, compile a checklist:

```plaintext
Upgrade Compatibility Checklist
================================
Current Rancher version: ___
Target Rancher version: ___

Management Cluster:
  [ ] Kubernetes version: ___ (within supported range)
  [ ] OS version: ___ (supported)
  [ ] Container runtime: ___ (supported)
  [ ] cert-manager version: ___ (compatible, if used)

Downstream Clusters:
  [ ] Cluster 1: K8s ___ (compatible)
  [ ] Cluster 2: K8s ___ (compatible)

Client Tools:
  [ ] Helm version: ___ (3.x required)
  [ ] kubectl version: ___ (compatible)

Upgrade Path:
  [ ] Direct upgrade supported (no intermediate versions required)
  [ ] No deprecated APIs in use

Release Notes:
  [ ] Breaking changes reviewed
  [ ] Migration steps noted
```

## Step 11: Test Compatibility in Staging

After verifying the checklist, test the upgrade in a staging environment that mirrors your production setup. This catches compatibility issues that the support matrix may not cover, such as custom integrations, third-party operators, or specific workload configurations.

## Conclusion

Checking version compatibility before a Rancher upgrade prevents avoidable failures and reduces risk. Use the Rancher support matrix as your primary reference, verify all component versions in your clusters, review the upgrade path requirements, and test in staging before touching production. Taking these precautions turns an upgrade from a risky operation into a predictable one.
