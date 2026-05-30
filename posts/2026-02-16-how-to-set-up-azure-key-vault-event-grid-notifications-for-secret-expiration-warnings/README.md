# How to Set Up Azure Key Vault Event Grid Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Key Vault, Event Grid, Notification, Secrets Management, Automation, Monitoring

Description: Learn how to configure Azure Event Grid subscriptions on Key Vault to receive notifications when secrets, keys, or certificates are about to expire.

---

Expired secrets are one of the most common causes of production outages. An application suddenly stops working because the connection string stored in Key Vault expired, and nobody noticed. Azure Key Vault integrates with Azure Event Grid to emit events when secrets, keys, and certificates are nearing expiration. You can subscribe to these events and trigger notifications, auto-rotation logic, or incident creation.

This guide walks through setting up Event Grid subscriptions on Key Vault, routing events to different destinations, and building a practical notification pipeline.

## How Key Vault Event Grid Integration Works

Azure Key Vault publishes several event types to Event Grid:

- **Microsoft.KeyVault.SecretNearExpiry:** Fired 30 days before a secret expires
- **Microsoft.KeyVault.SecretExpired:** Fired when a secret actually expires
- **Microsoft.KeyVault.SecretNewVersionCreated:** Fired when a new version of a secret is created
- **Microsoft.KeyVault.KeyNearExpiry:** Fired when a key is about to expire; the event time can be configured using the key rotation policy
- **Microsoft.KeyVault.KeyExpired:** Key expiration
- **Microsoft.KeyVault.KeyNewVersionCreated:** New key version
- **Microsoft.KeyVault.CertificateNearExpiry:** Certificate approaching expiration
- **Microsoft.KeyVault.CertificateExpired:** Certificate expired
- **Microsoft.KeyVault.VaultAccessPolicyChanged:** Access policy modification

The "NearExpiry" events are the most useful for proactive alerting. Secret and certificate near-expiry events fire 30 days before expiration, giving your team time to rotate the secret or certificate.

## Prerequisites

- An Azure Key Vault with at least one secret that has an expiration date set
- Permissions to create Event Grid subscriptions (Contributor on the Key Vault or the Event Grid EventSubscription Contributor role)
- A destination for events (email, Logic App, Function App, webhook, etc.)

## Step 1: Register the Event Grid Resource Provider

If you have never used Event Grid in your subscription, you may need to register the provider:

```bash
# Register the Event Grid resource provider

az provider register --namespace Microsoft.EventGrid

# Check registration status - wait until it shows "Registered"
az provider show --namespace Microsoft.EventGrid --query "registrationState"
```

## Step 2: Set Expiration Dates on Your Secrets

Event Grid only fires NearExpiry events for secrets that actually have an expiration date set. Many organizations create secrets without setting expiry, which defeats the purpose of these notifications.

```bash
# Create a secret with an expiration date
# The expiration is set as a UTC datetime
az keyvault secret set \
  --vault-name myKeyVault \
  --name "DatabaseConnectionString" \
  --value "Server=myserver;Database=mydb;Password=secret123" \
  --expires "2026-06-15T00:00:00Z"

# Update an existing secret to add an expiration date
az keyvault secret set-attributes \
  --vault-name myKeyVault \
  --name "APIKey" \
  --expires "2026-04-01T00:00:00Z"

# List secrets with their expiration dates
az keyvault secret list \
  --vault-name myKeyVault \
  --query "[].{Name:name, Expires:attributes.expires, Enabled:attributes.enabled}" \
  --output table
```

## Step 3: Create an Event Grid Subscription with Email Notification

The simplest destination for testing is an email endpoint via a Logic App. But let me show you the direct Event Grid subscription approach first, routing to a webhook:

```bash
# Create an Event Grid subscription for secret near-expiry events
# This routes to a webhook endpoint (could be a Function App, Logic App HTTP trigger, etc.)
az eventgrid event-subscription create \
  --name "secret-expiry-alert" \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault" \
  --endpoint "https://myfunction.azurewebsites.net/api/HandleKeyVaultEvent" \
  --included-event-types \
    "Microsoft.KeyVault.SecretNearExpiry" \
    "Microsoft.KeyVault.SecretExpired" \
    "Microsoft.KeyVault.CertificateNearExpiry" \
    "Microsoft.KeyVault.CertificateExpired"
```

