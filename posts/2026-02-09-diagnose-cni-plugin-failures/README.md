# How to Diagnose CNI Plugin Failures During Pod Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, CNI

Description: Identify and fix CNI plugin failures that prevent pods from starting or cause network initialization errors in Kubernetes clusters.

---

Container Network Interface (CNI) plugins are responsible for configuring network interfaces when pods start. When CNI plugins fail, pods get stuck in ContainerCreating or CrashLoopBackOff state with network-related errors. These failures prevent applications from running and can be difficult to diagnose because the errors often provide limited context.

CNI plugin failures stem from various causes including plugin configuration errors, resource exhaustion, IP address pool depletion, or conflicts with node network configuration. Systematic diagnosis identifies the specific failure and guides you to the appropriate fix.

## Recognizing CNI Plugin Failures

CNI failures manifest in specific patterns. Pods remain in ContainerCreating state indefinitely, describe output shows "NetworkNotReady" or "Failed to create pod sandbox" errors, and kubelet logs contain CNI plugin errors. Events may show messages like "failed to setup network" or "error getting ClusterInformation".

Check pod status:

```bash
# View pod status
kubectl get pods -n my-namespace

# Stuck in ContainerCreating:
# NAME      READY   STATUS              RESTARTS   AGE
# my-pod    0/1     ContainerCreating   0          5m

# Describe pod for details
kubectl describe pod my-pod -n my-namespace

# Look for events like:
# Failed to create pod sandbox: rpc error: code = Unknown desc = failed to setup network for sandbox
```

These symptoms indicate CNI plugin problems.

## Checking Kubelet Logs

Kubelet logs contain detailed CNI error messages:

```bash
# On the node where the pod is scheduled
kubectl debug node/my-node -it --image=nicolaka/netshoot

# View kubelet logs
journalctl -u kubelet -n 100 --no-pager | grep -i cni

# Look for errors like:
# Failed to create pod sandbox: failed to setup network
# CNI failed to retrieve network namespace path
# error adding container to network
```

These logs reveal exactly what failed during network setup.

## Verifying CNI Plugin Installation

Ensure CNI plugins are properly installed:

```bash
# Check CNI plugin binaries exist
kubectl debug node/my-node -it --image=nicolaka/netshoot
ls -la /opt/cni/bin/

# Should contain plugins like:
# bridge, host-local, loopback, portmap, bandwidth, etc.
# Plus CNI-specific plugins (calico, cilium, flannel, etc.)

# Check CNI configuration
ls -la /etc/cni/net.d/

# Should contain .conf or .conflist files
cat /etc/cni/net.d/10-calico.conflist
```

Missing binaries or configuration files prevent CNI from working.

## Checking CNI Plugin Pods

Most CNI plugins run as DaemonSets. Verify they are healthy:

```bash
# For Calico
kubectl get pods -n kube-system -l k8s-app=calico-node

# For Cilium
kubectl get pods -n kube-system -l k8s-app=cilium

# For Flannel
kubectl get pods -n kube-system -l app=flannel

# All pods should be Running
# Check logs if any are failing
kubectl logs -n kube-system calico-node-xxx --tail=100
```

Unhealthy CNI plugin pods cannot configure new pod networks.

## Verifying IP Address Pools

CNI plugins allocate IP addresses from configured pools. Pool exhaustion causes failures:

```bash
# For Calico, check IP pool configuration
kubectl get ippools

# Check utilization
kubectl get ippools default-ipv4-ippool -o yaml

# Look for blockSize and available addresses
# If pool is exhausted, pods cannot get IPs

# For Cilium, check IPAM status
kubectl exec -n kube-system cilium-xxx -- cilium status | grep -i ipam

# For Flannel, check subnet allocation
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
```

Expand IP pools if they are exhausted.

## Testing CNI Plugin Manually

Test CNI plugin execution directly:

