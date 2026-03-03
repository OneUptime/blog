# How to Configure cert-manager on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, cert-manager, TLS, Certificate, Kubernetes, PKI

Description: A detailed guide to installing, configuring, and managing cert-manager on Talos Linux for automated certificate lifecycle management.

---

cert-manager is the de facto standard for managing TLS certificates in Kubernetes. It automates the issuance and renewal of certificates from a variety of sources including Let's Encrypt, HashiCorp Vault, Venafi, and self-signed CAs. On Talos Linux, cert-manager is particularly valuable because the immutable nature of the OS means you cannot manually place certificate files on nodes. Everything must go through Kubernetes APIs, and cert-manager handles that seamlessly.

This guide covers a thorough setup of cert-manager on Talos Linux, including installation, configuring multiple issuers, managing certificates across namespaces, and monitoring the certificate lifecycle.

## What cert-manager Does

cert-manager adds certificate management capabilities to Kubernetes through custom resource definitions. It watches for Certificate resources and ensures the requested certificates are available and up to date. When a certificate is about to expire, cert-manager automatically renews it. It supports multiple certificate authorities and challenge mechanisms, making it flexible enough for both internal and external certificate needs.

The main custom resources cert-manager introduces are:

- **Issuer / ClusterIssuer**: Defines where certificates come from
- **Certificate**: Declares what certificate you want
- **CertificateRequest**: An internal resource representing a single request
- **Order / Challenge**: Used for ACME-based issuers

## Prerequisites

Make sure you have:

- A Talos Linux cluster running Kubernetes 1.24 or newer
- `kubectl` configured for cluster access
- Helm 3 installed

```bash
# Verify cluster version and health
kubectl version
kubectl get nodes
```

## Installing cert-manager

The recommended installation method is Helm:

```bash
# Add the Jetstack repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs included
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.0 \
  --set crds.enabled=true \
  --set prometheus.enabled=true
```

Verify the installation:

```bash
# All three pods should be Running
kubectl get pods -n cert-manager

# cert-manager - the main controller
# cert-manager-cainjector - injects CA bundles into resources
# cert-manager-webhook - validates and mutates cert-manager resources

# Verify CRDs
kubectl get crd | grep cert-manager
```

You should see CRDs for certificates, issuers, orders, challenges, and certificaterequests.

## Setting Up a Self-Signed Issuer

A self-signed issuer is useful for development, testing, and internal services:

```yaml
# self-signed-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
```

```bash
kubectl apply -f self-signed-issuer.yaml
kubectl get clusterissuer selfsigned-issuer
```

## Creating an Internal CA

For a more realistic internal PKI, create a CA certificate and use it to sign other certificates:

```yaml
# internal-ca.yaml

# First, create a self-signed CA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: internal-ca
  secretName: internal-ca-secret
  duration: 87600h  # 10 years
  renewBefore: 8760h  # 1 year before expiry
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
    group: cert-manager.io

---
# Then create a ClusterIssuer that uses this CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca-issuer
spec:
  ca:
    secretName: internal-ca-secret
```

```bash
kubectl apply -f internal-ca.yaml

# Verify the CA certificate was created
kubectl get certificate -n cert-manager internal-ca
kubectl get clusterissuer internal-ca-issuer
```

Now you can issue certificates signed by your internal CA:

```yaml
# internal-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-service-cert
  namespace: default
spec:
  secretName: my-service-tls
  duration: 2160h  # 90 days
  renewBefore: 360h  # 15 days
  issuerRef:
    name: internal-ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - my-service.default.svc.cluster.local
  - my-service.default.svc
  ipAddresses:
  - 10.96.0.100
```

## Configuring an ACME Issuer

For publicly trusted certificates, use an ACME issuer with Let's Encrypt:

```yaml
# acme-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account
    solvers:
    # HTTP-01 solver for standard domains
    - http01:
        ingress:
          ingressClassName: nginx
    # DNS-01 solver for wildcard domains
    - dns01:
        cloudflare:
          email: admin@example.com
          apiTokenSecretRef:
            name: cloudflare-token
            key: api-token
      selector:
        dnsZones:
        - "example.com"
```

## Configuring a Vault Issuer

If you use HashiCorp Vault for PKI, cert-manager can integrate directly:

```yaml
# vault-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    server: https://vault.example.com
    path: pki/sign/my-role
    caBundle: <base64-encoded-ca-bundle>
    auth:
      kubernetes:
        role: cert-manager
        mountPath: /v1/auth/kubernetes
        serviceAccountRef:
          name: cert-manager
```

## Certificate Annotations for Ingress

The simplest way to get certificates is through ingress annotations:

```yaml
# annotated-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    cert-manager.io/common-name: "web.example.com"
    cert-manager.io/duration: "2160h"
    cert-manager.io/renew-before: "360h"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - web.example.com
    secretName: web-app-tls
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
```

## Monitoring and Troubleshooting

cert-manager provides several ways to monitor certificate health:

```bash
# List all certificates and their status
kubectl get certificates --all-namespaces

# Detailed certificate info
kubectl describe certificate my-service-cert -n default

# Check certificate requests
kubectl get certificaterequests --all-namespaces

# Check ACME orders and challenges
kubectl get orders --all-namespaces
kubectl get challenges --all-namespaces

# cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager --tail=200
```

For Prometheus monitoring, cert-manager exposes metrics:

```bash
# Port-forward to check metrics
kubectl port-forward -n cert-manager svc/cert-manager 9402:9402
curl http://localhost:9402/metrics
```

Key metrics to monitor:

- `certmanager_certificate_ready_status` - Whether certificates are ready
- `certmanager_certificate_expiration_timestamp_seconds` - When certificates expire
- `certmanager_certificate_renewal_timestamp_seconds` - When renewal is scheduled

## Talos-Specific Configuration

On Talos Linux, cert-manager works without any special configuration. However, there are a few things to keep in mind:

1. All certificate storage happens in Kubernetes secrets, which is the only option on Talos since the filesystem is read-only
2. If you are using Vault, make sure the Vault server is accessible from the cluster network
3. For DNS-01 challenges, ensure the cert-manager pods can reach external DNS APIs

```bash
# Verify cert-manager can resolve external DNS
kubectl exec -n cert-manager deploy/cert-manager -- nslookup acme-v02.api.letsencrypt.org

# Check if network policies are blocking cert-manager
kubectl get networkpolicies -n cert-manager
```

## Best Practices

1. Always start with staging issuers before switching to production
2. Set appropriate `renewBefore` values - at least 30 days for ACME certificates
3. Use ClusterIssuers when certificates are needed across multiple namespaces
4. Monitor certificate expiration with Prometheus alerts
5. Keep cert-manager updated to get the latest security fixes and features

## Conclusion

cert-manager on Talos Linux provides a complete certificate management solution that aligns perfectly with the declarative, Kubernetes-native approach. Whether you need self-signed certificates for development, an internal CA for service-to-service communication, or publicly trusted certificates from Let's Encrypt, cert-manager handles it all through simple Kubernetes resources. The automated renewal ensures your certificates never expire, and the Prometheus metrics give you visibility into the health of your certificate infrastructure.
