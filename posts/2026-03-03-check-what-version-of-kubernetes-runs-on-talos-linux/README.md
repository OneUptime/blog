# How to Check What Version of Kubernetes Runs on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Version Management, talosctl, kubectl, Cluster Management

Description: Multiple methods to check which version of Kubernetes is running on your Talos Linux cluster and understand version compatibility.

---

Knowing exactly which version of Kubernetes is running on your Talos Linux cluster is important for several reasons. You need it for compatibility checks before deploying applications, for security patching decisions, for planning upgrades, and sometimes just for troubleshooting. Since Talos Linux bundles a specific Kubernetes version with each release, the relationship between the two versions matters.

This guide covers every method available for checking Kubernetes versions on Talos Linux, plus how to understand the version relationship between Talos and Kubernetes.

## Method 1: Using kubectl

The most straightforward way to check the Kubernetes version is through kubectl:

```bash
# Check the server version (what the cluster is running)
kubectl version

# Output includes both client and server versions
# Client Version: v1.30.1
# Server Version: v1.30.1
```

If you only want the server version:

```bash
# Get just the server version in a shorter format
kubectl version --short 2>/dev/null || kubectl version

# Or use the API directly
kubectl get --raw /version | python3 -m json.tool
```

The output from the API endpoint looks like:

```json
{
    "major": "1",
    "minor": "30",
    "gitVersion": "v1.30.1",
    "gitCommit": "6911225c3f747e1cd9d109c305436d08b668f086",
    "gitTreeState": "clean",
    "buildDate": "2024-05-14T10:38:42Z",
    "goVersion": "go1.22.3",
    "compiler": "gc",
    "platform": "linux/amd64"
}
```

## Method 2: Using talosctl

talosctl provides information about the Kubernetes version bundled with Talos:

```bash
# Check the Talos version (which includes Kubernetes version info)
talosctl version --nodes 192.168.1.10
```

You can also check the kubelet version specifically:

```bash
# Get the kubelet image version
talosctl get kubeletspec --nodes 192.168.1.10 -o yaml | grep image
```

And to see which container images Talos is running for Kubernetes components:

```bash
# List Kubernetes containers and their images
talosctl containers --nodes 192.168.1.10 -k
```

This shows all running containers in the Kubernetes (CRI) namespace, including their image tags which contain version information.

## Method 3: Checking Node Information

Kubernetes nodes report their kubelet version in their status:

```bash
# Check kubelet version on all nodes
kubectl get nodes -o wide

# Output shows the VERSION column
# NAME           STATUS   ROLES           AGE   VERSION    OS-IMAGE
# talos-cp-1     Ready    control-plane   30d   v1.30.1    Talos (v1.7.0)
# talos-worker-1 Ready    <none>          30d   v1.30.1    Talos (v1.7.0)
```

For more detailed version information from a specific node:

```bash
# Get detailed node info including all version fields
kubectl get node talos-cp-1 -o yaml | grep -A20 "nodeInfo:"
```

The output includes:

```yaml
nodeInfo:
  architecture: amd64
  containerRuntimeVersion: containerd://1.7.15
  kernelVersion: 6.1.82-talos
  kubeProxyVersion: v1.30.1
  kubeletVersion: v1.30.1
  machineID: abc123
  operatingSystem: linux
  osImage: Talos (v1.7.0)
```

This gives you a complete picture: kernel version, container runtime version, kubelet version, and Talos version.

## Method 4: Checking Control Plane Component Versions

On control plane nodes, you can check the versions of individual Kubernetes components:

```bash
# Check the API server version
kubectl get pods -n kube-system -l component=kube-apiserver -o yaml | grep image:

# Check the controller manager version
kubectl get pods -n kube-system -l component=kube-controller-manager -o yaml | grep image:

# Check the scheduler version
kubectl get pods -n kube-system -l component=kube-scheduler -o yaml | grep image:

# Check the etcd version
kubectl get pods -n kube-system -l component=etcd -o yaml | grep image:
```

You can also get this information as a quick summary:

