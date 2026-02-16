# How to Achieve HIPAA Compliance in Azure with Proper Service Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, HIPAA, Compliance, Healthcare, Security, Data Protection, Regulatory

Description: Configure Azure services to meet HIPAA compliance requirements for protecting electronic Protected Health Information with proper encryption, access controls, and auditing.

---

If your organization handles electronic Protected Health Information (ePHI) in the United States, you must comply with the Health Insurance Portability and Accountability Act (HIPAA) and its Security Rule. Azure provides the infrastructure and services to build HIPAA-compliant solutions, but compliance is not automatic. You need to configure services correctly, implement proper access controls, and maintain audit trails.

In this post, I will walk through the specific Azure configurations needed to meet HIPAA requirements, covering the Business Associate Agreement, encryption, access controls, network security, auditing, and operational safeguards.

## The Business Associate Agreement (BAA)

Before anything else, you need a Business Associate Agreement with Microsoft. As a cloud provider handling ePHI on your behalf, Microsoft is considered a Business Associate under HIPAA. The BAA is included in the Microsoft Online Services Terms and covers most Azure services.

To verify the BAA covers your services, check the Microsoft Trust Center. Key covered services include:

- Azure Virtual Machines
- Azure SQL Database
- Azure Cosmos DB
- Azure Storage
- Azure App Service
- Azure Functions
- Azure Key Vault
- Azure Active Directory / Entra ID

Not all Azure services are covered by the BAA. Before using a service for ePHI workloads, verify it is listed as a HIPAA-eligible service.

## Encryption Requirements

HIPAA requires encryption of ePHI both at rest and in transit.

### Encryption at Rest

All Azure services encrypt data at rest by default using Microsoft-managed keys. For HIPAA, you may want to use customer-managed keys (CMK) for additional control:

```bash
# Create a Key Vault for customer-managed encryption keys
az keyvault create \
  --resource-group hipaa-rg \
  --name hipaa-keyvault \
  --location eastus \
  --sku premium \
  --enable-soft-delete true \
  --enable-purge-protection true \
  --retention-days 90

# Create an encryption key
az keyvault key create \
  --vault-name hipaa-keyvault \
  --name storage-encryption-key \
  --kty RSA \
  --size 2048

# Configure storage account with customer-managed key
az storage account update \
  --resource-group hipaa-rg \
  --name hipaastorageaccount \
  --encryption-key-name storage-encryption-key \
  --encryption-key-vault "https://hipaa-keyvault.vault.azure.net/" \
  --encryption-key-source Microsoft.Keyvault

# Configure Azure SQL with Transparent Data Encryption using CMK
az sql server tde-key set \
  --resource-group hipaa-rg \
  --server hipaa-sql-server \
  --server-key-type AzureKeyVault \
  --kid "https://hipaa-keyvault.vault.azure.net/keys/sql-encryption-key/version"
```

### Encryption in Transit

Enforce TLS 1.2 minimum on all services:

```bash
# Enforce TLS 1.2 on Storage accounts
az storage account update \
  --resource-group hipaa-rg \
  --name hipaastorageaccount \
  --min-tls-version TLS1_2 \
  --https-only true

# Enforce TLS 1.2 on Azure SQL
az sql server update \
  --resource-group hipaa-rg \
  --name hipaa-sql-server \
  --minimal-tls-version 1.2

# Enforce TLS 1.2 on App Service
az webapp config set \
  --resource-group hipaa-rg \
  --name hipaa-web-app \
  --min-tls-version 1.2 \
  --ftps-state Disabled
```

## Access Controls

HIPAA requires strict access controls with the principle of minimum necessary access.

### Role-Based Access Control

Use Azure RBAC with custom roles that limit access to only what is needed:

