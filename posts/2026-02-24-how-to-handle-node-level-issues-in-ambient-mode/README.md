# How to Handle Node-Level Issues in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Node Troubleshooting, DaemonSet, Kubernetes

Description: How to diagnose and resolve node-level problems that affect Istio ambient mode operation including ztunnel and CNI agent issues.

---

Istio ambient mode is more node-aware than traditional sidecar mode. The ztunnel DaemonSet and the Istio CNI agent both run at the node level, and problems with either one affect every mesh-enrolled pod on that node. When you see issues that affect all pods on one node but not others, you are dealing with a node-level problem. Here is how to identify and fix them.

## Identifying Node-Level Issues

The first sign of a node-level issue is that problems are isolated to a single node. Run this to see if issues correlate with a specific node:

```bash
# Check pod status grouped by node

kubectl get pods -n my-app -o wide --sort-by='.spec.nodeName'

# Check ztunnel status per node
kubectl get pods -n istio-system -l app=ztunnel -o wide

# Check CNI agent status per node
kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o wide
```

If all failing pods are on the same node, and the ztunnel or CNI agent on that node is unhealthy, you have found your problem.

## ztunnel Not Running on a Node

If the ztunnel DaemonSet does not have a pod on a specific node, check for scheduling issues:

```bash
# Check DaemonSet status
kubectl get daemonset ztunnel -n istio-system

# Look for nodes where ztunnel is not scheduled
kubectl get nodes -o name | while read node; do
  name=$(echo $node | cut -d/ -f2)
  count=$(kubectl get pods -n istio-system -l app=ztunnel --field-selector spec.nodeName=$name --no-headers 2>/dev/null | wc -l)
  echo "$name: $count ztunnel pods"
done
```

Common reasons ztunnel is not scheduled:

**Node taints**: ztunnel needs to tolerate node taints:

```bash
kubectl describe node problem-node | grep Taints
```

If the node has taints that ztunnel does not tolerate, add the toleration to the Istio installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    ztunnel:
      tolerations:
        - operator: Exists
```

**Resource pressure**: If the node does not have enough resources, ztunnel might be evicted or unable to schedule:

```bash
kubectl describe node problem-node | grep -A 10 "Allocated resources"
```

## CNI Agent Issues

The Istio CNI agent is responsible for setting up traffic redirection for pods. If it is failing on a specific node:

```bash
# Check CNI agent pod on the problematic node
CNI_POD=$(kubectl get pods -n istio-system -l k8s-app=istio-cni-node \
  --field-selector spec.nodeName=problem-node -o jsonpath='{.items[0].metadata.name}')

# Check logs
kubectl logs -n istio-system $CNI_POD

# Look for specific errors
kubectl logs -n istio-system $CNI_POD | grep -i "error\|fail\|panic"
```

### CNI Binary Missing

The CNI agent installs the istio-cni binary into the node's CNI bin directory. If this fails:

```bash
# Verify the binary exists
kubectl debug node/problem-node -it --image=nicolaka/netshoot -- \
  ls -la /host/opt/cni/bin/istio-cni
```

If the binary is missing, the CNI agent might not have permission to write to the directory. Check the agent's volume mounts:

```bash
kubectl get pod $CNI_POD -n istio-system -o yaml | grep -A 10 volumeMounts
```

### CNI Configuration Not Written

The CNI agent also writes its configuration file. Verify:

```bash
kubectl debug node/problem-node -it --image=nicolaka/netshoot -- \
  ls -la /host/etc/cni/net.d/
```

The Istio CNI config should be present as part of a conflist file or as a separate config file.

## Kernel Module Compatibility

Ambient mode uses Linux traffic interception and routing features that may not be available on custom, minimal, or older node kernels:

```bash
# Check kernel version
kubectl debug node/problem-node -it --image=nicolaka/netshoot -- uname -r

# Check for common modules used by the default iptables backend
kubectl debug node/problem-node -it --image=nicolaka/netshoot -- \
  grep -E 'xt_connmark|xt_mark|ip_set|iptable_nat' /host/proc/modules
```

Istio's default traffic redirection backend is `iptables`, which requires kernel support for modules such as `xt_connmark`, `xt_mark`, and `ip_set` in ambient mode. Istio also supports an `nftables` backend, which requires the `nft` CLI and Linux kernel 5.13 or later. If required modules are unavailable or cannot be loaded, you might see errors in the CNI agent or ztunnel logs about missing kernel capabilities.

## iptables Version Conflicts

Some nodes might use iptables-legacy while others use iptables-nft. This can cause issues if the Istio CNI agent uses a different userspace backend than the node:

```bash
# Check which iptables backend is in use
kubectl debug node/problem-node -it --image=nicolaka/netshoot -- \
  iptables --version

