# Validation Summary: How to Use Centralized Log Collection from Kubernetes Pods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector k8sattributes processor
- Kubernetes DaemonSet
- Kubernetes RBAC
- Kubernetes container log rotation
- kubectl

## Sources Consulted
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector container operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector extensions documentation: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/

## Issues Found
- The filelog receiver used a hand-written router and regex parsers for CRI/containerd logs. The containerd parser timestamp regex excluded `Z` while the timestamp layout expected it, and the manual parser did not handle the current documented container log parsing behavior as well as the built-in `container` operator. Replaced the parser chain with the OpenTelemetry `container` operator.
- The collector's self-log exclude pattern was loose. Changed it to match the actual Kubernetes pod log path shape for the `monitoring` namespace and `otel-collector-*` pods.
- The Collector image tag was pinned to `0.96.0`, which is stale for a 2026 tutorial. Updated it to `0.153.0`, the current official release available during validation.
- The DaemonSet hostPath for `/var/log/pods` omitted a hostPath type. Added `type: Directory` to make the expected existing node log directory explicit.
- The log rotation section described persisted checkpoint behavior as automatic. The filelog receiver stores offsets in memory unless a storage extension is configured. Updated the wording and added `service.extensions: [file_storage]`, which is required to enable the configured extension.
- The verification commands applied namespaced resources before ensuring the `monitoring` namespace existed and did not apply the RBAC manifest. Added namespace creation and RBAC apply commands.

## Review Notes
The post is technically valid after the fixes. In a production deployment, readers should still tune batching, memory limits, retry behavior, exporter authentication, and whether to mount additional runtime paths such as `/var/lib/docker/containers` based on their Kubernetes runtime and backend.