```bash
# Access node
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Create test network namespace
ip netns add testns

# Try running CNI plugin manually
# For Calico:
CNI_COMMAND=ADD CNI_CONTAINERID=test CNI_NETNS=/var/run/netns/testns \
  CNI_IFNAME=eth0 CNI_PATH=/opt/cni/bin \
  /opt/cni/bin/calico < /etc/cni/net.d/10-calico.conflist

# Check for errors in output
# Successful execution returns JSON with IP allocation
```

Manual execution reveals specific plugin errors.

## Checking Node Network Configuration

Node network misconfiguration causes CNI failures:

```bash
# Check node IP configuration
kubectl debug node/my-node -it --image=nicolaka/netshoot
ip addr show

# Verify routing
ip route show

# Check if node has required kernel modules
lsmod | grep -E "vxlan|ipip|wireguard"

# For overlay networks, ensure modules are loaded
modprobe vxlan
modprobe ipip
```

Missing kernel modules or incorrect routing prevents CNI plugins from working.

## Analyzing CNI Plugin Logs

Different CNI plugins have different logging:

```bash
# Calico logs
kubectl logs -n kube-system calico-node-xxx | grep -i error

# Look for:
# - IPAM errors (IP allocation failures)
# - BGP peering issues
# - Datastore connection errors

# Cilium logs
kubectl logs -n kube-system cilium-xxx | grep -i error

# Look for:
# - Agent initialization errors
# - Endpoint creation failures
# - Policy compilation errors

# Enable debug logging if needed
kubectl set env daemonset/calico-node -n kube-system FELIX_LOGSEVERITYSCREEN=debug
```

Debug logs provide detailed information about plugin operations.

## Checking CNI Configuration Syntax

Invalid CNI configuration prevents plugin initialization:

```bash
# View CNI configuration
cat /etc/cni/net.d/10-calico.conflist

# Validate JSON syntax
cat /etc/cni/net.d/10-calico.conflist | jq .

# If jq fails, configuration has JSON syntax errors

# Check required fields exist:
# - cniVersion
# - name
# - plugins array

# Verify plugin names match binaries in /opt/cni/bin/
```

Fix syntax errors and restart kubelet.

## Verifying Datastore Connectivity

Many CNI plugins use etcd or Kubernetes API as datastore:

```bash
# For Calico with Kubernetes datastore
kubectl logs -n kube-system calico-node-xxx | grep -i datastore

# Check if it can read CRDs
kubectl get crd | grep -i projectcalico.org

# Verify calico-node can access API
kubectl logs -n kube-system calico-node-xxx | grep -i "Kubernetes API"

# For plugins using etcd directly
# Check etcd connectivity from CNI plugin pod
```

Datastore connectivity issues prevent CNI plugins from allocating IPs or configuring networks.

## Checking for IP Conflicts

IP address conflicts cause pod networking failures:

```bash
# Check for duplicate IPs
kubectl get pods --all-namespaces -o wide | awk '{print $7}' | sort | uniq -d

# If duplicates exist, CNI IPAM has issues

# For Calico, check IPAM consistency
kubectl exec -n kube-system calico-node-xxx -- calico-node -birdv

# Look for IP conflicts in logs
kubectl logs -n kube-system calico-node-xxx | grep -i "duplicate\|conflict"
```

Reset IPAM state if conflicts exist.

## Verifying RBAC Permissions

CNI plugins need proper RBAC permissions:

```bash
# Check service account permissions
kubectl get clusterrolebinding | grep -i calico

# Verify CNI plugin service account can:
# - Read/write pods
# - Read/write network policies
# - Access CNI-specific CRDs

# Test permissions
kubectl auth can-i get pods --as=system:serviceaccount:kube-system:calico-node -n default
```

Missing permissions prevent CNI plugins from managing network resources.

## Checking for Network Namespace Leaks

Orphaned network namespaces cause failures:

