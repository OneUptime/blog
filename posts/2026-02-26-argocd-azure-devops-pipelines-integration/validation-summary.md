# Validation Summary: How to Integrate ArgoCD with Azure DevOps Pipelines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Azure DevOps Pipelines
- Azure Repos service hooks
- Azure Container Registry
- Kubernetes and AKS
- Kustomize
- Helm OCI repositories
- Docker@2 Azure Pipelines task

## Sources Consulted
- Argo CD CLI installation: https://argo-cd.readthedocs.io/en/latest/cli_installation/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD declarative repository and Helm OCI configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Microsoft Azure Pipelines variable groups: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/variables-group?view=azure-pipelines
- Microsoft Azure Pipelines secret variables: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-secret-variables?view=azure-devops
- Microsoft Azure Pipelines environments and approvals: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments?view=azure-devops
- Microsoft Azure Pipelines Docker@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2?view=azure-pipelines
- Microsoft Azure DevOps webhooks/service hooks: https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/webhooks?view=azure-devops
- Kubernetes SIGs Kustomize releases: https://github.com/kubernetes-sigs/kustomize/releases

## Issues Found
- The Argo CD CLI install commands wrote directly to `/usr/local/bin` with `curl -o` and `chmod`, which can fail on hosted Linux agents without elevated permissions. Updated them to match the official install flow: download locally, run `sudo install -m 555`, then remove the temporary binary.
- The Kustomize install commands extracted directly into `/usr/local/bin` without elevated permissions and used an older pinned release. Updated them to use `sudo tar` and Kustomize v5.8.1.
- The first Docker@2 example used `dockerfile` instead of the documented `Dockerfile` task input. Updated the input casing to match the Microsoft task reference.
- Secret variables were referenced directly in shell commands. Updated PAT and Argo CD token usage to map secrets through `env:` and read them from shell environment variables, which matches Azure Pipelines guidance for secret variables.
- The Azure DevOps webhook instruction said to configure a generic webhook secret to match `argocd-secret`. Argo CD documents Azure DevOps webhook security as basic authentication with `webhook.azuredevops.username` and `webhook.azuredevops.password`, so the instruction was corrected.

## Review Notes
The overall GitOps flow, Azure Pipelines stage/deployment syntax, Argo CD sync and wait commands, Helm OCI repository secret fields, and environment approval explanation are technically sound. The examples still use placeholder service connection names, repository URLs, app names, and domains that must be replaced for a real environment.
