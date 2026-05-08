# How to Validate MTU Sizing for Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, MTU, Networking, Validation

Description: Validate Calico MTU configuration by testing packet sizes through the network path, verifying pod interface MTU, and detecting fragmentation with active probing.

---

## Introduction

Validating MTU configuration in Calico ensures that the configured MTU values are actually applied to pod interfaces and that packets of the expected size traverse the network without fragmentation. MTU validation is particularly important after cluster upgrades, network changes, or when onboarding new node types with different physical MTU values.

The most reliable MTU validation method is sending packets at the configured MTU size with the "Don't Fragment" (DF) bit set. If the packet passes without fragmentation, the MTU is correctly configured throughout the path. If it fails, you have a mismatch somewhere in the path.

## Prerequisites

- Test pods deployed on different nodes
- Tools: ping, iperf3 available in pods

## Validate Pod Interface MTU

```bash
# Check MTU on all running pods

kubectl get pods --field-selector=status.phase=Running \
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName --no-headers |
while read pod node; do
  mtu=$(kubectl exec ${pod} -- ip link show eth0 2>/dev/null | grep mtu | awk '{print $5}')
  echo "${pod} on ${node}: MTU=${mtu}"
done
```

## Test MTU with Ping (Don't Fragment)

Send a ping packet at the exact MTU size to test for fragmentation:

```bash
# From pod, ping another pod with DF bit set
# MTU=1450 for VXLAN: payload = MTU - 28 (IP+ICMP headers) = 1422
kubectl exec pod-on-node1 -- ping -M do -s 1422 -c 3 <pod-on-node2-ip>
```

If this fails but smaller sizes succeed, there is an MTU mismatch in the path.

## Test with iperf3 for Throughput at MTU Boundary

```bash
# Server
kubectl exec -it iperf3-server -- iperf3 -s

# Client - test at different MSS values
SERVER_IP=$(kubectl get pod iperf3-server -o jsonpath='{.status.podIP}')
kubectl exec -it iperf3-client -- iperf3 -c ${SERVER_IP} -M 1360 -t 10
kubectl exec -it iperf3-client -- iperf3 -c ${SERVER_IP} -M 1410 -t 10
kubectl exec -it iperf3-client -- iperf3 -c ${SERVER_IP} -M 1460 -t 10
```

The `-M` option sets TCP MSS, not MTU directly. For IPv4 TCP without options, MSS is typically MTU minus 40 bytes, so MSS 1410 corresponds to MTU 1450. Compare throughput and retransmissions across sizes; failures or retransmissions at larger MSS values can indicate an MTU misconfiguration.

## Check for Fragmentation in Node Counters

```bash
# Check IP fragmentation counters on node
awk '
  /^Ip: / && !seen {split($0, h); seen=1; next}
  /^Ip: / && seen {
    for (i=2; i<=NF; i++) {
      if (h[i] ~ /^(Reasm|Frag)/) print h[i] "=" $i
    }
  }
' /proc/net/snmp
netstat -s | grep -i fragment
```

## Validate MTU Across Encapsulation Types

```mermaid
graph LR
    subgraph Validation Points
        V1[Pod eth0 MTU\nip link show eth0]
        V2[Tunnel Interface\nvxlan.calico or tunl0]
        V3[Host Interface\nip link show eth0]
        V4[End-to-End\nping with DF bit]
    end
    V1 -->|Must equal| V2
    V2 -->|host MTU minus overhead| V3
    V4 -->|No fragmentation\nat configured MTU| V1
```

## Automated MTU Validation Script

```bash
#!/bin/bash
EXPECTED_MTU=1450  # Adjust for your setup
ERRORS=0

while read POD; do
  MTU=$(kubectl exec ${POD} -- ip link show eth0 2>/dev/null | awk '/mtu/ {print $5}')
  if [ "${MTU}" != "${EXPECTED_MTU}" ]; then
    echo "ERROR: ${POD} has MTU=${MTU}, expected ${EXPECTED_MTU}"
    ERRORS=$((ERRORS+1))
  fi
done < <(kubectl get pods --field-selector=status.phase=Running -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

echo "MTU validation complete. Errors: ${ERRORS}"
```

## Conclusion

Validating Calico MTU configuration requires checking pod interface MTU values, testing with DF-bit ping at the expected MTU boundary, and monitoring fragmentation counters. Run this validation after any network or Calico configuration changes, and automate it as a cluster health check to catch MTU regressions early.
