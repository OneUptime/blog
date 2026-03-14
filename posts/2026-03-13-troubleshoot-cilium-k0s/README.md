# Troubleshoot Cilium on k0s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K0s, EBPF

Description: A guide to diagnosing and resolving Cilium networking issues on k0s Kubernetes clusters, covering k0s-specific CNI configuration and common failure modes.

---

## Introduction

k0s is a lightweight, self-contained Kubernetes distribution designed for simplicity and operational efficiency. It supports Cilium as a CNI option, and when configured correctly, provides a solid foundation for Cilium's eBPF networking features.

However, k0s's self-contained architecture introduces some differences from standard Kubernetes deployments. The containerd socket location, static pod directories, and CNI configuration paths differ from kubeadm clusters, which can cause unexpected issues when installing or troubleshooting Cilium.

This guide covers Cilium troubleshooting specific to k0s clusters.

## Prerequisites

- k0s cluster with Cilium installed
- `kubectl` configured for the k0s cluster
- `cilium` CLI installed
- `k0s` binary available on the control plane node

## Step 1: Verify Cilium Installation on k0s

Confirm Cilium is correctly installed and running on k0s.

```bash
# Check k0s status
k0s status

# Verify Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Run Cilium status check
cilium status --wait

# Check k0s-specific CNI configuration
ls -la /etc/k0s/

# Verify CNI config in k0s data directory
ls -la /var/lib/k0s/bin/
```

## Step 2: Configure Cilium as k0s CNI

If Cilium was not installed during cluster provisioning, configure it correctly.

```yaml
# k0s-cilium-config.yaml - k0s cluster configuration with Cilium
apiVersion: k0s.k0sproject.io/v1beta1
kind: ClusterConfig
metadata:
  name: k0s
spec:
  network:
    provider: custom
    # k0s will not deploy any default CNI when provider is custom
    podCIDR: 10.244.0.0/16
    serviceCIDR: 10.96.0.0/12
```

```bash
# Apply k0s config
k0s install controller --config k0s-cilium-config.yaml

# Deploy Cilium after cluster is up
cilium install --version 1.15.0
```

## Step 3: Diagnose CNI Configuration Issues

Check the CNI configuration files and directories.

```bash
# k0s uses a specific CNI directory - verify it exists and is correct
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls -la /etc/cni/net.d/

# Check the active CNI configuration
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /etc/cni/net.d/05-cilium.conflist

# Verify Cilium binaries are in the CNI binary directory
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls -la /opt/cni/bin/ | grep cilium
```

## Step 4: Debug k0s-Specific Connectivity Issues

Investigate connectivity problems specific to the k0s environment.

```bash
# Check k0s worker node status
k0s kubectl get nodes

# Verify containerd socket path is correct for k0s
# k0s uses /run/k0s/containerd.sock by default
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls -la /run/k0s/

# Check Cilium agent logs for k0s-specific errors
CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

kubectl logs -n kube-system ${CILIUM_POD} | grep -E "ERROR|containerd|socket"
```

## Step 5: Validate Network Policy Enforcement on k0s

Test that Cilium network policies work correctly on k0s.

```bash
# Run the standard Cilium connectivity test
cilium connectivity test

# Test network policy with a simple deny-all policy
kubectl create namespace k0s-test
kubectl run -n k0s-test server --image=nginx
kubectl run -n k0s-test client --image=busybox -- sleep 3600

# Verify connectivity before policy
kubectl exec -n k0s-test client -- wget -qO- http://server.k0s-test.svc.cluster.local

# Apply network policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: k0s-test
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

# Verify policy is enforced
kubectl exec -n k0s-test client -- wget -T 5 -qO- http://server.k0s-test.svc.cluster.local
```

## Best Practices

- Configure k0s with `provider: custom` networking before installing Cilium-changing CNI after deployment is disruptive
- Use the `cilium install` command with the `--set` flags to pass k0s-specific configuration
- Always check k0s and Cilium version compatibility before upgrading either component
- Validate connectivity using `cilium connectivity test` after every k0s cluster upgrade
- Monitor Cilium pod restarts after k0s updates as an early indicator of issues

## Conclusion

Running Cilium on k0s is straightforward when the cluster is correctly configured for custom CNI. By verifying the CNI configuration, checking k0s-specific paths, and validating network policy enforcement, you can maintain reliable Cilium networking on k0s clusters. The key is configuring k0s for custom CNI before installing Cilium.
