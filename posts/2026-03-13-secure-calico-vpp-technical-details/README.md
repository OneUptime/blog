# Secure Calico VPP Technical Details

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, VPP, Security, DPDK, Technical

Description: Technical security hardening for Calico VPP, including VPP API access control, ACL overflow protection, DPDK driver security, and cryptographic acceleration configuration.

---

## Introduction

Technical security for Calico VPP addresses the attack surface that the VPP dataplane introduces at a system level. The VPP binary intercepts all network traffic at the NIC level via DPDK, and its management API provides direct control over the packet processing pipeline. Securing VPP technically means controlling who can access the VPP API, preventing denial-of-service through ACL table flooding, securing the DPDK driver binding process, and leveraging VPP's cryptographic capabilities for WireGuard or IPsec pod encryption.

## Prerequisites

- Calico VPP deployed in a production environment
- Understanding of VPP's API model
- `kubectl` with cluster admin access

## Technical Security 1: Restrict VPP API Access

VPP's binary API socket must be restricted to authorized processes:

```bash
# Set strict permissions on VPP API socket
chmod 600 /run/vpp/api.sock
chown vpp:vpp /run/vpp/api.sock

# List processes currently connected to VPP API
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show api clients
```

Restrict API access via VPP startup configuration:

```plaintext
# /etc/vpp/startup.conf
api-segment {
  uid vpp
  gid vpp
  socket-name /run/vpp/api.sock
  prefix vpe
}
```

## Technical Security 2: DPDK Driver Security

The DPDK driver binding process (`dpdk-devbind`) can move NICs between drivers. Protect this process:

```bash
# Verify only expected DPDK bindings
dpdk-devbind.py --status-dev net

# Lock down IOMMU for DPDK (prevents DMA attacks)
# Verify IOMMU is enabled
dmesg | grep -e IOMMU -e DMAR

# Use vfio-pci driver (IOMMU-protected) instead of uio_pci_generic
modprobe vfio-pci
```

## Technical Security 3: ACL Overflow Protection

```mermaid
graph TD
    A[Attacker creates many NetworkPolicies] --> B[Many ACL entries in VPP]
    B --> C{ACL hash table overflow?}
    C -->|Yes - linear search fallback| D[CPU spike, latency increase]
    C -->|Hash table large enough| E[O(1) performance maintained]
    D --> F[Implement policy count limits via RBAC]
```

Protect ACL tables from overflow:

```bash
# Check ACL table capacity vs. usage
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show acl-plugin statistics | grep -E "hash.*table|memory"

# Limit GlobalNetworkPolicy creation via OPA/Kyverno
```

## Technical Security 4: Enable IPsec for Pod Encryption

Calico VPP supports hardware-accelerated IPsec between nodes:

```yaml
# Enable IPsec in Calico VPP feature gates
data:
  CALICOVPP_FEATURE_GATES: |
    {
      "ipsecEnabled": true
    }
  CALICOVPP_IPSEC_IKEV2_PSK: "your-pre-shared-key"
```

## Technical Security 5: WireGuard via VPP

For better performance than standard WireGuard:

```yaml
data:
  CALICOVPP_FEATURE_GATES: |
    {
      "wireguardEnabled": true
    }
```

```bash
# Verify WireGuard tunnels are established
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show wireguard peer
```

## Technical Security 6: Prevent Information Leakage via Packet Buffers

VPP reuses hugepage memory buffers. Ensure buffers are cleared between uses:

```bash
# Verify VPP clears buffers (default behavior, check for debug overrides)
kubectl get configmap calico-vpp-config -n calico-vpp-dataplane -o yaml | \
  grep -i "clear\|debug\|dump"
# None of these should disable buffer clearing
```

## Conclusion

Technical security for Calico VPP requires protecting the VPP API socket, using IOMMU-protected DPDK drivers (vfio-pci), monitoring ACL table capacity to prevent performance degradation from policy flooding, and leveraging VPP's built-in cryptographic capabilities for IPsec or WireGuard pod-to-pod encryption. The hardware acceleration available through VPP makes encrypted pod networking performant enough for production use in high-throughput environments.
