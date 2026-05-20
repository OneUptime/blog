# Validation Summary: How to Fix ArgoCD Redis Connection Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Redis
- Redis Sentinel
- Kubernetes
- Kubernetes NetworkPolicy
- Prometheus alerting

## Sources Consulted
- Argo CD command parameters example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD FAQ for Redis authentication and the `argocd-redis` Secret: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD server command reference for Redis TLS and Sentinel flags: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/server-commands/argocd-server/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis client handling documentation for `maxclients`: https://redis.io/docs/latest/develop/reference/clients/

## Issues Found
- The architecture diagram showed Dex connecting to Redis for token caching and said all ArgoCD components connect to Redis. Current Argo CD documentation describes Redis as a disposable cache used by the core Argo CD components, while Dex uses its own in-memory data store. Removed Dex from the diagram and changed the wording to "core ArgoCD components."
- The Redis password Secret example used a nonstandard `argocd-redis-password` Secret. Current Argo CD documentation states the Redis password is stored in the `argocd-redis` Secret under the `auth` key. Updated the Secret creation and environment variable examples to use `argocd-redis` / `auth`.
- Several `redis-cli` examples omitted authentication. Current Argo CD installs enable Redis authentication by default, so those commands would fail with `NOAUTH Authentication required`. Updated Redis inspection, Sentinel, `FLUSHALL`, and monitoring commands to use `redis-cli --no-auth-warning -a "$REDIS_PASSWORD"` from the Redis pod.
- The external Redis TLS example used a `rediss://` URL and `redis.tls.enabled` ConfigMap key. The official Argo CD command parameter reference documents `redis.server` as hostname and port, and Redis TLS is exposed through component flags such as `--redis-use-tls`. Updated the example accordingly.
- The Sentinel example used unsupported `redis.sentinels` and `redis.sentinel.master` keys in `argocd-cmd-params-cm`. Updated it to use the HAProxy service for Argo CD HA manifests, and showed direct Sentinel configuration through documented `--sentinel` and `--sentinelmaster` flags.
- The recovery commands restarted `argocd-application-controller` as a Deployment. Current Argo CD manifests run the application controller as a StatefulSet. Updated the rollout restart command to `kubectl rollout restart statefulset argocd-application-controller -n argocd`.

## Review Notes
- The NetworkPolicy example is syntactically valid, but in production it may need namespace selectors, egress rules, or CNI-specific policy depending on the cluster's existing default-deny posture.
- `kubectl get endpoints` still works for this troubleshooting flow, but Kubernetes Service documentation now emphasizes EndpointSlices as the scalable backend representation.
