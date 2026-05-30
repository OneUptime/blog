# Validation Summary: How to Set Up Azure Pipelines OIDC Auth to Eliminate Stored Service Principal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines
- Azure DevOps service connections
- OpenID Connect (OIDC)
- Workload identity federation
- Microsoft Entra ID application federated credentials
- Azure CLI and Azure DevOps CLI
- Azure Resource Manager deployments

## Sources Consulted
- Microsoft Learn: Configure Workload identity federation for Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity
- Microsoft Learn: Troubleshoot Workload identity federation for Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/troubleshoot-workload-identity
- Microsoft Learn: Automate Azure service connections with workload identity federation - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/automate-service-connections
- Microsoft Learn: Create an Azure Resource Manager service connection using workload identity federation - https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure
- Microsoft Learn: az ad app federated-credential command reference - https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential
- Microsoft Learn: az ad sp create-for-rbac command reference - https://learn.microsoft.com/en-us/cli/azure/ad/sp

## Issues Found
- The original post used the older hand-built Azure DevOps issuer URL and `sc://<organization>/<project>/<service-connection-name>` subject as the primary setup path. Current Azure Resource Manager workload identity service connections generate issuer and subject values from the service connection, so the setup flow was updated to create the service connection first and use the generated values when creating the federated credential.
- The Azure DevOps CLI example passed inline JSON to `az devops service-endpoint create`, but the command expects a service endpoint configuration file. The example now writes `service-connection.json` and passes that file path.
- The original Azure DevOps CLI example supplied `workloadIdentityFederationIssuer` and `workloadIdentityFederationSubject` manually during service connection creation. The example now lets Azure DevOps generate those values and reads them back from the created service connection.
- The service principal creation example used separate app and service principal commands and assigned roles by app ID. The example now uses `az ad sp create-for-rbac --create-password false` and assigns the role by service principal object ID, matching current Azure CLI guidance and avoiding accidental secret creation.
- The post claimed federated credentials could restrict access to specific branches. For Azure Resource Manager service connections, the federated credential subject scopes trust to a service connection identity; branch restrictions should be handled through pipeline/service connection authorization, checks, or separate service connections. The section now describes separate service connections for deployment scopes.
- The conversion section said the old secret is not deleted immediately. Current Azure DevOps documentation describes a seven-day revert window for automatically created service connections, so that wording was corrected.
- The explanation described token claims as including pipeline ID and branch. The flow now describes claims identifying the service connection, which is the relevant trust boundary for this service connection pattern.
- Azure AD references were updated to Microsoft Entra ID terminology while preserving the technical audience and intent.

## Review Notes
- The AzureCLI@2 and AzureResourceManagerTemplateDeployment@3 examples are valid task patterns for Azure Resource Manager workload identity service connections.
- The exact issuer and subject formats can differ between older examples and current Azure Resource Manager service connections, so the post now instructs readers to use the generated values rather than hard-coding a format.
