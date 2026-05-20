# Validation Summary: How to Handle ArgoCD State After Redis Failure

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Argo CD
- Kubernetes
- Redis
- Redis Sentinel / HAProxy
- kubectl
- argocd CLI
- PrometheusRule

## Sources Consulted
- Argo CD High Availability: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD FAQ for Redis authentication and component restart commands: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis AUTH command documentation: https://redis.io/docs/latest/commands/auth/
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/

## Issues Found
- The post described persistent Argo CD state as living only in CRDs and ConfigMaps. Updated it to include Kubernetes objects such as CRDs, ConfigMaps, and Secrets, which better matches Argo CD's documented stateless model.
- The post overstated the application controller's Redis failure behavior by saying it directly queries every cluster for every reconciliation cycle. Updated this to describe cache misses and rebuild behavior more accurately.
- The repo server section said every reconciliation cycle requires re-fetching from Git. Updated it to say cache misses require repository state refresh and manifest regeneration, which is more accurate.
- The sequence diagram showed the application controller cloning and rendering manifests directly. Updated it to route generated manifest requests through the repo server.
- The application controller log and restart commands used `deployment/argocd-application-controller`. Current Argo CD manifests run the application controller as a StatefulSet, so those commands now use `statefulset/argocd-application-controller`.
- Redis health-check commands used unauthenticated `redis-cli` calls. Current Argo CD installs enable Redis authentication by default, so the examples now pass the `REDIS_PASSWORD` environment variable.
- The Redis HA section referred generally to Sentinel or Redis Cluster. Updated it to match Argo CD's HA manifests, which provide Redis HA with Sentinel and HAProxy.
- The Redis probe example used unauthenticated `redis-cli ping`. Updated the probe commands to pass the Redis password.
- The memory-limit example said the Kubernetes memory limit was 30% higher than Redis `maxmemory`, but the shown values did not match that percentage. Reworded the comment to the technically relevant requirement: set the container limit higher than Redis `maxmemory` to allow overhead.
- The wrap-up repeated the CRDs-and-ConfigMaps-only persistent state claim and implied direct Git fetches by Argo CD broadly. Updated it to mention Kubernetes objects including Secrets and cache rebuilds through the Kubernetes API and repo server.

## Review Notes
The guide is valid after these corrections. The exact Prometheus metric labels in the alert examples depend on the Redis exporter and scrape configuration in the target cluster, so operators may need to adjust label selectors such as `namespace` and `job`.
