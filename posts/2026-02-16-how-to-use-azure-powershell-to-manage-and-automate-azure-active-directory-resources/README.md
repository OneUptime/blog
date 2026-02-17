# How to Use Azure PowerShell to Manage and Automate Azure Active Directory Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure PowerShell, Azure Active Directory, Automation, Identity Management, DevOps, Entra ID

Description: Use Azure PowerShell modules to automate user management, group operations, and app registrations in Azure Active Directory.

---

Managing Azure Active Directory (now Microsoft Entra ID) through the portal is fine when you are dealing with a handful of users. But when you need to onboard 50 new employees, audit group memberships across the organization, or rotate app registration secrets on a schedule, clicking through the UI becomes impractical. Azure PowerShell gives you the scripting capability to handle these tasks at scale.

This guide covers the setup, the key cmdlets you will use daily, and practical scripts for the most common AD management scenarios.

## Prerequisites and Module Installation

Azure AD management in PowerShell has gone through a transition. The older `AzureAD` module is being deprecated in favor of the Microsoft Graph PowerShell SDK. For new automation work, you should use the `Microsoft.Graph` modules.

Install the required modules:

```powershell
# Install the Microsoft Graph PowerShell modules for identity management
Install-Module Microsoft.Graph.Users -Scope CurrentUser -Force
Install-Module Microsoft.Graph.Groups -Scope CurrentUser -Force
Install-Module Microsoft.Graph.Applications -Scope CurrentUser -Force
Install-Module Microsoft.Graph.Identity.DirectoryManagement -Scope CurrentUser -Force
```

If you are working in an environment where the legacy `AzureAD` module is still in use, you can install it alongside the Graph modules. They do not conflict:

```powershell
# Legacy module - still works but being phased out
Install-Module AzureAD -Scope CurrentUser -Force
```

## Connecting to Microsoft Graph

Before running any commands, you need to authenticate. The connection process uses OAuth and supports several authentication flows depending on your scenario.

For interactive use:

```powershell
# Connect interactively - a browser window will open for sign-in
Connect-MgGraph -Scopes "User.ReadWrite.All", "Group.ReadWrite.All", "Application.ReadWrite.All"
```

For automation scenarios (service principals, CI/CD pipelines):

```powershell
# Connect using a client secret for unattended automation
$tenantId = "your-tenant-id"
$clientId = "your-app-registration-client-id"
$clientSecret = ConvertTo-SecureString "your-secret" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($clientId, $clientSecret)

Connect-MgGraph -TenantId $tenantId -ClientSecretCredential $credential
```

After connecting, verify your session:

```powershell
# Check the current connection context
Get-MgContext
```

## Managing Users

### Creating Users

Here is a script that creates a new user with all the standard properties:

```powershell
# Create a new user with a temporary password
$passwordProfile = @{
    Password = "TempP@ss2026!"
    ForceChangePasswordNextSignIn = $true
}

$newUser = New-MgUser `
    -DisplayName "Jane Smith" `
    -UserPrincipalName "jane.smith@contoso.com" `
    -MailNickname "jane.smith" `
    -AccountEnabled `
    -PasswordProfile $passwordProfile `
    -Department "Engineering" `
    -JobTitle "Senior Developer" `
    -UsageLocation "US"

Write-Output "Created user: $($newUser.UserPrincipalName) with ID: $($newUser.Id)"
```

### Bulk User Creation

For onboarding multiple users at once, read from a CSV file:

```powershell
# Bulk create users from a CSV file
# CSV should have columns: DisplayName, UserPrincipalName, Department, JobTitle
$users = Import-Csv -Path "new-users.csv"

foreach ($user in $users) {
    $passwordProfile = @{
        Password = "TempP@ss2026!"
        ForceChangePasswordNextSignIn = $true
    }

    try {
        $created = New-MgUser `
            -DisplayName $user.DisplayName `
            -UserPrincipalName $user.UserPrincipalName `
            -MailNickname ($user.UserPrincipalName -split "@")[0] `
            -AccountEnabled `
            -PasswordProfile $passwordProfile `
            -Department $user.Department `
            -JobTitle $user.JobTitle `
            -UsageLocation "US"

        Write-Output "Created: $($created.UserPrincipalName)"
    }
    catch {
        Write-Warning "Failed to create $($user.UserPrincipalName): $_"
    }
}
```

### Querying Users

Finding and filtering users is something you will do constantly:

```powershell
# Get all users in the Engineering department
$engineers = Get-MgUser -Filter "department eq 'Engineering'" -All

# Get a specific user by UPN
$user = Get-MgUser -UserId "jane.smith@contoso.com"

# Get users who have not signed in for 90 days
$cutoffDate = (Get-Date).AddDays(-90).ToString("yyyy-MM-ddTHH:mm:ssZ")
$inactiveUsers = Get-MgUser -Filter "signInActivity/lastSignInDateTime le $cutoffDate" -All `
    -Property DisplayName,UserPrincipalName,SignInActivity
