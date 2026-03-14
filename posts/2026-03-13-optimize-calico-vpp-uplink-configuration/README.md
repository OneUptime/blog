# Optimize Calico VPP Uplink Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, VPP, DPDK, Uplink, Performance, Optimization

Description: Optimization techniques for Calico VPP uplink interface performance, including RSS configuration, interrupt vs. polling mode tuning, and NIC hardware offloads.

---

## Introduction

The VPP uplink interface is the performance bottleneck for all pod network traffic on a Calico VPP node. Optimizing the uplink configuration — queue count, descriptor ring sizes, RSS configuration, and the choice between interrupt and polling mode — determines the maximum throughput achievable for pod-to-external and cross-node pod communication.

Different workload types benefit from different uplink configurations: high-throughput bulk data transfer workloads benefit from larger ring sizes and more queues, while latency-sensitive workloads benefit from polling mode and smaller rings.

## Prerequisites

- Calico VPP with DPDK uplink operational
- Baseline throughput and latency measurements available
- Hardware support for the NIC features being configured

## Optimization 1: Match Queue Count to Worker Threads

Each VPP worker thread should have dedicated RX and TX queues:

```yaml
data:
  CALICOVPP_INTERFACES: |
    {
      "uplinkInterfaces": [
        {
          "interfaceName": "eth0",
          "vppDriver": "dpdk",
          "newDriverName": "vfio-pci",
          "numRxQueues": 8,    # Match VPP worker thread count
          "numTxQueues": 8,
          "rxQueueSize": 4096,
          "txQueueSize": 4096
        }
      ]
    }
```

```mermaid
graph LR
    A[8 VPP Worker Threads] -->|1:1 mapping| B[8 NIC RX Queues]
    B -->|RSS distributes| C[Traffic spread evenly]
    C --> D[Maximum throughput scaling]
```

## Optimization 2: Configure RSS for Optimal Distribution

Receive Side Scaling distributes packets across queues based on 5-tuple hash:

```yaml
# In VPP startup.conf
dpdk {
  dev 0000:00:0a.0 {
    num-rx-queues 8
    rss {
      ipv4-tcp
      ipv4-udp
      ipv4
      ipv6-tcp
      ipv6-udp
      ipv6
    }
  }
}
```

Verify RSS is distributing evenly:

```bash
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show dpdk statistics | grep -E "queue [0-9]"
# Each queue should show roughly equal packet counts
```

## Optimization 3: Polling vs. Interrupt Mode

```
# Polling mode: VPP worker continuously polls NIC queues
# Best for: High-throughput workloads (> 1M pps)
# Cost: Higher CPU usage even when idle

# Interrupt mode: NIC interrupts VPP when packets arrive
# Best for: Low-throughput with burst capacity
# Cost: Higher latency for first packet in a burst
```

Configure polling mode for maximum throughput:

```yaml
"rxMode": "polling"   # VPP continuously polls - best throughput
# or
"rxMode": "interrupt" # Event-driven - better for mixed loads
# or
"rxMode": "adaptive"  # VPP switches based on load (recommended for most)
```

## Optimization 4: Enable Hardware Checksum Offload

Offload TCP/UDP checksum computation to the NIC:

```bash
# Check if NIC supports checksum offload
ethtool -k eth0 | grep checksum

# In VPP startup.conf, DON'T add "no-tx-checksum-offload"
# Leave it to use hardware offload (default behavior)
```

## Optimization 5: Jumbo Frames

For networks with jumbo frame support (MTU 9000):

```yaml
# Set uplink MTU
data:
  CALICOVPP_INITIAL_CONFIG: |
    {
      "uplinkMtu": 9000
    }
```

```bash
# Verify jumbo frames enabled on switch port
# Configure in VPP
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl set interface mtu 9000 GigabitEthernet0/0/0
```

## Optimization 6: NIC Flow Director

For Intel NICs, configure Flow Director for deterministic queue assignment:

```yaml
dpdk {
  dev 0000:00:0a.0 {
    devargs "flow_type_rss_offloads=0xffffffff"
  }
}
```

## Conclusion

Optimizing the Calico VPP uplink starts with matching queue count to worker thread count, configuring RSS for even load distribution, and selecting the right polling mode for your workload. Adaptive polling mode provides a good default that handles both burst and sustained load efficiently. For high-throughput environments, enable jumbo frames and hardware checksum offload to reduce CPU overhead per packet.
