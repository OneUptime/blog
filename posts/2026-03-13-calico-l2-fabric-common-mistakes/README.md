# How to Avoid Common Mistakes with L2 Interconnect Fabric with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, L2, Networking, VXLAN, IP-in-IP, Troubleshooting, MTU

Description: Common L2 overlay networking mistakes in Calico deployments, from MTU misconfiguration to security group gaps, and how to diagnose and fix them.

---

## Introduction

L2 overlay networking mistakes in Calico tend to cause two categories of failures: complete connectivity loss (when the overlay protocol is blocked) and intermittent/partial failures (when MTU is misconfigured). The intermittent failures are the most dangerous because they are hard to reproduce and easy to misdiagnose as application bugs.

This post covers the most common L2 overlay mistakes with diagnostic commands and fixes.

## Prerequisites

- A Calico cluster using VXLAN or IP-in-IP encapsulation
- Node-level access for tcpdump and interface inspection
- Knowledge of your cloud provider's security group/firewall configuration

## Mistake 1: Security Group Not Allowing Overlay Protocol

The most common L2 overlay mistake is forgetting to add security group or firewall rules for the overlay protocol. Without these rules, all cross-node pod traffic is silently dropped.

**Symptom**: Same-node pod-to-pod connectivity works. Cross-node connectivity fails completely.

**Diagnosis**:
```bash
# On a node, attempt to ping another node
ping -c 3 <other-node-ip>
# If this fails, basic connectivity is broken

# Capture on the overlay interface to see if traffic is being sent
sudo tcpdump -i vxlan.calico -n -c 5
# If no traffic captured when cross-node pods communicate, the VXLAN interface
# is not receiving packets

# Check if there's traffic being sent but not received
sudo tcpdump -i eth0 -n udp port 4789 -c 10
# If traffic is seen on eth0 but not delivered to vxlan.calico,
# the kernel VXLAN processing is failing
```

**Fix**: Add security group rules:
- VXLAN: Allow inbound and outbound UDP port 4789 between all nodes
- IP-in-IP: Allow inbound and outbound IP protocol 4 between all nodes

## Mistake 2: Incorrect MTU Configuration

If the MTU on pod interfaces is not reduced to account for encapsulation overhead, large packets will either be fragmented or dropped silently.

**Symptom**: Small HTTP requests work; large file transfers fail or stall. `ping` with small packets works; `ping -s 1400` fails.

**Diagnosis**:
```bash
# Check pod interface MTU
kubectl exec test-pod -- ip link show eth0 | grep mtu
# If this shows 1500 with VXLAN enabled, MTU is not configured correctly

# Test with large ping
NODE_MTU=1500
VXLAN_OVERHEAD=50
EXPECTED_POD_MTU=$((NODE_MTU - VXLAN_OVERHEAD))

kubectl exec test-pod -- ping -M do -s $((EXPECTED_POD_MTU - 28)) <dest-pod-ip>
# If this fails, MTU is incorrect
```

**Fix**: Set MTU explicitly in the Calico Installation resource:
```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
spec:
  calicoNetwork:
    mtu: 1450  # For VXLAN on 1500 MTU nodes
```

## Mistake 3: VXLAN and IP-in-IP Both Configured

Configuring both `vxlanMode` and `ipipMode` on the same IPPool creates unpredictable behavior - Calico will use one mode but the configuration is confusing and may change after upgrades.

**Fix**: Configure only one mode per IPPool:
```bash
# Check current configuration
calicoctl get ippool default-ipv4-ippool -o yaml | grep -E "vxlan|ipip"

# Fix: set the unused mode to "Never"
calicoctl patch ippool default-ipv4-ippool \
  -p '{"spec":{"ipipMode":"Never","vxlanMode":"Always"}}'
```

## Mistake 4: Missing VXLAN FDB Entries

If Felix loses its connection to the datastore, it may stop updating the VXLAN FDB entries. When new nodes join the cluster, their pods become unreachable because no FDB entry exists for the new node.

**Symptom**: Pods on newly joined nodes are unreachable. Existing pods on old nodes continue to work.

**Diagnosis**:
```bash
bridge fdb show dev vxlan.calico
# Count entries and compare to node count
kubectl get nodes | wc -l
# If FDB entry count < node count - 1, entries are missing
```

**Fix**: Restart calico-node on the affected node to force Felix to repopulate the FDB:
```bash
kubectl delete pod -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=<problem-node>
```

## Mistake 5: CrossSubnet Mode Misconfigured for Topology

Using CrossSubnet mode but having all nodes on different subnets results in all traffic being encapsulated anyway - same as using Always mode, but with more configuration complexity and potential confusion.

**Diagnosis**:
```bash
# Check what subnet nodes are in
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.addresses[?(@.type=="InternalIP")].address}{"\n"}{end}'
# If all node IPs are in different /24 subnets, CrossSubnet provides no benefit
```

**Fix**: If topology doesn't have same-subnet nodes, switch to `vxlanMode: Always` for clearer configuration.

## Best Practices

- Always test cross-node connectivity before any production deployment - same-node tests don't validate the overlay
- Verify security group rules for the overlay protocol as part of your cluster provisioning checklist
- Set MTU explicitly in the Calico Installation resource - never rely on auto-detection
- Monitor VXLAN FDB entry count as a cluster health metric - sudden drops indicate Felix connectivity issues

## Conclusion

The most common L2 overlay mistakes are missing firewall rules (overlay protocol blocked), incorrect MTU (large packets silently dropped), dual-mode configuration, missing FDB entries for new nodes, and CrossSubnet misconfigured for the actual topology. Building these checks into your provisioning and ongoing monitoring processes prevents the majority of L2 overlay incidents.
