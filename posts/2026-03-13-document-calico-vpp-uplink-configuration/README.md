# Document Calico VPP Uplink Configuration for Operators

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, VPP, DPDK, Uplink, Documentation

Description: How to create operational documentation for Calico VPP uplink configuration, covering NIC inventory, driver configuration, performance baselines, and uplink change procedures.

---

## Introduction

VPP uplink documentation is operationally critical because uplink misconfiguration can cause complete node network loss. Unlike most Kubernetes configurations that can be safely changed and rolled back, VPP uplink changes that bind or unbind the NIC to DPDK require out-of-band access if anything goes wrong. Documentation that clearly describes the current configuration, the reasons for choices made, and the procedures for safe changes prevents dangerous mistakes.

## Prerequisites

- Calico VPP with uplink operational in production
- Documentation system accessible to operations teams
- Out-of-band access documented as a dependency

## Documentation Component 1: NIC Hardware Inventory

```markdown
## VPP Uplink NIC Inventory

| Node | NIC Model | PCI Address | Driver | Firmware | Ports Used |
|------|-----------|-------------|--------|----------|-----------|
| worker-vpp-1 | Intel X550-T2 | 0000:00:0a.0 | vfio-pci | 5.04 0x00011a7c | Port 0 (eth0) |
| worker-vpp-2 | Intel X550-T2 | 0000:00:0a.0 | vfio-pci | 5.04 0x00011a7c | Port 0 (eth0) |

### NIC Configuration Details
- Interface for VPP: eth0 (physical NIC, NOT the management interface)
- Management interface: eth1 (remains in Linux kernel)
- IOMMU: Enabled (intel_iommu=on in kernel args)
- VPP driver: vfio-pci (IOMMU protected)
```

## Documentation Component 2: Uplink Configuration Reference

````markdown
## Uplink Configuration Reference (ConfigMap: calico-vpp-config)

### Current Configuration (2026-03-13)
```yaml
CALICOVPP_INTERFACES: |-
  {
    "uplinkInterfaces": [
      {
        "interfaceName": "eth0",
        "vppDriver": "dpdk",
        "newDriver": "vfio-pci",
        "rxMode": "adaptive",
        "rx": 4,
        "tx": 4,
        "rxqsz": 4096,
        "txqsz": 4096
      }
    ]
  }
```

### Why These Settings Were Chosen
- rx: 4 = Matches 4 isolated VPP worker cores
- rxqsz: 4096 = Handles 10G burst without overflow
- rxMode: adaptive = Best balance for mixed low/high load
- newDriver: vfio-pci = Binds the interface to vfio-pci before passing it to VPP
````

## Documentation Component 3: Uplink Change Procedure

````markdown
## Procedure: Change VPP Uplink Configuration

### Risk Level: HIGH - Can cause node network loss

### Prerequisites
1. VERIFY out-of-band console access works: Test IPMI/iDRAC login before starting
2. Coordinate with network team for any switch-side changes
3. Choose a maintenance window

### Steps
1. Test in staging environment first
2. Schedule maintenance window, notify on-call team
3. Drain the node:
   kubectl drain <node> --ignore-daemonsets --delete-emptydir-data

4. Apply ConfigMap change:
   kubectl edit configmap calico-vpp-config -n calico-vpp-dataplane

5. Restart VPP pod on the node:
   kubectl delete pod -n calico-vpp-dataplane -l k8s-app=calico-vpp-node \
     --field-selector spec.nodeName=<node>

6. Verify via VPP CLI:
   kubectl exec -n calico-vpp-dataplane \
     "$(kubectl get pod -n calico-vpp-dataplane -l k8s-app=calico-vpp-node \
       --field-selector spec.nodeName=<node> \
       -o jsonpath='{.items[0].metadata.name}')" \
     -c vpp -- \
     vppctl show hardware-interfaces

7. Run traffic test before uncordoning
8. Uncordon: kubectl uncordon <node>
9. Update this documentation
````

## Documentation Component 4: Recovery Procedure

```markdown
## Emergency Recovery: Node Lost Network After Uplink Change

### Access
Use out-of-band console (IPMI/iDRAC/cloud console)

### Recovery Steps
1. SSH to node via console
2. Stop kubelet and the Calico VPP container:
   systemctl stop kubelet
   crictl stop $(crictl ps --name vpp -q)
3. Re-bind NIC to Linux driver:
   dpdk-devbind.py -b ixgbe 0000:00:0a.0  # Use your actual driver name
4. Bring interface up:
   ip link set eth0 up
   dhclient eth0  # Or configure static IP
5. Now you can SSH to the node normally
6. Fix the VPP configuration before restarting
```

## Conclusion

Documenting Calico VPP uplink configuration requires capturing hardware details (NIC model, PCI address, driver version), configuration rationale, a risk-aware change procedure with out-of-band access as a prerequisite, and an emergency recovery procedure. The out-of-band access requirement must be prominently documented - teams that skip this step are one uplink misconfiguration away from a node that requires data center or cloud provider intervention to recover.
