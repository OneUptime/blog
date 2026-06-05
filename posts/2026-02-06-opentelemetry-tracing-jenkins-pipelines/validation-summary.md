# Validation Summary: How to Add OpenTelemetry Tracing to Jenkins Pipelines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Jenkins
- Jenkins Pipeline / Jenkinsfile
- Jenkins OpenTelemetry plugin
- Jenkins Configuration as Code (JCasC)
- OpenTelemetry Collector
- OTLP gRPC and OTLP/HTTP
- Kubernetes CLI usage in Jenkins deployment steps

## Sources Consulted
- Jenkins OpenTelemetry plugin README: https://github.com/jenkinsci/opentelemetry-plugin
- Jenkins OpenTelemetry plugin Pipeline Steps Reference: https://www.jenkins.io/doc/pipeline/steps/opentelemetry/
- Jenkins OpenTelemetry plugin traces documentation: https://github.com/jenkinsci/opentelemetry-plugin/blob/main/docs/job-traces.md
- Jenkins OpenTelemetry plugin setup and JCasC documentation: https://github.com/jenkinsci/opentelemetry-plugin/blob/main/docs/setup-and-configuration.md
- Jenkins OpenTelemetry plugin metrics documentation: https://github.com/jenkinsci/opentelemetry-plugin/blob/main/docs/monitoring-metrics.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourceprocessor

## Issues Found
- The post used a non-existent `withOpenTelemetrySpan` Pipeline step with `spanName` and map-style attributes. Updated all examples to the documented `withNewSpan(label: ..., attributes: ([spanAttribute(...) ...]))` API.
- The JCasC example used an unsupported `exporterProtocol` field. Replaced it with `configurationProperties: "otel.exporter.otlp.protocol=grpc"`, which matches the plugin documentation.
- The JCasC authentication example used incorrect header authentication field names. Updated it to the documented bearer token authentication shape with `bearerTokenAuthentication.tokenId`.
- The automatic trace sketch used unsupported or incorrect attribute names, including `ci.pipeline.result`, `git.url`, `git.commit`, and JUnit test count attributes. Updated the documented attribute names and removed unsupported JUnit count attributes.
- The Collector filter processor example used older filter configuration syntax and an incorrect Jenkins span attribute key. Updated it to current `trace_conditions` syntax and `span.attributes["jenkins.pipeline.step.type"]`.
- The Collector header example used older environment variable substitution syntax. Updated it to `${env:OTEL_AUTH_TOKEN}`.
- The metrics list included `ci.pipeline.run.count`, which is not a current Jenkins OpenTelemetry plugin metric. Replaced it with documented run metrics such as `ci.pipeline.run.completed`, `ci.pipeline.run.success`, and `ci.pipeline.run.failed`.
- The deployment correlation example said it recorded trace context but did not include the trace ID in the payload. Added the plugin-provided `TRACE_ID` environment variable to the JSON payload.
- The JCasC snippet was labeled as `groovy` even though it is YAML. Updated the code fence language to `yaml`.

## Review Notes
The article is now aligned with the Jenkins OpenTelemetry plugin documentation current as of June 5, 2026. Future maintenance should re-check the Collector filter processor syntax because the documented filter configuration changed in Collector 0.146.0 and older configurations may still appear in examples.
