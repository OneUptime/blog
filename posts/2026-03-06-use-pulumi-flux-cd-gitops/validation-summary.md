# Validation Summary: How to Use Pulumi with Flux CD for GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi IaC
- Pulumi TypeScript SDK
- Pulumi EKS, Kubernetes, GitHub, and TLS providers
- Amazon EKS
- Flux CD GitRepository, Kustomization, and HelmRelease APIs
- Kubernetes Secrets and Helm charts
- GitHub repositories and deploy keys

## Sources Consulted
- Pulumi EKS `Cluster` API documentation: https://www.pulumi.com/registry/packages/eks/api-docs/cluster/
- Pulumi Kubernetes Helm v4 `Chart` API documentation: https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v4/chart/
- Pulumi GitHub provider configuration documentation: https://www.pulumi.com/registry/packages/github/installation-configuration/
- Pulumi GitHub `Provider` API documentation: https://www.pulumi.com/registry/packages/github/api-docs/provider/
- Pulumi GitHub `RepositoryFile` API documentation: https://www.pulumi.com/registry/packages/github/api-docs/repositoryfile/
- Pulumi GitHub `RepositoryDeployKey` API documentation: https://www.pulumi.com/registry/packages/github/api-docs/repositorydeploykey/
- Pulumi TLS `PrivateKey` API documentation: https://www.pulumi.com/registry/packages/tls/api-docs/privatekey/
- Pulumi CLI `pulumi new` documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_new/
- Pulumi configuration and secrets documentation: https://www.pulumi.com/docs/iac/concepts/config/
- Amazon EKS platform versions documentation: https://docs.aws.amazon.com/eks/latest/userguide/platform-versions.html
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- GitHub SSH key fingerprints documentation: https://docs.github.com/articles/github-s-ssh-key-fingerprints

## Issues Found
- The TypeScript examples used `tls.PrivateKey` but did not install or import `@pulumi/tls`. Added the package to the install command and added the import.
- The GitHub token was read from Pulumi config but was not connected to the GitHub provider. Added an explicit `github.Provider` with `owner` and `token`, and passed it to GitHub resources.
- The EKS snippet claimed to use the latest supported Kubernetes version while pinning `1.31`, which is not current as of the review date. Updated the example to a currently supported `1.35` pin and adjusted the comment.
- The EKS comment said "managed node groups" although the snippet used the cluster-level default worker node settings. Changed the wording to "worker nodes."
- The GitHub repository comment said `hasIssues: true` protected the main branch, which is incorrect. Changed the comment to describe enabling issues.
- The Flux Helm chart was described as official. Flux documentation describes the Helm charts as community-maintained, so the wording was corrected.
- The root `kustomization.yaml` referenced `apps.yaml`, but the post did not create that file. Added a Pulumi-managed `apps.yaml` Flux Kustomization reference.
- The Flux Kustomizations pointed at `infrastructure/${environment}` and `apps/${environment}` paths that might not exist during the initial sync. Added `.gitkeep` files for those environment roots so the repository paths exist.
- Multiple GitHub repository file resources committed to the same branch without ordering. Added `dependsOn` options to serialize the initial repository file creation.
- The application `RepositoryFile` example did not use the configured GitHub provider. Added the provider option and a dependency on the seeded applications root.

## Review Notes
The code snippets are still tutorial fragments rather than a complete multi-file Pulumi project; if split into separate TypeScript files, the shared symbols would need normal imports/exports. The Flux Helm chart is community-maintained on a best-effort basis, so production users may prefer Flux CLI bootstrap manifests or the Flux Operator depending on their lifecycle requirements.
