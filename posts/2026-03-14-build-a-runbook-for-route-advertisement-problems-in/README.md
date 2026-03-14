# Building a Runbook for Route Advertisement Problems in Calico BGP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, BGP, Runbook

Description: Create a structured operational runbook for diagnosing and resolving BGP route advertisement failures in Calico, with decision trees and step-by-step remediation procedures.

---

## Introduction

A BGP route advertisement runbook transforms the complex task of diagnosing BGP issues into a repeatable process. BGP problems in Calico can stem from multiple layers: the Calico configuration, the BIRD routing daemon, the Linux kernel routing table, or the underlying network infrastructure. Without a structured approach, engineers may spend hours checking the wrong layer.

This runbook provides a top-down diagnostic flow starting from the symptom (pods cannot communicate across nodes) down to the specific BGP component that is failing. Each diagnostic step includes the exact commands to run and decision points that guide the engineer to the correct fix.

## Prerequisites

- `kubectl` and `calicoctl` with cluster-admin access
- SSH access to cluster nodes or `kubectl debug` capability
- Access to network infrastructure monitoring (if using external BGP peers)
- This runbook saved in your incident management system

## Runbook: Initial Triage

```bash
# Step 1: Confirm the symptom is cross-node connectivity failure
# Test pod-to-pod connectivity across different nodes
kubectl run rr-test-server --image=nginx --restart=Never
kubectl run rr-test-client --image=busybox --restart=Never -- sleep 300
kubectl wait --for=condition=Ready pod/rr-test-server pod/rr-test-client --timeout=60s

SERVER_IP=$(kubectl get pod rr-test-server -o jsonpath='{.status.podIP}')
SERVER_NODE=$(kubectl get pod rr-test-server -o jsonpath='{.spec.nodeName}')
CLIENT_NODE=$(kubectl get pod rr-test-client -o jsonpath='{.spec.nodeName}')

echo "Server on: $SERVER_NODE ($SERVER_IP)"
echo "Client on: $CLIENT_NODE"

kubectl exec rr-test-client -- wget -qO- --timeout=5 http://$SERVER_IP 2>&1
# If this fails and both pods are on different nodes → BGP issue likely

# Step 2: Check the scope of the problem
calicoctl node status
# Look for any peers not in "Established" state
```

## Runbook: BGP Session Diagnostics

```bash
# Step 3: Identify which BGP sessions are failing
calicoctl node status 2>&1 | grep -v "Established"

# Decision Point:
# - All sessions down → Cluster-wide issue (firewall, BGP config)
# - Specific node sessions down → Node-specific issue
# - All sessions up → Routes exist but may not be correct

# Step 4: For sessions not Established, check BIRD status
kubectl exec -n calico-system $(kubectl get pod -n calico-system \
  -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -- \
  birdcl show protocols all | head -50

# Step 5: Check calico-node logs for BGP errors
kubectl logs -n calico-system -l k8s-app=calico-node --tail=30 \
  | grep -iE "bgp|bird|peer|route"
```

## Runbook: Network Layer Checks

```bash
# Step 6: Verify port 179 connectivity
# From the node where BGP is failing, test connectivity to a peer
kubectl debug node/FAILING_NODE -it --image=nicolaka/netshoot -- \
  nc -zv PEER_IP 179 -w 5

# Step 7: Check for IPtables rules blocking BGP
kubectl debug node/FAILING_NODE -it --image=nicolaka/netshoot -- \
  iptables -L INPUT -n | grep 179

# Step 8: Verify IPIP or VXLAN tunnel interfaces exist
kubectl debug node/FAILING_NODE -it --image=nicolaka/netshoot -- \
  ip link show type ipip
kubectl debug node/FAILING_NODE -it --image=nicolaka/netshoot -- \
  ip link show type vxlan
```

## Runbook: Configuration Verification

```bash
# Step 9: Verify BGP configuration
calicoctl get bgpconfiguration default -o yaml

# Check these fields:
# - asNumber: consistent across cluster
# - nodeToNodeMeshEnabled: true (unless using route reflectors)

# Step 10: Verify IP pool configuration
calicoctl get ippool -o yaml

# Check these fields:
# - ipipMode or vxlanMode matches network topology
# - disabled is not true
# - cidr matches cluster pod CIDR

# Step 11: Check for BGP peer configuration issues
calicoctl get bgppeer -o yaml
# Verify peerIP, asNumber, and nodeSelector are correct

# Step 12: Verify node IPAM allocations
calicoctl ipam show --show-blocks
```

Apply the appropriate fix based on diagnosis:

```yaml
# Fix template: Correct BGP configuration
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
```

## Verification

```bash
# Post-fix verification steps
echo "=== Post-Fix Verification ==="

# 1. All BGP sessions established
echo "1. BGP Session Status:"
calicoctl node status | grep -c "Established"

# 2. Routes present on all nodes
echo "2. Route Count per Node:"
for NODE in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  COUNT=$(kubectl debug node/$NODE -it --image=nicolaka/netshoot -- \
    ip route show proto bird 2>/dev/null | wc -l)
  echo "   $NODE: $COUNT routes"
done

# 3. Cross-node connectivity
echo "3. Cross-Node Connectivity:"
kubectl exec rr-test-client -- wget -qO- --timeout=5 http://$SERVER_IP >/dev/null 2>&1 && echo "   PASS" || echo "   FAIL"

# Cleanup
kubectl delete pod rr-test-server rr-test-client 2>/dev/null
```

## Troubleshooting

- **BGP sessions established but routes missing**: This indicates BIRD is peered but not advertising routes. Check the IP pool `disabled` field and verify IPAM block allocations with `calicoctl ipam show`.
- **Routes present on node but pod traffic still fails**: Check if IPIP or VXLAN tunnels are up. If using IPIP mode, verify IP protocol 4 is allowed through firewalls.
- **Only new pods fail, existing pods work**: IPAM block exhaustion may prevent new IP allocations. Check with `calicoctl ipam show` and look for blocks at capacity.
- **BGP session flaps repeatedly**: Check for MTU issues, CPU overload on the node, or network instability. Review `kubectl logs -n calico-system` for the calico-node pod on the affected node.

## Conclusion

This runbook provides a systematic 12-step diagnostic process for BGP route advertisement problems in Calico: confirm symptoms, check BGP sessions, verify network connectivity, and review configuration. The decision tree at each step guides engineers to the correct fix without unnecessary investigation. Store this runbook alongside your alerting configuration so on-call engineers can access it immediately when BGP alerts fire.
