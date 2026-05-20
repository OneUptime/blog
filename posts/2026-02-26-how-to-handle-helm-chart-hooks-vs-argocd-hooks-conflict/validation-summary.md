# Validation Summary: How to Handle Helm Chart Hooks vs ArgoCD Hooks Conflict

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes Jobs
- Kustomize
- GitOps

## Sources Consulted
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_hooks/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD diffing customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD resource exclusion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#resource-exclusioninclusion
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Helm template command documentation: https://helm.sh/docs/helm/helm_template/
- Kustomize patches documentation: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/

## Issues Found
- The post incorrectly stated that Argo CD applies Helm hook resources as ordinary resources. Argo CD documentation says it maps many supported Helm hook annotations to Argo CD hook annotations, so the explanation was updated to reflect that behavior.
- The conflict list incorrectly said Helm hook delete policies do not work under Argo CD. Argo CD supports mapped hook delete policies, so this was changed to clarify that deletion is handled by Argo CD's hook lifecycle.
- The Argo CD hook phase list omitted PreDelete. The list was updated to include PreDelete.
- The Helm-to-Argo CD mapping table mapped `pre-delete` to PreSync. Argo CD documents `pre-delete` as mapping to PreDelete, so the table was corrected.
- The post described a general `--no-hooks` Helm source configuration for Argo CD. Argo CD does not provide a universal Helm source `--no-hooks` option for all hook resources, so that section was rewritten to recommend chart-provided hook toggles when available.
- The resource exclusion example implied annotation-specific exclusion for Helm hook Jobs. Argo CD resource exclusions are broad by group/kind/cluster, so the note was corrected to state that the example excludes all batch Jobs.
- The post-renderer `sed` example matched single hook values before combined hook values, which would corrupt strings such as `pre-install,pre-upgrade`. The combined patterns were moved before the single-value patterns.
- The `ignoreDifferences` section implied it could manage hook resource lifecycle drift. It was corrected to say it can help with immutable or mutated Job fields but does not replace hook lifecycle management.

## Review Notes
The corrected guidance assumes current Argo CD behavior documented in the latest official documentation. The post still uses "ArgoCD" without a space, which is common in community writing but differs from the project's "Argo CD" spelling; this was left unchanged because it is stylistic rather than technical.
