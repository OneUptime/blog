# Validation Summary: How to Create Alerting Rules for Dapr Component Failures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Prometheus (alerting rules, PromQL)
- Kubernetes (PrometheusRule CRD, kubectl)
- Alertmanager
- promtool

## Sources Consulted
- Dapr metrics overview documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr configuration spec reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr source code - component_monitoring.go: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/component_monitoring.go
- Dapr source code - service_monitoring.go: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/service_monitoring.go
- Dapr development metrics reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md

## Issues Found

1. **All five metric names were incorrect.** The post used fabricated metric names that do not exist in Dapr:
   - `dapr_component_loaded` changed to `dapr_runtime_component_init_fail_total` (the original was also described as a gauge set to 0, but is actually a counter for initialization failures)
   - `dapr_state_get_total` / `dapr_state_set_total` changed to `dapr_component_state_count` (Dapr uses a single counter with an `operation` label, not separate get/set metrics)
   - `dapr_pubsub_publish_count` changed to `dapr_component_pubsub_egress_count`
   - `dapr_binding_trigger_count` changed to `dapr_component_input_binding_count`
   - `dapr_binding_send_count` changed to `dapr_component_output_binding_count`

2. **Component loaded metric was described incorrectly as a gauge.** The post claimed `dapr_component_loaded` is a gauge "set to 0 when a component fails to load." In reality, `dapr_runtime_component_loaded` is a counter that increments for each successfully loaded component. To detect failures, `dapr_runtime_component_init_fail_total` should be used instead. The alert expression was changed from `dapr_component_loaded == 0` to `increase(dapr_runtime_component_init_fail_total[5m]) > 0`.

3. **Incorrect label references in alert annotations:**
   - `$labels.storeName` changed to `$labels.component` (the state store metric uses `component`, not `storeName`)
   - `$labels.name`, `$labels.type`, `$labels.namespace` on the component init alert changed to `$labels.component` and `$labels.app_id` (the only available labels)
   - `$labels.name` on binding alerts changed to `$labels.component`

4. **Configuration field name was wrong.** `spec.metric` (singular) changed to `spec.metrics` (plural) to match the Dapr configuration schema.

5. **Alert name updated.** `DaprComponentNotLoaded` renamed to `DaprComponentInitFailure` to accurately reflect the metric being used.

## Review Notes
- The PrometheusRule CRD structure, promtool validation command, kubectl commands, and Alertmanager API endpoint are all correct.
- The `success` label filtering pattern used in state store, pub/sub, and binding alerts is correct.
- The `topic` and `component` labels on the pub/sub alert are correct.
- The default Dapr metrics port 9090 is correct.
- The overall alerting strategy (tiered severity, appropriate `for` durations) is sound.
