# Run a New Cilium Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF

Description: Learn how to perform a new Cilium installation on a Kubernetes cluster using the cilium CLI and Helm, covering pre-flight checks, installation options, and post-install validation.

---

## Introduction

Installing Cilium correctly from the start sets the foundation for reliable network policy enforcement, eBPF-based performance, and Hubble observability. A new Cilium installation replaces any existing CNI plugin (or fills the role in a cluster where no CNI exists) and takes over pod networking for all current and future workloads.

The installation process requires pre-flight checks to verify kernel and system requirements, a choice of installation method (Helm or cilium CLI), configuration of the core options (IP pool, encapsulation mode, kube-proxy replacement), and post-install validation using the connectivity test suite. Getting these steps right prevents networking issues and avoids the need for complex post-install remediation.

## Prerequisites

- Kubernetes cluster with no CNI installed, or a planned CNI migration
- Linux kernel 5.4+ on all nodes
- `cilium` CLI installed
- `helm` v3.x installed
- `kubectl` configured for the cluster
- Nodes able to reach the container registry

## Step 1: Run Pre-Flight Checks

Validate that all nodes meet Cilium's requirements before installation.
```bash
# Run Cilium's pre-flight checker to validate node requirements
cilium install --dry-run

# For a detailed pre-flight check with kernel feature validation
cilium preflight install --config-path /tmp/cilium-check

# Check kernel version on each node
kubectl get nodes -o wide
kubectl debug node/<node-name> -it --image=busybox -- uname -r
```

## Step 2: Install Cilium Using the CLI

Use the cilium CLI for a straightforward installation with sensible defaults.
```bash
# Install Cilium with default settings (autodetects Kubernetes version)
cilium install --version 1.14.0

# Install with specific options for production use
cilium install \
  --version 1.14.0 \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<api-server-ip> \
  --set k8sServicePort=6443

# Wait for all Cilium pods to be ready
cilium status --wait
```

## Step 3: Install Cilium Using Helm (Recommended for Production)

For production deployments, Helm provides more configuration flexibility.
```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with Helm using a values file
helm install cilium cilium/cilium \
  --version 1.14.0 \
  --namespace kube-system \
  --values cilium-values.yaml
```

The values file for a production installation:
```yaml
# cilium-values.yaml
# Production Cilium installation values

# Enable kube-proxy replacement for better performance
kubeProxyReplacement: true
k8sServiceHost: "<api-server-ip>"
k8sServicePort: "6443"

# IPAM mode - kubernetes uses pod CIDR from node spec
ipam:
  mode: kubernetes

# Enable Hubble for network observability
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true

# Enable Prometheus metrics export
prometheus:
  enabled: true
  serviceMonitor:
    enabled: true

# Resource limits for Cilium agents
resources:
  limits:
    cpu: 4000m
    memory: 4Gi
  requests:
    cpu: 100m
    memory: 512Mi
```

## Step 4: Restart Existing Pods

After installation, existing pods must be restarted to get Cilium-managed network interfaces.
```bash
# Restart all pods in all non-system namespaces
kubectl get pods --all-namespaces -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name' \
  | grep -v 'kube-system\|cilium' \
  | tail -n +2 \
  | xargs -I{} sh -c 'echo {} | read ns name; kubectl delete pod $name -n $ns'

# Or use a rolling restart for each deployment
kubectl rollout restart deployment --all -n <namespace>
```

## Step 5: Run Connectivity Tests

Validate the installation with the built-in connectivity test suite.
```bash
# Run the full connectivity test suite
cilium connectivity test

# Check that Hubble is receiving flows
cilium hubble port-forward &
hubble observe --last 20
```

## Best Practices

- Always run pre-flight checks before installation to catch compatibility issues early
- Use Helm with a `values.yaml` file stored in Git for reproducible production installations
- Enable Hubble relay and UI from day one for observability
- Set resource limits on Cilium pods to prevent agent resource contention
- Test in a non-production cluster before installing on production
- Document your chosen `kubeProxyReplacement` setting - changing it later requires careful planning

## Conclusion

A well-planned Cilium installation with pre-flight validation, correct configuration, and post-install connectivity testing sets a solid foundation for your cluster's network security and observability. Use Helm with version-controlled values for production deployments, and make the connectivity test suite part of your standard installation procedure to catch any environment-specific issues before workloads go live.
