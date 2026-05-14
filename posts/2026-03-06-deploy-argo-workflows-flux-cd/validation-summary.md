# Validation Summary: How to Deploy Argo Workflows with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo Workflows
- Flux CD
- Kubernetes
- Helm and Flux HelmRelease
- Kubernetes RBAC
- S3-compatible artifact repositories
- Argo WorkflowTemplate and CronWorkflow resources

## Sources Consulted
- Argo Workflows artifact repository documentation: https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/
- Argo Workflows artifact repository reference documentation: https://argo-workflows.readthedocs.io/en/latest/artifact-repository-ref/
- Argo Workflows WorkflowTemplate documentation: https://argo-workflows.readthedocs.io/en/latest/workflow-templates/
- Argo Workflows volumes documentation: https://argo-workflows.readthedocs.io/en/latest/walk-through/volumes/
- Argo Workflows RBAC documentation: https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/
- Argo Workflows service account documentation: https://argo-workflows.readthedocs.io/en/latest/service-accounts/
- Argo Server authentication mode documentation: https://argo-workflows.readthedocs.io/en/latest/argo-server-auth-mode/
- Argo Workflows CLI delete command documentation: https://argo-workflows.readthedocs.io/en/latest/cli/argo_delete/
- Argo Workflows Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-workflows/values.yaml
- Argo Workflows Helm chart metadata: https://github.com/argoproj/argo-helm/blob/main/charts/argo-workflows/Chart.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Helm chart version constraint used `0.x`, but the current Argo Workflows Helm chart is in the `1.x` series. Updated the HelmRelease to use `version: "1.x"`.
- The Helm values used deprecated `server.authMode` and configured SSO without the required SSO settings. Replaced it with current `server.authModes` syntax and a working `server` mode example.
- The Helm values included `useDefaultArtifactRepo`, which is not part of the current Argo Workflows chart values. Removed that field while keeping the valid `artifactRepository` configuration.
- The workflow service account was created but not selected by the example workflows. Added `serviceAccountName: argo-workflow-executor` to workflow defaults and the CronWorkflow.
- The service account annotation was labeled as IRSA-related but used an Argo SSO RBAC annotation instead. Removed the incorrect annotation.
- The RBAC example was missing the minimum executor permissions for Argo Workflows v3.4 and later. Added `workflowtaskresults` `create` and `patch` permissions.
- The CI WorkflowTemplate mounted a `work` volume without declaring it. Added a `volumeClaimTemplates` entry and updated the clone, test, and Kaniko paths to use `/work/src`.
- The cleanup CronWorkflow claimed to delete workflows older than seven days but its `kubectl delete` command did not filter by age. Replaced it with the Argo CLI command `argo delete -n argo --completed --older 7d`.
- The cleanup CronWorkflow used a kubectl-only image while running an Argo-specific cleanup is more accurate. Changed the container image to the official Argo CLI image.
- The Flux Kustomization manifest was shown as `clusters/production/argo-workflows/kustomization.yaml`, which would conflict with Kustomize's own `kustomization.yaml` file semantics inside the reconciled path. Moved it to `clusters/production/argo-workflows-sync.yaml` in the repository layout and snippet.
- The repository structure omitted the CronWorkflow file added later in the article. Added `cron-cleanup.yaml` to the structure.

## Review Notes
- The example still uses placeholder hosts, bucket names, registry names, and credentials. A real deployment must provide actual S3 credentials, TLS secret management, PostgreSQL credentials, and registry authentication for Kaniko.
- Local `helm`, `kubectl`, `flux`, and `argo` binaries were not installed in the review environment, so command validation was performed against official documentation and upstream chart source rather than local `--help` output.
