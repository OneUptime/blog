# Validation Summary: How to Handle Application State in ArgoCD Redis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Redis
- Redis Sentinel and HAProxy
- Kubernetes
- Prometheus
- GitOps

## Sources Consulted
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD stable install and HA manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml and https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD FAQ for Redis credentials: https://argo-cd.readthedocs.io/en/latest/faq/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Redis Deployment examples omitted the required `spec.selector` and matching pod template labels for `apps/v1` Deployments. I added selectors and labels to both Deployment snippets so the examples are valid Kubernetes manifests.
- The Redis HA snippet said `redis.server: argocd-redis-ha-haproxy:6379` points to Redis Sentinel. In Argo CD's HA manifests that value points to the HAProxy service in front of Redis HA, so I corrected the comment.
- The cache settings snippet used `controller.cluster.cache.retry.timeout`, which is not a current Argo CD cmd-param key. I replaced it with the documented `controller.app.state.cache.expiration` setting and adjusted the surrounding explanation.
- The monitoring command used `kubectl exec` into `deploy/argocd-application-controller`, but the default stable Argo CD install exposes controller metrics through the `argocd-metrics` service and does not require assuming `curl` exists inside the controller container. I changed the example to port-forward `svc/argocd-metrics`.
- The scale tuning snippet used Redis `hash-max-ziplist-*` settings with a Redis 7 image. Redis 7 documents the corresponding listpack settings, so I changed them to `hash-max-listpack-entries` and `hash-max-listpack-value`.

## Review Notes
- The Prometheus alert expressions assume Redis exporter metric names and labels such as `redis_memory_used_bytes`, `redis_memory_max_bytes`, and `redis_evicted_keys_total`. Those are plausible for common Redis exporters, but exact labels can vary by chart or scrape configuration.
- The `KEYS '*my-app*'` example is technically valid but should be avoided on large Redis instances; the post already warns about scanning keys and uses `--scan` for broad listing.
