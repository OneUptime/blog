# How to Configure API Gateway mTLS for Service-to-Service Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, mTLS, Security

Description: Configure mutual TLS authentication in API gateways for secure service-to-service communication with certificate management, validation policies, and monitoring strategies.

---

Mutual TLS (mTLS) provides strong authentication for service-to-service communication by requiring both client and server to present valid certificates. Unlike traditional TLS where only the server proves its identity, mTLS ensures both parties are authenticated before exchanging data. API gateways are ideal enforcement points for mTLS policies, centralizing certificate validation and management.

## Understanding mTLS Authentication

In mTLS, the handshake process includes an additional step where the server requests a client certificate. The server validates this certificate against a trusted certificate authority (CA) before allowing the connection. This prevents unauthorized services from accessing your APIs even if they know the correct endpoints and credentials.

mTLS eliminates the need for API keys, tokens, or passwords between services. The certificate itself serves as both authentication and encryption. This is particularly valuable in zero-trust architectures where you cannot rely on network boundaries for security.

## Certificate Management

Before configuring mTLS in your gateway, you need certificates for both the gateway and the services. Use a private CA for internal service-to-service communication.

```bash
# Generate a private CA
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 3650 -key ca-key.pem -out ca-cert.pem \
  -subj "/CN=Internal CA/O=YourOrg"

# Generate gateway server certificate
openssl genrsa -out gateway-key.pem 2048
openssl req -new -key gateway-key.pem -out gateway-csr.pem \
  -subj "/CN=api-gateway.internal"

# Sign with CA
openssl x509 -req -days 365 -in gateway-csr.pem \
  -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
  -out gateway-cert.pem

# Generate client certificate for a service
openssl genrsa -out service-key.pem 2048
openssl req -new -key service-key.pem -out service-csr.pem \
  -subj "/CN=user-service/O=YourOrg"

# Sign with CA
openssl x509 -req -days 365 -in service-csr.pem \
  -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
  -out service-cert.pem
```

Store these certificates as Kubernetes secrets:

```bash
kubectl create secret tls gateway-tls \
  --cert=gateway-cert.pem \
  --key=gateway-key.pem \
  -n gateway

kubectl create secret generic ca-cert \
  --from-file=ca.crt=ca-cert.pem \
  -n gateway

kubectl create secret tls service-tls \
  --cert=service-cert.pem \
  --key=service-key.pem \
  -n backend
```

## NGINX Gateway mTLS Configuration

Configure NGINX to require and validate client certificates.

```nginx
# nginx.conf
http {
  upstream backend_service {
    server backend-service:8080;
  }

  server {
    listen 443 ssl;
    server_name api-gateway.internal;

    # Server certificate
    ssl_certificate /etc/nginx/certs/gateway-cert.pem;
    ssl_certificate_key /etc/nginx/certs/gateway-key.pem;

    # Client certificate validation
    ssl_client_certificate /etc/nginx/certs/ca-cert.pem;
    ssl_verify_client on;
    ssl_verify_depth 2;

    # TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location /api/ {
      # Pass client certificate info to backend
      proxy_set_header X-Client-Cert $ssl_client_cert;
      proxy_set_header X-Client-DN $ssl_client_s_dn;
      proxy_set_header X-Client-Verify $ssl_client_verify;

      proxy_pass http://backend_service;
    }
  }
}
```

Deploy NGINX with mTLS configuration on Kubernetes:

```yaml
# nginx-mtls-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-gateway
  namespace: gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-gateway
  template:
    metadata:
      labels:
        app: nginx-gateway
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 443
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        - name: gateway-tls
          mountPath: /etc/nginx/certs
          readOnly: true
        - name: ca-cert
          mountPath: /etc/nginx/ca
          readOnly: true
      volumes:
      - name: nginx-config
        configMap:
          name: nginx-config
      - name: gateway-tls
        secret:
          secretName: gateway-tls
      - name: ca-cert
        secret:
          secretName: ca-cert
```

## Envoy Proxy mTLS Configuration

Envoy provides comprehensive mTLS capabilities with fine-grained certificate validation.

```yaml
# envoy-mtls-config.yaml
static_resources:
  listeners:
  - name: main_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 443
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_https
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: backend_service
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
          common_tls_context:
            tls_certificates:
            - certificate_chain:
                filename: /etc/envoy/certs/gateway-cert.pem
              private_key:
                filename: /etc/envoy/certs/gateway-key.pem
            validation_context:
              trusted_ca:
                filename: /etc/envoy/ca/ca-cert.pem
          require_client_certificate: true

  clusters:
  - name: backend_service
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend-service
                port_value: 8080
```

## Istio mTLS Configuration

Istio simplifies mTLS by automating certificate provisioning and rotation. Enable strict mTLS for a namespace:

```yaml
# mtls-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: backend
spec:
  mtls:
    mode: STRICT
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-services
  namespace: backend
spec:
  host: "*.backend.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

This configuration enforces mTLS for all services in the backend namespace. Istio automatically provisions certificates using its built-in CA and rotates them before expiration.

## Certificate-Based Authorization

Beyond authentication, use certificate attributes for authorization decisions. Extract the Common Name (CN) or Organization (O) from client certificates to determine access levels.

```yaml
# istio-authz-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: certificate-based-authz
  namespace: backend
spec:
  selector:
    matchLabels:
      app: sensitive-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/frontend/sa/web-service"
        - "cluster.local/ns/backend/sa/api-service"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
  - when:
    - key: source.principal
      values: ["cluster.local/ns/admin/sa/admin-service"]
```

## Kong mTLS Configuration

Kong supports mTLS through the `mtls-auth` plugin. Configure certificate validation for routes or services.

```bash
# Enable mTLS plugin
curl -X POST http://kong-admin:8001/services/backend-service/plugins \
  --data "name=mtls-auth" \
  --data "config.ca_certificates[]=<ca-cert-uuid>"

# Upload CA certificate
curl -X POST http://kong-admin:8001/ca_certificates \
  --form "cert=@ca-cert.pem"
```

Kong configuration for mTLS with certificate whitelisting:

```yaml
# kong-declarative-config.yaml
_format_version: "3.0"

certificates:
- cert: |
    -----BEGIN CERTIFICATE-----
    [Gateway Certificate]
    -----END CERTIFICATE-----
  key: |
    -----BEGIN PRIVATE KEY-----
    [Gateway Key]
    -----END PRIVATE KEY-----

ca_certificates:
- cert: |
    -----BEGIN CERTIFICATE-----
    [CA Certificate]
    -----END CERTIFICATE-----

services:
- name: backend-service
  url: http://backend-service:8080
  routes:
  - name: api-route
    paths:
    - /api
  plugins:
  - name: mtls-auth
    config:
      ca_certificates:
      - <ca-cert-uuid>
      skip_consumer_lookup: false
```

## Client Configuration

Configure clients to present certificates when connecting to the gateway.

```python
# Python client with mTLS
import requests

response = requests.get(
    'https://api-gateway.internal/api/users',
    cert=('/path/to/service-cert.pem', '/path/to/service-key.pem'),
    verify='/path/to/ca-cert.pem'
)
```

```go
// Go client with mTLS
package main

import (
    "crypto/tls"
    "crypto/x509"
    "io/ioutil"
    "net/http"
)

func main() {
    // Load client cert
    cert, err := tls.LoadX509KeyPair("service-cert.pem", "service-key.pem")
    if err != nil {
        panic(err)
    }

    // Load CA cert
    caCert, err := ioutil.ReadFile("ca-cert.pem")
    if err != nil {
        panic(err)
    }
    caCertPool := x509.NewCertPool()
    caCertPool.AppendCertsFromPEM(caCert)

    // Create HTTPS client
    client := &http.Client{
        Transport: &http.Transport{
            TLSClientConfig: &tls.Config{
                RootCAs:      caCertPool,
                Certificates: []tls.Certificate{cert},
            },
        },
    }

    resp, err := client.Get("https://api-gateway.internal/api/users")
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
}
```

## Certificate Rotation

Implement automated certificate rotation to maintain security without service disruption. Use cert-manager for Kubernetes-native certificate management.

```yaml
# cert-manager certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: gateway-cert
  namespace: gateway
spec:
  secretName: gateway-tls
  duration: 2160h  # 90 days
  renewBefore: 360h  # 15 days before expiration
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
  commonName: api-gateway.internal
  dnsNames:
  - api-gateway.internal
  - gateway.gateway.svc.cluster.local
```

Cert-manager automatically renews certificates before expiration and updates the Kubernetes secret. Configure your gateway to watch for secret changes and reload certificates without downtime.

## Monitoring mTLS

Monitor certificate validity and mTLS connection metrics to detect issues before they cause outages.

```yaml
# Prometheus alerts for certificate expiration
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-alerts
spec:
  groups:
  - name: certificates
    rules:
    - alert: CertificateExpiringSoon
      expr: |
        (x509_cert_not_after - time()) / 86400 < 30
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Certificate expiring in {{ $value }} days"

    - alert: MTLSAuthenticationFailures
      expr: |
        rate(envoy_listener_ssl_connection_error[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High rate of mTLS authentication failures"
```

## Conclusion

Mutual TLS provides robust service-to-service authentication without relying on shared secrets or network boundaries. By configuring mTLS at the API gateway level, you centralize certificate validation and enforce consistent security policies across your microservices architecture. Modern gateways like Istio automate much of the certificate management complexity, while traditional reverse proxies like NGINX and Envoy provide fine-grained control over validation policies. Implement monitoring and automated rotation to maintain security without operational overhead.
