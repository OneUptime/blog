# Set Up Service Mesh mTLS with External Certificate Authority Using cert-manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Mesh, mTLS, Cert-Manager, PKI, Security

Description: Learn how to configure Istio or Linkerd service mesh to use an external Certificate Authority managed by cert-manager for issuing mTLS certificates.

---

Service meshes ship with built-in certificate authorities for mTLS, but production environments often require integration with existing PKI infrastructure. Your security team may mandate HashiCorp Vault for certificate issuance, or compliance requirements may dictate using your organization's CA.

This guide demonstrates how to replace the mesh's default CA with cert-manager backed by external certificate authorities, giving you centralized certificate management across your entire infrastructure.

## Understanding Service Mesh Certificate Requirements

Service meshes use short-lived certificates for workload identity. Certificates typically expire after 24 hours and are automatically rotated. The CA must support high-volume issuance and fast response times.

Istio can delegate workload certificate signing to cert-manager through istio-csr. Linkerd uses cert-manager to manage and rotate its identity issuer certificate, while Linkerd's identity service continues to issue the short-lived workload certificates from that issuer.

## Installing cert-manager

Deploy cert-manager to your cluster:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.20.2/cert-manager.yaml

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
helm upgrade cert-manager-istio-csr oci://quay.io/jetstack/charts/cert-manager-istio-csr \
  --install \
  --namespace cert-manager \
  --wait \
  --set app.certmanager.issuer.name=vault-issuer \
  --set app.certmanager.issuer.kind=ClusterIssuer \
  --set app.certmanager.issuer.group=cert-manager.io \
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
  profile: default
  meshConfig:
    trustDomain: cluster.local

  components:
    pilot:
      k8s:
        env:
        # Disable istiod's built-in CA server
        - name: ENABLE_CA_SERVER
          value: "false"

  values:
    global:
      # Send workload certificate requests to istio-csr
      caAddress: cert-manager-istio-csr.cert-manager.svc:443
```

Apply the configuration:

```bash
istioctl install -f istio-external-ca.yaml
```

## Configuring Linkerd with cert-manager

Install the Linkerd CRDs and prepare the trust anchor:

```bash
# Install Linkerd CRDs
linkerd install --crds | kubectl apply -f -

# Create the control plane namespace
kubectl create namespace linkerd --dry-run=client -o yaml | kubectl apply -f -

# Create trust anchor from cert-manager
kubectl get secret -n cert-manager ca-key-pair -o jsonpath='{.data.tls\.crt}' | \
  base64 -d > ca.crt

```

Create the Linkerd identity issuer certificate with cert-manager:

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
  isCA: true
  privateKey:
    rotationPolicy: Always
    algorithm: ECDSA
  usages:
  - cert sign
  - crl sign
```

Install the Linkerd control plane after the `linkerd-identity-issuer` Secret is ready:

```bash
linkerd install \
  --identity-external-issuer \
  --identity-trust-anchors-file ca.crt \
  | kubectl apply -f -
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
  allowed_uri_sans="spiffe://cluster.local/*" \
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

# Certificate renewal time
certmanager_certificate_renewal_timestamp_seconds

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

    - alert: CertificateNotReady
      expr: |
        certmanager_certificate_ready_status{condition="False"} == 1
      for: 1h
      annotations:
        summary: "Certificate {{ $labels.name }} is not ready"
```

## Validating mTLS with External Certificates

Verify certificates are issued by external CA:

```bash
# Extract certificate from a pod
kubectl exec -n production deploy/api-gateway -c istio-proxy -- \
  openssl s_client -connect api-gateway.production:8080 -showcerts < /dev/null 2>&1 | \
  openssl x509 -text -noout

# Check issuer
istioctl proxy-config secret deployment/api-gateway.production -o json | \
  jq -r '.dynamicActiveSecrets[] |
    select(.name == "default").secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep Issuer
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
kubectl get events -n production --field-selector reason=Issuing
kubectl get events -n linkerd --field-selector reason=IssuerUpdated
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
