# How to Configure Istio with Flannel CNI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Flannel, CNI, Kubernetes, Networking

Description: A step-by-step guide to deploying and configuring Istio service mesh on Kubernetes clusters using Flannel CNI with practical tips and troubleshooting.

---

Flannel is one of the simplest and most widely used CNI plugins in Kubernetes. It provides a basic overlay network using VXLAN, host-gw, or other backends to give each pod an IP address and enable pod-to-pod communication. Flannel is a great choice for clusters that need straightforward networking without the complexity of more feature-rich CNIs. Running Istio on top of Flannel is straightforward because Flannel stays out of the way and does not interfere with Istio's traffic interception.

## How Flannel and Istio Work Together

Flannel handles one thing well: giving pods IP addresses and enabling basic connectivity between them. It does not implement Kubernetes NetworkPolicy, does not do Layer 7 inspection, and does not manipulate iptables beyond what is needed for the overlay network.

This simplicity is actually an advantage when running Istio. There are fewer moving parts that can conflict with Istio's iptables rules for traffic interception. The architecture looks like this:

```text
Pod A -> iptables (Istio NAT rules) -> Envoy sidecar ->
  Flannel VXLAN overlay ->
  Envoy sidecar -> iptables (Istio NAT rules) -> Pod B
```

## Prerequisites

```bash
# Verify Flannel is running
kubectl get pods -n kube-system -l app=flannel

# Check Flannel configuration
kubectl get configmap kube-flannel-cfg -n kube-system -o yaml

# Verify pod networking is working
kubectl run test-net --image=busybox --restart=Never -- sleep 3600
kubectl exec test-net -- ping -c 3 <another-pod-ip>
kubectl delete pod test-net
```

## Installing Istio on a Flannel Cluster

The standard Istio installation works without any Flannel-specific modifications:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-flannel
spec:
  profile: default
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          hpaSpec:
            minReplicas: 2
            maxReplicas: 10
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
istioctl install -f istio-flannel.yaml -y
```

Verify the installation:

```bash
# Check all Istio components
kubectl get pods -n istio-system

# Verify istiod is healthy
kubectl logs -n istio-system deploy/istiod --tail=20

# Run pre-flight checks
istioctl analyze --all-namespaces
```

## Using Istio CNI Plugin with Flannel

Since Flannel does not enforce NetworkPolicy, the main reason to use the Istio CNI plugin is to avoid requiring `NET_ADMIN` capability on application pods:

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
        - kube-flannel
      chained: true
      cniBinDir: /opt/cni/bin
      cniConfDir: /etc/cni/net.d
```

After installing, verify the CNI chain:

```bash
# Check the CNI plugin configuration
kubectl get pods -n istio-system -l k8s-app=istio-cni-node

# Check logs for any errors
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=20

# Verify a test pod gets proper sidecar injection
kubectl label namespace default istio-injection=enabled
kubectl run test-inject --image=nginx --restart=Never
kubectl get pod test-inject -o jsonpath='{.spec.containers[*].name}'
# Should show: nginx istio-proxy
kubectl delete pod test-inject
```

## Important: NetworkPolicy Limitations

Flannel does not implement Kubernetes NetworkPolicy. This means:

1. If you apply a NetworkPolicy resource, it will be stored in the API server but **not enforced**
2. You cannot use network-level segmentation through Flannel
3. All network-level access control must come from Istio's AuthorizationPolicy

This makes Istio's security features even more important on Flannel clusters:

```yaml
# Since Flannel cannot enforce NetworkPolicy, use Istio's AuthorizationPolicy
# for all access control

# Default deny all traffic in a namespace
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}

---
# Allow specific traffic
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend-api
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

Enforce strict mTLS to ensure all traffic is authenticated:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

## Flannel Backend Considerations

Flannel supports multiple backends that affect network performance. Your choice can impact Istio's latency characteristics.

### VXLAN (Default)

The most common backend. Adds encapsulation overhead of about 50 bytes per packet:

```yaml
# Flannel ConfigMap (typical VXLAN config)
net-conf.json: |
  {
    "Network": "10.244.0.0/16",
    "Backend": {
      "Type": "vxlan"
    }
  }
