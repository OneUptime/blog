# Validation Summary: How to Use the ArgoCD Application Manifest Reference

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Argo CD Application custom resources
- Kubernetes manifests
- GitOps
- Helm sources and values
- Kustomize sources
- Argo CD config management plugins
- Argo CD sync policies, sync options, and diff customization

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Helm guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Kustomize guide: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/kustomize/
- Argo CD Application CRD: https://raw.githubusercontent.com/argoproj/argo-cd/master/manifests/crds/application-crd.yaml

## Issues Found
- The Kustomize example said `version` is the Kustomize version to use without noting that Argo CD requires that version to be configured in `argocd-cm`. Updated the inline comment to include that requirement.
- The multi-source note described `source` and `sources` as mutually exclusive. Argo CD documentation states that when `sources` is specified, Argo CD ignores the singular `source` field. Updated the wording to match the documented behavior.

## Review Notes
The remaining Application manifest fields, Helm source options, multi-source value-file reference pattern, destination fields, sync options, retry fields, `managedNamespaceMetadata`, `ignoreDifferences`, `info`, and `revisionHistoryLimit` examples were checked against the official Argo CD documentation and current CRD schema. The post intentionally covers common fields rather than every edge-case field in the CRD.
