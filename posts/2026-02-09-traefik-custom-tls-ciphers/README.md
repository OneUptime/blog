# How to Configure Traefik Ingress Controller with Custom TLS Options and Ciphers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Traefik, TLS

Description: Master TLS configuration in Traefik Ingress Controller including custom cipher suites, protocol versions, client certificate authentication, and advanced security options for production Kubernetes environments.

---

Traefik is a modern, dynamic Ingress controller that provides extensive TLS configuration options. Proper TLS configuration is critical for security, compliance, and performance. This guide explores how to configure custom TLS options, cipher suites, protocol versions, and implement advanced TLS features in Traefik.

## Understanding Traefik TLS Configuration

Traefik uses TLSOption and TLSStore Custom Resource Definitions to manage TLS settings. These resources allow you to:

- Configure allowed TLS versions
- Specify cipher suites
- Enable client certificate authentication
- Configure ALPN protocols
- Set minimum and maximum TLS versions
- Define default certificates

TLSOptions can be applied globally or to specific routers.

## Installing Traefik

Install Traefik with CRD support:

```bash
# Add Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Install Traefik
helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set ports.web.redirectTo.port=websecure \
  --set ports.websecure.tls.enabled=true
```

Verify installation:

```bash
kubectl get pods -n traefik
kubectl get crd | grep traefik
```

## Basic TLS Configuration

Start with a simple TLS configuration.

### Default TLS Options

Create a basic TLSOption:

```yaml
# basic-tls-options.yaml
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: default
  namespace: traefik
spec:
  # Minimum TLS version
  minVersion: VersionTLS12

  # Allowed cipher suites (recommended secure ciphers)
  cipherSuites:
    - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305
    - TLS_AES_128_GCM_SHA256
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256

  # Prefer server cipher suites
  preferServerCipherSuites: true

  # ALPN protocols
  alpnProtocols:
    - h2
    - http/1.1
```

Apply TLS configuration:

```bash
kubectl apply -f basic-tls-options.yaml
```

### Using TLS in IngressRoute

Configure an IngressRoute with TLS:

```yaml
# tls-ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: secure-app
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: app-service
          port: 80
  tls:
    secretName: app-tls-cert
    options:
      name: default
      namespace: traefik
```

## Strict TLS Configuration

Implement strict TLS settings for maximum security.

### TLS 1.3 Only Configuration

Configure TLS 1.3 with modern ciphers:

```yaml
# strict-tls-options.yaml
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: strict-tls13
  namespace: traefik
spec:
  # TLS 1.3 only
  minVersion: VersionTLS13

  # TLS 1.3 cipher suites
  cipherSuites:
    - TLS_AES_128_GCM_SHA256
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256

  # Curve preferences
  curvePreferences:
    - CurveP521
    - CurveP384

  # ALPN with HTTP/2 preference
  alpnProtocols:
    - h2
```

Apply to IngressRoute:

```yaml
# strict-ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: strict-secure-app
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`secure.example.com`)
      kind: Rule
      services:
        - name: secure-service
          port: 443
  tls:
    secretName: secure-tls-cert
    options:
      name: strict-tls13
      namespace: traefik
```

### PCI DSS Compliant Configuration

Configure TLS for PCI DSS compliance:

```yaml
# pci-dss-tls-options.yaml
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: pci-dss-compliant
  namespace: traefik
spec:
  # TLS 1.2 minimum (PCI DSS requirement)
  minVersion: VersionTLS12

  # Strong cipher suites only
  cipherSuites:
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    - TLS_AES_256_GCM_SHA384
    - TLS_AES_128_GCM_SHA256

  preferServerCipherSuites: true

  curvePreferences:
    - CurveP384
    - CurveP256

  # Disable client renegotiation
  sniStrict: true
```

## Client Certificate Authentication

Implement mutual TLS (mTLS) with client certificates.

### Basic mTLS Configuration

Configure client certificate validation:

```yaml
# mtls-options.yaml
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: mtls-required
  namespace: traefik
spec:
  minVersion: VersionTLS12

  # Client authentication
  clientAuth:
    # Require client certificate
    clientAuthType: RequireAndVerifyClientCert

    # CA certificates for client validation
    secretNames:
      - client-ca-cert

  cipherSuites:
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_AES_256_GCM_SHA384
```

Create CA certificate secret:

```bash
# Create secret with CA certificate
kubectl create secret generic client-ca-cert \
  --from-file=tls.ca=ca.crt \
  --namespace=traefik
```

Apply mTLS to IngressRoute:

```yaml
# mtls-ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: mtls-app
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`mtls.example.com`)
      kind: Rule
      services:
        - name: secure-backend
          port: 443
  tls:
    secretName: server-tls-cert
    options:
      name: mtls-required
      namespace: traefik
```

### Optional Client Certificate

Allow but don't require client certificates:

```yaml
# optional-mtls-options.yaml
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: mtls-optional
  namespace: traefik
spec:
  minVersion: VersionTLS12

  clientAuth:
    # Request but don't require client cert
    clientAuthType: RequestClientCert
    secretNames:
      - client-ca-cert

  cipherSuites:
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_AES_256_GCM_SHA384
```

