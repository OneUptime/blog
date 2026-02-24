# How to Set Up Egress Security Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress Security, Service Mesh, Kubernetes, Network Policy

Description: How to control and secure outbound traffic from your Istio mesh using egress policies, ServiceEntries, and authorization rules.

---

Controlling outbound traffic is just as important as controlling inbound traffic. Without egress controls, a compromised pod can communicate with any external server, exfiltrate data, download malware, or establish command-and-control channels. Istio provides several mechanisms to lock down egress traffic, from simple allow-lists to fine-grained authorization policies.

By default, Istio allows all outbound traffic from the mesh. This permissive default makes initial adoption easier but leaves a significant security gap. Moving to a restrictive egress policy is one of the most impactful security improvements you can make.

## Understanding Outbound Traffic Policy

Istio has two outbound traffic modes:

```yaml
meshConfig:
  outboundTrafficPolicy:
    mode: ALLOW_ANY  # default
```

- `ALLOW_ANY` - All outbound traffic is allowed. Unknown destinations pass through the sidecar without restriction.
- `REGISTRY_ONLY` - Only traffic to services in the Istio service registry (Kubernetes services + ServiceEntries) is allowed. Everything else is blocked.

To switch to `REGISTRY_ONLY`:

```bash
helm upgrade istiod istio/istiod -n istio-system \
  --set meshConfig.outboundTrafficPolicy.mode=REGISTRY_ONLY
```

Or edit the mesh config directly:

```bash
kubectl edit configmap istio -n istio-system
```

```yaml
data:
  mesh: |
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

After setting `REGISTRY_ONLY`, pods can only reach:
- Other services in the Kubernetes cluster
- External services defined in ServiceEntries

Any attempt to reach an undefined external service gets a 502 Bad Gateway response.

## Creating ServiceEntries for Allowed External Services

Once you block unknown outbound traffic, you need to explicitly allow the external services your applications depend on:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allow-google-apis
  namespace: default
spec:
  hosts:
    - "*.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: NONE
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allow-github
  namespace: default
spec:
  hosts:
    - "github.com"
    - "api.github.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
```

Each ServiceEntry is an explicit declaration: "services in this namespace are allowed to reach these external hosts."

## Namespace-Scoped Egress Control

ServiceEntries can be namespace-scoped, giving you fine-grained control over which namespaces can access which external services:

```yaml
# Only the payments namespace can access Stripe
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allow-stripe
  namespace: payments
spec:
  hosts:
    - "api.stripe.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  exportTo:
    - "."
```

The `exportTo: ["."]` makes this ServiceEntry visible only within the `payments` namespace. Other namespaces can't reach `api.stripe.com` unless they have their own ServiceEntry for it.

```yaml
# Only the notifications namespace can access Twilio
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allow-twilio
  namespace: notifications
spec:
  hosts:
    - "api.twilio.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  exportTo:
    - "."
```

## Egress Gateway for Centralized Control

For tighter control, route all egress traffic through a dedicated egress gateway. This gives you a single choke point for monitoring and filtering outbound traffic.

Deploy an egress gateway:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    egressGateways:
      - name: istio-egressgateway
        enabled: true
```

Route traffic through the egress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - "api.external.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: default
spec:
  selector:
    istio: egressgateway
  servers:
    - port:
        number: 443
        name: tls
        protocol: TLS
      tls:
        mode: PASSTHROUGH
      hosts:
        - "api.external.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: egress-route
  namespace: default
spec:
  hosts:
    - "api.external.com"
  gateways:
    - mesh
    - egress-gateway
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
            - egress-gateway
          port: 443
          sniHosts:
            - "api.external.com"
      route:
        - destination:
            host: "api.external.com"
            port:
              number: 443
```

With this setup, all traffic to `api.external.com` first goes to the egress gateway, then from the egress gateway to the external service. You can apply authorization policies, monitoring, and logging at the egress gateway.

## Authorization Policies for Egress

Control which services can make outbound requests:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: egress-authz
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/payments/sa/payment-processor
      to:
        - operation:
            ports:
              - "443"
```

This allows only the `payment-processor` service account to use the egress gateway on port 443. All other egress attempts are denied.

## Blocking Specific Destinations

Sometimes you want to allow most outbound traffic but block specific dangerous destinations:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: blocked-domains
  namespace: default
spec:
  hosts:
    - "malware-site.com"
    - "known-bad-domain.com"
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
    - number: 443
      name: https
      protocol: TLS
  resolution: NONE
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: block-bad-domains
  namespace: default
spec:
  hosts:
    - "malware-site.com"
    - "known-bad-domain.com"
  http:
    - fault:
        abort:
          httpStatus: 403
          percentage:
            value: 100
      route:
        - destination:
            host: malware-site.com
```

This creates a ServiceEntry for the blocked domains and then uses fault injection to return 403 for all requests.

## TLS Origination at the Egress

For external HTTPS services, you can have the egress gateway handle TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: egress-tls
  namespace: default
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

This lets application code make plain HTTP requests to the ServiceEntry, and the egress gateway upgrades the connection to HTTPS. This simplifies application configuration and centralizes TLS certificate management.

## Monitoring Egress Traffic

Track what's leaving your mesh:

```bash
# Check outbound connections from a specific pod
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "upstream_cx_total"

# Check egress gateway stats
kubectl exec -it <egress-gateway-pod> -c istio-proxy -n istio-system -- \
  pilot-agent request GET stats | grep "cluster.*external"
```

Enable access logging on the egress gateway to get a full log of outbound requests:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: egress-logging
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  accessLogging:
    - providers:
        - name: envoy
```

## Testing Egress Policies

Verify your egress controls work:

```bash
# Should succeed (allowed external service)
kubectl exec -it <pod> -n payments -- \
  curl -s -o /dev/null -w "%{http_code}" https://api.stripe.com

# Should fail (not in ServiceEntry registry)
kubectl exec -it <pod> -n default -- \
  curl -s -o /dev/null -w "%{http_code}" https://random-site.com

# Should fail (wrong namespace)
kubectl exec -it <pod> -n staging -- \
  curl -s -o /dev/null -w "%{http_code}" https://api.stripe.com
```

Egress security in Istio is about moving from "everything is allowed" to "only explicitly permitted traffic leaves the mesh." Switch to `REGISTRY_ONLY`, create ServiceEntries for legitimate external dependencies, scope them to the right namespaces, and use an egress gateway for centralized control and auditing. This significantly reduces the attack surface of your cluster.
