# How to Fix Azure DevOps Pipeline Service Connection Authorization Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure DevOps, CI/CD, Service Connections, Pipeline Authorization, DevOps, Troubleshooting, Deployment

Description: Fix Azure DevOps pipeline service connection authorization errors including expired credentials, missing permissions, and pipeline authorization issues.

---

You push a code change, the pipeline kicks off, and then it fails with a service connection authorization error. The deployment was working yesterday, nothing changed in the pipeline YAML, and now the connection is suddenly unauthorized. This is one of the most common Azure DevOps pipeline failures, and it has several different root causes that all produce similar-looking error messages.

I have dealt with these errors across dozens of Azure DevOps organizations, and the troubleshooting process follows a clear path once you know what to check.

## Types of Service Connection Errors

Service connection authorization errors in Azure DevOps fall into three categories:

1. **Pipeline authorization errors** - The pipeline is not authorized to use the service connection
2. **Azure AD credential errors** - The service principal behind the connection has expired credentials or insufficient permissions
3. **RBAC errors** - The service principal lacks the necessary role assignments in Azure

Each produces a different error message, though they can be easy to confuse.

## Pipeline Authorization Errors

This is the most common issue, especially after creating a new service connection or modifying an existing one. Azure DevOps requires explicit pipeline authorization for service connections as a security measure.

The error looks like:

```
Pipeline does not have permissions to use service connection 'MyAzureConnection'.
```

There are two ways to fix this.

**Option 1: Authorize from the failed run.** When a pipeline fails due to missing authorization, Azure DevOps shows a "Permit" button on the failed run. Click it to grant the pipeline access to the service connection.

**Option 2: Pre-authorize in project settings.** Navigate to Project Settings > Service Connections, select the connection, click Security, and add the pipeline or "All pipelines" to the authorized list.

For YAML pipelines, you can also authorize at the resource level in your pipeline definition.

```yaml
# Pipeline YAML with explicit resource authorization
resources:
  pipelines: []

# In the deployment job, reference the service connection
# The first run will prompt for authorization
stages:
  - stage: Deploy
    jobs:
      - deployment: DeployToAzure
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    # This service connection must be authorized for the pipeline
                    azureSubscription: 'MyAzureConnection'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Deploying to Azure..."
                      az account show
```

## Expired Service Principal Credentials

Azure DevOps service connections of type "Azure Resource Manager" use a service principal in Azure AD. That service principal has a client secret (or certificate) with an expiration date. When the secret expires, every pipeline using that connection fails.

The error typically looks like:

```
Failed to obtain an access token. AADSTS7000222: The provided client secret keys for app
'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' are expired.
```

To fix this, you need to create a new secret for the service principal and update the service connection.

```bash
# Find the service principal's application ID from the error message
# Then create a new client secret
az ad app credential reset \
  --id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --years 2

# The output contains the new client secret
# Copy this value - you will need it for the service connection
```

Then update the service connection in Azure DevOps:

1. Go to Project Settings > Service Connections
2. Select the connection
3. Click Edit
4. Update the Service Principal Key with the new secret
5. Click Verify to test the connection
6. Save

To prevent this from happening again, set a calendar reminder for 30 days before the secret expires. Or better yet, use workload identity federation (discussed below) to eliminate secrets entirely.

## Insufficient Azure RBAC Permissions

Even if the service connection credentials are valid, the service principal might not have the right Azure role assignments to perform the operations your pipeline needs.

Common scenarios:
- Pipeline deploys to a resource group where the service principal has no access
- Pipeline tries to create resources but the principal only has Reader access
- Pipeline deploys to a new subscription that was not included in the original connection scope

Check the service principal's role assignments.

```bash
# Get the service principal object ID from the app ID
SP_ID=$(az ad sp show --id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" --query id -o tsv)

# List all role assignments for the service principal
az role assignment list --assignee "$SP_ID" -o table

# Add a role assignment if needed
# Contributor is commonly needed for deployment pipelines
az role assignment create \
  --assignee "$SP_ID" \
  --role "Contributor" \
  --scope "/subscriptions/{sub-id}/resourceGroups/myResourceGroup"
```

For production environments, avoid giving Contributor at the subscription level. Scope the role assignment to the specific resource groups the pipeline needs to deploy to.

## Workload Identity Federation

The best way to avoid service principal secret management entirely is to use workload identity federation. This feature, which became generally available in Azure DevOps, creates a federated credential on the service principal that trusts tokens issued by Azure DevOps. No secrets to expire, no keys to rotate.

To create a service connection with workload identity federation:

1. In Azure DevOps, go to Project Settings > Service Connections
2. Click New Service Connection > Azure Resource Manager
3. Select "Workload Identity Federation (automatic)" or "(manual)"
4. Follow the wizard to create the connection

The automatic option creates the service principal and federated credential for you. The manual option lets you use an existing service principal.

If you have existing service connections that use secrets, you can convert them to use workload identity federation. Navigate to the service connection, and Azure DevOps will show a banner offering to convert if the feature is supported.

## Troubleshooting Connection Verification Failures

When editing a service connection, the "Verify" button tests the credentials against Azure. If verification fails, here is what to check.

```bash
# Test the service principal credentials manually
# If this fails, the credentials are definitely invalid
az login --service-principal \
  --username "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --password "your-client-secret" \
  --tenant "your-tenant-id"

# If login succeeds, check if the principal can access the subscription
az account show --subscription "your-subscription-id"
```

If `az login` fails with an "AADSTS" error code, the issue is with the credentials or the service principal configuration. Common AADSTS codes:

- **AADSTS7000222**: Client secret expired
- **AADSTS7000215**: Invalid client secret
- **AADSTS700016**: Application not found in the tenant
- **AADSTS700024**: Client assertion failed (federated credential misconfiguration)

## Multi-Stage Pipeline Authorization

In multi-stage YAML pipelines with environments, each environment can have its own approval and check gates. If a service connection is used in a stage that targets a specific environment, you need to authorize the connection for that environment.

```yaml
# Multi-stage pipeline with environment-specific service connections
stages:
  - stage: DeployStaging
    jobs:
      - deployment: Deploy
        environment: 'staging'  # Needs separate authorization
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: 'staging-connection'
                    appName: 'myapp-staging'

  - stage: DeployProduction
    dependsOn: DeployStaging
    jobs:
      - deployment: Deploy
        environment: 'production'  # Also needs separate authorization
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: 'production-connection'
                    appName: 'myapp-production'
```

## Service Connection Security Best Practices

After fixing the immediate error, take some time to improve your service connection security posture:

1. **Use workload identity federation** instead of client secrets wherever possible
2. **Scope service connections narrowly** - use resource group scope instead of subscription scope when possible
3. **Do not share connections across projects** unless necessary
4. **Restrict pipeline authorization** - do not use "All pipelines" authorization unless you trust every pipeline in the project
5. **Monitor service principal sign-in logs** in Azure AD to detect suspicious usage
6. **Set secret expiration reminders** for connections that still use client secrets
7. **Use separate connections** for production and non-production environments

Service connection authorization errors are annoying but predictable. Once you understand the three failure categories - pipeline authorization, credential validity, and Azure RBAC - you can diagnose and fix them quickly. The best long-term fix is moving to workload identity federation, which eliminates the most common failure mode entirely.
