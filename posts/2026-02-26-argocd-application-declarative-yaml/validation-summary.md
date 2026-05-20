# Validation Summary: How to Create an ArgoCD Application Declaratively with YAML

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Applications
- Argo CD sync policies and sync options
- Kubernetes custom resources
- YAML manifests
- Helm sources in Argo CD
- Kustomize sources in Argo CD
- Argo CD multi-source Applications
- Argo CD App of Apps pattern

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD Application pruning and resource deletion: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The Application CRD section described the example as "the full structure", but the official Application spec has many additional optional fields. Changed this to "a common structure" to avoid overstating the example.
- The Helm chart repository example labeled `source.helm.values` as "Values files from the chart". In Argo CD, `values` is inline Helm values content, while `valueFiles` is used for values files. Updated the comment to "Inline Helm values".
- The sync policy example described `allowEmpty` as "Only sync when there is a difference". In Argo CD, `allowEmpty` allows automated pruning when the desired manifest set is empty. Updated the comment to match the official automated sync behavior.
- The ignore differences example described `managedFieldsManagers` as ignoring metadata annotations matching a pattern. In Argo CD, this ignores fields owned by specified Kubernetes managedFields managers. Updated the comment accordingly.

## Review Notes
The examples use valid `argoproj.io/v1alpha1` Application manifests and current Argo CD fields, including `sources` for multi-source Applications, Helm `valueFiles`, Kustomize overrides, sync options, retry backoff, finalizers, and ignore-difference rules. The post mentions multi-source Applications as available since Argo CD 2.6, which matches the official Helm and multiple-source documentation.
