# How to Configure TLS for Istio Ingress Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Ingress Gateway, HTTPS, Security

Description: Complete guide to configuring TLS on Istio ingress gateways including certificate management, SNI routing, and automated certificate renewal.

---

The Istio ingress gateway is the front door to your mesh. Every external request passes through it, and getting TLS right here is critical. A misconfigured gateway means either broken HTTPS, security vulnerabilities, or both. This guide covers everything from basic TLS termination to multi-domain setups with automated certificate management.

## Basic TLS Termination

The simplest TLS setup terminates HTTPS at the gateway and forwards plain HTTP to backend services. You need a TLS certificate, a Gateway resource, and a VirtualService.

### Step 1: Create the TLS Certificate Secret

If you already have a certificate and key:

```bash
kubectl create secret tls my-app-tls \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

The secret must be in the same namespace as the ingress gateway pod (typically `istio-system`).

### Step 2: Create the Gateway

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-app-gateway
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
        credentialName: my-app-tls
      hosts:
        - "app.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
```

### Step 3: Create the VirtualService

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-system/my-app-gateway
  http:
    - route:
        - destination:
            host: my-app-service
            port:
              number: 8080
```

### Step 4: Add HTTP to HTTPS Redirect

You probably want to redirect HTTP to HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-app-gateway
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
        credentialName: my-app-tls
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

## Multi-Domain TLS with SNI

When you serve multiple domains, each needs its own certificate. Istio handles this through SNI (Server Name Indication) routing:

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
        credentialName: app1-tls
      hosts:
        - "app1.example.com"
    - port:
        number: 443
        name: https-app2
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: app2-tls
      hosts:
        - "app2.example.com"
```

Each server block on port 443 with a different host will use SNI to select the right certificate.

## Wildcard Certificates

For wildcard domains, create a certificate for `*.example.com`:

```bash
kubectl create secret tls wildcard-tls \
  --cert=wildcard-fullchain.pem \
  --key=wildcard-privkey.pem \
  -n istio-system
```

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: wildcard-gateway
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
        credentialName: wildcard-tls
      hosts:
        - "*.example.com"
```

## Using cert-manager for Automated Certificate Management

Manual certificate management does not scale. Use cert-manager to automatically obtain and renew certificates from Let's Encrypt or other ACME providers.

Install cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

Create a ClusterIssuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: admin@example.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: istio
```

Create a Certificate resource:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-certificate
  namespace: istio-system
spec:
  secretName: app-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "app.example.com"
    - "www.example.com"
```

cert-manager will create the `app-tls-cert` secret in `istio-system`, and your Gateway can reference it:

```yaml
tls:
  mode: SIMPLE
  credentialName: app-tls-cert
```

cert-manager handles renewal automatically before the certificate expires.

## Mutual TLS at the Gateway

For APIs that require client certificate authentication:

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
        name: https-mtls
        protocol: HTTPS
      tls:
        mode: MUTUAL
        credentialName: server-and-ca-certs
      hosts:
        - "api.example.com"
```

The secret for MUTUAL mode needs three components:

```bash
kubectl create secret generic server-and-ca-certs -n istio-system \
  --from-file=tls.crt=server-cert.pem \
  --from-file=tls.key=server-key.pem \
  --from-file=ca.crt=client-ca-cert.pem
```

The `ca.crt` field contains the CA certificate used to validate client certificates.

## Verifying TLS Configuration

Test the gateway with curl:

```bash
# Basic TLS verification
curl -v https://app.example.com

# Check certificate details
echo | openssl s_client -connect <gateway-external-ip>:443 -servername app.example.com 2>/dev/null | openssl x509 -text -noout

# Test mutual TLS
curl --cert client-cert.pem --key client-key.pem https://api.example.com
```

Check the gateway's Envoy configuration:

```bash
istioctl proxy-config listener istio-ingressgateway-xxxx -n istio-system
```

Look for listeners on port 443 with the expected filter chains.

## Troubleshooting Common Issues

**Certificate not found**: Verify the secret exists in the right namespace and has the correct keys:

```bash
kubectl get secret my-app-tls -n istio-system -o yaml
```

The secret should have `tls.crt` and `tls.key` fields for TLS secrets, or `cert`, `key`, and optionally `cacert` for generic secrets.

**SNI routing not working**: Check that each server block has a unique name and the hosts match exactly what clients send as the SNI:

```bash
kubectl logs istio-ingressgateway-xxxx -n istio-system | grep -i "sni\|tls\|secret"
```

**Certificate chain incomplete**: If clients see "unable to verify the first certificate", your `tls.crt` is missing intermediate certificates. Concatenate the server cert and intermediates:

```bash
cat server-cert.pem intermediate-cert.pem > fullchain.pem
```

**Hot reloading certificates**: Istio supports hot reloading of TLS certificates. When you update the Kubernetes secret, the gateway picks up the new certificate without restart. This works automatically with `credentialName`. If using file-mounted secrets, you need the SDS agent to detect the change.

```bash
# Update a certificate
kubectl create secret tls my-app-tls \
  --cert=new-fullchain.pem \
  --key=new-privkey.pem \
  -n istio-system \
  --dry-run=client -o yaml | kubectl apply -f -
```

The gateway will start using the new certificate within a few seconds.

Getting TLS right on the ingress gateway is foundational. Spend the time to set it up properly with automated certificate management, and you will avoid the midnight pages when certificates expire unexpectedly.
