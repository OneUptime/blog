# How to Fix DNS Resolution Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Resolution, Troubleshooting, Kubernetes

Description: Diagnose and fix DNS resolution failures in Istio service mesh including internal service discovery, external name resolution, and DNS proxy issues.

---

DNS resolution problems in Istio are sneaky. Services that resolve fine from a pod without a sidecar suddenly fail when the sidecar is present. Or external hostnames that used to work stop resolving after adding a ServiceEntry. The sidecar intercepts all network traffic including DNS queries, and when that interception interacts with Kubernetes DNS in unexpected ways, you get resolution failures.

This guide covers how DNS works in an Istio mesh and how to fix the common problems.

## How DNS Works with Istio

In a standard Kubernetes setup, DNS queries go directly from the application to CoreDNS via the cluster DNS service (usually 10.96.0.10:53). With Istio, traffic interception can affect DNS in two ways:

1. **Without DNS proxy**: DNS UDP traffic passes through iptables rules. By default, Istio excludes port 53 from interception, so DNS usually works normally.
2. **With DNS proxy enabled**: Istio intercepts DNS queries at the sidecar and can resolve them locally using Istio's service registry.

Check if DNS proxy is enabled:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep proxyMetadata -A 5
```

Look for `ISTIO_META_DNS_CAPTURE: "true"` or `ISTIO_META_DNS_AUTO_ALLOCATE: "true"`.

## Basic DNS Troubleshooting

Start by testing DNS from inside the pod:

```bash
# Test from the application container
kubectl exec <pod-name> -c my-app -n production -- nslookup orders-service

# Test from the sidecar container
kubectl exec <pod-name> -c istio-proxy -n production -- nslookup orders-service

# Test external DNS
kubectl exec <pod-name> -c my-app -n production -- nslookup api.example.com
```

If DNS works from the sidecar but not from the application container (or vice versa), the issue is with how iptables routes DNS traffic.

Check the iptables rules:

```bash
kubectl exec <pod-name> -c istio-proxy -n production -- iptables -t nat -L -n | grep 53
```

## Fix 1: DNS Queries Timing Out

If DNS queries are timing out (not getting a "not found" but simply hanging):

```bash
# Check if CoreDNS is healthy
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check if CoreDNS service is reachable from the pod
kubectl exec <pod-name> -c istio-proxy -n production -- \
  curl -v telnet://10.96.0.10:53 2>&1 | head -5
```

If CoreDNS is healthy but DNS queries still time out, the sidecar might be intercepting DNS traffic and not forwarding it correctly.

Try excluding port 53 from interception:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "53"
```

This tells the init container to not intercept UDP/TCP port 53, allowing DNS queries to go directly to CoreDNS.

## Fix 2: ServiceEntry DNS Resolution

When you define a ServiceEntry with `resolution: DNS`, Istio needs to resolve the hostname. If the external DNS name cannot be resolved, traffic to that service fails:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: production
spec:
  hosts:
    - api.external-service.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
```

If this is not resolving:

```bash
# Check if the hostname resolves from within the cluster
kubectl exec <pod-name> -c istio-proxy -n production -- nslookup api.external-service.com

# Check Envoy endpoint resolution
istioctl proxy-config endpoints <pod-name> -n production | grep external-service
```

If the external DNS name cannot be resolved from within the cluster, you might need to configure the DNS resolution source or use a static IP:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.external-service.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: STATIC
  endpoints:
    - address: 203.0.113.10
```

## Fix 3: Headless Service DNS Issues

Headless services (services with `clusterIP: None`) use DNS to return individual pod IPs instead of a single service IP. Istio handles headless services differently and sometimes causes issues:

```bash
# Check headless service DNS
kubectl exec <pod-name> -c my-app -n production -- nslookup my-headless-service

# You should get multiple A records, one per pod
```

If headless service DNS is not returning all pods:

```bash
# Verify the headless service endpoints
kubectl get endpoints my-headless-service -n production

# Check how Envoy sees the headless service
istioctl proxy-config endpoints <client-pod> -n production | grep my-headless-service
```

Headless services with Istio might require the `resolution: NONE` in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-headless-service
spec:
  host: my-headless-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
```

## Fix 4: DNS Proxy Configuration

If you are using Istio's DNS proxy feature and running into issues:

```yaml
# Enable DNS proxy in mesh config
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

When DNS capture is enabled, the sidecar intercepts all DNS queries and handles them locally. This is useful for resolving ServiceEntry hosts that do not exist in Kubernetes DNS:

```bash
# Verify DNS proxy is working
kubectl exec <pod-name> -c istio-proxy -n production -- pilot-agent request GET /debug/dnsz
```

If DNS proxy is causing problems (queries that should go to CoreDNS are being handled by the proxy incorrectly), you can disable it per-pod:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "false"
```

## Fix 5: Cross-Namespace Service Resolution

When a service in namespace A cannot resolve a service in namespace B:

```bash
# Test cross-namespace resolution
kubectl exec <pod-name> -c my-app -n namespace-a -- nslookup orders-service.namespace-b.svc.cluster.local
```

If this fails, check if a Sidecar resource is limiting visibility:

```bash
kubectl get sidecar -n namespace-a -o yaml
```

If the Sidecar resource does not include `namespace-b` in its egress hosts, the proxy will not have configuration for that service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: namespace-a
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "namespace-b/*"  # Add the target namespace
```

## Fix 6: ndots and Search Domains

Kubernetes DNS has a `ndots` setting (default is 5) that determines when a name is treated as fully qualified. This can cause excessive DNS queries:

```bash
# Check the DNS config in the pod
kubectl exec <pod-name> -c my-app -n production -- cat /etc/resolv.conf
```

You might see:

```text
nameserver 10.96.0.10
search production.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

With `ndots:5`, a name like `api.external-service.com` has 2 dots, which is less than 5, so Kubernetes DNS will first try appending each search domain before trying the name as-is. This causes 5 DNS queries before the real one.

While this is a Kubernetes setting (not Istio-specific), the extra queries are amplified when the sidecar proxies each one. To fix, either use FQDNs (with a trailing dot) or reduce ndots:

```yaml
spec:
  template:
    spec:
      dnsConfig:
        options:
          - name: ndots
            value: "2"
```

## Fix 7: CoreDNS Configuration Issues

If DNS resolution fails for all services, check CoreDNS:

```bash
# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Check CoreDNS ConfigMap
kubectl get configmap coredns -n kube-system -o yaml

# Restart CoreDNS if needed
kubectl rollout restart deployment coredns -n kube-system
```

## Diagnostic Summary

```bash
# 1. Does basic DNS work?
kubectl exec <pod> -c my-app -n production -- nslookup kubernetes.default

# 2. Does service DNS work?
kubectl exec <pod> -c my-app -n production -- nslookup target-service.production

# 3. Does external DNS work?
kubectl exec <pod> -c my-app -n production -- nslookup google.com

# 4. Is DNS proxy enabled?
kubectl get configmap istio -n istio-system -o yaml | grep DNS

# 5. Is port 53 being intercepted?
kubectl exec <pod> -c istio-proxy -n production -- iptables -t nat -L -n | grep 53

# 6. Is CoreDNS healthy?
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

DNS issues in Istio usually come down to traffic interception affecting DNS queries, Sidecar resources limiting service visibility, or ServiceEntry resolution configuration. Start by testing basic DNS resolution and work your way up to more complex scenarios. Most problems can be solved by either excluding port 53 from interception or properly configuring the DNS proxy feature.
