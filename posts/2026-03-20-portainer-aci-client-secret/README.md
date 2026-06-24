# How to Create a Client Secret for Portainer ACI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACI, Security, Authentication

Description: Learn how to create and manage an Azure AD client secret for the Portainer ACI integration, including rotation best practices and secret storage guidance.

## Introduction

After registering a Microsoft Entra ID application for Portainer's ACI integration, you need to create a client secret - the credential Portainer uses to authenticate with Azure APIs. This guide covers secret creation, proper storage, and rotation procedures.

## Prerequisites

- A Microsoft Entra ID app registration created for Portainer ACI
- Azure Portal access or Azure CLI installed
- The Application (Client) ID of your registered app

## Understanding Client Secrets

A client secret is essentially a password for your Microsoft Entra ID application. Key characteristics:

- Has an **expiry date** (up to 24 months from creation)
- Is only displayed **once** at creation - you cannot retrieve it again
- Multiple secrets can exist simultaneously (useful during rotation)
- Should be stored securely and never committed to source control

## Method 1: Create Secret via Azure Portal

### Step 1: Navigate to Your App Registration

1. Log into the [Azure Portal](https://portal.azure.com).
2. Search for **App registrations** → click your app (`Portainer ACI Integration`).
3. In the left sidebar, click **Certificates & secrets**.

### Step 2: Add a New Client Secret

1. Under **Client secrets**, click **New client secret**.
2. Fill in:
   - **Description**: `Portainer ACI Integration - Created 2026-03`
   - **Expires**: Select an expiry period (Microsoft recommends **less than 12 months**)
3. Click **Add**.

### Step 3: Copy the Secret Value

> **IMPORTANT**: The secret value is shown only once. Copy it immediately.

1. Under the **Value** column, click **Copy to clipboard**.
2. Store it immediately in your secrets manager.

## Method 2: Create Secret via Azure CLI

```bash
# Log into Azure

az login

# Set your app ID
APP_ID="your-application-client-id"

# Create a client secret with 1-year expiry
SECRET=$(az ad app credential reset \
  --id "$APP_ID" \
  --years 1 \
  --display-name "Portainer-Secret-2026" \
  --query 'password' \
  -o tsv)

# Store $SECRET securely immediately; avoid printing it in shared terminals or CI logs
```

## Method 3: Create Additional Secrets (for rotation)

You can have multiple active secrets simultaneously, which enables zero-downtime rotation:

```bash
# Add a new secret WITHOUT removing the existing one
NEW_SECRET=$(az ad app credential reset \
  --id "$APP_ID" \
  --append \
  --years 1 \
  --display-name "Portainer-Secret-Rotation-2026" \
  --query 'password' \
  -o tsv)

# Store $NEW_SECRET securely immediately; avoid printing it in shared terminals or CI logs
```

## Storing the Client Secret Securely

Never store client secrets in:
- Source code or Git repositories
- Unencrypted configuration files
- Environment variables in Docker Compose files committed to Git

Store them in:

```bash
# Option 1: HashiCorp Vault
vault kv put secret/portainer/aci client_secret="$SECRET"

# Option 2: Azure Key Vault
az keyvault secret set \
  --vault-name mycompany-keyvault \
  --name portainer-aci-secret \
  --value "$SECRET"

# Option 3: Docker Secrets (for Swarm environments)
echo "$SECRET" | docker secret create portainer_aci_secret -

# Option 4: Kubernetes Secrets
kubectl create secret generic portainer-aci \
  --from-literal=client_secret="$SECRET" \
  -n portainer
```

## Entering the Secret in Portainer

1. Log into Portainer.
2. Go to **Environments** → **Add environment** → **Azure ACI**.
3. In the **Authentication key** field, paste your client secret.
4. Complete the other fields (Subscription ID, Tenant ID, Application ID).
5. Click **Connect** to test, then **Save**.

## Rotating the Client Secret

Rotate the secret before it expires to avoid service interruption:

```bash
#!/bin/bash
# rotate-aci-secret.sh

APP_ID="your-application-client-id"
PORTAINER_URL="https://portainer.example.com"

# Step 1: Create a new secret (old one remains valid)
NEW_SECRET=$(az ad app credential reset \
  --id "$APP_ID" \
  --append \
  --years 1 \
  --display-name "Portainer-Rotated-$(date +%Y-%m)" \
  --query 'password' -o tsv)

echo "New secret created."

# Step 2: Update Portainer with the new secret
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

# Update the ACI environment (endpoint ID 5 as example)
curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/5" \
  -d "{\"AzureApplicationID\":\"$APP_ID\",\"AzureAuthenticationKey\":\"$NEW_SECRET\"}"

echo "Portainer updated with new secret."

# Step 3: Remove the old secret from Microsoft Entra ID
# List credentials to find the old one by keyId
az ad app credential list --id "$APP_ID" --output table
# Then: az ad app credential delete --id "$APP_ID" --key-id OLD_KEY_ID

echo "Old secret should be manually removed from Microsoft Entra ID after verifying Portainer works."
```

## Checking Secret Expiry

```bash
# List all credentials and their expiry dates
az ad app credential list \
  --id "$APP_ID" \
  --query '[].{Description: displayName, Expiry: endDateTime}' \
  --output table
```

## Conclusion

Creating a client secret for Portainer ACI is a quick process, but managing it properly is critical for ongoing security. Always use secrets managers for storage, set calendar reminders for rotation before expiry, and use the multiple-secrets approach for zero-downtime rotation. Never hardcode secrets in configuration files or container environment variables.
