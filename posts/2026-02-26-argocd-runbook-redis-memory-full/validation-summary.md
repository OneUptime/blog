# Validation Summary: ArgoCD Runbook: Redis Memory Full

## Status
validated

## Post Type
Operational runbook

## Technologies Covered
- Argo CD
- Redis
- Kubernetes
- kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis `CONFIG SET` command documentation: https://redis.io/docs/latest/commands/config-set/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis `SCAN` command documentation: https://redis.io/docs/latest/commands/scan/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The key distribution step said `DBSIZE` counts keys by type. Redis `DBSIZE` returns the number of keys in the selected database, so the comment was changed to "Count keys in the current database."
- The OOMKilled check used `involvedObject.name~=argocd-redis`, but Kubernetes field selectors only support `=`, `==`, and `!=`; regex matching is not supported. The command was replaced with a pod JSONPath query that checks container last termination reasons.
- The active defragmentation command was presented as universally available. Redis active defragmentation depends on Redis build support, so the comment now says to enable it if the Redis build supports it.
- The emergency recovery wait command waited on pods by label immediately after deleting them, which can fail or race if no replacement pod is visible at command start. It was changed to `kubectl rollout status deployment/argocd-redis`.

## Review Notes
The runbook targets a standard non-HA Argo CD installation using the `argocd-redis` Deployment. HA installations use different Redis resources, so operators should adapt resource names for `argocd-redis-ha` deployments or StatefulSets.
