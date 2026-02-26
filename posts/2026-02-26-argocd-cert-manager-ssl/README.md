# How to Configure ArgoCD with cert-manager for Auto SSL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, cert-manager, TLS

Description: Automate TLS certificate provisioning for ArgoCD using cert-manager with Let's Encrypt, including HTTP01 and DNS01 challenge configurations.

---

Managing TLS certificates manually is tedious and error-prone. cert-manager automates the entire certificate lifecycle for your ArgoCD installation, from provisioning to renewal. This guide walks you through setting up cert-manager with ArgoCD to get free, auto-renewing Let's Encrypt certificates.

## What cert-manager Does

cert-manager is a Kubernetes-native certificate management controller. It watches for Certificate resources and automatically:

1. Requests certificates from issuers (Let's Encrypt, Vault, self-signed, etc.)
2. Stores certificates as Kubernetes secrets
3. Renews certificates before they expire
4. Updates the secrets with new certificates

For ArgoCD, this means you never have to manually create or rotate TLS certificates.

## Prerequisites

- A Kubernetes cluster with ArgoCD installed
- An ingress controller configured for ArgoCD
- A domain name with DNS pointing to your cluster
- kubectl access to the cluster

## Step 1: Install cert-manager

```bash
# Install cert-manager with Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Verify the installation:

```bash
# Check that all cert-manager pods are running
kubectl get pods -n cert-manager

# Test the webhook
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager-test
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: test-selfsigned
  namespace: cert-manager-test
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: selfsigned-cert
  namespace: cert-manager-test
spec:
  dnsNames:
    - example.com
  secretName: selfsigned-cert-tls
  issuerRef:
    name: test-selfsigned
EOF

# Clean up test
kubectl delete namespace cert-manager-test
```

## Step 2: Create a ClusterIssuer

A ClusterIssuer works across all namespaces. Create one for Let's Encrypt:

```yaml
# Let's Encrypt staging (for testing - no rate limits)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Staging server URL
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
---
# Let's Encrypt production
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
            ingressClassName: nginx
```

```bash
kubectl apply -f clusterissuer.yaml

# Check the issuer status
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-prod
```

## Step 3: Configure ArgoCD Ingress with cert-manager

Update your ArgoCD ingress to use cert-manager annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Tell cert-manager which issuer to use
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Nginx-specific annotations
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-buffer-size: "64k"
spec:
  ingressClassName: nginx
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
  tls:
    - hosts:
        - argocd.example.com
      # cert-manager creates and manages this secret
      secretName: argocd-server-tls
```

cert-manager watches for Ingress resources with its annotation and automatically creates a Certificate resource, provisions the certificate through ACME, and stores it in the specified secret.

## Using DNS01 Challenge

HTTP01 challenge requires port 80 to be accessible from the internet. If your ArgoCD is internal, use DNS01 instead:

### AWS Route53

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-dns-key
    solvers:
      - dns01:
          route53:
            region: us-east-1
            # Use IAM role for service account (recommended)
            # Or specify explicit credentials
```

Set up IRSA (IAM Roles for Service Accounts) for cert-manager:

```bash
# Create IAM policy for Route53 access
cat <<EOF > cert-manager-route53-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "route53:GetChange",
      "Resource": "arn:aws:route53:::change/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/YOUR_ZONE_ID"
    },
    {
      "Effect": "Allow",
      "Action": "route53:ListHostedZonesByName",
      "Resource": "*"
    }
  ]
}
EOF
```

### Google Cloud DNS

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-dns-key
    solvers:
      - dns01:
          cloudDNS:
            project: your-gcp-project-id
```

### Cloudflare

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-dns-key
    solvers:
      - dns01:
          cloudflare:
            email: admin@example.com
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
```

Create the Cloudflare API token secret:

```bash
kubectl create secret generic cloudflare-api-token \
  --namespace cert-manager \
  --from-literal=api-token=YOUR_CLOUDFLARE_API_TOKEN
```

## Creating a Certificate Resource Explicitly

Instead of relying on Ingress annotations, you can create a Certificate resource directly:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: argocd-server-tls
  namespace: argocd
spec:
  secretName: argocd-server-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - argocd.example.com
  # Optional: add multiple domains
  # dnsNames:
  #   - argocd.example.com
  #   - grpc.argocd.example.com
  duration: 2160h    # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
  privateKey:
    algorithm: RSA
    size: 2048
```

## Monitoring Certificate Status

```bash
# Check all certificates
kubectl get certificates -n argocd

# Check certificate details
kubectl describe certificate argocd-server-tls -n argocd

# Check certificate request status
kubectl get certificaterequests -n argocd

# Check the ACME order status
kubectl get orders -n argocd

# Check challenges
kubectl get challenges -n argocd

# View the actual certificate content
kubectl get secret argocd-server-tls -n argocd -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

## Troubleshooting

**Certificate Stuck in "Issuing"**: Check the challenges:

```bash
kubectl describe challenge -n argocd
```

Common causes:
- DNS not pointing to the cluster (HTTP01 fails)
- Port 80 not accessible from the internet (HTTP01 fails)
- DNS provider credentials incorrect (DNS01 fails)

**"Failed to verify domain"**: The ACME server cannot reach your HTTP01 challenge endpoint. Make sure:

```bash
# Test that the challenge path is accessible
curl http://argocd.example.com/.well-known/acme-challenge/test
```

**Certificate Issued But Not Renewed**: cert-manager renews certificates automatically 30 days before expiry by default. Check the cert-manager logs:

```bash
kubectl logs -n cert-manager -l app.kubernetes.io/name=cert-manager
```

**Wrong Certificate Served**: The secret might not have been updated. Delete the secret and let cert-manager recreate it:

```bash
kubectl delete secret argocd-server-tls -n argocd
# cert-manager will automatically create a new certificate
```

## Production Recommendations

1. **Start with staging**: Always test with the Let's Encrypt staging issuer first. Production has strict rate limits.

2. **Use DNS01 for internal services**: If ArgoCD is behind a VPN or firewall, DNS01 is the only option.

3. **Monitor certificate expiry**: Set up alerts for certificate expiration. cert-manager exposes Prometheus metrics:

```yaml
# cert-manager Helm values for metrics
prometheus:
  enabled: true
  servicemonitor:
    enabled: true
```

4. **Backup certificate secrets**: Include certificate secrets in your backup strategy.

For more on ArgoCD networking, see [configuring TLS termination](https://oneuptime.com/blog/post/2026-02-26-argocd-tls-termination-load-balancer/view) and [TLS passthrough](https://oneuptime.com/blog/post/2026-02-26-argocd-tls-passthrough/view).
