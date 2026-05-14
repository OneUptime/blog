# Validation Summary: How to Configure Flux CD with Azure DevOps Repos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Azure DevOps Repos
- Kubernetes custom resources
- SSH authentication
- HTTPS and Personal Access Token authentication
- Azure Repos branch policies
- Azure Pipelines
- kubeconform
- kustomize

## Sources Consulted
- Flux Azure DevOps bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/azure-devops/
- Flux `bootstrap git` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_git/
- Flux GitRepository documentation and source API reference: https://fluxcd.io/flux/components/source/gitrepositories/ and https://fluxcd.io/flux/components/source/api/v1/
- Flux notification Provider and Alert documentation: https://fluxcd.io/flux/components/notification/providers/ and https://fluxcd.io/flux/components/notification/alerts/
- Microsoft Azure Repos SSH authentication documentation: https://learn.microsoft.com/en-us/azure/devops/repos/git/use-ssh-keys-to-authenticate
- Microsoft Azure DevOps PAT documentation: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
- Microsoft Azure Repos branch policy documentation: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies-overview

## Issues Found
- The repository URL example was marked as `json` even though it contained comments and plain URL examples. Changed the code fence to `text`.
- The SSH setup used an ED25519 key, but current Flux Azure DevOps bootstrap guidance requires RSA SHA-2 handling for Azure DevOps SSH. Updated the key generation command to `rsa-sha2-512` and added `--ssh-hostkey-algos=rsa-sha2-512,rsa-sha2-256` to the bootstrap command.
- The PAT scope guidance did not distinguish bootstrap from pull-only reconciliation. Clarified that bootstrap needs Code Read & Write, while an existing pull-only GitRepository only needs read access.
- A GitRepository example used `tag: "v1.*"`, but Flux treats `tag` as an exact tag. Changed it to a SemVer range using `semver: ">=1.0.0 <2.0.0"`.
- The PAT rotation section referred to Azure DevOps service connections, but the example updates a Kubernetes Secret. Reworded the claim and aligned the example with the bootstrapped `flux-system` secret.
- The notification section claimed Flux would send notifications to Azure DevOps pull requests, but the Azure DevOps provider updates commit statuses. Reworded the section accordingly.
- The notification Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but current Provider and Alert resources use `notification.toolkit.fluxcd.io/v1beta3`. Updated both manifests.

## Review Notes
The Flux CLI is not installed in this workspace, so CLI flags were validated against official Flux command documentation rather than local `--help` output. The `ssh-keygen -t rsa-sha2-512` command was tested locally and generated a valid key pair.
