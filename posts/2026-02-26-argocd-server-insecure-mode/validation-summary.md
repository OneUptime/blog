# Validation Summary: How to Configure ArgoCD Server as Insecure for Development

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- kubectl
- Argo CD CLI
- Kubernetes NetworkPolicy
- Minikube
- kind

## Sources Consulted
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD ingress configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD getting started guide: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD argocd login command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD Helm chart documentation: https://artifacthub.io/packages/helm/argo/argo-cd
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

## Issues Found
- The post said insecure mode changes the server from port 8443 to port 8080. Current Argo CD uses port 8080 by default; insecure mode changes the protocol served on that port from HTTPS to HTTP. Updated the wording accordingly.
- The post said the default service maps only port 80 to target port 8080. The stable Argo CD install manifest maps both service port 80 and service port 443 to target port 8080. Updated the service-port explanation.
- The HTTPS verification command checked `https://localhost:8443/healthz`, but the default Argo CD server does not listen on 8443. Updated it to check HTTPS against port 8080, where it should fail because the server is serving plain HTTP.
- The local CLI login example used `--insecure`, which only skips certificate and domain verification. For a TLS-disabled Argo CD server, the CLI should use `--plaintext`. Updated the command.

## Review Notes
The remaining examples align with current Argo CD documentation for `--insecure`, `server.insecure: "true"` in `argocd-cmd-params-cm`, Helm `configs.params.server.insecure`, TLS termination at ingress, and Kubernetes NetworkPolicy namespace selection. The local `kubectl`, `helm`, and `kind` binaries were not available in this workspace, so CLI syntax was verified against official command references and current upstream manifests instead of local `--help` output.
