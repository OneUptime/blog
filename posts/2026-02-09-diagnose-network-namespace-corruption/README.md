# How to Diagnose Pod Network Namespace Corruption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Debugging

Description: Identify and fix network namespace corruption that causes pods to lose network connectivity or exhibit bizarre network behavior in Kubernetes clusters.

---

Network namespaces provide network isolation for containers in Kubernetes. Each pod gets its own network namespace with dedicated network interfaces, routing tables, and firewall rules. When network namespaces become corrupted, pods experience strange network behavior including total connectivity loss, intermittent failures, or seeing traffic from other pods. These issues are difficult to diagnose because they manifest in unpredictable ways and standard troubleshooting does not reveal the underlying namespace corruption.

Network namespace corruption typically results from CNI plugin bugs, node kernel issues, manual network configuration errors, or improper pod cleanup. Systematic diagnosis identifies corrupted namespaces and guides recovery.

## Understanding Network Namespace Architecture

Each pod has a network namespace created when the pod starts. The CNI plugin configures this namespace with interfaces, IP addresses, routes, and iptables rules. The kubelet tracks namespace paths, and container runtimes use these paths to attach containers to the correct namespace.

Corruption occurs when namespaces get orphaned, paths become invalid, or namespace contents become inconsistent with the CNI's expectations.

## Recognizing Namespace Corruption Symptoms

Several symptoms indicate network namespace problems. Pods enter ContainerCreating state with CNI errors, running pods suddenly lose all network connectivity, pods have no network interfaces except loopback, DNS resolution fails with "no such file or directory" errors, or pods see traffic belonging to other pods.

Check pod network interfaces:

```bash
# Check pod interfaces
kubectl exec -it my-pod -- ip link show

# Healthy pod shows:
# 1: lo: <LOOPBACK,UP,LOWER_UP>
# 3: eth0@if10: <BROADCAST,MULTICAST,UP,LOWER_UP>

# Corrupted namespace might show:
# 1: lo: <LOOPBACK,UP,LOWER_UP>
# (no eth0 - namespace corrupted)
```

Missing or misconfigured interfaces indicate namespace issues.

## Checking Network Namespace Paths

Verify namespace paths are valid:

```bash
# From a node, check network namespace paths
kubectl debug node/my-node -it --image=nicolaka/netshoot

# List all network namespaces
ip netns list

# Check if namespace files exist
ls -la /var/run/netns/

# For containers, namespaces are in /proc
ls -la /proc/*/ns/net

# Count namespaces
ip netns list | wc -l

# Compare with running pod count
kubectl get pods -o wide | grep NODE-NAME | wc -l

# Large discrepancy indicates orphaned namespaces
```

Orphaned namespaces consume resources and indicate cleanup failures.

## Inspecting Pod Network Configuration

Check if pod network configuration is complete:

```bash
# Check pod IP address
kubectl exec -it my-pod -- ip addr show

# Should show eth0 with assigned IP
# 3: eth0@if10: <BROADCAST,MULTICAST,UP,LOWER_UP>
#    inet 10.244.1.5/24 scope global eth0

# Check routing table
kubectl exec -it my-pod -- ip route show

# Should show default route and pod network route
# default via 10.244.1.1 dev eth0
# 10.244.1.0/24 dev eth0 scope link

# Missing routes indicate incomplete namespace setup
```

Incomplete configuration prevents connectivity.

## Testing Namespace Isolation

Verify namespace isolation works correctly:

```bash
# From a pod, check process namespace
kubectl exec -it my-pod -- ps aux

# Should only see pod's processes
# If you see node processes, namespace isolation failed

# Check network namespace
kubectl exec -it my-pod -- ip link show

# Should show pod's interfaces only
# If you see node's interfaces, namespace is shared incorrectly
```

Broken isolation is a serious corruption requiring immediate investigation.

## Examining CNI Plugin State

Check CNI plugin's view of pod networking:

```bash
# For Calico, check workload endpoints
kubectl exec -n kube-system calico-node-xxx -- \
  calicoctl get workloadEndpoint -o yaml

# Each running pod should have an endpoint
# Missing endpoints indicate CNI tracking issues

# For Cilium, check endpoints
kubectl exec -n kube-system cilium-xxx -- cilium endpoint list

# Verify each pod has an endpoint with correct IP
```

Mismatched CNI state and actual pod state indicates corruption.

