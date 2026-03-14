# Cilium CRI-O Integration: Configure, Troubleshoot, Validate, and Monitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF, IPAM

Description: A complete guide to integrating Cilium with the CRI-O container runtime including socket configuration, troubleshooting common CRI-O-specific issues, and validating Cilium endpoint creation with...

---

## Introduction

CRI-O is a lightweight, purpose-built implementation of the Kubernetes Container Runtime Interface (CRI). It is the default container runtime for Red Hat OpenShift and is widely used with RHEL and Fedora-based Kubernetes distributions. CRI-O's design philosophy of doing one thing well - running OCI-compatible containers for Kubernetes - makes it a strong choice for production environments where minimalism and security are priorities.

Cilium's integration with CRI-O follows the same pattern as other CRI-compliant runtimes but has CRI-O-specific considerations: the socket path is `/var/run/crio/crio.sock`, CRI-O uses different CNI invocation behaviors than containerd in some versions, and SELinux contexts on RHEL/OpenShift nodes can affect Cilium's ability to access the socket and mount BPF filesystems.

This guide covers the complete setup for Cilium with CRI-O, common CRI-O-specific issues, validation procedures, and monitoring for this runtime combination.

## Prerequisites

- Kubernetes cluster running CRI-O
- Cilium installed or being installed
- `kubectl` with cluster admin access
- Node access via `kubectl debug` or SSH
- For RHEL/OpenShift: `oc` CLI and SELinux familiarity

## Configure Cilium for CRI-O

Install or configure Cilium for CRI-O:

```bash
# Verify CRI-O is the runtime
kubectl get nodes -o wide | awk '{print $1, $11}'
# Should show: cri-o://x.y.z in CONTAINER-RUNTIME column

# Check CRI-O socket path
kubectl debug node/<node-name> -it --image=ubuntu -- ls -la /var/run/crio/crio.sock

# Install Cilium with CRI-O configuration
helm install cilium cilium/cilium \
  --version 1.15.6 \
  --namespace kube-system \
  --set containerRuntime.integration=crio \
  --set containerRuntime.socketPath=/var/run/crio/crio.sock \
  --set cni.binPath=/opt/cni/bin \
  --set cni.confPath=/etc/cni/net.d

# For OpenShift, additional settings required
helm install cilium cilium/cilium \
  --version 1.15.6 \
  --namespace kube-system \
  --set containerRuntime.integration=crio \
  --set containerRuntime.socketPath=/var/run/crio/crio.sock \
  --set nodeinit.enabled=true \
  --set cni.binPath=/var/lib/cni/bin \
  --set cni.confPath=/etc/cni/net.d
```

Configure CRI-O to use Cilium as CNI:

```bash
# CRI-O looks for CNI configs in /etc/cni/net.d/
# Verify Cilium CNI config is present after Cilium installation
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /etc/cni/net.d/05-cilium.conf

# Check CRI-O is configured to use the correct CNI directory
cat /etc/crio/crio.conf | grep cni_config_dir
# Should be: cni_config_dir = "/etc/cni/net.d"

# Check CRI-O network plugin
cat /etc/crio/crio.conf | grep network_dir
```

## Troubleshoot CRI-O-Specific Issues

Diagnose CRI-O and Cilium integration problems:

```bash
# Check CRI-O service status
systemctl status crio

# Check CRI-O logs for CNI errors
journalctl -u crio -f | grep -i "cni\|cilium\|network"

# Test CRI-O CNI invocation manually
crictl --runtime-endpoint unix:///var/run/crio/crio.sock runp /tmp/test-pod.json

# Check Cilium can access CRI-O socket
kubectl -n kube-system exec ds/cilium -- \
  ls -la /var/run/crio/crio.sock

# Diagnose SELinux blocking socket access (RHEL/OpenShift)
ausearch -m avc | grep crio
sealert -a /var/log/audit/audit.log | grep crio
```

Fix common CRI-O issues:

