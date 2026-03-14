# How to Configure Istio with Cilium CNI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Cilium, CNI, Kubernetes, EBPF

Description: A hands-on guide to running Istio service mesh on top of Cilium CNI with eBPF including configuration options, compatibility notes, and optimization tips.

---

Cilium is a CNI plugin built on eBPF that provides high-performance networking, observability, and security for Kubernetes. Running Istio on top of Cilium is a popular combination because it pairs Cilium's efficient kernel-level networking with Istio's rich Layer 7 traffic management. But the two projects have overlapping features, and configuring them to play nicely together requires some specific settings.

## Understanding the Overlap

Both Cilium and Istio provide:

- **Network policy enforcement**: Cilium at L3/L4/L7, Istio at L7
- **Observability**: Cilium via Hubble, Istio via Envoy metrics
- **Encryption**: Cilium via WireGuard or IPsec, Istio via mTLS
- **Load balancing**: Cilium at kernel level, Istio at proxy level

The recommended approach is to let Cilium handle the CNI basics (IP management, routing, kernel-level policy) and let Istio handle application-layer concerns (HTTP routing, mTLS identity, fine-grained auth policies, traffic shaping).

## Prerequisites

```bash
# Check Cilium version and status
cilium status
cilium version

# Verify Cilium is healthy
kubectl get pods -n kube-system -l k8s-app=cilium

# Check Cilium configuration
kubectl get configmap cilium-config -n kube-system -o yaml | head -50
```

## Configuring Cilium for Istio Compatibility

There are a few Cilium settings that need to be configured for proper Istio operation.

### Disable Cilium's kube-proxy Replacement for Istio Ports

Cilium can replace kube-proxy, but it needs to be configured to not interfere with Istio's traffic interception:

```yaml
# Cilium Helm values for Istio compatibility
socketLB:
  hostNamespaceOnly: true
```

Or if installing Cilium via Helm:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --set socketLB.hostNamespaceOnly=true
```

This ensures Cilium's socket-level load balancing does not bypass Istio's sidecar proxies for pod-to-pod traffic.

### Configure Cilium CNI Chaining

If you want to use both Cilium and the Istio CNI plugin, configure CNI chaining:

```yaml
# Cilium ConfigMap
cni-chaining-mode: "generic-veth"
custom-cni-conf: "false"
enable-endpoint-routes: "true"
```

### Disable Conflicting Features

If you are using Istio for mTLS, disable Cilium's encryption to avoid double encryption:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --set encryption.enabled=false
```

## Installing Istio on Cilium

### Option 1: Standard Installation (Init Container)

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: "10m"
            memory: "64Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
```

```bash
istioctl install -f istio-cilium.yaml -y
```

### Option 2: Using Istio CNI Plugin

When using the Istio CNI plugin with Cilium, you need to make sure the two CNI configs chain properly:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
        - istio-system
        - kube-system
      chained: true
      cniBinDir: /opt/cni/bin
      cniConfDir: /etc/cni/net.d
```

Verify the CNI chain after installation:

```bash
# Check the CNI configuration on a node
kubectl debug node/<node-name> -it --image=busybox -- cat /host/etc/cni/net.d/05-cilium.conflist

# Verify Istio CNI pods are running
kubectl get pods -n istio-system -l k8s-app=istio-cni-node
```

## Network Policy Configuration

Cilium's CiliumNetworkPolicy resources provide more features than standard Kubernetes NetworkPolicy. Use them to allow Istio traffic:

### Allow istiod Communication

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-istiod
  namespace: istio-system
spec:
  endpointSelector:
    matchLabels:
      app: istiod
  ingress:
    - fromEndpoints:
        - {}
      toPorts:
        - ports:
            - port: "15010"
              protocol: TCP
            - port: "15012"
              protocol: TCP
            - port: "15014"
              protocol: TCP
            - port: "15017"
              protocol: TCP
  egress:
    - toEndpoints:
        - {}
