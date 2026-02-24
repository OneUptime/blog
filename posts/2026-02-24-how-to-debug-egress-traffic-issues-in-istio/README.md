# How to Debug Egress Traffic Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Debugging, ServiceEntry, Traffic Management

Description: Troubleshoot outbound traffic problems in Istio mesh including ServiceEntry misconfigurations, egress gateway issues, and DNS resolution failures for external services.

---

Egress traffic is traffic leaving your mesh to reach external services. When you add Istio to a cluster, egress behavior changes depending on your mesh configuration. Some organizations lock down all egress and require explicit ServiceEntries. Others leave it open but still run into problems with TLS origination or routing.

If your pods can not reach external endpoints after Istio injection, this guide will help you find and fix the issue.

## Check the Outbound Traffic Policy

This is the first thing to check because it determines the default behavior for all external traffic:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A 3 outboundTrafficPolicy
```

If you see:

```yaml
outboundTrafficPolicy:
  mode: REGISTRY_ONLY
```

Then all external traffic is blocked by default. You need ServiceEntries for every external service your pods talk to. If it says `ALLOW_ANY` or is not set (ALLOW_ANY is the default), external traffic should pass through.

## Test External Connectivity

From inside a meshed pod:

```bash
kubectl exec -it my-app-xxxxx -c my-app -- curl -v https://httpbin.org/get
```

If this hangs or returns an error, try the same from the istio-proxy container:

```bash
kubectl exec -it my-app-xxxxx -c istio-proxy -- curl -v https://httpbin.org/get
```

If the request works from istio-proxy but not from the app container, the issue is likely iptables interception. If both fail, it is a routing or policy issue.

## Check Envoy Access Logs

Enable access logging if not already enabled, then check what Envoy is doing with the request:

```bash
kubectl logs my-app-xxxxx -c istio-proxy --tail=100
```

Key things to look for in the log line:

- **Response code 502**: Envoy could not connect to the upstream
- **Response code 503**: No cluster or no healthy endpoints
- **Response flags `NR`**: No route configured for this destination
- **Response flags `UH`**: No healthy upstream hosts
- **Response flags `UF`**: Upstream connection failure
- **Response flags `DC`**: Downstream connection termination

A 503 with `NR` in REGISTRY_ONLY mode means you need a ServiceEntry.

## Create a ServiceEntry

For HTTPS services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: httpbin-ext
  namespace: default
spec:
  hosts:
    - httpbin.org
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

For HTTP services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: httpbin-http
  namespace: default
spec:
  hosts:
    - httpbin.org
  ports:
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
  location: MESH_EXTERNAL
```

Apply and test:

```bash
kubectl apply -f serviceentry.yaml
kubectl exec -it my-app-xxxxx -c my-app -- curl -v https://httpbin.org/get
```

## Common ServiceEntry Mistakes

### Using HTTP protocol for HTTPS traffic

If your app sends HTTPS requests, the ServiceEntry port protocol should be `TLS` (for passthrough) or `HTTPS` (if Envoy should handle TLS). Using `HTTP` for an HTTPS call will cause failures because Envoy will try to parse TLS as HTTP:

```yaml
# Wrong for HTTPS traffic
  ports:
    - number: 443
      name: http
      protocol: HTTP  # This will break HTTPS calls

# Correct for passthrough
  ports:
    - number: 443
      name: tls
      protocol: TLS
```

### Missing port in the ServiceEntry

If the external service runs on a non-standard port:

```yaml
  ports:
    - number: 8443
      name: tls
      protocol: TLS
```

### Wrong resolution type

If the external service is an IP address, DNS resolution will not work:

```yaml
  hosts:
    - external-db
  addresses:
    - 192.168.1.100
  resolution: STATIC
  endpoints:
    - address: 192.168.1.100
```

## Debug with Envoy Config Dump

Check if Envoy knows about the external service:

```bash
istioctl proxy-config clusters my-app-xxxxx.default | grep httpbin
```

Expected output:

```
outbound|443||httpbin.org    httpbin.org    443    -    EDS
```

If the cluster is not there, the ServiceEntry is not applied correctly or has not synced yet.

Check endpoints:

```bash
istioctl proxy-config endpoints my-app-xxxxx.default --cluster "outbound|443||httpbin.org"
```

If endpoints are empty, DNS resolution is failing for the external host.

## Debugging Egress Gateways

Some organizations route egress through a dedicated egress gateway for auditing and security. This adds complexity and more potential failure points.

The typical egress gateway setup requires three resources:

### 1. A Gateway for the egress gateway pod

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: istio-system
spec:
  selector:
    istio: egressgateway
  servers:
    - port:
        number: 443
        name: tls
        protocol: TLS
      hosts:
        - httpbin.org
      tls:
        mode: PASSTHROUGH
```

### 2. A VirtualService routing traffic through the egress gateway

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: httpbin-through-egress
spec:
  hosts:
    - httpbin.org
  gateways:
    - istio-system/egress-gateway
    - mesh
  tls:
    - match:
        - gateways:
            - mesh
          port: 443
          sniHosts:
            - httpbin.org
      route:
        - destination:
            host: istio-egressgateway.istio-system.svc.cluster.local
            port:
              number: 443
    - match:
        - gateways:
            - istio-system/egress-gateway
          port: 443
          sniHosts:
            - httpbin.org
      route:
        - destination:
            host: httpbin.org
            port:
              number: 443
```

### 3. A ServiceEntry for the external service

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: httpbin
spec:
  hosts:
    - httpbin.org
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

If egress gateway routing is broken, debug each hop:

```bash
# Check if traffic reaches the egress gateway
kubectl logs -n istio-system -l istio=egressgateway --tail=50

# Check egress gateway listeners
EGRESS_POD=$(kubectl get pod -n istio-system -l istio=egressgateway -o jsonpath='{.items[0].metadata.name}')
istioctl proxy-config listeners $EGRESS_POD.istio-system

# Check egress gateway routes
istioctl proxy-config routes $EGRESS_POD.istio-system

# Check egress gateway clusters
istioctl proxy-config clusters $EGRESS_POD.istio-system | grep httpbin
```

## Check Network Policies

Kubernetes NetworkPolicies can block egress independently of Istio:

```bash
kubectl get networkpolicy -n default
```

Make sure egress is allowed to the required external IPs or to the egress gateway service.

## DNS Issues

External DNS resolution can fail in Istio for several reasons:

1. The DNS proxy in istio-proxy might cache stale entries
2. The upstream DNS server might be unreachable
3. `/etc/resolv.conf` in the pod might not have the right nameservers

Test DNS from the proxy:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- nslookup httpbin.org
```

If DNS fails, check the pod's DNS configuration and ensure the DNS service (usually CoreDNS) is working:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

## Debugging Checklist

1. Check outbound traffic policy mode (ALLOW_ANY vs REGISTRY_ONLY)
2. Test connectivity from inside the pod
3. Check Envoy access logs for response codes and flags
4. Verify ServiceEntry exists and has correct protocol/resolution
5. Check Envoy clusters and endpoints for the external host
6. If using egress gateway, check gateway pod, Gateway resource, and VirtualService
7. Check NetworkPolicies for egress restrictions
8. Verify DNS resolution works

Egress issues usually come down to one of two things: the ServiceEntry is missing or misconfigured, or the outbound traffic policy is blocking unregistered services. Start there and work your way down the list.
