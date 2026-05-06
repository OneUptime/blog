# How to Configure cert-manager in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Cert-Manager, TLS, Let's Encrypt, Kubernetes, Certificate

Description: Install cert-manager in Rancher to automate TLS certificate provisioning from Let's Encrypt and internal CAs for Kubernetes Ingress resources.

## Introduction

cert-manager is the standard Kubernetes certificate management controller. It automates the issuance and renewal of TLS certificates from ACME authorities like Let's Encrypt, as well as internal certificate authorities. This eliminates manual certificate rotation and prevents outages caused by expired certificates.

## Step 1: Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io --force-update
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.20.2 \
  --set crds.enabled=true \
  --set replicaCount=2    # Two controller replicas for HA
```

## Step 2: Verify Installation

```bash
# Check all cert-manager pods are running

kubectl get pods -n cert-manager

# Verify CRDs were created
kubectl get crd | grep cert-manager
```

## Step 3: Create a Let's Encrypt ClusterIssuer

A ClusterIssuer can issue certificates across all namespaces.

```yaml
# letsencrypt-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com    # Required for expiry notifications
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx    # Use your Ingress class name

---
# Staging issuer for testing (higher rate limits; certificates are not trusted)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
```

```bash
kubectl apply -f letsencrypt-issuer.yaml
```

## Step 4: Use DNS-01 Challenge for Wildcard Certificates

For wildcard certs, DNS-01 challenge is required. Example with Route53:

```yaml
# dns-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
      - dns01:
          route53:
            region: us-east-1
            accessKeyID: YOUR_ACCESS_KEY
            secretAccessKeySecretRef:
              name: route53-credentials
              key: secret-access-key
```

## Step 5: Issue a Certificate for an Ingress

Add an annotation to your Ingress resource to request a certificate automatically:

```yaml
# myapp-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"   # Request cert automatically
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls    # cert-manager will populate this Secret
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
```

## Step 6: Monitor Certificate Status

```bash
# Check certificate status
kubectl get certificate -n production

# Detailed certificate info including expiry
kubectl describe certificate myapp-tls -n production

# View certificate issuance and renewal events
kubectl get events -n production --field-selector reason=CertIssued
```

## Conclusion

cert-manager on Rancher fully automates TLS certificate lifecycle management. Certificates are automatically renewed before expiry; for 90-day certificates, renewal is typically attempted around 30 days before expiration. Failures trigger Kubernetes events you can alert on. For internal services, configure a self-signed or private CA ClusterIssuer instead of Let's Encrypt.
