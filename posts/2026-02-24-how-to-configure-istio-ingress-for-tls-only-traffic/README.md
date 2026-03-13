# How to Configure Istio Ingress for TLS-Only Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Ingresses, Kubernetes, Security, Service Mesh

Description: How to configure Istio's ingress gateway to only accept TLS-encrypted traffic and reject plaintext HTTP connections.

---

If you are exposing services through Istio's ingress gateway, you should be serving them over TLS. Accepting plaintext HTTP is a security risk and most compliance frameworks require encryption in transit. Configuring Istio to accept only TLS traffic involves setting up the Gateway resource correctly and handling certificate management.

## Basic TLS Gateway Configuration

The Istio Gateway resource defines how traffic enters the mesh. To accept only TLS traffic, configure the Gateway with a TLS server:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
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
      credentialName: my-tls-cert
    hosts:
    - "app.example.com"
```

The `credentialName` references a Kubernetes Secret that contains your TLS certificate and private key:

```bash
# Create the TLS secret
kubectl create secret tls my-tls-cert \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

The secret must be in the same namespace as the ingress gateway (typically `istio-system`).

## Redirecting HTTP to HTTPS

You probably still want to listen on port 80 so that users who type `http://` get redirected to HTTPS instead of seeing an error. Add an HTTP server that redirects:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
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
      credentialName: my-tls-cert
    hosts:
    - "app.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - "app.example.com"
```

The `httpsRedirect: true` setting returns a 301 redirect from HTTP to HTTPS. No application traffic is served over plaintext.

## Using cert-manager for Automatic Certificate Management

Manually managing TLS certificates is error-prone. Use cert-manager with Let's Encrypt to automate certificate issuance and renewal.

First, install cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

Create a ClusterIssuer for Let's Encrypt:

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

Create a Certificate resource that cert-manager will fulfill:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-example-com
  namespace: istio-system
spec:
  secretName: app-example-com-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
  - www.example.com
```

Then reference the generated secret in your Gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
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
      credentialName: app-example-com-tls
    hosts:
    - "app.example.com"
    - "www.example.com"
```

cert-manager automatically renews the certificate before it expires, and Istio's SDS (Secret Discovery Service) picks up the renewed certificate without needing a gateway restart.

## Mutual TLS at the Gateway (Client Certificate Authentication)

For APIs or services that require client certificate authentication, configure the Gateway with MUTUAL TLS mode:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: mtls-gateway
  namespace: istio-system
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
      credentialName: my-tls-cert
    hosts:
    - "api.example.com"
```

For MUTUAL mode, the secret needs three pieces: the server certificate, the server key, and the CA certificate that signed the client certificates:

```bash
# Create secret with CA cert for client verification
kubectl create secret generic my-tls-cert \
  --from-file=tls.crt=server-cert.pem \
  --from-file=tls.key=server-key.pem \
  --from-file=ca.crt=client-ca-cert.pem \
  -n istio-system
```

## TLS Passthrough

If your backend service handles its own TLS termination and you want the gateway to pass through encrypted traffic without decrypting it, use TLS passthrough mode:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: passthrough-gateway
  namespace: istio-system
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
    - "app.example.com"
```

With a corresponding VirtualService using TLS routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-passthrough
spec:
  hosts:
  - "app.example.com"
  gateways:
  - passthrough-gateway
  tls:
  - match:
    - port: 443
      sniHosts:
      - "app.example.com"
    route:
    - destination:
        host: my-app-service
        port:
          number: 443
```

In this mode, the gateway routes based on the SNI header without decrypting the traffic.

## Multiple Domains with Different Certificates

You can host multiple domains on the same gateway, each with its own certificate:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: multi-domain-gateway
  namespace: istio-system
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
      credentialName: app1-cert
    hosts:
    - "app1.example.com"
  - port:
      number: 443
      name: https-app2
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app2-cert
    hosts:
    - "app2.example.com"
```

Istio uses SNI to route the TLS connection to the correct server block and present the right certificate.

## Verifying TLS Configuration

After applying your configuration, verify it is working:

```bash
# Get the ingress gateway IP
INGRESS_IP=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test HTTPS
curl -v https://app.example.com --resolve app.example.com:443:$INGRESS_IP

# Test HTTP redirect
curl -v http://app.example.com --resolve app.example.com:80:$INGRESS_IP
# Should return 301 redirect to HTTPS

# Test with openssl to see the certificate
openssl s_client -connect $INGRESS_IP:443 -servername app.example.com < /dev/null 2>/dev/null | \
  openssl x509 -text -noout | grep -A 2 "Validity"

# Verify no plaintext access
curl -v http://app.example.com:80 --resolve app.example.com:80:$INGRESS_IP 2>&1 | grep "301"
```

## Configuring TLS Minimum Version and Cipher Suites

For compliance requirements, you might need to restrict TLS versions and cipher suites:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
  namespace: istio-system
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
      credentialName: my-tls-cert
      minProtocolVersion: TLSV1_2
      cipherSuites:
      - ECDHE-ECDSA-AES256-GCM-SHA384
      - ECDHE-RSA-AES256-GCM-SHA384
      - ECDHE-ECDSA-AES128-GCM-SHA256
      - ECDHE-RSA-AES128-GCM-SHA256
    hosts:
    - "app.example.com"
```

Verify the TLS version:

```bash
# Test TLS 1.2
openssl s_client -connect $INGRESS_IP:443 -servername app.example.com -tls1_2

# Test TLS 1.1 (should fail if minProtocolVersion is TLSV1_2)
openssl s_client -connect $INGRESS_IP:443 -servername app.example.com -tls1_1
```

Getting TLS-only ingress right is foundational for a secure service mesh. Start with SIMPLE mode and automatic certificate management through cert-manager. Add mutual TLS at the gateway only for services that need client certificate verification. And always test that plaintext connections are properly rejected or redirected.
