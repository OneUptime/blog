# How to Configure Istio for eBPF-Based Data Plane

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, eBPF, Data Plane, Kubernetes, Networking, Service Mesh

Description: How to configure Istio to use eBPF for traffic redirection instead of iptables, reducing overhead and improving data plane performance.

---

Istio sidecar mode traditionally uses iptables rules to intercept and redirect traffic to the Envoy sidecar proxy. Istio CNI can move the privileged setup work out of each application pod, but in current Istio releases it still configures iptables rules for sidecar traffic redirection. eBPF (extended Berkeley Packet Filter) is commonly used by Kubernetes CNIs such as Cilium for the cluster networking data plane, offering efficient load balancing, policy, and routing in the Linux kernel.

Here is how to run Istio with an eBPF-based CNI data plane without breaking Istio's supported traffic redirection model.

## Why eBPF Instead of iptables

iptables works by creating a chain of rules in the netfilter framework. Every packet traverses these chains, and for Istio, the NAT table rules redirect traffic to the Envoy proxy. The problems with this approach become visible at scale:

- Each iptables rule evaluation adds latency
- Rule chains grow linearly with the number of exclusions
- Debugging iptables rules is painful
- iptables can cause issues with other components that modify rules

eBPF programs run directly in the kernel and can make routing decisions more efficiently. For Istio, the important distinction is that eBPF can power the underlying Kubernetes CNI data plane, while Istio still owns mesh traffic capture to the sidecar proxy or ztunnel.

## Option 1: Istio CNI Traffic Redirection

Istio's CNI plugin is the most integrated way to configure Istio traffic redirection without requiring each application pod to run a privileged `istio-init` container. In current Istio sidecar mode, the CNI plugin configures iptables in the pod network namespace; it does not switch sidecar interception to eBPF.

Install Istio with the CNI plugin:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cni
spec:
  profile: default
  components:
    cni:
      enabled: true
```

```bash
istioctl install -f istio-cni.yaml -y
```

Verify the CNI plugin is running:

```bash
kubectl get pods -n istio-system -l k8s-app=istio-cni-node
```

Check that Istio redirection rules are present in an injected pod:

```bash
kubectl debug my-pod -it --image=gcr.io/istio-release/base --profile=netadmin -- iptables-save | grep ISTIO
```

## Option 2: Istio Ambient Mesh

Istio's ambient mesh mode uses ztunnel for L4 traffic processing. Current ambient mesh uses in-pod redirection managed by the Istio CNI node agent; older Istio ambient documentation described an experimental eBPF redirection mode, but that approach is historical and is no longer needed.

```bash
# Install Istio with ambient profile
istioctl install --set profile=ambient -y

# Enable ambient mode for a namespace
kubectl label namespace production istio.io/dataplane-mode=ambient
```

In ambient mode, Istio CNI configures traffic from application pods to the ztunnel running on the same node:

```bash
# Verify ambient mode is active
kubectl get namespace production --show-labels | grep dataplane-mode

# Check ztunnel pods
kubectl get pods -n istio-system -l app=ztunnel
```

The ambient redirection handles:
- Redirecting outbound traffic from pods to ztunnel
- Redirecting inbound traffic from ztunnel to pods
- Keeping the capture inside the pod network namespace for compatibility with primary CNIs

## Option 3: Using Cilium CNI with Istio

Cilium is a CNI plugin built on eBPF. You can use Cilium's eBPF data plane alongside Istio, where Cilium handles L3/L4 networking and Istio handles L7 traffic management.

Install Cilium with Istio-compatible settings:

```bash
# Install Cilium
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=false \
  --set cni.exclusive=false
```

If you run Cilium as a full kube-proxy replacement, also restrict socket load balancing to the host namespace so it does not interfere with Istio proxying:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set socketLB.hostNamespaceOnly=true \
  --set cni.exclusive=false
```

Then install Istio normally. For sidecar mode with Istio CNI:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    cni:
      enabled: true
```

When using Cilium with Istio, Cilium's eBPF programs handle the Kubernetes networking data plane. Istio still handles mesh traffic capture and proxying through Istio CNI, sidecar injection, ztunnel, and Envoy.

## Verifying eBPF CNI and Istio Traffic Redirection

After setup, verify both layers separately:

```bash
# Check Istio redirection rules in a workload pod
kubectl debug my-pod -it --image=gcr.io/istio-release/base --profile=netadmin -- iptables-save | grep ISTIO

