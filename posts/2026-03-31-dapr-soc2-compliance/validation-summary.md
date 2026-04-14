# Validation Summary: How to Use Dapr Security Features for SOC 2 Compliance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (mTLS, access control policies, secret stores, component scoping, distributed tracing)
- SOC 2 Trust Service Criteria (Security common criteria CC6-CC9)
- Azure Key Vault (Dapr secret store component)
- Python with structlog (audit logging)
- Prometheus Operator (PrometheusRule for alerting)
- Zipkin/Jaeger (distributed tracing)
- Git (change management tagging)

## Sources Consulted
- Dapr Configuration spec for mTLS and access control policies: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr access control policy reference: https://docs.dapr.io/operations/configuration/invoke-allowlisting/
- Dapr Component spec and component scoping: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Azure Key Vault secret store component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr observability and metrics: https://docs.dapr.io/operations/observability/metrics/
- SOC 2 Trust Service Criteria (AICPA): https://www.aicpa.org/resources/landing/system-and-organization-controls-soc-suite-of-services
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/
- Python structlog documentation: https://www.structlog.org/

## Issues Found

1. **Component `scopes` field placement (YAML)**: The `scopes` field in the Azure Key Vault component YAML was nested inside `spec`, but in Dapr Component manifests, `scopes` is a root-level field (sibling of `spec`, not a child). Moved `scopes` to the correct level.

2. **Incorrect SOC 2 control ID for secret access audit (Python)**: The `audit_secret_access` function logged `control_id="CC6.7"`, which the post maps to encryption in transit (mTLS). Secret access auditing is a logical access control, which maps to CC6.1. Changed to `control_id="CC6.1"`.

3. **Inconsistent SOC 2 control reference in Prometheus rule (YAML)**: The availability monitoring alert labeled the control as CC9.1 (risk mitigation) and the annotation referenced "SOC2 CC9.1", but the post's own mapping table assigns monitoring to CC7.2. Changed both the label and annotation to CC7.2.

4. **Prometheus `absent()` label interpolation (YAML)**: The alert annotation used `{{ $labels.app_id }}` but the `absent()` function does not propagate labels from the input selector. When the metric is absent, `$labels.app_id` would be empty. Replaced the template variable with the hardcoded service name "payment-service" to match the query filter.

5. **Unused Python import**: `import json` was imported but never used in the audit logging code. Removed the unused import.

## Review Notes
- The SOC 2 intro states the Security criterion covers "CC6 through CC9". The Security TSC actually uses all common criteria CC1-CC9, but CC6-CC9 are the most technically relevant ones for Dapr mapping. This is an acceptable simplification for the blog context.
- The `datetime.utcnow()` call is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. Since the post does not specify a Python version and `utcnow()` still functions, this was not changed but may warrant updating in the future.
- The Dapr metric name `dapr_http_server_request_count` has gone through naming changes across Dapr versions. The name used is valid but readers should verify against their specific Dapr version.
- The CC6.3 mapping to "Authentication" is a simplification; CC6.3 more precisely covers access provisioning based on roles and least privilege. This is acceptable for a high-level mapping guide.
