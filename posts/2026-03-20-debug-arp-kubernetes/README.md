# How to Debug ARP Issues in Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, Kubernetes, Container, Troubleshooting

Description: Learn how to diagnose and fix ARP-related networking issues in Kubernetes clusters including ARP cache overflow, flannel/Calico ARP behavior, and duplicate IP issues.

## Common ARP Issues in Kubernetes

1. **ARP cache overflow** on nodes with many pods
2. **Duplicate IP detection failures** after pod restarts
3. **ARP flux** on multi-interface nodes
4. **Stale ARP entries** causing connectivity loss after pod migration
5. **CNI plugin ARP misconfiguration** (Calico, Flannel, Cilium)

## Checking ARP Cache Health on a Node

```bash
# SSH to the node

# Check ARP table size
ip neigh show | wc -l

# Check for FAILED entries (pods that disappeared without ARP cleanup)
ip neigh show nud failed

# Check ARP cache limits
sysctl net.ipv4.neigh.default.gc_thresh1
sysctl net.ipv4.neigh.default.gc_thresh2
sysctl net.ipv4.neigh.default.gc_thresh3
```

## ARP Cache Overflow in Large Clusters

In clusters with many pods per node, the default ARP cache limits may be too low:

```bash
# Symptom: "neighbor table overflow" in kernel logs
dmesg | grep "neighbor table"

# Fix: increase gc_thresh values
# This should typically be done via a DaemonSet
sysctl -w net.ipv4.neigh.default.gc_thresh1=80000
sysctl -w net.ipv4.neigh.default.gc_thresh2=90000
sysctl -w net.ipv4.neigh.default.gc_thresh3=100000
```

### DaemonSet to Tune ARP on All Nodes

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: arp-tuner
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: arp-tuner
  template:
    metadata:
      labels:
        app: arp-tuner
    spec:
      hostNetwork: true
      hostPID: true
      initContainers:
      - name: tuner
        image: busybox
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          sysctl -w net.ipv4.neigh.default.gc_thresh1=80000
          sysctl -w net.ipv4.neigh.default.gc_thresh2=90000
          sysctl -w net.ipv4.neigh.default.gc_thresh3=100000
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
```

## Debugging ARP for a Specific Pod

```bash
# Get the pod's IP
kubectl get pod my-pod -n default -o jsonpath='{.status.podIP}'

# On the node hosting the pod, check ARP entry
NODE=$(kubectl get pod my-pod -n default -o jsonpath='{.spec.nodeName}')
ssh $NODE "ip neigh show | grep POD_IP"

# Use kubectl exec to check ARP from inside the pod
kubectl exec -it my-pod -- sh -c "ip neigh show" 2>/dev/null || \
kubectl exec -it my-pod -- arp -n
```

## Fixing Stale ARP After Pod Migration

When a pod moves to a different node, the old IP-MAC mapping may be cached on other pods:

```bash
# Flush ARP cache on a node
ip neigh flush all

# Or flush for a specific IP
ip neigh del POD_IP dev eth0
```

Many CNI plugins (like Calico) automatically send gratuitous ARPs when pods start to update neighbor caches.

## Checking CNI Plugin ARP Behavior

### Flannel (VXLAN mode)

```bash
# Check VXLAN FDB entries (Flannel's MAC learning)
bridge fdb show dev flannel.1

# Check ARP suppression
ip -d link show flannel.1 | grep -i nolearning
```

### Calico

```bash
# Calico uses ARP proxy on the host for pod traffic
cat /proc/sys/net/ipv4/conf/cali*/proxy_arp

# Calico should have proxy_arp=1 on calixxx interfaces
```

### Cilium

```bash
# Cilium manages ARP at BPF level
cilium status | grep ARP
```

## ARP Flux on Kubernetes Nodes

Kubernetes nodes with multiple interfaces (management + data) can experience ARP flux:

```bash
# Apply recommended settings (many Kubernetes docs suggest this)
sysctl -w net.ipv4.conf.all.arp_ignore=1
sysctl -w net.ipv4.conf.all.arp_announce=2
```

## Key Takeaways

- Kubernetes nodes with many pods can overflow default ARP cache limits (`gc_thresh`).
- Use a privileged DaemonSet to tune ARP parameters on all nodes.
- CNI plugins like Calico use proxy ARP on `cali*` interfaces to handle pod ARP.
- Flush ARP caches after pod migrations to clear stale IP-MAC mappings.

**Related Reading:**

- [How to Set ARP Cache Timeouts on Linux](https://oneuptime.com/blog/post/2026-03-20-set-arp-cache-timeouts-linux/view)
- [How to Understand ARP Flux on Multi-Homed Linux Hosts](https://oneuptime.com/blog/post/2026-03-20-arp-flux-multi-homed-linux/view)
- [How to Clear the ARP Cache](https://oneuptime.com/blog/post/2026-03-20-clear-arp-cache-linux/view)
