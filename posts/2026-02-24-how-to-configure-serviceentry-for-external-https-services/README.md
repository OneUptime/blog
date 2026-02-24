# How to Configure ServiceEntry for External HTTPS Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, HTTPS, TLS, Kubernetes, Service Mesh

Description: Configure Istio ServiceEntry resources for external HTTPS services with proper TLS handling, SNI routing, and traffic management.

---

Almost every external service your application talks to uses HTTPS these days. Payment processors, cloud provider APIs, SaaS platforms - they all require TLS. Configuring ServiceEntry for HTTPS services has a few nuances compared to plain HTTP that you need to get right, or your connections will fail in confusing ways.

The core challenge is that Istio's sidecar proxy (Envoy) sits in the middle of every outbound connection. When your application makes an HTTPS call, the sidecar needs to know how to handle the TLS traffic. Depending on your setup, the sidecar might pass through the TLS connection as-is, or it might terminate and re-originate TLS.

## Basic HTTPS ServiceEntry

The simplest case is when your application initiates TLS directly and you want Envoy to pass through the encrypted traffic without terminating it:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-https
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

With `protocol: HTTPS`, Envoy recognizes this as TLS traffic and passes it through. It uses the SNI (Server Name Indication) header to route the traffic to the right destination. Your application handles the TLS handshake directly with the external server.

Apply and verify:

```bash
kubectl apply -f stripe-se.yaml

# Test from a pod
kubectl exec deploy/payment-service -c payment-service -- \
  curl -s -o /dev/null -w "%{http_code}" https://api.stripe.com
```

## HTTPS vs TLS Protocol

You will see two protocol options for TLS traffic in Istio - `HTTPS` and `TLS`. They behave differently:

**HTTPS** tells Envoy that the traffic is HTTP over TLS. Envoy can extract the SNI from the ClientHello for routing but does not inspect the HTTP payload (since it is encrypted).

**TLS** is more generic. It tells Envoy this is arbitrary TLS traffic, not necessarily HTTP. Use this for non-HTTP TLS protocols like TLS-encrypted database connections.

```yaml
# For HTTPS APIs
ports:
  - number: 443
    name: https
    protocol: HTTPS

# For generic TLS (databases, custom protocols)
ports:
  - number: 5432
    name: tls-postgres
    protocol: TLS
```

## TLS Origination with ServiceEntry

Sometimes your application sends plain HTTP, and you want the Istio sidecar to upgrade that to HTTPS before it leaves the mesh. This is called TLS origination. It simplifies your application code because you do not need to manage TLS certificates or handle HTTPS connections.

First, create a ServiceEntry that exposes the external service on an HTTP port:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api-tls-origination
spec:
  hosts:
    - api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http-port
      protocol: HTTP
    - number: 443
      name: https-port
      protocol: HTTPS
  resolution: DNS
```

Then create a DestinationRule that tells Envoy to originate TLS for connections to port 443:

```yaml
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
```

Finally, add a VirtualService that redirects HTTP traffic to the HTTPS port:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api-vs
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

Now your application can call `http://api.example.com` and Istio handles the TLS upgrade transparently. The external server sees a proper HTTPS connection.

## Mutual TLS (mTLS) with External Services

Some external services require client certificates (mutual TLS). You need to provide the client certificate and key to Envoy so it can present them during the TLS handshake.

First, create a Kubernetes secret with your client certificate:

```bash
kubectl create secret generic api-client-cert \
  --from-file=cert=client.crt \
  --from-file=key=client.key \
  --from-file=cacert=ca.crt \
  -n istio-system
```

Then configure the DestinationRule with mTLS:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mtls-external-api
spec:
  host: secure-api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/istio/api-client-cert/cert
      privateKey: /etc/istio/api-client-cert/key
      caCertificates: /etc/istio/api-client-cert/cacert
      sni: secure-api.partner.com
```

The corresponding ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: secure-partner-api
spec:
  hosts:
    - secure-api.partner.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## Handling Multiple HTTPS Services

When you have many HTTPS external services, you can group them if they all use port 443:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: saas-dependencies
spec:
  hosts:
    - api.stripe.com
    - api.sendgrid.com
    - api.twilio.com
    - api.datadog.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

This is clean and efficient. Envoy uses the SNI header to route each request to the correct backend, so all these hosts can share one port definition.

## Debugging HTTPS ServiceEntry Issues

HTTPS issues can be tricky to debug because the traffic is encrypted. Here are the most common problems and how to fix them.

**Problem: Connection reset or timeout**

Check if the ServiceEntry is actually being used:

```bash
istioctl proxy-config cluster deploy/my-app | grep stripe
```

If there is no output, the ServiceEntry might be in a different namespace or has `exportTo` restrictions.

**Problem: 503 errors**

This often means DNS resolution failed. Check the resolution type:

```bash
istioctl proxy-config endpoints deploy/my-app | grep stripe
```

If endpoints show as "UNHEALTHY" or missing, there might be a DNS issue.

**Problem: Certificate errors**

If you are doing TLS origination and seeing certificate validation errors, make sure the SNI matches the hostname:

```yaml
trafficPolicy:
  tls:
    mode: SIMPLE
    sni: api.stripe.com
```

**Check Envoy access logs:**

```bash
kubectl logs deploy/my-app -c istio-proxy | grep stripe
```

Look for response flags like `UF` (upstream failure), `UH` (no healthy upstream), or `NR` (no route).

## Monitoring HTTPS External Services

Registered HTTPS services show up in Istio metrics. However, since the traffic is encrypted and Envoy does not terminate TLS (in passthrough mode), you get less detail than with HTTP. You still get:

- Connection counts
- Bytes sent/received
- TCP connection duration
- Success/failure rates

For full HTTP-level metrics (status codes, latency histograms), you need to use TLS origination so Envoy can see the HTTP layer.

```bash
# TCP-level metrics for passthrough HTTPS
istio_tcp_connections_opened_total{destination_service="api.stripe.com"}

# HTTP-level metrics (only with TLS origination)
istio_requests_total{destination_service="api.example.com"}
```

## Practical Recommendations

Use TLS origination when you want full HTTP observability for external HTTPS APIs. This gives you status code breakdowns, latency percentiles, and request/response size metrics.

Use HTTPS passthrough (the default) when simplicity matters or when the external service requires end-to-end encryption that your application manages.

Always set `resolution: DNS` for external HTTPS services unless you have a specific reason to use STATIC. DNS resolution handles IP changes automatically, which is important for cloud-hosted APIs that rotate IP addresses frequently.

Keep your ServiceEntries organized by team or domain. It is much easier to audit your external dependencies when each team's ServiceEntries are in their own namespace with clear naming conventions.
