# How to Set Up Service Mesh mTLS with External Certificate Authority Using cert-manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Mesh, mTLS, cert-manager, PKI, Security

Description: Learn how to configure Istio or Linkerd service mesh to use an external Certificate Authority managed by cert-manager for issuing mTLS certificates, enabling integration with enterprise PKI systems and custom certificate policies.

---

Service meshes ship with built-in certificate authorities for mTLS, but production environments often require integration with existing PKI infrastructure. Your security team may mandate HashiCorp Vault for certificate issuance, or compliance requirements may dictate using your organization's CA.

This guide demonstrates how to replace the mesh's default CA with cert-manager backed by external certificate authorities, giving you centralized certificate management across your entire infrastructure.

## Understanding Service Mesh Certificate Requirements

Service meshes use short-lived certificates for workload identity. Certificates typically expire after 24 hours and are automatically rotated. The CA must support high-volume issuance and fast response times.

Istio and Linkerd both support pluggable CA backends through cert-manager integration. The mesh's control plane requests certificates via cert-manager's API, which handles communication with the external CA.

## Installing cert-manager

Deploy cert-manager to your cluster:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager
```

Create a ClusterIssuer for your external CA. For Vault:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    server: https://vault.company.com:8200
    path: pki/sign/istio-mesh
    auth:
      kubernetes:
        mountPath: /v1/auth/kubernetes
        role: cert-manager
        secretRef:
          name: cert-manager-vault-token
          key: token
```

For a private CA:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ca-key-pair
  namespace: cert-manager
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-ca-cert>
  tls.key: <base64-encoded-ca-key>
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: private-ca-issuer
spec:
  ca:
    secretName: ca-key-pair
```

## Configuring Istio with cert-manager

Install istio-csr to bridge Istio and cert-manager:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager-istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set app.certmanager.issuer.name=vault-issuer \
  --set app.certmanager.issuer.kind=ClusterIssuer \
  --set app.server.maxCertificateDuration=1h
```

Install Istio configured to use the external CA:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-with-external-ca
  namespace: istio-system
spec:
  meshConfig:
    # Disable built-in CA
    ca:
      address: cert-manager-istio-csr.cert-manager.svc:443
      tlsSettings:
        mode: SIMPLE
        sni: cert-manager-istio-csr.cert-manager.svc

    # Certificate configuration
    defaultConfig:
      proxyMetadata:
        ISTIO_META_CERT_SIGNER: cert-manager

  components:
    pilot:
      k8s:
        env:
        - name: CERT_SIGNER_DOMAIN
          value: cert-manager.cert-manager.svc
        - name: PILOT_CERT_PROVIDER
          value: kubernetes
        - name: EXTERNAL_CA
          value: ISTIOD_RA_KUBERNETES_API

  values:
    global:
      # Use cert-manager for CA
      pilotCertProvider: kubernetes
```

Apply the configuration:

```bash
istioctl install -f istio-external-ca.yaml
```

## Configuring Linkerd with cert-manager

Install Linkerd with cert-manager integration:

```bash
# Install Linkerd CRDs
linkerd install --crds | kubectl apply -f -

# Create trust anchor from cert-manager
kubectl get secret -n cert-manager ca-key-pair -o jsonpath='{.data.tls\.crt}' | \
  base64 -d > ca.crt

# Install Linkerd control plane
linkerd install \
  --identity-external-issuer \
  --identity-trust-anchors-file ca.crt \
  | kubectl apply -f -
```

Deploy linkerd-cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: linkerd-identity-issuer
  namespace: linkerd
spec:
  secretName: linkerd-identity-issuer
  duration: 48h
  renewBefore: 25h
  issuerRef:
    name: vault-issuer
    kind: ClusterIssuer
  commonName: identity.linkerd.cluster.local
  dnsNames:
  - identity.linkerd.cluster.local
  isCA: true
  privateKey:
    algorithm: ECDSA
  usages:
  - cert sign
  - crl sign
  - server auth
  - client auth
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: linkerd-cert-manager
  namespace: linkerd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: linkerd-cert-manager
  namespace: linkerd
rules:
- apiGroups: ['']
  resources: ['secrets']
  verbs: ['get', 'update']
  resourceNames: ['linkerd-identity-issuer']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: linkerd-cert-manager
  namespace: linkerd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: linkerd-cert-manager
subjects:
- kind: ServiceAccount
  name: linkerd-cert-manager
  namespace: linkerd
```

