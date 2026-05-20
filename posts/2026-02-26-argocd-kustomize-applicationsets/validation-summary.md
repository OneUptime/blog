# Validation Summary: How to Use Kustomize with ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Kubernetes
- Kustomize
- GitOps
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD Cluster Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD Matrix Generator documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet Templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD ApplicationSet command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_appset_get/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD v2.8.0 release notes for generated ApplicationSet label support: https://newreleases.io/project/github/argoproj/argo-cd/release/v2.8.0

## Issues Found
- The Multi-Application Discovery section said it discovered applications across all environments, but the generator only matched production overlays. Changed the text to "Discover all production applications."
- The deprecated-app exclude pattern was `apps/deprecated-*`, which does not match the included generated paths under `apps/*/overlays/production`. Changed it to `apps/deprecated-*/overlays/production`.
- Cluster-generated Application names used `{{name}}`, which can produce invalid Kubernetes object names if a cluster name contains unsupported characters. Changed object-name-sensitive uses to `{{nameNormalized}}`, while leaving label/annotation values as `{{name}}`.
- The sync policy section claimed `syncPolicy` could not be conditionally set in templates. Current Argo CD supports this with `goTemplate: true` and `templatePatch`, so the example and explanation were corrected.
- The command for listing generated Applications used `app.kubernetes.io/instance`, which is Argo CD's default resource tracking label rather than the ApplicationSet-generated Application label. Updated it to use `kubectl get applications -n argocd -l argocd.argoproj.io/application-set-name=...`.

## Review Notes
The post uses the default ApplicationSet fasttemplate syntax in most examples. This is still documented, but Argo CD documentation notes that fasttemplate will be deprecated in favor of Go Template, so future revisions should consider migrating all examples to `goTemplate: true`.
