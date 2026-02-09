# How to Implement cert-manager Integration with External PKI Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, cert-manager, PKI, Security

Description: Learn how to integrate cert-manager with external PKI infrastructure including enterprise certificate authorities, hardware security modules, and existing certificate management systems.

---

Many organizations already have established Public Key Infrastructure (PKI) systems in place. These enterprise PKI solutions include dedicated certificate authorities, hardware security modules (HSMs), and sophisticated certificate lifecycle management tools. Rather than replacing these systems, cert-manager can integrate with them to extend certificate automation to Kubernetes workloads.

In this guide, you'll learn how to connect cert-manager to external PKI infrastructure, including enterprise CAs, HSMs, EJBCA, Microsoft Active Directory Certificate Services, and other existing certificate management systems.

## Understanding External PKI Integration

cert-manager provides several integration points for external PKI:

1. **Venafi issuer** - Integrates with Venafi Trust Protection Platform and Venafi Cloud
2. **Vault issuer** - Connects to HashiCorp Vault PKI secrets engine
3. **External issuer pattern** - Custom issuers for proprietary PKI systems
4. **CA issuer with external signing** - Import certificates from external CAs

Each approach has different trade-offs in terms of security, automation capabilities, and complexity.

## Integrating with HashiCorp Vault PKI

HashiCorp Vault provides a PKI secrets engine that can act as an intermediate or root CA. Configure Vault first:

```bash
# Enable PKI secrets engine
vault secrets enable pki

# Configure max lease TTL
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA
vault write pki/root/generate/internal \
    common_name="Internal Root CA" \
    ttl=87600h

# Configure CA and CRL URLs
vault write pki/config/urls \
    issuing_certificates="http://vault.example.com:8200/v1/pki/ca" \
    crl_distribution_points="http://vault.example.com:8200/v1/pki/crl"

# Create a role
vault write pki/roles/kubernetes-certs \
    allowed_domains="example.com,svc.cluster.local" \
    allow_subdomains=true \
    max_ttl="2160h"
```

Create a Kubernetes service account for cert-manager to authenticate with Vault:

```bash
# Enable Kubernetes auth in Vault
vault auth enable kubernetes

vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc:443" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
    token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token

# Create policy for cert-manager
vault policy write cert-manager - <<EOF
path "pki/sign/kubernetes-certs" {
  capabilities = ["create", "update"]
}

path "pki/issue/kubernetes-certs" {
  capabilities = ["create"]
}
EOF

# Bind policy to service account
vault write auth/kubernetes/role/cert-manager \
    bound_service_account_names=cert-manager \
    bound_service_account_namespaces=cert-manager \
    policies=cert-manager \
    ttl=1h
```

Configure cert-manager Vault issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    path: pki/sign/kubernetes-certs
    server: https://vault.example.com:8200
    auth:
      kubernetes:
        role: cert-manager
        mountPath: /v1/auth/kubernetes
        secretRef:
          name: cert-manager-token
          key: token
```

Create a certificate using the Vault issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: vault-issued-cert
  namespace: default
spec:
  secretName: vault-issued-tls
  duration: 2160h
  renewBefore: 720h
  commonName: service.example.com
  dnsNames:
    - service.example.com
    - service.default.svc.cluster.local
  issuerRef:
    name: vault-issuer
    kind: ClusterIssuer
```

## Integrating with Venafi Enterprise PKI

Venafi Trust Protection Platform is widely used in enterprises for certificate lifecycle management. Install the Venafi issuer:

```bash
# Install Venafi enhanced issuer
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install venafi-enhanced-issuer jetstack/venafi-enhanced-issuer \
  --namespace venafi \
  --create-namespace
```

Create a secret with Venafi credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: venafi-tpp-credentials
  namespace: cert-manager
type: Opaque
stringData:
  access-token: "your-venafi-access-token"
```

Configure the Venafi issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: venafi-tpp-issuer
spec:
  venafi:
    zone: "Kubernetes\\Certificates"
    tpp:
      url: https://tpp.example.com/vedsdk
      credentialsRef:
        name: venafi-tpp-credentials
```

Request certificates that comply with enterprise policies:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: enterprise-cert
  namespace: production
