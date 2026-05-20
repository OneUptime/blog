# Validation Summary: How to Configure System-Level Diff Defaults in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Helm
- Kustomize
- YAML configuration
- JSON Pointer
- JQ path expressions

## Sources Consulted
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/sync-options/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo CD `ResourceOverride` API source: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go

## Issues Found
- The post configured global server-side diff with `server.diff.serverSideDiff` in `argocd-cm`. Current Argo CD documentation uses `controller.diff.server.side: "true"` in `argocd-cmd-params-cm`, followed by an `argocd-application-controller` restart. Updated the global server-side diff examples, Helm values example, and testing instructions accordingly.
- The post claimed system-level sync options can be configured with `resource.customizations.syncOptions.<group>_<kind>`. Argo CD's documented sync options are configured at the Application level or by the `argocd.argoproj.io/sync-options` resource annotation, and the `ResourceOverride` API does not include a `syncOptions` field. Replaced that section with valid Application-level and per-resource sync option examples.
- The Kustomize example included the invalid server-side diff key in the `argocd-cm` patch. Removed that key so the patch only contains valid `argocd-cm` resource customization data.

## Review Notes
The system-level `ignoreDifferences` key format, `all` customization, JSON Pointer escaping, JQ path expressions, `managedFieldsManagers`, and `argocd app get --hard-refresh` usage matched official Argo CD documentation. The post does not pin an Argo CD version, so the fixes target current stable documentation as of 2026-05-20.
