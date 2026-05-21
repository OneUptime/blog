# How to Handle Egress for Third-Party Payment Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Payment, Security, Kubernetes, PCI Compliance

Description: Configure Istio egress rules for payment service providers like Stripe, PayPal, and Braintree while maintaining PCI compliance and security best practices.

---

Payment integrations are among the most sensitive egress connections in your infrastructure. When your backend calls Stripe, PayPal, Braintree, or any other payment processor, that traffic carries financial data and must be treated with extra care. If you are running your payment services inside an Istio mesh, you need to configure egress correctly to maintain security, ensure PCI compliance, and keep payment flows reliable.

This guide covers how to set up egress for payment services with Istio, including the security considerations specific to payment traffic.

## Why Payment Egress Deserves Special Treatment

Payment traffic is different from other egress traffic for several reasons:

- **PCI DSS requirements**: If you handle cardholder data, PCI DSS requires you to restrict outbound traffic to only what is necessary and monitor all connections.
- **Financial impact of failures**: A misconfigured egress rule that blocks payment traffic means lost revenue.
- **Security sensitivity**: Payment API keys and tokens flow through these connections. You want minimal exposure.
- **Audit requirements**: You need to be able to prove which services communicated with which payment endpoints and when.

## Configuring Egress for Stripe

Stripe uses a few hostnames. The main API endpoint is `api.stripe.com`, and file uploads or downloads use `files.stripe.com`. Webhooks are inbound requests from Stripe's webhook IP addresses to your endpoint, so they are not configured as egress from your mesh. If you use Stripe.js, the frontend talks to `js.stripe.com`, but that is client-side and does not go through your mesh.

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: payment-system
spec:
  hosts:
  - api.stripe.com
  - files.stripe.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
  exportTo:
  - "."
  - "istio-system"
```

Notice that the ServiceEntry is in the `payment-system` namespace and uses `exportTo` for the payment namespace and the egress gateway namespace. This is intentional. By creating the ServiceEntry in a specific namespace and exporting it only where needed, you can scope the visibility using Istio's networking configuration.

## Configuring Egress for PayPal

PayPal has separate endpoints for sandbox and production:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: paypal-api
  namespace: payment-system
spec:
  hosts:
  - api-m.paypal.com
  - api-m.sandbox.paypal.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
  exportTo:
  - "."
  - "istio-system"
```

For production, you should have separate ServiceEntries for sandbox and production environments, with sandbox entries only in your staging cluster.

## Configuring Egress for Braintree

Braintree (owned by PayPal) uses its own set of endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: braintree-api
  namespace: payment-system
spec:
  hosts:
  - api.braintreegateway.com
  - payments.braintree-api.com
  - api.sandbox.braintreegateway.com
  - payments.sandbox.braintree-api.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
  exportTo:
  - "."
  - "istio-system"
```

## Routing Payment Traffic Through the Egress Gateway

For PCI compliance and auditing, route all payment traffic through a dedicated egress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: payment-egress-gateway
  namespace: payment-system
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - api.stripe.com
    - files.stripe.com
    - api-m.paypal.com
    - api-m.sandbox.paypal.com
    - api.braintreegateway.com
    - payments.braintree-api.com
    - api.sandbox.braintreegateway.com
    - payments.sandbox.braintree-api.com
    tls:
      mode: PASSTHROUGH
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: stripe-through-egress
  namespace: payment-system
spec:
  hosts:
  - api.stripe.com
  gateways:
  - mesh
  - payment-egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - api.stripe.com
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - payment-egress-gateway
      port: 443
      sniHosts:
      - api.stripe.com
    route:
    - destination:
        host: api.stripe.com
        port:
          number: 443
      weight: 100
```

## Restricting Which Services Can Reach Payment APIs

Only your payment service should be talking to Stripe or PayPal. Lock this down with an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-egress-only-payment-service
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/payment-system/sa/payment-service"]
    to:
    - operation:
        ports: ["443"]
