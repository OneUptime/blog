# How to Configure cert-manager Certificate Rotation Policies and Grace Periods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Learn how to configure cert-manager certificate rotation policies, renewal grace periods, and private key rotation strategies for optimal security and reliability.

---

Certificate rotation is critical for maintaining security. Certificates have finite lifetimes, and expired certificates cause service outages. Private keys should rotate periodically to limit exposure if compromised. cert-manager automates rotation, but proper configuration ensures smooth renewals without service disruption.

This guide covers configuring rotation policies, setting appropriate grace periods, implementing private key rotation, and handling edge cases in certificate renewal automation.

## Understanding Certificate Rotation Lifecycle

Certificate rotation involves several phases:

The monitoring phase where cert-manager continuously checks certificate expiration dates. This happens automatically for all Certificate resources.

The renewal trigger when the certificate reaches the renewBefore threshold. cert-manager initiates renewal by creating a new CertificateRequest.

The issuance phase where cert-manager obtains a new certificate from the configured issuer. This may involve ACME challenges, API calls to Vault, or signing with a CA.

The secret update when cert-manager replaces the certificate in the target secret. This makes the new certificate available to applications.

The propagation phase where applications detect and load the new certificate. How quickly this happens depends on application configuration.

## Configuring Basic Rotation Parameters

The primary rotation configuration parameters are duration and renewBefore:

```yaml
# basic-rotation-config.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: web-cert
  namespace: production
spec:
  secretName: web-tls

  # Certificate validity period
  duration: 2160h # 90 days

  # Start renewal when 30 days remain
  renewBefore: 720h # 30 days

  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer

  dnsNames:
  - web.example.com
```

With this configuration:
- Certificate is valid for 90 days after issuance
- Renewal starts at day 60 (30 days before expiration)
- If renewal fails, cert-manager retries for 30 days before certificate expires

The renewBefore value should provide sufficient buffer for multiple retry attempts. A good rule is 1/3 of certificate duration.

## Private Key Rotation Policies

Private keys should rotate periodically to limit exposure. cert-manager supports three rotation policies:

```yaml
# private-key-rotation-policies.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: always-rotate
  namespace: production
spec:
  secretName: always-rotate-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer

  dnsNames:
  - app.example.com

  privateKey:
    # Rotation policy options:
    # Never: reuse existing private key on renewal
    # Always: generate new private key on every renewal (recommended)
    rotationPolicy: Always

    algorithm: RSA
    size: 2048
```

The Never policy reuses the existing private key. Use this when:
- Applications cache certificates and struggle with key changes
- You need to maintain the same key for compliance reasons
- Testing rotation procedures initially

The Always policy generates a new private key on every renewal. Use this when:
- Security requirements mandate periodic key rotation
- Applications handle certificate reloading properly
- Following security best practices

## Renewal Grace Period Strategy

The grace period (time between renewBefore and expiration) determines how much time cert-manager has for retry attempts:

```yaml
# grace-period-examples.yaml
---
# Short-lived certificate with appropriate grace period
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: short-lived-cert
spec:
  secretName: short-lived-tls
  duration: 168h # 7 days
  renewBefore: 56h # ~2.3 days (1/3 of duration)
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - short-lived.example.com
---
# Long-lived certificate with extended grace period
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: long-lived-cert
spec:
  secretName: long-lived-tls
  duration: 8760h # 1 year
  renewBefore: 2920h # ~120 days (1/3 of duration)
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - long-lived.example.com
```

Shorter grace periods work for internal CAs with instant issuance. Longer grace periods are essential for ACME certificates that might hit rate limits or have validation delays.

## Default Values and Calculation

If you omit renewBefore, cert-manager calculates it:

```yaml
# defaults-demonstration.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: defaults-demo
spec:
  secretName: defaults-demo-tls

  # Only duration specified
  duration: 2160h # 90 days
  # renewBefore automatically calculated as 2/3 * duration = 1440h (60 days)

  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer

  dnsNames:
  - defaults.example.com
```

The default renewBefore is 2/3 of duration, providing a 30-day grace period for a 90-day certificate. This is generally appropriate for most scenarios.

## Multiple Renewal Attempts

When renewal fails, cert-manager retries with exponential backoff:

```yaml
# renewal-retry-config.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: retry-demo
spec:
  secretName: retry-demo-tls
  duration: 2160h
  renewBefore: 720h # 30-day grace period for retries

  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer

  dnsNames:
  - retry-demo.example.com
```

Monitor retry attempts:

```bash
# Check certificate status
kubectl describe certificate retry-demo

# View renewal events
kubectl get events --field-selector involvedObject.name=retry-demo

# Check failed CertificateRequests
kubectl get certificaterequest -l cert-manager.io/certificate-name=retry-demo
```

Common retry scenarios include:
- ACME rate limits (need multiple days between attempts)
- DNS propagation delays (need hours between attempts)
- Temporary CA outages (need minutes to hours between attempts)

The 30-day grace period accommodates these scenarios.

## Certificate Lifecycle Hooks

While cert-manager doesn't natively support hooks, you can implement lifecycle management using external tools:

```yaml
# certificate-with-annotations.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cert-with-hooks
  namespace: production
  annotations:
    # Custom annotations for external tooling
    cert-rotation.io/pre-renew-webhook: "https://hooks.example.com/pre-renew"
    cert-rotation.io/post-renew-webhook: "https://hooks.example.com/post-renew"
spec:
  secretName: cert-with-hooks-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer

  dnsNames:
  - app.example.com
```

External controllers can watch Certificate resources and execute hooks based on annotations or labels.

## Coordinating Rotation with Application Updates