```

### Allow Sidecar-to-Control-Plane Traffic

```yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: allow-istio-control-plane
spec:
  endpointSelector: {}
  egress:
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: istio-system
            app: istiod
      toPorts:
        - ports:
            - port: "15012"
              protocol: TCP
```

### Allow Mesh Traffic Between Pods

```yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: allow-mesh-traffic
spec:
  endpointSelector:
    matchLabels:
      security.istio.io/tlsMode: istio
  ingress:
    - fromEndpoints:
        - matchLabels:
            security.istio.io/tlsMode: istio
  egress:
    - toEndpoints:
        - matchLabels:
            security.istio.io/tlsMode: istio
```

## Using Cilium's Hubble with Istio

Hubble provides network-level observability that complements Istio's application-level observability:

```bash
# Install Hubble
cilium hubble enable --ui

# View traffic flows including Istio mTLS traffic
hubble observe --namespace default

# Filter for specific services
hubble observe --to-label app=my-service

# Check for dropped traffic (might indicate policy issues)
hubble observe --verdict DROPPED
```

Hubble shows you the L3/L4 view while Istio's telemetry shows the L7 view. Together they give you complete visibility.

## Handling Cilium's BPF Host Routing

When Cilium uses BPF host routing (which is common for performance), it can affect how Istio's iptables rules work. Verify that the two are compatible:

```bash
# Check if Cilium is using BPF host routing
kubectl get configmap cilium-config -n kube-system -o jsonpath='{.data.enable-host-reachable-services}'

# Test actual traffic flow
kubectl exec <pod> -c <container> -- curl -s http://<service>:<port>/health
```

If you experience issues with traffic not being intercepted by the sidecar:

```bash
# Check iptables rules are present
kubectl exec <pod> -c istio-proxy -- iptables -t nat -L ISTIO_REDIRECT -n

# Check Cilium's BPF maps
kubectl exec -n kube-system <cilium-pod> -- cilium bpf lb list
```

## Optimizing the Stack

### Use Cilium for L3/L4 Policy, Istio for L7

This gives you the best of both worlds:

```yaml
# Cilium: Namespace-level isolation
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: backend-l4-policy
  namespace: backend
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP

---
# Istio: Path-level access control
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-server-l7-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  rules:
    - from:
        - source:
            namespaces: ["frontend"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/v1/public/*"]
```

### Avoid Double Encryption

If using Istio mTLS, disable Cilium's WireGuard encryption:

```bash
# Check if WireGuard is enabled
kubectl get configmap cilium-config -n kube-system -o jsonpath='{.data.enable-wireguard}'

# Disable it
helm upgrade cilium cilium/cilium --namespace kube-system --set encryption.enabled=false
```

Running both mTLS and WireGuard encrypts every packet twice, adding latency and CPU overhead for no security benefit.

## Troubleshooting

### Issue: Traffic Bypassing Sidecar

```bash
# Check if Cilium's socket LB is intercepting traffic before Istio can
cilium status | grep "KubeProxyReplacement"

# If KubeProxyReplacement is "Strict", verify hostNamespaceOnly is set
kubectl get configmap cilium-config -n kube-system -o jsonpath='{.data.bpf-lb-sock-hostns-only}'
```

### Issue: Pod Startup Failures

```bash
# Check for CNI plugin errors
kubectl describe pod <pod> -n <namespace> | grep -A5 "Events"

# Check Cilium agent logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=50

# Check Istio CNI logs (if using Istio CNI)
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=50
```

### Issue: Network Policy Blocking Istio Traffic

```bash
# Use Hubble to see what is being dropped
hubble observe --verdict DROPPED --to-namespace <namespace>

# Check Cilium endpoint status
kubectl exec -n kube-system <cilium-pod> -- cilium endpoint list
```

The Cilium + Istio combination is powerful but requires careful configuration to avoid conflicts. Take the time to validate each layer independently before combining them, and use Hubble alongside Istio's telemetry for full-stack observability.
