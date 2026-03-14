# How to Troubleshoot Installation Issues with Calico VPP on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Troubleshooting

Description: A diagnostic guide for resolving Calico VPP installation and networking failures on Kubernetes clusters.

---

## Introduction

Calico VPP installation failures have a unique set of root causes: hugepages not configured, DPDK driver binding failures, VPP startup configuration errors, and interface name mismatches between the VPP manager configuration and the actual network interface on the node. These are distinct from standard Calico failures and require VPP-specific diagnostic tools.

The VPP process writes detailed logs that describe startup failures clearly. When VPP fails to start, the calico-vpp-dataplane pod logs and the VPP log file are the first places to look.

## Prerequisites

- Calico VPP installation attempted on a Kubernetes cluster
- `kubectl` with cluster admin access
- Root access to nodes (for hugepage and DPDK diagnostics)

## Step 1: Check VPP Manager Pod Status

```bash
kubectl get pods -n calico-vpp-dataplane
kubectl describe pod <vpp-manager-pod> | tail -30
kubectl logs <vpp-manager-pod> -n calico-vpp-dataplane --tail=60
```

## Step 2: Check Hugepages Configuration

VPP fails to start if hugepages are not available.

```bash
cat /proc/meminfo | grep Huge
# Must show: HugePages_Total > 0 and HugePages_Free > 0
```

If hugepages are not configured:

```bash
echo 512 > /proc/sys/vm/nr_hugepages
# Persistent: echo 'vm.nr_hugepages = 512' >> /etc/sysctl.d/99-hugepages.conf
```

## Step 3: Diagnose DPDK Driver Binding

If using DPDK, the NIC must be bound to a DPDK-compatible driver.

```bash
# Check current NIC binding
dpdk-devbind.py --status | grep <pci-address>

# Bind to vfio-pci
modprobe vfio-pci
dpdk-devbind.py --bind=vfio-pci <pci-address>
```

## Step 4: Check VPP Startup Log

```bash
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- cat /var/log/vpp/vpp.log
```

Common VPP startup errors:
- `failed to initialize DPDK` — DPDK driver not loaded or wrong PCI address
- `failed to allocate hugepages` — insufficient hugepages
- `cannot open interface` — interface name mismatch

## Step 5: Verify Interface Configuration

```bash
# On the node, list PCI devices and their addresses
lspci | grep Ethernet

# Verify the interface name matches the VPP manager config
kubectl get configmap calico-vpp-config -n calico-vpp-dataplane -o yaml | grep INTERFACE
ip link show
```

## Step 6: Check calico-node Logs

```bash
kubectl logs -n kube-system -l k8s-app=calico-node --tail=50 | grep -i "vpp\|error"
```

## Conclusion

Troubleshooting Calico VPP focuses on hugepage availability, DPDK driver binding, VPP startup log analysis, and interface name validation. These VPP-specific prerequisites must all be satisfied before VPP can start, and any one of them failing will prevent the entire Calico VPP data plane from functioning. The VPP log file is the single most informative source for diagnosing startup failures.
