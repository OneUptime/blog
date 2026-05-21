# How to Use an External HTTPS Proxy with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTPS Proxy, Egress, Service Mesh, Networking

Description: How to configure Istio mesh workloads to route egress traffic through an external HTTPS proxy for environments that require proxy-based internet access.

---

In many corporate and regulated environments, all internet-bound traffic must go through an HTTPS proxy (sometimes called a forward proxy or web proxy). When running Istio, you need to configure the mesh so that outbound traffic from pods routes through this proxy instead of going directly to the internet.

This is trickier than it sounds because Istio's sidecar proxy intercepts outbound TCP traffic, and the mesh configuration needs to allow the application to reach the proxy.

## Understanding the Problem

Without Istio, you would set `HTTP_PROXY` and `HTTPS_PROXY` environment variables in your application containers. The application uses these to connect to the proxy, which then forwards the request to the destination.

With Istio, the sidecar proxy intercepts outbound TCP connections. When your application tries to connect to the HTTPS proxy, the sidecar sees a connection to the proxy's IP and port, not the actual destination. This can cause routing issues if the sidecar does not know how to handle the proxy connection.

There are two common approaches to solve this:

1. Configure the sidecar to bypass interception for proxy traffic
2. Register the proxy with a ServiceEntry so Istio can route traffic to it

## Approach 1: Bypass Sidecar for Proxy Traffic

The simplest approach is to exclude the proxy's IP address from sidecar interception. This lets the application connect directly to the proxy without Istio getting involved.

### Using Pod Annotations

Add annotations to your pod spec to exclude the proxy IP:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.5.10/32"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        env:
        - name: HTTP_PROXY
          value: "http://10.0.5.10:3128"
        - name: HTTPS_PROXY
          value: "http://10.0.5.10:3128"
        - name: NO_PROXY
          value: "localhost,127.0.0.1,.svc.cluster.local"
```

The `excludeOutboundIPRanges` annotation tells the sidecar's iptables rules to skip interception for traffic going to `10.0.5.10`. The application's proxy settings then work normally.

### Using Mesh-Wide Configuration

If all pods need to use the proxy, configure the exclusion at the mesh level:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        excludeIPRanges: "10.0.5.10/32"
```

You still need to configure `HTTP_PROXY` and `HTTPS_PROXY` in the application containers that should use the proxy.

## Approach 2: Use Istio ServiceEntry for the Proxy

Instead of bypassing the sidecar, you can register the proxy as a ServiceEntry and route traffic to it through Istio's normal routing:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: corporate-proxy
spec:
  hosts:
  - "corporate-proxy.internal"
  addresses:
  - "10.0.5.10/32"
  ports:
  - number: 3128
    name: tcp
    protocol: TCP
  resolution: NONE
  location: MESH_EXTERNAL
```

Then your applications connect to the proxy as usual:

```yaml
env:
- name: HTTP_PROXY
  value: "http://10.0.5.10:3128"
- name: HTTPS_PROXY
  value: "http://10.0.5.10:3128"
```

This approach keeps the traffic visible to Istio's telemetry but does not give you routing control over the proxied traffic since the actual destination is opaque (it is inside the CONNECT tunnel).

## Approach 3: Egress Gateway as a Controlled Egress Point

An Istio egress gateway can centralize direct egress to known external hosts, but it does not automatically use an external HTTPS proxy. Setting `HTTP_PROXY` or `HTTPS_PROXY` on the `istio-proxy` container does not make Envoy send upstream connections through that proxy. If you use an egress gateway with standard Istio `Gateway` and `VirtualService` resources, the gateway routes to the configured external destination directly:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - "api.external.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: egress-gw
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
    - "api.external.com"
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: route-via-egress
spec:
  hosts:
  - "api.external.com"
  gateways:
  - mesh
  - istio-system/egress-gw
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - "api.external.com"
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - istio-system/egress-gw
      port: 443
      sniHosts:
      - "api.external.com"
    route:
    - destination:
        host: api.external.com
        port:
          number: 443
```

