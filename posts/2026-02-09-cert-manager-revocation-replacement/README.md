# How to Implement cert-manager Certificate Revocation and Replacement Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Learn how to implement certificate revocation and replacement procedures with cert-manager for handling compromised certificates and security incidents in Kubernetes.

---

Certificate revocation becomes necessary when private keys are compromised, certificates are mis-issued, or security policies change. While cert-manager automates certificate lifecycle management, manual intervention is sometimes required for security incidents. Understanding revocation procedures and certificate replacement workflows ensures rapid response to security events.

This guide covers revocation mechanisms, emergency certificate replacement, handling compromised keys, and implementing revocation verification.

## Understanding Certificate Revocation

Certificate revocation invalidates a certificate before its natural expiration. Revocation reasons include:

Private key compromise where the key is exposed or stolen
Certificate authority compromise affecting all certificates from that CA
Affiliation changes like employee departure or organizational restructuring
Superseded certificates replaced by updated versions
Certificate holds for temporary suspension

Once revoked, certificates should not be trusted even though they remain technically valid until expiration.

## Revocation Mechanisms

Two primary mechanisms exist for checking revocation status:

CRL (Certificate Revocation Lists): Published lists of revoked certificate serial numbers. Clients download and check against these lists.

OCSP (Online Certificate Status Protocol): Real-time protocol for querying certificate status from the certificate authority.

cert-manager doesn't directly manage revocation checking, but certificate authorities handle revocation when cert-manager requests it.

## Revoking Certificates with ACME

