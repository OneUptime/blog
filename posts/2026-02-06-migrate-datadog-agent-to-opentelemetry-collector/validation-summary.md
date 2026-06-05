# Validation Summary: How to Migrate from Datadog Agent to OpenTelemetry Collector Step by Step

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector receivers, processors, and exporters
- Host metrics receiver
- Filelog receiver and container parser operator
- Datadog receiver and Datadog exporter
- OTLP over gRPC and HTTP
- Python OpenTelemetry SDK and OTLP exporter
- Docker container log collection

## Sources Consulted
- OpenTelemetry Collector receivers documentation: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Kubernetes filelog receiver documentation and container parser example: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry container log parser blog: https://opentelemetry.io/blog/2024/otel-collector-container-log-parser/
- OpenTelemetry Collector Datadog receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/datadogreceiver
- Datadog OpenTelemetry integration documentation: https://docs.datadoghq.com/integrations/otel/
- Datadog OpenTelemetry log collection documentation: https://docs.datadoghq.com/opentelemetry/config/log_collection/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The Docker run command exposed only OTLP ports even though the guide later configured the Datadog receiver on port 8126. Added `-p 8126:8126`.
- The Docker run command did not mount Docker container log files, so the `filelog` receiver example would not be able to read Docker logs from inside the Collector container. Added a read-only `/var/lib/docker/containers` mount.
- The command comment implied `hostmetrics` was a Contrib-only reason to use the Contrib distribution. Updated the wording to focus on Contrib-only components used by the guide, including `filelog`, the Datadog receiver, and the Datadog exporter.
- The post said the Datadog exporter automatically translates OpenTelemetry host metrics back to classic Datadog metric names. Datadog documents Collector host metrics under `otel.system.*` and `otel.process.*`, so the text now tells readers to plan dashboard and alert updates.
- The log collection section described the standard Docker log path but used `/var/log/containers/*.log`, which is a Kubernetes-style symlink path. Updated the examples to `/var/lib/docker/containers/*/*-json.log`.
- The Docker log parsing example used a hand-written `json_parser` timestamp layout that would not reliably handle Docker timestamps. Replaced it with the Collector `container` parser operator, which is documented for container log formats.
- The complete Collector configuration introduced a Datadog exporter but did not use it in any pipeline and omitted the Datadog receiver from the trace pipeline. Added the Datadog receiver to the trace pipeline and the Datadog exporter to traces, metrics, and logs for the transition example.
- The custom checks section recommended the `script processor`, which is not a current Collector component in the official processor list. Replaced it with the `transform processor`.

## Review Notes
- YAML snippets were parsed locally for syntax, and the Python snippet was checked with Python AST parsing.
- The examples intentionally use `otel/opentelemetry-collector-contrib:latest` because the post is not pinned to a Collector version. For production, pin a tested Collector image tag.
