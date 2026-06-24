# How to Automate Certificate Rotation in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Certificate, Cert-Manager, TLS, Automation, Kubernetes, Security

Description: Automate TLS certificate rotation in Rancher using cert-manager for application certificates, and built-in RKE2 mechanisms for Kubernetes component certificates, ensuring no certificate expiry...

## Introduction

Certificate expiry is one of the most preventable causes of production outages. Automating certificate rotation-for Kubernetes component certificates (API server, etcd, kubelet), Rancher deployments that use cert-manager-managed TLS, and application TLS certificates-eliminates manual renewal processes. cert-manager handles application certificates and Rancher's TLS when Rancher is installed with `ingress.tls.source=rancher` or `ingress.tls.source=letsEncrypt`, while RKE2 manages Kubernetes client and server certificates automatically.

## Step 1: Install cert-manager

```bash
# Install cert-manager with CRDs

helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

## Step 2: Configure Certificate Issuers

```yaml
# Let's Encrypt production issuer for internet-facing services using HTTP-01
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@company.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
---
# Let's Encrypt production issuer for wildcard certificates using DNS-01
# Example below uses Cloudflare; replace the solver with your DNS provider if needed
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@company.com
    privateKeySecretRef:
      name: letsencrypt-dns-account-key
    solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token-secret # Secret is read from the cert-manager namespace by default
              key: api-token
---
# Internal CA issuer (for internal services)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-key-pair # Secret is read from the cert-manager namespace by default
```

## Step 3: Issue Application Certificates

```yaml
# Certificate for application - auto-renewed 30 days before expiry
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: myapp-tls
  namespace: production
spec:
  secretName: myapp-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  commonName: app.company.com
  dnsNames:
    - app.company.com
    - www.app.company.com
  duration: 2160h        # 90 days
  renewBefore: 720h      # Renew 30 days before expiry
  privateKey:
    rotationPolicy: Always    # Generate new key on each renewal
```

```yaml
# Ingress using the certificate secret issued above
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
spec:
  tls:
    - secretName: myapp-tls-secret
      hosts:
        - app.company.com
  rules:
    - host: app.company.com
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

## Step 4: Rotate Rancher's TLS Certificate

```bash
# If Rancher is using cert-manager-managed TLS (`ingress.tls.source=rancher` or `letsEncrypt`),
# renew the Rancher Certificate resource. If Rancher is using `ingress.tls.source=secret`,
# replace the `tls-rancher-ingress` secret with the new certificate and key instead.

# Check Rancher certificate resources and the ingress TLS secret
kubectl get certificate -n cattle-system
kubectl get secret tls-rancher-ingress -n cattle-system \
  -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -dates

# Force renewal before expiry for cert-manager-managed Rancher certificates
# Requires cmctl: https://cert-manager.io/docs/reference/cmctl/
cmctl renew <rancher-certificate-name> -n cattle-system

# Or update the secret when Rancher is using `ingress.tls.source=secret`
kubectl -n cattle-system create secret tls tls-rancher-ingress \
  --cert=tls.crt \
  --key=tls.key \
  --dry-run=client -o yaml | kubectl apply -f -

# If the issuing CA changes, update `tls-ca` as well and restart the Rancher deployment
```

## Step 5: Rotate Kubernetes Component Certificates

RKE2 automatically renews client and server certificates on startup when they are expired or within 120 days of expiry, and supports manual rotation:

```bash
# Check certificate expiry dates
rke2 certificate check --output table

# Rotate all client and server certificates on this node
# In HA clusters, rotate one control-plane node at a time
systemctl stop rke2-server

rke2 certificate rotate

systemctl start rke2-server
```

## Step 6: Monitor Certificate Expiry

```yaml
# Requires Prometheus Operator / kube-prometheus-stack CRDs
# cert-manager exposes Prometheus metrics
# Alert when certificate expires within 14 days
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-expiry-alerts
  namespace: cert-manager
spec:
  groups:
    - name: certificates
      rules:
        - alert: CertificateExpiringSoon
          expr: |
            certmanager_certificate_expiration_timestamp_seconds - time() < 1209600
          for: 1h
          annotations:
            summary: "Certificate {{ $labels.name }} in {{ $labels.namespace }} expires in less than 14 days"
          labels:
            severity: warning

        - alert: CertificateExpiryCritical
          expr: |
            certmanager_certificate_expiration_timestamp_seconds - time() < 259200
          for: 1h
          annotations:
            summary: "Certificate {{ $labels.name }} CRITICAL: expires in less than 3 days"
          labels:
            severity: critical

        - alert: CertificateRenewalFailed
          expr: |
            certmanager_certificate_ready_status{condition="False"} == 1
          for: 10m
          annotations:
            summary: "Certificate {{ $labels.name }} renewal is failing"
          labels:
            severity: critical
```

## Step 7: Wildcard Certificate Automation

```yaml
# Wildcard certificate via DNS-01 challenge using the `letsencrypt-dns` issuer above
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-company-com
  namespace: cert-manager
spec:
  secretName: wildcard-company-tls
  issuerRef:
    name: letsencrypt-dns
    kind: ClusterIssuer
  dnsNames:
    - "*.company.com"
    - "*.internal.company.com"
  duration: 2160h
  renewBefore: 720h
```

## Conclusion

cert-manager automates the lifecycle of application certificates, and it can also automate Rancher's own ingress certificate when Rancher is installed with a cert-manager-managed TLS source. Application certificates are issued and renewed automatically by cert-manager without manual intervention. RKE2 automatically renews Kubernetes client and server certificates on restart as they approach expiry, and supports manual rotation with `rke2 certificate rotate`. The combination of cert-manager Prometheus metrics and PrometheusRule alerts ensures certificate expiry never causes unexpected outages-the team is notified weeks before expiry, with critical alerts for any renewal failures.
