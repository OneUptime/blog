# Validation Summary: How to Fix ArgoCD Slow UI Loading

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- Redis
- ingress-nginx
- Prometheus metrics and alerting
- Argo CD CLI

## Sources Consulted
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD resource exclusion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD CLI `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD CLI `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD FAQ for Redis authentication: https://argo-cd.readthedocs.io/en/latest/faq/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/

## Issues Found
- The Redis inspection commands did not authenticate against Redis. Current Argo CD installs store the Redis password in the `argocd-redis` Secret, so I updated the commands to read that Secret and pass it via `REDISCLI_AUTH`.
- The Redis cache description was too specific about sessions and diffs. I changed it to the documented disposable cache role for application state, repo state, and other computed data.
- The server-side diff configuration used the wrong key, `server.diff.server.side`, and described diffing as client-side UI work. I changed it to the documented controller-level key, `controller.diff.server.side`, and corrected the explanation to Kubernetes server-side apply dry-run.
- The ingress-nginx HTTP/2 example used `nginx.ingress.kubernetes.io/use-http2` as an Ingress annotation. ingress-nginx documents `use-http2` as a controller ConfigMap setting, so I updated the snippet accordingly.
- The API server metrics check grepped for `argocd_app_reconcile`, which is an application controller metric, not an API server metric. I changed the example to use `grpc_server_handled_total`.
- The metrics list did not mention that `grpc_server_handling_seconds` requires `ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true`, and it listed `argocd_app_info` without noting that it is exposed by the application controller on port 8082. I added those caveats.
- The Deployment YAML blocks were partial snippets but looked like standalone Kubernetes manifests. I marked them as Deployment excerpts to avoid implying they can be applied as complete `apps/v1` Deployments.

## Review Notes
The post is technically relevant and now aligns with current Argo CD and ingress-nginx documentation. Some recommendations, such as excluding additional resource kinds, should still be applied carefully because `resource.exclusions` makes Argo CD unaware of matching resources for discovery and sync, not only the UI tree.
