# How to Configure Calico eBPF Mode on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Calico, EBPF, Kubernetes, Networking Performance

Description: Learn how to enable and configure Calico's eBPF data plane on Talos Linux for improved networking performance and lower overhead.

---

Calico traditionally uses iptables for packet processing in Kubernetes. While iptables is battle-tested and works well, it has limitations at scale. As the number of services and network policies grows, iptables rules multiply and performance degrades. Calico's eBPF data plane replaces iptables with eBPF programs that run directly in the Linux kernel, providing better performance, lower latency, and the ability to replace kube-proxy entirely. On Talos Linux, enabling eBPF mode requires specific configuration steps.

## Why eBPF Mode

The eBPF data plane offers several advantages over the traditional iptables mode:

- **Better performance** - eBPF processes packets more efficiently, especially with many services
- **Lower CPU usage** - No need to traverse long iptables chains
- **Replaces kube-proxy** - Handles service routing natively, eliminating one more component
- **Direct server return (DSR)** - For LoadBalancer services, return traffic goes directly from the pod to the client, bypassing the load balancer node
- **Better observability** - eBPF programs can expose detailed metrics about packet processing

The tradeoff is that eBPF mode requires a relatively recent kernel (5.3+), which Talos Linux provides.

## Prerequisites

- Talos Linux cluster (version 1.5+ recommended, ships with kernel 5.15+)
- Calico installed via the Tigera operator
- A ConfigMap-based or Kubernetes API datastore (not etcdv3 directly)

## Step 1: Prepare Talos Linux

First, disable kube-proxy since Calico eBPF mode replaces it. Update your Talos machine configuration:

```yaml
# talos-ebpf-patch.yaml
cluster:
  proxy:
    # Disable kube-proxy - Calico eBPF will handle service routing
    disabled: true
```

Apply to all nodes:

```bash
# Apply to control plane nodes
talosctl apply-config --nodes 192.168.1.10 --patch @talos-ebpf-patch.yaml
talosctl apply-config --nodes 192.168.1.11 --patch @talos-ebpf-patch.yaml
talosctl apply-config --nodes 192.168.1.12 --patch @talos-ebpf-patch.yaml

# Apply to worker nodes
talosctl apply-config --nodes 192.168.1.20 --patch @talos-ebpf-patch.yaml
talosctl apply-config --nodes 192.168.1.21 --patch @talos-ebpf-patch.yaml
```

If kube-proxy is already running, remove it:

```bash
# Delete the kube-proxy DaemonSet
kubectl delete daemonset kube-proxy -n kube-system

# Clean up kube-proxy's iptables rules
# Calico will handle this during eBPF enablement
```

## Step 2: Configure the Kubernetes API Server Address

Calico eBPF mode needs to connect directly to the Kubernetes API server because it cannot rely on kube-proxy for service resolution during bootstrapping. Create a ConfigMap with the API server address:

```yaml
# kubernetes-services-endpoint.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubernetes-services-endpoint
  namespace: tigera-operator
data:
  # Use the actual API server address, not the service IP
  KUBERNETES_SERVICE_HOST: "192.168.1.10"
  KUBERNETES_SERVICE_PORT: "6443"
```

For high availability, you can use a load balancer VIP that fronts all your API servers:

```yaml
data:
  KUBERNETES_SERVICE_HOST: "192.168.1.100"  # VIP or LB address
  KUBERNETES_SERVICE_PORT: "6443"
```

On Talos Linux, the API server is accessible through the local Talos proxy at `localhost:7445`. However, for Calico eBPF, using the direct node IP is more reliable:

```bash
kubectl apply -f kubernetes-services-endpoint.yaml
```

## Step 3: Enable eBPF Data Plane

Update the Calico Installation resource to enable eBPF:

```yaml
# calico-ebpf-installation.yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.244.0.0/16
      encapsulation: None
      natOutgoing: Enabled
      nodeSelector: all()
    # Switch to eBPF data plane
    linuxDataplane: BPF
  flexVolumePath: /var/lib/kubelet/volumeplugins
  nodeMetricsPort: 9091
```

Apply the updated installation:

```bash
kubectl apply -f calico-ebpf-installation.yaml

# Watch calico-node pods restart with eBPF mode
kubectl get pods -n calico-system -w

# Wait for all pods to be running
kubectl wait --for=condition=Ready pods -l k8s-app=calico-node -n calico-system --timeout=300s
```

## Step 4: Verify eBPF Mode

Confirm that Calico is running in eBPF mode:

```bash
# Check the calico-node logs for eBPF initialization
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -i "bpf\|ebpf"

# You should see messages about BPF programs being loaded

# Verify eBPF mode through calicoctl
calicoctl node status
```

Check that eBPF programs are loaded on a node:

```bash
# List BPF programs through Calico
kubectl exec -n calico-system ds/calico-node -- calico-node -bpf show

# Or check directly on the node via talosctl
talosctl -n 192.168.1.20 read /proc/net/netfilter/nf_conntrack_count
```

## Step 5: Test Networking

Verify basic connectivity:

```bash
# Create test pods
kubectl run test-a --image=busybox:1.36 --restart=Never -- sleep 3600
kubectl run test-b --image=nginx:alpine --restart=Never

kubectl wait --for=condition=Ready pod/test-a pod/test-b

# Test pod-to-pod connectivity
TESTB_IP=$(kubectl get pod test-b -o jsonpath='{.status.podIP}')
kubectl exec test-a -- wget -qO- http://$TESTB_IP

# Test service connectivity
kubectl expose pod test-b --port=80 --name=test-svc
kubectl exec test-a -- wget -qO- http://test-svc

# Test DNS
kubectl exec test-a -- nslookup kubernetes.default

# Clean up
kubectl delete pod test-a test-b
kubectl delete svc test-svc
```

## Step 6: Enable Direct Server Return

DSR is one of the best features of eBPF mode. It allows return traffic from LoadBalancer services to go directly from the backend pod to the client, bypassing the node that received the initial request. This reduces latency and network hops.

```yaml
# Update the FelixConfiguration for DSR
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: true
  bpfExternalServiceMode: DSR
  bpfLogLevel: ""
  bpfKubeProxyIptablesCleanupEnabled: true
```

```bash
# Apply the configuration
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: true
  bpfExternalServiceMode: DSR
  bpfKubeProxyIptablesCleanupEnabled: true
EOF
```

## Performance Tuning

For optimal eBPF performance on Talos Linux:

```yaml
# Talos machine config for eBPF performance
machine:
  sysctls:
    # Increase BPF JIT memory limit
    net.core.bpf_jit_limit: "528482304"
    # Enable BPF JIT
    net.core.bpf_jit_enable: "1"
```

Check BPF program performance:

```bash
# View loaded BPF programs and their runtime
kubectl exec -n calico-system ds/calico-node -- \
  bpftool prog show | head -40

# Check conntrack table size
kubectl exec -n calico-system ds/calico-node -- \
  calico-node -bpf conntrack dump | wc -l
```

## Monitoring eBPF Mode

Calico exposes eBPF-specific metrics through Prometheus:

```promql
# BPF program execution count
felix_bpf_prog_run_count

# BPF program execution time
felix_bpf_prog_run_time_seconds

# BPF map operations
felix_bpf_map_update_count
felix_bpf_map_delete_count

# Conntrack table entries
felix_bpf_conntrack_entries
```

## Troubleshooting

If eBPF mode is not working:

```bash
# Check Felix logs for errors
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=100 | grep -i "error\|bpf\|ebpf"

# Verify BPF filesystem is mounted
talosctl -n 192.168.1.20 list /sys/fs/bpf/

# Check kernel BPF support
talosctl -n 192.168.1.20 read /proc/config.gz | gunzip | grep BPF

# Verify no leftover kube-proxy rules
kubectl exec -n calico-system ds/calico-node -- iptables-save | grep KUBE | wc -l
# Should be 0 or very low
```

Common issues:

- **Missing kernel support** - Ensure Talos Linux kernel has CONFIG_BPF_JIT and CONFIG_BPF_SYSCALL enabled
- **kube-proxy still running** - Make sure kube-proxy is disabled and its DaemonSet deleted
- **API server connectivity** - The kubernetes-services-endpoint ConfigMap must have the correct address
- **Encapsulation mode** - eBPF mode works best with no encapsulation or VXLAN; IPIP may have limitations

## Reverting to iptables Mode

If you need to revert to iptables mode:

```yaml
# Switch back to iptables
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    linuxDataplane: Iptables
```

Remember to re-enable kube-proxy if you switch back.

## Summary

Calico's eBPF data plane on Talos Linux delivers better networking performance by replacing iptables with kernel-level eBPF programs. The setup involves disabling kube-proxy, configuring the API server endpoint, and switching the data plane mode in the Calico Installation resource. Once running, you get faster packet processing, lower latency, and features like Direct Server Return. Combined with Talos Linux's modern kernel, Calico eBPF mode is a strong choice for performance-sensitive Kubernetes deployments.