```bash
# List all control plane pods with their images
kubectl get pods -n kube-system -o custom-columns=\
NAME:.metadata.name,IMAGE:.spec.containers[0].image
```

## Method 5: Using the Talos Dashboard

If you have console access to a Talos node (physical or virtual), the Talos dashboard shows the current version on the main screen. This is useful when you cannot connect with talosctl or kubectl.

## Understanding Talos and Kubernetes Version Relationships

Each Talos release ships with a default Kubernetes version. However, Talos supports a range of Kubernetes versions, not just the default one. Here is what that means:

```bash
# The Talos version determines which Kubernetes versions are supported
# For example, Talos v1.7.0 might default to Kubernetes v1.30.x
# but also support v1.29.x and v1.28.x
```

You can check the supported version range in the Talos release notes or documentation.

### Customizing the Kubernetes Version

When generating your Talos configuration, you can specify a different Kubernetes version than the default:

```bash
# Generate config with a specific Kubernetes version
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --kubernetes-version 1.29.5
```

Or change it in an existing configuration:

```yaml
# In your machine configuration
cluster:
  # Specify the Kubernetes version for control plane components
  apiServer:
    image: registry.k8s.io/kube-apiserver:v1.29.5
  controllerManager:
    image: registry.k8s.io/kube-controller-manager:v1.29.5
  scheduler:
    image: registry.k8s.io/kube-scheduler:v1.29.5
  proxy:
    image: registry.k8s.io/kube-proxy:v1.29.5
```

## Checking for Version Skew

In a cluster with multiple nodes, it is possible (though undesirable) for different nodes to run different Kubernetes versions during an upgrade. Check for version skew:

```bash
# Check all node versions at once
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
KUBELET:.status.nodeInfo.kubeletVersion,\
OS:.status.nodeInfo.osImage
```

If you see different versions across nodes, you are mid-upgrade and should complete the process.

## Checking Version Compatibility for Workloads

Some applications require specific Kubernetes versions. Here is how to check compatibility:

```bash
# Check the Kubernetes API versions available
kubectl api-versions

# Check if a specific API version exists
kubectl api-versions | grep "apps/v1"

# Check available API resources
kubectl api-resources
```

This tells you which API versions your cluster supports, which is important for deploying workloads that use specific API features.

## Automating Version Checks

For monitoring and alerting, you can automate version checks:

```bash
#!/bin/bash
# check-versions.sh - Report cluster version information

echo "=== Kubernetes Version ==="
kubectl version --short 2>/dev/null || kubectl version

echo ""
echo "=== Node Versions ==="
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
VERSION:.status.nodeInfo.kubeletVersion,\
RUNTIME:.status.nodeInfo.containerRuntimeVersion,\
OS:.status.nodeInfo.osImage

echo ""
echo "=== Talos Version ==="
talosctl version --nodes 192.168.1.10 --short
```

## When Version Information Matters

### Before Upgrades

Always check your current versions before starting an upgrade:

```bash
# Document current state before upgrading
kubectl get nodes -o wide > /tmp/pre-upgrade-state.txt
kubectl version >> /tmp/pre-upgrade-state.txt
talosctl version --nodes 192.168.1.10 >> /tmp/pre-upgrade-state.txt
```

### After Upgrades

Verify that everything is running the expected version:

```bash
# Verify all nodes are running the new version
kubectl get nodes -o wide

# Verify control plane components
kubectl get pods -n kube-system -o wide
```

### For Security Advisories

When a Kubernetes CVE is announced, you need to quickly determine whether your cluster is affected:

```bash
# Quick version check
kubectl version --short 2>/dev/null | grep "Server"
```

Compare the output against the affected version range in the advisory.

## Conclusion

Checking the Kubernetes version on Talos Linux is straightforward, with multiple methods available depending on what tools you have access to. kubectl is the simplest approach, while talosctl gives you Talos-specific context. For thorough checks, use the node info approach to verify all nodes are running the same version. Understanding the relationship between Talos versions and Kubernetes versions helps you plan upgrades and ensure compatibility across your cluster.
