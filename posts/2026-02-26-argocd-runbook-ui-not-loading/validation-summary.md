# Validation Summary: ArgoCD Runbook: UI Not Loading

## Status
validated

## Post Type
Runbook / Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- NGINX Ingress / ingress-nginx
- TLS certificates
- Dex
- Redis
- OpenSSL

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD admin initial-password command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_initial-password/
- Argo CD Getting Started guide: https://argo-cd.readthedocs.io/en/release-3.1/getting_started/
- Argo CD stable installation manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- OpenSSL s_client documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL x509 documentation: https://docs.openssl.org/4.0/man1/openssl-x509/

## Issues Found
- The NGINX Ingress example used `nginx.ingress.kubernetes.io/websocket-services`, which is not in the current community ingress-nginx annotation reference. Removed it and kept the documented timeout annotations plus `backend-protocol`.
- The WebSocket resolution text implied that current NGINX Ingress needs a specific WebSocket enablement annotation. Updated the wording to focus on long-lived connection timeouts, which matches the documented ingress-nginx controls.
- The runbook advised restarting the ingress-nginx controller to force reload after applying an Ingress change. Replaced this with `kubectl describe ingress` because ingress-nginx watches Kubernetes resources and a controller restart is not required for a normal Ingress update.
- The health check command executed `curl` inside the Argo CD server container. Current upstream manifests do not guarantee `curl` is available in that container, so this was changed to inspect the readiness probe path instead.
- The Dex workaround used the initial admin secret inline as an `argocd login --password` value. Updated it to use the documented `argocd admin initial-password -n argocd` command, followed by interactive admin login.
- The Redis check used an unauthenticated `redis-cli ping`. Current Argo CD stable manifests configure Redis with `--requirepass $(REDIS_PASSWORD)`, so the command now sets `REDISCLI_AUTH="$REDIS_PASSWORD"` before running `redis-cli ping`.

## Review Notes
- The post remains technically relevant and useful as an operational runbook.
- The post uses "ArgoCD" throughout, while upstream documentation styles the project name as "Argo CD"; this is a naming/style issue, not a technical correctness problem.
- The local environment did not have `kubectl` or `argocd` installed, so CLI behavior was validated against official command references and upstream manifests rather than local help output.
