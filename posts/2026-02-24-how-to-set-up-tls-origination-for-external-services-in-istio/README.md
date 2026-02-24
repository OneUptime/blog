# How to Set Up TLS Origination for External Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, External Services, ServiceEntry, Security

Description: Step-by-step instructions for configuring Istio to originate TLS connections to external services so your application code can use plain HTTP internally.

---

TLS origination is when the Istio sidecar establishes the TLS connection on behalf of your application. Your app sends plain HTTP to the sidecar, and the sidecar upgrades the connection to HTTPS before it leaves the mesh. This is useful because your application code does not need to handle TLS directly - no certificate management, no trust store configuration, no TLS library dependencies.

It is one of those Istio features that sounds simple but saves real development time, especially when you have dozens of services that all need to talk to external HTTPS APIs.

## When to Use TLS Origination

- Your application makes HTTP calls to external APIs that require HTTPS
- You want to centralize TLS certificate management at the mesh level
- You need to apply Istio policies (retries, timeouts, circuit breaking) to external HTTPS traffic
- You want to monitor external HTTPS traffic through Istio telemetry

## Basic Setup

The setup requires three Istio resources: a ServiceEntry to define the external service, a DestinationRule to configure TLS settings, and optionally a VirtualService for traffic routing.

### Step 1: Create the ServiceEntry

The ServiceEntry tells Istio about the external service. Note that we define port 443 with the HTTPS protocol, but also define port 80 as HTTP for internal traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.example.com
  ports:
    - number: 80
      name: http-port
      protocol: HTTP
    - number: 443
      name: https-port
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

### Step 2: Create the DestinationRule for TLS Origination

The DestinationRule tells the sidecar to originate TLS when connecting to the external service on port 443:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-tls
  namespace: default
spec:
  host: api.example.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 443
        tls:
          mode: SIMPLE
          sni: api.example.com
```

### Step 3: Create a VirtualService to Redirect HTTP to HTTPS

This is the piece that makes TLS origination seamless for your application. The VirtualService redirects traffic sent to port 80 to port 443, where the DestinationRule will handle TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api-vs
  namespace: default
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - port: 80
      route:
        - destination:
            host: api.example.com
            port:
              number: 443
```

### Step 4: Test from Your Application

Now your application can make plain HTTP requests to the external service:

```bash
kubectl exec <your-pod> -c <your-container> -- \
  curl -s http://api.example.com/endpoint
```

Even though your app sends HTTP, the sidecar will initiate a TLS connection to `api.example.com:443`. You can verify this by checking the Envoy access logs:

```bash
kubectl logs <your-pod> -c istio-proxy | grep "api.example.com"
```

You should see outbound connections to port 443 with upstream TLS indicators.

## TLS Origination with Client Certificates (Mutual TLS)

Some external APIs require client certificate authentication. You can configure this in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api-tls
  namespace: default
spec:
  host: api.partner.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 443
        tls:
          mode: MUTUAL
          credentialName: partner-api-client-certs
          sni: api.partner.com
```

Create the Kubernetes secret with the client certificate:

```bash
kubectl create secret generic partner-api-client-certs -n istio-system \
  --from-file=tls.crt=client-cert.pem \
  --from-file=tls.key=client-key.pem \
  --from-file=ca.crt=partner-ca-cert.pem
```

Note that the secret must be in the `istio-system` namespace when using `credentialName` with egress gateways.

## Using an Egress Gateway for TLS Origination

For better security and auditing, route external traffic through an egress gateway instead of directly from the sidecar. The egress gateway becomes the single exit point for traffic leaving the mesh.

First, make sure the egress gateway is installed:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    egressGateways:
      - name: istio-egressgateway
        enabled: true
```

Then configure the routing:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.example.com
  ports:
    - number: 80
      name: http
      protocol: HTTP
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: egress-gateway
spec:
  selector:
    istio: egressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - api.example.com
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api-through-egress
spec:
  hosts:
    - api.example.com
  gateways:
    - mesh
    - egress-gateway
  http:
    - match:
        - gateways:
            - mesh
          port: 80
      route:
        - destination:
            host: istio-egressgateway.istio-system.svc.cluster.local
            port:
              number: 80
    - match:
        - gateways:
            - egress-gateway
          port: 80
      route:
        - destination:
            host: api.example.com
            port:
              number: 443
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-tls
spec:
  host: api.example.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 443
        tls:
          mode: SIMPLE
          sni: api.example.com
```

The traffic flow becomes:

```mermaid
graph LR
    App[Application Pod] -->|HTTP port 80| Sidecar[Envoy Sidecar]
    Sidecar -->|HTTP| EG[Egress Gateway]
    EG -->|HTTPS port 443| Ext[api.example.com]
```

## Handling Multiple External Services

When you have many external services, you can create a pattern with reusable configurations. Here is an approach that handles multiple APIs:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-apis
spec:
  hosts:
    - api.stripe.com
    - api.sendgrid.com
    - api.twilio.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: stripe-tls
spec:
  host: api.stripe.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: api.stripe.com
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: sendgrid-tls
spec:
  host: api.sendgrid.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: api.sendgrid.com
```

## Debugging TLS Origination

If TLS origination is not working, check these things:

```bash
# Verify the ServiceEntry is recognized
istioctl proxy-config cluster <pod-name> | grep "api.example.com"

# Check the route configuration
istioctl proxy-config route <pod-name> -o json | jq '.[] | select(.name | contains("80"))'

# Check Envoy logs for TLS errors
kubectl logs <pod-name> -c istio-proxy | grep -i "tls\|ssl\|certificate"
```

Common issues include SNI mismatch (the `sni` field must match the server's expected hostname), missing CA certificates for custom CAs, and DNS resolution failures for the external hostname.

TLS origination is a practical pattern that keeps your application code cleaner and your TLS management centralized. Set it up once, and your application teams never have to worry about managing TLS connections to external services again.
