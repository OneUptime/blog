# How to Install Rancher with Let's Encrypt SSL Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, SSL, Let's Encrypt, Kubernetes, Helm, Installation

Description: A step-by-step guide to installing Rancher with automatic Let's Encrypt SSL certificates using Helm and cert-manager for production-grade HTTPS.

Running Rancher with a valid SSL certificate from Let's Encrypt eliminates browser security warnings and provides trusted HTTPS for your Kubernetes management platform. Let's Encrypt certificates are free, automatically renewable, and widely trusted. This guide covers deploying Rancher on a Kubernetes cluster with automatic Let's Encrypt certificate provisioning using cert-manager.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster on a Rancher-supported Kubernetes version. For a production HA installation like this guide, use at least 3 nodes
- `kubectl` and Helm 3 installed
- A fully qualified domain name (FQDN) with a DNS A record pointing to your cluster's load balancer or ingress IP
- An NGINX Ingress Controller installed on the cluster
- Port 80 open and accessible from the internet (required for Let's Encrypt HTTP-01 challenge)
- A valid email address for Let's Encrypt notifications

## Step 1: Verify DNS Configuration

Before starting, make sure your domain resolves to your cluster's ingress IP:

```bash
# Get your ingress controller's external IP

kubectl get svc -n ingress-nginx

# Verify DNS resolution
nslookup rancher.yourdomain.com
dig rancher.yourdomain.com
```

The DNS record must be active and pointing to the correct IP before Let's Encrypt can issue a certificate.

## Step 2: Install cert-manager

cert-manager handles the automatic issuance and renewal of Let's Encrypt certificates.

Add the Jetstack Helm repository:

```bash
helm repo add jetstack https://charts.jetstack.io --force-update
helm repo update
```

Install cert-manager and its CRDs:

```bash
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.20.2 \
  --set crds.enabled=true
```

Wait for cert-manager to be ready:

```bash
kubectl get pods -n cert-manager
```

All pods should be in the Running state before proceeding.

## Step 3: Rancher Creates the Let's Encrypt Issuer Automatically

When you install Rancher with `--set ingress.tls.source=letsEncrypt`, the Rancher Helm chart creates a namespaced `Issuer` for you. You do not need to create a `ClusterIssuer` manually for this workflow.

## Step 4: Add the Rancher Helm Repository

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
```

## Step 5: Create the cattle-system Namespace

```bash
kubectl create namespace cattle-system
```

## Step 6: Install Rancher with Let's Encrypt

First test with the staging environment to avoid hitting Let's Encrypt rate limits. Staging certificates are not trusted by browsers, so use this only to validate the ACME flow.

On new Rancher installations starting from v2.9.0, the default `agent-tls-mode` is `strict`. In that case, create the `tls-ca` secret with the CA chain that signs the Rancher certificate:

```bash
kubectl create secret generic tls-ca \
  --namespace cattle-system \
  --from-file=cacerts.pem
```

Then install Rancher:

```bash
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.yourdomain.com \
  --set bootstrapPassword=yourSecurePassword \
  --set replicas=3 \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=your-email@example.com \
  --set letsEncrypt.ingress.class=nginx \
  --set letsEncrypt.environment=staging \
  --set privateCA=true
```

Wait for the deployment:

```bash
kubectl rollout status deployment rancher -n cattle-system
```

Check the certificate status:

```bash
kubectl get issuer -n cattle-system
kubectl describe issuer rancher -n cattle-system
kubectl get certificate -n cattle-system
kubectl describe certificate tls-rancher-ingress -n cattle-system
```

## Step 7: Switch to Production Certificates

Once the staging certificate is successfully issued, upgrade to production:

```bash
# Delete the staging certificate and secret
kubectl delete certificate tls-rancher-ingress -n cattle-system
kubectl delete secret tls-rancher-ingress -n cattle-system

# If you created tls-ca for the staging CA chain, replace it with the production CA chain
kubectl delete secret tls-ca -n cattle-system --ignore-not-found
kubectl create secret generic tls-ca \
  --namespace cattle-system \
  --from-file=cacerts.pem

# Upgrade Rancher to use production Let's Encrypt
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.yourdomain.com \
  --set bootstrapPassword=yourSecurePassword \
  --set replicas=3 \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=your-email@example.com \
  --set letsEncrypt.ingress.class=nginx \
  --set letsEncrypt.environment=production \
  --set privateCA=true
```

## Step 8: Verify the Certificate

Check that the production certificate has been issued:

```bash
kubectl get issuer -n cattle-system
kubectl describe issuer rancher -n cattle-system
kubectl get certificate -n cattle-system
kubectl describe certificate tls-rancher-ingress -n cattle-system
```

The `rancher` Issuer and the `tls-rancher-ingress` Certificate should both show `Ready: True`.

You can also verify from the command line:

```bash
echo | openssl s_client -connect rancher.yourdomain.com:443 -servername rancher.yourdomain.com 2>/dev/null | openssl x509 -noout -issuer -dates
```

## Step 9: Access the Rancher UI

Navigate to `https://rancher.yourdomain.com` in your browser. You should see a valid SSL certificate with no browser warnings. Log in with the bootstrap password and complete the initial setup.

## Using DNS-01 Challenge

Rancher's built-in `ingress.tls.source=letsEncrypt` workflow uses the HTTP-01 challenge. If port 80 is not available or you need wildcard certificates, issue the certificate separately with cert-manager using DNS-01, then configure Rancher to use `ingress.tls.source=secret` instead. This example uses Cloudflare as the DNS provider:

```yaml
# letsencrypt-dns.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-dns
    solvers:
      - dns01:
          cloudflare:
            email: your-cloudflare-email@example.com
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

After cert-manager issues the certificate, provide it to Rancher as the `tls-rancher-ingress` secret and install Rancher with `--set ingress.tls.source=secret`.

## Certificate Renewal

Let's Encrypt certificates are currently valid for 90 days. cert-manager automatically renews them before expiration. Monitor the renewal status:

```bash
kubectl get certificate -n cattle-system
kubectl describe certificate tls-rancher-ingress -n cattle-system | grep -A5 "Renewal"
```

## Troubleshooting

```bash
# Check cert-manager logs
kubectl logs deploy/cert-manager -n cert-manager --tail=50

# Check issuer and certificate status
kubectl describe issuer rancher -n cattle-system
kubectl describe certificate tls-rancher-ingress -n cattle-system

# Check certificate request
kubectl get certificaterequest -n cattle-system
kubectl describe certificaterequest -n cattle-system

# Check ACME challenges
kubectl get challenges -n cattle-system

# Verify ingress configuration
kubectl get ingress rancher -n cattle-system -o yaml

# Inspect ACME challenge details
kubectl describe challenges -n cattle-system
```

Common issues:

- **DNS not resolving**: Ensure the A record is properly configured
- **Port 80 blocked**: The HTTP-01 challenge requires port 80 to be open
- **Rate limits**: Let's Encrypt has rate limits. Use the staging environment for testing
- **Ingress class mismatch**: Verify the ingress class matches your ingress controller

## Conclusion

You have successfully installed Rancher with automatic Let's Encrypt SSL certificates. Your Rancher instance now has trusted HTTPS that automatically renews before expiration. This setup is ideal for production environments where browser trust and secure communication are essential. The combination of cert-manager and Let's Encrypt provides a maintenance-free SSL solution for your Kubernetes management platform.
