# Validation Summary: Flux CD vs ArgoCD: Helm Support Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Flux Source Controller
- Argo CD
- Helm
- Kubernetes
- OCI registries
- Kustomize post-renderers

## Sources Consulted
- Flux Helm Controller documentation: https://fluxcd.io/docs/components/helm/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/

## Issues Found
- The Argo CD architecture section said Argo CD applies Helm output with `kubectl`. Argo CD documentation describes Helm as being used only for `helm template`, with application lifecycle handled by Argo CD. Updated the wording to say Argo CD applies output through its normal sync engine.
- The feature table understated Argo CD's Helm hook support as only `PreSync`/`PostSync`. Argo CD maps many Helm hooks to Argo CD hooks, while Helm test and rollback hooks are unsupported. Updated the table and hook section accordingly.
- The feature table omitted Flux's `Skip` CRD policy and Argo CD's `skipCrds` option. Updated the CRD row to reflect current configuration options.
- The Flux `valuesFrom` example used `targetPath` with a YAML values key, which is misleading because `targetPath` is intended for targeting a specific value path. Updated the example to use a scalar `password` value key and a scalar target path.
- The Argo CD values section said values files must be from the same repository. Argo CD v2.6+ supports values files from separate repositories through multiple sources. Updated the text.
- The Flux rollback comments described `remediateLastFailure` and `rollback.cleanupOnFail` too broadly. Updated the comments to match the documented remediation and rollback field behavior.
- The Flux OCI example used `HelmRepository` with `type: oci`. That API remains supported, but official Flux docs now describe it as maintenance mode and recommend `OCIRepository` for improved OCI Helm chart support. Updated the example to use `OCIRepository` with `chartRef`.
- The post described Flux rollback as automatic without emphasizing configuration. Updated the comparison and conclusion to describe configurable automatic remediation/rollback.

## Review Notes
The YAML snippets were parsed successfully after the edits. The Argo CD CLI commands were checked against the official command reference, but not executed locally because the `argocd` CLI is not installed in this workspace.
