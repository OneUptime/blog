# How to Register an Azure AD Application for Portainer ACI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACI, Azure AD, Security

Description: Learn how to register an Azure Active Directory application and configure its permissions to enable Portainer Business Edition to manage Azure Container Instances.

## Introduction

To connect Portainer to Azure Container Instances, you must first register a Microsoft Entra ID (formerly Azure AD) application. This app acts as the identity that Portainer uses to authenticate with Azure APIs. This guide covers the full registration process with both the Azure Portal UI and Azure CLI.

## Prerequisites

- An active Azure subscription
- Permission to register applications in Microsoft Entra ID (for example, Cloud Application Administrator, Application Administrator, or Global Administrator)
- Azure CLI installed (for CLI approach)
- Access to the Azure Portal

## Understanding the Azure AD App Registration

A Microsoft Entra ID app registration creates an application identity that:
- Has its own `Application (Client) ID`
- Belongs to a Microsoft Entra tenant (identified by `Tenant ID`)
- Can be granted roles on Azure resources
- Uses client secrets or certificates to authenticate

Portainer uses these credentials to make API calls to create and manage ACI container groups on your behalf.

## Method 1: Register via Azure Portal

### Step 1: Open App Registrations

1. Log into the [Azure Portal](https://portal.azure.com).
2. Search for **App registrations** in the top search bar.
3. Click **App registrations**.
4. Click **New registration**.

### Step 2: Fill in Registration Details

- **Name**: `Portainer ACI Integration`
- **Supported account types**: Select **Accounts in this organizational directory only (Single tenant)**
- **Redirect URI**: Leave blank (not required for service-to-service auth)

Click **Register**.

### Step 3: Record the IDs

After registration, on the app overview page, note:
- **Application (client) ID**: Copy this for Portainer configuration
- **Directory (tenant) ID**: Copy this for Portainer configuration

If you used the Azure Portal method and want to continue with the CLI steps below, export the values first:

```bash
az login
az account set --subscription "<subscription-id-or-name>"
APP_ID="<application-client-id>"
TENANT_ID="<directory-tenant-id>"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
```

## Method 2: Register via Azure CLI

```bash
# Log into Azure

az login

# If you have multiple subscriptions, select the one Portainer should use
az account set --subscription "<subscription-id-or-name>"

# Create the app registration
APP_ID=$(az ad app create \
  --display-name "Portainer ACI Integration" \
  --sign-in-audience AzureADMyOrg \
  --query appId \
  -o tsv)

echo "Registration result:"
az ad app show --id "$APP_ID" --query '{
  displayName: displayName,
  appId: appId,
  id: id
}' -o json

echo "Application (Client) ID: $APP_ID"

# Get the Tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Tenant ID: $TENANT_ID"

# Get your Subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Subscription ID: $SUBSCRIPTION_ID"
```

## Step 4: Ensure a Service Principal Exists

The service principal is the representation of your app in your specific Microsoft Entra tenant. It's what receives role assignments. App registrations created in the Microsoft Entra admin center already have a home-tenant service principal, while `az ad app create` requires you to create it explicitly:

```bash
# Look up the service principal first
SP_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv 2>/dev/null || true)

# Create it if it doesn't exist yet
if [ -z "$SP_ID" ]; then
  SP_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)
fi

echo "Service Principal Object ID: $SP_ID"
```

## Step 5: Assign the Contributor Role

Grant the app permission to manage resources in your ACI resource group:

```bash
# Create resource group if it doesn't exist
az group create --name portainer-aci-rg --location eastus

# Assign Contributor role on the resource group
az role assignment create \
  --assignee-object-id "$SP_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/portainer-aci-rg"

# Verify the assignment
az role assignment list \
  --assignee-object-id "$SP_ID" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/portainer-aci-rg" \
  --fill-principal-name false \
  --output table
```

## Step 6: Verify the Registration

Confirm the app is properly configured:

```bash
# Show app details
az ad app show --id "$APP_ID" --query '{
  displayName: displayName,
  appId: appId,
  signInAudience: signInAudience
}' -o json

# Verify the service principal
az ad sp show --id "$APP_ID" --query '{
  displayName: displayName,
  appId: appId,
  accountEnabled: accountEnabled
}' -o json
```

## Required API Permissions

For standard ACI management, the `Contributor` role assignment at the resource group level is typically sufficient. You generally do not need to configure delegated API permissions in the Azure Portal's "API permissions" section for this scenario, because Portainer authenticates to Azure Resource Manager and access is controlled by Azure RBAC at the target scope.

## Summary of Values for Portainer

After completing registration, you have:

```bash
echo "=== Portainer ACI Setup Values ==="
echo "Tenant ID:         $TENANT_ID"
echo "Application ID:    $APP_ID"
echo "Authentication Key: <create this client secret next>"
echo ""
echo "Values used for Azure RBAC setup:"
echo "Subscription ID:   $SUBSCRIPTION_ID"
echo "Resource Group:    portainer-aci-rg"
```

## Security Best Practices

- Use a **dedicated app registration** per environment (dev, staging, prod)
- Apply the **Principle of Least Privilege**: scope the Contributor role to the specific resource group, not the entire subscription
- Rotate client secrets on a schedule (every 6-12 months)
- Monitor sign-in logs in Microsoft Entra ID for anomalous activity

## Conclusion

Registering a Microsoft Entra ID application for Portainer ACI is a straightforward process that establishes the identity Portainer uses to manage your Azure containers. Scope the role assignment to the specific resource group Portainer will use, record the Application ID and Tenant ID, and proceed to create a client secret to complete the Portainer integration.
