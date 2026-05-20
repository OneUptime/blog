# Validation Summary: How to Optimize Redis for Large ArgoCD Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Redis
- Kubernetes Deployments, ConfigMaps, affinity, and resource limits
- Argo CD Helm chart Redis HA values
- Redis Sentinel and HAProxy
- PrometheusRule alerting

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD upstream install manifest: https://github.com/argoproj/argo-cd/blob/master/manifests/install.yaml
- Argo CD Helm chart documentation and values: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis client handling documentation: https://redis.io/docs/latest/develop/reference/clients/
- DandyDeveloper Redis HA chart values used by the Argo CD chart dependency: https://github.com/DandyDeveloper/charts/blob/master/charts/redis-ha/values.yaml

## Issues Found
- The Redis Deployment example omitted the required `spec.selector` and matching pod labels, so it would not be accepted as an `apps/v1` Deployment if applied as shown. I added the selector and matching template labels.
- The Redis args examples omitted `--requirepass $(REDIS_PASSWORD)`, while current Argo CD manifests configure Redis authentication and Argo CD components read the password from the `argocd-redis` Secret. Replacing the args without preserving auth can break clients or weaken Redis security. I added the auth flag and Secret-backed environment variable in the full Deployment example, and kept the auth arg in the shorter args examples.
- The persistence section implied that persistence still needed to be disabled from the default Argo CD Redis manifest. Current upstream manifests already set `--save ""` and `--appendonly no`. I changed the wording to say to keep those settings when adding Redis memory and eviction flags.
- The persistence section said disabling RDB/AOF eliminates disk I/O entirely. Redis HA replication can still involve RDB transfer behavior depending on configuration, and containers may have other non-persistence I/O. I narrowed the statement to routine persistence I/O.
- The network section said the shown affinity would ensure Redis ran on the same node or availability zone as the controller. The example uses `topology.kubernetes.io/zone`, so it only expresses preferred same-zone placement. I corrected the wording.

## Review Notes
- The Redis sizing table is a reasonable starting guide, but actual Redis memory use depends heavily on manifest size, application count, repository layout, cache TTLs, and Redis overhead.
- The Prometheus alert expressions assume Redis exporter metric names and a `service="argocd-redis"` label. Deployments with different ServiceMonitor or relabeling configuration may need label adjustments.
- The `redis:7.2-alpine` example is still valid, but current upstream Argo CD manifests may use a newer Redis image tag depending on the Argo CD release or Helm chart version.
