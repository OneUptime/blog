# Validation Summary: How to Debug Cluster Connection Issues in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Kubernetes ServiceAccounts and RBAC
- Kubernetes Secrets
- TLS certificates
- NetworkPolicy troubleshooting

## Sources Consulted
- Argo CD command reference for `argocd cluster`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster/
- Argo CD command reference for `argocd cluster get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/
- Argo CD declarative setup documentation for cluster Secret structure: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD metrics documentation for cluster connection status: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD upgrade notes confirming `argocd-application-controller` is a StatefulSet in standard installs since v1.8: https://argo-cd.readthedocs.io/en/release-1.8/operator-manual/upgrading/1.7-1.8/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes `kubectl create token` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found
- The post used `kubectl logs deployment/argocd-application-controller` and `kubectl rollout restart deployment/argocd-application-controller`. In standard Argo CD installs the application controller has been a StatefulSet since Argo CD v1.8, so these commands were changed to use `statefulset/argocd-application-controller`.
- The debug pod was described as using the same network context but did not set labels matching the controller. Because NetworkPolicies select pods by labels, the command now adds the common Argo CD application-controller label and the wording was narrowed to "similar labels and service account."
- The `kubectl create token --duration=8760h` example implied the token would always last one year. Kubernetes supports the flag, but the API server can cap token expiration, so the comment now says it requests one year and may be capped.
- The post said `argocd cluster get` could force a refresh. Official Argo CD documentation describes it as a command to get cluster information, so the text now presents it as a verification step.
- The flow diagram said "ping API server" although the guide uses TCP and HTTPS checks, not ICMP ping. The wording was changed to "reach API server."
- The preventive measure recommended "long-lived authentication." Kubernetes documentation recommends avoiding long-lived ServiceAccount tokens where possible, so the recommendation was changed to managed/cloud IAM-based authentication over static tokens.

## Review Notes
The remaining examples are technically plausible for current Argo CD and Kubernetes workflows. The RBAC example intentionally grants broad cluster-admin-like permissions, which matches common Argo CD manager setup patterns but should be narrowed in security-sensitive environments.
