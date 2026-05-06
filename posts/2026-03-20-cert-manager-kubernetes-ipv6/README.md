# How to Configure cert-manager in Kubernetes with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cert-Manager, Kubernetes, IPv6, TLS, Let's Encrypt, ACME, Helm

Description: Deploy and configure cert-manager in an IPv6-enabled Kubernetes cluster to automatically provision and renew TLS certificates for your services.

---

cert-manager automates TLS certificate management in Kubernetes. In IPv6-enabled clusters, the main consideration is choosing an ACME challenge flow that matches how your services are exposed, especially for HTTP-01 validation.

## Prerequisites

Verify your Kubernetes cluster has IPv6 networking enabled:

```bash
# Check node addresses and confirm an IPv6 address is present
kubectl get nodes <node-name> -o go-template --template='{{range .status.addresses}}{{printf "%s: %s\n" .type .address}}{{end}}'

# Verify the node has an IPv6 Pod CIDR
kubectl get nodes <node-name> -o go-template --template='{{range .spec.podCIDRs}}{{printf "%s\n" .}}{{end}}'

# Verify an existing pod has an IPv6 address
kubectl get pods -n <namespace> <pod-name> -o go-template --template='{{range .status.podIPs}}{{printf "%s\n" .ip}}{{end}}'
```

## Installing cert-manager with Helm

```bash
# Add the cert-manager Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --version v1.20.2

# Verify cert-manager pods are running
kubectl get pods -n cert-manager
```

## Creating a ClusterIssuer for Let's Encrypt (DNS-01)

DNS-01 is often the simplest option for IPv6-enabled clusters because it does not depend on public HTTP reachability, and it is required for wildcard certificates:

```yaml
# letsencrypt-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    # Let's Encrypt production ACME server
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
```

Create the Cloudflare API token secret:

```bash
# Create secret with Cloudflare API token
kubectl create secret generic cloudflare-api-token \
  --from-literal=api-token=YOUR_CLOUDFLARE_API_TOKEN \
  -n cert-manager

# Apply the ClusterIssuer
kubectl apply -f letsencrypt-issuer.yaml

# Check issuer status
kubectl get clusterissuer letsencrypt-prod -o yaml
```

## Issuing a Certificate for an IPv6 Service

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: myapp-tls
  namespace: default
spec:
  secretName: myapp-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - myapp.example.com
    - "*.myapp.example.com"
  # Duration and renewal window
  duration: 2160h    # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
```

```bash
# Apply the certificate request
kubectl apply -f certificate.yaml

# Monitor certificate issuance progress
kubectl describe certificate myapp-tls -n default

# Check if the TLS secret was created
kubectl get secret myapp-tls-secret -n default
```

## HTTP-01 Challenge in IPv6 Kubernetes Clusters

For HTTP-01 challenges in IPv6 or dual-stack clusters, ensure the selected Ingress controller is publicly reachable on port 80 for the records your domain advertises:

```yaml
# letsencrypt-http01-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-http01
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-http01-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
            # The selected Ingress controller must be reachable for HTTP-01 validation
```

## Ingress with Automatic Certificate via Annotations

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: default
  annotations:
    # Automatically provision certificate
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls-secret
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

## Troubleshooting cert-manager IPv6 Issues

```bash
# Check CertificateRequest status
kubectl get certificaterequests -n default

# View challenge details
kubectl get challenges -n default
kubectl describe challenge <challenge-name> -n default

# Check cert-manager controller logs for IPv6 errors
kubectl logs -n cert-manager deploy/cert-manager \
  --tail=100 | grep -i "ipv6\|error\|failed"

# Test ACME server reachability from within the cluster
kubectl run -it --rm debug --image=curlimages/curl \
  --restart=Never -- \
  curl -6 https://acme-v02.api.letsencrypt.org/directory
```

cert-manager works well in IPv6-enabled Kubernetes clusters, and DNS-01 is often the most straightforward option when you need wildcard certificates or want to avoid depending on public HTTP reachability for ACME validation.
