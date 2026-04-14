# How to Monitor Dapr Sentry Service Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Monitoring, Health, Security

Description: Monitor Dapr Sentry service health to ensure certificate issuance is working, detect failures early, and prevent mTLS disruptions across your cluster.

---

## Why Sentry Health Matters

If the Dapr Sentry service is unavailable, sidecars cannot renew their certificates. When existing certificates expire, mTLS connections between services will fail - causing service-to-service communication to stop. Monitoring Sentry health is critical for service reliability.

## Health Check Endpoints

The Sentry service exposes a health endpoint:

```bash
# Port-forward to Sentry
kubectl port-forward -n dapr-system svc/dapr-sentry 8080:8080

# Check health
curl http://localhost:8080/healthz
```

## Kubernetes Probes Configuration

Verify Sentry's probes are properly configured:

```bash
kubectl get deployment dapr-sentry -n dapr-system -o yaml | grep -A 15 livenessProbe
```

Customize probe sensitivity via Helm:

```yaml
dapr_sentry:
  livenessProbe:
    failureThreshold: 5
    initialDelaySeconds: 3
    periodSeconds: 10
    timeoutSeconds: 5
  readinessProbe:
    failureThreshold: 3
    initialDelaySeconds: 5
    periodSeconds: 10
```

## Prometheus Metrics for Sentry

Key Sentry metrics to monitor:

```bash
# Total certificate issuance requests
dapr_sentry_cert_sign_request_received_total

# Successful certificate issuances
dapr_sentry_cert_sign_success_total

# Failed certificate issuances
dapr_sentry_cert_sign_failure_total
```

## ServiceMonitor for Prometheus Operator

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-sentry-monitor
  namespace: dapr-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: dapr
      app.kubernetes.io/component: sentry
  endpoints:
    - port: metrics
      interval: 30s
```

## Alerting Rules

```yaml
groups:
  - name: sentry-health
    rules:
      - alert: DaprSentryDown
        expr: up{job="dapr-sentry"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Dapr Sentry is down - certificate issuance unavailable"

      - alert: DaprSentryHighFailureRate
        expr: >
          rate(dapr_sentry_cert_sign_failure_total[5m]) /
          rate(dapr_sentry_cert_sign_request_received_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "More than 5% of cert issuance requests are failing"
```

## Log-Based Monitoring

Watch Sentry logs for error patterns:

```bash
kubectl logs -n dapr-system -l app=dapr-sentry --follow | \
  grep -iE "error|fail|refused|timeout"
```

## Summary

Monitor Dapr Sentry using health endpoints, Prometheus metrics for certificate issuance rates, and alert rules for downtime and high failure rates. Because Sentry unavailability leads to certificate expiry and mTLS failures, set up critical-severity alerts with short evaluation windows to ensure fast response when Sentry is degraded.
