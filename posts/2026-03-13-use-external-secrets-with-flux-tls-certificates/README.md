# How to Use External Secrets with Flux for TLS Certificates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, TLS, Certificates

Description: Sync TLS certificates from external secret stores using ESO and Flux CD, enabling centralized certificate management and automatic rotation for Kubernetes Ingress and services.

---

## Introduction

TLS certificates are time-sensitive secrets with a hard expiry date. When a certificate expires, your services become inaccessible and browsers show security warnings - one of the most visible production failures possible. While cert-manager is excellent for certificates issued by Let's Encrypt or internal CAs, many organizations manage certificates through centralized certificate management systems or purchase wildcard certificates that are stored in secret stores like AWS Secrets Manager or HashiCorp Vault.

The External Secrets Operator bridges centralized certificate stores and Kubernetes, syncing certificates into `kubernetes.io/tls` typed Secrets that Ingress controllers and services can consume directly. Combined with Flux CD for configuration management and a short refresh interval, ESO ensures your Ingress controllers always have the latest certificate, well ahead of expiry.

This guide covers syncing TLS certificates from AWS Secrets Manager and HashiCorp Vault into Kubernetes using ESO with Flux CD.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- TLS certificates stored in your external secret store (PEM format)
- A `SecretStore` or `ClusterSecretStore` configured
- An Ingress controller deployed in the cluster

## Step 1: Store Certificates in the External Store

Store certificates and private keys as JSON objects in your secret store. Use PEM-encoded strings:

**AWS Secrets Manager - Secret: `platform/tls/wildcard-example-com`**
```json
{
  "certificate": "-----BEGIN CERTIFICATE-----\nMIID...BASE64...\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nMIID...CHAIN...\n-----END CERTIFICATE-----",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIE...BASE64...\n-----END RSA PRIVATE KEY-----",
  "expiry": "2026-12-31"
}
```

## Step 2: Sync a Wildcard TLS Certificate

Create an `ExternalSecret` with a `kubernetes.io/tls` template to produce a properly typed Secret:

```yaml
# clusters/my-cluster/platform/tls/externalsecret-wildcard.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: wildcard-example-com-tls
  namespace: ingress-nginx
  annotations:
    # Document certificate details for operators
    cert-expiry: "2026-12-31"
    cert-domains: "*.example.com, example.com"
spec:
  # Refresh every 6 hours to pick up renewed certificates promptly
  refreshInterval: 6h
  secretStoreRef:
    # Use ClusterSecretStore for cluster-wide TLS certificates
    name: platform-aws-secrets
    kind: ClusterSecretStore
  target:
    name: wildcard-example-com-tls
    creationPolicy: Owner
    deletionPolicy: Delete
    template:
      engineVersion: v2
      # Must be kubernetes.io/tls for Ingress controllers
      type: kubernetes.io/tls
      data:
        tls.crt: "{{ .certificate }}"
        tls.key: "{{ .private_key }}"
  data:
    - secretKey: certificate
      remoteRef:
        key: platform/tls/wildcard-example-com
        property: certificate
    - secretKey: private_key
      remoteRef:
        key: platform/tls/wildcard-example-com
        property: private_key
```

## Step 3: Reference the TLS Secret in an Ingress

```yaml
# clusters/my-cluster/apps/myapp/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      # Reference the ESO-managed TLS Secret
      secretName: wildcard-example-com-tls
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

## Step 4: Distribute Certificates Across Namespaces

Use `ClusterExternalSecret` to distribute a TLS certificate across multiple namespaces automatically:

```yaml
# clusters/my-cluster/platform/tls/cluster-external-secret-tls.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterExternalSecret
metadata:
  name: wildcard-tls-all-namespaces
spec:
  externalSecretName: wildcard-tls
  # Apply to all namespaces matching this selector
  namespaceSelector:
    matchLabels:
      tls.platform.io/wildcard: "true"
  refreshTime: 1h
  externalSecretSpec:
    refreshInterval: 6h
    secretStoreRef:
      name: platform-aws-secrets
      kind: ClusterSecretStore
    target:
      name: wildcard-example-com-tls
      creationPolicy: Owner
      template:
        type: kubernetes.io/tls
        data:
          tls.crt: "{{ .certificate }}"
          tls.key: "{{ .private_key }}"
    data:
      - secretKey: certificate
        remoteRef:
          key: platform/tls/wildcard-example-com
          property: certificate
      - secretKey: private_key
        remoteRef:
          key: platform/tls/wildcard-example-com
          property: private_key
```

## Step 5: Set Up Certificate Expiry Alerting

Monitor certificate expiry using Prometheus to alert before ESO picks up the renewed certificate:

```yaml
# clusters/my-cluster/platform/tls/cert-expiry-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tls-cert-expiry
  namespace: monitoring
spec:
  groups:
    - name: tls-certificates
      rules:
        - alert: TLSCertificateExpiringSoon
          # x509_cert_expiry is provided by the x509-certificate-exporter
          expr: x509_cert_expiry - time() < 86400 * 30
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "TLS certificate expires in less than 30 days"
```

## Step 6: Manage with Flux Kustomization

```yaml
# clusters/my-cluster/platform/tls/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: platform-tls
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/platform/tls
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: external-secrets
  healthChecks:
    - apiVersion: external-secrets.io/v1beta1
      kind: ExternalSecret
      name: wildcard-example-com-tls
      namespace: ingress-nginx
```

## Best Practices

- Always use `type: kubernetes.io/tls` in the template to ensure the Secret is typed correctly for Ingress and other TLS consumers.
- Use `ClusterExternalSecret` to distribute a single certificate to many namespaces rather than creating duplicate `ExternalSecret` resources.
- Set `refreshInterval: 6h` for certificates with 90-day validity; reduce to `1h` within 7 days of expiry as a safety measure.
- Store the full certificate chain (leaf + intermediates) in the `tls.crt` key for proper TLS handshake with all clients.
- Add the `cert-expiry` annotation to `ExternalSecret` manifests for operators to quickly see expiry dates without querying the external store.

## Conclusion

Using External Secrets Operator with Flux CD for TLS certificate management provides a centralized, rotation-aware approach to certificate distribution across Kubernetes clusters. By storing certificates in a purpose-built secret store and syncing them into properly typed Kubernetes Secrets, you eliminate manual certificate updates, ensure Ingress controllers always have the latest certificate, and gain centralized visibility into certificate expiry across your entire fleet.
