# How to Configure SSL/TLS for Portainer on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, TLS, Kubernetes, Cert-Manager, Ingress

Description: A guide to configuring SSL/TLS for Portainer deployed on Kubernetes using Kubernetes Secrets, cert-manager, and Ingress.

## Overview

When Portainer runs on Kubernetes, TLS can be handled at multiple levels: the Portainer pod itself, an Ingress controller, or both. This guide covers configuring TLS using Kubernetes Secrets and cert-manager, the most scalable approach for Kubernetes deployments.

## Prerequisites

- Kubernetes cluster with Portainer deployed (via Helm)
- cert-manager installed (optional but recommended)
- Nginx Ingress controller or similar
- `kubectl` and `helm` CLI tools

## Method 1: Portainer with Kubernetes Secret for TLS

```bash
# Create TLS secret from certificate files

kubectl create secret tls portainer-tls \
  --cert=/opt/certs/portainer.crt \
  --key=/opt/certs/portainer.key \
  -n portainer

# Verify secret
kubectl get secret portainer-tls -n portainer -o yaml
```

## Method 2: Deploy Portainer with TLS via Helm

```yaml
# portainer-tls-values.yaml
service:
  type: ClusterIP

ingress:
  enabled: true
  ingressClassName: nginx
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
  hosts:
    - host: portainer.example.com
      paths:
        - path: /
          port: 9443
  tls:
    - secretName: portainer-tls
      hosts:
        - portainer.example.com

tls:
  force: true
  existingSecret: portainer-tls
```

```bash
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  --reuse-values \
  -f portainer-tls-values.yaml
```

## Method 3: cert-manager Auto-TLS

```yaml
# portainer-cert-manager-values.yaml
service:
  type: ClusterIP

ingress:
  enabled: true
  ingressClassName: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: portainer.example.com
      paths:
        - path: /
          port: 9000
  tls:
    - secretName: portainer-tls-auto
      hosts:
        - portainer.example.com
```

```bash
# Install cert-manager first
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - << 'EOF'
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
EOF

# Deploy Portainer with cert-manager
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  --reuse-values \
  -f portainer-cert-manager-values.yaml
```

## Method 4: Manual Kubernetes Ingress with TLS

```yaml
# portainer-ingress-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: portainer
  namespace: portainer
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - portainer.example.com
    secretName: portainer-tls
  rules:
  - host: portainer.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: portainer
            port:
              number: 9443
```

```bash
kubectl apply -f portainer-ingress-tls.yaml
```

## Verify TLS Configuration

```bash
# Check certificate from outside the cluster
echo | openssl s_client -connect portainer.example.com:443 2>/dev/null \
  | openssl x509 -noout -text | grep -A2 "Subject:"

# Check cert-manager certificate status
kubectl get certificate -n portainer
kubectl describe certificate portainer-tls-auto -n portainer

# Check Ingress
kubectl get ingress -n portainer
```

## Certificate Rotation

```bash
# cert-manager renews automatically
# For manual secret rotation:

# Create new secret with updated cert
kubectl create secret tls portainer-tls-new \
  --cert=/opt/certs/new-portainer.crt \
  --key=/opt/certs/new-portainer.key \
  -n portainer

# Update Ingress to use new secret
kubectl patch ingress portainer -n portainer \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/tls/0/secretName","value":"portainer-tls-new"}]'

# Update Portainer to mount the new secret if using pod-level TLS
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  --reuse-values \
  --set tls.existingSecret=portainer-tls-new
```

## Conclusion

For Kubernetes Portainer deployments, cert-manager with Let's Encrypt provides fully automated certificate lifecycle management with zero manual intervention. For private clusters, use cert-manager with a custom CA Issuer. The Nginx Ingress handles TLS termination, so Portainer itself can use HTTP internally, or its default self-signed certificate if you configure the Ingress to speak HTTPS to the backend.
