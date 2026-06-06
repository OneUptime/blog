# Validation Summary: How to Use Alert Suppression Windows and Maintenance Schedules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry SDK resource attributes
- Prometheus Alertmanager
- GitHub Actions
- Kubernetes kubectl
- Python requests
- cron
- Bash / curl / jq

## Sources Consulted
- Prometheus Alertmanager concepts: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager API v2 OpenAPI specification: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- Prometheus Alertmanager management API: https://prometheus.io/docs/alerting/latest/management_api/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- GitHub Actions workflow commands: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GNU date local help output for `date -u -d` formatting behavior

## Issues Found
- The Alertmanager UI explanation implied that suppressed alerts remain visible after the maintenance window closes. Alertmanager silences mute matching active alerts during the silence window; it is not a historical alert store. Changed the sentence to say alerts appear as silenced while active.
- The OpenTelemetry Collector filter processor example used the older `metrics.exclude.match_type/resource_attributes` style. Current filter processor documentation for version 0.146.0 and later recommends OTTL-based `metric_conditions`, and marks legacy configuration as deprecated. Updated the snippet to use `metric_conditions` with `resource.attributes["maintenance.mode"] == "true"`.
- The `OTEL_RESOURCE_ATTRIBUTES` example said a deployment script sets the attribute before deploying, which could be read as affecting an already-running service from the CI shell. Clarified that the deployment config must start the instrumented service process with that environment variable during maintenance.

## Review Notes
- Alertmanager API v2 silence creation and deletion endpoints, matcher fields, and `silenceID` response shape match the official OpenAPI specification.
- The GitHub Actions `$GITHUB_OUTPUT` usage is current. The workflow is a partial example and assumes `env.SERVICE_NAME`, network access to Alertmanager, `jq`, `kubectl`, and cluster credentials are provided by surrounding workflow setup.
- The Python recurring silence script is syntactically valid and uses Alertmanager-compatible RFC3339-style timestamps with a UTC offset.
- The Collector filter processor is documented as alpha for metrics, so production use should be tested with the Collector distribution and version deployed.
