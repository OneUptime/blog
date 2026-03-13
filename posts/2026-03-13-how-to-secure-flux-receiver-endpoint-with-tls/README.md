# How to Secure Flux Receiver Endpoint with TLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhook, Security, TLS, Certificates, Cert-Manager

Description: Learn how to secure your Flux Receiver webhook endpoint with TLS encryption using cert-manager, self-signed certificates, and manual certificate management.

---

Exposing a Flux Receiver endpoint over plain HTTP sends webhook payloads, including authentication tokens and signatures, across the network in clear text. Any intermediary can read or tamper with the data. TLS encryption ensures that the communication between the webhook provider and your cluster is confidential and integrity-protected.

This guide covers multiple approaches to adding TLS to your Flux Receiver endpoint, from automated certificate management with cert-manager to manual certificate provisioning.

## Prerequisites

- A Kubernetes cluster with Flux CD installed and bootstrapped.
- A Flux Receiver configured and exposed through an Ingress or Gateway API resource.
- `kubectl` and `flux` CLI tools available.
- A domain name pointing to your Ingress controller or Gateway external IP.
- For automated certificates: cert-manager installed in the cluster.

Check that cert-manager is running (if using automated certificates):

```bash
kubectl get pods -n cert-manager
```

Check that your Receiver is configured:

```bash
kubectl -n flux-system get receiver
```

## Option 1: Automated TLS with cert-manager and Let's Encrypt

This is the recommended approach for production environments.

### Step 1: Create a ClusterIssuer

Define a ClusterIssuer that uses Let's Encrypt:

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    # Use the production Let's Encrypt server
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      # HTTP-01 challenge solver using the ingress controller
      - http01:
          ingress:
            ingressClassName: nginx
```

Apply it:

```bash
kubectl apply -f cluster-issuer.yaml
```

For DNS-01 challenges (useful when the endpoint is not publicly accessible during provisioning), use a DNS solver instead:

```yaml
    solvers:
      - dns01:
          cloudflare:
            email: admin@example.com
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
```

### Step 2: Annotate the Ingress for Automatic Certificate Provisioning

Add the cert-manager annotation to your Ingress:

```yaml
# ingress-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-receiver
  namespace: flux-system
  annotations:
    # Tell cert-manager to issue a certificate
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Force HTTPS redirect
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Restrict to POST only
    nginx.ingress.kubernetes.io/configuration-snippet: |
      if ($request_method != POST) {
        return 405;
      }
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - flux-webhook.example.com
      # cert-manager will create and populate this secret
      secretName: flux-webhook-tls
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /hook/
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
```

Apply it:

```bash
kubectl apply -f ingress-tls.yaml
```

cert-manager will automatically create a Certificate resource, perform the ACME challenge, and store the resulting certificate and private key in the `flux-webhook-tls` secret.

### Step 3: Verify the Certificate

Check the certificate status:

```bash
kubectl -n flux-system get certificate flux-webhook-tls
```

The `READY` column should show `True`. For more details:

```bash
kubectl -n flux-system describe certificate flux-webhook-tls
```

Verify the certificate chain with openssl:

```bash
echo | openssl s_client -connect flux-webhook.example.com:443 -servername flux-webhook.example.com 2>/dev/null | openssl x509 -noout -subject -dates -issuer
```

## Option 2: Manual TLS Certificate

If you cannot use cert-manager, you can create the TLS secret manually.

### Step 1: Obtain a Certificate

Get a certificate from your certificate authority. You will need:

- The certificate file (for example `tls.crt`).
- The private key file (for example `tls.key`).
- The CA certificate chain if applicable.

### Step 2: Create the TLS Secret

```bash
kubectl -n flux-system create secret tls flux-webhook-tls \
  --cert=tls.crt \
  --key=tls.key
```

If you have a CA bundle that needs to be included:

```bash
# Concatenate the certificate and CA chain
cat tls.crt ca-chain.crt > fullchain.crt

kubectl -n flux-system create secret tls flux-webhook-tls \
  --cert=fullchain.crt \
  --key=tls.key
```

### Step 3: Reference the Secret in the Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-receiver
  namespace: flux-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: flux-webhook-tls
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /hook/
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
```

