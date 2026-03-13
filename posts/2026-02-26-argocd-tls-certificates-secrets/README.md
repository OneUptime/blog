# How to Manage TLS Certificates as Secrets with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, TLS, Cert-Manager

Description: Learn how to manage TLS certificates as Kubernetes secrets in ArgoCD environments using cert-manager, Sealed Secrets, and External Secrets Operator for automated certificate lifecycle management.

---

TLS certificates are a special category of secrets in Kubernetes. They need to be present before services start, they expire and need renewal, and they often come from multiple sources like Let's Encrypt, internal CAs, or purchased certificates. Managing them in a GitOps workflow with ArgoCD requires careful planning to avoid downtime from expired certificates or sync conflicts.

In this guide, I will show you how to handle TLS certificates in ArgoCD environments using cert-manager for automated issuance, Sealed Secrets for manually provided certificates, and External Secrets Operator for certificates stored in external vaults.

## Understanding TLS Secrets in Kubernetes

Kubernetes stores TLS certificates as secrets of type `kubernetes.io/tls`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-tls-cert
  namespace: production
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded certificate>
  tls.key: <base64-encoded private key>
  ca.crt: <base64-encoded CA certificate>  # Optional
```

Ingress controllers, service meshes, and applications reference these secrets for HTTPS termination.

## Approach 1: cert-manager with ArgoCD

cert-manager is the standard tool for automating TLS certificate management in Kubernetes. It works well with ArgoCD because you declare Certificate resources in Git, and cert-manager handles the actual issuance and renewal.

### Deploy cert-manager via ArgoCD

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-10"
spec:
  project: infrastructure
  source:
    repoURL: https://charts.jetstack.io
    chart: cert-manager
    targetRevision: v1.14.0
    helm:
      values: |
        installCRDs: true
        resources:
          requests:
            memory: 128Mi
            cpu: 50m
        prometheus:
          servicemonitor:
            enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=true
```

### Configure Certificate Issuers

Declare your certificate issuers in Git:

```yaml
# issuers/letsencrypt-production.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-production-key
    solvers:
      - http01:
          ingress:
            class: nginx
      - dns01:
          cloudDNS:
            project: my-gcp-project
            serviceAccountSecretRef:
              name: clouddns-dns01-solver-svc-acct
              key: key.json

---
# issuers/internal-ca.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-key-pair
```

### Declare Certificates in Git

```yaml
# apps/myapp/base/certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: myapp-tls
  namespace: production
spec:
  secretName: myapp-tls-cert
  duration: 2160h    # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  dnsNames:
    - myapp.example.com
    - api.myapp.example.com
  privateKey:
    algorithm: RSA
    size: 2048
```

### Configure ArgoCD to Ignore cert-manager Updates

cert-manager creates and updates the TLS Secret. Tell ArgoCD to not fight over it:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/apps.git
    targetRevision: main
    path: apps/myapp/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    # cert-manager manages the TLS secret content
    - group: ""
      kind: Secret
      name: myapp-tls-cert
      jsonPointers:
        - /data
        - /metadata/annotations
        - /metadata/labels
    # cert-manager updates Certificate status
    - group: cert-manager.io
      kind: Certificate
      jsonPointers:
        - /status
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - RespectIgnoreDifferences=true
```

## Approach 2: Sealed Secrets for Manual Certificates

For certificates purchased from commercial CAs or provided by your security team, Sealed Secrets lets you store them encrypted in Git:

```bash
# Create the TLS secret
kubectl create secret tls wildcard-cert \
  --cert=wildcard.example.com.crt \
  --key=wildcard.example.com.key \
  --dry-run=client -o yaml > tls-secret.yaml

# Add the CA certificate if needed
kubectl create secret generic wildcard-cert \
  --from-file=tls.crt=wildcard.example.com.crt \
  --from-file=tls.key=wildcard.example.com.key \
  --from-file=ca.crt=ca-bundle.crt \
  --dry-run=client -o yaml > tls-secret.yaml

# Seal it
kubeseal --cert .sealed-secrets/pub-cert.pem \
  --format yaml < tls-secret.yaml > sealed-tls-secret.yaml

