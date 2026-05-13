# Validation Summary: How to Deploy Mattermost Chat with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Mattermost Team Edition
- Mattermost Helm charts
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes Secrets, Ingress, persistent volumes, and pod selection
- Bitnami PostgreSQL Helm chart
- mmctl

## Sources Consulted
- Mattermost Helm chart repository and chart index: https://github.com/mattermost/mattermost-helm and https://helm.mattermost.com/index.yaml
- Mattermost Team Edition Helm chart README and values for chart 6.6.96: https://github.com/mattermost/mattermost-helm/releases/download/mattermost-team-edition-6.6.96/mattermost-team-edition-6.6.96.tgz
- Mattermost environment configuration settings: https://docs.mattermost.com/administration-guide/configure/environment-configuration-settings.html
- Mattermost mmctl documentation: https://docs.mattermost.com/administration-guide/manage/mmctl-command-line-tool.html
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease v2 API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl create secret reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/#secret-generic
- Bitnami PostgreSQL Helm chart documentation and values: https://artifacthub.io/packages/helm/bitnami/postgresql and https://github.com/bitnami/charts/tree/main/bitnami/postgresql

## Issues Found
- The Bitnami Helm repository was referenced by the PostgreSQL HelmRelease but never declared. Added a Bitnami OCI HelmRepository in the repository registration step.
- The PostgreSQL chart version range `>=13.0.0 <14.0.0` is outdated for the current Bitnami repository. Updated it to `>=18.0.0 <19.0.0`.
- The PostgreSQL existing Secret example did not need the Mattermost datasource key, and the Bitnami chart needs only the configured user password key when the postgres admin user is disabled. Removed `MM_SQLSETTINGS_DATASOURCE` from the Secret and added `auth.enablePostgresUser: false`.
- The Mattermost Team Edition chart does not support `externalDB.existingDatabaseUrlSecret` or `externalDB.existingDatabaseUrlSecretKey`. Replaced them with the chart-supported `externalDriverType` and `externalConnectionString` fields.
- The Mattermost Team Edition chart uses `config`, not `mattermostEnvs`, for Mattermost environment-style settings. Updated the values block and related best-practice text.
- `mmctl --local` requires local mode to be enabled. Added `MM_SERVICESETTINGS_ENABLELOCALMODE: "true"` to the Mattermost config.
- The ingress values used keys from a different chart shape (`ingressClassName`, nested `hosts[].paths`). Updated them to the Mattermost chart's `className`, top-level `path`, and string host list.
- The admin creation command used an incorrect pod label selector. Updated it to the labels emitted by the Mattermost Team Edition chart.
- The best-practice note referenced `podAnnotations`, which is not a supported key in this chart. Updated it to `extraPodAnnotations`.
- Added a note that Mattermost recommends the Mattermost Operator for new production deployments because the Team Edition chart README marks the chart as no longer supported.

## Review Notes
The guide is now technically consistent with the current Mattermost Team Edition Helm chart, Flux v2 APIs, and current Bitnami PostgreSQL chart publishing. For a stronger production guide, future revisions should avoid committing database credentials in Helm values and use a GitOps secret workflow such as SOPS or External Secrets.
