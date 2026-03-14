# Configure Calico VPP Technical Details

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, VPP, DPDK, Technical, Configuration

Description: An in-depth look at the technical configuration details of Calico VPP, including the node graph architecture, plugin configuration, and startup parameters for production deployments.

---

## Introduction

Understanding Calico VPP's technical details enables more precise configuration and better troubleshooting. VPP's node graph architecture - where packets flow through a directed acyclic graph of processing nodes - is fundamentally different from the Linux kernel's networking stack. Each VPP node performs a specific operation (IP lookup, ACL check, NAT, etc.) and passes processed packet vectors to the next node.

Calico VPP adds specific graph nodes for Calico's policy model, IPAM integration, and Kubernetes service load balancing. Configuring these nodes correctly requires understanding their interdependencies and the startup configuration parameters that control their behavior.

## Prerequisites

- Familiarity with VPP concepts (vectors, node graphs, workers)
- Calico VPP deployment experience
- Understanding of DPDK and hugepage configuration

## VPP Node Graph for Calico

```mermaid
graph LR
    A[dpdk-input] --> B[ethernet-input]
    B --> C[ip4-input]
    C --> D[calico-policy-forward]
    D --> E[ip4-lookup]
    E --> F[ip4-rewrite]
    F --> G[dpdk-output]
    D -->|Deny| H[error-drop]
    I[tap-input pod] --> J[ip4-input-not-checksum]
    J --> D
```

## VPP Startup Configuration Deep Dive

### Memory Configuration

```plaintext
# /etc/vpp/startup.conf
buffers {
  # Total packet buffer memory
  # Rule of thumb: NIC line rate (bits/s) / 8 * 0.001 (1ms buffer depth)
  # For 10G: 10e9/8 * 0.001 = 1.25MB per worker
  buffers-per-numa 2097152      # 2M buffers per NUMA node
  page-size 2m                  # Use 2MB hugepages
  default data-size 2048        # Max packet size + headroom
}
```

### DPDK Configuration

```plaintext
dpdk {
  dev 0000:00:0a.0 {            # PCI address of NIC
    name eth0                   # VPP interface name
    num-rx-queues 4             # One queue per VPP worker
    num-tx-queues 4
    num-rx-desc 4096            # RX ring depth
    num-tx-desc 4096
    rss {                       # RSS hash configuration
      ipv4
      ipv4-tcp
      ipv4-udp
    }
  }
  uio-driver uio_pci_generic   # Or vfio-pci for IOMMU
  no-multi-seg                 # Disable scatter-gather (improves performance)
}
```

### Thread/CPU Configuration

```plaintext
cpu {
  main-core 0                  # Core for VPP main thread
  corelist-workers 2-5         # Cores for packet processing workers
  skip-cores 1                 # Skip core 1 (OS use)
}
```

## Calico VPP ConfigMap Parameters

```yaml
data:
  CALICOVPP_INTERFACES: |
    {
      "uplinkInterfaces": [
        {
          "interfaceName": "eth0",
          "vppDriver": "dpdk",
          "newDriverName": "vfio-pci",
          "rxMode": "polling",
          "numRxQueues": 4,
          "numTxQueues": 4
        }
      ]
    }
  CALICOVPP_FEATURE_GATES: |
    {
      "multinetEnabled": false,
      "srv6Enabled": false,
      "wireguardEnabled": false,
      "ipsecEnabled": false
    }
  CALICOVPP_INITIAL_CONFIG: |
    {
      "vppStartupSleepSeconds": 2,
      "corePattern": "/var/log/vpp/core-%e-%p-%t",
      "rxMode": "polling",
      "tapRxQueueSize": 1024,
      "tapTxQueueSize": 1024
    }
```

## Calico VPP Tap Interface Configuration

Each pod gets a tap interface connecting it to VPP:

```bash
# View tap interface parameters
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show tap verbose

# Output shows:
# Interface: tap0
#   Linux interface name: vpp0 (in pod netns)
#   RX queue size: 1024
#   TX queue size: 1024
```

## NAT and Service Load Balancing

Calico VPP implements Kubernetes service load balancing natively:

```bash
# View NAT44 configuration
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show nat44 summary

# View service mappings
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show nat44 static mappings
```

## Conclusion

Calico VPP's technical configuration involves careful tuning of buffer memory, CPU allocation, DPDK device parameters, and the interface between VPP's processing graph and Calico's policy model. Understanding the node graph architecture helps in troubleshooting packet loss and in optimizing performance for specific traffic patterns. The ConfigMap-based configuration provides a Kubernetes-native way to manage these complex VPP parameters.
