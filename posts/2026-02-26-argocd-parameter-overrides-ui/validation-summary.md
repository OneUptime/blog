# Validation Summary: How to Use Parameter Overrides from the ArgoCD UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Kustomize
- Argo CD Application specifications

## Sources Consulted
- Argo CD Parameter Overrides documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/parameters/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/helm/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD Multiple Sources documentation for v2.6: https://argo-cd.readthedocs.io/en/release-2.6/user-guide/multiple_sources/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/

## Issues Found
- The Helm section incorrectly stated that the Parameters section displays all configurable values from the chart. Argo CD's Helm documentation notes that the UI only shows parameters and does not represent the complete merged values when `valueFiles`, `values`, or `valuesObject` are used. Updated the text to clarify that the UI shows Helm parameters Argo CD knows about and `--set` style overrides, not necessarily every merged value.
- The post stated that every parameter change immediately makes an application OutOfSync. This is only true when the override changes the rendered manifests. Updated the Helm override and override removal text to include that condition.
- The Kustomize settings list was narrower than the supported Application spec fields. Added documented examples for replica overrides and common labels/annotations while keeping the existing section structure.
- The multi-source section stated that the UI shows parameters for each source separately. Official Argo CD 2.6 documentation described multiple sources as beta and noted limited UI/CLI support at that time. Updated the wording to focus on source-level configuration under `spec.sources` and removed the overly broad UI claim.

## Review Notes
The YAML example is valid for the Argo CD Application source Helm fields shown. Some UI labels and control placement can vary between Argo CD releases, so the review focused on documented behavior and Application spec correctness rather than exact UI chrome.