### Step 4: Set Up Certificate Renewal Reminders

Manual certificates expire. Track the expiration date:

```bash
kubectl -n flux-system get secret flux-webhook-tls -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -enddate
```

Set a calendar reminder to renew before expiration.

## Option 3: Self-Signed Certificates for Development

For development or testing environments where you do not need a publicly trusted certificate:

### Step 1: Generate a Self-Signed Certificate

```bash
# Generate a self-signed certificate valid for 365 days
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout tls.key \
  -out tls.crt \
  -subj "/CN=flux-webhook.example.com" \
  -addext "subjectAltName=DNS:flux-webhook.example.com"
```

### Step 2: Create the Secret and Ingress

```bash
kubectl -n flux-system create secret tls flux-webhook-tls \
  --cert=tls.crt \
  --key=tls.key
```

Use the same Ingress configuration as Option 2.

### Step 3: Configure Webhook Provider to Skip Verification

Most webhook providers allow disabling SSL verification for development. On GitHub, uncheck **Enable SSL verification** in the webhook settings. Note that this should never be done in production.

## TLS with Gateway API

If you use the Gateway API instead of Ingress, TLS is configured on the Gateway listener:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: flux-gateway
  namespace: flux-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  gatewayClassName: eg
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: flux-webhook.example.com
      tls:
        mode: Terminate
        certificateRefs:
          - name: flux-webhook-tls
            kind: Secret
      allowedRoutes:
        namespaces:
          from: Same
```

cert-manager can automatically provision certificates for Gateway resources when the appropriate annotations are set.

## Enforcing TLS-Only Access

To ensure no unencrypted traffic reaches the Receiver, configure the Ingress controller to redirect all HTTP traffic to HTTPS:

```yaml
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "true"
  nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
```

You can also configure HSTS headers:

```yaml
annotations:
  nginx.ingress.kubernetes.io/hsts: "true"
  nginx.ingress.kubernetes.io/hsts-max-age: "31536000"
  nginx.ingress.kubernetes.io/hsts-include-subdomains: "true"
```

## Verification

Test that HTTPS works and HTTP is redirected:

```bash
# This should return a 301 redirect to HTTPS
curl -s -o /dev/null -w "%{http_code}" http://flux-webhook.example.com/hook/test

# This should return 200 (with a valid webhook path and signature)
curl -s -o /dev/null -w "%{http_code}" https://flux-webhook.example.com/hook/test
```

Inspect the certificate details:

```bash
echo | openssl s_client -connect flux-webhook.example.com:443 2>/dev/null | \
  openssl x509 -noout -text | head -20
```

## Troubleshooting

### Certificate not issued by cert-manager

Check the Certificate and CertificateRequest resources:

```bash
kubectl -n flux-system get certificate
kubectl -n flux-system get certificaterequest
kubectl -n flux-system describe challenge --selector="acme.cert-manager.io/order-name"
```

Common causes include DNS not pointing to the Ingress controller (HTTP-01 fails), firewall blocking port 80, or rate limits on Let's Encrypt.

### ERR_CERT_AUTHORITY_INVALID in browser

This indicates a self-signed certificate or incomplete certificate chain. For production, use a publicly trusted CA. If using a private CA, ensure the full chain is included in the TLS secret.

### Webhook provider reports SSL errors

Make sure the certificate covers the exact domain you configured. Check the SAN (Subject Alternative Name):

```bash
echo | openssl s_client -connect flux-webhook.example.com:443 2>/dev/null | \
  openssl x509 -noout -ext subjectAltName
```

### Certificate renewal fails

If cert-manager renewal fails, check the cert-manager controller logs:

```bash
kubectl -n cert-manager logs deploy/cert-manager
```

Also check that the ClusterIssuer is still valid:

```bash
kubectl get clusterissuer letsencrypt-prod -o jsonpath='{.status.conditions}'
```

## Summary

TLS is essential for any externally exposed webhook endpoint. The recommended approach is to use cert-manager with Let's Encrypt for automatic certificate provisioning and renewal. For environments where that is not possible, manually provisioned certificates work as well. Regardless of the method, always enforce HTTPS-only access and verify the certificate chain end to end.