```bash
# List network namespaces on node
kubectl debug node/my-node -it --image=nicolaka/netshoot
ip netns list

# Should only show namespaces for running pods
# Orphaned namespaces indicate cleanup failures

# Count namespaces
ip netns list | wc -l

# Compare with pod count on node
# Large discrepancy indicates leaks
```

Clean up orphaned namespaces manually if CNI plugin failed to do so.

## Testing with Simple Pod

Create minimal test pod to isolate issues:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-cni
spec:
  nodeName: my-node  # Schedule to specific node
  containers:
  - name: pause
    image: k8s.gcr.io/pause:3.8
```

Apply and check if it succeeds:

```bash
kubectl apply -f test-pod.yaml
kubectl get pod test-cni --watch

# If test pod fails with same error, issue affects all pods
# If test pod succeeds, issue is specific to original pod
```

This isolates CNI issues from application-specific problems.

## Checking for Resource Exhaustion

CNI plugins need node resources:

```bash
# Check node resource usage
kubectl describe node my-node | grep -A5 "Allocated resources"

# Check CNI plugin pod resource usage
kubectl top pod -n kube-system -l k8s-app=calico-node

# Check for OOMKilled events
kubectl get pods -n kube-system -l k8s-app=calico-node -o yaml | grep -i oom

# Increase resource limits if needed
kubectl edit daemonset calico-node -n kube-system
```

Resource exhaustion prevents CNI plugins from configuring networks.

## Verifying Bridge Configuration

Many CNI plugins use Linux bridges:

```bash
# Check bridge existence
kubectl debug node/my-node -it --image=nicolaka/netshoot
ip link show | grep -i bridge

# Common bridge names: cni0, cbr0, docker0

# Check bridge configuration
brctl show

# Verify interfaces are attached
ip link show | grep -i veth
```

Missing or misconfigured bridges prevent pod networking.

## Checking for MTU Mismatches

MTU mismatches cause network initialization failures:

```bash
# Check configured MTU for CNI
kubectl get cm -n kube-system calico-config -o yaml | grep mtu

# Check actual interface MTU
kubectl debug node/my-node -it --image=nicolaka/netshoot
ip link show | grep mtu

# Ensure CNI MTU matches or is smaller than node interface MTU
```

MTU mismatches can prevent CNI plugin initialization.

## Restarting CNI Plugin

Sometimes CNI plugin gets into a bad state:

```bash
# Restart CNI plugin pods
kubectl delete pod -n kube-system -l k8s-app=calico-node

# DaemonSet recreates them
# Watch them come back up
kubectl get pods -n kube-system -l k8s-app=calico-node --watch

# Test pod creation after restart
```

Restart resolves transient CNI plugin issues.

## Checking for Overlapping Networks

Overlapping pod and node networks cause issues:

```bash
# Check pod CIDR
kubectl cluster-info dump | grep -i cluster-cidr

# Check node network
kubectl get nodes -o wide

# Ensure pod CIDR does not overlap with:
# - Node network
# - Service CIDR
# - External networks the cluster accesses
```

Overlapping networks require reconfiguring the cluster network layout.

## Conclusion

CNI plugin failures during pod creation stem from various causes including misconfigured plugins, exhausted IP pools, missing kernel modules, datastore connectivity issues, or RBAC permission problems. Systematic diagnosis checks CNI plugin pod status, examines kubelet logs, verifies configuration syntax, tests IP pool availability, and validates node network setup.

Most CNI issues resolve by ensuring plugin pods are healthy, configuration is correct, IP pools have available addresses, and the CNI has proper permissions. For persistent issues, manual CNI execution tests reveal specific failure points.

Understanding your CNI plugin's architecture and how it integrates with Kubernetes helps you quickly diagnose failures. Different CNI plugins have different failure modes, so familiarize yourself with your specific CNI's operation and common issues. Master these troubleshooting techniques, and you will keep pod networking reliable across your Kubernetes cluster.
