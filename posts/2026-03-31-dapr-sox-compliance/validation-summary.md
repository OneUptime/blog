# Validation Summary: How to Implement SOX Compliance with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Kafka output binding (`bindings.kafka`)
- Dapr Redis state store (`state.redis`)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr component scopes
- Kubernetes RBAC
- Prometheus / PrometheusRule (monitoring.coreos.com/v1)
- Sarbanes-Oxley Act (SOX) compliance

## Sources Consulted
- Dapr Kafka binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/kafka/
- Dapr component scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Go SDK client documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Go SDK source (pkg.go.dev): https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr metrics/observability: https://docs.dapr.io/operations/observability/metrics/
- Dapr runtime source code (`pkg/diagnostics/component_monitoring.go`, `pkg/diagnostics/service_monitoring.go`)
- Dapr CRD definitions: https://github.com/dapr/dapr/blob/master/charts/dapr/crds/components.yaml
- SOX Section 802 / SEC Rule 2-06 (17 CFR 210.2-06): https://www.ecfr.gov/current/title-17/chapter-II/part-210/subject-group-ECFR2f5dcb24c1c571e/section-210.2-06

## Issues Found

1. **`InvokeOutputBinding` API call had wrong signature (Go code would not compile)**
   - **What was wrong:** The blog called `client.InvokeOutputBinding(ctx, "sox-audit-binding", "create", auditBytes)` with 4 separate positional arguments. The actual Dapr Go SDK method signature is `InvokeOutputBinding(ctx context.Context, in *InvokeBindingRequest) error` — it takes a context and a single `*InvokeBindingRequest` struct, not separate string/byte arguments.
   - **What was changed:** Replaced the call with the correct struct-based invocation: `client.InvokeOutputBinding(ctx, &dapr.InvokeBindingRequest{Name: "sox-audit-binding", Operation: "create", Data: auditBytes})`.
   - **Why:** The original code would fail to compile.

2. **`readOnly` is not a valid Dapr Redis state store metadata field**
   - **What was wrong:** The "Segregation of Duties" section used `readOnly: "true"` as a metadata field on the Redis state store component. This field does not exist in the Dapr Redis state store specification and would be silently ignored.
   - **What was changed:** Replaced `readOnly: "true"` with `enableTLS: "true"` to keep the component configuration valid. The segregation of duties is still achieved through component scoping (restricting which app IDs can access which components) and pointing at a Redis replica.
   - **Why:** The `readOnly` field is fabricated. True read-only enforcement should come from Redis ACLs on the replica or application-level logic, not from a non-existent Dapr metadata field.

3. **`dapr_component_authorization_failure_total` Prometheus metric does not exist**
   - **What was wrong:** The Prometheus alert rule used `dapr_component_authorization_failure_total`, which is not a real Dapr metric. Dapr does not expose a Prometheus metric for component-level authorization failures.
   - **What was changed:** Replaced with `dapr_runtime_acl_app_policy_action_blocked_total`, which is a real Dapr metric that tracks requests blocked by access control policies.
   - **Why:** The original metric name was fabricated and the alert would never fire.

4. **SOX retention period claim was imprecise**
   - **What was wrong:** The summary stated "retain audit logs for at least 7 years as required by SOX." The SOX statute itself (Section 802) specifies 5 years; the 7-year figure comes from SEC Rule 2-06, the implementing regulation.
   - **What was changed:** Updated to "retain audit logs for at least 7 years per SEC Rule 2-06 implementing SOX Section 802" to accurately attribute the requirement.
   - **Why:** The 7-year figure is defensible but needs proper attribution to avoid misleading readers about what SOX itself mandates.

## Review Notes
- The Kafka mTLS configuration omits the `caCert` field, which is typically required alongside `clientCert` and `clientKey` for mTLS authentication. This may work if the Kafka broker's CA certificate is in the system trust store, but most production setups would need it explicitly specified.
- The Go code examples consistently discard errors (using `_`). While acceptable for a blog tutorial to reduce noise, production SOX-compliant code should handle all errors — especially for financial operations.
- The Kubernetes RBAC snippet with `apiGroups: ["dapr.io"]` and `resources: ["components"]` is correct — Dapr CRDs are registered under the `dapr.io` API group.
- The blog correctly uses Dapr component scopes at the top level of the Component YAML (same level as `spec`), which is the correct placement.
- Both the SOX statute (Section 802) and the SEC implementing regulation (Rule 2-06) technically apply to auditor workpapers, not directly to a company's internal application audit logs. The blog's framing, while common in industry guidance, conflates these requirements. Companies should consult their compliance teams for organization-specific retention policies.
