# Validation Summary: How to Use Helm Release Name in ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD Applications and ApplicationSets
- Helm
- Kubernetes manifests and labels
- GitOps deployment workflows

## Sources Consulted
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/helm/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Helm built-in objects documentation: https://helm.sh/docs/chart_template_guide/builtin_objects/
- Helm Go package documentation for release name validation: https://pkg.go.dev/helm.sh/helm/v3/pkg/chartutil#ValidateReleaseName

## Issues Found
- The post incorrectly said ArgoCD creates and manages a Helm release with Helm history. Updated the introduction and "Why the Release Name Matters" section to state that ArgoCD renders charts with `helm template` and manages the lifecycle itself.
- The Helm history examples used `helm list` and `helm history`, which do not apply to ArgoCD-managed Helm applications. Replaced them with a `helm template` example showing how the release name affects rendered manifests.
- The labels section omitted ArgoCD's default `app.kubernetes.io/instance` tracking behavior. Added the official caveat that overriding the Helm release name can break charts that use that label in selectors unless ArgoCD is configured to use another tracking label.
- The "Changing the Release Name" section described deleting and recreating the app plus `helm uninstall`. Replaced it with `argocd app set --release-name`, `argocd app sync`, and a cleanup check because there is no Helm release metadata for ArgoCD to uninstall.
- The "Viewing the Current Release Name" section suggested `helm list`; replaced it with `argocd app manifests`, which is the ArgoCD command for inspecting generated manifests.
- The release name constraints stated that Helm release names can only contain letters, numbers, and hyphens. Updated this to include periods, matching Helm's documented validation regex, and added the practical caveat that periods should be avoided when the release name is used in Kubernetes resource names.
- The summary repeated the inaccurate Helm history/orphaned release framing. Updated it to describe rendered resource changes and pruning behavior.

## Review Notes
The declarative `spec.source.helm.releaseName` examples, `argocd app create --release-name`, multi-source placement, and Helm `.Release.Name` usage were verified as technically correct. The examples assume the default ApplicationSet template behavior where list generator values can be referenced with `{{env}}` and `{{release}}`.
