# How to Configure Istio with Weave Net CNI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Weave Net, CNI, Kubernetes, Networking

Description: A practical guide to running Istio service mesh on Kubernetes clusters using Weave Net CNI with configuration tips and common issue resolutions.

---

Weave Net is a CNI plugin that creates a virtual network connecting Docker containers and Kubernetes pods across multiple hosts. It provides automatic mesh networking with built-in encryption and DNS-based service discovery. When running Istio on top of Weave Net, there are a few things to be aware of since both systems operate in the networking space and have some overlapping features.

## How Weave Net and Istio Interact

Weave Net handles the underlying pod network using a combination of a kernel datapath (fast datapath using Open vSwitch) and a userspace fallback (sleeve mode). Istio sits on top of this network and intercepts traffic at the pod level using iptables NAT rules.

The main interaction points are:

1. **Traffic interception**: Istio's iptables rules capture traffic in the NAT table. Weave Net uses the FORWARD chain for routing. These generally do not conflict.
2. **Encryption**: Weave Net has built-in encryption using NaCl. Istio uses mTLS. Running both encrypts traffic twice.
3. **Network Policy**: Weave Net implements Kubernetes NetworkPolicy. This works alongside Istio's AuthorizationPolicy.
4. **DNS**: Weave Net includes WeaveDNS. Istio can capture DNS for its own purposes. This needs attention.

## Prerequisites

```bash
# Check Weave Net status
kubectl get pods -n kube-system -l name=weave-net

# Check Weave Net version
kubectl get pods -n kube-system -l name=weave-net -o jsonpath='{.items[0].spec.containers[0].image}'

# Verify Weave connectivity
kubectl exec -n kube-system <weave-pod> -c weave -- /home/weave/weave --local status

# Check peers
kubectl exec -n kube-system <weave-pod> -c weave -- /home/weave/weave --local status peers
```

## Installing Istio on Weave Net

The standard Istio installation works with Weave Net. No special flags are needed for basic operation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-weavenet
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
istioctl install -f istio-weavenet.yaml -y

# Verify
kubectl get pods -n istio-system
istioctl proxy-status
```

## Handling Encryption Overlap

Both Weave Net and Istio can encrypt pod-to-pod traffic. Running both is wasteful and adds unnecessary latency.

### Check if Weave Net Encryption is Enabled

```bash
# Check Weave Net encryption status
kubectl exec -n kube-system <weave-pod> -c weave -- /home/weave/weave --local status | grep encryption
```

### Recommended: Disable Weave Net Encryption

If you are using Istio mTLS (which you should be), disable Weave Net's encryption:

```bash
# When deploying Weave Net, omit the WEAVE_PASSWORD environment variable
# Or set encryption to disabled in the Weave Net DaemonSet
kubectl set env daemonset/weave-net -n kube-system WEAVE_PASSWORD-
```

If Weave Net was installed with the password, you may need to redeploy it without the `WEAVE_PASSWORD` environment variable.

Alternatively, if you prefer network-level encryption and do not need Istio's identity-based mTLS, you can disable Istio mTLS and rely on Weave Net encryption:

```yaml
# Only if you choose Weave encryption over Istio mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: DISABLE
```

However, the recommended approach is to use Istio mTLS and disable Weave encryption, since mTLS provides identity-based authentication that Weave encryption does not.

## Network Policy Integration

Weave Net implements Kubernetes NetworkPolicy. These policies are enforced at the network level before traffic reaches the Istio sidecar.

### Allow Istio System Traffic

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istio-system
  namespace: default
spec:
  podSelector: {}
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
      ports:
        - port: 15012
          protocol: TCP
        - port: 15014
          protocol: TCP
        - port: 15017
          protocol: TCP
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
```

### Allow DNS Traffic