```

Performance impact with Istio: expect 0.1-0.3ms additional latency from the VXLAN overhead on top of the sidecar proxy latency.

### host-gw

Uses host routes instead of an overlay. No encapsulation overhead, but requires all nodes to be on the same L2 network:

```yaml
net-conf.json: |
  {
    "Network": "10.244.0.0/16",
    "Backend": {
      "Type": "host-gw"
    }
  }
```

This gives the best performance with Istio since there is no encapsulation overhead.

### WireGuard

Flannel can use WireGuard for encrypted overlay traffic. If you enable this, you are encrypting at both the network layer (WireGuard) and the application layer (Istio mTLS):

```yaml
net-conf.json: |
  {
    "Network": "10.244.0.0/16",
    "Backend": {
      "Type": "wireguard"
    }
  }
```

If you are using Istio mTLS, the WireGuard encryption is redundant. Consider using plain VXLAN or host-gw instead to reduce overhead.

## MTU Configuration

Getting the MTU right is important for avoiding fragmentation, which can cause performance issues and hard-to-debug connectivity problems:

```bash
# Check the current MTU on flannel interfaces
kubectl exec -n kube-system <flannel-pod> -- ip link show flannel.1

# For VXLAN, the MTU should be 50 bytes less than the host interface
# If host MTU is 1500, flannel MTU should be 1450
# With Istio's additional headers, you might want to go slightly lower
```

If you experience packet fragmentation issues with Istio on Flannel:

```yaml
# Set explicit MTU in Flannel config
net-conf.json: |
  {
    "Network": "10.244.0.0/16",
    "Backend": {
      "Type": "vxlan",
      "MTU": 1400
    }
  }
```

## Troubleshooting

### Issue: Pods Cannot Communicate Through the Mesh

```bash
# Test direct pod-to-pod connectivity (bypass mesh)
kubectl exec <pod-a> -c <app-container> -- ping -c 3 <pod-b-ip>

# If ping fails, it is a Flannel issue
# Check Flannel pods
kubectl get pods -n kube-system -l app=flannel
kubectl logs -n kube-system -l app=flannel --tail=50

# If ping works but HTTP through mesh fails, it is an Istio issue
# Check sidecar status
istioctl proxy-status | grep <pod-name>
```

### Issue: Slow Performance

```bash
# Check for MTU issues (fragmentation)
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep "cx_tx\|cx_rx"

# Check if VXLAN overhead is causing issues
kubectl exec <pod> -c <app-container> -- traceroute <destination-pod-ip>
```

### Issue: Sidecar Init Container Fails

```bash
# Check init container logs
kubectl logs <pod> -c istio-init

# Common issue: iptables version mismatch
# Flannel and Istio both need iptables. Ensure the node has compatible iptables
kubectl exec <pod> -c istio-proxy -- iptables --version
```

## Monitoring

Since Flannel does not provide its own observability, rely entirely on Istio and Kubernetes metrics:

```promql
# Network throughput per pod
sum(rate(container_network_transmit_bytes_total[5m])) by (pod, namespace)

# TCP retransmissions (can indicate MTU or network issues)
rate(node_netstat_Tcp_RetransSegs[5m])

# Istio request success rate
sum(rate(istio_requests_total{response_code="200"}[5m]))
/ sum(rate(istio_requests_total[5m]))
```

Flannel's simplicity makes it a reliable foundation for Istio. There are fewer configuration knobs to worry about, fewer potential conflicts, and a smaller surface area for things to go wrong. If your networking needs are straightforward and you want the service mesh to handle the advanced features, Flannel plus Istio is a solid combination.
