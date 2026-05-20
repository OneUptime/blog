# Validation Summary: How Platform Teams Should Structure ArgoCD for Developers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Argo CD AppProjects
- Argo CD RBAC
- Argo CD ApplicationSets
- Argo CD Notifications
- Kubernetes namespaces
- Kubernetes ResourceQuota
- Kubernetes NetworkPolicy
- Helm chart values
- Kustomize repository layout

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD CLI command reference for app sync: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes API reference for NetworkPolicy semantics: https://pkg.go.dev/k8s.io/KUBERNETES/staging/src/k8s.io/api/networking/v1

## Issues Found
- The production sync window used `schedule: "0 9-17 * * 1-5"` with `duration: 8h`, which would start a new 8-hour window every hour from 09:00 through 17:00 instead of representing one business-hours window. Changed it to `schedule: "0 9 * * 1-5"` with the same `8h` duration.
- The ApplicationSet example used legacy `{{path[1]}}` and `{{path[3]}}` path segment interpolation. Updated the example to enable Go templates and use `{{index .path.segments n}}`, matching current Argo CD ApplicationSet documentation.
- The NetworkPolicy ingress example selected the ingress namespace with a custom `name: ingress-nginx` label. Updated it to use the Kubernetes-standard immutable namespace label `kubernetes.io/metadata.name: ingress-nginx`.
- The NetworkPolicy DNS egress rule used `to: []`, which means all destinations, while the comment said it allowed DNS. Updated the rule to target CoreDNS in the `kube-system` namespace and added TCP 53 alongside UDP 53.

## Review Notes
- The remaining examples are intentionally illustrative and assume conventional cluster labels such as `k8s-app: kube-dns` for CoreDNS. Some managed Kubernetes environments may use different DNS pod labels, so platform teams should align that selector with their cluster.
- `policy.default: role:readonly` grants every authenticated user the built-in read-only role. This matches the article's visibility goal, but production installations that need stricter defaults may prefer a narrower custom authenticated role.
