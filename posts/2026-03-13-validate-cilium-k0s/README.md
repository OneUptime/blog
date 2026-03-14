# Validate Cilium on k0s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, k0s, kubernetes, networking, cni, lightweight

Description: Learn how to validate Cilium CNI on k0s Kubernetes clusters, covering installation verification, networking checks, and connectivity testing specific to the k0s distribution.

---

## Introduction

k0s is a lightweight, zero-friction Kubernetes distribution designed for simple deployment and operation. It bundles all Kubernetes components into a single binary and supports Cilium as a CNI option through its built-in extension mechanism. Validating Cilium on k0s involves both k0s-specific configuration checks and standard Cilium health validation.

The k0s distribution manages CNI deployment through its `HelmExtension` mechanism, which installs Cilium as a Helm chart. This means configuration is applied through the k0s cluster configuration rather than direct Helm values, requiring familiarity with both k0s configuration and Cilium's Helm chart options.

This guide covers the validation steps specific to k0s, from checking the k0s cluster configuration to running Cilium connectivity tests.

## Prerequisites

- k0s cluster with Cilium configured as the CNI
- `k0s` CLI available on the control plane node
- `kubectl` configured with kubeconfig from the k0s cluster
- `cilium` CLI installed

## Step 1: Verify k0s Cluster Configuration

Check that Cilium is correctly specified in the k0s cluster configuration.

```bash
# View the k0s cluster config to confirm Cilium is the CNI extension
k0s config status

# If you have the config file, check the network and extension sections
# Typical location: /etc/k0s/k0s.yaml
# The spec.network.provider should be "custom" when using Cilium
# and spec.extensions.helm should list Cilium
```

```yaml
# Example k0s.yaml snippet showing Cilium configuration
apiVersion: k0s.k0sproject.io/v1beta1
kind: ClusterConfig
metadata:
  name: k0s
spec:
  network:
    provider: custom    # Required for Cilium
    podCIDR: 10.244.0.0/16
    serviceCIDR: 10.96.0.0/12
  extensions:
    helm:
      repositories:
        - name: cilium
          url: https://helm.cilium.io
      charts:
        - name: cilium
          chartname: cilium/cilium
          version: "1.15.5"
          namespace: kube-system
          values: |
            kubeProxyReplacement: true
            k8sServiceHost: <control-plane-ip>
            k8sServicePort: 6443
```

## Step 2: Validate k0s Component Health

Check k0s-specific components before Cilium validation.

```bash
# Check k0s worker and controller status
k0s status

# Verify all k0s system pods are running
kubectl -n kube-system get pods

# Check that the kube-proxy DaemonSet is absent (if using Cilium's replacement)
kubectl -n kube-system get daemonset kube-proxy 2>/dev/null || \
  echo "kube-proxy absent — Cilium replacement active"
```

## Step 3: Validate Cilium Installation

Run standard Cilium health checks.

```bash
# Check Cilium DaemonSet is fully deployed
kubectl -n kube-system get daemonset cilium

# Run cilium CLI health check
cilium status --wait

# Check Cilium operator
kubectl -n kube-system get deployment cilium-operator
```

## Step 4: Test Pod Connectivity

Validate networking works correctly between pods.

```bash
# Deploy two test pods
kubectl run client --image=busybox:1.36 -- sleep 3600
kubectl run server --image=nginx:alpine

# Wait for pods to be ready
kubectl wait --for=condition=Ready pod/client pod/server

# Test pod-to-pod connectivity
SERVER_IP=$(kubectl get pod server -o jsonpath='{.status.podIP}')
kubectl exec client -- wget -qO- http://$SERVER_IP

# Test DNS resolution
kubectl exec client -- nslookup kubernetes.default.svc.cluster.local
```

## Step 5: Run Cilium Connectivity Test Suite

```bash
# Run the full connectivity test to validate all networking scenarios
cilium connectivity test

# Clean up k0s test resources after validation
kubectl delete pod client server --ignore-not-found
kubectl delete namespace cilium-test --ignore-not-found
```

## Best Practices

- Always use `provider: custom` in k0s network config when using Cilium
- Set `k8sServiceHost` and `k8sServicePort` in Cilium values to enable kube-proxy replacement
- Test after every k0s version upgrade as the Helm extension mechanism may change
- Use k0s `k0s etcd backup` before modifying network configuration
- Monitor k0s logs for CNI errors: `k0s logs --role=worker`

## Conclusion

Validating Cilium on k0s requires checking both the k0s-specific configuration (cluster config, extension mechanism) and the standard Cilium health indicators. When both layers are verified and connectivity tests pass, you have a confirmed working Cilium installation on your k0s cluster that is ready for production workloads.
