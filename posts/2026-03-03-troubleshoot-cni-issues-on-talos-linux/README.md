# How to Troubleshoot CNI Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CNI, Kubernetes, Troubleshooting, Networking

Description: A comprehensive guide to diagnosing and fixing Container Network Interface issues on Talos Linux Kubernetes clusters.

---

When pod networking breaks in Kubernetes, the symptoms can range from obvious (pods stuck in ContainerCreating) to subtle (intermittent connectivity failures between services). Since the Container Network Interface plugin is responsible for setting up and managing all pod networking, CNI issues affect everything. On Talos Linux, troubleshooting is different from traditional Linux because you cannot SSH into nodes or install debugging tools. You work through talosctl, kubectl, and the tools available inside pods.

This guide covers the most common CNI problems on Talos Linux and how to systematically diagnose and fix them.

## Common Symptoms of CNI Issues

Before diving into specific problems, here are the typical signs that your CNI is having trouble:

- Pods stuck in ContainerCreating or Init states
- Pods running but unable to communicate with each other
- DNS resolution failures inside pods
- Services returning connection refused or timeout errors
- Nodes showing as NotReady
- Events showing "network plugin is not ready" or "CNI plugin not initialized"

## Step 1: Check Node Status

Start with the big picture. Are all nodes healthy?

```bash
# Check node status
kubectl get nodes -o wide

# Look for NotReady nodes
kubectl get nodes | grep NotReady

# If a node is NotReady, check its conditions
kubectl describe node <node-name> | grep -A 5 Conditions

# Check kubelet logs on the affected node
talosctl -n <node-ip> logs kubelet --tail 100 | grep -i "cni\|network"
```

If nodes show "NetworkReady: False", the CNI plugin is not functioning on those nodes.

## Step 2: Check CNI Pod Status

Whatever CNI you are using (Cilium, Calico, Flannel), it runs as a DaemonSet. Check if the CNI pods are healthy:

```bash
# For Cilium
kubectl get pods -n kube-system -l k8s-app=cilium -o wide
kubectl get pods -n kube-system -l app.kubernetes.io/name=cilium-operator

# For Calico
kubectl get pods -n calico-system -l k8s-app=calico-node -o wide
kubectl get pods -n tigera-operator

# For Flannel
kubectl get pods -n kube-flannel -o wide

# Check for any crashed or restarting pods
kubectl get pods -A | grep -E "CrashLoopBackOff|Error|ImagePullBackOff"
```

If CNI pods are not running or are crash-looping, check their logs:

```bash
# Cilium agent logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=100

# Calico node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=100

# If the pod is restarting, check the previous instance
kubectl logs -n kube-system <pod-name> --previous
```

## Step 3: Verify CNI Configuration

Check that the CNI configuration files are properly installed on the nodes:

```bash
# List CNI configuration files
talosctl -n <node-ip> list /etc/cni/net.d/

# Read the CNI configuration
talosctl -n <node-ip> read /etc/cni/net.d/05-cilium.conflist
# or
talosctl -n <node-ip> read /etc/cni/net.d/10-calico.conflist

# List CNI binary plugins
talosctl -n <node-ip> list /opt/cni/bin/
```

If the configuration files are missing, the CNI plugin did not install correctly. Reinstall or restart the CNI DaemonSet:

```bash
# Restart Cilium
kubectl rollout restart daemonset/cilium -n kube-system

# Restart Calico
kubectl rollout restart daemonset/calico-node -n calico-system
```

## Step 4: Check IP Address Allocation

IPAM (IP Address Management) issues are a common source of CNI problems. If the cluster runs out of pod IPs, new pods cannot be created.

```bash
# For Cilium, check IPAM status
kubectl exec -n kube-system ds/cilium -- cilium status --verbose | grep -A 10 IPAM

# For Calico, check IP pools
calicoctl get ippool -o wide

# Check if any nodes have exhausted their IP allocation
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'

# Check how many IPs are in use per node
kubectl get pods -A -o wide --no-headers | awk '{print $8}' | sort | uniq -c | sort -rn
```

If IP exhaustion is the problem, you can increase the IPAM pool or reduce the block size:

```yaml
# For Calico, adjust the IP pool
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/14  # Larger CIDR = more IPs
  blockSize: 24         # Smaller blocks per node
```

## Step 5: Test Pod-to-Pod Connectivity

Create debug pods to test connectivity systematically:

