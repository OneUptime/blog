# Validation Summary: How to Use External Secrets with ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- External Secrets Operator
- AWS Secrets Manager
- HashiCorp Vault
- Kustomize
- Helm
- kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD ApplicationSet generators documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Matrix generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet Cluster generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD diffing customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD 2.2 to 2.3 upgrade notes: https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/upgrading/2.2-2.3/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator v0.17.0 release notes: https://newreleases.io/project/github/external-secrets/external-secrets/release/v0.17.0

## Issues Found
- Updated External Secrets Operator manifests from `external-secrets.io/v1beta1` to `external-secrets.io/v1`. Current ESO documentation uses `v1`, and ESO v0.17.0 stopped serving `v1beta1`.
- Corrected the Vault `remoteRef.key` examples from `secret/data/...` to paths relative to the configured Vault KV mount, such as `production/services/service-a/database-url`. ESO's Vault provider examples configure `path: "secret"` on the store and then use keys like `foo`, not the raw Vault API path.
- Updated ApplicationSet examples to use `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and Go template parameter syntax. The Git generator path fields now use `{{index .path.segments 1}}`, `{{index .path.segments 3}}`, and `{{.path.path}}` as shown in current Argo CD documentation.
- Clarified that the base ExternalSecret uses placeholder values patched by Kustomize overlays, not Kustomize variables.
- Added missing `base/kustomization.yaml` entries to the repository structure so the overlay `resources: ../../base` examples point to a valid Kustomize base.
- Clarified the Argo CD diffing section: ESO-generated Secrets are normally not desired-state resources tracked from Git unless the app or chart also renders a Secret manifest.
- Removed an inaccurate Secret label ignore path from the `ignoreDifferences` example. The broad annotation ignore covers ESO-generated annotations in the scenario described.

## Review Notes
The examples are still illustrative and assume clusters are registered in Argo CD with matching environment labels, and that the named `AppProject` resources exist. The Helm template also assumes `externalSecret.keys` is supplied by chart values.
