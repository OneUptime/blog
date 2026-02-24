# How to Configure Secure Ingress with TLS Certificates in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Ingress Gateway, HTTPS, Kubernetes, Security

Description: Configure HTTPS ingress in Istio with TLS certificates using Kubernetes secrets and cert-manager for automatic certificate management.

---

Running HTTP in production is not an option anymore. Every service exposed to the internet needs TLS. Istio's ingress gateway handles TLS termination natively, which means you configure your certificates once at the edge and your internal services do not need to deal with TLS at all.

There are several ways to set this up: manually creating Kubernetes secrets with your certificates, using cert-manager for automatic provisioning and renewal, or using Istio's SDS (Secret Discovery Service) for dynamic certificate loading. We will cover all three.

## Option 1: Manual TLS Certificate Setup

If you already have certificate files from a certificate authority (or a self-signed cert for testing), this is the fastest way to get started.

### Create the Kubernetes Secret

```bash
kubectl create secret tls myapp-tls \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

The secret must be in the same namespace as the ingress gateway (usually `istio-system`).

### Configure the Gateway with TLS

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
  namespace: default
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
        credentialName: myapp-tls
      hosts:
        - "myapp.example.com"
```

The `credentialName` field references the Kubernetes secret you just created. The `mode: SIMPLE` means the gateway terminates TLS and forwards unencrypted traffic to backend services.

### Create the VirtualService

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - secure-gateway
  http:
    - route:
        - destination:
            host: myapp-service
            port:
              number: 80
```

```bash
kubectl apply -f secure-gateway.yaml
kubectl apply -f myapp-virtualservice.yaml
```

Test it:

```bash
curl -v https://myapp.example.com/health
```

## Option 2: Automatic Certificates with cert-manager

cert-manager automates certificate provisioning and renewal. It works great with Let's Encrypt for free production certificates.

### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

Wait for it to be ready:

```bash
kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=120s
```

### Create a ClusterIssuer

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: istio
```

```bash
kubectl apply -f cluster-issuer.yaml
```

### Create a Certificate Resource

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: myapp-cert
  namespace: istio-system
spec:
  secretName: myapp-tls-auto
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - myapp.example.com
    - www.myapp.example.com
```

```bash
kubectl apply -f certificate.yaml
```

cert-manager will handle the ACME challenge, get the certificate from Let's Encrypt, and store it in the `myapp-tls-auto` secret in the `istio-system` namespace.

Check the status:

```bash
kubectl get certificate -n istio-system myapp-cert
kubectl describe certificate -n istio-system myapp-cert
```

### Use the Auto-Generated Secret in Your Gateway

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
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
        credentialName: myapp-tls-auto
      hosts:
        - "myapp.example.com"
        - "www.myapp.example.com"
```

When cert-manager renews the certificate, it updates the secret, and Istio picks up the new certificate automatically through SDS. No gateway restart needed.

## Option 3: Mutual TLS (mTLS) at the Ingress

For APIs that require client certificate authentication, use `MUTUAL` TLS mode:

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
        credentialName: myapp-mtls
      hosts:
        - "api.example.com"
```

For mutual TLS, the secret needs both the server certificate and the CA certificate that validates client certificates:

```bash
kubectl create secret generic myapp-mtls \
  --from-file=tls.crt=server-cert.pem \
  --from-file=tls.key=server-key.pem \
  --from-file=ca.crt=ca-cert.pem \
  -n istio-system
```

Clients must present a valid certificate signed by the CA when connecting.

## TLS Configuration Options

The `tls.mode` field supports several modes:

| Mode | Description |
|------|-------------|
| SIMPLE | Standard TLS termination |
| MUTUAL | Require client certificates |
| PASSTHROUGH | Forward TLS traffic without terminating |
| AUTO_PASSTHROUGH | Automatic passthrough for mesh traffic |
| ISTIO_MUTUAL | Istio mutual TLS (for mesh internal) |

### Configuring TLS Version and Cipher Suites

For security compliance, you might need to restrict TLS versions and ciphers:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
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
        credentialName: myapp-tls
        minProtocolVersion: TLSV1_2
        maxProtocolVersion: TLSV1_3
        cipherSuites:
          - ECDHE-RSA-AES256-GCM-SHA384
          - ECDHE-RSA-AES128-GCM-SHA256
      hosts:
        - "myapp.example.com"
```

## Combining HTTP and HTTPS

You can configure the gateway to listen on both ports, typically to redirect HTTP to HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
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
        credentialName: myapp-tls
      hosts:
        - "myapp.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "myapp.example.com"
```

The `httpsRedirect: true` automatically returns a 301 redirect from HTTP to HTTPS.

## Verifying the TLS Configuration

Check that the gateway has loaded the certificate:

```bash
istioctl proxy-config secret <gateway-pod> -n istio-system
```

This shows all certificates loaded in the gateway's Envoy proxy.

Test the TLS handshake:

```bash
openssl s_client -connect myapp.example.com:443 -servername myapp.example.com
```

Check certificate details:

```bash
echo | openssl s_client -connect myapp.example.com:443 -servername myapp.example.com 2>/dev/null | openssl x509 -noout -text
```

## Troubleshooting TLS Issues

**Connection refused on port 443:**

```bash
# Check the gateway is listening
istioctl proxy-config listener <gateway-pod> -n istio-system

# Look for port 443 in the output
```

**Certificate not found:**

```bash
# Check the secret exists in the right namespace
kubectl get secret myapp-tls -n istio-system

# Check the secret has the right keys
kubectl get secret myapp-tls -n istio-system -o jsonpath='{.data}' | jq 'keys'
```

**Certificate mismatch (wrong domain):**

Make sure the certificate's Subject Alternative Names (SANs) match the hostname in your Gateway's `hosts` field.

**Expired certificate:**

```bash
kubectl get secret myapp-tls -n istio-system -o jsonpath='{.data.tls\.crt}' \
  | base64 -d | openssl x509 -noout -dates
```

If using cert-manager, check that renewal is working:

```bash
kubectl get certificaterequest -n istio-system
```

Setting up TLS at the Istio ingress gateway is a one-time job that secures all traffic entering your mesh. Whether you manage certificates manually or use cert-manager for automation, the result is the same: encrypted connections from your users to your gateway, with all the routing and traffic management power of Istio behind it.
