# How to Validate L3 Interconnect Fabric with Calico in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, L3, BGP, Networking, Lab, Validation, Testing, calicoctl

Description: Step-by-step validation tests for Calico's L3 BGP routing fabric in a lab cluster, confirming BGP session establishment, route advertisement, and native routing behavior.

---

## Introduction

Validating L3 BGP routing in Calico requires confirming that BGP sessions are established, routes are correctly advertised and learned, Felix has programmed the learned routes into the Linux routing table, and cross-node traffic flows without encapsulation. Each of these is independently testable with standard tools.

This guide provides a complete BGP validation suite organized by layer — from BGP session state to packet-level routing verification.

## Prerequisites

- A Calico lab cluster configured with BGP mode (no overlay: `vxlanMode: Never`, `ipipMode: Never`)
- At least two worker nodes
- `kubectl`, `calicoctl` configured
- `birdcl` available inside the calico-node pod

## Validation 1: BGP Configuration Check

Verify the BGP configuration is as intended:

```bash
calicoctl get bgpconfiguration default -o yaml
# Expected:
# spec:
#   nodeToNodeMeshEnabled: true  (for small lab cluster)
#   asNumber: 64512

# Verify IPPool has no overlay configured
calicoctl get ippool default-ipv4-ippool -o yaml | grep -E "vxlanMode|ipipMode"
# Expected: both should be "Never" or absent
```

## Validation 2: BGP Session State

Check that BIRD has established BGP sessions with its peers:

```bash
kubectl exec -n calico-system -l k8s-app=calico-node -c calico-node \
  -- birdcl show protocols
```

Expected output for a two-node cluster:
```
Name       Proto      Table      State  Since         Info
Node_172_16_1_2  BGP        ---        up     12:34:56      Established
```

All sessions should show `Established`. Any session showing `Active` or `Idle` indicates a BGP peering problem.

## Validation 3: Route Advertisement Verification

Confirm that each node is advertising its pod CIDR:

```bash
# From Node 1, view routes received from Node 2
kubectl exec -n calico-system -l k8s-app=calico-node -c calico-node \
  -- birdcl show route
# Expected: 10.0.2.0/26 via 172.16.2.1 (Node 2's pod CIDR)

# View what routes this node is advertising
kubectl exec -n calico-system -l k8s-app=calico-node -c calico-node \
  -- birdcl show route export <peer-name>
```

## Validation 4: Linux Routing Table Verification

Felix programs learned BGP routes into the Linux routing table. Verify these are present:

```bash
# On Node 1, verify route to Node 2's pod CIDR
ip route show | grep "proto bird"
# Expected: 10.0.2.0/26 via 172.16.2.1 dev eth0 proto bird

# Verify specific pod route
POD_IP=$(kubectl get pod pod-on-node2 -o jsonpath='{.status.podIP}')
ip route show $POD_IP
# Expected: Route pointing to Node 2
```

## Validation 5: Native Routing (No Encapsulation)

Verify that cross-node traffic travels without encapsulation:

```bash
# Deploy pods on different nodes
kubectl run pod-a --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"worker-1"}}' -- sleep 3600
kubectl run pod-b --image=nginx \
  --overrides='{"spec":{"nodeName":"worker-2"}}'

# Capture on the physical NIC to check for encapsulation
sudo tcpdump -i eth0 -n -c 10 &
kubectl exec pod-a -- wget -qO- http://$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
# Expected: Direct pod IP traffic visible on eth0, NO VXLAN (port 4789) or IP-in-IP (proto 4)
```

In BGP mode, `tcpdump` on the physical NIC should show pod IPs directly, without any encapsulation headers.

## Validation 6: BGP Route Convergence Time

Measure how long it takes for a new pod's route to propagate across the cluster:

```bash
# Start a new pod and measure time until cross-node connectivity
time kubectl run convergence-test --image=nginx --overrides='{"spec":{"nodeName":"worker-2"}}'

# Wait for pod to be ready
kubectl wait pod convergence-test --for=condition=Ready --timeout=30s

# Verify route is in table on other node
NEW_POD_IP=$(kubectl get pod convergence-test -o jsonpath='{.status.podIP}')
# On Node 1:
ip route show $NEW_POD_IP
# Expected: Route present within a few seconds of pod Ready
```

BGP convergence in Calico is typically sub-second for small clusters.

## Validation 7: BGP Session Recovery After Disconnect

Test that BGP sessions recover after a temporary network interruption:

```bash
# Simulate BGP disruption by temporarily blocking BGP port
# On Node 1:
sudo iptables -I INPUT -s <node-2-ip> -p tcp --dport 179 -j DROP

# Wait a moment
sleep 10

# Verify session is disrupted
kubectl exec -n calico-system -l k8s-app=calico-node -c calico-node \
  -- birdcl show protocols | grep <node-2-ip>
# Expected: Session shows Active or Idle

# Re-enable
sudo iptables -D INPUT -s <node-2-ip> -p tcp --dport 179 -j DROP

# Verify recovery
sleep 10
kubectl exec -n calico-system -l k8s-app=calico-node -c calico-node \
  -- birdcl show protocols | grep <node-2-ip>
# Expected: Session re-established
```

## Validation Checklist

| Check | Expected Result |
|---|---|
| BGP configuration | nodeToNodeMesh enabled, AS configured |
| BGP sessions | All sessions Established |
| Route advertisement | Remote node pod CIDRs visible |
| Linux routing table | Routes with proto bird present |
| No encapsulation | No VXLAN/IP-in-IP on physical NIC |
| BGP convergence | Routes appear within seconds |
| Session recovery | Re-establishes after disruption |

## Best Practices

- Run validation 2 (BGP session state) as part of your daily operational checks
- Alert when any BGP session drops below `Established` — this indicates routing will fail
- Test BGP session recovery in the lab before production to understand your recovery time

## Conclusion

L3 BGP validation confirms the full routing stack: BGP sessions established, routes correctly advertised and learned, Felix programming Linux routes, and packets flowing natively without encapsulation. Each layer has distinct observable artifacts and specific test cases. Running the complete validation suite gives you high confidence that the BGP fabric is functioning correctly before relying on it for production traffic.
