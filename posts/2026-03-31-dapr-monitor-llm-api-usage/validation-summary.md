# Validation Summary: How to Monitor LLM API Usage with Dapr Conversation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha)
- Dapr State Management API
- Python (requests, dataclasses, logging)
- Prometheus (prometheus_client Python library)
- Grafana (PromQL dashboard queries)

## Sources Consulted
- Dapr Conversation API reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Prometheus Python client documentation: https://prometheus.github.io/client_python/
- PromQL documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Other blog posts in this repo using Dapr state TTL (e.g., dapr-state-ttl, dapr-state-time-to-live)

## Issues Found
1. **Dapr state store TTL field placement**: The `record_metrics` function placed `ttlInSeconds` under `"options"` as an integer (`"options": {"ttlInSeconds": 86400}`). In the Dapr state management API, TTL must be specified under `"metadata"` and the value must be a string. Fixed to `"metadata": {"ttlInSeconds": "86400"}`.

## Review Notes
- The Conversation API endpoint uses `v1.0-alpha1`, which is correct for this alpha-stage building block. Readers should be aware the API path may change when the feature reaches stable status.
- `List` is imported from `typing` but never used in the first code block; `Gauge` is imported from `prometheus_client` but never used in the second block. These are harmless unused imports but could be cleaned up.
- The `record_prometheus_metrics` function defined in the second code block is separate from the `record_metrics` function in the first block. Readers need to wire them together (e.g., call both from `tracked_conversation`). This is implied by the tutorial structure but could be made more explicit.
- The token estimation heuristic (4 chars per token) is acknowledged as an approximation, which is appropriate. Real-world usage should use the actual token counts returned by the LLM provider when available.
- LLM pricing figures are presented as examples with an explicit note to update with current pricing, which is appropriate given how frequently these change.
- All PromQL queries are syntactically correct and appropriate for the described metrics.
