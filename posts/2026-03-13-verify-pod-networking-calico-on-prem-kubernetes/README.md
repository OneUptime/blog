# How to Verify Pod Networking with Calico on On-Prem Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premise, Verification

Description: A systematic guide to verifying that Calico pod networking is functioning correctly on an on-premises Kubernetes cluster.

---

## Introduction

After installing Calico on an on-premises Kubernetes cluster, you need to confirm that pod networking is fully operational before deploying production workloads. This means verifying that pods receive IP addresses, that traffic flows between pods on the same node and across nodes, and that egress traffic leaves the cluster correctly.

On-premises environments add complexity because routing may depend on BGP sessions with physical routers, and firewall rules on the underlying network can silently drop pod traffic. A thorough verification process catches these issues early.

This guide provides a structured verification workflow for Calico on on-prem Kubernetes.

## Prerequisites

- Calico installed and running on an on-prem Kubernetes cluster
- `kubectl` and `calicoctl` installed
- At least two worker nodes for cross-node testing

## Step 1: Verify Calico Components Are Running

```bash
kubectl get pods -n calico-system
kubectl get pods -n tigera-operator
kubectl get tigerastatus
```

All components should show `Available: True` in the TigeraStatus.

## Step 2: Confirm Pod IP Assignment

Deploy a test pod and verify it receives a Calico-managed IP.

```bash
kubectl run test-pod --image=busybox -- sleep 3600
kubectl get pod test-pod -o wide
```

The IP should fall within your configured IP pool CIDR.

```bash
calicoctl ipam show --show-blocks
```

## Step 3: Test Same-Node Pod Communication

Deploy two pods on the same node.

```bash
kubectl run pod-a --image=busybox --overrides='{"spec":{"nodeName":"<node1>"}}' -- sleep 3600
kubectl run pod-b --image=busybox --overrides='{"spec":{"nodeName":"<node1>"}}' -- sleep 3600

POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c3 $POD_B_IP
```

## Step 4: Test Cross-Node Pod Communication

Deploy pods on different nodes.

```bash
kubectl run pod-c --image=busybox --overrides='{"spec":{"nodeName":"<node2>"}}' -- sleep 3600
POD_C_IP=$(kubectl get pod pod-c -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c3 $POD_C_IP
```

If cross-node ping fails, check BGP routes or encapsulation settings.

## Step 5: Verify BGP Route Advertisement

On a node, inspect the routing table to confirm pod routes are present.

```bash
# SSH into a worker node
ip route show | grep 192.168
```

If using BGP with no encapsulation, pod subnet routes should appear as BGP-learned routes.

```bash
calicoctl node status
```

## Step 6: Test Egress (Pod to External)

```bash
kubectl exec pod-a -- wget -qO- --timeout=5 http://example.com
```

If this fails, verify that `natOutgoing: true` is set in the IP pool and that MASQUERADE rules exist.

```bash
iptables -t nat -L MASQUERADE -n -v
```

## Conclusion

Verifying pod networking on an on-prem Calico cluster requires checking component health, confirming IP assignment, testing same-node and cross-node connectivity, validating BGP route advertisement, and confirming egress NAT. This sequence catches the most common networking failures before workloads depend on them.
