# Validation Summary: How to Profile ArgoCD Performance Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Prometheus metrics
- Go pprof
- Bash
- jq

## Sources Consulted
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The post said Argo CD components expose pprof on port 6060 by default. Current Argo CD documents profiling as a profile endpoint on each component's internal metrics port, controlled by `controller.profile.enabled`, `server.profile.enabled`, `reposerver.profile.enabled`, and related settings. I changed the pprof examples to enable the profile endpoint in `argocd-cmd-params-cm` and use the controller metrics port `8082` and repo server metrics port `8084`.
- The high-memory pprof command used `localhost:6060`. I updated it to use the controller metrics port `8082`, consistent with the corrected pprof setup.
- The Git bottleneck fix used `timeout.reconciliation` in `argocd-cm`, which controls application reconciliation timing rather than repo server Git request behavior. I replaced it with `reposerver.repo.cache.expiration` and `reposerver.git.request.timeout` in `argocd-cmd-params-cm`, followed by a repo server rollout restart.
- The slow reconciliation example claimed to find the slowest applications by sorting a fixed histogram bucket. I changed it to sort `argocd_app_reconcile_sum`, which accurately identifies applications with the highest total reconciliation time from the exposed histogram series.
- The Kubernetes API metric examples described `argocd_kubectl_exec` as K8s API call metrics. Argo CD exposes request count and latency through `argocd_kubectl_request*` metrics, so I updated those examples to use `argocd_kubectl_request`.

## Review Notes
The scale-based resource sizing table is reasonable as operational guidance, but it is not an official Argo CD sizing matrix and should be treated as a starting point rather than a guaranteed recommendation. The API server gRPC duration metric requires gRPC time histograms to be enabled, as noted in current Argo CD metrics documentation.
