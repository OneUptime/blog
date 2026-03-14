# Monitor MTU Sizing in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, MTU, Networking, Kubernetes, Performance, Monitoring, Fragmentation

Description: Learn how to determine the correct MTU size for Calico in different environments, monitor for fragmentation issues caused by incorrect MTU configuration, and tune MTU for optimal network performance.

---

## Introduction

MTU (Maximum Transmission Unit) is the maximum size of an IP packet that can be transmitted without fragmentation. Configuring the correct MTU in Calico is critical for network performance: too large an MTU causes fragmentation and packet drops, while too small an MTU causes excessive fragmentation overhead and reduced throughput.

Calico supports several data plane modes (VXLAN, IPIP, WireGuard, native routing) each with different encapsulation overhead. The correct pod interface MTU must account for this overhead to prevent fragmentation on the outbound path. Calico can auto-detect the correct MTU in many environments, but manual verification is still recommended for production clusters.

This guide covers calculating the correct MTU for different Calico configurations, monitoring for MTU-related issues, and tuning MTU to optimize network performance.

## Prerequisites

- Kubernetes cluster with Calico v3.27+ installed
- `kubectl` with admin access
- `calicoctl` v3.27+ installed
- Understanding of overlay network encapsulation overhead

## Step 1: Understand MTU Requirements Per Encapsulation Mode

Calculate the required MTU for your Calico deployment based on the encapsulation mode.

The correct pod MTU depends on the physical network MTU minus encapsulation overhead:

```bash
# Check current MTU configuration in Calico
cilium config view 2>/dev/null || \
  kubectl get configmap calico-config -n kube-system -o yaml | grep "^  veth_mtu"

# Check the physical network interface MTU on a node
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ip link show eth0 | grep -o "mtu [0-9]*"

# MTU calculation guide:
# Physical MTU: 1500 (standard Ethernet)
# VXLAN overhead: 50 bytes  -> Pod MTU = 1450
# IPIP overhead:  20 bytes  -> Pod MTU = 1480
# WireGuard overhead: 60 bytes -> Pod MTU = 1440
# No encapsulation: 0 bytes  -> Pod MTU = 1500
# Jumbo frames: 9000 physical -> Pod MTU = 8950 (VXLAN)

echo "Current pod interface MTU:"
kubectl exec $(kubectl get pod -A -o name | head -1 | sed 's|pod/||' | cut -d'/' -f2) \
  -- cat /sys/class/net/eth0/mtu 2>/dev/null || echo "Run from within a pod"
```

## Step 2: Configure Correct MTU in Calico

Set the appropriate MTU value in Calico's configuration.

Update the Felix configuration with the correct MTU for your environment:

```yaml
# calico-mtu-felixconfig.yaml - configure MTU in Calico FelixConfiguration
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Set MTU for VXLAN mode (physical MTU 1500 - 50 bytes overhead = 1450)
  vxlanMTU: 1450
  # Set MTU for WireGuard mode
  wireguardMTU: 1440
  # Set MTU for IPIP mode
  ipipMTU: 1480
```

Apply the MTU configuration:

```bash
calicoctl apply -f calico-mtu-felixconfig.yaml

# Restart calico-node to apply new MTU settings
kubectl rollout restart daemonset calico-node -n calico-system

# Verify new MTU on pod interfaces after restart
kubectl exec <any-pod> -- cat /sys/class/net/eth0/mtu
```

## Step 3: Detect MTU-Related Fragmentation

Monitor for symptoms of incorrect MTU configuration.

Use network diagnostic tools to detect fragmentation:

```bash
# Test for MTU-related fragmentation using path MTU discovery
kubectl run mtu-test --image=nicolaka/netshoot --rm -it -- \
  tracepath -n <destination-ip>

# Check for ICMP "fragmentation needed" messages (indicates MTU too large)
kubectl run packet-capture --image=nicolaka/netshoot --rm -it -- \
  tcpdump -n -c 100 icmp and "(icmp[icmptype] = icmp-unreach and icmp[icmpcode] = 4)"

# Measure actual throughput to detect MTU degradation
kubectl run iperf-server --image=networkstatic/iperf3 -- -s
kubectl run iperf-client --image=networkstatic/iperf3 --rm -it -- \
  -c $(kubectl get pod iperf-server -o jsonpath='{.status.podIP}') \
  -t 10 -M 9000   # Test with various MSS values
```

## Step 4: Monitor Fragmentation Metrics

Set up Prometheus metrics to detect ongoing fragmentation.

Configure alerts for fragmentation-related network issues:

```yaml
# mtu-fragmentation-alerts.yaml - alerts for MTU and fragmentation issues
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-mtu-monitoring
  namespace: monitoring
spec:
  groups:
  - name: mtu-fragmentation
    rules:
    - alert: HighPacketFragmentation
      expr: |
        rate(node_network_transmit_packets_total{device=~"tunl.*|vxlan.*"}[5m]) /
        rate(node_network_transmit_bytes_total{device=~"tunl.*|vxlan.*"}[5m]) > 0.01
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High packet rate on tunnel interface may indicate fragmentation"
    - alert: CalicoMTUTooLarge
      # Felix will log MTU-related errors when misconfigured
      expr: |
        rate(felix_int_dataplane_failures_total[5m]) > 0.05
      for: 3m
      labels:
        severity: warning
      annotations:
        summary: "Calico dataplane failures - check MTU configuration"
```

Apply the MTU monitoring alerts:

```bash
kubectl apply -f mtu-fragmentation-alerts.yaml
```

## Step 5: Validate MTU After Configuration

Confirm that the new MTU setting is applied and working correctly.

Run end-to-end tests to validate MTU configuration:

```bash
# Verify pod MTU matches expected value
POD_MTU=$(kubectl exec $(kubectl get pod -A -o name | head -1 | \
  awk -F'/' '{print $NF}') -- cat /sys/class/net/eth0/mtu 2>/dev/null)
echo "Pod interface MTU: $POD_MTU"

# Test large payload transmission (should not fragment with correct MTU)
kubectl run large-payload-test --image=nicolaka/netshoot --rm -it -- \
  python3 -c "
import socket, time
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.IPPROTO_IP, socket.IP_DONTFRAG, 1)
# Try sending exactly the pod MTU size
payload = b'x' * ($POD_MTU - 28)  # Subtract UDP + IP header size
s.sendto(payload, ('<target-ip>', 9999))
print('Large payload sent successfully')
"
```

## Best Practices

- Enable Calico's auto-MTU detection feature which automatically configures the optimal MTU
- Set jumbo frames (9000 byte MTU) on physical interfaces in the data center for maximum throughput
- Document the MTU chain: physical MTU -> encapsulation overhead -> pod MTU for each Calico mode
- Test MTU configuration with large payload applications (file transfers, streaming) to catch silent fragmentation
- Monitor application TCP retransmission rates with OneUptime as an indirect indicator of MTU misconfiguration

## Conclusion

Correct MTU sizing is a foundational requirement for efficient Calico networking. By calculating the appropriate pod MTU based on your encapsulation mode, monitoring for fragmentation symptoms, and validating large-payload transmission, you can ensure your cluster network performs at its optimal throughput. Use OneUptime to monitor application latency and retransmission rates as real-world indicators of MTU health in your production environment.
