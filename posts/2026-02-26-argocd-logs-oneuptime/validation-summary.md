# Validation Summary: How to Ship ArgoCD Logs to OneUptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OneUptime telemetry ingestion
- Fluent Bit

## Sources Consulted
- Argo CD `argocd-cmd-params-cm` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- OneUptime OpenTelemetry telemetry ingestion docs: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OpenTelemetry Collector filelog receiver docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver
- OpenTelemetry container parser documentation/blog: https://opentelemetry.io/blog/2024/otel-collector-container-log-parser/
- OpenTelemetry Collector transform processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector Docker install docs: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector releases API: https://api.github.com/repos/open-telemetry/opentelemetry-collector-releases/releases/latest
- Fluent Bit OpenTelemetry output docs: https://docs.fluentbit.io/manual/4.0/data-pipeline/outputs/opentelemetry

## Issues Found
- The OneUptime credential was described as a generic API key or service token. OneUptime's current docs use a telemetry ingestion token sent in the `x-oneuptime-token` header, so the wording and secret key were updated to use a telemetry ingestion token.
- The Argo CD JSON logging ConfigMap only covered server, controller, and repo-server while saying all components. Added common ApplicationSet and Notifications controller log format keys from the Argo CD command params reference.
- The OpenTelemetry Collector example used a manual CRI regex parser with a timestamp layout that would not reliably parse nanosecond CRI/containerd timestamps. Replaced it with the Collector's `container` parser, which is the documented parser for Kubernetes container logs and handles Docker, CRI-O, and containerd formats.
- The collector config defined an OTLP receiver for Fluent Bit but did not include it in the logs pipeline. Removed that unused receiver path and made the shown collector pipeline consistently collect from Kubernetes log files.
- The `argocd.component` attribute was populated from a `component` attribute that the example did not create. Updated enrichment to use the Kubernetes container name extracted by the container parser via the transform processor.
- The collector image tag `0.92.0` was very old for a 2026 post. Updated it to `0.152.1`, the latest OpenTelemetry Collector release returned by the official GitHub releases API on 2026-05-20.
- Updated environment variable names in the collector and Fluent Bit examples from `ONEUPTIME_API_KEY` to `ONEUPTIME_TOKEN` to match the corrected credential terminology.

## Review Notes
- YAML examples were parsed successfully.
- The OpenTelemetry Collector configuration was validated successfully with `otel/opentelemetry-collector-contrib:0.152.1`.
- The Fluent Bit section is a ConfigMap-only example and still assumes the deployment provides `ONEUPTIME_TOKEN`, Kubernetes API permissions, and host log volume mounts.
