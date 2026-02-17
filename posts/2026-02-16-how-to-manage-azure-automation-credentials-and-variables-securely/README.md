# How to Manage Azure Automation Credentials and Variables Securely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Automation, Security, Credentials, Key Vault, Secrets Management, DevOps

Description: Best practices for managing credentials, variables, and secrets in Azure Automation runbooks without exposing sensitive data.

---

Every automation script eventually needs to interact with something that requires authentication - a database, an API, a third-party service, or an on-premises system. How you handle those credentials in Azure Automation makes the difference between a secure deployment and a breach waiting to happen. Hardcoding passwords in scripts is obviously bad, but even some of the "proper" approaches have pitfalls if you do not configure them correctly.

In this post, I will cover the three main approaches for managing secrets in Azure Automation: managed identities, Automation credentials and variables, and Azure Key Vault integration. I will also walk through the security considerations for each.

## Approach 1: Managed Identities (Preferred for Azure Resources)

If your runbook needs to interact with Azure resources, a managed identity is the best option. There are no credentials to manage at all - Azure handles the authentication automatically.

### System-Assigned Managed Identity

Every Automation account can have a system-assigned managed identity. Enable it when you create the account or add it later:

```bash
# Enable system-assigned managed identity on an existing Automation account
az automation account update \
  --resource-group rg-automation \
  --name aa-operations \
  --assign-identity
```

Use it in your runbooks:

```powershell
# Authenticate using the system-assigned managed identity
# No credentials needed - Azure provides the token automatically
Connect-AzAccount -Identity

# Now you can call any Azure API the identity has permissions for
$vms = Get-AzVM
Write-Output "Found $($vms.Count) VMs"
```

### User-Assigned Managed Identity

If you need different runbooks to use different identities (for example, different permission sets), use user-assigned managed identities:

```bash
# Create a user-assigned managed identity
az identity create \
  --resource-group rg-automation \
  --name mi-database-admin

# Get the identity's client ID and resource ID
CLIENT_ID=$(az identity show \
  --resource-group rg-automation \
  --name mi-database-admin \
  --query "clientId" -o tsv)

IDENTITY_ID=$(az identity show \
  --resource-group rg-automation \
  --name mi-database-admin \
  --query "id" -o tsv)

# Assign the user-assigned identity to the Automation account
az automation account update \
  --resource-group rg-automation \
  --name aa-operations \
  --assign-identity \
  --identity-type SystemAssigned,UserAssigned \
  --user-assigned "$IDENTITY_ID"
```

In the runbook, specify which identity to use:

```powershell
# Connect using a specific user-assigned managed identity
# The -AccountId parameter specifies which identity to use
Connect-AzAccount -Identity -AccountId "<client-id-of-user-assigned-identity>"
```

## Approach 2: Automation Credentials and Variables

For non-Azure services where managed identities do not apply (third-party APIs, on-premises systems, etc.), Azure Automation provides built-in credential and variable assets.

### Automation Credentials

Credentials store a username and password pair encrypted at rest:

```bash
# Create a credential in Azure Automation
# The password is encrypted and stored securely
az automation credential create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name "SMTP-Credentials" \
  --user-name "alerts@company.com" \
  --password "YourSecurePassword123!"
```

Use it in a runbook:

```powershell
# Retrieve the credential from Azure Automation
# The password is decrypted at runtime but never exposed in logs
$smtpCred = Get-AutomationPSCredential -Name "SMTP-Credentials"

# Use the credential to send email
$mailParams = @{
    From       = $smtpCred.UserName
    To         = "ops-team@company.com"
    Subject    = "Automation Report"
    Body       = "Your weekly report is attached."
    SmtpServer = "smtp.company.com"
    Port       = 587
    UseSsl     = $true
    Credential = $smtpCred
}

Send-MailMessage @mailParams
Write-Output "Email sent successfully"
```

### Automation Variables

Variables store individual values. They can be encrypted or unencrypted:

```bash
# Create an encrypted variable (for sensitive data like API keys)
# Encrypted variables cannot be read back through the portal or API
az automation variable create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name "SlackWebhookURL" \
  --value '"https://hooks.slack.com/services/T00/B00/xxxx"' \
  --encrypted true

# Create an unencrypted variable (for non-sensitive configuration)
az automation variable create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name "MaintenanceMode" \
  --value '"false"' \
  --encrypted false
```

Use variables in runbooks:

```powershell
# Retrieve an encrypted variable - only works inside a runbook
$webhookUrl = Get-AutomationVariable -Name "SlackWebhookURL"

# Retrieve a non-sensitive variable
$maintenanceMode = Get-AutomationVariable -Name "MaintenanceMode"

if ($maintenanceMode -eq "true") {
    Write-Output "Maintenance mode is active - skipping operations"
    return
}

# Use the webhook URL to send a Slack notification
$body = @{
    text = "Automation runbook completed successfully"
} | ConvertTo-Json

Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $body -ContentType "application/json"
```

### Security Considerations for Automation Assets

Encrypted variables and credential passwords have important properties:

- They are encrypted at rest using a per-account encryption key
- They can only be decrypted inside a runbook running in the same Automation account
- They cannot be read through the Azure portal, REST API, or CLI after creation
- However, anyone with Contributor access to the Automation account can create a runbook that reads and outputs the values