## Step 4: Route Events to a Logic App for Email Alerts

For a notification pipeline that sends emails, use a Logic App as the event handler. This does not require writing code.

First, create the Logic App:

```bash
# Create a resource group for the notification infrastructure
az group create --name rg-keyvault-alerts --location eastus

# Create a Logic App (consumption tier)
az logic workflow create \
  --name "keyvault-expiry-notifier" \
  --resource-group "rg-keyvault-alerts" \
  --location "eastus" \
  --definition @logic-app-definition.json
```

The Logic App workflow should have this structure:

1. **Trigger:** "When an Event Grid event occurs" (Event Grid trigger)
2. **Parse JSON:** Parse the event data to extract secret name and expiry date
3. **Condition:** Check if the event type is NearExpiry or Expired
4. **Send Email:** Use the Office 365 or SendGrid connector to send a notification

For production, create the Event Grid trigger and email action in the Logic Apps designer so Azure can create the required API connection resources. The workflow definition that gets deployed by `az logic workflow create --definition @logic-app-definition.json` must be valid JSON. It should look like this structure after the Event Grid and email connector connections have been configured:

```json
{
  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "$connections": {
      "type": "Object",
      "defaultValue": {}
    }
  },
  "triggers": {
    "When_a_resource_event_occurs": {
      "type": "ApiConnectionWebhook",
      "inputs": {
        "host": {
          "connection": {
            "name": "@parameters('$connections')['azureeventgrid']['connectionId']"
          }
        },
        "body": {
          "properties": {
            "topic": "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault",
            "filter": {
              "includedEventTypes": [
                "Microsoft.KeyVault.SecretNearExpiry",
                "Microsoft.KeyVault.SecretExpired"
              ]
            }
          }
        }
      }
    }
  },
  "actions": {
    "Send_email": {
      "type": "ApiConnection",
      "inputs": {
        "host": {
          "connection": {
            "name": "@parameters('$connections')['office365']['connectionId']"
          }
        },
        "method": "post",
        "body": {
          "To": "security-team@contoso.com",
          "Subject": "Key Vault Secret Expiry Alert: @{triggerBody()?['subject']}",
          "Body": "Event: @{triggerBody()?['eventType']}\nSecret: @{triggerBody()?['subject']}\nVault: @{triggerBody()?['topic']}\nTime: @{triggerBody()?['eventTime']}"
        }
      }
    }
  }
}
```

When you save a Logic App workflow that uses the Event Grid trigger, Azure creates and manages the Event Grid subscription for that trigger. Do not create a second subscription with `--endpoint-type azurefunction`; that endpoint type is only for Azure Function destinations. If you use a Logic App HTTP Request trigger instead of the Event Grid trigger, create the Event Grid subscription as a webhook destination and use the trigger's callback URL as the endpoint:

```bash
# Get the Logic App HTTP Request trigger callback URL
LOGIC_APP_CALLBACK_URL=$(az rest \
  --method post \
  --uri "$(az logic workflow show \
  --name "keyvault-expiry-notifier" \
  --resource-group "rg-keyvault-alerts" \
  --query "id" --output tsv)/triggers/manual/listCallbackUrl?api-version=2016-06-01" \
  --query "value" --output tsv)

# Create the Event Grid subscription targeting the Logic App HTTP endpoint
az eventgrid event-subscription create \
  --name "secret-expiry-to-logic-app" \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault" \
  --endpoint-type "webhook" \
  --endpoint "$LOGIC_APP_CALLBACK_URL" \
  --included-event-types \
    "Microsoft.KeyVault.SecretNearExpiry" \
    "Microsoft.KeyVault.SecretExpired"
```

## Step 5: Route Events to an Azure Function for Auto-Rotation

For automated secret rotation, an Azure Function is a better destination than a Logic App. The function can receive the near-expiry event, generate a new secret value, and update it in Key Vault.

Here is a Python Azure Function that handles the event:

```python
import azure.functions as func
import logging
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from datetime import datetime, timedelta, timezone

# This function handles Key Vault SecretNearExpiry events
# It reads the expiring secret and creates a new version with extended expiry
def main(event: func.EventGridEvent):
    logging.info(f"Received event: {event.event_type}")

    # Parse the event data
    data = event.get_json()
    secret_name = data.get("ObjectName")
    vault_uri = data.get("VaultName")

    logging.info(f"Secret '{secret_name}' in vault '{vault_uri}' is near expiry")

    # Connect to Key Vault using managed identity
    credential = DefaultAzureCredential()
    client = SecretClient(vault_url=f"https://{vault_uri}.vault.azure.net", credential=credential)

    # Get the current secret value
    current_secret = client.get_secret(secret_name)

    # Generate a new secret value - replace this with your actual rotation logic
    # For database passwords, you would update the database first, then Key Vault
    new_value = rotate_secret_value(secret_name, current_secret.value)

    # Set the new secret with a new expiration date (90 days from now)
    new_expiry = datetime.now(timezone.utc) + timedelta(days=90)
    client.set_secret(
        secret_name,
        new_value,
        expires_on=new_expiry,
        content_type=current_secret.properties.content_type
    )

    logging.info(f"Secret '{secret_name}' rotated. New expiry: {new_expiry}")

def rotate_secret_value(name, current_value):
    # Implement your rotation logic here
    # This is where you would call the service API to generate a new credential
    # For example, regenerate a storage account key or database password
    raise NotImplementedError("Replace this with service-specific rotation logic")
```

## Step 6: Monitor Event Delivery

Event Grid provides delivery metrics so you can verify events are being sent and received:

```bash
# Check Event Grid subscription delivery status
az eventgrid event-subscription show \
  --name "secret-expiry-alert" \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault" \
  --include-full-endpoint-url
```

In the portal, go to the Event Grid subscription and check the Metrics tab. You will see:

- **Published events:** Events that Key Vault emitted
- **Matched events:** Events that matched your subscription filter
- **Delivery succeeded:** Events successfully delivered to your endpoint
- **Delivery failed:** Events that could not be delivered

If delivery is failing, check that your endpoint is reachable and responding with a 200 status code within 30 seconds.

## Handling Dead-Lettered Events

Configure dead-lettering so failed event deliveries are stored for later processing instead of being lost:

```bash
# Create a storage account for dead-lettered events
az storage account create \
  --name kveventsdeadletter \
  --resource-group rg-keyvault-alerts \
  --location eastus \
  --sku Standard_LRS

# Create a container for dead-lettered events
az storage container create \
  --name deadletter \
  --account-name kveventsdeadletter

# Update the event subscription with dead-letter destination
az eventgrid event-subscription update \
  --name "secret-expiry-alert" \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault" \
  --deadletter-endpoint "/subscriptions/{sub-id}/resourceGroups/rg-keyvault-alerts/providers/Microsoft.Storage/storageAccounts/kveventsdeadletter/blobServices/default/containers/deadletter"
```

## Testing the Setup

You do not want to wait 30 days to see if your near-expiry notification works. Create a test secret with a short expiration:

```bash
# Create a secret that expires very soon (for testing)
# NearExpiry fires 30 days before expiration by default
# So set expiration to ~29 days from now to trigger it quickly
EXPIRY_DATE=$(date -u -d "+29 days" +"%Y-%m-%dT%H:%M:%SZ")

az keyvault secret set \
  --vault-name myKeyVault \
  --name "test-expiry-notification" \
  --value "test-value" \
  --expires "$EXPIRY_DATE"
```

Note that Event Grid events are not instantaneous after the secret is created. Key Vault checks for near-expiry conditions periodically (typically once per day). It might take up to 24 hours for the first NearExpiry event to fire.

## Best Practices

- Set expiration dates on every secret, key, and certificate. Without an expiry date, you get no near-expiry events.
- Use a shared mailbox or distribution list as the email destination, not an individual's email.
- Configure dead-lettering on all event subscriptions so you do not lose events during endpoint outages.
- Test your pipeline end-to-end at least once per quarter.
- Combine event-driven alerts with a scheduled scan that checks for secrets without expiry dates set. Event Grid only helps with secrets that have dates.
- Keep rotation logic idempotent. If the same near-expiry event is delivered twice (Event Grid guarantees at-least-once delivery), your rotation function should handle that gracefully.

## Summary

Azure Key Vault and Event Grid together solve the "expired secret" problem proactively. Set expiration dates on your secrets, subscribe to NearExpiry and Expired events, route them to email notifications or auto-rotation functions, and you will catch expiring credentials before they cause outages. The setup takes about 30 minutes, and it can save you from hours of downtime troubleshooting.