## Configuring Vault PKI Backend

Set up Vault for mesh certificate issuance:

```bash
# Enable PKI secrets engine
vault secrets enable -path=pki pki

# Configure max lease TTL
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA
vault write -field=certificate pki/root/generate/internal \
  common_name="Mesh Root CA" \
  ttl=87600h > ca_cert.pem

# Create role for Istio
vault write pki/roles/istio-mesh \
  allowed_domains="cluster.local,svc" \
  allow_subdomains=true \
  max_ttl=24h \
  require_cn=false

# Enable Kubernetes auth
vault auth enable kubernetes

vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

vault write auth/kubernetes/role/cert-manager \
  bound_service_account_names=cert-manager \
  bound_service_account_namespaces=cert-manager \
  policies=pki-policy \
  ttl=24h
```

Create Vault policy for cert-manager:

```bash
vault policy write pki-policy - <<EOF
path "pki/sign/istio-mesh" {
  capabilities = ["create", "update"]
}
path "pki/issue/istio-mesh" {
  capabilities = ["create"]
}
EOF
```

## Monitoring Certificate Issuance

Track certificate metrics:

```promql
# Certificate expiration time
certmanager_certificate_expiration_timestamp_seconds

# Certificate renewal errors
certmanager_certificate_renewal_errors_total

# Certificate ready status
certmanager_certificate_ready_status
```

Set up alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-alerts
  namespace: cert-manager
spec:
  groups:
  - name: certificates
    rules:
    - alert: CertificateExpiringSoon
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) < 86400
      annotations:
        summary: "Certificate {{ $labels.name }} expires in less than 24h"

    - alert: CertificateRenewalFailing
      expr: |
        certmanager_certificate_renewal_errors_total > 0
      for: 1h
      annotations:
        summary: "Certificate renewal failing for {{ $labels.name }}"
```

## Validating mTLS with External Certificates

Verify certificates are issued by external CA:

```bash
# Extract certificate from a pod
kubectl exec -n production deploy/api-gateway -c istio-proxy -- \
  openssl s_client -connect localhost:15000 -showcerts < /dev/null 2>&1 | \
  openssl x509 -text -noout

# Check issuer
kubectl exec -n production deploy/api-gateway -c istio-proxy -- \
  cat /var/run/secrets/istio/root-cert.pem | openssl x509 -text -noout | grep Issuer
```

Test mTLS connectivity:

```bash
# Deploy test client
kubectl run test-mtls --image=curlimages/curl -it --rm -- sh

# Inside pod, test connection
curl -v https://api-gateway.production:8080
```

## Handling Certificate Rotation

cert-manager automatically rotates certificates before expiration. Configure rotation thresholds:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mesh-workload-cert
  namespace: production
spec:
  secretName: workload-cert
  duration: 24h
  renewBefore: 8h  # Renew 8 hours before expiration
  issuerRef:
    name: vault-issuer
    kind: ClusterIssuer
  privateKey:
    algorithm: ECDSA
    size: 256
  usages:
  - digital signature
  - key encipherment
  - server auth
  - client auth
```

Monitor rotation events:

```bash
kubectl get events -n production --field-selector reason=Issuing,reason=Renewed
```

## Troubleshooting External CA Integration

Check cert-manager logs:

```bash
kubectl logs -n cert-manager deployment/cert-manager -f
```

Verify issuer connectivity:

```bash
kubectl describe clusterissuer vault-issuer
```

Test certificate request manually:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: test-cert
  namespace: default
spec:
  secretName: test-cert-secret
  issuerRef:
    name: vault-issuer
    kind: ClusterIssuer
  commonName: test.cluster.local
  dnsNames:
  - test.cluster.local
```

Check certificate status:

```bash
kubectl describe certificate test-cert
kubectl get certificaterequest
```

Integrating service mesh mTLS with external CAs through cert-manager provides centralized certificate management, compliance with organizational PKI policies, and seamless integration with existing security infrastructure.
