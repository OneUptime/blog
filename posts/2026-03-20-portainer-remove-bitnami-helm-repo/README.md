# How to Remove the Default Bitnami Helm Repository in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, Security, DevOps

Description: Learn how to remove the default Bitnami Helm repository from Portainer to simplify your chart catalog or enforce organizational policies on approved repositories.

## Introduction

Portainer ships with the Bitnami Helm repository pre-configured. While Bitnami provides high-quality charts, some organizations prefer to replace the global default with an internal repository, reduce the chart catalog exposed by default, or remove external dependencies for air-gapped deployments. This guide shows how to remove the default Bitnami repository from Portainer.

## Prerequisites

- Portainer CE or BE
- Admin access to Portainer
- If you plan to replace Bitnami, a reachable Helm chart repository URL
- Understanding that removing or replacing the global repo changes the default Helm source shown in Portainer (existing deployed applications are unaffected)

## Why Remove the Bitnami Repository?

Common reasons include:

- **Security hardening**: Remove the preconfigured public repository from Portainer's global defaults
- **Air-gapped environments**: No external internet access for chart index fetching
- **Organizational policy**: Replace the global default repository with an approved internal source
- **Reduce noise**: Simplify the chart catalog for developers to only show relevant charts
- **Performance**: Fewer repos to index means faster Helm chart page loading

## Step 1: Navigate to Helm Repository Settings

1. Log into Portainer as an administrator.
2. From the left-hand menu, click **Settings**.
3. Open the **General** settings page.
4. Scroll down to the **Kubernetes settings** section, then find **Helm repository**.

By default, the Helm repository URL is set to:
- URL: `https://charts.bitnami.com/bitnami`

## Step 2: Remove the Bitnami Repository

1. Clear the **Helm repository** URL field so it is empty.
2. Click **Save Kubernetes settings**.

After removal, Bitnami charts will no longer appear as the global Helm repository option when deploying Helm charts.

> **Note**: Removing the repository does **not** uninstall existing applications deployed from Bitnami charts. Running applications will continue to work normally. It changes the global Helm repository used for future installs and upgrades through Portainer.

## Step 3: Remove via the Portainer API

For scripted removal, update Portainer's global settings. This requires admin access:

```bash
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-portainer-api-key"

# Show the current global Helm repository
curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/settings" | jq -r '.HelmRepositoryURL'

# Clear the global Helm repository
curl -s -X PUT -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/settings" \
  -d '{
    "HelmRepositoryURL": ""
  }' | jq -r '.HelmRepositoryURL'

echo "Global Bitnami repository removed."
```

## Step 4: Understand the Scope of the Change

If you manage multiple Kubernetes environments:

You do **not** need to loop over environments for this change. The Helm repository configured under **Settings** is a global Portainer setting, so clearing `HelmRepositoryURL` once removes the default Bitnami repository for all users and Kubernetes environments managed by that Portainer instance.

Users can still add their own Helm repositories under **My account** > **Helm repositories**, so removing the global Bitnami repository changes the default global source rather than disabling user-specific repositories.

## Step 5: Replace with an Approved Internal Repository

Portainer's global Helm setting accepts a single repository URL. After removing Bitnami, point it at your approved internal chart repository. The URL must be reachable by Portainer and serve a valid Helm repository `index.yaml`:

```bash
# Replace the global Helm repository with your internal repository
curl -s -X PUT -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/settings" \
  -d '{
    "HelmRepositoryURL": "https://charts.internal.company.com"
  }' | jq -r '.HelmRepositoryURL'
```

## Verifying the Removal

```bash
# Confirm the global Helm repository is empty
curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/settings" | jq -r '.HelmRepositoryURL'
# Should return an empty string if Bitnami was removed
```

## Conclusion

Removing the default Bitnami Helm repository from Portainer is a simple but important step when standardizing the global Helm source available in Portainer. Existing deployments are unaffected by this change. After removal, you can leave the global setting empty or point it at your vetted internal Helm repository.
