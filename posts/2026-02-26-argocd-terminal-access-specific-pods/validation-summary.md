# Validation Summary: How to Configure Terminal Access for Specific Pods in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD web-based terminal
- Argo CD RBAC
- Argo CD AppProject destination restrictions
- Kubernetes RBAC
- Kubernetes admission webhooks
- OPA Gatekeeper

## Sources Consulted
- Argo CD Web-based Terminal documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/web_based_terminal/
- Argo CD RBAC Configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD AppProject specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes admission API reference: https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1/
- OPA Gatekeeper usage documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/

## Issues Found
- The access model claimed both Argo CD RBAC and Kubernetes RBAC must always permit `pods/exec`. Updated this to reflect current Argo CD documentation: Argo CD web terminal must be enabled with `exec.enabled`, Argo CD RBAC must allow `exec/create`, and Kubernetes `pods/exec` create permission is specifically needed for Kubernetes versions before 1.31.
- The post did not mention that the web terminal is disabled by default. Added the required `exec.enabled: "true"` note.
- The Kubernetes RBAC section implied that adding a namespace RoleBinding alone guarantees namespace-only exec access. Added the required caveat that this is true only if the `argocd-server` ServiceAccount does not also have broader `pods/exec` permissions.
- The post described creating a dedicated ServiceAccount but used the existing `argocd-server` ServiceAccount in the manifest. Corrected the prose to match the manifest.
- The testing section used `argocd app exec`, which is not present in the current official Argo CD CLI command reference. Replaced it with UI-based terminal testing guidance.
- The `argocd admin settings rbac can` examples used the wrong argument order. Corrected them to `ROLE/SUBJECT ACTION RESOURCE [SUB-RESOURCE]`.
- The glob matching explanation omitted Argo CD's important matching caveat that `/` is not treated as a separator. Added that clarification.
- The Gatekeeper example used `subresource`; Kubernetes AdmissionReview uses `subResource`. Corrected the field name and made container extraction safer.

## Review Notes
The post is technically valid after corrections. Argo CD RBAC scopes terminal access to applications and projects, not individual pod names directly; pod-level or container-level controls require Kubernetes RBAC or admission control and should be treated as defense-in-depth.