```

## Managing Groups

### Creating and Populating Groups

```powershell
# Create a security group for the DevOps team
$group = New-MgGroup `
    -DisplayName "DevOps Team" `
    -MailEnabled:$false `
    -MailNickname "devops-team" `
    -SecurityEnabled `
    -Description "Security group for DevOps team members"

# Add members to the group
$memberIds = @(
    "user-object-id-1",
    "user-object-id-2",
    "user-object-id-3"
)

foreach ($memberId in $memberIds) {
    New-MgGroupMember -GroupId $group.Id -DirectoryObjectId $memberId
    Write-Output "Added member: $memberId"
}
```

### Auditing Group Memberships

This script generates a report of all groups and their members:

```powershell
# Export all security groups and their members to CSV
$groups = Get-MgGroup -Filter "securityEnabled eq true" -All
$report = @()

foreach ($group in $groups) {
    $members = Get-MgGroupMember -GroupId $group.Id -All

    foreach ($member in $members) {
        # Get the full user object for each member
        $user = Get-MgUser -UserId $member.Id -ErrorAction SilentlyContinue

        if ($user) {
            $report += [PSCustomObject]@{
                GroupName = $group.DisplayName
                GroupId   = $group.Id
                UserName  = $user.DisplayName
                UserUPN   = $user.UserPrincipalName
                Department = $user.Department
            }
        }
    }
}

$report | Export-Csv -Path "group-membership-audit.csv" -NoTypeInformation
Write-Output "Exported $($report.Count) membership records"
```

## Managing App Registrations

App registrations are critical for service-to-service authentication, and managing their secrets is a common automation task.

### Listing App Registrations with Expiring Secrets

```powershell
# Find all app registrations with secrets expiring in the next 30 days
$apps = Get-MgApplication -All
$expirationThreshold = (Get-Date).AddDays(30)
$expiringApps = @()

foreach ($app in $apps) {
    foreach ($secret in $app.PasswordCredentials) {
        if ($secret.EndDateTime -lt $expirationThreshold -and $secret.EndDateTime -gt (Get-Date)) {
            $expiringApps += [PSCustomObject]@{
                AppName     = $app.DisplayName
                AppId       = $app.AppId
                SecretHint  = $secret.Hint
                ExpiryDate  = $secret.EndDateTime
                DaysLeft    = ($secret.EndDateTime - (Get-Date)).Days
            }
        }
    }
}

# Display results sorted by expiry date
$expiringApps | Sort-Object ExpiryDate | Format-Table -AutoSize
```

### Rotating App Secrets

```powershell
# Rotate a secret for an app registration
$appId = "your-app-object-id"

# Create a new secret with a 6-month validity
$newSecret = Add-MgApplicationPassword -ApplicationId $appId -PasswordCredential @{
    DisplayName = "Rotated-$(Get-Date -Format 'yyyy-MM-dd')"
    EndDateTime = (Get-Date).AddMonths(6)
}

Write-Output "New secret created. Value: $($newSecret.SecretText)"
Write-Output "Store this value securely - it cannot be retrieved again."

# Optionally remove the old secret after updating your applications
# Remove-MgApplicationPassword -ApplicationId $appId -KeyId "old-key-id"
```

## Automating with Azure Pipelines

You can run these scripts in Azure Pipelines using a service connection. Here is a pipeline step that runs a user audit:

```yaml
# Azure Pipeline step to run an AD audit script
- task: AzurePowerShell@5
  inputs:
    azureSubscription: 'your-service-connection'
    ScriptType: 'FilePath'
    ScriptPath: 'scripts/audit-ad-users.ps1'
    azurePowerShellVersion: 'LatestVersion'
  displayName: 'Run AD user audit'
```

## Common Patterns and Automation Ideas

Here are some practical automation scenarios I have implemented using these tools:

1. **Nightly inactive user report.** A scheduled pipeline runs every night, queries users who have not signed in for 90 days, and sends the report to IT admins via email.

2. **Automated offboarding.** When HR marks someone as terminated in the HR system, a webhook triggers a pipeline that disables the user account, removes them from all groups, and revokes their app consent.

3. **Secret rotation alerts.** A weekly pipeline checks all app registrations for secrets expiring within 30 days and creates work items in Azure Boards for each one.

4. **License assignment.** New users are automatically assigned the correct Microsoft 365 licenses based on their department using a PowerShell script triggered by a Logic App.

## Error Handling Tips

Always wrap your Graph API calls in try-catch blocks. The error messages from Microsoft Graph can be cryptic, so logging the full exception helps with debugging:

```powershell
# Robust error handling for Graph API calls
try {
    $result = Get-MgUser -UserId "nonexistent@contoso.com"
}
catch {
    $errorDetails = $_.Exception.Message
    Write-Warning "Graph API error: $errorDetails"

    # Log the full error for debugging
    $_ | Out-File -FilePath "error-log.txt" -Append
}
```

## Wrapping Up

Azure PowerShell with the Microsoft Graph modules gives you full programmatic control over Azure Active Directory. Whether you are managing a few dozen users or thousands, scripting these operations saves time and reduces the risk of manual errors. Start with the simple scripts in this guide, test them against a dev tenant, and gradually build up your automation library. The investment pays off quickly once you stop manually clicking through the Azure portal for routine identity tasks.
