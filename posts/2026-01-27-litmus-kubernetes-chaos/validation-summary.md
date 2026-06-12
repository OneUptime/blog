# Validation Summary: How to Implement Litmus for Kubernetes Chaos

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- LitmusChaos / Litmus ChaosCenter
- Litmus ChaosEngine, ChaosExperiment, ChaosSchedule, probes, and chaos faults
- Helm
- kubectl
- Argo Workflows
- Prometheus and Prometheus Operator ServiceMonitor/PrometheusRule
- Grafana
- OpenTelemetry Collector
- Fluent Bit

## Sources Consulted
- LitmusChaos installation docs: https://docs.litmuschaos.io/docs/getting-started/installation
- LitmusChaos probes docs: https://docs.litmuschaos.io/docs/concepts/probes
- Litmus experiment probe docs: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/litmus-probes/
- Litmus HTTP probe schema: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/httpProbe/
- Litmus command probe schema: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/cmdProbe/
- Litmus ChaosSchedule repeat schema: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/chaos-scheduler/schedule-repeat/
- Litmus pod network loss docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-loss/
- Litmus pod network latency docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-latency/
- Litmus pod CPU hog docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-cpu-hog/
- Litmus pod memory hog docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-memory-hog/
- Litmus node drain docs: https://litmuschaos.github.io/litmus/experiments/categories/nodes/node-drain/
- Litmus FAQ on ChaosExperiment namespace scope: https://litmuschaos.github.io/litmus/experiments/faq/experiments/
- Litmus Prometheus integration docs: https://docs.litmuschaos.io/docs/integrations/prometheus
- Litmus Grafana integration docs: https://docs.litmuschaos.io/docs/3.23.0/integrations/grafana
- Litmus chaos-exporter metrics reference: https://github.com/litmuschaos/chaos-exporter
- Kubernetes CronJob docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator API docs: https://prometheus-operator.dev/docs/api-reference/api/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The ChaosHub command for `charts/generic/experiments.yaml` under Litmus 3.0 returned a file parsing error. Replaced it with a loop that installs the specific Kubernetes fault manifests used by the guide from the current ChaosHub fault paths.
- The post installed `ChaosExperiment` resources in `litmus` while the examples create `ChaosEngine` resources in application namespaces. Updated the install and listing examples to use the target namespace because Litmus chaos CRs are namespace-scoped and expected to coexist with the target application.
- The custom `ChaosExperiment` example used the `litmus` namespace despite the surrounding examples running in `default`. Updated it to `default`.
- The node-drain example included unsupported `APP_NAMESPACE` and `APP_LABEL` environment variables for the Litmus 3.0 node-drain fault. Removed those tunables.
- The HTTP probe body validation example used fields that are not present in the Litmus HTTP probe CRD schema. Replaced it with a second response-code HTTP probe.
- The command probe example compared an exit code even though Litmus compares command output. Updated the command to emit `0` or `1` explicitly.
- The ChaosSchedule example used an undocumented `minChaosInterval: 1h` scalar, `now`, `executionType`, and `concurrencyPolicy` fields. Updated it to the documented nested `hour.everyNthHour` / `minuteOfTheHour` schema and removed unsupported fields.
- The ChaosSchedule date range had already expired for the validation date. Updated the range to 2026-2027.
- The ServiceMonitor snippet used `port: metrics`, while the Litmus chaos-exporter ServiceMonitor example uses the `tcp` port. Updated the port name.
- Several Grafana and alert queries referenced non-existent or incorrectly labeled metrics such as `litmuschaos_experiment_running_status`, `litmuschaos_experiment_duration_seconds`, `litmuschaos_probe_status`, and `verdict="Fail"`. Updated them to the documented chaos-exporter metrics and labels.
- The OpenTelemetry section implied Litmus could be configured to export traces through a Litmus ConfigMap. Reworded it as application-trace correlation and made the snippet a valid OpenTelemetry Collector pipeline.

## Review Notes
The post still uses Litmus 3.0.0 URLs in several examples. Those versioned URLs are valid where checked, but Litmus documentation marks 3.0.0 as no longer actively maintained and points readers to the latest 3.x docs. Future updates should consider refreshing the guide to the latest Litmus release and ChaosCenter workflow terminology.