That last point is critical. Automation credentials and variables are only as secure as the access controls on the Automation account itself.

## Approach 3: Azure Key Vault Integration (Most Secure)

For maximum security and centralized secret management, integrate your runbooks with Azure Key Vault:

```bash
# Create a Key Vault
az keyvault create \
  --resource-group rg-automation \
  --name kv-automation-secrets \
  --location eastus

# Store a secret in Key Vault
az keyvault secret set \
  --vault-name kv-automation-secrets \
  --name "DatabaseConnectionString" \
  --value "Server=tcp:myserver.database.windows.net;Database=mydb;Authentication=Active Directory Default;"

# Grant the Automation account's managed identity access to the Key Vault
PRINCIPAL_ID=$(az automation account show \
  --resource-group rg-automation \
  --name aa-operations \
  --query "identity.principalId" -o tsv)

az keyvault set-policy \
  --name kv-automation-secrets \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list
```

Use Key Vault in your runbooks:

```powershell
# Runbook: Get-DatabaseReport
# Purpose: Connect to a database using credentials stored in Key Vault
# Uses managed identity to access Key Vault, then uses the retrieved secret

# Authenticate with managed identity
Connect-AzAccount -Identity

# Retrieve the secret from Key Vault
# The managed identity must have 'get' permission on secrets
$secret = Get-AzKeyVaultSecret `
    -VaultName "kv-automation-secrets" `
    -Name "DatabaseConnectionString" `
    -AsPlainText

# Use the connection string
# Note: Never Write-Output the secret value
$connection = New-Object System.Data.SqlClient.SqlConnection($secret)
$connection.Open()

$command = $connection.CreateCommand()
$command.CommandText = "SELECT COUNT(*) AS TotalOrders FROM Orders WHERE OrderDate >= DATEADD(day, -7, GETDATE())"
$result = $command.ExecuteScalar()

Write-Output "Orders in the last 7 days: $result"

$connection.Close()
```

### Why Key Vault is Better

Key Vault offers several advantages over Automation credentials and variables:

- **Centralized management**: One place to manage secrets used across multiple Automation accounts, applications, and services
- **Access policies**: Granular control over who and what can read, write, or manage secrets
- **Audit logging**: Every secret access is logged in Key Vault's diagnostic logs
- **Rotation**: Secrets can be rotated in Key Vault without updating runbooks
- **Expiration**: Set expiration dates on secrets so they do not live forever
- **RBAC support**: Use Azure RBAC (Key Vault Secrets User role) for fine-grained access control

## Secret Rotation Patterns

Regardless of which approach you use, secrets need to be rotated regularly.

### Automated Rotation with Key Vault

Key Vault supports automatic rotation for certain secret types. For custom secrets, you can build a rotation runbook:

```powershell
# Runbook: Rotate-APIKey
# Purpose: Rotate an API key and update it in Key Vault
# Schedule this to run monthly

Connect-AzAccount -Identity

# Get the current API key
$currentKey = Get-AzKeyVaultSecret `
    -VaultName "kv-automation-secrets" `
    -Name "ThirdPartyAPIKey" `
    -AsPlainText

# Call the third-party API to generate a new key
# This is API-specific and varies by provider
$headers = @{
    "Authorization" = "Bearer $currentKey"
    "Content-Type"  = "application/json"
}
$response = Invoke-RestMethod `
    -Uri "https://api.thirdparty.com/v1/keys/rotate" `
    -Method Post `
    -Headers $headers

$newKey = $response.newApiKey

# Store the new key in Key Vault
# The old version is automatically retained as a previous version
$secureNewKey = ConvertTo-SecureString $newKey -AsPlainText -Force
Set-AzKeyVaultSecret `
    -VaultName "kv-automation-secrets" `
    -Name "ThirdPartyAPIKey" `
    -SecretValue $secureNewKey

Write-Output "API key rotated successfully at $(Get-Date)"
```

## Security Best Practices Summary

1. **Use managed identities wherever possible.** They eliminate the need to manage credentials entirely for Azure resources.

2. **Never use Write-Output with secret values.** Runbook output is stored in job logs and visible to anyone with access to the Automation account.

3. **Prefer Key Vault over Automation variables for sensitive data.** Key Vault gives you audit logging and granular access control that Automation assets lack.

4. **Lock down Automation account access.** Use Azure RBAC to limit who can create and edit runbooks. A malicious runbook could exfiltrate any credential or variable stored in the account.

5. **Enable diagnostic logging.** Turn on diagnostic logs for both the Automation account and Key Vault so you have an audit trail of secret access.

6. **Set secret expiration dates.** Both Key Vault secrets and Automation credentials should have documented expiration and rotation schedules.

7. **Use separate Key Vaults for different environments.** Do not share a Key Vault between production and development. This limits the blast radius if dev credentials are compromised.

8. **Review access regularly.** Audit who has access to your Automation accounts and Key Vaults quarterly.

## Wrapping Up

Managing secrets in Azure Automation comes down to choosing the right tool for each situation. Use managed identities for Azure resource access, Automation credentials and variables for simple integrations with non-Azure services, and Key Vault for anything that needs centralized management, audit logging, or rotation. The combination of managed identity authentication to Key Vault gives you a credential-free chain from your runbook all the way to the secret store, which is the most secure pattern available today.
