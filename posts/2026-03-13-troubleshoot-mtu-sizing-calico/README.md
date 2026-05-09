# How to Troubleshoot MTU Sizing for Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, MTU, Networking, Troubleshooting

Description: Diagnose and fix MTU-related issues in Calico that cause packet fragmentation, silent connection failures, and degraded throughput in Kubernetes workloads.

---

## Introduction

MTU misconfigurations in Calico are notoriously difficult to diagnose because the symptoms are often indirect: TLS handshakes fail, HTTP connections drop after large responses, or gRPC streams silently fail after a few kilobytes. These failures occur because large packets that exceed the MTU get fragmented or dropped, but only in specific conditions that depend on packet size.

The classic symptom pattern is that small requests work fine while large downloads fail. This is because small packets (like a basic HTTP GET request) fit within the MTU, but large responses require packets near the MTU limit, and if the MTU is misconfigured those large packets get dropped.

## Prerequisites

- Access to node shell for network diagnostics
- kubectl exec access to pods
- tcpdump or wireshark for packet inspection

## Identify MTU Problems

Classic symptoms of MTU issues:

- Small HTTP requests work, but large responses fail
- SSH sessions work but scp/sftp hangs
- Container images fail to pull after initial layer
- gRPC connections drop after a few messages

```bash
# Check for large numbers of fragmented packets

netstat -s | grep -i fragment
awk '
  /^Ip: / && !seen++ {
    for (i = 1; i <= NF; i++) field[$i] = i
    next
  }
  /^Ip: / { print "Fragments created:", $field["FragCreates"] }
' /proc/net/snmp
```

## Find the Actual MTU in Use

```bash
# Check the configured Calico MTU for Operator installations
kubectl get installation.operator.tigera.io default -o yaml | grep mtu

# Check the configured Calico MTU for manifest-based installations
kubectl get configmap -n kube-system calico-config -o yaml | grep mtu

# Check the actual pod interface MTU
kubectl exec <pod-name> -- ip link show eth0 | grep mtu

# Check the host interface MTU
ip link show | grep mtu
```

## Test for MTU Black Holes

Use progressively larger ping packets to find the MTU ceiling:

```bash
# Find the point of failure
for size in 1400 1420 1440 1450 1460 1470 1480 1490 1500; do
  result=$(kubectl exec test-pod -- ping -M do -s ${size} -c 1 -W 2 <peer-pod-ip> 2>&1)
  if echo "${result}" | grep -q "0 received\|Frag needed"; then
    echo "FAIL at size ${size}"
  else
    echo "OK at size ${size}"
  fi
done
```

## Fix MTU Configuration

After identifying the correct MTU, update Calico. For Operator installations, set the workload MTU on the Installation resource:

```bash
# For direct BGP routing (no encap)
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"mtu":1500}}}'

# For VXLAN (subtract 50 bytes for VXLAN header)
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

For manifest-based installations, update the `calico-config` ConfigMap instead:

```bash
kubectl patch configmap/calico-config -n kube-system --type merge \
  -p '{"data":{"veth_mtu":"1450"}}'
```

For manifest-based installations, restart Calico node pods so the new ConfigMap is loaded. Because the updated MTU applies to new workloads, restart workload pods after changing either install type:

```bash
# Manifest-based installations only
kubectl rollout restart daemonset calico-node -n kube-system

# Restart affected workloads
kubectl rollout restart deployment -n <namespace>
```

## MTU Troubleshooting Flowchart

```mermaid
flowchart TD
    A[Symptoms:\nLarge transfers fail\nTLS handshake issues] --> B[Check fragmentation\ncounters on node]
    B --> C{Fragment\ncounters high?}
    C -- Yes --> D[Find MTU ceiling\nwith ping -M do]
    D --> E[Compare against\nCalico MTU config]
    E --> F{Config matches\ncorrect MTU?}
    F -- No --> G[Update Calico\nMTU configuration]
    G --> H[Restart required\npods]
    F -- Yes --> I[Check host\nphysical interface MTU]
    C -- No --> J[Investigate\nother causes]
```

## Conclusion

MTU troubleshooting in Calico starts with identifying fragmentation counter spikes, then using progressively larger DF-bit ping payloads to find the actual MTU limit in the path. Once the correct MTU is identified, update the Calico MTU configuration and restart pods to apply the new MTU value to pod interfaces. Document the correct MTU for your environment to prevent regressions after future changes.
