# How to Handle Source IP Preservation in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Source IP, Networking, Envoy, Kubernetes

Description: Practical guide to preserving client source IP addresses in Istio for logging, rate limiting, and access control use cases.

---

When traffic flows through a service mesh, the original client IP address can get lost. This happens because the Envoy sidecar proxy terminates the connection and creates a new one to forward the request. For many applications, losing the source IP is a real problem. You might need it for rate limiting, geo-based routing, access control, or just accurate logging.

Istio provides several ways to preserve the source IP, depending on your deployment topology and requirements. The right approach depends on whether you're dealing with traffic between mesh services, traffic from an ingress gateway, or traffic from external load balancers.

## Why Source IP Gets Lost

To understand the solutions, you need to understand the problem. In a typical Istio setup:

1. A client sends a request to your service
2. The request hits a Kubernetes Service (which may SNAT the traffic)
3. The request reaches the pod and gets intercepted by iptables
4. iptables REDIRECTs the traffic to Envoy on port 15006
5. Envoy processes the request and forwards it to your app on localhost

The REDIRECT target in iptables changes the destination but also affects how the source address appears. By the time your application sees the request, the source IP might be `127.0.0.1` (from Envoy's localhost connection) or the node IP (from kube-proxy's SNAT).

## Checking the Current Source IP

First, figure out what source IP your application is actually seeing:

```bash
# Deploy a simple echo service
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: echo
  template:
    metadata:
      labels:
        app: echo
    spec:
      containers:
        - name: echo
          image: hashicorp/http-echo
          args: ["-text", "hello"]
          ports:
            - containerPort: 5678
EOF
```

Then check what headers are being sent:

```bash
kubectl exec -it sleep-pod -c sleep -- curl -s http://echo:5678 -v 2>&1 | grep -i "x-forwarded"
```

## Method 1: X-Forwarded-For Header

For HTTP traffic, the standard approach is the `X-Forwarded-For` (XFF) header. Envoy automatically adds this header when proxying HTTP requests. Your application should read the source IP from this header rather than the TCP connection's source address.

The XFF header is a comma-separated list of IPs. The leftmost IP is the original client. Each proxy that handles the request appends its own address:

```
X-Forwarded-For: <client>, <proxy1>, <proxy2>
```

Configure how many proxies to trust in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

The `numTrustedProxies` setting tells Envoy how many proxy hops to trust when extracting the client IP from XFF. If you have one external load balancer in front of your ingress gateway, set this to 1.

## Method 2: TPROXY Interception Mode

For TCP traffic where HTTP headers aren't available, you can use TPROXY mode. Unlike REDIRECT, TPROXY preserves the original source address in the IP packet:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: preserve-source-ip
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  ingress:
    - port:
        number: 8080
        protocol: TCP
        name: tcp
      defaultEndpoint: 127.0.0.1:8080
      captureMode: TPROXY
```

Or set it globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      interceptionMode: TPROXY
```

With TPROXY, the source IP of the connection as seen by Envoy is the actual client IP. Envoy passes this through to the upstream connection, so your application sees the real source.

Note that TPROXY requires additional kernel capabilities and may not work in all environments. Your nodes need the `xt_TPROXY` kernel module loaded.

## Method 3: Ingress Gateway Configuration

When traffic enters through the Istio ingress gateway, preserving the external client IP requires proper configuration of both the gateway and any external load balancer.

For cloud load balancers, set the `externalTrafficPolicy` to `Local`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
    - port: 80
      targetPort: 8080
      name: http2
    - port: 443
      targetPort: 8443
      name: https
```

Setting `externalTrafficPolicy: Local` prevents kube-proxy from doing SNAT, which preserves the client's real IP. The trade-off is that traffic can only be routed to nodes that are running the gateway pod, which can cause uneven load distribution.

## Method 4: PROXY Protocol

Some load balancers support the PROXY protocol, which is a way to convey the original client IP through the TCP connection itself. This works for both HTTP and non-HTTP traffic.

Configure the Envoy filter on your gateway to accept PROXY protocol:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: proxy-protocol
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: LISTENER
      match:
        context: GATEWAY
      patch:
        operation: MERGE
        value:
          listenerFilters:
            - name: envoy.filters.listener.proxy_protocol
              typedConfig:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
```

You also need to configure your external load balancer to send PROXY protocol headers.

## Method 5: Custom Headers from Load Balancers

Many cloud load balancers (AWS ALB, GCP GCLB) add their own headers with the client IP. For example, AWS ALB adds `X-Forwarded-For`. You can configure Istio to use these headers:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 2
        forwardClientCertDetails: SANITIZE_SET
```

## Verifying Source IP Preservation

After configuring, verify that the source IP is correctly preserved:

```bash
# Check X-Forwarded-For at the application level
kubectl exec -it my-app-pod -- curl -s localhost:8080/headers

# Check Envoy access logs for source IP
kubectl logs my-app-pod -c istio-proxy | tail -5

# Look at the downstream_remote_address in the access log
# This should show the real client IP
```

You can also create an AuthorizationPolicy that tests source IP matching:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: test-source-ip
spec:
  selector:
    matchLabels:
      app: my-app
  rules:
    - from:
        - source:
            remoteIpBlocks: ["203.0.113.0/24"]
      when:
        - key: request.headers[X-Forwarded-For]
          values: ["203.0.113.*"]
```

The `remoteIpBlocks` field in AuthorizationPolicy uses the trusted client IP extracted from XFF, respecting the `numTrustedProxies` setting.

## Choosing the Right Approach

For most setups, the combination of `externalTrafficPolicy: Local` on your gateway service and setting `numTrustedProxies` in the mesh config handles the majority of use cases. If you need source IP for TCP (non-HTTP) traffic between mesh services, TPROXY is the way to go. PROXY protocol is useful when you can't set `externalTrafficPolicy: Local` due to load distribution concerns.