This way, egress traffic goes through the Istio egress gateway for policy and telemetry, but it does not go through the corporate HTTPS proxy unless you add explicit Envoy configuration for forward-proxy or CONNECT tunneling behavior. For a standard external HTTPS proxy, the documented Istio pattern is to let the application use `HTTPS_PROXY` and configure Istio to allow TCP traffic to the proxy, as shown above.

## Configuring the NO_PROXY Variable

Make sure to set `NO_PROXY` correctly to prevent internal mesh traffic from going through the proxy:

```yaml
env:
- name: NO_PROXY
  value: "localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.svc.cluster.local"
```

This excludes:
- Localhost
- Private IP ranges (where Kubernetes services typically live)
- Kubernetes service DNS names

## HTTPS CONNECT Tunneling

When an application uses an HTTPS proxy, it sends a CONNECT request to the proxy, which creates a TCP tunnel to the destination. Without TLS inspection, the proxy sees the destination hostname and port but cannot inspect the encrypted traffic.

```mermaid
sequenceDiagram
    participant App as Application
    participant Proxy as HTTPS Proxy
    participant Dest as api.external.com

    App->>Proxy: CONNECT api.external.com:443
    Proxy->>Dest: TCP connection to api.external.com:443
    Proxy->>App: HTTP 200 Connection Established
    App->>Dest: TLS handshake (through tunnel)
    App->>Dest: HTTPS request (encrypted)
```

The sidecar sees this as a TCP connection to the proxy. It does not see the actual destination unless you configure Envoy to parse the CONNECT request.

## Proxy Authentication

If your corporate proxy requires authentication, pass the credentials through environment variables:

```yaml
env:
- name: HTTP_PROXY
  value: "http://username:password@10.0.5.10:3128"
- name: HTTPS_PROXY
  value: "http://username:password@10.0.5.10:3128"
```

For better security, use a Kubernetes secret:

```yaml
env:
- name: HTTP_PROXY
  valueFrom:
    secretKeyRef:
      name: proxy-credentials
      key: http-proxy-url
```

## PAC File Support

Some environments use PAC (Proxy Auto-Configuration) files to determine which traffic should go through the proxy. Istio itself does not support PAC files. You have two options:

1. Translate the PAC file rules into ServiceEntry and VirtualService configurations
2. Use a sidecar container that handles PAC file parsing and presents a local proxy endpoint

## Verifying Proxy Usage

Check that traffic is going through the proxy:

```bash
# Check the proxy logs to see if requests are coming through

# (This depends on your proxy software)

# From a pod, verify the proxy is being used
kubectl exec deploy/my-app -- curl -v https://api.external.com 2>&1 | grep -i proxy

# Check the sidecar proxy stats
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep upstream
```

## Troubleshooting

**Connection timeouts.** The sidecar might be intercepting proxy traffic. Verify the `excludeOutboundIPRanges` is set correctly:

```bash
kubectl get pod my-app-xxxx -o yaml | grep exclude
```

**Certificate errors.** Corporate proxies often perform TLS inspection, replacing the server certificate with one signed by the corporate CA. Your applications need to trust this CA. Mount the corporate CA certificate and configure your application to use it.

**DNS resolution failures.** If the proxy handles DNS resolution (common for HTTPS CONNECT), the pod's DNS resolution to the external hostname is unnecessary. But the sidecar might still need to resolve it for routing decisions. Make sure DNS works within the pod.

## Summary

Using an external HTTPS proxy with Istio requires configuring either sidecar bypass for the proxy IP or registering the proxy as a ServiceEntry. The simplest approach is excluding the proxy IP from sidecar interception using annotations. For more control and auditability over direct egress to known destinations, route through an egress gateway, but do not rely on proxy environment variables to make the gateway use a corporate HTTPS proxy. Make sure to set NO_PROXY correctly to prevent internal traffic from being proxied, and handle corporate CA certificates for TLS-inspecting proxies.
