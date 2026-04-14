# How to Use Dapr Security Features for SOC 2 Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SOC 2, Compliance, Security, Audit

Description: Learn how Dapr's security features map to SOC 2 Trust Service Criteria and how to configure mTLS, access control, and audit logging for SOC 2 compliance.

---

SOC 2 defines five Trust Service Criteria (TSC): Security, Availability, Processing Integrity, Confidentiality, and Privacy. The Security criterion (CC6 through CC9) is mandatory and covers logical access controls, encryption, and monitoring. Dapr directly supports many of these controls.

## SOC 2 Security Controls and Dapr Mapping

| SOC 2 Control | Dapr Feature |
|---|---|
| CC6.1 - Logical access | mTLS identity + access control policies |
| CC6.3 - Authentication | Service identity certificates via Sentry |
| CC6.7 - Encryption in transit | mTLS for all sidecar traffic |
| CC7.2 - Monitoring | Distributed tracing + Prometheus metrics |
| CC9.1 - Risk mitigation | Secret stores, scoped components |

## Enforce Logical Access with Access Control Policies

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: soc2-config
  namespace: production
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: frontend
      defaultAction: deny
      operations:
      - name: /v1/public/*
        httpVerb: ["GET"]
        action: allow
    - appId: admin-service
      defaultAction: allow
      namespace: "production"
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://jaeger-collector:9411/api/v2/spans"
```

## Secret Management for Confidentiality Controls

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: soc2-secrets
  namespace: production
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "my-keyvault"
  - name: azureClientId
    value: "managed-identity-client-id"
scopes:
- payment-service
- data-processor
```

## Audit Logging for CC7.2 Monitoring

SOC 2 requires monitoring of system components for anomalies:

```python
import structlog
from datetime import datetime

log = structlog.get_logger()

def audit_service_call(caller_app_id: str, operation: str, status: int, duration_ms: float):
    log.info(
        "service_invocation",
        timestamp=datetime.utcnow().isoformat(),
        caller=caller_app_id,
        operation=operation,
        http_status=status,
        duration_ms=duration_ms,
        compliance_framework="SOC2",
        control_id="CC6.1"
    )

def audit_secret_access(app_id: str, secret_name: str, action: str):
    log.info(
        "secret_access",
        timestamp=datetime.utcnow().isoformat(),
        app_id=app_id,
        secret=secret_name,
        action=action,
        compliance_framework="SOC2",
        control_id="CC6.1"
    )
```

## Prometheus Metrics for Availability Monitoring

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: soc2-availability-rules
  namespace: production
spec:
  groups:
  - name: dapr-soc2
    rules:
    - alert: DaprServiceUnavailable
      expr: |
        absent(dapr_http_server_request_count{app_id="payment-service"})
      for: 5m
      labels:
        severity: critical
        compliance: soc2
        control: CC7.2
      annotations:
        summary: "SOC2 CC7.2: Service payment-service unavailable"
```

## Change Management - Component Version Control

```bash
# Tag component changes in Git for SOC 2 change management
git add components/
git commit -m "SOC2-CHG-001: Update Redis state store component to v1.2"
git tag -a "soc2-component-v1.2" -m "SOC2 approved change: Redis component update"
git push origin master --tags
```

## Summary

Dapr supports SOC 2 compliance through mTLS for encryption in transit (CC6.7), access control policies for logical access controls (CC6.1/CC6.3), distributed tracing for monitoring (CC7.2), and secret store integration for confidentiality (CC9.1). Supplement Dapr controls with structured audit logging, Prometheus alerting rules, and formal change management processes to satisfy auditor evidence requirements.