# Check Cilium status
kubectl exec -n kube-system ds/cilium -- cilium-dbg status

# Check Cilium BPF maps
kubectl exec -n kube-system ds/cilium -- cilium-dbg map list 2>/dev/null
```

## Performance Comparison: eBPF vs iptables

Measure the difference in your environment:

```bash
# Start a temporary Fortio client
kubectl run fortio --image=fortio/fortio --restart=Never -- fortio server -http-port 8080

# Run a latency test
kubectl exec fortio -- fortio load \
  -c 50 -qps 5000 -t 60s \
  http://my-service:8080/health

# Record the P50, P99, and P99.9 latencies
```

Expected improvements from Cilium's eBPF data plane depend on which Cilium features you enable and on your workload:

- Lower Kubernetes service load-balancing overhead when using kube-proxy replacement
- Lower CPU usage on nodes with many pods
- More predictable latency under high load

The improvements are most noticeable in clusters with many pods per node and high-traffic services, but you should benchmark your own mesh because Istio's proxy path still contributes to request latency.

## eBPF Kernel Requirements

eBPF requires a relatively recent Linux kernel. Check your node's kernel version:

```bash
kubectl get nodes -o json | \
  jq '.items[] | {name: .metadata.name, kernel: .status.nodeInfo.kernelVersion}'
```

Minimum kernel versions:
- Cilium system requirement: Linux kernel 5.10+ or a distribution-supported equivalent
- Recommended kernel for modern Cilium features: 5.10+
- Some kube-proxy replacement and socket load-balancing features may require newer kernels

If your nodes run older kernels, you will need to stick with a CNI mode and Istio configuration supported by your platform.

## Configuring eBPF Program Behavior

When using Cilium with Istio, you can tune the eBPF program behavior:

```yaml
# Cilium ConfigMap tuning
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  # Enable socket-level load balancing
  bpf-lb-sock-hostns-only: "true"
  # Enable BPF-based masquerading
  enable-bpf-masquerade: "false"
  # Set BPF map size
  bpf-map-dynamic-size-ratio: "0.0025"
  # Enable host routing via BPF
  enable-host-legacy-routing: "false"
```

## Monitoring eBPF Programs

Monitor the health and performance of eBPF programs:

```bash
# Check eBPF program performance metrics (on the node)
# Requires bpftool
bpftool prog show

# Check for eBPF errors in system logs
journalctl -k | grep -i "bpf\|ebpf"

# Monitor Cilium eBPF metrics (if using Cilium)
kubectl exec -n kube-system ds/cilium -- cilium-dbg bpf metrics list
```

Enable Cilium Prometheus metrics and let the Cilium Helm chart create the ServiceMonitor resources:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --set prometheus.enabled=true \
  --set prometheus.serviceMonitor.enabled=true \
  --set operator.prometheus.enabled=true \
  --set operator.prometheus.serviceMonitor.enabled=true
```

## Troubleshooting eBPF Issues

Common issues and solutions:

### Traffic Not Being Intercepted

```bash
# Check Istio ambient redirection logs
kubectl logs ds/ztunnel -n istio-system | grep inpod

# Check CNI plugin logs
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=50
```

### Performance Worse Than Expected

```bash
# Check for BPF map memory pressure
kubectl exec -n kube-system ds/cilium -- cilium-dbg map list 2>/dev/null

# Verify socket-level interception is active
kubectl get configmap -n kube-system cilium-config -o yaml | grep bpf-lb-sock-hostns
```

### Kernel Compatibility Issues

```bash
# Check if required BPF features are available
kubectl debug node/my-node -it --image=ubuntu -- \
  cat /proc/sys/net/core/bpf_jit_enable
# Should be 1
```

## When to Use eBPF vs iptables

Choose an eBPF CNI data plane when:
- Your nodes run kernel 5.10+ or a distribution-supported equivalent
- You have high-traffic services where latency matters
- You run many pods per node
- You want Cilium features such as eBPF service load balancing, policy, and observability

Stick with the default Istio and CNI behavior when:
- Your nodes run older kernels
- You need maximum compatibility with all Kubernetes distributions
- Your traffic volume is low enough that iptables overhead is negligible
- You are running managed Kubernetes where you do not control the node OS

eBPF-based Kubernetes networking can pair well with Istio, especially with Cilium, but it is not a drop-in replacement for Istio's supported traffic capture. Keep Istio's redirection model enabled, configure Cilium so it does not interfere with Istio proxying, and benchmark the result in your own environment.
