# Validation Summary: How to Debug ArgoCD Redis Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- Redis
- Redis Sentinel
- kubectl
- YAML Kubernetes manifests
- Bash

## Sources Consulted
- Argo CD component architecture: https://argo-cd.readthedocs.io/en/stable/developer-guide/architecture/components/
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD Redis credentials FAQ: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD upstream install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD upstream HA install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- Redis CLI examples did not account for Argo CD's default Redis authentication. Updated Redis commands to set `REDISCLI_AUTH` from the in-pod Redis password environment variable or from the `argocd-redis` Secret.
- Connectivity checks executed `redis-cli` and `nslookup` inside Argo CD component containers, where those tools are not guaranteed to exist. Replaced them with temporary Redis and BusyBox client pods.
- HA Redis Sentinel commands targeted `deploy/argocd-redis-ha`, but upstream HA manifests use the `argocd-redis-ha-server` StatefulSet with a `sentinel` container. Updated the log and exec commands accordingly.
- External Redis authentication patch used `argocd-secret` and `redis.password`, but Argo CD stores Redis authentication in the `argocd-redis` Secret under the `auth` key. Updated the command.
- The rollout restart command treated `argocd-application-controller` as a Deployment. Updated it to restart the StatefulSet.
- Redis Deployment argument examples would have overwritten the upstream Redis authentication and default persistence arguments. Updated the snippets to preserve `--requirepass $(REDIS_PASSWORD)` and the existing persistence flags.
- The session section implied Argo CD stores login sessions under `session:*` keys. Updated it to describe JWT sessions with Redis-backed revoked-token state and to inspect `revoked-token|*` keys.

## Review Notes
- `kubectl` was not installed in the local environment, so command syntax was verified against official Kubernetes references and upstream manifests rather than by executing commands against a cluster.
- The guide remains focused on non-HA Redis for most examples. HA installations need equivalent checks against `argocd-redis-ha-server` and `argocd-redis-ha-haproxy`.
