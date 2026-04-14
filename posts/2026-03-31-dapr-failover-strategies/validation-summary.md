# Validation Summary: How to Implement Failover Strategies for Dapr Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency policies (circuit breakers, retries, timeouts)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr-client`)
- Dapr Component specs (pub/sub.kafka, pub/sub.redis)
- Kubernetes (ConfigMaps, rollout restart)
- Prometheus / PrometheusRule (monitoring)

## Sources Consulted
- Dapr Resiliency policies documentation: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency schema reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Go SDK source code (`github.com/dapr/go-sdk/client`): `GetState` method signature and `StateItem` struct
- Dapr Python SDK source code (`dapr/clients/grpc/client.py`): `publish_event` method signature
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Redis pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr metrics source code (`pkg/diagnostics/resiliency_monitoring.go`): actual metric names and labels
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/

## Issues Found

### 1. Resiliency YAML: inline timeout value instead of named policy reference
- **What was wrong:** Under `targets.components.statestore.outbound`, the `timeout` field used an inline duration value `5s` instead of referencing a named timeout policy. The Dapr resiliency schema expects `timeout` to reference a policy name defined under `spec.policies.timeouts`.
- **What was changed:** Added a named timeout policy `component-timeout: 5s` under `spec.policies.timeouts` and changed the target reference to `timeout: component-timeout`.
- **Why:** The canonical pattern in Dapr docs is to define named policies and reference them by name in targets.

### 2. Kafka pub/sub component missing required `authType` field
- **What was wrong:** The Kafka component YAML was missing the `authType` metadata field, which is required by the Dapr Kafka pub/sub component spec.
- **What was changed:** Added `- name: authType` with `value: "none"` to the Kafka component metadata.
- **Why:** Without `authType`, the Kafka component will fail to initialize. The field is marked as required in the official component documentation.

### 3. Python SDK: `str(data)` produces invalid JSON
- **What was wrong:** The `publish_event` call used `data=str(data)` to serialize a dict. Python's `str()` produces repr format (e.g., `{'key': 'value'}`) with single quotes, `True`/`False`, and `None` — not valid JSON.
- **What was changed:** Replaced `data=str(data)` with `data=json.dumps(data)`, added `import json`, and added `data_content_type="application/json"` to the `publish_event` call.
- **Why:** Downstream subscribers expect valid JSON payloads. Using `str()` would produce unparseable data.

### 4. Prometheus metric name was incorrect
- **What was wrong:** The alert expression used `dapr_resiliency_circuit_breakers_state`, which is not a real Dapr metric.
- **What was changed:** Changed to `dapr_resiliency_cb_state`, which is the actual metric name exported by Dapr's resiliency monitoring.
- **Why:** The incorrect metric name would cause the alert to never fire.

### 5. Prometheus metric expression logic was incorrect
- **What was wrong:** The expression `== 2` assumed numeric state codes (0=closed, 1=half-open, 2=open). Dapr actually uses a label-based approach where each state is a separate time series with a `status` label, and the current state has value `1`.
- **What was changed:** Changed expression from `dapr_resiliency_circuit_breakers_state == 2` to `dapr_resiliency_cb_state{status="open"} == 1`.
- **Why:** The original expression would never match any real metric.

### 6. Prometheus alert annotation referenced non-existent label
- **What was wrong:** The annotation used `{{ $labels.component }}`, but the `dapr_resiliency_cb_state` metric does not have a `component` label. Available labels include `target`, `name`, `app_id`, `policy`, `namespace`, `flow_direction`, and `status`.
- **What was changed:** Changed to `{{ $labels.target }} ({{ $labels.name }})` to show the target and resiliency policy name.
- **Why:** Using a non-existent label would produce an empty string in the alert annotation.

## Review Notes
- The Go SDK code's `result != nil` check (after a successful `GetState` call) is technically unnecessary — the SDK always returns a non-nil `*StateItem` when `err == nil`. However, it's harmless defensive coding and not worth changing in a blog post context.
- The post frames Dapr circuit breakers as part of a "failover strategy," which is slightly imprecise — circuit breakers stop requests to a failing component but don't automatically route to an alternative. However, the post correctly demonstrates application-level failover patterns alongside the circuit breaker config, so the overall narrative is accurate.
- The `kubectl rollout restart deployment -n production` command in the failover script will restart ALL deployments in the namespace, which may be overly broad. In production, you'd typically target specific deployments. This is a practice concern rather than a technical error.
