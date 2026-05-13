# Validation Summary: How to Configure Flagger Canary Resource for StatefulSets

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flagger Canary CRD
- Kubernetes StatefulSets
- Kubernetes Services and headless Services
- kubectl
- Prometheus MetricTemplates
- Redis and Redis exporter metrics

## Sources Consulted
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger "Deployment Strategies" documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger "Webhooks" documentation: https://docs.flagger.app/usage/webhooks
- Flagger Canary CRD manifest: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flagger StatefulSet support issue: https://github.com/fluxcd/flagger/issues/410
- Flagger StatefulSet support pull request: https://github.com/fluxcd/flagger/pull/1391
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes kubectl set image documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Redis exporter project documentation: https://github.com/oliver006/redis_exporter

## Issues Found
- The post presented `targetRef.kind: StatefulSet` as a working Flagger Canary configuration. Current Flagger documentation and the Canary CRD only support `Deployment`, `DaemonSet`, and `Service` values, so I changed the text to state that the manifest is future-facing and will be rejected by current Flagger releases.
- The analysis flow claimed Flagger currently scales canary StatefulSets and promotes or rolls back StatefulSet primaries. Since StatefulSet support is not implemented, I rewrote those claims as hypothetical behavior that would need to be revalidated if official support is added.
- The PVC, pod ordering, and headless service sections described concrete Flagger StatefulSet behavior that does not exist today. I changed those sections to describe current limitations and future implementation considerations, and corrected the headless service example to use `spec.service.headless: true` for supported workloads.
- The Redis StatefulSet exposed a metrics port from the plain `redis:7.0` container, but that image does not expose Prometheus metrics. I removed the nonexistent metrics port from the StatefulSet and Service example.
- The Canary examples used built-in HTTP request metrics for a Redis workload. Those checks are not generally valid for Redis TCP traffic, so I removed them from the StatefulSet Canary example and kept the validation focused on webhooks and custom metrics.
- The Prometheus query used a nonstandard `redis_memory_used_ratio` metric. I changed it to calculate a percentage from Redis exporter metrics `redis_memory_used_bytes` and `redis_memory_max_bytes`.
- The `kubectl set image` command was technically valid Kubernetes syntax, but the post implied it would trigger a Flagger StatefulSet canary. I clarified that it only performs a native StatefulSet rolling update with current Flagger releases.

## Review Notes
The article is now technically accurate as a limitation and planning guide, but the title still implies an actionable Flagger StatefulSet configuration. A future editorial pass could retitle it more directly around the current lack of Flagger StatefulSet support.
