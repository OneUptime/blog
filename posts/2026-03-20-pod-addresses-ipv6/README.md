# How to Verify IPv6 Pod Addresses in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Pod, Address, Dual-Stack, Verification

Description: Verify that Kubernetes pods have received IPv6 addresses in dual-stack clusters, check pod network configuration from inside containers, and troubleshoot IPv6 address assignment failures.

## Introduction

In dual-stack Kubernetes clusters, pods should receive both IPv4 and IPv6 addresses from the pod CIDRs. The `status.podIPs` field in the pod status shows all assigned IP addresses. IPv6 addresses are visible inside the container via `ip -6 addr show`. Verifying pod IPv6 assignment is an important step after configuring a dual-stack cluster or CNI plugin.

## Check Pod IPv6 Addresses

```bash
# Check pod IPs for a specific pod
kubectl get pod mypod -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}'
# 10.244.0.5
# fd00:10:244::5

# Get only the IPv6 address
kubectl get pod mypod -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}' | grep ":"

# Check pods in all namespaces
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{" "}{range .status.podIPs[*]}{.ip}{" "}{end}{"\n"}{end}'

# Filter only pods with IPv6 addresses
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{" "}{range .status.podIPs[*]}{.ip}{" "}{end}{"\n"}{end}' | \
    grep ":"

# Count pods with IPv6 addresses
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{" "}{range .status.podIPs[*]}{.ip}{" "}{end}{"\n"}{end}' | \
    grep -c ":"
```

## Verify IPv6 Inside the Container

```bash
# Exec into a pod and check IPv6 configuration
kubectl exec mypod -- ip -6 addr show

# Output varies by CNI plugin, but it should include a global IPv6 address on the pod interface

# Check IPv6 routing inside pod
kubectl exec mypod -- ip -6 route show
# Output varies by CNI plugin; inspect the IPv6 routes configured for the pod interface

# Test IPv6 connectivity to another pod
OTHER_POD_IPV6=$(kubectl get pod otherpod -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}' | grep ":")
kubectl exec mypod -- ping -6 -c 3 "$OTHER_POD_IPV6"
```

## Script: Verify All Pods Have IPv6

```bash
#!/bin/bash
# check_pod_ipv6.sh - verify all running pods have IPv6 addresses

PASS=0
FAIL=0

echo "Checking IPv6 address assignment for all running pods..."

while IFS= read -r line; do
    NS=$(echo "$line" | awk '{print $1}')
    NAME=$(echo "$line" | awk '{print $2}')
    POD_IPS=$(kubectl get pod "$NAME" -n "$NS" \
        -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}' 2>/dev/null)

    if echo "$POD_IPS" | grep -q ":"; then
        echo "PASS: $NS/$NAME has IPv6"
        ((PASS++))
    else
        echo "FAIL: $NS/$NAME no IPv6 (IPs: $POD_IPS)"
        ((FAIL++))
    fi
done < <(kubectl get pods -A --field-selector=status.phase=Running \
    --no-headers -o custom-columns="NS:.metadata.namespace,NAME:.metadata.name")

echo ""
echo "Results: $PASS pods with IPv6, $FAIL pods without IPv6"
```

## Troubleshoot Missing IPv6 Pod Addresses

```bash
# Issue: Pod only has IPv4, no IPv6
kubectl get pod mypod -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}'
# 10.244.0.5  <- only IPv4

# Check 1: Is the node's pod CIDR dual-stack?
NODE=$(kubectl get pod mypod -o jsonpath='{.spec.nodeName}')
kubectl get node "$NODE" -o jsonpath='{range .spec.podCIDRs[*]}{.}{"\n"}{end}'
# Must show both an IPv4 and an IPv6 pod CIDR, for example:
# 10.244.1.0/24
# fd00:10:244:1::/64

# Check 2: Is the CNI plugin configured for IPv6?
# Check CNI-specific logs (e.g., Calico)
kubectl -n calico-system logs daemonset/calico-node --all-pods=true | grep -i "ipv6"

# Check 3: Was the pod scheduled after CNI restart?
# Try deleting and recreating the pod
kubectl delete pod mypod
# Recreate and check again

# Check 4: Node has IPv6 enabled
ssh node1 "ip -6 addr show"
ssh node1 "cat /proc/sys/net/ipv6/conf/all/disable_ipv6"
# Must be 0
```

## Conclusion

Verify pod IPv6 addresses using `kubectl get pod mypod -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}'` - in dual-stack clusters, this should list both IPv4 and IPv6 addresses. Check IPv6 inside containers with `kubectl exec mypod -- ip -6 addr show`. If pods only show IPv4, check that the node's `podCIDRs` includes an IPv6 range, the CNI plugin is configured for IPv6, and IPv6 is enabled on the node. Use the batch verification script to check all pods at once after cluster configuration changes.
