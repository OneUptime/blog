# Validation Summary: How to Deploy Jaeger for Distributed Tracing with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- Helm
- Jaeger Operator
- OpenTelemetry Collector
- Elasticsearch
- Kubernetes Ingress

## Sources Consulted
- Jaeger Operator README: https://github.com/jaegertracing/jaeger-operator
- Jaeger Operator CRD API docs: https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/docs/api.md
- Jaeger 1.x Operator docs: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger sampling docs: https://www.jaegertracing.io/docs/1.68/architecture/sampling/
- Jaeger Helm chart index: https://jaegertracing.github.io/helm-charts/index.yaml
- OpenTelemetry migration away from the Jaeger exporter: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector OTLP gRPC exporter docs: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector OTLP receiver docs: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/main/receiver/otlpreceiver/README.md
- OpenTelemetry Helm chart index: https://open-telemetry.github.io/opentelemetry-helm-charts/index.yaml
- OpenTelemetry Collector Helm chart defaults: https://raw.githubusercontent.com/open-telemetry/opentelemetry-helm-charts/main/charts/opentelemetry-collector/values.yaml
- OpenTelemetry Collector Helm chart README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-helm-charts/main/charts/opentelemetry-collector/README.md

## Issues Found
- The architecture diagram was inaccurate. It showed the Jaeger Query UI talking directly to Elasticsearch and a Jaeger Agent path that the post did not actually deploy. I updated it to show the OpenTelemetry Collector gateway, Jaeger Collector, Jaeger Query, and Elasticsearch in the correct flow.
- The Jaeger custom resource example had invalid HCL because `server-urls` was not quoted. I quoted that key so the OpenTofu manifest is syntactically valid.
- The Jaeger custom resource placed ingress settings under `spec.query`, but the operator API defines ingress at `spec.ingress`. I moved the ingress block to the correct location and switched the deprecated ingress-class annotation to the supported `ingressClassName` field.
- The Elasticsearch TLS example referenced a CA file path without mounting a certificate into the Jaeger pods. I updated the example to use a documented CA mount via `volumeMounts` and `volumes`.
- The OpenTelemetry Collector example used the native `jaeger` exporter on port `14250`. Current OpenTelemetry guidance is to migrate to OTLP because recent official Collector builds do not include the native Jaeger exporter. I replaced it with the `otlp` exporter targeting Jaeger Collector on port `4317`.
- The pinned Helm chart versions were stale. I updated `jaeger-operator` from `2.49.0` to `2.57.0` and `opentelemetry-collector` from `0.73.1` to `0.152.0` based on the official chart indexes.
- The post described the Jaeger `sampling` block as general sampling guidance. Jaeger documents that this mechanism serves remote sampling strategies to classic Jaeger clients, so I clarified that scope in the post and best-practices section.

## Review Notes
- The post is now technically correct as a Jaeger 1.x Operator-based deployment guide.
- For new Jaeger v2 Kubernetes deployments, current Jaeger guidance is to use the OpenTelemetry Operator rather than the legacy Jaeger Operator.
- This review validated the post against official documentation and chart metadata; no live Kubernetes deployment was executed as part of the review.
