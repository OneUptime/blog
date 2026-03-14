# Validate Azure CNI with Cilium on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, EBPF

Description: A practical guide to validating Azure CNI with Cilium as the network policy engine on Azure Kubernetes Service, covering installation checks, connectivity tests, and policy enforcement verification.

---

## Introduction

Azure Kubernetes Service supports Azure CNI with Cilium as a powerful combination that provides native Azure networking alongside Cilium's advanced eBPF-based policy enforcement. This pairing gives you the IP address management and VNet integration benefits of Azure CNI while leveraging Cilium's high-performance dataplane.

Validating this setup after deployment is critical to ensure that pod networking, network policies, and service connectivity all function as expected. Misconfigured CNI plugins can lead to silent failures where pods appear healthy but cannot communicate properly, making systematic validation essential.

This guide walks through the key validation steps for an AKS cluster running Azure CNI with Cilium, from checking the Cilium agent status to running end-to-end connectivity tests.

## Prerequisites

- AKS cluster created with `--network-plugin azure` and `--network-plugin-mode overlay` or `--network-dataplane cilium`
- `kubectl` configured to point to your AKS cluster
- `cilium` CLI installed (v0.15+)
- `az` CLI authenticated and targeting the correct subscription

## Step 1: Verify Cilium Agent Status

Check that all Cilium agents are running and healthy across every node in the cluster.

```bash
# Check Cilium DaemonSet rollout status
kubectl -n kube-system rollout status daemonset/cilium

# Verify all Cilium pods are in Running state
kubectl -n kube-system get pods -l k8s-app=cilium -o wide

# Use the Cilium CLI for a consolidated status overview
cilium status --wait
```

## Step 2: Check Azure CNI Integration

Confirm that Azure CNI is the active IPAM mode and that node CIDRs are assigned correctly.

```bash
# Inspect the Cilium ConfigMap for IPAM mode
kubectl -n kube-system get configmap cilium-config -o jsonpath='{.data.ipam}'

# List CiliumNode objects to verify Azure pod CIDRs are present
kubectl get ciliumnodes -o custom-columns=\
NAME:.metadata.name,\
PODCIDR:.spec.ipam.podCIDRs

# Confirm pods receive IPs from the expected Azure subnet range
kubectl get pods -A -o wide | awk '{print $7}' | sort -u
```

## Step 3: Run the Cilium Connectivity Test

Execute the built-in connectivity test suite to validate the full networking stack.

```bash
# Deploy and run the Cilium connectivity test suite
# This creates a dedicated test namespace and runs ~40 test scenarios
cilium connectivity test --test-namespace cilium-test

# Run a quick subset of tests for faster validation
cilium connectivity test --test '/pod-to-pod' --test '/pod-to-service'
```

## Step 4: Validate Network Policy Enforcement

Deploy a test network policy and confirm that Cilium enforces it correctly.

```yaml
# cilium-test-policy.yaml - deny all ingress except from labeled pods
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: allow-labeled-ingress
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
```

```bash
# Apply the policy and test enforcement
kubectl apply -f cilium-test-policy.yaml

# Verify the policy appears in Cilium's policy store
cilium policy get
```

## Best Practices

- Always run `cilium connectivity test` after any cluster upgrade or CNI config change
- Monitor the `cilium_drop_count_total` Prometheus metric to catch unexpected policy drops
- Use `cilium endpoint list` to inspect per-pod policy status and identity assignments
- Ensure Azure subnet IP ranges are large enough to accommodate node expansion
- Enable Hubble observability for real-time flow visibility during troubleshooting

## Conclusion

Validating Azure CNI with Cilium on AKS ensures your cluster's networking layer is healthy and policy enforcement is active before workloads go to production. By combining Azure's native IPAM with Cilium's eBPF dataplane, you get a robust networking foundation-but only systematic validation confirms everything is wired together correctly.