## Checking veth Pairs

CNI plugins use veth pairs to connect pod namespaces to the host:

```bash
# From pod, identify veth interface number
kubectl exec -it my-pod -- ip link show

# Look for: 3: eth0@if10
# The @if10 means peer interface has index 10

# From node, find peer interface
kubectl debug node/my-node -it --image=nicolaka/netshoot
ip link show | grep "^10:"

# Should show: 10: veth12345@if3
# This is the host side of the veth pair

# If peer interface is missing, veth pair is broken
```

Broken veth pairs completely disconnect pods from the network.

## Testing Namespace Connectivity

Test if traffic can enter/exit the namespace:

```bash
# From node, ping pod IP
kubectl debug node/my-node -it --image=nicolaka/netshoot
ping 10.244.1.5

# If this fails, namespace connectivity is broken

# From pod, ping gateway
kubectl exec -it my-pod -- ping -c 3 10.244.1.1

# Gateway is typically .1 in pod's subnet
# Failure indicates namespace cannot send packets out
```

One-way connectivity failures suggest asymmetric namespace issues.

## Checking iptables Rules in Namespace

Each namespace can have its own iptables rules:

```bash
# Check if pod has unexpected iptables rules
kubectl exec -it my-pod -- iptables -L -n

# Normally pods have minimal rules
# Many rules might indicate corruption or misconfiguration

# Compare with healthy pod
kubectl exec -it healthy-pod -- iptables -L -n

# Significant differences indicate issues
```

Corrupted iptables rules block legitimate traffic.

## Examining Namespace Mount Points

Network namespaces rely on proper mount points:

```bash
# From node, check namespace mount points
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Check if namespace is properly mounted
findmnt | grep netns

# Check /var/run/netns directory
ls -la /var/run/netns/

# Verify bind mounts exist
mount | grep netns
```

Missing mount points prevent namespace access.

## Testing DNS in Namespace

DNS failures often indicate namespace corruption:

```bash
# Test DNS resolution
kubectl exec -it my-pod -- nslookup kubernetes.default

# If this fails with "no such file or directory",
# namespace might not have /etc/resolv.conf

# Check resolv.conf
kubectl exec -it my-pod -- cat /etc/resolv.conf

# Should show cluster DNS
# Missing or empty file indicates corruption
```

Corrupted /etc/resolv.conf prevents name resolution.

## Checking Namespace Cleanup

Improper cleanup leaves orphaned namespaces:

```bash
# From node, find orphaned namespaces
kubectl debug node/my-node -it --image=nicolaka/netshoot

# List all namespaces
ip netns list > all-namespaces.txt

# List running containers
crictl ps | awk '{print $1}' | while read cid; do
  crictl inspect $cid | jq -r '.info.runtimeSpec.linux.namespaces[] |
    select(.type=="network") | .path'
done > active-namespaces.txt

# Compare to find orphans
comm -23 <(sort all-namespaces.txt) <(sort active-namespaces.txt)
```

Orphaned namespaces indicate cleanup failures.

## Recreating Corrupted Pod Namespace

Fix corrupted namespaces by recreating the pod:

```bash
# Delete the problematic pod
kubectl delete pod my-pod --grace-period=0 --force

# The pod gets recreated (if part of a deployment)
# Or manually recreate it

# Verify new pod has healthy namespace
kubectl exec -it my-pod -- ip link show
kubectl exec -it my-pod -- ip route show
kubectl exec -it my-pod -- nslookup kubernetes.default
```

Pod recreation gives the pod a fresh namespace.

## Manually Cleaning Orphaned Namespaces

Clean up orphaned namespaces on nodes:

```bash
# WARNING: Be careful - only delete truly orphaned namespaces
kubectl debug node/my-node -it --image=nicolaka/netshoot

# List namespaces
ip netns list

# For each orphaned namespace (verify it's not in use!):
ip netns delete namespace-name

# Clean up /var/run/netns if needed
rm /var/run/netns/orphaned-namespace

# Restart CNI plugin to resync
kubectl delete pod -n kube-system calico-node-xxx
```

Manual cleanup resolves some namespace corruption issues.

## Checking Kernel Namespace Limits

Kernel limits can cause namespace creation failures:

