# How to Configure Azure AD Authentication in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, Azure AD, SSO, RBAC

Description: Learn how to set up Microsoft Azure Active Directory (Entra ID) authentication in Rancher for enterprise single sign-on.

Microsoft Azure Active Directory (now Microsoft Entra ID) is the cloud-based identity service used by millions of organizations. Integrating Azure AD with Rancher enables your teams to use their Microsoft corporate accounts to access Kubernetes clusters. This guide walks through the complete setup process.

## Prerequisites

- Rancher v2.7 or later with admin access
- An Azure AD tenant where you can register applications and grant Microsoft Graph application permissions
- The Rancher server accessible via HTTPS
- Azure CLI or access to the Azure Portal

## Step 1: Register an Application in Azure AD

Create an app registration for Rancher:

1. Log in to the Azure Portal at portal.azure.com.
2. Navigate to **Azure Active Directory** (or **Microsoft Entra ID**).
3. Click **App registrations** then **New registration**.

Enter the registration details:

```plaintext
Name: Rancher
Supported account types: Accounts in this organizational directory only (Single tenant)
Redirect URI:
  Platform: Web
  URI: https://rancher.example.com/verify-auth-azure
```

Click **Register**.

## Step 2: Note the Application Details

After registration, record the following values from the **Overview** page:

```plaintext
Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Directory (tenant) ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

## Step 3: Create a Client Secret

Generate a client secret for the application:

1. In the app registration, click **Certificates & secrets**.
2. Click **New client secret**.
3. Enter a description and select an expiration period.

```plaintext
Description: Rancher Authentication

Expires: Select an expiration period that matches your secret rotation policy
```

4. Click **Add** and immediately copy the **Value** field. This is the client secret and cannot be retrieved later.

```plaintext
Client Secret Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Configure API Permissions

Set up the required API permissions:

1. In the app registration, click **API permissions**.
2. Click **Add a permission**.
3. Select **Microsoft Graph**.
4. Choose **Application permissions** and add:

```yaml
Application Permissions:
  - Directory.Read.All
```

5. Click **Grant admin consent for [your organization]** and confirm.

Alternatively, configure permissions using the Azure CLI:

```bash
# Get the app ID

APP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Add Microsoft Graph application permission: Directory.Read.All
az ad app permission add \
  --id $APP_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions 7ab1d382-f21e-4acd-a863-ba3e13f7da61=Role

# Grant admin consent (requires Global Administrator)
az ad app permission admin-consent --id $APP_ID
```

## Step 5: Configure Azure AD in Rancher

Set up the Azure AD auth provider in Rancher:

1. Log in to Rancher as an administrator.
2. Navigate to **Users & Authentication** then **Auth Provider**.
3. Select **Azure AD**.

For the standard Rancher endpoint option, enter:

```plaintext
Tenant ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
Application ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Application Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Endpoint: https://login.microsoftonline.com/
```

Only use Graph, Token, and Auth endpoint fields if you select a custom endpoint configuration in Rancher:

```plaintext
Graph Endpoint: https://graph.microsoft.com
Token Endpoint: https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
Auth Endpoint: https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize
```

## Step 6: Test the Configuration

Test Azure AD authentication:

1. Click the **Test** button.
2. You will be redirected to the Microsoft login page.
3. Enter your Azure AD credentials.
4. If MFA is configured, complete the MFA challenge.
5. Verify you are redirected back to Rancher with correct user information.

If testing fails:

```bash
# Check Rancher logs
kubectl logs -l app=rancher -n cattle-system --tail=200 | grep -i "azure\|auth"
```

Common issues:

| Issue | Solution |
|-------|----------|
| Redirect URI mismatch | Verify the redirect URI matches exactly in Azure AD and Rancher |
| Admin consent not granted | Grant admin consent for the API permissions in Azure AD |
| Groups not returned | Configure group claims in the Azure AD app registration, or use **Groups assigned to the application** if users belong to many groups |

## Step 7: Enable Group Claims

Configure Azure AD to send group claims:

1. In the app registration, click **Token configuration**.
2. Click **Add groups claim**.
3. For most Rancher setups, select **Security groups** and keep the claim format as **Group ID**:

```plaintext
Security groups
Group ID
```

For organizations with many groups, use the application filter:

1. In **Enterprise Applications**, find Rancher.
2. Click **Users and groups**.
3. Assign specific groups to the application.
4. In the app registration **Token configuration**, select **Groups assigned to the application**.

## Step 8: Enable Azure AD Authentication

After successful testing:

1. Click **Enable** to activate Azure AD authentication.
2. Confirm the action.

The Rancher login page will now show a **Log in with Azure AD** button.

## Step 9: Map Azure AD Groups to Rancher Roles

Assign Rancher roles to Azure AD groups:

1. Navigate to **Users & Authentication** then **Groups**.
2. Search for Azure AD groups by name or object ID.
3. Assign global roles.

```plaintext
Azure AD Group: Platform-Admins (Object ID: xxx) -> Administrator
Azure AD Group: DevOps (Object ID: xxx) -> Standard User
Azure AD Group: Developers (Object ID: xxx) -> Standard User
```

For cluster-level access:

1. Navigate to the cluster.
2. Go to **Cluster Members** then **Add**.
3. Search for the Azure AD group.
4. Assign the cluster role.

## Step 10: Handle Secret Rotation

Azure AD client secrets have expiration dates. Plan for rotation:

1. Before the current secret expires, create a new secret in Azure AD.
2. In Rancher, go to **Users & Authentication** then **Auth Provider**, open **Azure AD**, and replace **Application Secret** with the new value.
3. Test authentication with the new secret.
4. Remove the old secret from Azure AD.

Set a calendar reminder for secret expiration:

```bash
# List the application's credential metadata
az ad app credential list --id $APP_ID -o table
```

## Best Practices

- **Use group-based access**: Map Azure AD groups to Rancher roles for scalable access management.
- **Enable Conditional Access**: Configure Azure AD Conditional Access policies to enforce MFA and device compliance for Rancher access.
- **Rotate secrets proactively**: Set reminders well before client secrets expire and rotate them on schedule.
- **Limit application permissions**: Use the minimal set of Microsoft Graph permissions required for your use case.
- **Monitor sign-in activity**: Use Azure AD sign-in logs to monitor authentication activity for the Rancher application.

## Conclusion

Azure AD integration with Rancher provides enterprise-grade authentication backed by Microsoft's identity platform. Your teams benefit from single sign-on, multi-factor authentication, and conditional access policies. By following this guide and maintaining your client secrets and permissions, you ensure a secure and seamless authentication experience for your Kubernetes management platform.
