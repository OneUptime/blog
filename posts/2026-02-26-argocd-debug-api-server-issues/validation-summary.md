# Validation Summary: How to Debug ArgoCD API Server Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD API server
- Kubernetes
- kubectl
- Argo CD CLI
- Redis
- Dex / SSO
- Prometheus metrics
- TLS certificates
- Webhooks

## Sources Consulted
- Argo CD `argocd-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD webhook documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD ingress documentation for `--insecure` / `server.insecure`: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD official stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl set resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes logging documentation for `kubectl logs --previous`: https://kubernetes.io/docs/concepts/cluster-administration/logging/

## Issues Found
- The JSON Patch examples used `replace` against nested resource paths that might not exist on a Deployment. Replaced those examples with `kubectl set resources`, which is the supported kubectl command for setting container resource requests and limits on pod-template resources.
- The insecure-mode check only inspected the container `command` field. The official manifests use container `args`, and Argo CD also supports `server.insecure` in `argocd-cmd-params-cm`. Updated the checks to inspect the ConfigMap value and explicit args.
- The webhook configuration and secret inspection commands piped `jsonpath='{.data}'` into `json.load`, but kubectl JSONPath prints map string output rather than JSON for that expression. Updated both commands to use `-o json` and read the `data` object in Python.
- The health check commands used HTTPS for the in-pod `/healthz` endpoint and labeled `/healthz?full=true` as readiness. The official deployment probes use HTTP on port 8080, with `/healthz` for readiness and `/healthz?full=true` for liveness/full health. Updated the protocol and comments.

## Review Notes
- The RBAC examples are syntactically consistent with Argo CD's documented policy format and `argocd admin settings rbac can` command.
- The metrics endpoint and key metric names match the Argo CD API server metrics documentation. In current Argo CD docs, gRPC timing histograms require `ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true`.
- Some diagnostic commands depend on utilities being present in the container image, such as `ss`, `netstat`, `curl`, or `redis-cli`; the post already treats some of those checks as best-effort.
