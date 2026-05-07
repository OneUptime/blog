# How to Configure Google OAuth with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, Google OAuth, SSO

Description: Step-by-step instructions for setting up Google OAuth authentication in Rancher to enable sign-in with Google Workspace accounts.

Google OAuth integration with Rancher allows your team to authenticate using their Google Workspace (formerly G Suite) accounts. This is ideal for organizations that use Google Workspace as their primary identity platform. This guide covers the complete setup process from Google Cloud Console configuration to Rancher integration.

## Prerequisites

- Rancher v2.6 or later with admin access
- A Google Workspace domain with admin access
- Access to the Google Cloud Console
- The Rancher server accessible via HTTPS

## Step 1: Create a Google Cloud Project

Set up a project in the Google Cloud Console:

1. Go to the Google Cloud Console at console.cloud.google.com.
2. Click the project dropdown and select **New Project**.

```plaintext
Project Name: rancher-auth
Organization: example.com
```

3. Click **Create** and wait for the project to be created.
4. Select the new project.

## Step 2: Configure the OAuth Consent Screen

Set up the consent screen that users will see:

1. In the Google Cloud Console, navigate to **APIs & Services** then **OAuth consent screen**.
2. Select **Internal** (for Google Workspace organizations) and click **Create**.

Fill in the consent screen details:

```plaintext
App Name: Rancher
User Support Email: admin@example.com
App Logo: (optional)
Application Home Page: https://rancher.example.com
Application Privacy Policy Link: https://example.com/privacy
Application Terms of Service Link: https://example.com/terms
Authorized Domains: example.com
Developer Contact Email: admin@example.com
```

3. Click **Save and Continue**.

Add scopes:

1. Click **Add or Remove Scopes**.
2. Select the following scopes:

```plaintext
openid
email
profile
```

3. Click **Save and Continue**.

## Step 3: Create OAuth Credentials

Create OAuth 2.0 client credentials:

1. Navigate to **APIs & Services** then **Credentials**.
2. Click **Create Credentials** then **OAuth client ID**.

Configure the client:

```plaintext
Application Type: Web application
Name: Rancher OAuth Client
Authorized JavaScript Origins: https://rancher.example.com
Authorized Redirect URIs: https://rancher.example.com/verify-auth
```

3. Click **Create**, download the OAuth credentials JSON, and note the credentials it contains:

```plaintext
Client ID: xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Enable Required API

Enable the required Google API:

```bash
# Using gcloud CLI

gcloud services enable admin.googleapis.com --project=rancher-auth
```

Or through the Console:

1. Navigate to **APIs & Services** then **Library**.
2. Search for and enable **Admin SDK API**.

## Step 5: Create a Service Account for Group Lookup

Rancher requires a service account for user and group lookups:

1. Navigate to **IAM & Admin** then **Service Accounts**.
2. Click **Create Service Account**.

```plaintext
Service Account Name: rancher-group-lookup
Service Account ID: rancher-group-lookup
Description: Service account for Rancher to lookup Google Workspace groups

```

3. Click **Create and Continue**.
4. Skip the role assignment and click **Done**.
5. Click on the service account and go to **Keys**.
6. Click **Add Key** then **Create new key**.
7. Select **JSON** and click **Create**.
8. Save the downloaded JSON key file.

## Step 6: Configure Domain-Wide Delegation

Set up domain-wide delegation for the service account:

1. In the service account details, click **Show Advanced Settings**.
2. Under **Domain-wide Delegation**, click **Enable Google Workspace Domain-wide Delegation**.
3. Note the **Client ID** of the service account.

In the Google Workspace Admin Console:

1. Go to admin.google.com.
2. Navigate to **Security** then **Access and data control** then **API controls** then **Manage Domain Wide Delegation**.
3. Click **Add new**.
4. Enter the service account Client ID.
5. Add the OAuth scopes:

```plaintext
https://www.googleapis.com/auth/admin.directory.user.readonly
https://www.googleapis.com/auth/admin.directory.group.readonly
```

6. Click **Authorize**.

## Step 7: Configure Google OAuth in Rancher

Set up Google authentication in Rancher:

1. Log in to Rancher as an administrator.
2. Navigate to **Users & Authentication** then **Auth Provider**.
3. Select **Google**.

Enter the configuration:

```plaintext
Admin Email: admin@example.com
Domain: example.com
OAuth Credentials: (paste or upload the OAuth credentials JSON)
Service Account Credentials: (paste or upload the service account key JSON)
Nested Group Membership: ☐ Disabled
```

## Step 8: Test the Configuration

Test Google OAuth authentication:

1. Click **Authenticate with Google**.
2. You will be redirected to the Google sign-in page.
3. Select your Google Workspace account.
4. Authorize the Rancher application.
5. Verify that you are redirected back to Rancher with correct user information.

Verify that the test returns:

- Email address
- Display name
- Google Workspace groups

If testing fails:

```bash
# Check Rancher logs
kubectl logs -l app=rancher -n cattle-system --tail=200 | grep -i "google\|oauth\|auth"
```

## Step 9: Enable Google OAuth

After successful testing:

1. Click **Enable** to activate Google OAuth.
2. Confirm the action.

The login page will now show a **Log in with Google** button.

## Step 10: Map Google Groups to Rancher Roles

Assign Rancher roles to Google Workspace groups:

1. Navigate to **Users & Authentication** then **Groups**.
2. Search for Google Workspace groups.
3. Assign roles.

```plaintext
Google Group: platform-admins@example.com -> Administrator
Google Group: devops@example.com -> Standard User
Google Group: developers@example.com -> Standard User
Google Group: readonly@example.com -> User-Base
```

For cluster-level access:

```plaintext
Google Group: team-backend@example.com -> Cluster Member (production)
Google Group: team-frontend@example.com -> Cluster Member (staging)
Google Group: qa@example.com -> Cluster Member (qa-cluster)
```

## Restricting Access to Specific Groups

Limit Rancher access to specific Google Workspace groups:

1. In the Google auth configuration, under **Site Access**, select **Restrict access**.
2. Add the allowed groups.

This prevents users outside the specified groups from logging in, even if they have a valid Google Workspace account in your domain.

## Troubleshooting

Common issues with Google OAuth:

| Issue | Cause | Solution |
|-------|-------|----------|
| Redirect URI mismatch | URI does not match Cloud Console | Verify the redirect URI is exactly `https://rancher.example.com/verify-auth` |
| Groups not loading | Service account or domain-wide delegation is misconfigured | Verify the service account JSON and domain-wide delegation configuration |
| Access denied | User not in allowed group | Add the user to an authorized Google Workspace group |
| API not enabled | Required API disabled | Enable Admin SDK API in Cloud Console |
| Domain mismatch | Wrong domain configured | Verify the domain matches your Google Workspace domain |

## Best Practices

- **Use Internal OAuth consent**: Select Internal type to limit authentication to your Google Workspace domain.
- **Map groups to roles**: Leverage Google Workspace groups for role assignments instead of individual users.
- **Restrict by group**: Limit Rancher access to specific Google Workspace groups for tighter security control.
- **Monitor OAuth usage**: Review the OAuth application's access in the Google Cloud Console periodically.
- **Rotate credentials**: Regenerate the OAuth client secret periodically and update it in Rancher.

## Conclusion

Google OAuth integration with Rancher provides a seamless authentication experience for organizations using Google Workspace. By leveraging Google's identity platform, your teams can access Rancher with their existing Google accounts, and administrators can manage access through familiar Google Workspace groups. The service account setup for group lookups enables granular role-based access control that scales with your organization.
