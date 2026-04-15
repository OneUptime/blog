# How to Check mTLS Certificate Expiry in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Certificate, Security, Monitoring

Description: Monitor Dapr mTLS certificate expiry dates using CLI commands, Prometheus metrics, and automated alerts to prevent service disruption from expired certificates.

---

Expired mTLS certificates in Dapr cause all service-to-service communication to fail cluster-wide. Checking certificate expiry dates proactively and setting up automated alerts prevents this type of outage.

## Certificate Types and Renewal Behavior

| Certificate | Location | Default TTL | Auto-Renewal |
|-------------|----------|-------------|--------------|
| Workload cert | Sidecar memory | 24 hours | Yes - automatic |
| Issuer cert | dapr-trust-bundle | 1 year (varies) | No - manual |
| Root CA cert | dapr-trust-bundle | 1 year (varies) | No - manual |

Workload certificates renew automatically. Root CA and issuer certificates require manual action.

## Checking Expiry with kubectl

```bash
# Check root CA expiry
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | \
  base64 -d | openssl x509 -noout -enddate

# Output: notAfter=Mar 31 10:00:00 2027 GMT

# Check issuer certificate expiry
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.issuer\.crt}' | \
  base64 -d | openssl x509 -noout -enddate

# Check days until expiry (Linux)
EXPIRY=$(kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | \
  openssl x509 -noout -enddate | cut -d= -f2)
echo "Expires: $EXPIRY"
echo "Days remaining: $(( ( $(date -d "$EXPIRY" +%s) - $(date +%s) ) / 86400 ))"
```

## Checking Expiry with Dapr CLI

```bash
# Check root certificate expiry
dapr mtls expiry

# Expected output:
# Root certificate expires in 364 days, 23 hours, 59 minutes, 0 seconds
# Expiry date: 2027-03-31 10:00:00 +0000 UTC
```

## Checking Workload Certificate Expiry

Workload certificates are held in sidecar memory and are not written to disk. They auto-renew at roughly 50% of their 24-hour TTL, so checking their expiry is rarely needed. You can verify the trust anchors mounted in the sidecar and check sidecar logs for certificate rotation:

```bash
# Check trust anchors (root CA) mounted in the sidecar
kubectl exec deploy/order-service -c daprd -- \
  cat /var/run/secrets/dapr.io/tls/ca.crt | \
  openssl x509 -noout -enddate

# Check sidecar logs for certificate rotation events
kubectl logs deploy/order-service -c daprd | grep -i "cert"
```

## Prometheus Alert for Certificate Expiry

Create an alert that fires 30 days before expiry:

```yaml
groups:
- name: dapr-cert-expiry
  rules:
  - alert: DaprIssuerCertExpiringSoon
    expr: |
      (dapr_sentry_issuercert_expiry_timestamp - time()) / 86400 < 30
    labels:
      severity: warning
    annotations:
      summary: "Dapr issuer certificate expires in less than 30 days"
      description: "Days remaining: {{ $value | printf \"%.0f\" }}"

  - alert: DaprIssuerCertExpiryCritical
    expr: |
      (dapr_sentry_issuercert_expiry_timestamp - time()) / 86400 < 7
    labels:
      severity: critical
    annotations:
      summary: "Dapr issuer certificate expires in less than 7 days - immediate action required"
```

## Automated Expiry Check Script

Run this as a Kubernetes CronJob to send weekly expiry reports:

```bash
#!/bin/bash
# cert-expiry-check.sh

ROOT_CA=$(kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d)

EXPIRY=$(echo "$ROOT_CA" | openssl x509 -noout -enddate | cut -d= -f2)
DAYS=$(( ( $(date -d "$EXPIRY" +%s) - $(date +%s) ) / 86400 ))

if [ $DAYS -lt 30 ]; then
  echo "WARNING: Dapr root CA expires in $DAYS days ($EXPIRY)"
  exit 1
else
  echo "OK: Dapr root CA valid for $DAYS more days"
  exit 0
fi
```

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dapr-cert-check
spec:
  schedule: "0 8 * * 1"  # Every Monday at 8am
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cert-checker
          containers:
          - name: check
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/cert-expiry-check.sh"]
          restartPolicy: OnFailure
```

## Summary

Dapr root CA and issuer certificates require manual renewal and do not auto-expire gracefully - they cause cluster-wide mTLS failures when they expire. Check expiry with `kubectl` and openssl or the `dapr mtls expiry` CLI command. Set up Prometheus alerts at 30-day and 7-day thresholds using the `dapr_sentry_issuercert_expiry_timestamp` metric. Consider a weekly CronJob to audit certificate health as part of your operational runbook.
