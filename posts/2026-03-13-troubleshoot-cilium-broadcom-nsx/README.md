# Troubleshoot Cilium with Broadcom NSX

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, VMware, NSX, eBPF

Description: A troubleshooting guide for diagnosing and resolving integration issues when running Cilium in Kubernetes environments managed by Broadcom NSX network virtualization.

---

## Introduction

Broadcom NSX (formerly VMware NSX) is an enterprise network virtualization platform used in on-premises and hybrid cloud datacenters. Running Cilium in Kubernetes environments managed by NSX requires coordination between NSX's software-defined networking layer and Cilium's eBPF dataplane.

Common issues include MTU mismatches between NSX segments and Cilium's configuration, IP address conflicts between NSX-assigned addresses and Cilium IPAM, network policy conflicts, and problems with NSX's overlay (Geneve encapsulation) interfering with Cilium's traffic processing.

This guide covers systematic diagnostics for Cilium in NSX-managed environments.

## Prerequisites

- Kubernetes cluster running on NSX-managed infrastructure
- Cilium installed on the cluster
- `kubectl` and `cilium` CLI access
- Access to NSX Manager for network segment inspection

## Step 1: Verify NSX Segment and Cilium MTU Alignment

MTU mismatches are the most common issue in NSX + Cilium environments.

```bash
# Check Cilium's configured MTU
kubectl get configmap cilium-config -n kube-system -o yaml | grep -E "mtu|tunnel"

# Check the MTU of the node's primary interface (managed by NSX)
kubectl debug node/<node-name> -it --image=ubuntu -- ip link show eth0

# NSX uses Geneve encapsulation which adds ~50 bytes of overhead
# If NSX segment MTU is 1500, node effective MTU is ~1450
# Cilium should be configured to use 1450 or less

# Test MTU with large packets
kubectl run mtu-test --rm -it --image=busybox -- \
  ping -s 1400 -M do <pod-ip>
```

## Step 2: Check NSX Firewall Rules for Cilium Traffic

NSX distributed firewall (DFW) rules may block Cilium's required protocols.

```bash
# Check if NSX DFW is blocking VXLAN or Geneve traffic
# (NSX DFW rules are inspected via NSX Manager UI or API)

# Test if pods can communicate across different NSX segments
kubectl run nsx-test-1 --image=busybox --overrides='{"spec":{"nodeName":"<node-on-segment-A>"}}' -- sleep 3600
kubectl run nsx-test-2 --image=busybox --overrides='{"spec":{"nodeName":"<node-on-segment-B>"}}' -- sleep 3600

# Test cross-segment connectivity
kubectl exec nsx-test-1 -- ping -c 3 <pod-ip-on-segment-B>

# Monitor Cilium drops
CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n kube-system ${CILIUM_POD} -- cilium monitor --type drop
```

## Step 3: Diagnose IP Address Management Conflicts

Investigate conflicts between NSX IPAM and Cilium IPAM.

```bash
# Check Cilium's IPAM mode
kubectl get configmap cilium-config -n kube-system -o yaml | grep ipam

# Verify pod IPs don't overlap with NSX-managed IP ranges
kubectl get pods --all-namespaces -o wide | awk '{print $8}' | sort -u

# Check NSX logical port configuration for node VMs
# (Via NSX Manager: Networking -> Logical Switches -> Ports)

# Confirm that Cilium pod CIDR does not conflict with NSX segment subnets
kubectl cluster-info dump | grep -i "pod-cidr\|cluster-cidr"
```

## Step 4: Validate Cilium eBPF in NSX Virtualized Environment

Confirm that Cilium's eBPF programs load correctly on NSX-backed VMs.

```bash
# Verify eBPF programs are loaded (requires kernel 4.9+)
kubectl exec -n kube-system ${CILIUM_POD} -- cilium status

# Check if NSX's virtual NIC driver supports the required BPF hooks
kubectl exec -n kube-system ${CILIUM_POD} -- cilium debuginfo | grep -i "driver\|nic"

# Run Cilium connectivity test
cilium connectivity test

# Check for errors related to NSX virtual NIC limitations
kubectl logs -n kube-system ${CILIUM_POD} | grep -E "ERROR|driver|xdp"
```

## Step 5: Configure Cilium for NSX Overlay Environments

Tune Cilium configuration for NSX Geneve overlay environments.

```bash
# Update Cilium to disable its own tunnel and rely on NSX routing
# This avoids double encapsulation (NSX Geneve + Cilium VXLAN)

kubectl patch configmap cilium-config -n kube-system --type merge \
  --patch '{"data":{"tunnel":"disabled","auto-direct-node-routes":"true"}}'

# Restart Cilium to apply changes
kubectl rollout restart daemonset -n kube-system cilium

# Verify the tunnel mode change
kubectl get configmap cilium-config -n kube-system -o yaml | grep tunnel
```

## Best Practices

- Align Cilium's MTU with NSX segment MTU minus encapsulation overhead
- Create NSX DFW exclusion rules for Cilium's health check traffic
- Avoid double encapsulation by disabling Cilium's tunnel mode in NSX overlay environments
- Test pod connectivity after every NSX configuration change
- Coordinate Cilium upgrades with NSX version compatibility testing

## Conclusion

Running Cilium in NSX-managed environments requires careful attention to MTU configuration, NSX DFW rules, and encapsulation mode selection. By ensuring MTU alignment, allowing required traffic through NSX firewall policies, and avoiding double encapsulation, you can run Cilium reliably on NSX-managed Kubernetes infrastructure.
