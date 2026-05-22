# How to Configure Egress Network Policies with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Network Policies, Kubernetes, Security

Description: Control outbound traffic from your Kubernetes cluster using Istio egress policies, ServiceEntry resources, and egress gateways.

---

Controlling outbound traffic is just as important as controlling inbound traffic, but it often gets overlooked. By default, Istio allows all outbound traffic from the mesh to external services. This means a compromised pod can call any external endpoint, exfiltrate data to any server, or communicate with a command-and-control server. Configuring egress policies with Istio helps close this gap, especially when you route traffic through an egress gateway and enforce network controls outside the sidecar.

## Understanding Istio's Outbound Traffic Mode

Istio has a mesh-wide configuration option called `outboundTrafficPolicy` that controls how the mesh handles traffic to unknown external services. It has two modes:

- `ALLOW_ANY` (default): Lets Envoy proxies pass through traffic to external services even if there's no ServiceEntry defined for them.
- `REGISTRY_ONLY`: Drops traffic to destinations that aren't in Istio's service registry. Istio treats this as a way to detect and control missing ServiceEntry configuration, not as a complete outbound firewall by itself.

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

Once this is set, outbound requests to hosts that aren't registered in the mesh will fail. HTTP requests commonly return a 502 Bad Gateway response, while raw TCP or TLS connections may simply be closed.

## Registering External Services with ServiceEntry

With `REGISTRY_ONLY` enabled, you need to explicitly register every external service your workloads need to reach:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: external-services
spec:
  hosts:
  - "api.stripe.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: sendgrid-api
  namespace: external-services
spec:
  hosts:
  - "api.sendgrid.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Each ServiceEntry tells Istio "this external host is a known destination." In `REGISTRY_ONLY` mode, mesh-routed external traffic needs a corresponding ServiceEntry to be reachable.

## Restricting Which Services Can Reach External Endpoints

Registering an external service makes it visible to the entire mesh by default. That's usually too broad. You don't want every service in your cluster to be configured to call the Stripe API. For direct sidecar egress, use the Sidecar resource to limit which services each workload can see:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: payment-service-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: payment-service
  egress:
  - hosts:
    - "./*"
    - "external-services/api.stripe.com"
    - "istio-system/*"
```

Because the Stripe ServiceEntry is in the separate `external-services` namespace, you can omit that namespace from other workloads' Sidecar configuration:

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

By not including `external-services/*` in the order service's Sidecar egress configuration, that service won't receive routes for those external services in its Envoy configuration. This scopes proxy configuration; for security enforcement against bypasses, route traffic through an egress gateway and combine Istio policy with Kubernetes NetworkPolicy or infrastructure firewall rules.

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
kind: DestinationRule
metadata:
  name: stripe-egressgateway
  namespace: backend
spec:
  host: istio-egressgateway.istio-system.svc.cluster.local
  subsets:
  - name: stripe
---
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
      port: 443
      sniHosts:
      - "api.stripe.com"
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        subset: stripe
        port:
          number: 443
  - match:
    - gateways:
      - istio-system/stripe-egress-gateway
      port: 443
      sniHosts:
      - "api.stripe.com"
    route:
    - destination:
        host: "api.stripe.com"
        port:
          number: 443
```

Now all mesh-routed traffic to `api.stripe.com` goes through the egress gateway. You can monitor it, apply additional policies on the gateway, and even add mTLS between the workload and the egress gateway.

## Blocking Specific External Destinations

Sometimes you want to allow most external traffic but block specific HTTP destinations. You can use ServiceEntry combined with a VirtualService that returns a direct error:

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
  - directResponse:
      status: 403
```

## Monitoring Egress Traffic

With egress policies in place, monitor what's actually going out. Use Prometheus to track external requests:

```text
sum(rate(istio_requests_total{destination_service_namespace="unknown",reporter="source"}[5m])) by (destination_service, source_workload)
```

This shows you which workloads are making passthrough external calls and to where. For registered ServiceEntry traffic, query the registered `destination_service` or the namespace where you created the ServiceEntry. If you see passthrough or blocked destinations you didn't expect, something is either misconfigured or a service is trying to reach an unauthorized endpoint.

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
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Egress policies are a critical part of securing your mesh. Without them, you're only controlling half the traffic. Start with `REGISTRY_ONLY` mode to find and control registered destinations, register the external services you actually need, and use egress gateways plus network-level enforcement for sensitive destinations. Your security posture will be much stronger for it.
