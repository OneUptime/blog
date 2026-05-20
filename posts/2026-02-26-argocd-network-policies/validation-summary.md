# Validation Summary: How to Configure ArgoCD with Network Policies in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- Dex
- Redis
- Git and Helm repository access

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD Ingress Configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD Getting Started documentation: https://argo-cd.readthedocs.io/en/release-3.4/getting_started/
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD argocd app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/

## Issues Found
- Added the Kubernetes NetworkPolicy enforcement caveat. Kubernetes NetworkPolicy resources only affect traffic when the cluster CNI plugin implements NetworkPolicy enforcement.
- Corrected the ingress traffic description from a raw 8080 ingress path to the standard Argo CD service ports 80/443 targeting the server pod on 8080.
- Removed port 8443 from the Argo CD server NetworkPolicy. The standard Argo CD server container exposes 8080 for API/UI traffic and 8083 for metrics, not 8443.
- Removed the Dex-to-Argo CD server "SSO callback" pod traffic rule. In the standard Argo CD/Dex flow, the Argo CD server talks to Dex on 5556/5557; browser redirects handle the callback through the externally exposed Argo CD server URL.
- Added repo-server-to-Redis traffic and allowed Redis ingress from the repo server, matching current upstream Argo CD manifests.
- Corrected the port-forward test command to use service port 443 with HTTPS and `curl -k`, which matches Argo CD's documented default port-forwarding path.

## Review Notes
The policies remain intentionally broad for Kubernetes API, Git, Helm, and identity-provider egress by using `0.0.0.0/0` with constrained ports. In production, these should be narrowed to known API server, repository, and identity-provider destinations where the cluster and CNI support that reliably. Current Argo CD installations can also include ApplicationSet and Notifications controllers; those components may require additional NetworkPolicies if they are enabled and included in the same default-deny namespace.
