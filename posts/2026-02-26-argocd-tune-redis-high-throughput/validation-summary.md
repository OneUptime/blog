# Validation Summary: How to Tune ArgoCD Redis for High Throughput

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Redis
- Kubernetes
- Redis Sentinel
- Prometheus metrics
- Redis Exporter

## Sources Consulted
- Argo CD command parameters ConfigMap reference: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cmd-params-cm.yaml
- Argo CD high availability guide: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD install manifests: https://github.com/argoproj/argo-cd/blob/master/manifests/install.yaml
- Argo CD HA install manifests: https://github.com/argoproj/argo-cd/blob/master/manifests/ha/install.yaml
- Redis configuration reference: https://github.com/redis/redis/blob/unstable/redis.conf
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis Exporter project documentation: https://github.com/oliver006/redis_exporter

## Issues Found
- The post placed `redis.server` and cache expiration settings in `argocd-cm`. Argo CD exposes these runtime parameters through `argocd-cmd-params-cm` in the official manifests, so the examples now use `argocd-cmd-params-cm`.
- The OIDC cache setting used `oidc.cache.expiration`. Argo CD's documented key is `server.oidc.cache.expiration`, so the snippet was corrected.
- The RDB snapshot example used `--save=...` and `--appendonly=no` as single Redis command arguments. The example now uses the argument style shown in Argo CD's Redis manifests and Redis configuration syntax.
- The Sentinel example incorrectly put Sentinel addresses into `redis.server` and used unsupported keys such as `redis.sentinelMasterName` and `redis.sentinelAddresses`. The section now shows the Argo CD HA Redis proxy configuration and a direct Sentinel flag example using `--sentinel` and `--sentinelmaster`.
- The Redis defragmentation example included `--active-defrag-enabled=yes`, which is not a Redis configuration directive. The duplicate invalid flag was removed; `activedefrag yes` is the correct setting.

## Review Notes
- The memory sizing formula remains a workload-specific heuristic rather than an official Argo CD sizing rule. The post already tells readers to monitor actual usage and adjust.
- Argo CD's built-in HA manifests currently front Redis HA through HAProxy, so `redis.server` should point at the proxy service when using those manifests.