Applications need to reload certificates after rotation. Strategies include:

### Automatic Secret Watching

```yaml
# app-with-secret-watching.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    metadata:
      annotations:
        # Force pod restart when certificate updates
        cert-hash: "" # Updated by external controller
    spec:
      containers:
      - name: app
        image: app:latest
        volumeMounts:
        - name: tls
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls
        secret:
          secretName: app-tls
```

Use tools like Reloader or stakater/Reloader to automatically restart pods when secrets change.

### Manual Secret Reload

Applications can watch for secret changes and reload without restarting:

```python
# Example Python code for certificate reloading
import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class CertificateReloadHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith('tls.crt'):
            print("Certificate changed, reloading...")
            reload_tls_context()

def reload_tls_context():
    # Reload TLS certificates without restarting
    global ssl_context
    ssl_context.load_cert_chain('/etc/tls/tls.crt', '/etc/tls/tls.key')

# Watch certificate directory
observer = Observer()
observer.schedule(CertificateReloadHandler(), '/etc/tls', recursive=False)
observer.start()
```

## Environment-Specific Rotation Policies

Different environments may require different rotation policies:

```yaml
# development-rotation.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dev-cert
  namespace: development
spec:
  secretName: dev-tls
  # Short duration for testing rotation
  duration: 168h # 7 days
  renewBefore: 24h # 1 day grace period
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - dev.example.com
  privateKey:
    rotationPolicy: Always # Test key rotation
---
# production-rotation.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: prod-cert
  namespace: production
spec:
  secretName: prod-tls
  # Standard duration
  duration: 2160h # 90 days
  renewBefore: 720h # 30 day grace period
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - prod.example.com
  privateKey:
    rotationPolicy: Always
```

Development uses short durations to test rotation frequently. Production uses standard durations with generous grace periods.

## Monitoring Rotation Health

Track rotation activity with Prometheus metrics:

```yaml
# rotation-monitoring-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-rotation-alerts
spec:
  groups:
  - name: certificate-rotation
    rules:
    # Alert when certificate in grace period
    - alert: CertificateInGracePeriod
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) <
        (certmanager_certificate_renewal_timestamp_seconds - certmanager_certificate_expiration_timestamp_seconds)
      labels:
        severity: info
      annotations:
        summary: "Certificate {{ $labels.name }} in renewal grace period"

    # Alert when renewal attempts fail
    - alert: CertificateRenewalFailed
      expr: |
        increase(certmanager_certificate_renewal_timestamp_seconds[1h]) == 0
        and (certmanager_certificate_expiration_timestamp_seconds - time()) / 3600 < 168
      for: 6h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} renewal failing"
        description: "Certificate expires in {{ $value }} hours but hasn't renewed"

    # Critical alert when expiration imminent
    - alert: CertificateExpiringCritical
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) / 3600 < 24
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.name }} expires in 24 hours"
```

## Handling Rotation Failures

When rotation fails, investigate and remediate:

```bash
# Check certificate status
kubectl describe certificate <cert-name> -n <namespace>

# View failed CertificateRequests
kubectl get certificaterequest -n <namespace>
kubectl describe certificaterequest <request-name> -n <namespace>

# Check issuer status
kubectl describe issuer <issuer-name> -n <namespace>

# View cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

Common rotation failures:
- ACME challenge failures (DNS, HTTP-01 issues)
- Rate limits (need to wait)
- Issuer misconfiguration
- Network connectivity issues

Manual renewal trigger:

```bash
# Force renewal by deleting the secret
# cert-manager will recreate it immediately
kubectl delete secret <secret-name> -n <namespace>

# Or annotate certificate to trigger renewal
kubectl annotate certificate <cert-name> \
  cert-manager.io/issue-temporary-certificate="true" \
  --overwrite
```

## Best Practices

Set renewBefore to at least 1/3 of certificate duration. This provides adequate buffer for retry attempts.

Use Always rotation policy for private keys unless you have specific reasons not to. Key rotation improves security.

Test rotation procedures in development environments with short certificate durations. Verify applications handle rotation correctly.

Implement monitoring for certificates in grace period. Alert teams before certificates expire.

Document rotation failure procedures. Teams need clear steps for manual intervention.

Use appropriate certificate durations for your threat model. More frequent rotation improves security but increases operational complexity.

Configure applications to reload certificates dynamically. Avoid requiring pod restarts for certificate updates.

## Advanced Rotation Scenarios

### Blue-Green Certificate Rotation

For zero-downtime rotation:

```yaml
# blue-green-rotation.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: blue-cert
spec:
  secretName: blue-tls
  duration: 2160h
  renewBefore: 720h
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: green-cert
spec:
  secretName: green-tls
  duration: 2160h
  renewBefore: 1440h # Offset rotation timing
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
```

Applications load-balance between blue and green certificates, allowing seamless rotation.

### Staged Rotation

Roll out new certificates gradually:

```yaml
# canary-rotation.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: canary-cert
  annotations:
    cert-rotation.io/rollout-strategy: "canary"
    cert-rotation.io/canary-percentage: "10"
spec:
  secretName: canary-tls
  duration: 2160h
  renewBefore: 720h
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
```

External controllers can implement canary rollout strategies based on annotations.

## Conclusion

Proper certificate rotation configuration is essential for maintaining security without service disruption. By setting appropriate grace periods, implementing private key rotation, and monitoring rotation health, you create a robust certificate management system that handles renewal automatically while providing adequate time for troubleshooting failures.

Combined with application-level support for dynamic certificate reloading, cert-manager's rotation automation eliminates manual certificate management while maintaining the high availability and security requirements of production systems.
