# Validation Summary: How to Set Up Telepresence with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Telepresence
- Kubernetes
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry OTLP gRPC exporter
- Flask
- Requests
- Jaeger
- VS Code debugpy

## Sources Consulted
- Telepresence client installation documentation: https://telepresence.io/docs/install/client/
- Telepresence CLI reference: https://telepresence.io/docs/reference/cli/telepresence
- Telepresence intercept CLI reference: https://telepresence.io/docs/reference/cli/telepresence_intercept
- Telepresence list CLI reference: https://telepresence.io/docs/reference/cli/telepresence_list
- Telepresence leave CLI reference: https://telepresence.io/docs/reference/cli/telepresence_leave
- Telepresence quit CLI reference: https://telepresence.io/docs/reference/cli/telepresence_quit
- Telepresence intercept concepts: https://telepresence.io/docs/concepts/intercepts/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html

## Issues Found
- The macOS Telepresence Homebrew command used the older `datawire/blackbird/telepresence` formula. Updated it to the current OSS formula, `brew install telepresenceio/telepresence/telepresence-oss`.
- The Linux Telepresence binary download URL used an older Ambassador download path. Updated it to the current GitHub releases URL for `telepresence-linux-amd64`.
- The service discovery example used `telepresence list` as if it listed available Kubernetes services. Current Telepresence documentation describes `telepresence list` as listing current engagements/intercepts, so the command was changed to `kubectl get services`.
- The OTLP gRPC endpoint examples omitted the URL scheme. Updated the examples to use `http://otel-collector.observability.svc.cluster.local:4317`, matching current OpenTelemetry endpoint configuration examples for insecure OTLP/gRPC.
- The Python span API calls used `span.setAttribute(...)`, which is not the OpenTelemetry Python method name. Updated both calls to `span.set_attribute(...)`.

## Review Notes
The tutorial assumes the Telepresence traffic manager can be installed or is already present in the cluster and that the user has the required cluster permissions. That is valid for a concise tutorial, but a future version could mention `telepresence helm install` or RBAC prerequisites explicitly.
