# How to Manage TLS Certificates with cert-manager in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, cert-manager, TLS, SSL, Certificates, Let's Encrypt, Security

Description: Learn how to automate TLS certificate management in Kubernetes using cert-manager with Let's Encrypt, self-signed, and CA-based certificates.

---

cert-manager automates the management and issuance of TLS certificates in Kubernetes. This guide covers installing cert-manager, configuring issuers, and automating certificate renewal.

## cert-manager Overview

```mermaid
flowchart TD
    subgraph "cert-manager"
        CM[cert-manager<br/>Controller]
        ISSUER[Issuer /<br/>ClusterIssuer]
        CERT[Certificate]
    end
    
    subgraph "Certificate Sources"
        LE[Let's Encrypt]
        VAULT[HashiCorp Vault]
        SS[Self-Signed]
        CA[Internal CA]
    end
    
    subgraph "Kubernetes Resources"
        SECRET[TLS Secret]
        INGRESS[Ingress]
        POD[Pod]
    end
    
    CERT --> CM
    CM --> ISSUER
    ISSUER --> LE
    ISSUER --> VAULT
    ISSUER --> SS
    ISSUER --> CA
    CM --> SECRET
    SECRET --> INGRESS
    SECRET --> POD
```

| Component | Description |
|-----------|-------------|
| Issuer | Namespace-scoped certificate authority |
| ClusterIssuer | Cluster-wide certificate authority |
| Certificate | Desired certificate specification |
| CertificateRequest | Actual certificate request |

## Installation

### Install cert-manager with kubectl

```bash
# Install cert-manager CRDs and components
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for pods to be ready
kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=300s

# Verify installation
kubectl get pods -n cert-manager
```

### Install with Helm

```bash
# Add Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --set prometheus.enabled=true \
  --set webhook.timeoutSeconds=30

# Verify
kubectl get pods -n cert-manager
```

## Let's Encrypt Configuration

### Staging Issuer (Testing)

```yaml
# letsencrypt-staging.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Staging server for testing
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-account-key
    solvers:
      # HTTP-01 challenge
      - http01:
          ingress:
            class: nginx
```

### Production Issuer

```yaml
# letsencrypt-production.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    # Production server
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-production-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

### DNS-01 Challenge (Wildcard Support)

```yaml
# letsencrypt-dns.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-account-key
    solvers:
      # AWS Route53
      - dns01:
          route53:
            region: us-east-1
            hostedZoneID: Z1234567890
            accessKeyID: AKIAIOSFODNN7EXAMPLE
            secretAccessKeySecretRef:
              name: route53-credentials
              key: secret-access-key
        selector:
          dnsZones:
            - "example.com"
---
# Route53 credentials
apiVersion: v1
kind: Secret
metadata:
  name: route53-credentials
  namespace: cert-manager
type: Opaque
stringData:
  secret-access-key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### CloudFlare DNS-01

```yaml
# letsencrypt-cloudflare.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-cloudflare
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-cloudflare-key
    solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
---
apiVersion: v1
kind: Secret
metadata:
  name: cloudflare-api-token
  namespace: cert-manager
type: Opaque
stringData:
  api-token: your-cloudflare-api-token
```

## Certificate Resources

### Basic Certificate

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-com-tls
  namespace: default
spec:
  secretName: example-com-tls-secret
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  commonName: example.com
  dnsNames:
    - example.com
    - www.example.com
  duration: 2160h    # 90 days
  renewBefore: 360h  # 15 days before expiry
```

### Wildcard Certificate

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
    name: letsencrypt-dns  # Must use DNS-01 for wildcards
    kind: ClusterIssuer
  commonName: "*.example.com"
  dnsNames:
    - "*.example.com"
    - example.com
```

### Multiple Domain Certificate

```yaml
# multi-domain-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: multi-domain-tls
  namespace: default
spec:
  secretName: multi-domain-tls-secret
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  dnsNames:
    - api.example.com
    - app.example.com
    - admin.example.com
    - docs.example.com
```

## Ingress Integration

### Automatic Certificate with Annotation

```yaml
# ingress-auto-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    # cert-manager will automatically create Certificate
    cert-manager.io/cluster-issuer: "letsencrypt-production"
    # For namespace-scoped issuer:
    # cert-manager.io/issuer: "letsencrypt-production"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - example.com
        - www.example.com
      secretName: example-com-tls
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
```

### Manual Certificate with Ingress

```yaml
# First create the certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-tls
  namespace: default
spec:
  secretName: example-tls-secret
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  dnsNames:
    - example.com
---
# Then reference it in Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - example.com
      secretName: example-tls-secret  # Same as Certificate secretName
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
```

## Self-Signed Certificates

### Self-Signed Issuer

```yaml
# self-signed-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
```

### CA Certificate Chain

