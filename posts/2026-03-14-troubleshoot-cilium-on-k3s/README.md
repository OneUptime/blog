# Troubleshooting Cilium on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K3s

Description: Diagnose and resolve common issues when running Cilium as the CNI on K3s, including agent failures, connectivity problems, and K3s-specific conflicts.

---

## Introduction

Running Cilium on K3s introduces a unique set of potential issues that differ from standard Kubernetes deployments. K3s bundles several components that can conflict with Cilium, and its lightweight architecture makes different assumptions about the networking stack.

The most common issues fall into three categories: Cilium agent startup failures, pod connectivity problems, and conflicts between Cilium and K3s bundled components. This guide provides diagnostic steps and solutions for each category.

Understanding the K3s-specific context is critical for effective troubleshooting. K3s uses containerd by default, embeds its own kube-proxy, and has a unique approach to CNI configuration that differs from kubeadm-based clusters.

## Prerequisites

- A K3s cluster where Cilium is installed or being installed
- `kubectl` with access to the cluster
- Root access to K3s nodes for system-level diagnostics
- The Cilium CLI installed

## Diagnosing Cilium Agent Startup Failures

When Cilium agent pods fail to start on K3s:

```bash
# Check Cilium agent pod status
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Get detailed error messages from failing pods
kubectl describe pod -n kube-system -l k8s-app=cilium | grep -A10 "Events:"

# Check Cilium agent logs for startup errors
kubectl logs -n kube-system -l k8s-app=cilium --tail=100

# Common error patterns and their meanings:
# "Unable to contact k8s api-server" → Wrong k8sServiceHost value
# "BPF host device not found" → Kernel too old or BPF not available
# "Another CNI is already configured" → Flannel was not disabled
```

Fix the most common K3s-specific startup issue:

```bash
# If Flannel was not disabled during K3s install, you must reinstall K3s
# Stop K3s
sudo systemctl stop k3s

# Clean up existing CNI configuration
sudo rm -rf /var/lib/cni/
sudo rm -rf /etc/cni/net.d/*

# Reinstall K3s with Flannel disabled
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="\
  --flannel-backend=none \
  --disable-network-policy \
  --disable=traefik" sh -
```

## Diagnosing Pod Connectivity Issues

When pods cannot communicate through Cilium:

```bash
# Check Cilium endpoint status for affected pods
cilium endpoint list

# Check BPF maps for routing information
kubectl exec -n kube-system $(kubectl get pod -n kube-system \
  -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}') -- \
  cilium bpf tunnel list

# Monitor dropped packets in real time
kubectl exec -n kube-system $(kubectl get pod -n kube-system \
  -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}') -- \
  cilium monitor --type drop

# Check Cilium health status
cilium status --verbose

# Verify routing mode
cilium config view | grep tunnel
# Should show: tunnel=vxlan (or geneve/disabled depending on config)
```

## Resolving K3s Component Conflicts

K3s bundled components can conflict with Cilium:

```bash
# Check if kube-proxy is still running (should not be if kubeProxyReplacement=true)
kubectl get pods -n kube-system | grep kube-proxy

# If kube-proxy is running alongside Cilium with kubeProxyReplacement=true:
# Remove the kube-proxy DaemonSet
kubectl -n kube-system delete ds kube-proxy 2>/dev/null
# Clean up kube-proxy iptables rules
kubectl exec -n kube-system $(kubectl get pod -n kube-system \
  -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}') -- \
  cilium cleanup-kube-proxy

# Check for leftover Flannel interfaces
ip link show type vxlan | grep flannel
# If flannel interfaces exist, remove them:
# sudo ip link delete flannel.1 2>/dev/null
# sudo ip link delete cni0 2>/dev/null

# Verify no conflicting CNI configurations exist
ls -la /etc/cni/net.d/
# Should only contain 05-cilium.conflist (or similar Cilium config)
```

## Diagnosing DNS Resolution Failures

DNS issues are common after installing Cilium on K3s:

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Test DNS from a pod
kubectl run dns-debug --image=busybox --restart=Never -- sleep 300
kubectl wait --for=condition=Ready pod/dns-debug --timeout=60s
kubectl exec dns-debug -- nslookup kubernetes.default
kubectl exec dns-debug -- cat /etc/resolv.conf
kubectl delete pod dns-debug

# If DNS fails, restart CoreDNS after Cilium is ready
kubectl rollout restart deployment coredns -n kube-system
kubectl rollout status deployment coredns -n kube-system --timeout=60s
```

## Verification

After resolving issues, validate the fix:

```bash
# Run comprehensive Cilium health check
cilium status

# Verify connectivity
cilium connectivity test --test pod-to-pod,pod-to-service,dns-resolution

# Verify all nodes have Cilium agents running
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Check that all endpoints are in a ready state
cilium endpoint list | grep -v "ready"
```

## Troubleshooting

- **Cilium agent logs show "context deadline exceeded" connecting to K8s API**: The `k8sServiceHost` in the Helm values does not resolve or is not reachable from the node. Update to the correct node IP with `helm upgrade cilium cilium/cilium --set k8sServiceHost=CORRECT_IP`.
- **Pods stuck in ContainerCreating after Cilium install**: Cilium may still be initializing. Wait for `cilium status` to show all components as OK. If it persists, check BPF filesystem mount with `mount | grep bpf`.
- **eBPF programs fail to load**: The kernel may be too old. Check with `uname -r`. Cilium requires kernel 4.19+ for basic features and 5.4+ for full features. Consider upgrading the host OS.
- **Hubble not showing flows**: Verify Hubble is enabled with `cilium config view | grep hubble`. If enabled but not working, restart the Hubble relay with `kubectl rollout restart deployment hubble-relay -n kube-system`.

## Conclusion

Troubleshooting Cilium on K3s centers on three main areas: agent startup failures (usually caused by Flannel not being disabled or incorrect API server configuration), pod connectivity problems (typically routing or BPF issues), and K3s component conflicts (kube-proxy or leftover Flannel state). The Cilium CLI and `cilium monitor` command are your primary diagnostic tools for identifying the specific failure point.
