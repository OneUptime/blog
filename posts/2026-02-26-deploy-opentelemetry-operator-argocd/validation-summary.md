# Validation Summary: How to Deploy OpenTelemetry Operator with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Application manifests and sync options
- Helm dependency charts and values
- Kubernetes custom resources, volumes, RBAC, and ServiceAccounts
- OpenTelemetry Operator
- OpenTelemetryCollector and Instrumentation custom resources
- OpenTelemetry Collector receivers, processors, and exporters
- Loki, Tempo, and Prometheus remote write backends

## Sources Consulted
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Helm chart values for opentelemetry-operator 0.74.0: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/opentelemetry-operator-0.74.0/charts/opentelemetry-operator/values.yaml
- OpenTelemetry Operator v0.112.0 CRDs and naming implementation: https://github.com/open-telemetry/opentelemetry-operator/tree/v0.112.0
- OpenTelemetry Collector Contrib v0.112.0 filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.112.0/receiver/filelogreceiver
- OpenTelemetry Collector Contrib v0.112.0 container parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.112.0/pkg/stanza/docs/operators/container.md
- OpenTelemetry Collector Contrib v0.112.0 k8sattributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.112.0/processor/k8sattributesprocessor
- OpenTelemetry Collector Contrib v0.112.0 k8s_events receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.112.0/receiver/k8seventsreceiver
- OpenTelemetry Collector Contrib v0.112.0 filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.112.0/processor/filterprocessor
- OpenTelemetry Collector Contrib v0.112.0 Loki exporter documentation and deprecation notice: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.112.0/exporter/lokiexporter
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The Helm values placed `serviceMonitor` at the chart root, but in opentelemetry-operator chart 0.74.0 it belongs under `manager.serviceMonitor`. Moved the block under `manager`.
- The collector examples used Kubernetes metadata and events components without enabling operator-created collector RBAC. Added `manager.createRbacPermissions: true` so the operator can create the required RBAC for collectors.
- The DaemonSet collector read `/var/log/pods/*/*/*.log` without mounting `/var/log/pods` from the host. Added the required hostPath volume and volumeMount.
- The DaemonSet set `K8S_NODE_NAME` but did not use it. Added `k8sattributes.filter.node_from_env_var: K8S_NODE_NAME` to follow the recommended agent pattern and avoid cluster-wide pod watches from every node collector.
- The filelog receiver used hand-written Docker/CRI parsing rules that would miss common CRI/containerd timestamps and duplicate logic provided by the collector. Replaced them with the supported `container` parser operator, which handles Docker, CRI-O, and containerd formats.
- The filter processor used the older `logs.exclude.match_type/bodies` style. Updated it to the current OTTL `logs.log_record` form used by collector 0.112.0.
- The gateway example configured `otlp/loki` to `loki-gateway:3100`, which is not the correct Loki HTTP ingestion path. Updated it to `otlphttp/loki` with the Loki OTLP HTTP logs endpoint `/otlp/v1/logs`.
- The auto-instrumentation introduction said the operator injects instrumentation sidecars into application pods. Updated the wording because Java, Python, Node.js, and .NET injection is not generally described as sidecar injection; Go is the notable sidecar-based case.

## Review Notes
- The post intentionally uses chart version 0.74.0 and collector image 0.112.0. Those are not the latest versions as of the review date, but they are internally plausible for the examples after the fixes.
- The Loki exporter component itself was already deprecated in collector 0.112.0, so the post now uses Loki's native OTLP HTTP ingestion path instead.
- YAML snippets were parsed after editing to verify basic syntax.
