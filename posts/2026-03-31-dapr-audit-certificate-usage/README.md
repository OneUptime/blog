# How to Audit Certificate Usage in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Certificate, Audit, Security

Description: Audit certificate usage in Dapr by analyzing Sentry issuance logs, Prometheus metrics, and distributed traces to track which services are requesting and using certificates.

---

## Why Audit Certificate Usage?

In a security-conscious environment, you need visibility into:
- Which services are requesting certificates
- How frequently certificates are being issued
- Whether any unexpected services are obtaining certificates
- Certificate renewal patterns and failures

## Enabling Verbose Sentry Logging

Increase Sentry log verbosity to capture certificate issuance details:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_sentry.logLevel=debug \
  --reuse-values
```

Each certificate issuance will log the requesting service identity:

```bash
kubectl logs -n dapr-system -l app=dapr-sentry | grep -i "cert\|sign\|spiffe" | head -50
```

## Parsing Issuance Logs for Auditing

Extract certificate issuance events from Sentry logs:

```python
import subprocess
import json
from datetime import datetime, timezone

def parse_sentry_audit_log():
    log_output = subprocess.check_output([
        "kubectl", "logs", "-n", "dapr-system",
        "-l", "app=dapr-sentry", "--tail=1000"
    ]).decode()

    events = []
    for line in log_output.splitlines():
        if "cert sign" in line.lower() or "workload cert" in line.lower():
            events.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "raw": line
            })
    return events

audit_log = parse_sentry_audit_log()
print(json.dumps(audit_log, indent=2))
```

## Prometheus Metrics for Certificate Audit

Track issuance counts per service using Prometheus:

```bash
# Certificate issuances grouped by namespace and app
sum by (namespace, app_id) (
  rate(dapr_sentry_cert_sign_request_received_total[1h])
)
```

Set up a Grafana table to show certificate request rates per service.

## SPIFFE Identity in Certificates

Dapr uses SPIFFE IDs in workload certificates for identity. Extract and verify them:

```bash
# Connect to the daprd sidecar's internal gRPC port and extract the presented certificate
kubectl port-forward <pod-name> 50001:50001 &
echo | openssl s_client -connect localhost:50001 2>/dev/null | \
  openssl x509 -text -noout | grep -A 2 "Subject Alternative Name"
```

Expected SPIFFE URI format:

```bash
# URI:spiffe://cluster.local/ns/production/order-service
```

## Alerting on Unexpected Certificate Requests

Alert if a service that should not be using Dapr requests a certificate:

```yaml
groups:
  - name: cert-audit
    rules:
      - alert: UnexpectedDaprCertRequest
        expr: >
          dapr_sentry_cert_sign_request_received_total{namespace="restricted-ns"} > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Unexpected certificate request from restricted namespace"
```

## Exporting Audit Data to SIEM

Forward Sentry logs to a SIEM system using a log shipper:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: dapr-system
data:
  filter.conf: |
    [FILTER]
        Name grep
        Match dapr-sentry*
        Regex log cert sign
```

## Summary

Audit Dapr certificate usage by enabling verbose Sentry logging, parsing logs to extract issuance events, and tracking per-service certificate request rates with Prometheus. Use SPIFFE ID validation to verify service identity, set up alerts for unexpected certificate requests, and forward audit logs to your SIEM system for long-term retention and compliance reporting.
