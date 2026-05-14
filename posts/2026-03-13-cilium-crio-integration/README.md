# Cilium CRI-O Integration: Configure, Troubleshoot, Validate, and Monitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF, IPAM

Description: A complete guide to integrating Cilium with the CRI-O container runtime including socket configuration, troubleshooting common CRI-O-specific issues, and validating Cilium endpoint creation with...

---

## Introduction

CRI-O is a lightweight, purpose-built implementation of the Kubernetes Container Runtime Interface (CRI). It is the default container runtime for Red Hat OpenShift and is widely used with RHEL and Fedora-based Kubernetes distributions. CRI-O's design philosophy of doing one thing well - running OCI-compatible containers for Kubernetes - makes it a strong choice for production environments where minimalism and security are priorities.

Cilium's integration with CRI-O follows the same pattern as other CRI-compliant runtimes but has CRI-O-specific considerations: CRI-O uses the CNI configuration on disk and may need to be restarted after Cilium writes it, the CRI-O socket path for diagnostics is typically `/var/run/crio/crio.sock` (or `/run/crio/crio.sock`), and SELinux contexts on RHEL/OpenShift nodes can affect Cilium's ability to mount BPF filesystems and use required host paths.

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

kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.containerRuntimeVersion}{"\n"}{end}'
# Should show: cri-o://x.y.z for each node

# Check CRI-O socket path
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls -la /host/var/run/crio/crio.sock

# Install Cilium. The default CNI paths match most CRI-O installations.
helm install cilium cilium/cilium \
  --version 1.15.6 \
  --namespace kube-system \
  --set cni.binPath=/opt/cni/bin \
  --set cni.confPath=/etc/cni/net.d

# For OpenShift, follow the Cilium OpenShift/OKD installation guidance for
# your distribution or vendor-supported OLM image rather than a generic Helm
# install on an already-running OpenShift cluster.
```

Configure CRI-O to use Cilium as CNI:

```bash
# CRI-O looks for CNI configs in /etc/cni/net.d/
# Verify Cilium CNI config is present after Cilium installation
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /host/etc/cni/net.d/05-cilium.conflist

# Check CRI-O is configured to use the correct CNI directory.
# Depending on CRI-O version and packaging, this may appear as
# cni_config_dir or network_dir.
grep -R "cni_config_dir\\|network_dir" /etc/crio/crio.conf /etc/crio/crio.conf.d

# Restart CRI-O after Cilium writes the CNI configuration.
systemctl restart crio
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

# Check CRI-O is reachable from the node
crictl --runtime-endpoint unix:///var/run/crio/crio.sock info

# Diagnose SELinux denials affecting CRI-O, CNI, or BPF mounts (RHEL/OpenShift)
ausearch -m avc | grep -Ei "crio|cni|cilium|bpf"
sealert -a /var/log/audit/audit.log | grep -Ei "crio|cni|cilium|bpf"
```

Fix common CRI-O issues:

```bash
# Issue: SELinux blocking Cilium host access
# Keep the default Cilium SELinux type unless your platform vendor requires
# a custom policy.
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set securityContext.seLinuxOptions.type=spc_t

# Option 2: Set permissive mode for testing (not for production)
setenforce 0  # Test only

# Issue: Wrong socket path in node-level diagnostics
ls -la /var/run/crio/crio.sock /run/crio/crio.sock
rpm -q cri-o  # Check CRI-O version
dpkg -l cri-o  # Debian/Ubuntu

# Issue: CRI-O not invoking Cilium CNI for pod creation
journalctl -u crio | grep "Running CNI conf\|CNI ADD"
# Verify /etc/cni/net.d/05-cilium.conflist is correct JSON
cat /etc/cni/net.d/05-cilium.conflist | python3 -m json.tool
systemctl restart crio

# Issue: CRI-O, kernel, or Kubernetes version incompatible with Cilium requirements
crio --version
cilium version
# Check Cilium system requirements and release notes
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
  cilium-dbg endpoint list | grep $POD_IP
# Should show the endpoint in "ready" state

# Verify Kubernetes labels are propagated to Cilium identity
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg endpoint get $(kubectl -n kube-system exec ds/cilium -- \
    cilium-dbg endpoint list | grep $POD_IP | awk '{print $1}') | \
  jq '.status.identity.labels'

# Test connectivity
kubectl exec crio-test -- curl -s http://kubernetes.default.svc.cluster.local

# Clean up
kubectl delete pod crio-test
```

## Monitor CRI-O and Cilium

```mermaid
graph TD
    A[CRI-O] -->|CNI ADD/DEL| B[/etc/cni/net.d/05-cilium.conflist]
    B -->|runs cilium-cni| C[Cilium Agent socket]
    C -->|Configure datapath| D[Pod Network]
    E[SELinux] -->|Policy check| C
    E -->|Block if denied| F[Host access denied]
    G[Cilium Monitor] -->|Watch datapath events| D
    H[journalctl] -->|CRI-O logs| I[CNI invocation log]
```

Monitor CRI-O and Cilium integration health:

```bash
# Watch CRI-O CNI invocations in real-time
journalctl -u crio -f | grep -E "CNI|cilium|network" &

# Monitor Cilium endpoint resources
kubectl get ciliumendpoints.cilium.io -A -w &

# Check for CRI-O-related errors in Cilium
kubectl -n kube-system logs ds/cilium --since=1h | grep -i "cni\|runtime\|socket"

# Periodic check: compare CRI-O containers to Cilium endpoints
crictl --runtime-endpoint unix:///var/run/crio/crio.sock ps | wc -l
kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint list | wc -l
```

## Conclusion

CRI-O and Cilium integration is straightforward once the CNI configuration directories are set and CRI-O has picked up Cilium's CNI configuration. The most common issues on RHEL and OpenShift environments are SELinux denials that prevent Cilium from accessing required host paths or mounting the BPF filesystem. Always run SELinux audit log analysis when Cilium fails on these platforms. Validate the integration by creating test pods and confirming that Cilium creates endpoints and assigns correct identities based on Kubernetes labels. Running `cilium connectivity test` after initial setup gives confidence that the full networking stack is functional with CRI-O as the runtime.
