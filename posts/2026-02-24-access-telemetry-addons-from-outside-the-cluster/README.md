# How to Access Telemetry Addons from Outside the Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Kubernetes, Ingresses, Observability

Description: Multiple methods for accessing Istio telemetry addons like Grafana, Kiali, and Jaeger from outside the Kubernetes cluster.

---

Istio's telemetry addons - Grafana, Kiali, Prometheus, Jaeger - are deployed as ClusterIP services by default. That means they are only accessible from within the cluster. When you need your SRE team or developers to access these dashboards from their workstations, you have several options. Each has trade-offs in terms of security, complexity, and convenience.

Here are the main approaches, from simplest to most production-ready.

## Method 1: kubectl Port-Forward

The quickest way to access any telemetry addon is through port-forwarding:

```bash
# Grafana
kubectl port-forward svc/grafana -n istio-system 3000:3000

# Kiali
kubectl port-forward svc/kiali -n istio-system 20001:20001

# Prometheus
kubectl port-forward svc/prometheus -n istio-system 9090:9090

# Jaeger
kubectl port-forward svc/tracing -n istio-system 16686:80
```

Istio also provides a shorthand through `istioctl`:

```bash
istioctl dashboard grafana
istioctl dashboard kiali
istioctl dashboard prometheus
istioctl dashboard jaeger
```

These commands create port-forwards and open your browser automatically.

The downside is that each person needs kubectl access to the cluster, and the port-forward dies if your terminal session ends. It also does not scale for teams because there is no shared URL.

## Method 2: NodePort Services

You can change the telemetry services from ClusterIP to NodePort, which exposes them on a port on every cluster node:

```bash
kubectl patch svc grafana -n istio-system \
  -p '{"spec": {"type": "NodePort"}}'
```

Then access Grafana through any node IP on the assigned port:

```bash
kubectl get svc grafana -n istio-system -o jsonpath='{.spec.ports[0].nodePort}'
```

Access it at `http://<node-ip>:<node-port>`.

This is simple but has real problems. There is no TLS, no authentication, and you are exposing the node IPs directly. Not recommended for anything beyond a quick test on a throwaway cluster.

## Method 3: Istio Ingress Gateway

The recommended approach for production is routing through Istio's ingress gateway. This gives you TLS termination, traffic management, and the ability to add authentication.

First, create a Gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: telemetry-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: telemetry-tls
      hosts:
        - "*.monitoring.example.com"
```

Then create VirtualServices for each addon:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grafana
  namespace: istio-system
spec:
  hosts:
    - grafana.monitoring.example.com
  gateways:
    - telemetry-gateway
  http:
    - route:
        - destination:
            host: grafana
            port:
              number: 3000
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: kiali
  namespace: istio-system
spec:
  hosts:
    - kiali.monitoring.example.com
  gateways:
    - telemetry-gateway
  http:
    - route:
        - destination:
            host: kiali
            port:
              number: 20001
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: prometheus
  namespace: istio-system
spec:
  hosts:
    - prometheus.monitoring.example.com
  gateways:
    - telemetry-gateway
  http:
    - route:
        - destination:
            host: prometheus
            port:
              number: 9090
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: jaeger
  namespace: istio-system
spec:
  hosts:
    - jaeger.monitoring.example.com
  gateways:
    - telemetry-gateway
  http:
    - route:
        - destination:
            host: tracing
            port:
              number: 80
```

Get the external IP of the ingress gateway and set up DNS records:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

## Method 4: Kubernetes Ingress Resource

If you have an Ingress controller (like NGINX Ingress) running alongside Istio, you can use standard Kubernetes Ingress resources:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: istio-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - grafana.example.com
      secretName: grafana-tls
  rules:
    - host: grafana.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: grafana
                port:
                  number: 3000
```

This works but mixes two ingress solutions (Istio Gateway and NGINX Ingress), which can get confusing. Stick with one approach if possible.

## Method 5: Kubernetes Gateway API

If your cluster supports the Kubernetes Gateway API (and Istio supports it as of recent versions), you can use the newer API:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: grafana
  namespace: istio-system
spec:
  parentRefs:
    - name: istio-gateway
      namespace: istio-system
  hostnames:
    - grafana.monitoring.example.com
  rules:
    - backendRefs:
        - name: grafana
          port: 3000
```

## Method 6: VPN or SSH Tunnel

For teams that already use a VPN to access internal resources, you can keep the telemetry services as ClusterIP and just make the cluster network reachable through the VPN.

If you do not have a VPN, an SSH tunnel works as a poor man's version:

```bash
ssh -L 3000:grafana.istio-system.svc.cluster.local:3000 bastion-host
```

This requires a bastion host that can resolve cluster DNS.

## Adding Authentication

Regardless of which method you choose for external access, add authentication. The simplest approach is Istio's AuthorizationPolicy with an external auth provider:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: telemetry-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: grafana
  action: CUSTOM
  provider:
    name: oauth2-proxy
  rules:
    - to:
        - operation:
            paths: ["/*"]
```

## IP Allowlisting

If your team accesses from known IP ranges (like an office network), you can add IP-based restrictions:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: telemetry-ip-allow
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            remoteIpBlocks:
              - "203.0.113.0/24"
              - "198.51.100.0/24"
      to:
        - operation:
            hosts:
              - "*.monitoring.example.com"
```

## Which Method Should You Use?

For a single developer on a local cluster, port-forwarding is fine. For a small team sharing a dev cluster, NodePort with a VPN might work. For anything resembling production, use the Istio Ingress Gateway approach with TLS and authentication.

The Istio Ingress Gateway method gives you the most flexibility. You get TLS termination, authentication through AuthorizationPolicy, rate limiting, access logging, and all the other features Istio provides. It does require DNS setup and TLS certificates, but tools like cert-manager and external-dns automate most of that.

Whatever method you pick, do not leave dashboards unauthenticated. Your telemetry data reveals your entire application architecture, traffic patterns, and performance characteristics. Treat it as sensitive information.
