# How to Use Dapr with Azure Active Directory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Active Directory, Authentication, Security

Description: Configure Dapr components to authenticate with Azure services using Azure Active Directory identities including service principals and managed identities.

---

## Overview

Dapr components that connect to Azure services (Service Bus, Cosmos DB, Key Vault, etc.) can authenticate using Azure Active Directory (now Microsoft Entra ID) instead of connection strings. This eliminates secret management overhead and follows least-privilege security principles.

## Authentication Methods Supported

Dapr supports three Azure AD authentication approaches:
1. Managed Identity (recommended for AKS)
2. Service Principal with client secret
3. Service Principal with client certificate

## Using a Service Principal

Create a service principal and grant it access to your Azure resource:

```bash
# Create service principal
az ad sp create-for-rbac --name dapr-service-principal \
  --role contributor \
  --scopes /subscriptions/<sub-id>/resourceGroups/<rg-name>

# Note the appId, password, and tenant from the output
```

Create a Kubernetes secret with the credentials:

```bash
kubectl create secret generic azure-sp-credentials \
  --from-literal=clientId=<appId> \
  --from-literal=clientSecret=<password> \
  --from-literal=tenantId=<tenantId>
```

## Configuring Dapr Component with Azure AD Auth

Example: Azure Service Bus with Azure AD authentication:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
    - name: namespaceName
      value: "my-servicebus.servicebus.windows.net"
    - name: azureTenantId
      secretKeyRef:
        name: azure-sp-credentials
        key: tenantId
    - name: azureClientId
      secretKeyRef:
        name: azure-sp-credentials
        key: clientId
    - name: azureClientSecret
      secretKeyRef:
        name: azure-sp-credentials
        key: clientSecret
```

## Using Managed Identity on AKS

For AKS clusters, use managed identity to avoid credential management entirely:

```bash
# Enable managed identity on the AKS node pool
az aks update --resource-group myRG --name myAKS \
  --enable-managed-identity

# Assign roles to the managed identity
IDENTITY_ID=$(az aks show --resource-group myRG --name myAKS \
  --query identityProfile.kubeletidentity.objectId -o tsv)

az role assignment create \
  --assignee $IDENTITY_ID \
  --role "Azure Service Bus Data Owner" \
  --scope /subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.ServiceBus/namespaces/my-servicebus
```

Configure the Dapr component to use managed identity:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
    - name: namespaceName
      value: "my-servicebus.servicebus.windows.net"
    # Omit azureClientId to use system-assigned managed identity
    # Set azureClientId to the client ID for user-assigned managed identity
```

## Verifying Authentication

Test that the component authenticates correctly:

```bash
# Publish a test message
curl -X POST http://localhost:3500/v1.0/publish/servicebus-pubsub/my-topic \
  -H "Content-Type: application/json" \
  -d '{"test": "azure-ad-auth"}'

# Check sidecar logs for auth errors
kubectl logs <pod-name> -c daprd | grep -i "azure\|auth\|token"
```

## Summary

Dapr integrates with Azure Active Directory through service principals and managed identities, eliminating the need for connection strings in component configuration. Use managed identity on AKS for the most secure setup - no secrets to rotate or manage. For non-AKS environments, use a service principal with credentials stored in a Kubernetes secret referenced by the component.
