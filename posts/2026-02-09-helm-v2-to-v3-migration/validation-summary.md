# Validation Summary: How to Migrate from Helm v2 Tiller-Based Releases to Helm v3

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Helm 2
- Helm 3
- Helm 2to3 plugin
- Kubernetes
- Kubernetes RBAC
- Helm charts and Chart.yaml
- GitLab CI
- kubectl

## Sources Consulted
- Helm documentation: Migrating Helm v2 to v3: https://helm.sh/docs/v3/topics/v2_v3_migration/
- Helm 2to3 plugin README: https://github.com/helm/helm-2to3
- Helm 2 command documentation: helm list: https://helm.sh/docs/v2/helm/helm_list/
- Helm 2 command documentation: helm delete: https://helm.sh/docs/v2/helm/helm_delete/
- Helm chart documentation: Chart.yaml apiVersion field: https://helm.sh/docs/topics/charts/
- Helm 3 command documentation: helm install: https://helm.sh/docs/v3/helm/helm_install/
- Helm 3 command documentation: helm upgrade: https://helm.sh/docs/v3/helm/helm_upgrade/
- Helm 3 command documentation: helm status: https://helm.sh/docs/v3/helm/helm_status/
- Helm 3 command documentation: helm get hooks: https://helm.sh/docs/v3/helm/helm_get_hooks/

## Issues Found
- Helm 2 `helm list` examples used `--all-namespaces`, which is not a Helm 2 list flag. Removed `--all-namespaces` from the inventory commands and migration script.
- The batch migration script used `helm3 2to3 convert "$release" --namespace "$namespace"`, but the 2to3 `convert` command does not define a `--namespace` flag. Removed that flag while keeping namespace reporting for logging.
- The cleanup section described cleanup as migrating the Tiller data store and said it deleted Tiller service account and RBAC resources. Updated the wording to match the plugin behavior: cleanup removes Helm 2 configuration, Helm 2 release storage, and the Tiller deployment.
- The repository section said Helm 3 uses a different directory structure for chart repositories. Clarified that Helm 3 uses XDG configuration paths and does not configure the stable repository by default.
- The Chart API compatibility statement was reversed. Updated it to say Helm 3 can install apiVersion v1 charts, while apiVersion v2 charts require Helm 3.
- The validation commands relied only on a release label selector. Added `helm3 get manifest` and changed the label selector to the standard `app.kubernetes.io/instance` label.
- The hook troubleshooting text implied all Helm 3 hook annotations are different. Narrowed this to the specific Helm 2 hook values removed or deprecated in Helm 3.
- Namespace-scoped install examples omitted namespace creation. Added `--create-namespace` to make the examples work when the namespaces do not already exist.
- The best-practices `helm3 upgrade` command was missing the required chart argument and used chart values as if they were guaranteed release labels. Updated it to include `CHART_NAME`, namespace, and Helm release metadata labels via `--labels`.

## Review Notes
The Helm 2to3 plugin repository is marked obsolete because Helm 2 itself is obsolete, but it remains the Helm project migration plugin documented for Helm 2 to Helm 3 migrations. The guide should be treated as a legacy migration reference for environments that still have Helm 2 release data.