## Multiple TLS Configurations

Use different TLS options for different services.

### Per-Environment TLS Options

Different security levels per environment:

```yaml
# Production - strict TLS
---
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: production-tls
  namespace: traefik
spec:
  minVersion: VersionTLS13
  cipherSuites:
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256
---
# Staging - balanced TLS
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: staging-tls
  namespace: traefik
spec:
  minVersion: VersionTLS12
  cipherSuites:
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_AES_256_GCM_SHA384
---
# Development - permissive TLS
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: development-tls
  namespace: traefik
spec:
  minVersion: VersionTLS11
```

Apply to different IngressRoutes:

```yaml
# production-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: prod-app
  namespace: production
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: prod-service
          port: 80
  tls:
    secretName: prod-tls-cert
    options:
      name: production-tls
      namespace: traefik
---
# staging-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: staging-app
  namespace: staging
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`staging.example.com`)
      kind: Rule
      services:
        - name: staging-service
          port: 80
  tls:
    secretName: staging-tls-cert
    options:
      name: staging-tls
      namespace: traefik
```

## TLS Store Configuration

Configure default certificates and options.

### Default TLS Store

Set default certificate for all TLS routes:

```yaml
# tls-store.yaml
apiVersion: traefik.io/v1alpha1
kind: TLSStore
metadata:
  name: default
  namespace: traefik
spec:
  # Default certificate
  defaultCertificate:
    secretName: default-tls-cert

  # Default generated certificate
  defaultGeneratedCert:
    resolver: myresolver
    domain:
      main: "*.example.com"
      sans:
        - "example.com"
```

## SNI Routing and Passthrough

Configure SNI-based routing and TLS passthrough.

### TLS Passthrough

Pass TLS traffic directly to backend:

```yaml
# tls-passthrough.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRouteTCP
metadata:
  name: tls-passthrough
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: HostSNI(`passthrough.example.com`)
      services:
        - name: tls-backend
          port: 443
  tls:
    passthrough: true
```

### SNI Routing

Route based on SNI hostname:

```yaml
# sni-routing.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRouteTCP
metadata:
  name: sni-router
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: HostSNI(`app1.example.com`)
      services:
        - name: app1-service
          port: 443
  tls:
    secretName: app1-tls-cert
    options:
      name: default
      namespace: traefik
---
apiVersion: traefik.io/v1alpha1
kind: IngressRouteTCP
metadata:
  name: sni-router-2
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: HostSNI(`app2.example.com`)
      services:
        - name: app2-service
          port: 443
  tls:
    secretName: app2-tls-cert
    options:
      name: strict-tls13
      namespace: traefik
```

## Testing TLS Configuration

Test TLS settings with OpenSSL and other tools:

```bash
# Test TLS connection
openssl s_client -connect app.example.com:443 -servername app.example.com

# Check supported TLS versions
nmap --script ssl-enum-ciphers -p 443 app.example.com

# Test specific TLS version
openssl s_client -tls1_2 -connect app.example.com:443
openssl s_client -tls1_3 -connect app.example.com:443

# Test cipher suites
nmap --script ssl-enum-ciphers -p 443 app.example.com

# Verify client certificate requirement
curl https://mtls.example.com/ --cert client.crt --key client.key

# Check certificate chain
openssl s_client -showcerts -connect app.example.com:443
```

Use testssl.sh for comprehensive testing:

```bash
# Clone testssl.sh
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh

# Run comprehensive TLS test
./testssl.sh app.example.com

# Test specific cipher
./testssl.sh --cipher TLS_AES_256_GCM_SHA384 app.example.com
```

## Monitoring TLS

Check Traefik logs for TLS issues:

```bash
kubectl logs -n traefik -l app.kubernetes.io/name=traefik --follow
```

Enable TLS debug logging:

```yaml
# traefik-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    log:
      level: DEBUG
```

View TLS metrics:

```bash
# Port-forward to Traefik dashboard
kubectl port-forward -n traefik svc/traefik 9000:9000

# Access metrics
curl http://localhost:9000/metrics | grep tls
```

## Troubleshooting

Common TLS issues:

**Cipher suite mismatch**: Verify supported ciphers:
```bash
openssl ciphers -v | grep TLS_AES_256_GCM_SHA384
```

**Client certificate rejection**: Check CA certificate:
```bash
openssl verify -CAfile ca.crt client.crt
```

**TLS version not supported**: Test specific version:
```bash
curl --tlsv1.3 https://app.example.com/
```

**Certificate not found**: Verify secret exists:
```bash
kubectl get secret app-tls-cert -n default
kubectl describe secret app-tls-cert -n default
```

## Conclusion

Traefik provides comprehensive TLS configuration options through TLSOption and TLSStore CRDs. By properly configuring TLS versions, cipher suites, and client authentication, you can ensure your Kubernetes applications meet security and compliance requirements. Always use TLS 1.2 or higher in production, prefer modern cipher suites, and implement mTLS for highly sensitive applications. Regular testing with tools like testssl.sh helps maintain secure TLS configurations as standards evolve.
