# How to Set Up Wildcard Certificates on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Wildcard Certificates, TLS, DNS, Kubernetes, cert-manager

Description: Learn how to configure wildcard TLS certificates on Talos Linux using cert-manager and DNS-01 challenges for domain-wide HTTPS coverage.

---

Wildcard certificates cover all subdomains under a given domain with a single certificate. Instead of managing individual certificates for app.example.com, api.example.com, and dashboard.example.com, a wildcard certificate for *.example.com handles them all. On Talos Linux, setting up wildcard certificates requires cert-manager with DNS-01 challenge validation because Let's Encrypt and other ACME providers require DNS proof of domain ownership for wildcard issuance.

This guide walks through the complete setup of wildcard certificates on a Talos Linux cluster, from DNS provider configuration to certificate creation and usage.

## Why Wildcard Certificates?

Managing individual certificates for every subdomain can become tedious, especially in environments where new services and subdomains are created frequently. Wildcard certificates simplify this by covering all subdomains at a given level. There are some trade-offs to consider:

**Advantages:**
- One certificate covers all subdomains
- Simpler certificate management
- Fewer certificate renewals to track
- Easier to add new subdomains without certificate changes

**Considerations:**
- If the wildcard certificate's private key is compromised, all subdomains are affected
- Wildcard certificates only cover one level of subdomains (*.example.com covers app.example.com but not app.staging.example.com)
- They require DNS-01 challenge validation, which means integrating with your DNS provider's API

## Prerequisites

You need:

- A Talos Linux cluster with cert-manager installed
- A domain name with DNS managed by a supported provider (Cloudflare, Route53, Google Cloud DNS, etc.)
- API credentials for your DNS provider
- An ingress controller installed on the cluster

```bash
# Verify cert-manager is running
kubectl get pods -n cert-manager

# Check cert-manager CRDs are present
kubectl get crd certificates.cert-manager.io
```

## Configuring DNS Provider Credentials

The DNS-01 challenge requires cert-manager to create TXT records in your DNS zone. You need to provide API credentials for your DNS provider. Here are examples for common providers:

### Cloudflare

```bash
# Create a secret with your Cloudflare API token
kubectl create secret generic cloudflare-api-token \
  --namespace cert-manager \
  --from-literal=api-token=YOUR_CLOUDFLARE_API_TOKEN
```

Make sure the API token has the following permissions:
- Zone:DNS:Edit
- Zone:Zone:Read

### AWS Route53

```bash
# Create a secret with AWS credentials
kubectl create secret generic route53-credentials \
  --namespace cert-manager \
  --from-literal=secret-access-key=YOUR_AWS_SECRET_KEY
```

### Google Cloud DNS

```bash
# Create a secret from a GCP service account key file
kubectl create secret generic gcp-dns-credentials \
  --namespace cert-manager \
  --from-file=key.json=path/to/service-account-key.json
```

## Creating a ClusterIssuer for Wildcard Certificates

Now create a ClusterIssuer that uses the DNS-01 solver:

### Cloudflare Example

```yaml
# wildcard-issuer-cloudflare.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-wildcard
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-wildcard-key
    solvers:
    - dns01:
        cloudflare:
          apiTokenSecretRef:
            name: cloudflare-api-token
            key: api-token
      selector:
        dnsZones:
        - "example.com"
```

### Route53 Example

```yaml
# wildcard-issuer-route53.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-wildcard
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-wildcard-key
    solvers:
    - dns01:
        route53:
          region: us-east-1
          hostedZoneID: Z1234567890
          accessKeyIDSecretRef:
            name: route53-credentials
            key: access-key-id
          secretAccessKeySecretRef:
            name: route53-credentials
            key: secret-access-key
```

Apply the issuer:

```bash
kubectl apply -f wildcard-issuer-cloudflare.yaml

# Check it's ready
kubectl get clusterissuer letsencrypt-wildcard
kubectl describe clusterissuer letsencrypt-wildcard
```

## Requesting a Wildcard Certificate

Create a Certificate resource for your wildcard:

```yaml
# wildcard-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: default
spec:
  secretName: wildcard-example-com-tls
  issuerRef:
    name: letsencrypt-wildcard
    kind: ClusterIssuer
  dnsNames:
  - "example.com"
  - "*.example.com"
  duration: 2160h
  renewBefore: 720h
```

Notice that we include both `example.com` and `*.example.com`. The wildcard only covers subdomains, not the root domain itself.

```bash
kubectl apply -f wildcard-certificate.yaml

# Watch the certificate being issued
kubectl get certificate wildcard-example-com -w

# Check the order and challenges
kubectl get orders -n default
kubectl get challenges -n default
```

The DNS-01 challenge process typically takes 1 to 5 minutes depending on DNS propagation.

## Using the Wildcard Certificate in Ingress

Once the certificate is issued, reference its secret in your Ingress resources:

```yaml
# app1-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app1-ingress
  namespace: default
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app1.example.com
    secretName: wildcard-example-com-tls
  rules:
  - host: app1.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app1
            port:
              number: 80

---
# app2-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app2-ingress
  namespace: default
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app2.example.com
    secretName: wildcard-example-com-tls
  rules:
  - host: app2.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app2
            port:
              number: 80
```

Both ingresses use the same wildcard certificate secret. You can add as many subdomains as you need without creating new certificates.

## Sharing Wildcard Certificates Across Namespaces

By default, Kubernetes secrets are namespace-scoped. If you need the wildcard certificate in multiple namespaces, you have several options:

### Option 1: Create the Certificate in Each Namespace

Create separate Certificate resources in each namespace, all pointing to the same ClusterIssuer. This results in separate certificates but automates the process.

### Option 2: Use a Secret Replication Tool

Tools like kubernetes-replicator can automatically copy secrets across namespaces:

```yaml
# Add annotation to the certificate secret
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: cert-manager
spec:
  secretName: wildcard-example-com-tls
  secretTemplate:
    annotations:
      replicator.v1.mittwald.de/replicate-to: "default,staging,production"
  issuerRef:
    name: letsencrypt-wildcard
    kind: ClusterIssuer
  dnsNames:
  - "*.example.com"
  - "example.com"
```

## Monitoring and Renewal

Wildcard certificates follow the same renewal process as regular certificates:

```bash
# Check certificate status and expiry
kubectl get certificates --all-namespaces -o wide

# Check when renewal is scheduled
kubectl get certificate wildcard-example-com -o jsonpath='{.status.renewalTime}'

# View certificate details
kubectl describe certificate wildcard-example-com
```

## Troubleshooting DNS-01 Challenges

If certificate issuance fails, check the challenges:

```bash
# List challenges
kubectl get challenges --all-namespaces

# Describe a failing challenge
kubectl describe challenge <challenge-name>

# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager --tail=200
```

Common issues include incorrect API tokens, wrong DNS zone IDs, and DNS propagation delays. You can verify DNS propagation manually:

```bash
# Check if the TXT record was created
dig -t TXT _acme-challenge.example.com

# Or use nslookup
nslookup -type=TXT _acme-challenge.example.com
```

## Conclusion

Wildcard certificates on Talos Linux simplify TLS management for clusters that serve multiple subdomains. Using cert-manager with DNS-01 challenges, the entire process is automated - from initial issuance to renewal. The key requirement is having API access to your DNS provider, which is a one-time setup. Once configured, you can add new subdomains to your cluster without worrying about individual certificate management, and the wildcard certificate will cover them all automatically.