spec:
  secretName: enterprise-tls
  commonName: api.example.com
  dnsNames:
    - api.example.com
    - www.example.com
  issuerRef:
    name: venafi-tpp-issuer
    kind: ClusterIssuer
  # Venafi will enforce organizational policies
  usages:
    - server auth
  privateKey:
    algorithm: RSA
    size: 2048
```

Venafi TPP will validate the request against configured policies and issue certificates accordingly.

## Integrating with Microsoft AD Certificate Services

Microsoft Active Directory Certificate Services (AD CS) is common in Windows-based enterprises. Use the CA issuer with certificates exported from AD CS:

```bash
# Export the CA certificate from AD CS
# On Windows Server with AD CS:
certutil -ca.cert ca_cert.cer

# Convert to PEM format
openssl x509 -inform der -in ca_cert.cer -out ca_cert.pem

# Create Kubernetes secret
kubectl create secret generic adcs-ca-cert \
  --from-file=tls.crt=ca_cert.pem \
  --from-file=tls.key=ca_key.pem \
  -n cert-manager
```

For automated certificate requests, use an external issuer that communicates with AD CS:

```yaml
# Using a hypothetical AD CS external issuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: adcs-issuer
spec:
  externalIssuer:
    group: adcs.certmanager.io
    kind: ADCSIssuer
    name: windows-ca
```

## Creating Custom External Issuers

For proprietary PKI systems, implement a custom external issuer. The external issuer framework provides a standardized interface:

```go
package main

