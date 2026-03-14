# How to Avoid Common Mistakes with the Calico Data Path

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Data Path, CNI, Troubleshooting, Best Practices, iptables, eBPF

Description: Common data path mistakes in Calico deployments - from MTU mismatches to stale iptables rules - and how to diagnose and fix them.

---

## Introduction

Data path mistakes in Calico tend to cause one of two symptoms: packets silently dropped (connectivity works but some traffic is lost) or packets delivered incorrectly (connectivity appears to work but policy is not enforced). Both symptoms require data path inspection to diagnose correctly.

This post covers the most common data path mistakes and provides the diagnostic commands to identify and fix each one.

## Prerequisites

- A Calico cluster with networking issues being investigated
- Node-level access for iptables/bpftool inspection
- `tcpdump` available on nodes

## Mistake 1: MTU Mismatch with Encapsulation

The most common data path mistake is not reducing the MTU when using VXLAN or IP-in-IP encapsulation. The encapsulation headers consume part of the MTU, and if the inner packet is too large, it either gets fragmented (causing performance issues) or dropped (causing silent failures).

**Symptom**: Large file transfers fail or stall; small requests work fine. TCP connections establish but data transfer is slow or incomplete.

**Diagnosis**:
```bash
# Check current MTU on nodes
ip link show eth0 | grep mtu
# Note the node MTU (typically 1500 for cloud VMs)

# Check what MTU Calico configured on pod interfaces
kubectl exec test-pod -- ip link show eth0
# Expected: Should be node MTU minus encapsulation overhead
# VXLAN: node MTU - 50 bytes
# IP-in-IP: node MTU - 20 bytes
```

**Fix**: Update MTU in the Calico ConfigMap:
```bash
kubectl get configmap calico-config -n kube-system -o yaml
# Update the veth_mtu value to node_mtu - encap_overhead
```

## Mistake 2: Stale iptables Rules After Node Restart

In some environments, iptables rules created by Calico can persist across node restarts even after Calico has been reconfigured. This leaves stale rules that may allow or deny traffic incorrectly.

**Symptom**: Traffic is allowed or denied unexpectedly after a node restart or Calico upgrade.

**Diagnosis**:
```bash
# Check for stale cali-* chains
sudo iptables -L | grep cali | wc -l
# If count is much higher than expected (> 3 * pods_on_node), stale rules may exist

# Check rule timestamps (requires iptables-restore with --noflush capability)
sudo iptables -L -n -v | head -50
```

**Fix**: Restart the calico-node pod on the affected node - Felix will clean up stale rules and reprogram the correct state:
```bash
kubectl delete pod -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=<node-name>
```

## Mistake 3: Missing Conntrack Entries Causing Asymmetric Traffic Drops

In iptables mode, Calico relies on the kernel's connection tracking table for return traffic. If the conntrack table is full or if a return packet arrives on a different path than the original packet (asymmetric routing), the return packet may be dropped.

**Symptom**: TCP connections time out intermittently. `ping` works but TCP doesn't. Wireshark shows SYN but no SYN-ACK.

**Diagnosis**:
```bash
# Check conntrack table size and current fill
sudo sysctl net.netfilter.nf_conntrack_max
sudo conntrack -C
# If current count approaches max, conntrack table is full
```

**Fix**: Increase the conntrack table size:
```bash
sudo sysctl -w net.netfilter.nf_conntrack_max=524288
# Make permanent:
echo 'net.netfilter.nf_conntrack_max=524288' | sudo tee -a /etc/sysctl.conf
```

## Mistake 4: eBPF Programs Not Loading After Kernel Upgrade

After upgrading the kernel, eBPF programs compiled for the previous kernel version may fail to load on the new kernel.

**Symptom**: After node kernel upgrade, pods on that node lose connectivity. Felix logs show BPF program load failures.

**Diagnosis**:
```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep -i "bpf\|ebpf\|failed"
```

**Fix**: Restart calico-node on the affected node - Felix will recompile and reload the eBPF programs for the new kernel version:
```bash
kubectl delete pod -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=<upgraded-node>
```

## Mistake 5: IP Forwarding Disabled on Nodes

Calico requires IP forwarding to be enabled on all nodes so that packets can be forwarded between pod network namespaces. If IP forwarding is disabled (e.g., by a security hardening script), all cross-pod traffic fails.

**Symptom**: Cross-pod connectivity fails completely. `ping` between pods times out even without any NetworkPolicy.

**Diagnosis**:
```bash
# On the node
sysctl net.ipv4.ip_forward
# Expected: net.ipv4.ip_forward = 1
```

**Fix**:
```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
```

## Best Practices

- Always check MTU when enabling VXLAN or IP-in-IP encapsulation - test with `ping -M do -s 1400` to detect fragmentation
- Monitor conntrack table utilization as a Prometheus metric on all nodes
- After any kernel upgrade, verify eBPF programs are loaded by running `bpftool prog list | grep calico`
- Include IP forwarding enablement in your node bootstrap script and verify it in your node health checks

## Conclusion

The most common Calico data path mistakes are MTU mismatch (fix encap overhead calculation), stale iptables rules (fix with calico-node restart), conntrack table exhaustion (fix with sysctl tuning), eBPF reloading after kernel upgrades (fix with calico-node restart), and disabled IP forwarding (fix with sysctl). Building monitoring for these conditions prevents them from causing silent traffic drops or policy enforcement failures in production.