```yaml
# ca-certificate-chain.yaml
# 1. Create self-signed CA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: my-internal-ca
  secretName: my-ca-secret
  duration: 87600h  # 10 years
  renewBefore: 8760h  # 1 year
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
---
# 2. Create CA issuer using the CA certificate
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: my-ca-issuer
spec:
  ca:
    secretName: my-ca-secret
---
# 3. Issue certificates using the CA
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-service-tls
  namespace: default
spec:
  secretName: internal-service-tls-secret
  issuerRef:
    name: my-ca-issuer
    kind: ClusterIssuer
  dnsNames:
    - internal-service.default.svc.cluster.local
    - internal-service
  duration: 2160h
  renewBefore: 360h
```

## Vault Integration

### Vault PKI Issuer

```yaml
# vault-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    server: https://vault.example.com
    path: pki/sign/example-role
    auth:
      kubernetes:
        role: cert-manager
        mountPath: /v1/auth/kubernetes
        secretRef:
          name: vault-token
          key: token
---
# Vault token secret
apiVersion: v1
kind: Secret
metadata:
  name: vault-token
  namespace: cert-manager
type: Opaque
stringData:
  token: s.1234567890abcdef
```

## Certificate Monitoring

### Check Certificate Status

```bash
# List all certificates
kubectl get certificates --all-namespaces

# Describe certificate
kubectl describe certificate example-com-tls

# Check certificate requests
kubectl get certificaterequests

# Check certificate secret
kubectl get secret example-com-tls-secret -o yaml

# View certificate details
kubectl get secret example-com-tls-secret -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

### Certificate Events

```bash
# Watch certificate events
kubectl get events --field-selector involvedObject.kind=Certificate

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager -f

# Check webhook logs
kubectl logs -n cert-manager -l app=webhook -f
```

### Prometheus Metrics

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cert-manager
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: cert-manager
  namespaceSelector:
    matchNames:
      - cert-manager
  endpoints:
    - port: tcp-prometheus-servicemonitor
      interval: 60s
```

```promql
# Certificate expiry time
certmanager_certificate_expiration_timestamp_seconds

# Certificates ready
certmanager_certificate_ready_status

# Certificate renewal attempts
certmanager_certificate_renewal_timestamp_seconds

# ACME client errors
certmanager_http_acme_client_request_duration_seconds_count
```

## Troubleshooting

### Common Issues

```bash
# Certificate stuck in pending
kubectl describe certificate <name>
kubectl describe certificaterequest <name>
kubectl describe order <name>
kubectl describe challenge <name>

# Check solver pods
kubectl get pods -n cert-manager

# HTTP-01 challenge not working
kubectl get ingress -l acme.cert-manager.io/http01-solver=true
```

### Debug ACME Challenges

```bash
# Check challenge status
kubectl get challenges --all-namespaces

# Describe challenge
kubectl describe challenge <challenge-name>

# Check if solver endpoint is accessible
curl -v http://example.com/.well-known/acme-challenge/token

# DNS-01 verification
dig TXT _acme-challenge.example.com
```

### Force Certificate Renewal

```bash
# Delete the certificate (will be recreated)
kubectl delete certificate example-com-tls

# Or delete the secret (cert-manager will renew)
kubectl delete secret example-com-tls-secret

# Manually trigger renewal
kubectl annotate certificate example-com-tls cert-manager.io/issue-temporary-certificate="true"
```

## Best Practices

### Production Configuration

```yaml
# production-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: production-tls
  namespace: production
spec:
  secretName: production-tls-secret
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  dnsNames:
    - api.example.com
  # Extended duration
  duration: 2160h    # 90 days
  renewBefore: 720h  # 30 days
  # Use ECDSA for better performance
  privateKey:
    algorithm: ECDSA
    size: 256
  # Enable key rotation
  secretTemplate:
    annotations:
      my-annotation: "value"
    labels:
      app: production
```

### Backup CA Certificates

```yaml
# backup-ca.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-ca-certificates
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  kubectl get secret my-ca-secret -n cert-manager -o yaml > /backup/ca-secret.yaml
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              persistentVolumeClaim:
                claimName: backup-pvc
          restartPolicy: OnFailure
```

## Conclusion

cert-manager simplifies TLS certificate management in Kubernetes:

1. **Automated provisioning** - Request certificates via Kubernetes resources
2. **Auto-renewal** - Certificates renewed before expiry
3. **Multiple issuers** - Let's Encrypt, Vault, self-signed, CA
4. **Ingress integration** - Automatic TLS for Ingress resources
5. **Monitoring** - Prometheus metrics for certificate health

For monitoring your TLS certificates and application security, check out [OneUptime's SSL monitoring](https://oneuptime.com/product/ssl-certificate-monitoring).

## Related Resources

- [How to Set Up Secure Ingress with NGINX](https://oneuptime.com/blog/post/2026-01-25-nginx-ingress-kubernetes/view)
- [How to Integrate HashiCorp Vault](https://oneuptime.com/blog/post/2026-02-02-kubernetes-secrets/view)
- [How to Implement Pod Security Standards](https://oneuptime.com/blog/post/2026-01-06-kubernetes-pod-security-standards/view)
