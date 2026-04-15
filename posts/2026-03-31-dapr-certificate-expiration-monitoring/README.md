# How to Monitor Dapr Certificate Expiration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Certificate, Expiration, Monitoring

Description: Monitor Dapr certificate expiration for both workload certificates and the root CA to prevent mTLS failures caused by expired certificates in production clusters.

---

## Certificate Expiration Risks

Dapr uses two categories of certificates that can expire:

1. **Workload certificates** - Issued to each sidecar, typically 24 hours TTL, auto-rotated
2. **Root CA / Issuer certificate** - Used by Sentry to sign workload certs, typically 1 year, must be manually rotated

Both can cause mTLS failures if they expire without being renewed.

## Monitoring Workload Certificate Expiry

Workload certificates are normally rotated automatically by the Dapr sidecar. However, if Sentry is unavailable during renewal, certificates can expire. Workload certificates are held in memory by the daprd process (obtained from Sentry via gRPC), so they cannot be inspected from the filesystem. Monitor workload certificate health by ensuring Sentry is available:

```bash
# Verify Sentry is running and available to issue/renew workload certs
kubectl get pods -n dapr-system -l app=dapr-sentry

# Check root certificate expiry using the Dapr CLI
dapr mtls expiry
```

## Checking Root CA Expiry

The root CA has a much longer lifespan (often years) but is critical - if it expires, Sentry cannot issue new workload certificates:

```bash
# Check root CA expiry
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | \
  openssl x509 -enddate -noout

# Get exact expiry timestamp
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | \
  openssl x509 -text -noout | grep "Not After"
```

## Prometheus Metrics for Certificate Expiry

Dapr Sentry exposes certificate expiry metrics:

```bash
# Sentry CA certificate expiry timestamp (Unix epoch)
dapr_sentry_issuercert_expiry_timestamp

# Number of seconds until CA cert expires
dapr_sentry_issuercert_expiry_timestamp - time()
```

Prometheus alerting rules:

```yaml
groups:
  - name: certificate-expiration
    rules:
      - alert: DaprCACertExpiresIn30Days
        expr: >
          dapr_sentry_issuercert_expiry_timestamp - time() < 2592000
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Dapr Sentry CA certificate expires in less than 30 days"

      - alert: DaprCACertExpiresIn7Days
        expr: >
          dapr_sentry_issuercert_expiry_timestamp - time() < 604800
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Dapr Sentry CA certificate expires in less than 7 days - rotate immediately"
```

## Automated Expiry Check Script

Run this script in a CronJob to check certificate expiry:

```bash
#!/bin/bash
# check-dapr-certs.sh
WARN_DAYS=30
CRITICAL_DAYS=7

CA_EXPIRY=$(kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | \
  openssl x509 -enddate -noout | sed 's/notAfter=//')

EXPIRY_EPOCH=$(date -d "$CA_EXPIRY" +%s 2>/dev/null || date -j -f "%b %e %T %Y %Z" "$CA_EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_REMAINING=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "CA Certificate expires in $DAYS_REMAINING days ($CA_EXPIRY)"

if [ $DAYS_REMAINING -lt $CRITICAL_DAYS ]; then
  echo "CRITICAL: Rotate CA immediately!"
  exit 2
elif [ $DAYS_REMAINING -lt $WARN_DAYS ]; then
  echo "WARNING: Plan CA rotation soon."
  exit 1
fi
```

## Rotating an Expiring CA

```bash
# Generate new root CA
openssl genrsa -out new-ca.key 4096
openssl req -new -x509 -days 3650 -key new-ca.key -out new-ca.crt -subj "/O=dapr.io/CN=cluster.local"

# Generate new issuer cert signed by the new CA
openssl genrsa -out new-issuer.key 2048
openssl req -new -key new-issuer.key -out new-issuer.csr -subj "/O=dapr.io/CN=cluster.local"
openssl x509 -req -in new-issuer.csr -CA new-ca.crt -CAkey new-ca.key \
  -CAcreateserial -out new-issuer.crt -days 3650

# Update the trust bundle secret with all three components
kubectl create secret generic dapr-trust-bundle \
  --from-file=ca.crt=new-ca.crt \
  --from-file=issuer.crt=new-issuer.crt \
  --from-file=issuer.key=new-issuer.key \
  -n dapr-system --dry-run=client -o yaml | kubectl apply -f -

# Restart Sentry to pick up new CA
kubectl rollout restart deployment/dapr-sentry -n dapr-system

# Rolling restart application deployments to refresh sidecar workload certs
kubectl rollout restart deployment -n <app-namespace>
```

## Summary

Monitor Dapr certificate expiration at two levels: workload certificates (24h TTL, auto-rotated) and the root CA (1+ year, manual rotation required). Use Prometheus metrics and alert rules to warn 30 days before CA expiry and raise critical alerts at 7 days. Implement a CronJob-based certificate check script as a secondary early warning system for environments without Prometheus.
