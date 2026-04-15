# Validation Summary: How to Use Azure DevOps Pipelines with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (runtime v1.13.0, CLI)
- Azure DevOps Pipelines (YAML multi-stage pipelines)
- Azure Container Registry (ACR)
- Azure Kubernetes Service (AKS)
- Docker
- Python (pytest)
- KubernetesManifest task (v1)

## Sources Consulted
- Azure DevOps YAML pipeline schema documentation (https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/)
- Azure DevOps deployment job documentation (https://learn.microsoft.com/en-us/azure/devops/pipelines/process/deployment-jobs)
- KubernetesManifest@1 task reference (https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/kubernetes-manifest-v1)
- Docker@2 task reference (https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2)
- Dapr CLI GitHub repository and source code (https://github.com/dapr/cli)
- Dapr CLI install script (https://raw.githubusercontent.com/dapr/cli/master/install/install.sh)
- Dapr CLI `init` command source (`cmd/init.go`) for `--runtime-version` flag verification
- Dapr CLI `run` command source (`cmd/run.go`) for `--resources-path` flag verification
- Dapr runtime releases (https://github.com/dapr/dapr/releases)

## Issues Found
1. **Missing `checkout: self` in deployment job**: Azure DevOps deployment jobs (unlike regular jobs) do not automatically check out source code. The `DeployStaging` stage's deployment job referenced repo files (`k8s/components/*.yaml` and `k8s/base/*.yaml`) without first checking out the repository. Added `- checkout: self` as the first step in the `deploy` lifecycle hook to ensure manifest files are available.

## Review Notes
- The Dapr runtime version `1.13.0` used in the pipeline variable is valid but dated (released 2024-03-06). The current stable version is v1.17.x. The post doesn't claim to use the latest version, so this is not an error, but readers should be aware they may want to update the version.
- The Dapr CLI install script URL correctly uses the `master` branch (the dapr/cli repo's default branch).
- The `--resources-path` flag is the current recommended flag for `dapr run` (the older `--components-path` is deprecated).
- All Azure DevOps task versions used (`UsePythonVersion@0`, `PublishTestResults@2`, `Docker@2`, `KubernetesManifest@1`) are current.
- The `##vso[task.prependpath]` logging command is the correct way to add the Dapr CLI to PATH for subsequent steps.