```

This ensures only the `payment-service` service account in the `payment-system` namespace can send traffic through the egress gateway. To block workloads from bypassing the gateway and calling Stripe directly, also enforce outbound restrictions with Istio outbound traffic policy, Kubernetes NetworkPolicies, or firewall rules.

## Monitoring Payment Egress

Payment traffic needs extra monitoring. With TLS passthrough, Istio cannot see HTTP response codes or request latency for the encrypted payment API calls, so monitor TCP-level signals at the egress gateway:

```yaml
groups:
- name: payment-egress
  rules:
  - alert: PaymentEgressTrafficStopped
    expr: |
      sum(rate(istio_tcp_connections_opened_total{
        reporter="source",
        source_workload="istio-egressgateway",
        destination_service=~"api.stripe.com|api-m.paypal.com|api.braintreegateway.com"
      }[15m])) == 0
    for: 15m
    labels:
      severity: warning
      team: payments
    annotations:
      summary: "No payment egress connections observed recently"
  - alert: UnexpectedPaymentEgressSource
    expr: |
      sum(rate(istio_tcp_connections_opened_total{
        reporter="destination",
        destination_workload="istio-egressgateway",
        source_workload!="payment-service"
      }[5m])) > 0
    for: 2m
    labels:
      severity: critical
      team: payments
    annotations:
      summary: "Unexpected workload sent traffic through the payment egress gateway"
```

## Timeout and Retry Configuration

Payment API calls should have carefully tuned timeouts. You do not want to retry a payment that might have actually succeeded on the first attempt:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: stripe-traffic-policy
  namespace: payment-system
spec:
  host: api.stripe.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
```

Be very careful with retries for payment traffic. An idempotent GET request can be safely retried, but a POST to create a charge should not be retried at the mesh level. Handle payment retries in application code using idempotency keys.

## PCI DSS Considerations

When configuring egress for payment services in a PCI-compliant environment:

1. **Restrict egress destinations**: Only allow connections to known payment processor endpoints. Do not use wildcard ServiceEntries for payment traffic.

2. **Log all connections**: Ensure access logs capture every connection to payment endpoints. These logs should be retained according to your PCI compliance requirements (typically 12 months).

3. **Encrypt everything**: Payment traffic must be encrypted in transit. Using TLS passthrough at the egress gateway ensures the end-to-end TLS connection from your payment service to the payment processor is maintained.

4. **Network segmentation**: Keep your payment services in a dedicated namespace with strict access controls. Use Istio AuthorizationPolicies and Kubernetes NetworkPolicies together.

5. **Regular audits**: Periodically review your ServiceEntries and AuthorizationPolicies to ensure they are still correct. Remove any entries that are no longer needed.

```bash
kubectl get serviceentries -n payment-system
kubectl get authorizationpolicies -n istio-system -l team=payments
```

## Testing Payment Egress Configuration

Before deploying to production, verify your configuration:

```bash
# Test from the payment service pod

kubectl exec -n payment-system deploy/payment-service -- curl -sI https://api.stripe.com/v1/charges

# Test from a non-payment service (should be blocked when outbound policy or NetworkPolicy prevents bypassing the gateway)
kubectl exec -n default deploy/web-app -- curl -sI https://api.stripe.com/v1/charges
```

The first command should reach Stripe, though Stripe may return an authentication-related HTTP status if you do not provide API credentials. The second command should fail when your outbound policy or NetworkPolicy prevents direct egress. Check the egress gateway logs to confirm the traffic routing:

```bash
kubectl logs -n istio-system -l istio=egressgateway -c istio-proxy --tail=20
```

Payment egress configuration requires more care than typical external service access. The combination of strict ServiceEntries, egress gateway routing, AuthorizationPolicies, and dedicated monitoring gives you the control and visibility needed for secure, compliant payment processing.
