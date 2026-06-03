# Validation Summary: How to implement securityContext with runAsNonRoot for rootless containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes securityContext
- Kubernetes Pod Security Standards and Pod Security Admission
- Kubernetes Pods, Deployments, StatefulSets, Services, initContainers, and volumes
- Dockerfile USER instruction and container image users
- kubectl and jq
- kube-state-metrics and Prometheus-based monitoring
- PostgreSQL and Redis container images

## Sources Consulted
- Kubernetes API reference for Pod v1 securityContext fields: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes security context task documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Standards cluster-level enforcement tutorial: https://kubernetes.io/docs/tutorials/security/cluster-level-pss/
- Kubernetes sysctl documentation for unprivileged port behavior: https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- containerd CRI configuration for unprivileged ports: https://containerd.io/docs/1.7/cri/config/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- PostgreSQL Docker Official Image documentation: https://github.com/docker-library/docs/tree/master/postgres
- Redis Docker Official Image documentation and Dockerfile: https://hub.docker.com/_/redis and https://raw.githubusercontent.com/redis/docker-library-redis/master/7.4/alpine/Dockerfile

## Issues Found
- The Redis Deployment example used `apps/v1` without the required selector and matching pod template labels. Added `spec.selector.matchLabels` and matching `template.metadata.labels`.
- The Redis Alpine example used `fsGroup: 999`, but the Redis Alpine image uses UID 999 with a different group ID. Updated `fsGroup` to 1000 for the Alpine variant.
- The StatefulSet example was missing required `serviceName`, selector, and matching pod template labels. Added the missing fields.
- The StatefulSet example set pod-level `runAsNonRoot: true` while also showing an initContainer that runs as UID 0. Removed pod-level `runAsNonRoot` and clarified that only the main container enforces `runAsNonRoot`.
- The Service example selected `app: webserver`, but the Pod had no matching label. Added the label to the Pod metadata.
- The webserver example used `nginx:alpine` with `containerPort: 8080`, but the image is not configured in the snippet to listen on 8080. Changed the image to a generic `webserver:v1.0` that can represent an application listening on 8080.
- The kubectl/jq compliance command only checked pod-level securityContext fields and could miss container-level overrides. Updated it to inspect init containers, regular containers, and ephemeral containers while respecting container-level overrides.
- The original jq fallback would have mishandled explicit `runAsNonRoot: false` values if written with `//`. The updated command uses `has()` checks so explicit false values are preserved.
- The PrometheusRule example used `kube_pod_spec_securitycontext_runasnonroot`, which is not exposed by default kube-state-metrics pod metrics. Replaced it with a caveat recommending a policy engine or custom compliance exporter for Prometheus-based alerting.

## Review Notes
The privileged-port guidance is broadly correct for typical Linux/container runtime defaults, but Kubernetes also allows the namespaced `net.ipv4.ip_unprivileged_port_start` sysctl and some runtimes can configure unprivileged ports differently. Future improvements could mention that caveat if the article is expanded.
