# Validation Summary: How to Set Up High-Availability Collector Deployments with Agent-Gateway Pattern

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpenTelemetry load-balancing exporter
- OpenTelemetry tail sampling processor
- OpenTelemetry span metrics connector
- OpenTelemetry health check and file storage extensions
- Kubernetes DaemonSet, Deployment, Service, HPA, and PodDisruptionBudget
- kubectl

## Sources Consulted
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Contrib load-balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector Contrib span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.153.0/exporter/exporterhelper/README.md
- OpenTelemetry Collector Contrib health check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/extension/healthcheckextension/README.md
- OpenTelemetry Collector Contrib file storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/extension/storage/filestorage/README.md
- OpenTelemetry Collector Contrib v0.153.0 release: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.153.0
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post used the deprecated `loadbalancing` exporter name. Changed it to `load_balancing` and updated pipeline references to match current Collector Contrib naming.
- The agent configuration used Kubernetes liveness and readiness probes on port `13133`, but the agent Collector config did not enable the `health_check` extension or expose the health port. Added the extension, service registration, and health container port.
- The load-balancing DNS resolver used an integer `port` value. Collector v0.153.0 expects this field as a string, so it was changed to `"4317"` in both examples.
- The gateway used the deprecated span metrics processor style and did not wire it into a pipeline. Replaced it with the `span_metrics` connector and added a traces-to-metrics pipeline path.
- The file storage extension included invalid `max_file_size_mib` configuration. Removed it and added `create_directory: true`, which is supported by the file storage extension.
- The Collector image tag was outdated. Updated `otel/opentelemetry-collector-contrib:0.96.0` to `otel/opentelemetry-collector-contrib:0.153.0`, verified with the image's `--version` output.
- The failover sequence implied that a failed batch is immediately rerouted to another backend. Updated the sequence to show retry while the endpoint remains resolved and routing of future batches after resolver updates.
- The agent DaemonSet comment implied pod metadata RBAC was required, but the shown config does not use the Kubernetes attributes processor. Changed the comment to say the agent uses a dedicated service account.
- The example `kubectl delete pod` command targeted a StatefulSet-style pod name (`otel-gateway-0`) even though the manifest uses a Deployment. Replaced it with a command that selects an actual matching gateway pod.
- The port-forward example used `svc/otel-gateway` for port `8888`, but the Service did not expose that port. Changed it to port-forward the Deployment.
- The test text said to "verify no data loss" from a single exporter metric. Changed it to the more accurate "check exporter failure metrics."

## Review Notes
The updated agent and gateway Collector config snippets were validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`. Kubernetes manifests were checked for YAML syntax, but not applied to a live cluster in this environment.
