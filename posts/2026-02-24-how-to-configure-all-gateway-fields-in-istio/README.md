# How to Configure All Gateway Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, Ingresses, TLS, Kubernetes, Networking

Description: A thorough reference for every field in the Istio Gateway resource including server configurations, TLS modes, port settings, and selector options.

---

The Istio Gateway resource describes a load balancer that sits at the edge of your mesh and handles incoming or outgoing connections. It works hand-in-hand with VirtualService to route external traffic to your services. While people tend to use only the basic fields, there is quite a bit more you can configure. This post covers every field available.

## Top-Level Structure

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
```

The two top-level fields under `spec` are `selector` and `servers`. The selector picks which gateway workload pods should apply this configuration. In a default Istio installation, the ingress gateway has the label `istio: ingressgateway`, so that is what you typically use. You can create custom gateway deployments and use different labels.

## The Selector Field

```yaml
spec:
  selector:
    istio: ingressgateway
    custom-label: my-value
```

The selector is a simple label map. It matches against the labels on gateway pods. If you have multiple gateway deployments in your cluster (say, one for public traffic and one for internal traffic), you would use different selectors:

```yaml
# Public gateway
spec:
  selector:
    istio: public-gateway

# Internal gateway
spec:
  selector:
    istio: internal-gateway
```

One important detail: the gateway pod must actually exist and have those labels. Istio will not create the pod for you. In most setups, you deploy the gateway using the IstioOperator or Helm, and then reference it here.

## Server Configuration

Each server block represents a set of ports and hosts that the gateway should listen on. You can have multiple servers in a single Gateway resource.

### Port Settings

```yaml
spec:
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
        targetPort: 8443
```

The `port` block has these fields:

- `number` - the port the gateway listens on externally
- `name` - a label for the port (must be unique within the gateway)
- `protocol` - determines how Envoy processes the traffic
- `targetPort` - the actual port on the gateway pod (if different from `number`)

Supported protocols include: `HTTP`, `HTTPS`, `GRPC`, `HTTP2`, `MONGO`, `TCP`, `TLS`. The protocol you choose affects what Envoy features are available. For example, `HTTP` enables all HTTP-level features like routing and header manipulation, while `TCP` gives you only L4 routing.

### Hosts

```yaml
spec:
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
        - "*.staging.example.com"
        - "bookinfo/reviews.example.com"
```

The `hosts` field specifies which hostnames this server block handles. A few things to know:

- You can use exact hostnames or wildcards with `*` prefix
- You can namespace-qualify hosts with the format `namespace/host` to restrict which VirtualServices can bind to this gateway
- `*/host` means any namespace can bind
- A plain hostname with no namespace prefix is equivalent to `*/host`

This namespace scoping is actually a really useful security feature. If you run a shared gateway, you can prevent tenants from hijacking each other's hostnames:

```yaml
servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
      - "team-a/app-a.example.com"
      - "team-b/app-b.example.com"
```

### TLS Configuration

The TLS section is where things get interesting. There are several modes and a bunch of associated fields:

```yaml
spec:
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "secure.example.com"
      tls:
        mode: SIMPLE
        credentialName: my-tls-secret
```

The `mode` field supports:

- `PASSTHROUGH` - TLS is not terminated; the encrypted traffic is forwarded as-is
- `SIMPLE` - standard one-way TLS termination
- `MUTUAL` - mutual TLS where clients must present a certificate
- `AUTO_PASSTHROUGH` - similar to PASSTHROUGH but the SNI determines the destination without needing a VirtualService
- `ISTIO_MUTUAL` - mutual TLS using Istio's internally managed certificates
- `OPTIONAL_MUTUAL` - like MUTUAL but does not reject clients without certificates

Here is a full TLS block with all fields:

```yaml
tls:
  mode: MUTUAL
  credentialName: my-tls-secret
  serverCertificate: /etc/certs/server.pem
  privateKey: /etc/certs/server-key.pem
  caCertificates: /etc/certs/ca.pem
  httpsRedirect: false
  minProtocolVersion: TLSV1_2
  maxProtocolVersion: TLSV1_3
  cipherSuites:
    - ECDHE-RSA-AES256-GCM-SHA384
    - ECDHE-RSA-AES128-GCM-SHA256
  subjectAltNames:
    - client.example.com
  verifyCertificateSpki:
    - "dGVzdA=="
  verifyCertificateHash:
    - "abc123..."
```

When using `credentialName`, Istio reads the TLS certificate from a Kubernetes secret in the same namespace as the gateway workload. This is the recommended approach because it does not require mounting files. The secret should be of type `kubernetes.io/tls` or `generic` with `tls.crt`, `tls.key`, and optionally `ca.crt` keys.

The file-based options (`serverCertificate`, `privateKey`, `caCertificates`) are the older approach and require the files to be mounted into the gateway pod.

`httpsRedirect` is a boolean. When set to true on an HTTP server, it sends a 301 redirect to the HTTPS version of the URL:

```yaml
servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
      - "*.example.com"
    tls:
      httpsRedirect: true
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
      - "*.example.com"
    tls:
      mode: SIMPLE
      credentialName: example-tls
```

`minProtocolVersion` and `maxProtocolVersion` control which TLS versions are accepted. Options are `TLSV1_0`, `TLSV1_1`, `TLSV1_2`, and `TLSV1_3`. You should generally set the minimum to at least `TLSV1_2`.

The `cipherSuites` list restricts which ciphers the gateway accepts. If left empty, Envoy uses its default cipher list, which is generally fine for most use cases.

`subjectAltNames` validates client certificates in MUTUAL mode. Only clients whose certificate SAN matches one of these values will be allowed.

`verifyCertificateSpki` and `verifyCertificateHash` provide certificate pinning. SPKI is the base64-encoded SHA-256 hash of the certificate's Subject Public Key Info. This is useful for additional verification beyond CA trust.

### Bind Address

```yaml
spec:
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
      bind: 0.0.0.0
      name: http-server
      defaultEndpoint: 127.0.0.1:8080
```

The `bind` field specifies the IP address the listener should bind to. The default is `0.0.0.0`. The `name` field gives the server a display name. The `defaultEndpoint` is for internal use with sidecar-based gateway deployments.

## Multiple Servers Example

A realistic gateway often has multiple server blocks for different protocols and domains:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: production-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
      tls:
        httpsRedirect: true
    - port:
        number: 443
        name: https-app
        protocol: HTTPS
      hosts:
        - "app.example.com"
      tls:
        mode: SIMPLE
        credentialName: app-tls
        minProtocolVersion: TLSV1_2
    - port:
        number: 443
        name: https-api
        protocol: HTTPS
      hosts:
        - "api.example.com"
      tls:
        mode: MUTUAL
        credentialName: api-mtls
        minProtocolVersion: TLSV1_2
    - port:
        number: 3306
        name: mysql
        protocol: TCP
      hosts:
        - "db.internal.example.com"
    - port:
        number: 15443
        name: tls-passthrough
        protocol: TLS
      hosts:
        - "legacy.example.com"
      tls:
        mode: PASSTHROUGH
```

This gateway handles HTTP-to-HTTPS redirect on port 80, HTTPS with simple TLS for the app subdomain, HTTPS with mutual TLS for the API subdomain, raw TCP for a database, and TLS passthrough for a legacy service.

Each server block is independent and can have completely different TLS settings and host lists. The gateway takes care of multiplexing all of these onto the same load balancer IP.

Understanding every Gateway field gives you full control over how traffic enters your mesh. Combined with VirtualService routing rules, you can build sophisticated ingress configurations that handle anything from simple web apps to complex multi-protocol service architectures.