```bash
# Check current namespace count
ip netns list | wc -l

# Check kernel limits
cat /proc/sys/user/max_net_namespaces

# If current count approaches limit, increase limit
echo 10000 > /proc/sys/user/max_net_namespaces

# Make permanent by adding to sysctl.conf
echo "user.max_net_namespaces = 10000" >> /etc/sysctl.conf
```

Hitting namespace limits prevents new pod creation.

## Verifying Container Runtime Namespace Handling

Check if container runtime properly manages namespaces:

```bash
# Inspect container namespace configuration
kubectl debug node/my-node -it --image=nicolaka/netshoot

# For containerd:
crictl inspect POD-ID | jq '.info.runtimeSpec.linux.namespaces'

# Should show network namespace path
# {
#   "type": "network",
#   "path": "/var/run/netns/cni-xxxxx"
# }

# If path is missing or invalid, runtime has issues
```

Runtime namespace handling bugs cause corruption.

## Testing with New Namespaces

Create test namespace to verify CNI functionality:

```bash
# Create test namespace manually
kubectl debug node/my-node -it --image=nicolaka/netshoot

ip netns add test-ns

# Try configuring it with CNI
export CNI_COMMAND=ADD
export CNI_CONTAINERID=test123
export CNI_NETNS=/var/run/netns/test-ns
export CNI_IFNAME=eth0
export CNI_PATH=/opt/cni/bin

# Run CNI plugin
/opt/cni/bin/calico < /etc/cni/net.d/10-calico.conflist

# If this fails, CNI has issues independent of specific pods
```

Testing CNI in isolation identifies plugin-level problems.

## Monitoring for Namespace Issues

Set up monitoring to detect namespace problems:

```bash
#!/bin/bash
# monitor-namespaces.sh

while true; do
  # Count namespaces
  NS_COUNT=$(ip netns list | wc -l)

  # Count running pods on node
  POD_COUNT=$(crictl ps -q | wc -l)

  # Alert if difference is too large
  DIFF=$((NS_COUNT - POD_COUNT))
  if [ $DIFF -gt 10 ]; then
    echo "WARNING: $DIFF orphaned namespaces detected"
  fi

  sleep 60
done
```

Continuous monitoring catches namespace leaks early.

## Restarting CNI Plugin

Restart CNI to recover from transient issues:

```bash
# Restart CNI plugin pods
kubectl delete pod -n kube-system -l k8s-app=calico-node

# Wait for new pods to start
kubectl get pods -n kube-system -l k8s-app=calico-node --watch

# Test if pods can now be created
kubectl run test-pod --image=nginx --restart=Never

# Check test pod networking
kubectl exec -it test-pod -- ip addr show
```

CNI restart resolves many namespace initialization issues.

## Checking for Kernel Bugs

Kernel bugs can corrupt namespaces:

```bash
# Check kernel version
uname -r

# Check for known namespace bugs
dmesg | grep -i "namespace\|netns"

# Look for errors like:
# - namespace cleanup failed
# - netns refcount error
# - veth creation failed

# Check kernel logs
journalctl -k | grep -i namespace
```

Kernel bugs may require node reboots or kernel updates.

## Rebooting Nodes as Last Resort

When namespace corruption is severe:

```bash
# Drain node to evacuate pods
kubectl drain my-node --ignore-daemonsets --delete-emptydir-data

# SSH to node and reboot
ssh my-node
sudo reboot

# Wait for node to come back
kubectl get nodes --watch

# Uncordon node
kubectl uncordon my-node

# Verify pods schedule and have healthy networking
```

Reboot clears all namespace state and starts fresh.

## Conclusion

Network namespace corruption causes bizarre networking issues that are difficult to diagnose. Symptoms include pods without network interfaces, broken DNS, missing routes, orphaned namespaces, and broken veth pairs. Systematic diagnosis checks namespace paths, verifies pod network configuration, examines CNI plugin state, tests connectivity, and looks for orphaned resources.

Most namespace corruption resolves by deleting and recreating affected pods to get fresh namespaces. Persistent issues may require CNI plugin restarts, manual namespace cleanup, or in severe cases, node reboots. Monitoring namespace counts and comparing with pod counts helps detect orphaned namespaces before they accumulate.

Understanding network namespace architecture and how CNI plugins manage namespaces helps you diagnose corruption faster. Check veth pairs, routing tables, DNS configuration, and CNI plugin tracking to identify what went wrong. Master these techniques, and you will recover from network namespace corruption and maintain stable pod networking in your Kubernetes clusters.
