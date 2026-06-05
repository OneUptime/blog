# Validation Summary: How to Monitor Spinnaker Deployments with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spinnaker pipelines and stages
- Spinnaker Echo event forwarding
- OpenTelemetry Python tracing and metrics APIs
- OpenTelemetry Collector
- Kubernetes deployment metadata
- Canary analysis / Kayenta

## Sources Consulted
- Spinnaker Notifications and Events Guide: https://spinnaker.io/docs/setup/other_config/features/notifications/
- Spinnaker Pipeline Stages reference: https://spinnaker.io/docs/reference/pipeline/stages/
- Spinnaker Canary Overview: https://spinnaker.io/docs/guides/user/canary/canary-overview/
- Spinnaker Canary Judge documentation: https://spinnaker.io/docs/guides/user/canary/judge/
- Spinnaker Kubernetes Provider Overview: https://spinnaker.io/docs/reference/providers/kubernetes/
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The post used `type: "webhook"` as a Spinnaker pipeline/stage notification type. Current Spinnaker documentation lists built-in notifications such as email, Slack, Microsoft Teams, SMS, and CDEvents, and documents downstream webhooks through Echo's REST event listener. I replaced the pipeline notification JSON with an `echo-local.yml` `rest.endpoints` configuration and updated the bridge to consume Echo event payloads.
- The bridge expected payload fields such as `data["execution"]` and `data["stage"]` from custom notification endpoints. Echo event payloads contain event metadata under `details` and pipeline execution data under `content.execution`. I updated the Flask bridge to read `details.type`, `content.execution`, and the active stage from the execution stages list.
- The OpenTelemetry Python example called `span.set_status(trace.StatusCode.ERROR, ...)`, which is not the documented Python API. I updated it to import `Status` and `StatusCode` and call `span.set_status(Status(StatusCode.ERROR, "..."))`.
- The canary metrics example claimed that Spinnaker sets a `SPINNAKER_SERVER_GROUP` environment variable. I found no official Spinnaker documentation for that environment variable, so I changed the example to use explicit `SERVER_GROUP` and `DEPLOYMENT_TYPE` metadata set by the deployment manifest or stage.
- The Collector configuration comment claimed Kubernetes attribute enrichment, but the snippet did not configure the `k8sattributes` processor. I changed the comment to accurately describe the configured `attributes` processor behavior.

## Review Notes
The bridge keeps spans in process memory, so production deployments should account for service restarts and horizontally scaled bridge instances. The Collector snippet is structurally valid for OTLP receive/process/export, but the placeholder OneUptime endpoint still needs to be replaced with the actual backend endpoint and credentials for a real deployment.