```bash
# Issue: SELinux blocking Cilium access to CRI-O socket
# Option 1: Add SELinux policy for Cilium
semanage fcontext -a -t container_runtime_exec_t /var/run/crio/crio.sock
restorecon -v /var/run/crio/crio.sock

# Option 2: Set permissive mode for testing (not for production)
setenforce 0  # Test only

# Issue: Wrong socket path for CRI-O version
# CRI-O < 1.20: /var/run/crio/crio.sock
# CRI-O >= 1.20: /var/run/crio/crio.sock (same)
rpm -q cri-o  # Check CRI-O version
dpkg -l cri-o  # Debian/Ubuntu

# Issue: CRI-O not invoking Cilium CNI for pod creation
journalctl -u crio | grep "Running CNI conf\|CNI ADD"
# Verify /etc/cni/net.d/05-cilium.conf is correct JSON
cat /etc/cni/net.d/05-cilium.conf | python3 -m json.tool

# Issue: CRI-O version incompatible with Cilium version
crio --version
cilium version
# Check Cilium docs for CRI-O compatibility matrix
```

## Validate CRI-O Integration

Confirm Cilium is correctly integrated with CRI-O:

```bash
# Create a test pod and verify Cilium handles it
kubectl run crio-test --image=nginx --restart=Never
kubectl wait pod/crio-test --for=condition=Ready --timeout=60s

# Verify Cilium endpoint was created for the test pod
POD_IP=$(kubectl get pod crio-test -o jsonpath='{.status.podIP}')
kubectl -n kube-system exec ds/cilium -- \
  cilium endpoint list | grep $POD_IP
# Should show the endpoint in "ready" state

# Verify labels from CRI-O are propagated to Cilium identity
kubectl -n kube-system exec ds/cilium -- \
  cilium endpoint get $(kubectl -n kube-system exec ds/cilium -- \
    cilium endpoint list | grep $POD_IP | awk '{print $1}') | \
  jq '.status.identity.labels'

# Test connectivity
kubectl exec crio-test -- curl -s http://kubernetes.default.svc.cluster.local

# Clean up
kubectl delete pod crio-test
```

## Monitor CRI-O and Cilium

```mermaid
graph TD
    A[CRI-O] -->|Pod start event| B[/var/run/crio/crio.sock]
    B -->|CRI call| C[Cilium Agent]
    C -->|Configure netns| D[Pod Network]
    E[SELinux] -->|Policy check| B
    E -->|Block if denied| F[Socket access denied]
    G[Cilium Monitor] -->|Watch| B
    H[journalctl] -->|CRI-O logs| I[CNI invocation log]
```

Monitor CRI-O and Cilium integration health:

```bash
# Watch CRI-O CNI invocations in real-time
journalctl -u crio -f | grep -E "CNI|cilium|network" &

# Monitor Cilium endpoint creation tied to CRI-O events
kubectl -n kube-system exec ds/cilium -- cilium monitor --type endpoint &

# Check for CRI-O-related errors in Cilium
kubectl -n kube-system logs ds/cilium --since=1h | grep -i "crio\|runtime\|socket"

# Periodic check: compare CRI-O containers to Cilium endpoints
crictl --runtime-endpoint unix:///var/run/crio/crio.sock ps | wc -l
kubectl -n kube-system exec ds/cilium -- cilium endpoint list | wc -l
```

## Conclusion

CRI-O and Cilium integration is straightforward once the correct socket path and CNI configuration directories are set. The most common issues on RHEL and OpenShift environments are SELinux denials that prevent Cilium from accessing the CRI-O socket or the BPF filesystem. Always run SELinux audit log analysis when Cilium fails on these platforms. Validate the integration by creating test pods and confirming that Cilium creates endpoints and assigns correct identities based on Kubernetes labels from CRI-O. Running `cilium connectivity test` after initial setup gives confidence that the full networking stack is functional with CRI-O as the runtime.
