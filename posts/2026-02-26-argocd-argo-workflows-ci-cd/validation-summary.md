# Validation Summary: How to Use Argo Workflows with ArgoCD for CI+CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo Workflows
- Argo CD
- Argo Events
- Kubernetes
- GitOps
- Kaniko
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Argo Workflows quick start and installation docs: https://argo-workflows.readthedocs.io/en/latest/quick-start/ and https://argo-workflows.readthedocs.io/en/latest/installation/
- Argo Workflows volumes and field reference: https://argo-workflows.readthedocs.io/en/latest/walk-through/volumes/ and https://argo-workflows.readthedocs.io/en/latest/fields/
- Argo Workflows artifact repository docs: https://argo-workflows.readthedocs.io/en/latest/artifact-repository-ref/ and https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/
- Argo CD automated sync docs: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD CLI app wait docs: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Kubernetes Secret and volume docs: https://kubernetes.io/docs/concepts/configuration/secret/ and https://kubernetes.io/docs/concepts/storage/volumes/
- Prometheus Operator design docs: https://prometheus-operator.dev/docs/getting-started/design/
- Kaniko upstream repository: https://github.com/GoogleContainerTools/kaniko

## Issues Found
- The architecture diagram showed image building before tests, while the workflow YAML runs tests before building. Updated the diagram to match the workflow.
- The workflow mounted a `work` volume in multiple templates but did not define it. Added a `volumeClaimTemplates` entry so sequential DAG tasks can share the checked-out workspace.
- The source repository was cloned directly into the workspace volume mount root. Updated the checkout and dependent paths to use `/workspace/src`, which avoids failures on volume implementations that add files at the mount root.
- The Git credential secret was mounted at `/root/.git-credentials` without `subPath`, which would mount the secret as a directory rather than the credential-store file. Added `items`, `subPath`, `readOnly: true`, and configured Git's credential helper before cloning the GitOps repository.
- The Argo CD polling interval was described as "default every 3 minutes." Updated it to the documented default of 120 seconds plus up to 60 seconds of jitter.
- The artifact-storage section incorrectly implied Argo CD uses the same backend for state. Reworded it to describe Argo Workflows artifact storage as separate from Argo CD's Git-based desired state.
- The artifact repository ConfigMap lacked the `workflows.argoproj.io/default-artifact-repository` annotation needed for the named default key. Added the annotation.
- The image-build example used Kaniko without noting its maintenance status. Added a caveat that the upstream Kaniko repository is archived and that new production pipelines should consider a maintained builder.

## Review Notes
The examples remain illustrative and require real registry credentials, Git credentials, RBAC, Argo CD authentication, and a ServiceMonitor selector configuration that matches the user's Prometheus installation. The `latest` image tags and release URLs are acceptable for examples but should be pinned in production.
