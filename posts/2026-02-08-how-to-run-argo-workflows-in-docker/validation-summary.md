# Validation Summary: How to Run Argo Workflows in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- k3d / k3s
- Kubernetes
- Argo Workflows
- Argo CLI
- CronWorkflow
- Kaniko
- Node.js CI pipelines

## Sources Consulted
- Argo Workflows official quick start: https://argo-workflows.readthedocs.io/en/release-3.4/quick-start/
- Argo Workflows official installation documentation: https://argoproj.github.io/argo-workflows/installation/
- Argo Workflows official CronWorkflow documentation: https://argo-workflows.readthedocs.io/en/latest/cron-workflows/
- Argo Workflows official volumes walkthrough: https://argo-workflows.readthedocs.io/en/latest/walk-through/volumes/
- Argo Workflows official artifact repository documentation: https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/
- Argo Workflows official artifactRepositoryRef documentation: https://argo-workflows.readthedocs.io/en/release-3.4/artifact-repository-ref/
- Argo Workflows official CLI logs reference: https://argo-workflows.readthedocs.io/en/latest/cli/argo_logs/
- Argo Workflows GitHub releases: https://github.com/argoproj/argo-workflows/releases
- k3d official cluster create command reference: https://k3d.io/v5.4.9/usage/commands/k3d_cluster_create/
- Kaniko executor documentation: https://github.com/GoogleContainerTools/kaniko

## Issues Found
- The post hardcoded Argo Workflows v3.5.5 even though newer stable Argo Workflows releases are available. Updated the CLI and install manifest URLs to v4.0.5 and verified both release asset URLs resolve.
- The k3d cluster command exposed port 9000 even though the guide does not install MinIO or any other service on that mapped NodePort. Removed the unused port mapping.
- The CI pipeline description claimed artifact passing and configured `artifactRepositoryRef`, but the workflow uses a PVC workspace and does not define Argo input/output artifacts. Removed the uncreated artifact repository reference and changed the description to a shared workspace volume.
- The CronWorkflow example used `spec.schedule`, while current Argo Workflows documentation uses `spec.schedules` as a non-empty list. Updated the example to `schedules`.
- The monitoring section used `argo logs --step-name`, which is not a documented `argo logs` flag. Replaced it with the documented workflow/pod log form.

## Review Notes
The workflow examples are suitable for local development. The CI example still uses placeholder repository and registry values, so readers must replace those values before running it against a real project.
