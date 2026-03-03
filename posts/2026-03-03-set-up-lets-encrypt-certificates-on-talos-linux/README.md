# How to Set Up Let's Encrypt Certificates on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Let's Encrypt, TLS, Certificates, Kubernetes, Security

Description: A complete guide to automating free TLS certificates from Let's Encrypt on Talos Linux using cert-manager and ACME challenges.

---

Let's Encrypt provides free, automated TLS certificates that are trusted by all major browsers and operating systems. On a Talos Linux Kubernetes cluster, you can use cert-manager to automatically request, renew, and manage Let's Encrypt certificates for your ingress resources. This eliminates the manual process of buying, installing, and renewing certificates, which is especially valuable in dynamic environments where services come and go frequently.

This post walks through setting up cert-manager on Talos Linux, configuring Let's Encrypt issuers, and automating certificate provisioning for your ingress resources.

## How Let's Encrypt Works

Let's Encrypt uses the ACME (Automatic Certificate Management Environment) protocol to verify that you own a domain before issuing a certificate. There are two main challenge types:

- **HTTP-01**: Let's Encrypt makes an HTTP request to your domain on port 80. Your server must respond with a specific token. This works well when your ingress controller is publicly accessible.
- **DNS-01**: You create a specific DNS TXT record for your domain. This is required for wildcard certificates and works even when your cluster is not publicly accessible.

cert-manager handles both challenge types and automates the entire lifecycle.

## Prerequisites

Before starting, you need:

- A Talos Linux cluster with an ingress controller (Nginx, Traefik, etc.)
- A domain name that you control
- DNS records pointing to your cluster's external IP
- `kubectl` and Helm installed

```bash
# Verify your cluster is healthy
kubectl get nodes

# Confirm your ingress controller is running
kubectl get pods -n ingress-nginx
# or
kubectl get pods -n traefik
```

## Installing cert-manager

cert-manager is the standard tool for managing certificates in Kubernetes:

```bash
# Add the Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Verify the installation:

```bash
# Check that all cert-manager pods are running
kubectl get pods -n cert-manager

# You should see three pods:
# - cert-manager
# - cert-manager-cainjector
# - cert-manager-webhook
```

## Setting Up a Let's Encrypt Staging Issuer

Always start with the staging environment to avoid hitting rate limits while testing:

```yaml
# letsencrypt-staging.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # The staging server for testing
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
    - http01:
        ingress:
          ingressClassName: nginx
```

Apply it:

```bash
kubectl apply -f letsencrypt-staging.yaml

# Check the issuer status
kubectl get clusterissuer letsencrypt-staging
kubectl describe clusterissuer letsencrypt-staging
```

The status should show "Ready" once cert-manager can communicate with the ACME server.

## Setting Up a Production Issuer

Once testing is successful, create a production issuer:

```yaml
# letsencrypt-production.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-production-key
    solvers:
    - http01:
        ingress:
          ingressClassName: nginx
```

```bash
kubectl apply -f letsencrypt-production.yaml
```

## Requesting a Certificate via Ingress Annotation

The easiest way to get a certificate is by adding an annotation to your Ingress resource:

```yaml
# secure-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-production"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app
            port:
              number: 80
```

When you apply this, cert-manager will:
1. Detect the annotation and create a Certificate resource
2. Create an ACME order with Let's Encrypt
3. Solve the HTTP-01 challenge by temporarily creating an Ingress and a pod
4. Store the issued certificate in the `myapp-tls` secret
5. Automatically renew the certificate before it expires

```bash
kubectl apply -f secure-ingress.yaml

# Watch the certificate progress
kubectl get certificate -n default -w

# Check certificate details
kubectl describe certificate myapp-tls -n default
```

## Requesting a Certificate Explicitly

You can also create Certificate resources directly for more control:

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: myapp-cert
  namespace: default
spec:
  secretName: myapp-tls
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  dnsNames:
  - myapp.example.com
  - www.myapp.example.com
  duration: 2160h    # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
```

## Using DNS-01 Challenges

For wildcard certificates or when your cluster is not publicly accessible, use DNS-01 challenges. Here is an example with Cloudflare:

```yaml
# First, create a secret with your Cloudflare API token
apiVersion: v1
kind: Secret
metadata:
  name: cloudflare-api-token
  namespace: cert-manager
type: Opaque
stringData:
  api-token: "your-cloudflare-api-token"

---
# ClusterIssuer with DNS-01 solver
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
    - dns01:
        cloudflare:
          apiTokenSecretRef:
            name: cloudflare-api-token
            key: api-token
```

## Monitoring Certificate Status

Keep an eye on your certificates to make sure renewals happen smoothly:

```bash
# List all certificates
kubectl get certificates --all-namespaces

# Check certificate readiness
kubectl get certificates -o wide

# View certificate events
kubectl describe certificate myapp-tls -n default

# Check the actual secret
kubectl get secret myapp-tls -n default -o yaml
```

## Troubleshooting on Talos Linux

If certificates are not being issued, check the cert-manager logs:

```bash
# Check cert-manager controller logs
kubectl logs -n cert-manager -l app.kubernetes.io/component=controller --tail=100

# Check challenges
kubectl get challenges --all-namespaces

# Describe a failing challenge
kubectl describe challenge <challenge-name> -n <namespace>

# Check orders
kubectl get orders --all-namespaces
```

Common issues on Talos Linux:

1. DNS not resolving - verify your DNS records point to the correct IP
2. Port 80 not accessible - make sure your ingress controller's HTTP port is reachable from the internet for HTTP-01 challenges
3. Firewall rules blocking ACME - check network policies and any external firewalls

```bash
# Test if port 80 is reachable
curl -v http://myapp.example.com/.well-known/acme-challenge/test
```

## Automatic Renewal

cert-manager handles renewal automatically. By default, it renews certificates 30 days before expiry (Let's Encrypt certificates are valid for 90 days). You can customize this with the `renewBefore` field on the Certificate resource.

To verify renewal is working:

```bash
# Check when the certificate was last renewed
kubectl get certificate myapp-tls -o jsonpath='{.status.renewalTime}'
```

## Conclusion

Let's Encrypt with cert-manager on Talos Linux gives you automated, free TLS certificates for all your services. The setup is straightforward - install cert-manager, create an issuer, and annotate your ingress resources. From there, cert-manager handles the entire lifecycle including initial issuance, challenge solving, and automatic renewal. This is one of those setups that you configure once and then forget about, which is exactly the kind of operational simplicity that Talos Linux is designed to enable.
