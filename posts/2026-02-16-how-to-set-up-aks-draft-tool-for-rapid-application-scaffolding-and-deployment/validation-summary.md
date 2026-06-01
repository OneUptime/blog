# Validation Summary: How to Set Up AKS Draft Tool for Rapid Application Scaffolding and Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS Draft / Azure Draft
- Azure CLI `aks-preview` extension
- Kubernetes manifests, Services, Deployments, and Ingress
- AKS Application Routing / Web Application Routing
- Azure Container Registry
- GitHub Actions and Azure OIDC login
- Dockerfiles for Node.js and Python Flask applications

## Sources Consulted
- Microsoft Learn: Draft for Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/draft
- Microsoft Learn: `az aks draft` CLI reference - https://learn.microsoft.com/en-us/cli/azure/aks/draft?view=azure-cli-latest
- Azure/draft GitHub repository README - https://github.com/Azure/draft
- Microsoft Learn: AKS Application Routing custom domain and SSL certificate - https://learn.microsoft.com/en-us/azure/aks/app-routing-dns-ssl
- Azure/aks-set-context GitHub repository and releases - https://github.com/Azure/aks-set-context
- Azure/k8s-deploy GitHub repository and releases - https://github.com/Azure/k8s-deploy

## Issues Found
- The post said to install an `aks-draft` Azure CLI extension. Current Microsoft documentation lists Draft under the `aks-preview` extension, so the install and prerequisite commands were corrected to use `aks-preview`.
- The Azure CLI version prerequisite was outdated. The current CLI reference requires Azure CLI 2.76.0 or later for the `aks-preview` Draft command group, so the prerequisite was updated.
- The Homebrew command used `brew install azure/draft/draft`, but the Azure/draft README documents `brew install draft`. The command was corrected.
- The post claimed Draft generates Azure Pipelines definitions. The current Draft documentation and CLI reference document GitHub Actions workflow generation, not Azure Pipelines generation, so that bullet was removed.
- The manifest, Helm, and Kustomize generation examples incorrectly used `az aks draft generate-workflow` with an unsupported `--deploy-type` flag. They were corrected to use `az aks draft create --deployment-only=true`, with a note that Draft prompts for the deployment type.
- The ingress setup example incorrectly used `az aks draft setup-gh` and an unsupported `--ingress-tls-cert-keyvault-uri` flag. It was corrected to use `az aks draft update` with `--host` and `--certificate`.
- The ingress TLS secret name was changed to the Application Routing convention `keyvault-<ingress-name>`, matching Microsoft guidance.
- The GitHub Actions generation example incorrectly used `setup-gh` as the workflow generation command and used unsupported flag names such as `--aks-cluster-name` and `--container-registry-name`. It was corrected to run `setup-gh` for OIDC and `generate-workflow` for the workflow, with `--cluster-name`, `--registry-name`, and `--container-name`.
- The GitHub Actions example used secret-based Azure credentials despite the Draft flow setting up OIDC. The workflow was updated to use `azure/login@v2` with `client-id`, `tenant-id`, and `subscription-id`, plus the required `id-token: write` permission.
- The workflow action versions were updated from `azure/aks-set-context@v3` and `azure/k8s-deploy@v4` to current documented major versions, `azure/aks-set-context@v4` and `azure/k8s-deploy@v5`.
- The Node.js Dockerfile installed only production dependencies before running `npm run build`, which can fail when build tooling is in `devDependencies`. It now installs all dependencies for the build and prunes dev dependencies afterward.
- The `az aks draft update` explanation incorrectly described updating Dockerfiles for dependency changes. It was corrected to describe its documented purpose: updating application manifests to make the app internet accessible.

## Review Notes
The Azure CLI was not installed in the local workspace, so command verification used Microsoft Learn and the Azure/draft GitHub repository rather than local `az --help` output. The generated Dockerfile, manifest, and workflow snippets are illustrative; Draft output can vary by language, prompts, and installed Draft version.