```bash
# Create a custom role for healthcare application operators
# They can manage the app but cannot access the database directly
az role definition create --role-definition '{
  "Name": "HIPAA App Operator",
  "Description": "Can manage HIPAA application resources but not access data directly",
  "Actions": [
    "Microsoft.Web/sites/read",
    "Microsoft.Web/sites/restart/action",
    "Microsoft.Web/sites/slots/read",
    "Microsoft.Insights/metrics/read",
    "Microsoft.Insights/diagnosticSettings/read"
  ],
  "NotActions": [
    "Microsoft.Sql/*/read",
    "Microsoft.Storage/storageAccounts/listKeys/action",
    "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read"
  ],
  "AssignableScopes": [
    "/subscriptions/{subscription-id}/resourceGroups/hipaa-rg"
  ]
}'
```

### Conditional Access Policies

Require multi-factor authentication and compliant devices for accessing HIPAA resources:

```json
{
  "displayName": "HIPAA Resource Access Policy",
  "state": "enabled",
  "conditions": {
    "applications": {
      "includeApplications": ["All"]
    },
    "users": {
      "includeGroups": ["hipaa-users-group-id"]
    }
  },
  "grantControls": {
    "operator": "AND",
    "builtInControls": [
      "mfa",
      "compliantDevice"
    ]
  },
  "sessionControls": {
    "signInFrequency": {
      "value": 8,
      "type": "hours",
      "isEnabled": true
    }
  }
}
```

## Network Security

Isolate HIPAA workloads in their own network segments with strict access controls:

```bash
# Create a dedicated VNet for HIPAA workloads
az network vnet create \
  --resource-group hipaa-rg \
  --name hipaa-vnet \
  --address-prefix 10.100.0.0/16

# Create subnets with NSGs
az network vnet subnet create \
  --resource-group hipaa-rg \
  --vnet-name hipaa-vnet \
  --name app-subnet \
  --address-prefix 10.100.1.0/24

az network vnet subnet create \
  --resource-group hipaa-rg \
  --vnet-name hipaa-vnet \
  --name data-subnet \
  --address-prefix 10.100.2.0/24

# Create an NSG that restricts data subnet access
az network nsg create \
  --resource-group hipaa-rg \
  --name data-subnet-nsg

# Only allow traffic from the app subnet to the data subnet
az network nsg rule create \
  --resource-group hipaa-rg \
  --nsg-name data-subnet-nsg \
  --name allow-app-to-data \
  --priority 100 \
  --direction Inbound \
  --source-address-prefixes 10.100.1.0/24 \
  --destination-port-ranges 1433 \
  --protocol TCP \
  --access Allow

# Deny all other inbound traffic to data subnet
az network nsg rule create \
  --resource-group hipaa-rg \
  --nsg-name data-subnet-nsg \
  --name deny-all-inbound \
  --priority 4096 \
  --direction Inbound \
  --source-address-prefixes "*" \
  --destination-port-ranges "*" \
  --protocol "*" \
  --access Deny
```

### Private Endpoints

Use private endpoints for all PaaS services that store ePHI:

```bash
# Create a private endpoint for Azure SQL
az network private-endpoint create \
  --resource-group hipaa-rg \
  --name sql-private-endpoint \
  --vnet-name hipaa-vnet \
  --subnet data-subnet \
  --private-connection-resource-id $(az sql server show \
    --resource-group hipaa-rg \
    --name hipaa-sql-server \
    --query id --output tsv) \
  --group-ids sqlServer \
  --connection-name sql-connection

# Disable public access to the SQL server
az sql server update \
  --resource-group hipaa-rg \
  --name hipaa-sql-server \
  --enable-public-network false

# Create a private endpoint for Storage
az network private-endpoint create \
  --resource-group hipaa-rg \
  --name storage-private-endpoint \
  --vnet-name hipaa-vnet \
  --subnet data-subnet \
  --private-connection-resource-id $(az storage account show \
    --resource-group hipaa-rg \
    --name hipaastorageaccount \
    --query id --output tsv) \
  --group-ids blob \
  --connection-name blob-connection
```

## Audit Logging

HIPAA requires detailed audit trails of who accessed ePHI and what they did with it.

### Enable Diagnostic Logging

