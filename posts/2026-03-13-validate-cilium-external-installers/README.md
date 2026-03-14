# Validate Cilium Installed via External Installers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: Learn how to validate Cilium installations deployed via external tools such as Helm, kubeadm, or cluster provisioners, ensuring correct configuration and functionality regardless of the...

---

## Introduction

Cilium can be installed through multiple mechanisms: the `cilium` CLI, Helm, kubeadm init phases, cluster lifecycle tools like Cluster API, or managed Kubernetes provisioners that bundle Cilium as the default CNI. Each installer may apply different default configurations, and the resulting installation needs to be validated to confirm it matches your intended configuration and that all components are functional.

When Cilium is installed by an external tool, you may not have full visibility into the exact flags and values that were used. Validation becomes especially important in these cases because mismatches between the installer's defaults and your operational requirements can cause subtle networking issues that only manifest under specific conditions.

This guide provides a universal validation approach for Cilium regardless of how it was installed.

## Prerequisites

- Kubernetes cluster with Cilium installed via any method (Helm, kubeadm, managed service, etc.)
- `kubectl` cluster-admin access
- `cilium` CLI installed (separate from the installation method)
- `helm` CLI (if installed via Helm, for configuration review)

## Step 1: Identify the Installation Method and Version

Determine how Cilium was installed and what version is running.

```bash
# Check which Cilium version is deployed
kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Check if a Helm release exists
helm list -n kube-system | grep cilium

# If installed via Helm, inspect the values that were used
helm get values cilium -n kube-system
```

## Step 2: Review the Cilium ConfigMap

The ConfigMap is the source of truth for Cilium's runtime configuration.

```bash
# Dump the full Cilium configuration
kubectl -n kube-system get configmap cilium-config -o yaml

# Check key configuration parameters
kubectl -n kube-system get configmap cilium-config -o jsonpath='{.data}' | \
  python3 -m json.tool | grep -E '"ipam"|"tunnel"|"kube-proxy|"bpf-"'
```

## Step 3: Validate All Cilium Components Are Running

Check all components that different installers may deploy.

```bash
# Check the Cilium DaemonSet
kubectl -n kube-system get daemonset cilium

# Check the Cilium Operator
kubectl -n kube-system get deployment cilium-operator

# Check Hubble components if enabled
kubectl -n kube-system get deployment hubble-relay 2>/dev/null
kubectl -n kube-system get daemonset hubble-ui 2>/dev/null

# Use cilium CLI for a comprehensive status check
cilium status --wait
```

## Step 4: Compare Actual vs. Expected Configuration

Validate that installer-applied settings match your requirements.

```bash
# Check kube-proxy replacement status
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.kube-proxy-replacement}'

# Verify IPAM mode
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.ipam}'

# Check tunnel mode (vxlan, geneve, or disabled)
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.tunnel}'

# Confirm eBPF masquerading setting
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.enable-bpf-masquerade}'
```

## Step 5: Run the Connectivity Test Suite

Regardless of installation method, the connectivity test validates actual functionality.

```bash
# Run the full connectivity test suite
cilium connectivity test

# Check for any failures and review verbose output
cilium connectivity test --verbose 2>&1 | tail -50
```

## Step 6: Verify CNI Binary Placement

Confirm the CNI binary was correctly installed on all nodes.

```bash
# Check CNI binary exists on nodes via a Cilium pod
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  ls -la /host/opt/cni/bin/ | grep cilium
```

## Best Practices

- Always run `cilium status` and `cilium connectivity test` after any external installer applies Cilium
- Document the expected ConfigMap values for your environment and compare after installations
- Use `helm get values` to capture and version-control installer configuration
- Test in a non-production cluster with the same installer before applying to production
- Subscribe to Cilium release notes for installer-specific changes between versions

## Conclusion

Validating Cilium installed by external tools requires examining the actual configuration applied rather than assuming the installer used your intended defaults. By checking the ConfigMap, verifying component health, and running connectivity tests, you confirm that the external installer produced a correct and functional Cilium deployment that meets your cluster's networking requirements.
