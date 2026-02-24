# How to Write Gateway YAML (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, YAML, Cheat Sheet, Ingress, Kubernetes

Description: Complete cheat sheet for writing Istio Gateway YAML with examples for HTTP, HTTPS, TLS passthrough, and multi-host configurations.

---

The Istio Gateway resource configures the load balancer (typically the Istio ingress gateway) that sits at the edge of your mesh and handles incoming traffic. It defines which ports, protocols, and hosts the gateway should listen on. You pair it with VirtualService resources that define the routing rules for the traffic entering through the gateway.

Here is a comprehensive reference with ready-to-use YAML examples.

## Basic Structure

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway  # Matches the gateway deployment
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
```

The `selector` field determines which gateway deployment handles this configuration. The default Istio ingress gateway has the label `istio: ingressgateway`.

## HTTP Gateway

Simple HTTP gateway on port 80:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: http-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
```

### HTTP with Multiple Hosts

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: multi-host-gw
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
        - "api.example.com"
        - "dashboard.example.com"
```

### HTTP with Wildcard

```yaml
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
```

## HTTPS Gateway with TLS Termination

The gateway terminates TLS and forwards plain HTTP to backend services:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: https-gateway
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
        credentialName: my-tls-credential
      hosts:
        - "app.example.com"
```

The `credentialName` refers to a Kubernetes secret containing the TLS certificate and private key:

```bash
kubectl create secret tls my-tls-credential \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

The secret must be in the same namespace as the gateway deployment (usually `istio-system`).

## HTTP to HTTPS Redirect

Redirect all HTTP traffic to HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: redirect-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
      tls:
        httpsRedirect: true
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: my-tls-credential
      hosts:
        - "app.example.com"
```

The `httpsRedirect: true` on the HTTP server causes all requests to be redirected to the HTTPS port with a 301 status code.

## Mutual TLS (mTLS) Gateway

Require client certificates for authentication:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: mtls-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: MUTUAL
        credentialName: my-mtls-credential
      hosts:
        - "secure.example.com"
```

For mutual TLS, the secret needs both the server certificate and the CA certificate that signed client certificates:

```bash
kubectl create secret generic my-mtls-credential \
  --from-file=tls.crt=server-cert.pem \
  --from-file=tls.key=server-key.pem \
  --from-file=ca.crt=client-ca-cert.pem \
  -n istio-system
```

## TLS Passthrough

Pass TLS traffic directly to the backend without terminating it at the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: passthrough-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: tls
        protocol: TLS
      tls:
        mode: PASSTHROUGH
      hosts:
        - "backend.example.com"
```

With passthrough, the gateway routes based on SNI (Server Name Indication) and does not decrypt the traffic. The backend service is responsible for TLS termination.

Pair this with a TLS route in VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: passthrough-vs
spec:
  hosts:
    - "backend.example.com"
  gateways:
    - passthrough-gateway
  tls:
    - match:
        - port: 443
          sniHosts:
            - "backend.example.com"
      route:
        - destination:
            host: backend-service
            port:
              number: 443
```

## Auto Passthrough

Used primarily for multi-cluster east-west gateways:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: eastwest-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
    - port:
        number: 15443
        name: tls
        protocol: TLS
      tls:
        mode: AUTO_PASSTHROUGH
      hosts:
        - "*.local"
```

AUTO_PASSTHROUGH routes based on SNI without requiring a VirtualService for each service.

## Multiple TLS Certificates (SNI-Based Routing)

Serve different certificates for different hostnames:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: multi-cert-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-app1
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: app1-tls-credential
      hosts:
        - "app1.example.com"
    - port:
        number: 443
        name: https-app2
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: app2-tls-credential
      hosts:
        - "app2.example.com"
```

Each server block on the same port uses SNI to determine which TLS certificate to present.

## TCP Gateway

For non-HTTP protocols like databases:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: tcp-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 5432
        name: tcp-postgres
        protocol: TCP
      hosts:
        - "*"
```

Pair with a TCP route:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tcp-vs
spec:
  hosts:
    - "*"
  gateways:
    - tcp-gateway
  tcp:
    - route:
        - destination:
            host: postgres-service
            port:
              number: 5432
```

## Custom Gateway Deployment

If you have a custom gateway deployment (not the default istio-ingressgateway), use its labels:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: custom-gateway
spec:
  selector:
    app: my-custom-gateway
    tier: edge
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: custom-tls
      hosts:
        - "api.example.com"
```

## Egress Gateway

For controlling outbound traffic through an egress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: istio-system
spec:
  selector:
    istio: egressgateway
  servers:
    - port:
        number: 443
        name: tls
        protocol: TLS
      tls:
        mode: ISTIO_MUTUAL
      hosts:
        - "external-api.example.com"
```

## TLS Version and Cipher Configuration

Control which TLS versions and ciphers are accepted:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: strict-tls-gateway
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
        credentialName: my-tls-credential
        minProtocolVersion: TLSV1_2
        maxProtocolVersion: TLSV1_3
        cipherSuites:
          - ECDHE-RSA-AES256-GCM-SHA384
          - ECDHE-RSA-AES128-GCM-SHA256
      hosts:
        - "secure.example.com"
```

## Full Production Gateway

A complete production gateway configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    # HTTP redirect to HTTPS
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
        - "api.example.com"
      tls:
        httpsRedirect: true
    # HTTPS for the main app
    - port:
        number: 443
        name: https-app
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: app-tls
        minProtocolVersion: TLSV1_2
      hosts:
        - "app.example.com"
    # HTTPS for the API with mutual TLS
    - port:
        number: 443
        name: https-api
        protocol: HTTPS
      tls:
        mode: MUTUAL
        credentialName: api-mtls
        minProtocolVersion: TLSV1_2
      hosts:
        - "api.example.com"
```

This configuration redirects HTTP to HTTPS, serves the main app with standard HTTPS, and requires client certificates for the API endpoint. Adjust the hosts, credential names, and TLS settings based on your specific requirements.
