# Validation Summary: How to Fix 'already exists' Error When Creating Applications in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD sync options
- Argo CD resource tracking
- Kubernetes manifests and kubectl
- Helm

## Sources Consulted
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD app deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/resource_tracking/
- Argo CD `argocd-cm` configuration reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/applicationset/Generators-Git/
- Argo CD `argocd appset get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_get
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD declarative setup documentation for Helm Applications: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/

## Issues Found
- The shared-resource fix described `FailOnSharedResource` but the YAML used `RespectIgnoreDifferences=true`, which is unrelated to shared-resource detection. Changed the snippet to `FailOnSharedResource=true` and updated the surrounding sentence/comment to match Argo CD's documented behavior.
- The Helm section implied Argo CD manages Helm release lifecycle and that the release object itself is the conflict. Argo CD uses Helm to render manifests with `helm template`; conflicts are with rendered Kubernetes resources. Updated the wording while keeping the existing troubleshooting flow.

## Review Notes
The post does not pin an Argo CD version. The reviewed commands and configuration fields are valid in current Argo CD documentation as of 2026-05-20, but users should still check version-specific docs for older installations.
