# Validation Summary: Understanding ArgoCD application.yaml: Every Field Explained

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Argo CD
- Kubernetes custom resources
- GitOps
- YAML
- Helm
- Kustomize
- Jsonnet

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Applications in any namespace: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/app-any-namespace/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Application CRD schema from the official repository: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/crds/application-crd.yaml
- Bitnami Helm chart index: https://charts.bitnami.com/bitnami/index.yaml

## Issues Found
- The post claimed to explain every Application YAML field and showed a structure with every field populated. The current Argo CD Application spec contains additional fields not covered by the article, so the title, description, introduction, and structure wording were changed to describe key/common fields instead.
- The introduction said the Application spec controls health checks. Application resources can configure sync, source, destination, diff, and retry behavior, but health customization is not an Application spec field. This was changed to diff handling.
- Several YAML snippets used duplicate keys to show alternatives, such as multiple `repoURL`, `targetRevision`, `path`, and `server` entries in the same mapping. These were changed to commented alternatives so the examples remain valid YAML.
- The annotation example used `argocd.argoproj.io/managed-by` as a custom annotation. Because the `argocd.argoproj.io` prefix is used by Argo CD annotations, this was changed to `example.com/managed-by`.
- The Helm `valuesObject` comment incorrectly described it as values from external ConfigMaps/Secrets. Argo CD documents `valuesObject` as structured inline Helm values, so the comment was corrected.
- Helm examples referenced the deprecated `https://charts.helm.sh/stable` repository and old chart names. They were updated to current Bitnami chart repository examples with chart versions verified from the Bitnami Helm index on 2026-05-20.

## Review Notes
The post is now technically valid as a reference to key Argo CD Application fields. It is not exhaustive for the latest Application CRD; future updates could add newer fields such as `sourceHydrator`, `managedNamespaceMetadata`, Helm schema/test options, and additional Kustomize fields if the article should become a complete spec reference.