# Clean up plaintext
rm tls-secret.yaml
```

The sealed secret is safe for Git:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: wildcard-cert
  namespace: production
spec:
  encryptedData:
    tls.crt: AgBy3i4OJSWK+PiTySYZZA9rO43cGDEq...
    tls.key: AgCtr8pMQLpEY2YJIuc+7RHKM43bGDzq...
    ca.crt: AgDfr5pKRTpEY2YJIuc+8TLKM43bHEaq...
  template:
    metadata:
      name: wildcard-cert
      namespace: production
    type: kubernetes.io/tls
```

## Approach 3: External Secrets for Vault-Stored Certificates

If your organization stores certificates in HashiCorp Vault or AWS Certificate Manager:

```yaml
# Store certificate in Vault
# vault kv put secret/tls/wildcard \
#   tls.crt=@wildcard.crt \
#   tls.key=@wildcard.key \
#   ca.crt=@ca.crt

apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: wildcard-tls
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-store
    kind: ClusterSecretStore
  target:
    name: wildcard-tls-cert
    creationPolicy: Owner
    template:
      type: kubernetes.io/tls
      data:
        tls.crt: "{{ .cert }}"
        tls.key: "{{ .key }}"
        ca.crt: "{{ .ca }}"
  data:
    - secretKey: cert
      remoteRef:
        key: secret/data/tls/wildcard
        property: tls.crt
    - secretKey: key
      remoteRef:
        key: secret/data/tls/wildcard
        property: tls.key
    - secretKey: ca
      remoteRef:
        key: secret/data/tls/wildcard
        property: ca.crt
```

## Approach 4: Vault PKI Secrets Engine

For internal services, use Vault's PKI engine to issue certificates dynamically:

```bash
# Enable PKI secrets engine
vault secrets enable pki

# Set max TTL
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA
vault write pki/root/generate/internal \
  common_name="Internal CA" \
  ttl=87600h

# Create a role for issuing certificates
vault write pki/roles/internal-services \
  allowed_domains="svc.cluster.local,internal.example.com" \
  allow_subdomains=true \
  max_ttl=72h
```

Use ESO to request certificates:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: service-tls
  namespace: production
spec:
  refreshInterval: 24h
  secretStoreRef:
    name: vault-pki
    kind: ClusterSecretStore
  target:
    name: service-tls-cert
    creationPolicy: Owner
    template:
      type: kubernetes.io/tls
      data:
        tls.crt: "{{ .certificate }}"
        tls.key: "{{ .private_key }}"
        ca.crt: "{{ .issuing_ca }}"
  data:
    - secretKey: certificate
      remoteRef:
        key: pki/issue/internal-services
        property: certificate
    - secretKey: private_key
      remoteRef:
        key: pki/issue/internal-services
        property: private_key
    - secretKey: issuing_ca
      remoteRef:
        key: pki/issue/internal-services
        property: issuing_ca
```

## Using TLS Secrets with Ingress

Reference the TLS secret in your Ingress resource, which ArgoCD manages from Git:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-production
spec:
  tls:
    - hosts:
        - myapp.example.com
        - api.myapp.example.com
      secretName: myapp-tls-cert
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

## Monitoring Certificate Expiry

Set up alerts for certificates approaching expiry:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-alerts
  namespace: monitoring
spec:
  groups:
    - name: certificates
      rules:
        - alert: CertificateExpiringSoon
          expr: |
            certmanager_certificate_expiration_timestamp_seconds - time() < 7 * 24 * 3600
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Certificate {{ $labels.name }} expires in less than 7 days"

        - alert: CertificateExpired
          expr: |
            certmanager_certificate_expiration_timestamp_seconds - time() < 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Certificate {{ $labels.name }} has expired"
```

Use OneUptime to set up comprehensive monitoring dashboards that track both certificate health and ArgoCD sync status across your clusters.

## Sync Wave Ordering

Make sure certificates are issued before the Ingress or application that needs them:

```yaml
# Certificate created first (wave -1)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: myapp-tls
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
# Ingress created after (wave 0)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    argocd.argoproj.io/sync-wave: "0"
```

## Summary

Managing TLS certificates in ArgoCD comes down to choosing the right tool for each certificate type. Use cert-manager for certificates that need automated issuance and renewal from ACME providers. Use Sealed Secrets or ESO for certificates provided externally. Use Vault PKI for internal service certificates that need dynamic issuance. In all cases, configure ArgoCD's `ignoreDifferences` to prevent conflicts between ArgoCD and the certificate management tool, and set up monitoring to catch expiry before it causes outages.