For ACME-issued certificates (Let's Encrypt, ZeroSSL), revoke through the certificate authority:

```bash
# Install acme.sh or certbot for revocation

# Using certbot to revoke Let's Encrypt certificate
certbot revoke --cert-path /path/to/cert.pem \
  --key-path /path/to/privkey.pem \
  --reason keycompromise

# Revocation reasons:
# unspecified (0)
# keycompromise (1)
# affiliationchanged (3)
# superseded (4)
# cessationofoperation (5)
```

For certificates managed by cert-manager:

```bash
# Extract certificate from secret
kubectl get secret app-tls -n production \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > cert.pem

# Extract private key
kubectl get secret app-tls -n production \
  -o jsonpath='{.data.tls\.key}' | base64 -d > key.pem

# Revoke using certbot
certbot revoke --cert-path cert.pem --key-path key.pem --reason keycompromise

# Clean up sensitive files
shred -u cert.pem key.pem
```

## Emergency Certificate Replacement

When certificates are compromised, replace them immediately:

```yaml
# emergency-cert-replacement.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: emergency-replacement
  namespace: production
  annotations:
    # Document the emergency replacement
    cert-replacement: "emergency-2026-02-09"
    cert-replacement-reason: "key-compromise"
spec:
  secretName: app-tls

  # Issue new certificate immediately
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer

  dnsNames:
  - app.example.com

  privateKey:
    # Force new private key generation
    rotationPolicy: Always
    algorithm: RSA
    size: 2048
```

Force immediate certificate replacement:

```bash
# Delete existing certificate secret to trigger reissuance
kubectl delete secret app-tls -n production

# cert-manager automatically recreates with new certificate
# Monitor replacement
kubectl get certificate -n production -w

# Verify new certificate issued
kubectl get secret app-tls -n production -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -text -noout | grep "Serial Number"
```

## Handling Private Key Compromise

When private keys are compromised, follow this procedure:

```bash
# 1. Immediately delete the compromised secret
kubectl delete secret compromised-tls -n production

# 2. Revoke the certificate (if ACME)
# Extract certificate before deletion if needed
kubectl get secret compromised-tls -n production \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > compromised.pem

certbot revoke --cert-path compromised.pem --reason keycompromise

# 3. Update Certificate resource to force new key
kubectl annotate certificate compromised-cert \
  cert-manager.io/issue-temporary-certificate="true" \
  --overwrite

# 4. Verify new certificate with different key
kubectl get secret compromised-tls -n production \
  -o jsonpath='{.data.tls\.key}' | base64 -d | \
  openssl rsa -modulus -noout | openssl md5

# Compare with old key fingerprint (should be different)
```

## Bulk Certificate Replacement

For CA compromise or mass re-keying:

```bash
# Create script for bulk replacement
cat > bulk-replace-certs.sh <<'EOF'
#!/bin/bash
NAMESPACE=${1:-production}

# Get all certificates in namespace
certificates=$(kubectl get certificates -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')

for cert in $certificates; do
  echo "Replacing certificate: $cert"

  # Get secret name
  secret=$(kubectl get certificate $cert -n $NAMESPACE \
    -o jsonpath='{.spec.secretName}')

  # Delete secret to trigger reissuance
  kubectl delete secret $secret -n $NAMESPACE

  # Wait for certificate to become ready
  kubectl wait --for=condition=Ready \
    certificate/$cert -n $NAMESPACE \
    --timeout=300s

  echo "Replaced: $cert"
done
EOF

chmod +x bulk-replace-certs.sh

# Execute bulk replacement
./bulk-replace-certs.sh production
```

## Implementing Revocation Verification

While applications should verify revocation, configure ingress controllers to check certificate status:

### nginx Ingress with OCSP Stapling

```yaml
# nginx-with-ocsp.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: ingress-nginx
data:
  ssl-stapling: "true"
  ssl-stapling-verify: "true"
```

This enables OCSP stapling where nginx checks certificate status and includes it in TLS handshakes.

### Application-Level Revocation Checking

Configure applications to verify certificate revocation:

```python
# Example Python application with revocation checking
import ssl
import certifi
from OpenSSL import crypto

def verify_certificate_revocation(cert_path):
    # Load certificate
    with open(cert_path, 'r') as f:
        cert_data = f.read()

    cert = crypto.load_certificate(crypto.FILETYPE_PEM, cert_data)

    # Extract OCSP URL from certificate
    for i in range(cert.get_extension_count()):
        ext = cert.get_extension(i)
        if 'authorityInfoAccess' in str(ext.get_short_name()):
            # Parse OCSP URL and check status
            pass

    return True  # or False if revoked

# Use in TLS context
context = ssl.create_default_context(cafile=certifi.where())
context.verify_mode = ssl.CERT_REQUIRED
context.check_hostname = True

# Application verifies revocation during TLS handshake
```

## Monitoring Certificate Revocation

Track revocation events and certificate replacements:

```yaml
# revocation-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: revocation-tracking
  namespace: monitoring
data:
  revoked-certificates.json: |
    {
      "revocations": [
        {
          "date": "2026-02-09",
          "certificate": "app-tls",
          "namespace": "production",
          "reason": "key-compromise",
          "operator": "security-team",
          "old-serial": "ABC123456789",
          "new-serial": "DEF987654321"
        }
      ]
    }
```

Create alerts for certificate replacements:

```yaml
# replacement-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-replacement-alerts
spec:
  groups:
  - name: certificate-replacements
    rules:
    - alert: CertificateReplaced
      expr: |
        changes(certmanager_certificate_ready_status[5m]) > 0
      labels:
        severity: info
      annotations:
        summary: "Certificate {{ $labels.name }} replaced"
        description: "Certificate changed, verify if expected"

    - alert: MultipleCertificatesReplaced
      expr: |
        count(changes(certmanager_certificate_ready_status[15m]) > 0) > 5
      labels:
        severity: warning
      annotations:
        summary: "Multiple certificates replaced"
        description: "{{ $value }} certificates replaced recently, possible incident"
```

## Certificate Replacement Workflow

Implement a formal workflow for certificate replacement:

```yaml
# replacement-workflow.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cert-replacement-runbook
  namespace: documentation
data:
  runbook.md: |
    # Certificate Replacement Runbook

    ## Compromise Detection
    1. Identify compromised certificate
    2. Document compromise details
    3. Notify security team

    ## Immediate Actions
    1. Revoke compromised certificate
    2. Delete certificate secret
    3. Force new certificate issuance
    4. Verify new certificate differs from old

    ## Verification Steps
    1. Check certificate serial number changed
    2. Verify private key fingerprint changed
    3. Test application with new certificate
    4. Monitor for errors

    ## Post-Incident
    1. Document incident
    2. Update revocation tracking
    3. Review how compromise occurred
    4. Implement preventive measures

    ## Commands
    ```bash
    # Revoke
    certbot revoke --cert-path cert.pem --reason keycompromise

    # Delete secret
    kubectl delete secret <secret-name> -n <namespace>

    # Verify replacement
    kubectl get certificate <cert-name> -n <namespace>
    ```
```

## Testing Revocation Procedures

Regularly test revocation procedures:

```yaml
# test-revocation-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: revocation-test
  namespace: testing
  annotations:
    purpose: "revocation-drill"
spec:
  secretName: revocation-test-tls
  duration: 24h  # Short duration for testing
  renewBefore: 12h

  issuerRef:
    name: letsencrypt-staging  # Use staging for tests
    kind: ClusterIssuer

  dnsNames:
  - revocation-test.example.com
```

Conduct revocation drills:

```bash
# 1. Issue test certificate
kubectl apply -f test-revocation-cert.yaml

# 2. Wait for certificate issuance
kubectl wait --for=condition=Ready certificate/revocation-test -n testing

# 3. Practice revocation
kubectl get secret revocation-test-tls -n testing \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > test-cert.pem

certbot revoke --cert-path test-cert.pem --reason cessationofoperation

# 4. Practice replacement
kubectl delete secret revocation-test-tls -n testing

# 5. Verify new certificate issued
kubectl get certificate revocation-test -n testing

# 6. Clean up
kubectl delete certificate revocation-test -n testing
```

## Automated Revocation Response

Implement automated response to security events:

```yaml
# revocation-webhook.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: auto-revoke-compromised
spec:
  template:
    spec:
      serviceAccountName: cert-revoker
      containers:
      - name: revoker
        image: cert-revocation-tool:latest
        env:
        - name: COMPROMISED_CERT
          value: "app-tls"
        - name: NAMESPACE
          value: "production"
        - name: REVOCATION_REASON
          value: "keycompromise"
        command:
        - /bin/sh
        - -c
        - |
          # Extract certificate
          kubectl get secret $COMPROMISED_CERT -n $NAMESPACE \
            -o jsonpath='{.data.tls\.crt}' | base64 -d > /tmp/cert.pem

          # Revoke certificate
          certbot revoke --cert-path /tmp/cert.pem --reason $REVOCATION_REASON

          # Delete secret
          kubectl delete secret $COMPROMISED_CERT -n $NAMESPACE

          # Send notification
          curl -X POST https://notifications.example.com/webhook \
            -d "{\"message\": \"Certificate $COMPROMISED_CERT revoked and replaced\"}"
      restartPolicy: Never
```

## Best Practices

Document all certificate revocations with date, reason, and operator information for audit trails.

Implement automated alerting when certificates are replaced outside scheduled renewals. This may indicate security incidents.

Test revocation procedures quarterly. Ensure teams know how to respond to compromised certificates.

Use cert-manager annotations to track replacement history. This provides valuable context for future incidents.

Implement proper RBAC for certificate and secret management. Limit who can trigger certificate replacement.

Monitor certificate serial numbers. Changes outside renewal windows may indicate unauthorized replacement.

Maintain runbooks for different revocation scenarios. Different compromise types require different responses.

## Conclusion

While cert-manager automates normal certificate lifecycle management, understanding revocation and emergency replacement procedures is essential for security incident response. By implementing proper procedures, testing regularly, and maintaining documentation, teams can respond quickly and effectively when certificate compromise occurs.

These capabilities provide the safety net needed for production certificate management, ensuring that even when automation or security fails, teams have the tools and procedures to remediate quickly and prevent service disruption.
