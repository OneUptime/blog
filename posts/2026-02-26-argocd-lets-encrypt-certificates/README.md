# How to Configure ArgoCD with Let's Encrypt Certificates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, TLS, Let's Encrypt

Description: Step-by-step guide to configuring ArgoCD with automatic Let's Encrypt TLS certificates using cert-manager, covering HTTP-01 and DNS-01 challenge solvers.

---

Let's Encrypt provides free, automated TLS certificates that are trusted by every browser and HTTP client. Combined with cert-manager on Kubernetes, you get automatic certificate issuance and renewal for your ArgoCD server. No more expired certificates, no more manual rotation, no more self-signed certificate warnings.

This guide walks through the complete setup from installing cert-manager to verifying your ArgoCD instance serves a valid Let's Encrypt certificate.

## Prerequisites

Before starting, you need:

- A Kubernetes cluster with ArgoCD installed
- An ingress controller (Nginx, Traefik, or similar)
- A domain name pointing to your ingress (e.g., `argocd.company.com`)
- DNS configured so the domain resolves to your cluster's ingress IP

## Step 1: Install cert-manager

cert-manager handles the Let's Encrypt ACME protocol, certificate issuance, and renewal.

```bash
# Install cert-manager using kubectl
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Ready pods -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s
```

Or install with Helm:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

Verify the installation:

```bash
kubectl get pods -n cert-manager
# All pods should be Running
```

## Step 2: Create a ClusterIssuer

A ClusterIssuer tells cert-manager how to obtain certificates from Let's Encrypt.

### HTTP-01 Challenge (Most Common)

The HTTP-01 challenge proves domain ownership by serving a token at a specific URL. Your ingress must be publicly accessible:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    # Let's Encrypt production server
    server: https://acme-v02.api.letsencrypt.org/directory
    # Your email for certificate notifications
    email: devops@company.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx  # Match your ingress controller
```

For testing, use the staging server first to avoid rate limits:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: devops@company.com
    privateKeySecretRef:
      name: letsencrypt-staging-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

Apply the ClusterIssuers:

```bash
kubectl apply -f cluster-issuers.yaml

# Verify they are ready
kubectl get clusterissuer
# NAME                  READY   AGE
# letsencrypt-prod      True    30s
# letsencrypt-staging   True    30s
```

### DNS-01 Challenge (For Internal or Wildcard Certs)

If your ArgoCD instance is not publicly accessible or you need wildcard certificates, use the DNS-01 challenge:

#### AWS Route 53

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@company.com
    privateKeySecretRef:
      name: letsencrypt-dns-account-key
    solvers:
      - dns01:
          route53:
            region: us-east-1
            hostedZoneID: Z1234567890
            # Use IRSA or access keys
```

#### Google Cloud DNS

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@company.com
    privateKeySecretRef:
      name: letsencrypt-dns-account-key
    solvers:
      - dns01:
          cloudDNS:
            project: my-gcp-project
            serviceAccountSecretRef:
              name: clouddns-service-account
              key: key.json
```

#### Cloudflare

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@company.com
    privateKeySecretRef:
      name: letsencrypt-dns-account-key
    solvers:
      - dns01:
          cloudflare:
            email: admin@company.com
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
```

## Step 3: Configure ArgoCD Server for Insecure Mode

When TLS termination happens at the ingress, ArgoCD server should run without its own TLS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

Apply and restart:

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

## Step 4: Create the Ingress with cert-manager Annotations

### Nginx Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Tell cert-manager to issue a certificate
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Nginx specific settings
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    # Handle gRPC for ArgoCD CLI
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - argocd.company.com
      # cert-manager creates this secret automatically
      secretName: argocd-server-tls
  rules:
    - host: argocd.company.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
```

### Traefik Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  tls:
    - hosts:
        - argocd.company.com
      secretName: argocd-server-tls
  rules:
    - host: argocd.company.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
```

Apply the ingress:

```bash
kubectl apply -f argocd-ingress.yaml
```

## Step 5: Verify Certificate Issuance

cert-manager creates a Certificate resource and a CertificateRequest to fulfill it:

```bash
# Check the Certificate resource
kubectl get certificate -n argocd
# NAME                READY   SECRET              AGE
# argocd-server-tls   True    argocd-server-tls   2m

# Check certificate details
kubectl describe certificate argocd-server-tls -n argocd

# Check the CertificateRequest
kubectl get certificaterequest -n argocd

# Check the challenge (during issuance)
kubectl get challenges -n argocd
```

If the certificate is not becoming Ready, check the challenges:

```bash
kubectl describe challenge -n argocd
```

## Step 6: Test the Certificate

### Browser Test

Open `https://argocd.company.com` in a browser. You should see:
- A valid HTTPS connection (green padlock)
- Certificate issued by "Let's Encrypt" or "R3" (Let's Encrypt intermediate CA)
- No security warnings

### CLI Test

```bash
# Verify the certificate chain
openssl s_client -connect argocd.company.com:443 -servername argocd.company.com </dev/null 2>/dev/null | \
  openssl x509 -noout -subject -issuer -dates

# Expected output:
# subject=CN = argocd.company.com
# issuer=C = US, O = Let's Encrypt, CN = R3
# notBefore=...
# notAfter=...  (about 90 days from now)
```

### ArgoCD CLI Test

```bash
# Login should work without --insecure
argocd login argocd.company.com --grpc-web
```

## Automatic Certificate Renewal

Let's Encrypt certificates are valid for 90 days. cert-manager automatically renews them 30 days before expiration (by default). You do not need to do anything.

Verify the renewal configuration:

```bash
# Check when the certificate was last renewed
kubectl describe certificate argocd-server-tls -n argocd | grep -A5 "Status"
```

To test renewal manually:

```bash
# Trigger a manual renewal
kubectl cert-manager renew argocd-server-tls -n argocd
```

## Handling gRPC Traffic

ArgoCD CLI uses gRPC, which can be tricky with some ingress controllers. If the CLI fails to connect:

### Option 1: Use grpc-web (Recommended)

```bash
# Connect using grpc-web protocol (works through most ingress controllers)
argocd login argocd.company.com --grpc-web
```

### Option 2: Separate gRPC Ingress

Create a second ingress with TLS passthrough for gRPC:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-grpc
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
spec:
  ingressClassName: nginx
  rules:
    - host: grpc.argocd.company.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

## Troubleshooting

### Certificate Stuck in Pending

```bash
# Check the challenge status
kubectl get challenges -A
kubectl describe challenge <challenge-name> -n argocd

# Common issues:
# - DNS not pointing to ingress IP
# - Firewall blocking port 80 (for HTTP-01)
# - Ingress class mismatch
```

### Rate Limit Errors

Let's Encrypt has rate limits. If you hit them:
- Use the staging server for testing
- Wait before retrying (limits reset after a week)
- Check https://letsencrypt.org/docs/rate-limits/

### Certificate Not Updating After Renewal

```bash
# Check if the secret was updated
kubectl get secret argocd-server-tls -n argocd -o jsonpath='{.metadata.annotations}'

# Restart ingress if needed
kubectl rollout restart deployment -n ingress-nginx
```

## Summary

Setting up Let's Encrypt with ArgoCD involves installing cert-manager, creating a ClusterIssuer, configuring ArgoCD in insecure mode, and adding cert-manager annotations to your ingress. Once configured, certificate issuance and renewal are fully automatic. Use the HTTP-01 challenge for publicly accessible instances and DNS-01 for internal deployments or wildcard certificates. Always test with the Let's Encrypt staging server before using production to avoid rate limits.
