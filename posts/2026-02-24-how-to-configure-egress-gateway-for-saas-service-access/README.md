# How to Configure Egress Gateway for SaaS Service Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress Gateway, SaaS, Kubernetes, Service Mesh

Description: Step-by-step guide to configuring Istio egress gateways for secure and controlled access to external SaaS services like Slack, Stripe, and Datadog.

---

Most production applications depend on external SaaS services. Your backend might call Slack for notifications, Stripe for payments, Datadog for monitoring, or Twilio for SMS. When you are running these workloads inside an Istio service mesh, you should route that external traffic through an egress gateway rather than letting every pod reach out to the internet on its own.

This gives you a single choke point where you can apply security policies, log all outbound connections, and control exactly which external services your applications are allowed to talk to.

## The Problem with Uncontrolled Egress

By default, Istio allows all outbound traffic from the mesh. Any pod with a sidecar can reach any external endpoint. This is convenient for development, but in production it creates blind spots:

- You cannot easily audit which services are calling which external APIs.
- A compromised pod could exfiltrate data to an arbitrary external endpoint.
- You have no centralized place to enforce rate limits or access control on outbound traffic.

Setting the mesh outbound policy to `REGISTRY_ONLY` and routing external traffic through an egress gateway solves all three problems.

## Configuring the Mesh

First, make sure your mesh is configured to deny external access by default:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
    accessLogFile: /dev/stdout
  components:
    egressGateways:
    - name: istio-egressgateway
      enabled: true
```

With `REGISTRY_ONLY`, any external host that is not registered as a ServiceEntry will be blocked. This is the foundation of controlled egress.

## Setting Up Egress for Slack API

Slack is a common integration. Your app probably calls `hooks.slack.com` or `api.slack.com`. Here is the full configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: slack-api
  namespace: default
spec:
  hosts:
  - hooks.slack.com
  - api.slack.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: slack-egress-gateway
  namespace: default
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - hooks.slack.com
    - api.slack.com
    tls:
      mode: PASSTHROUGH
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: slack-through-egress
  namespace: default
spec:
  hosts:
  - hooks.slack.com
  - api.slack.com
  gateways:
  - mesh
  - slack-egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - hooks.slack.com
      - api.slack.com
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - slack-egress-gateway
      port: 443
      sniHosts:
      - hooks.slack.com
      - api.slack.com
    route:
    - destination:
        host: hooks.slack.com
        port:
          number: 443
      weight: 100
```

## Adding Datadog API Access

For monitoring services like Datadog, the agents inside your cluster need to reach the Datadog intake endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: datadog-api
  namespace: default
spec:
  hosts:
  - api.datadoghq.com
  - app.datadoghq.com
  - intake.logs.datadoghq.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: datadog-egress-gateway
  namespace: default
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - api.datadoghq.com
    - app.datadoghq.com
    - intake.logs.datadoghq.com
    tls:
      mode: PASSTHROUGH
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: datadog-through-egress
  namespace: default
spec:
  hosts:
  - api.datadoghq.com
  - app.datadoghq.com
  - intake.logs.datadoghq.com
  gateways:
  - mesh
  - datadog-egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - api.datadoghq.com
      - app.datadoghq.com
      - intake.logs.datadoghq.com
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - datadog-egress-gateway
      port: 443
      sniHosts:
      - api.datadoghq.com
    route:
    - destination:
        host: api.datadoghq.com
        port:
          number: 443
      weight: 100
```

## Consolidating Multiple SaaS Services

If you have many SaaS integrations, creating separate Gateway resources for each one becomes tedious. You can consolidate by using a single egress gateway that handles multiple hosts:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: saas-egress-gateway
  namespace: default
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - hooks.slack.com
    - api.slack.com
    - api.datadoghq.com
    - api.stripe.com
    - api.twilio.com
    tls:
      mode: PASSTHROUGH
```

Then use one VirtualService per external host (or group of related hosts) to define the routing. This keeps things manageable while still giving you per-service routing control.

## Access Control per Namespace

A big advantage of the egress gateway approach is that you can lock down which namespaces or workloads are allowed to reach specific SaaS services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-saas-egress
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["backend"]
    to:
    - operation:
        ports: ["443"]
  - from:
    - source:
        namespaces: ["monitoring"]
    to:
    - operation:
        ports: ["443"]
```

This way, only pods in the `backend` and `monitoring` namespaces can reach the outside world through the egress gateway. Everything else gets denied.

## Verifying Traffic Flow

Test from a pod in an allowed namespace:

```bash
kubectl exec -n backend deploy/my-app -- curl -sI https://api.slack.com
```

Then check the egress gateway logs:

```bash
kubectl logs -n istio-system -l istio=egressgateway --tail=30
```

You should see access log entries showing the connection to the Slack API flowing through the gateway.

To verify that pods in non-allowed namespaces are blocked:

```bash
kubectl exec -n frontend deploy/web-app -- curl -sI https://api.slack.com
```

This should time out or return a connection refused error if the authorization policy is working correctly.

## Handling SaaS Services with Many Subdomains

Some SaaS providers use many subdomains. For example, a service might use `us1.api.example.com`, `eu1.api.example.com`, and so on. You can use wildcard hosts in your ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: example-saas-wildcard
  namespace: default
spec:
  hosts:
  - "*.api.example.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: NONE
```

Note that when using wildcards, you need to set `resolution: NONE` because Istio cannot resolve wildcard DNS entries. The actual DNS resolution happens at the application level.

## Practical Tips

**Keep ServiceEntries organized**: Name them clearly and group related services. Use labels to track which team owns which external dependency.

**Log everything**: Make sure `accessLogFile: /dev/stdout` is set in the mesh config. The access logs on the egress gateway are your primary audit trail for outbound traffic.

**Monitor connection counts**: Use Istio's built-in metrics to track how many connections are going through the egress gateway. A sudden spike in outbound connections to an unexpected host is a red flag.

**Use separate egress gateways for different security zones**: For highly sensitive environments, you can deploy multiple egress gateway instances with different labels and route different classes of traffic through each one.

Routing SaaS traffic through an egress gateway takes a bit of upfront configuration, but the visibility and control you get in return is well worth it, especially in production environments where security and compliance matter.
