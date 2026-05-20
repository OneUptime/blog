# Validation Summary: How to Use Custom Labels for ArgoCD Application Filtering

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD CLI
- Argo CD ApplicationSet
- Argo CD RBAC
- Argo CD Notifications
- Kubernetes labels and selectors
- kubectl
- OPA Gatekeeper
- jq

## Sources Consulted
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD UI application filter source: https://github.com/argoproj/argo-cd/blob/master/ui/src/app/applications/components/applications-list/applications-filter.tsx
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Gatekeeper required labels library documentation: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredlabels/

## Issues Found
- The label naming section said all label keys must be 63 characters or fewer. Kubernetes limits the label key name segment to 63 characters, but an optional DNS subdomain prefix can be up to 253 characters. Updated the wording to distinguish key name segments from prefixes.
- The post initially claimed labels can be used to implement RBAC policies and said labels could be referenced in RBAC policies. Argo CD RBAC uses project/application object patterns, not label selectors. Updated the RBAC section to describe AppProjects for authorization and labels for discoverability.
- The Notifications section implied that the shown per-Application annotation subscribed "based on labels/team." Argo CD uses annotations for per-Application subscriptions, while centrally managed notification subscriptions can use a `selector`. Updated the text and comment to reflect that distinction.

## Review Notes
The CLI selector examples, `argocd app list` output flags, ApplicationSet Git file generator templating, `kubectl` label queries, and Gatekeeper required-labels example are consistent with the consulted documentation. The post does not pin an Argo CD version; the review used current stable Argo CD documentation as of 2026-05-20.