# Check if nftables is being used
kubectl debug node/problem-node -it --image=nicolaka/netshoot -- \
  nft list ruleset 2>/dev/null | head -20
```

If you want Istio to use native nftables instead of the default iptables backend, enable the native nftables setting and make sure the node meets the nftables requirements:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      nativeNftables: true
```

In current Istio releases, the default backend is `iptables`; `nftables` is also supported when the node meets the nftables requirements.

## Node Memory Pressure

When a node is under memory pressure, ztunnel or the CNI agent might get OOMKilled:

```bash
# Check node conditions
kubectl describe node problem-node | grep -A 5 Conditions

# Check for OOMKilled ztunnel pods
ZTUNNEL_POD=$(kubectl get pods -n istio-system -l app=ztunnel \
  --field-selector spec.nodeName=problem-node -o jsonpath='{.items[0].metadata.name}')
kubectl describe pod -n istio-system "$ZTUNNEL_POD" | grep -A 5 "Last State"
```

Confirm that ztunnel and the CNI agent are running with the critical priority class:

```bash
CNI_POD=$(kubectl get pods -n istio-system -l k8s-app=istio-cni-node \
  --field-selector spec.nodeName=problem-node -o jsonpath='{.items[0].metadata.name}')
kubectl get pod -n istio-system "$ZTUNNEL_POD" -o jsonpath='{.spec.priorityClassName}{"\n"}'
kubectl get pod -n istio-system "$CNI_POD" -o jsonpath='{.spec.priorityClassName}{"\n"}'
```

Current Istio charts set `system-node-critical` for ztunnel and the CNI DaemonSet. It is the highest built-in priority class. It helps critical DaemonSet pods schedule and makes them less likely to be evicted, but it does not prevent all evictions.

## Disk Pressure Issues

ztunnel and the CNI agent write logs and sometimes temporary files. If the node's disk is full:

```bash
kubectl describe node problem-node | grep DiskPressure
```

Check disk usage:

```bash
kubectl debug node/problem-node -it --image=nicolaka/netshoot -- df -h /host
```

Clean up disk space or rotate logs. You can also reduce ztunnel's log volume:

```bash
istioctl ztunnel-config log ztunnel-xxxxx.istio-system --level warn
```

## Clock Skew

mTLS certificate validation depends on accurate system time. If a node's clock is skewed, ztunnel will reject certificates as expired or not-yet-valid:

```bash
# Check node time
kubectl debug node/problem-node -it --image=nicolaka/netshoot -- date

# Compare with another node
kubectl debug node/healthy-node -it --image=nicolaka/netshoot -- date
```

If the times differ significantly, fix NTP on the problematic node. Clock skew of more than a few minutes will cause mTLS failures.

## Draining a Problematic Node

If a node has persistent issues and you need to move workloads:

```bash
# Cordon the node to prevent new scheduling
kubectl cordon problem-node

# Drain existing workloads
kubectl drain problem-node --ignore-daemonsets --delete-emptydir-data --timeout=120s
```

The `--ignore-daemonsets` flag is important because ztunnel and the CNI agent are DaemonSets and should stay on the node for other potential workloads.

After fixing the node:

```bash
# Uncordon to allow scheduling again
kubectl uncordon problem-node

# Verify ztunnel is healthy
kubectl get pods -n istio-system -l app=ztunnel --field-selector spec.nodeName=problem-node
```

## Node-Specific Debugging Checklist

When investigating node-level issues, work through this list:

```bash
# 1. Node status and conditions
kubectl describe node problem-node | head -50

# 2. ztunnel pod status on this node
kubectl get pods -n istio-system -l app=ztunnel --field-selector spec.nodeName=problem-node

# 3. CNI agent pod status
kubectl get pods -n istio-system -l k8s-app=istio-cni-node --field-selector spec.nodeName=problem-node

# 4. Resource availability
kubectl top node problem-node

# 5. Recent events on the node
kubectl get events --field-selector involvedObject.name=problem-node --sort-by='.lastTimestamp'

# 6. ztunnel logs (if running)
ZTUNNEL_POD=$(kubectl get pods -n istio-system -l app=ztunnel \
  --field-selector spec.nodeName=problem-node -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n istio-system "$ZTUNNEL_POD" --tail=50

# 7. CNI agent logs (if running)
CNI_POD=$(kubectl get pods -n istio-system -l k8s-app=istio-cni-node \
  --field-selector spec.nodeName=problem-node -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n istio-system "$CNI_POD" --tail=50
```

Node-level issues in ambient mode are usually caused by resource constraints, CNI conflicts, or kernel compatibility problems. The good news is that they are isolated to a single node, so your mesh continues working on other nodes while you troubleshoot.
