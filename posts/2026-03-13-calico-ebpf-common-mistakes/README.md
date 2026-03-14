# How to Avoid Common Mistakes with eBPF in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, EBPF, CNI, Troubleshooting, Best Practices, Networking

Description: The most common eBPF configuration mistakes in Calico deployments and how to identify and fix them before they cause production incidents.

---

## Introduction

Calico's eBPF dataplane is powerful but introduces new failure modes that do not exist in the iptables mode. Most eBPF-related incidents in production fall into one of three categories: kernel incompatibility, kube-proxy conflicts, or BPF filesystem mount problems. Each of these is entirely preventable with proper validation before rollout.

This post catalogs the most common eBPF mistakes, explains why they occur, and provides the diagnostic commands and fixes for each. The goal is to give you the pattern recognition to spot these issues quickly in your own environment.

## Prerequisites

- Calico deployed with eBPF mode enabled or planned
- Access to node-level SSH or `kubectl debug` capability
- Familiarity with `bpftool` and Felix logs

## Mistake 1: Not Disabling kube-proxy Before Enabling eBPF

The most common mistake is enabling Calico eBPF while kube-proxy is still running. Both will attempt to manage service routing, causing duplicate DNAT entries and inconsistent behavior.

**Symptom**: Services are intermittently accessible, or pods get inconsistent responses from a service's ClusterIP.

**Diagnosis**:
```bash
kubectl get pods -n kube-system -l k8s-app=kube-proxy
# If pods are Running, kube-proxy is still active
```

**Fix**: Patch the kube-proxy DaemonSet to prevent scheduling:
```bash
kubectl patch daemonset kube-proxy -n kube-system \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'
```

## Mistake 2: Running on an Unsupported Kernel Version

eBPF programs use kernel features that are not available in older kernels. Running Calico eBPF on a kernel older than 5.3 will cause Felix to fail to load programs.

**Symptom**: `calico-node` pods crash loop with errors like `failed to load BPF program`.

**Diagnosis**:
```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep -i "bpf\|ebpf\|kernel"
```

**Fix**: Upgrade node kernel to 5.3+ before enabling eBPF mode. For cloud providers, this usually means updating the node pool's OS image.

## Mistake 3: BPF Filesystem Not Mounted

Calico eBPF stores its maps and programs in the BPF filesystem at `/sys/fs/bpf`. If this filesystem is not mounted, the eBPF programs cannot persist across restarts.

**Symptom**: After a node restart, pods lose connectivity briefly until calico-node re-loads eBPF programs.

**Diagnosis**:
```bash
# On a node:
mount | grep bpf
# If empty, BPF filesystem is not mounted
```

**Fix**: Add a systemd mount unit for the BPF filesystem and ensure it runs before kubelet:
```bash
sudo mount bpffs /sys/fs/bpf -t bpf
# For persistence, add to /etc/fstab:
echo 'none /sys/fs/bpf bpf defaults 0 0' | sudo tee -a /etc/fstab
```

## Mistake 4: Mixed eBPF and iptables Nodes

Enabling eBPF on some nodes but not others in the same cluster causes asymmetric policy enforcement - policies applied as iptables on some nodes may have different behavior than eBPF programs on others.

**Symptom**: Intermittent policy enforcement failures that are node-specific.

**Fix**: Ensure all nodes have the same kernel version and that the eBPF configuration is applied cluster-wide before rolling out. Use `kubectl get nodes` to verify uniform kernel versions.

## Mistake 5: Forgetting to Update Monitoring After Enabling eBPF

iptables-based monitoring tools (scripts that parse `iptables -L` output) do not work in eBPF mode. Teams often discover this when their networking dashboards go blank after enabling eBPF.

**Fix**: Update your monitoring to use Felix metrics via Prometheus:
```bash
kubectl port-forward -n calico-system daemonset/calico-node 9091
curl http://localhost:9091/metrics | grep felix_
```

## Best Practices

- Always perform a full kernel compatibility audit before enabling eBPF
- Disable kube-proxy before enabling eBPF, never after
- Verify BPF filesystem mount persistence across reboots in your node image
- Test your monitoring and alerting stack in a lab before enabling eBPF in production

## Conclusion

The most common Calico eBPF mistakes are all operational rather than conceptual. Leaving kube-proxy running, using an incompatible kernel, missing the BPF filesystem mount, and having mixed-mode nodes each cause specific, diagnosable symptoms. Building a pre-enablement checklist that covers these five mistakes will prevent the majority of eBPF-related production incidents.
