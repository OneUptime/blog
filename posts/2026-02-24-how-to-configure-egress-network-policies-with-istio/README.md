# How to Configure Egress Network Policies with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Network Policies, Kubernetes, Security

Description: Control outbound traffic from your Kubernetes cluster using Istio egress policies, ServiceEntry resources, and egress gateways.

---

Controlling outbound traffic is just as important as controlling inbound traffic, but it often gets overlooked. By default, Istio allows all outbound traffic from the mesh to external services. This means a compromised pod can call any external endpoint, exfiltrate data to any server, or communicate with a command-and-control server. Configuring egress policies with Istio closes this gap.

## Understanding Istio's Outbound Traffic Mode

Istio has a mesh-wide configuration option called `outboundTrafficPolicy` that controls how the mesh handles traffic to unknown external services. It has two modes:

- `ALLOW_ANY` (default): Lets Envoy proxies pass through traffic to external services even if there's no ServiceEntry defined for them.
- `REGISTRY_ONLY`: Blocks all external traffic unless there's a ServiceEntry registered for the destination.

To switch to `REGISTRY_ONLY` mode:

```bash
istioctl install --set meshConfig.outboundTrafficPolicy.mode=REGISTRY_ONLY
```

Or if you're using the IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

Once this is set, any outbound request to a host that isn't registered in the mesh will fail with a 502 Bad Gateway error.

## Registering External Services with ServiceEntry

With `REGISTRY_ONLY` enabled, you need to explicitly register every external service your workloads need to reach:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: backend
spec:
  hosts:
  - "api.stripe.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: sendgrid-api
  namespace: backend
spec:
  hosts:
  - "api.sendgrid.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Each ServiceEntry tells Istio "this external host is a known destination." Only hosts with a corresponding ServiceEntry will be reachable.

## Restricting Which Services Can Reach External Endpoints

Registering an external service makes it reachable from the entire mesh. That's usually too broad. You don't want every service in your cluster to be able to call the Stripe API. Use AuthorizationPolicy to restrict access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-stripe-access
  namespace: backend
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - to:
    - operation:
        hosts: ["api.stripe.com"]
        ports: ["443"]
  - from:
    - source:
        namespaces: ["backend"]
```

To block other services from reaching Stripe, add a deny policy or rely on the Sidecar resource to limit what each service can see:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: order-service-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: order-service
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

By not including `api.stripe.com` in the order service's Sidecar egress configuration, that service won't even have a route to Stripe in its Envoy configuration.

## Using an Egress Gateway

For tighter control and better observability, route external traffic through a dedicated egress gateway. This gives you a single exit point from the mesh where you can apply policies, collect metrics, and inspect traffic.

First, make sure you have an egress gateway deployed. If you installed Istio with the default profile, you may need to enable it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    egressGateways:
    - name: istio-egressgateway
      enabled: true
```

Create a Gateway resource for the egress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: stripe-egress-gateway
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
    - "api.stripe.com"
    tls:
      mode: PASSTHROUGH
```

Create a VirtualService to route traffic through the egress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: stripe-via-egress
  namespace: backend
spec:
  hosts:
  - "api.stripe.com"
  gateways:
  - mesh
  - istio-system/stripe-egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      sniHosts:
      - "api.stripe.com"
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - istio-system/stripe-egress-gateway
      sniHosts:
      - "api.stripe.com"
    route:
    - destination:
        host: "api.stripe.com"
        port:
          number: 443
```

Now all traffic to `api.stripe.com` goes through the egress gateway. You can monitor it, apply additional policies, and even add mTLS between the workload and the egress gateway.

## Blocking Specific External Destinations

Sometimes you want to allow most external traffic but block specific destinations. You can use ServiceEntry combined with a VirtualService that returns a direct error:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: blocked-destinations
  namespace: istio-system
spec:
  hosts:
  - "malicious-site.example.com"
  ports:
  - number: 80
    name: http
    protocol: HTTP
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: block-malicious-site
  namespace: istio-system
spec:
  hosts:
  - "malicious-site.example.com"
  http:
  - fault:
      abort:
        httpStatus: 403
        percentage:
          value: 100
    route:
    - destination:
        host: "malicious-site.example.com"
```

## Monitoring Egress Traffic

With egress policies in place, monitor what's actually going out. Use Prometheus to track external requests:

```
sum(rate(istio_requests_total{destination_service_namespace="unknown",reporter="source"}[5m])) by (destination_service, source_workload)
```

This shows you which workloads are making external calls and to where. If you see traffic to destinations you haven't registered, something is either misconfigured or a service is trying to reach an unauthorized endpoint.

Enable access logging to capture detailed egress information:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: egress-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "connection.mtls == false"
```

Check the egress gateway logs:

```bash
kubectl logs -l istio=egressgateway -n istio-system -f
```

## Handling DNS for Egress

One subtlety with egress policies is DNS resolution. Even with `REGISTRY_ONLY` mode, pods can still resolve any DNS name; they just can't connect. If you want to also restrict DNS, you'll need to combine Istio with Kubernetes NetworkPolicy or a DNS policy controller.

For ServiceEntry resources with `resolution: DNS`, Istio resolves the hostname and creates routes to the resolved IP addresses. If the external service uses multiple IP addresses or CDN endpoints, Istio handles this automatically.

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cdn-service
  namespace: frontend
spec:
  hosts:
  - "cdn.example.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Egress policies are a critical part of securing your mesh. Without them, you're only controlling half the traffic. Start with `REGISTRY_ONLY` mode, register the external services you actually need, and use egress gateways for sensitive destinations. Your security posture will be much stronger for it.
