# How to Validate eBPF in Calico in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, EBPF, CNI, Lab, Testing, Validation, Performance

Description: Step-by-step instructions for enabling and verifying Calico eBPF mode in a lab Kubernetes cluster, including kernel compatibility checks and functional validation.

---

## Introduction

Before enabling eBPF in production, you must validate it in a lab environment that matches your production kernel version and Kubernetes distribution. eBPF availability is kernel-dependent, and some features require specific kernel versions. A lab validation catches incompatibilities, performance anomalies, and configuration mistakes before they affect production workloads.

This guide walks through the complete eBPF validation workflow: kernel compatibility check, kube-proxy disablement, eBPF enablement, functional testing, and basic performance benchmarking.

## Prerequisites

- A lab Kubernetes cluster with at least two worker nodes
- Calico v3.13+ installed in standard (iptables) mode
- Linux kernel 5.3+ on all nodes (5.8+ recommended)
- `kubectl` configured
- `bpftool` available on nodes (install via `apt install linux-tools-$(uname -r)` on Ubuntu)

## Step 1: Verify Kernel Compatibility

SSH to a worker node and check the kernel version and eBPF capabilities:

```bash
uname -r
# Expected: 5.8 or higher for full Calico eBPF support

# Check that BPF filesystem is mounted
mount | grep bpf
# Expected output includes: bpffs on /sys/fs/bpf type bpf
```

If the BPF filesystem is not mounted, mount it:

```bash
sudo mount bpffs /sys/fs/bpf -t bpf
```

## Step 2: Configure Calico to Use the Kernel's BPF Filesystem

Before enabling eBPF, ensure Calico's FelixConfiguration has the correct BPF mount path:

```bash
kubectl patch felixconfiguration default \
  --type merge \
  -p '{"spec":{"bpfEnabled":false,"bpfKubeProxyIptablesCleanupEnabled":true}}'
```

## Step 3: Disable kube-proxy

eBPF mode replaces kube-proxy. Running both simultaneously causes conflicts:

```bash
kubectl patch daemonset kube-proxy \
  -n kube-system \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'

# Verify kube-proxy pods are terminated
kubectl get pods -n kube-system -l k8s-app=kube-proxy
```

## Step 4: Enable eBPF Dataplane

```bash
kubectl patch installation.operator.tigera.io default \
  --type merge \
  -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'
```

Wait for calico-node pods to restart with eBPF mode:

```bash
kubectl rollout status daemonset calico-node -n calico-system
```

## Step 5: Verify eBPF is Active

Check Felix logs on a node for eBPF confirmation:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep -i ebpf
# Expected: "BPF enabled" or similar confirmation
```

List eBPF programs loaded by Calico:

```bash
# On a worker node:
sudo bpftool prog list | grep calico
```

## Step 6: Functional Validation

Test pod-to-pod connectivity:

```bash
kubectl run client --image=busybox --restart=Never -- sleep 3600
kubectl run server --image=nginx --restart=Never
SERVER_IP=$(kubectl get pod server -o jsonpath='{.status.podIP}')
kubectl exec client -- wget -qO- http://$SERVER_IP
```

Test service connectivity:

```bash
kubectl expose pod server --port=80 --name=server-svc
kubectl exec client -- wget -qO- http://server-svc
```

Test that network policy is still enforced:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-client
spec:
  podSelector:
    matchLabels:
      run: server
  ingress: []
EOF

# This should now time out (policy is enforced via eBPF)
kubectl exec client -- wget --timeout=5 -qO- http://$SERVER_IP
```

## Step 7: Verify Source IP Preservation

Deploy an echo server and check that the pod sees the client's pod IP (not a NAT IP):

```bash
kubectl run echo --image=ealen/echo-server --restart=Never
kubectl exec client -- wget -qO- http://$(kubectl get pod echo -o jsonpath='{.status.podIP}'):80 | grep -i "source-ip"
```

## Best Practices

- Always test on the same kernel version as production nodes - eBPF features are kernel-specific
- Run a brief load test after enabling eBPF to confirm CPU usage has not increased (it should decrease)
- Check `/sys/fs/bpf/calico/` on nodes to inspect the eBPF map directory structure
- Document your kernel version and Calico version combination for the runbook

## Conclusion

Validating Calico eBPF in a lab requires systematic checks at each step: kernel compatibility, kube-proxy removal, eBPF enablement, functional connectivity, and policy enforcement. Completing all validation steps before production rollout ensures that the eBPF dataplane is fully functional and that the kube-proxy removal has not introduced any service connectivity regressions.