```bash
# Enable diagnostic logging for Azure SQL - captures all access events
az monitor diagnostic-settings create \
  --resource $(az sql server show \
    --resource-group hipaa-rg \
    --name hipaa-sql-server \
    --query id --output tsv) \
  --name hipaa-sql-diagnostics \
  --workspace $LOG_ANALYTICS_ID \
  --logs '[
    {"category": "SQLSecurityAuditEvents", "enabled": true, "retentionPolicy": {"days": 365, "enabled": true}},
    {"category": "SQLInsights", "enabled": true, "retentionPolicy": {"days": 365, "enabled": true}},
    {"category": "AutomaticTuning", "enabled": true}
  ]'

# Enable Activity Log forwarding
az monitor diagnostic-settings create \
  --name hipaa-activity-log \
  --resource "/subscriptions/{subscription-id}" \
  --workspace $LOG_ANALYTICS_ID \
  --logs '[
    {"category": "Administrative", "enabled": true},
    {"category": "Security", "enabled": true},
    {"category": "Alert", "enabled": true},
    {"category": "Policy", "enabled": true}
  ]'

# Enable Key Vault logging - tracks all key and secret access
az monitor diagnostic-settings create \
  --resource $(az keyvault show \
    --name hipaa-keyvault \
    --query id --output tsv) \
  --name hipaa-kv-diagnostics \
  --workspace $LOG_ANALYTICS_ID \
  --logs '[
    {"category": "AuditEvent", "enabled": true, "retentionPolicy": {"days": 365, "enabled": true}}
  ]'
```

### Log Retention

HIPAA requires audit logs to be retained for at least 6 years. Configure Log Analytics and storage account retention accordingly:

```bash
# Set Log Analytics workspace retention to 365 days
az monitor log-analytics workspace update \
  --resource-group hipaa-rg \
  --workspace-name hipaa-logs \
  --retention-time 365

# For longer retention, export to immutable storage
az storage account create \
  --resource-group hipaa-rg \
  --name hipaaauditlogs \
  --sku Standard_GRS \
  --kind StorageV2

# Enable immutable storage to prevent log tampering
az storage container immutability-policy create \
  --resource-group hipaa-rg \
  --account-name hipaaauditlogs \
  --container-name audit-logs \
  --period 2190
```

## Azure Policy for HIPAA

Use the HIPAA HITRUST initiative to automatically assess compliance:

```bash
# Assign the HIPAA HITRUST 9.2 policy initiative
az policy assignment create \
  --name "hipaa-hitrust" \
  --scope "/subscriptions/{subscription-id}" \
  --policy-set-definition "/providers/Microsoft.Authorization/policySetDefinitions/a169a624-5599-4385-a696-c8d643089fab" \
  --mi-system-assigned \
  --identity-scope "/subscriptions/{subscription-id}" \
  --location eastus
```

This initiative includes over 100 policies that check your configuration against HIPAA HITRUST controls.

## Breach Notification

HIPAA requires notification within 60 days of discovering a breach. Set up automated alerts:

```bash
# Alert on unusual access patterns
az monitor scheduled-query create \
  --resource-group hipaa-rg \
  --name "unusual-data-access" \
  --scopes $LOG_ANALYTICS_ID \
  --condition "count > 100" \
  --condition-query "
    AzureDiagnostics
    | where Category == 'SQLSecurityAuditEvents'
    | where action_name_s == 'SELECT'
    | summarize AccessCount = count() by client_ip_s, bin(TimeGenerated, 1h)
    | where AccessCount > 100
  " \
  --evaluation-frequency 15m \
  --window-size 1h \
  --action-groups $SECURITY_TEAM_ACTION_GROUP \
  --severity 1
```

## Summary

Achieving HIPAA compliance in Azure requires a layered approach: sign the BAA, encrypt everything at rest and in transit with customer-managed keys, implement strict RBAC and conditional access, isolate HIPAA workloads in private networks, enable comprehensive audit logging with long-term retention, and continuously assess your configuration using the HIPAA HITRUST policy initiative. Remember that Azure provides the tools, but compliance is your responsibility. Regularly review your configurations, conduct risk assessments, and train your staff on HIPAA requirements.