```bash
# Create test pods on specific nodes
kubectl run debug-node1 --image=busybox:1.36 --restart=Never \
  --overrides='{"spec":{"nodeName":"worker-1"}}' -- sleep 3600
kubectl run debug-node2 --image=busybox:1.36 --restart=Never \
  --overrides='{"spec":{"nodeName":"worker-2"}}' -- sleep 3600

# Wait for pods
kubectl wait --for=condition=Ready pod/debug-node1 pod/debug-node2

# Get IPs
NODE1_POD_IP=$(kubectl get pod debug-node1 -o jsonpath='{.status.podIP}')
NODE2_POD_IP=$(kubectl get pod debug-node2 -o jsonpath='{.status.podIP}')

echo "Pod on node1: $NODE1_POD_IP"
echo "Pod on node2: $NODE2_POD_IP"

# Test same-node connectivity (should always work)
kubectl exec debug-node1 -- ping -c 3 -W 2 $NODE1_POD_IP

# Test cross-node connectivity (tests the CNI overlay)
kubectl exec debug-node1 -- ping -c 3 -W 2 $NODE2_POD_IP

# Test service DNS
kubectl exec debug-node1 -- nslookup kubernetes.default

# Test external connectivity
kubectl exec debug-node1 -- ping -c 3 -W 2 8.8.8.8
kubectl exec debug-node1 -- wget -qO- --timeout=5 http://google.com

# Clean up
kubectl delete pod debug-node1 debug-node2
```

The results tell you where the problem is:

- **Same-node ping fails** - Local CNI setup is broken
- **Cross-node ping fails** - Overlay/routing between nodes is broken
- **DNS fails** - CoreDNS or the pod's DNS configuration is wrong
- **External connectivity fails** - NAT or routing to external networks is broken

## Step 6: Check Overlay Network Health

If cross-node connectivity fails, the overlay network (VXLAN, IPIP, or WireGuard) might be having issues:

```bash
# Check VXLAN interfaces on Talos nodes
talosctl -n <node-ip> get links | grep -i "vxlan\|cilium\|calico\|flannel"

# Check routing tables
talosctl -n <node-ip> routes

# For Cilium, check BPF maps
kubectl exec -n kube-system ds/cilium -- cilium bpf tunnel list

# For Calico, check BGP peering
calicoctl node status
```

Check if the overlay ports are not blocked. VXLAN uses UDP port 4789, Cilium uses port 8472, and WireGuard uses port 51871:

```bash
# Check if the required ports are in use
talosctl -n <node-ip> netstat | grep -E "4789|8472|51871"
```

## Step 7: Check DNS (CoreDNS)

DNS issues often look like CNI issues because pods cannot resolve service names:

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Verify the kube-dns service
kubectl get svc -n kube-system kube-dns

# Test DNS from a pod
kubectl run dns-test --image=busybox:1.36 --rm -it -- nslookup kubernetes.default

# Check the resolv.conf inside a pod
kubectl exec <any-pod> -- cat /etc/resolv.conf
```

The resolv.conf should point to the kube-dns service IP (usually 10.96.0.10).

## Step 8: CNI-Specific Troubleshooting

### Cilium-Specific

```bash
# Full status check
kubectl exec -n kube-system ds/cilium -- cilium status --verbose

# Check endpoint health
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# Check for dropped packets
kubectl exec -n kube-system ds/cilium -- cilium monitor --type drop

# Verify BPF programs are loaded
kubectl exec -n kube-system ds/cilium -- cilium bpf endpoint list

# Run Cilium connectivity test
cilium connectivity test
```

### Calico-Specific

```bash
# Node status
calicoctl node status

# Check workload endpoints
calicoctl get workloadendpoint -A

# Check IP pool utilization
calicoctl ipam show

# Check for blocked traffic
calicoctl get networkpolicy -A

# Verify Felix status
kubectl exec -n calico-system ds/calico-node -- calico-node -felix-live
```

## Step 9: Nuclear Options

If nothing else works and you need to restore networking quickly:

```bash
# Restart all CNI pods (rolling restart)
kubectl rollout restart daemonset/cilium -n kube-system

# If that does not help, delete and reinstall the CNI
# WARNING: This will temporarily break all pod networking

# For Cilium
helm uninstall cilium -n kube-system
# Wait for cleanup
helm install cilium cilium/cilium --namespace kube-system [your-values]

# Restart all pods to get fresh network setup
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}' | \
  while read ns pod; do
    kubectl delete pod $pod -n $ns --grace-period=30
  done
```

## Preventive Measures

Monitor your CNI health continuously. Set up alerts for:

- CNI pods in CrashLoopBackOff
- Nodes with NetworkReady: False
- IP pool utilization above 80%
- Packet drop rates

Keep your CNI version up to date and test upgrades in staging before production. Document your CNI configuration so you can quickly reinstall if needed.

## Summary

Troubleshooting CNI issues on Talos Linux follows a systematic approach: check node status, verify CNI pods, inspect configuration, test connectivity layer by layer, and use CNI-specific tools for deep diagnosis. The immutable nature of Talos means you rely on talosctl and kubectl for all investigation. Most CNI problems come down to configuration errors, IP exhaustion, overlay network issues, or DNS failures. With the right diagnostic steps, you can identify and fix the root cause efficiently.