Weave Net includes WeaveDNS, but Kubernetes clusters typically use CoreDNS. Make sure DNS traffic is allowed:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: default
spec:
  podSelector: {}
  egress:
    - to: []
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
```

### Layered Security with Weave NetworkPolicy and Istio AuthorizationPolicy

```yaml
# Layer 1: Weave Net enforces L3/L4 policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-l4
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: api
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              tier: frontend
      ports:
        - port: 8080

---
# Layer 2: Istio enforces L7 policy
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-l7
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api
  rules:
    - from:
        - source:
            namespaces: ["frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/v1/*"]
```

## DNS Configuration

Weave Net includes WeaveDNS, but it is not typically used in modern Kubernetes clusters (CoreDNS is the default). If your cluster has both WeaveDNS and CoreDNS, combined with Istio's DNS capture feature, you can run into resolution conflicts.

### Verify DNS Resolution Works

```bash
# Test DNS from inside a meshed pod
kubectl exec <pod> -c <app-container> -- nslookup kubernetes.default.svc.cluster.local

# Test DNS for external services
kubectl exec <pod> -c <app-container> -- nslookup google.com

# Check which DNS server is being used
kubectl exec <pod> -c <app-container> -- cat /etc/resolv.conf
```

### If DNS Issues Arise

Disable WeaveDNS if it is conflicting with CoreDNS:

```bash
# Check if WeaveDNS is running
kubectl get pods -n kube-system | grep weavedns

# Disable WeaveDNS by setting the WEAVE_DNS environment variable
kubectl set env daemonset/weave-net -n kube-system WEAVE_DNS=false
```

If Istio DNS capture causes issues:

```yaml
# Disable Istio DNS capture
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "false"
```

## MTU Considerations

Weave Net's VXLAN overhead reduces the effective MTU. With Istio adding headers for its proxying, you might run into fragmentation issues:

```bash
# Check Weave MTU
kubectl exec -n kube-system <weave-pod> -c weave -- /home/weave/weave --local status | grep MTU

# Typical Weave VXLAN MTU: 1376 (1500 - 124 bytes overhead)
```

If you experience connectivity issues with large payloads:

```bash
# Test with different packet sizes
kubectl exec <pod> -c <app-container> -- curl -s --max-time 5 \
  -d "$(head -c 4096 /dev/urandom | base64)" \
  http://<service>:<port>/echo

# If large requests fail, reduce MTU
# Edit the Weave Net DaemonSet to set a lower MTU
kubectl set env daemonset/weave-net -n kube-system WEAVE_MTU=1350
```

## Using Istio CNI Plugin

If you need to avoid `NET_ADMIN` capabilities on application pods:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
        - istio-system
        - kube-system
      chained: true
```

Verify that the CNI chain works:

```bash
# Check the Istio CNI DaemonSet
kubectl get pods -n istio-system -l k8s-app=istio-cni-node

# Check logs for errors
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=30
```

## Troubleshooting

### Issue: Intermittent Connection Failures

Weave Net can sometimes fall back from fast datapath (kernel mode) to sleeve mode (userspace) for certain connections. Sleeve mode is significantly slower:

```bash
# Check connection mode
kubectl exec -n kube-system <weave-pod> -c weave -- /home/weave/weave --local status connections

# Look for "sleeve" connections - these are using the slow path
```

If many connections are using sleeve mode, there may be a firewall blocking UDP port 6784 between nodes.

### Issue: Weave Net Consuming Too Much Memory

Weave Net can use significant memory for large clusters. This is separate from Istio's memory usage:

```bash
# Check Weave memory usage
kubectl top pods -n kube-system -l name=weave-net
```

### Issue: Traffic Not Being Intercepted

```bash
# Verify iptables rules are set
kubectl exec <pod> -c istio-proxy -- iptables -t nat -L ISTIO_REDIRECT -n

# If rules are missing, check init container
kubectl logs <pod> -c istio-init
```

Weave Net provides a reliable foundation for Istio deployments. The main things to watch out for are the encryption overlap, MTU settings, and ensuring network policies allow Istio control plane traffic. Once those are configured correctly, the combination works smoothly.
