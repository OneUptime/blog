# How to Configure Certificate Rotation Period in Dapr Sentry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Certificate, Rotation, Security

Description: Configure the certificate rotation period in Dapr Sentry to balance security posture with operational overhead, and verify rotation is working correctly.

---

## Understanding Certificate Rotation in Dapr

Dapr Sentry issues short-lived workload certificates to each sidecar. These certificates are automatically rotated before expiry - the sidecar requests a new certificate when the current one is within a configurable renewal window. This limits the blast radius if a certificate is compromised.

## Default Rotation Settings

The default workload certificate TTL is 24 hours with a 15-minute clock skew allowance. Certificates are renewed at approximately 50% of their TTL by default.

Check current settings:

```bash
kubectl get secret dapr-trust-bundle -n dapr-system -o yaml
kubectl get configuration daprsystem -n dapr-system -o yaml 2>/dev/null || true
```

## Configuring Rotation via Dapr Configuration

Create or update the Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: dapr-system
spec:
  mtls:
    enabled: true
    workloadCertTTL: "12h"      # Certificate lifetime
    allowedClockSkew: "15m"      # Allowed time drift between nodes
```

Apply it:

```bash
kubectl apply -f dapr-config.yaml
```

## Configuring via Helm

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.mtls.workloadCertTTL=12h \
  --set global.mtls.allowedClockSkew=15m \
  --reuse-values
```

## Choosing the Right Rotation Period

| TTL | Use Case | Trade-off |
|-----|----------|-----------|
| 1h  | High-security environments | More Sentry load, more log noise |
| 12h | Balanced security | Moderate renewal traffic |
| 24h | Default, lower overhead | Wider compromise window |
| 72h | Low-churn environments | Least secure option |

For most production workloads, 12-24 hours is appropriate. Use shorter TTLs for services handling sensitive financial or personal data.

## Verifying Rotation Is Working

Check sidecar logs for certificate renewal events:

```bash
kubectl logs <pod-name> -c daprd | grep -i "cert\|renew\|rotation" | tail -20
```

Expected log entries during rotation:

```bash
time="2026-03-31T10:00:00Z" level=info msg="Renewing workload identity" app_id=my-service
time="2026-03-31T10:00:01Z" level=info msg="Successfully renewed workload identity" app_id=my-service
```

## Monitoring Certificate Expiry

Use Prometheus to alert on approaching certificate expiry:

```yaml
- alert: DaprCertExpiresIn2Hours
  expr: dapr_sentry_issuercert_expiry_timestamp - time() < 7200
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Dapr sidecar certificate expires in less than 2 hours"
```

## Summary

Configure Dapr certificate rotation by setting `workloadCertTTL` and `allowedClockSkew` in the Dapr Configuration resource or via Helm. Choose rotation periods based on your security requirements - shorter TTLs reduce compromise windows but increase Sentry load. Monitor rotation by checking sidecar logs and setting up Prometheus alerts for certificates nearing expiry.
