# Validation Summary: How to Build Self-Healing Systems

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Kubernetes (Deployments, Pods, Probes, restartPolicy, init containers, RBAC)
- Kubernetes Horizontal Pod Autoscaler (`autoscaling/v2`)
- KEDA (`keda.sh/v1alpha1`) with RabbitMQ trigger
- Python Flask (health endpoints)
- `psycopg2` (PostgreSQL client)
- `redis-py` client
- Kubernetes Python client (`kubernetes` package)
- Bash + curl + systemd (for non-Kubernetes self-healing)
- Mermaid diagrams (flowchart, sequenceDiagram)

## Sources Consulted
- Kubernetes Probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Pod lifecycle & CrashLoopBackOff exponential backoff (10s -> 20s -> 40s ... capped at 5 min): https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- HorizontalPodAutoscaler v2 API (behavior, stabilizationWindowSeconds): https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- KEDA ScaledObject + RabbitMQ scaler: https://keda.sh/docs/latest/reference/scaledobject-spec/ and https://keda.sh/docs/latest/scalers/rabbitmq-queue/
- Kubernetes Python client `AppsV1Api` / `CoreV1Api`: https://github.com/kubernetes-client/python
- Python `datetime` module — deprecation of `datetime.utcnow()` in 3.12: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- systemd unit file specification: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
1. **Deprecated `datetime.utcnow()`** — The Flask health-check code used `datetime.utcnow()`, which has been deprecated since Python 3.12 in favor of timezone-aware datetimes. Updated the import to include `timezone` and replaced both calls with `datetime.now(timezone.utc).isoformat()` so the produced timestamps are unambiguously UTC and the code does not emit DeprecationWarnings on modern Python versions.

## Review Notes
- The CrashLoopBackOff backoff description (10s, 20s, 40s, 80s, capped at 5 minutes) matches the documented kubelet behavior.
- HPA `autoscaling/v2` API, `behavior.scaleUp.stabilizationWindowSeconds: 0` and `scaleDown.stabilizationWindowSeconds: 300` are valid and match documented defaults / allowed values.
- KEDA `apiVersion: keda.sh/v1alpha1` is correct for `ScaledObject`. The RabbitMQ trigger uses the `host` connection string form (an AMQP URL) which is supported by the RabbitMQ scaler; `protocol` is optional and defaults to `auto`.
- The `livenessProbe.initialDelaySeconds: 0` is valid because a `startupProbe` is configured — the liveness probe is gated behind the startup probe completing successfully, so the comment is accurate.
- The `wait-for-db` init container uses a multi-line single-quoted YAML scalar inside a flow-style sequence. This is valid YAML (newlines fold to spaces) and the resulting shell command works correctly, though most teams prefer a block scalar (`|`) for readability.
- The remediation controller's `increase_memory` writes to `container.resources.requests['memory']`. This assumes `resources.requests` is already a non-None dict when `resources.limits` is set. In practice that is usually true, but a fully defensive implementation would initialize `requests` to `{}` first. Not a bug for the typical case shown.
- `from datetime import datetime` in `remediation_controller.py` is unused. Left as-is since it is a stylistic nit, not a technical error.
- The full-deployment `patch_namespaced_deployment(name, namespace, body)` call is supported by the Kubernetes Python client and is treated as a strategic merge patch by the server; mutable resource fields like memory limits/requests work fine with this pattern.
- RBAC `ClusterRole` includes `replicasets` (`get`, `list`); the controller only reads ReplicaSet names via pod ownerReferences and never calls the ReplicaSet API directly, so those permissions are not strictly required but are harmless.