import (
    "context"
    "github.com/cert-manager/cert-manager/pkg/apis/certmanager/v1"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

type CustomIssuerController struct {
    client client.Client
    pkiClient *YourPKIClient
}

func (c *CustomIssuerController) Sign(ctx context.Context, cr *v1.CertificateRequest) error {
    // Extract CSR from certificate request
    csr := cr.Spec.Request

    // Send CSR to external PKI system
    signedCert, err := c.pkiClient.SignCertificate(csr)
    if err != nil {
        return err
    }

    // Update certificate request with signed certificate
    cr.Status.Certificate = signedCert
    cr.Status.CA = c.pkiClient.GetCABundle()

    return c.client.Status().Update(ctx, cr)
}
```

Deploy the custom issuer:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: custom-issuer
  namespace: cert-manager
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-issuer
  namespace: cert-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: custom-issuer
  template:
    metadata:
      labels:
        app: custom-issuer
    spec:
      serviceAccountName: custom-issuer
      containers:
      - name: issuer
        image: your-org/custom-issuer:latest
        env:
        - name: PKI_API_URL
          value: https://pki.internal.example.com/api
        - name: PKI_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: pki-credentials
              key: token
```

## Integrating with EJBCA

EJBCA is an open-source enterprise PKI solution. Configure cert-manager to work with EJBCA:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ejbca-credentials
  namespace: cert-manager
type: Opaque
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    # EJBCA client certificate
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    # EJBCA client key
    -----END PRIVATE KEY-----
```

Use an external issuer for EJBCA (if available) or implement REST API integration:

```python
# Example Python webhook for EJBCA integration
from flask import Flask, request, jsonify
import requests
import base64

app = Flask(__name__)

@app.route('/sign', methods=['POST'])
def sign_certificate():
    data = request.json
    csr = base64.b64decode(data['csr'])

    # Submit CSR to EJBCA
    response = requests.post(
        'https://ejbca.example.com/ejbca/ejbca-rest-api/v1/certificate/pkcs10',
        cert=('/path/to/client.crt', '/path/to/client.key'),
        json={
            'certificate_request': base64.b64encode(csr).decode(),
            'certificate_profile_name': 'KUBERNETES_PROFILE',
            'end_entity_profile_name': 'KUBERNETES_EE_PROFILE',
            'certificate_authority_name': 'InternalCA',
            'username': 'kubernetes-cert-manager',
            'password': 'changeme'
        }
    )

    if response.status_code == 200:
        cert_data = response.json()
        return jsonify({
            'certificate': cert_data['certificate'],
            'ca': cert_data['certificate_chain']
        })
    else:
        return jsonify({'error': 'Certificate signing failed'}), 500
```

## Implementing Certificate Request Approval Workflows

For organizations requiring approval workflows, use cert-manager's approval mechanism:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: requires-approval
  namespace: production
spec:
  secretName: approved-cert-tls
  dnsNames:
    - critical-service.example.com
  issuerRef:
    name: external-ca-issuer
    kind: ClusterIssuer
  # This certificate requires manual approval
```

The certificate request will remain in pending state:

```bash
kubectl get certificaterequest
# NAME                  APPROVED   READY   AGE
# requires-approval-1   False      False   1m
```

Implement an approval controller or manually approve:

```bash
# Manual approval
kubectl certificate approve requires-approval-1

# Or use cmctl
cmctl approve certificaterequest requires-approval-1
```

For automated approval with policies:

```go
func (c *ApprovalController) Reconcile(ctx context.Context, req reconcile.Request) error {
    cr := &certmanagerv1.CertificateRequest{}
    if err := c.Get(ctx, req.NamespacedName, cr); err != nil {
        return err
    }

    // Check if approval is pending
    if !certificaterequests.IsApproved(cr) {
        // Validate against organizational policies
        if c.validateAgainstPolicy(cr) {
            // Approve the request
            certificaterequests.SetApproved(cr)
            return c.Status().Update(ctx, cr)
        }
    }

    return nil
}
```

## Using Hardware Security Modules (HSM)

For high-security environments, integrate with HSMs for key generation and storage. Configure Vault with HSM backend:

```bash
# Configure Vault to use HSM
vault write pki/config/keys \
    key_type=rsa \
    key_bits=2048 \
    hsm=true \
    key_label="vault-pki-key"

# Generate root CA with HSM-backed key
vault write pki/root/generate/kms \
    common_name="HSM-backed Root CA" \
    key_ref="vault-pki-key"
```

cert-manager will transparently use HSM-backed keys when issuing certificates through Vault.

## Monitoring External PKI Integration

Monitor external PKI connectivity and certificate issuance:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: external-pki-alerts
  namespace: monitoring
spec:
  groups:
  - name: external-pki
    rules:
    - alert: ExternalPKIUnreachable
      expr: |
        up{job="vault"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "External PKI system unreachable"

    - alert: CertificateRequestFailureRate
      expr: |
        rate(certmanager_certificaterequest_failed_total[5m]) > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High certificate request failure rate"
```

## Best Practices

Follow these practices for external PKI integration:

1. **Use service accounts** - Authenticate cert-manager with dedicated service accounts
2. **Implement least privilege** - Grant only necessary permissions to cert-manager
3. **Cache certificates** - Avoid unnecessary requests to external PKI systems
4. **Monitor integration health** - Alert on connectivity issues and failures
5. **Test failover** - Ensure redundancy in PKI infrastructure
6. **Document procedures** - Maintain runbooks for PKI integration issues
7. **Rotate credentials** - Regularly rotate authentication credentials
8. **Audit certificate requests** - Log all certificate issuance for compliance

## Troubleshooting External PKI Issues

Common issues and resolutions:

```bash
# Check issuer status
kubectl describe clusterissuer vault-issuer

# View certificate request details
kubectl get certificaterequest
kubectl describe certificaterequest <name>

# Check issuer logs
kubectl logs -n cert-manager deployment/cert-manager -f | grep issuer

# Test external PKI connectivity
kubectl run debug --image=curlimages/curl --rm -it -- \
  curl -v https://vault.example.com:8200/v1/sys/health

# Verify authentication
kubectl exec -n cert-manager deploy/cert-manager -- \
  cat /var/run/secrets/kubernetes.io/serviceaccount/token
```

## Conclusion

Integrating cert-manager with external PKI infrastructure allows organizations to extend existing certificate management practices to Kubernetes. Whether using Vault, Venafi, AD CS, or custom PKI systems, cert-manager provides flexible integration options that respect enterprise security requirements.

By properly configuring issuers, implementing approval workflows, and monitoring integration health, you can automate certificate management while maintaining compliance with organizational policies. This approach bridges the gap between traditional PKI systems and cloud-native certificate automation.
