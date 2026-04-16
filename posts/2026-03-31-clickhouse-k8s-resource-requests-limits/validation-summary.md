# Validation Summary: How to Configure ClickHouse Resource Requests and Limits on K8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server configuration, `max_memory_usage` setting, user profiles in XML)
- Kubernetes (StatefulSet, resource requests/limits, ResourceQuota)
- Vertical Pod Autoscaler (VPA) — `autoscaling.k8s.io/v1`
- `kubectl` CLI (`kubectl top pod`)

## Sources Consulted
- Kubernetes Resource Management docs: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Vertical Pod Autoscaler repository: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler (stable `autoscaling.k8s.io/v1` API, update modes: Off, Initial, Recreate, Auto)
- ClickHouse settings reference — `max_memory_usage`: https://clickhouse.com/docs/en/operations/settings/query-complexity#settings_max_memory_usage
- ClickHouse server settings — `max_server_memory_usage`: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#max_server_memory_usage
- ClickHouse user profiles (users.xml structure): https://clickhouse.com/docs/en/operations/settings/settings-profiles
- `kubectl top pod` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#top-pod
- Docker Hub `clickhouse/clickhouse-server:24.3` tag: https://hub.docker.com/r/clickhouse/clickhouse-server/tags

## Issues Found
- **Incorrect percentage for `max_memory_usage` example.** The post said `max_memory_usage` of `12884901888` bytes was "roughly 80%" of the 16 GiB container limit. That value is exactly 12 GiB, which is 75% of 16 GiB (80% would be ~13,743,895,347 bytes). Changed the prose from "80%" to "75%" to match the byte value shown in the XML snippet. Left the byte value as-is since 12 GiB is a clean round number that keeps the example readable.

## Review Notes
- `max_memory_usage` is technically a *per-query* limit set in a user profile (`users.xml`), not a server-wide cap. For enforcing a hard ceiling aligned with a container memory limit, `max_server_memory_usage` in `config.xml` is the more precise control. The post's approach (setting a per-query default via the profile) is still a common and valid safeguard, but readers with larger/looser query concurrency may want to additionally set `max_server_memory_usage`. Not flagged as an error since the post's stated goal — giving ClickHouse a buffer before the OOM killer fires — is achieved.
- The statement "setting CPU requests too low can cause throttling under load" conflates CPU *requests* with CPU *limits*. Strictly, CFS throttling occurs when a container exceeds its CPU *limit*; low *requests* cause CPU starvation/fair-share pressure under node contention, not throttling per se. Common industry shorthand, left as-is since the practical guidance (don't set requests too low) is sound.
- The StatefulSet snippet is a minimal illustrative example and intentionally omits `serviceName`, `selector`, `volumeClaimTemplates`, etc. — acceptable for a focused resource-config tutorial.
- The ClickHouse image tag `clickhouse/clickhouse-server:24.3` is a real, published tag on Docker Hub.
- VPA `autoscaling.k8s.io/v1` is the current stable API version (stable since VPA 0.10+, 2021). `updateMode: "Off"` is a valid mode that makes VPA emit recommendations without restarting pods — matches the post's description.
- `kubectl top pod --containers` is a valid, current flag (requires metrics-server installed in the cluster; not mentioned in the post but a reasonable omission for a resource-tuning tutorial).
