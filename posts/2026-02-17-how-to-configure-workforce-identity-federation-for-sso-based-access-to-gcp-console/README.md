# How to Configure Workforce Identity Federation for SSO-Based Access to GCP Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Workforce Identity Federation, SSO, IAM, Authentication

Description: Step-by-step guide to setting up Workforce Identity Federation in GCP, enabling employees to access the Cloud Console and APIs using your existing corporate identity provider.

---

Most enterprises already have an identity provider like Okta, Azure AD, or Ping Identity that manages employee authentication. When those employees need access to GCP, the traditional approach is to create Google Workspace or Cloud Identity accounts for each person. This means maintaining a separate set of identities, syncing user attributes, and managing lifecycle events in two places.

Workforce Identity Federation offers a different approach. It lets your employees sign in to the GCP Console and use gcloud directly with their corporate identity provider credentials. No Google accounts required. Your existing SSO setup becomes the authentication mechanism for GCP, and you manage access entirely through your corporate IdP and GCP IAM.

## How It Differs from Workload Identity Federation

GCP has two types of identity federation, and the names are confusingly similar:

- **Workload Identity Federation** is for machine identities - CI/CD pipelines, applications running on AWS, automated scripts. These identities authenticate programmatically.
- **Workforce Identity Federation** is for human identities - employees who need to use the GCP Console, run gcloud commands, and interact with GCP resources through a browser.

This post covers the workforce variant.

## Prerequisites

- A GCP organization
- The `roles/iam.workforcePoolAdmin` role on the organization
- An external identity provider that supports OIDC or SAML 2.0 (Okta, Azure AD, Ping Identity, etc.)
- The identity provider configured with a client application for GCP

## Step 1 - Create a Workforce Identity Pool

A workforce identity pool is the container that holds the federation configuration. Create one at the organization level:

```bash
# Create the workforce identity pool
gcloud iam workforce-pools create my-corporate-pool \
  --location=global \
  --organization=ORG_ID \
  --display-name="Corporate SSO Pool" \
  --description="Workforce pool for corporate employee access" \
  --session-duration="8h"
```

The `session-duration` parameter controls how long a session lasts before the user needs to re-authenticate. Eight hours is typical for a workday.

## Step 2 - Configure the Identity Provider

Before creating the provider in GCP, you need to register GCP as a relying party in your identity provider.

### Okta Configuration

In Okta, create a new OIDC application:
- Sign-in redirect URI: `https://auth.cloud.google/signin-callback/locations/global/workforcePools/my-corporate-pool/providers/okta-provider`
- Sign-out redirect URI: `https://console.cloud.google`
- Grant types: Authorization Code
- Note the Client ID and Client Secret

### Azure AD Configuration

In Azure AD, register a new application:
- Redirect URI: `https://auth.cloud.google/signin-callback/locations/global/workforcePools/my-corporate-pool/providers/azure-provider`
- Note the Application (client) ID and create a client secret
- Note your Tenant ID for the issuer URL

## Step 3 - Create the Provider in GCP

### OIDC Provider (Okta Example)

```bash
# Create an OIDC provider for Okta
gcloud iam workforce-pools providers create-oidc okta-provider \
  --location=global \
  --workforce-pool=my-corporate-pool \
  --display-name="Okta SSO" \
  --issuer-uri="https://your-org.okta.com/oauth2/default" \
  --client-id="YOUR_OKTA_CLIENT_ID" \
  --client-secret-value="YOUR_OKTA_CLIENT_SECRET" \
  --web-sso-response-type="code" \
  --web-sso-assertion-claims-behavior="MERGE_USER_INFO_OVER_ID_TOKEN_CLAIMS" \
  --attribute-mapping="google.subject=assertion.sub,google.display_name=assertion.name,attribute.department=assertion.department,google.groups=assertion.groups" \
  --attribute-condition="assertion.email_verified == true"
```

### SAML Provider (Azure AD Example)

```bash
# Create a SAML provider for Azure AD
gcloud iam workforce-pools providers create-saml azure-provider \
  --location=global \
  --workforce-pool=my-corporate-pool \
  --display-name="Azure AD SSO" \
  --idp-metadata-path="./azure-ad-metadata.xml" \
  --attribute-mapping="google.subject=assertion.nameId,google.display_name=assertion['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'][0],attribute.department=assertion['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department'][0],google.groups=assertion['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']"
```

The `attribute-mapping` is critical. It tells GCP how to translate identity attributes from your IdP into GCP identity attributes. The `google.subject` mapping is required - it becomes the unique identifier for the user. The `google.groups` mapping is optional but extremely useful for group-based IAM bindings.

## Step 4 - Grant IAM Roles to Workforce Identities

Now grant GCP roles to your workforce identities. You can grant roles to individual users or to groups:

```bash
# Grant a role to a specific workforce identity user
gcloud projects add-iam-policy-binding my-project-id \
  --member="principal://iam.googleapis.com/locations/global/workforcePools/my-corporate-pool/subject/john.doe@example.com" \
  --role="roles/viewer"

# Grant a role to a group from the IdP
gcloud projects add-iam-policy-binding my-project-id \
  --member="principalSet://iam.googleapis.com/locations/global/workforcePools/my-corporate-pool/group/cloud-engineers" \
  --role="roles/editor"

# Grant a role based on a custom attribute (department)
gcloud projects add-iam-policy-binding my-project-id \
  --member="principalSet://iam.googleapis.com/locations/global/workforcePools/my-corporate-pool/attribute.department/platform-engineering" \
  --role="roles/container.admin"
```

Group-based bindings are the most practical approach. Map your IdP groups to GCP roles, and access management happens entirely in your IdP. When someone joins or leaves a group in Okta or Azure AD, their GCP access changes automatically.

## Step 5 - Access the Console

Workforce users access the GCP Console through a special URL that includes the workforce pool:

```
https://console.cloud.google/?wip=locations/global/workforcePools/my-corporate-pool&wipt=okta-provider
```

Bookmark this URL or distribute it through your internal portal. When users visit this URL, they are redirected to your IdP for authentication. After successful login, they land in the GCP Console with the roles you granted.

## Step 6 - Configure gcloud for Workforce Identity

Users can also authenticate gcloud with their corporate credentials:

```bash
# Configure gcloud to use workforce identity
gcloud config set auth/login_config_file /path/to/login-config.json

# Generate the login config file
gcloud iam workforce-pools create-login-config \
  locations/global/workforcePools/my-corporate-pool/providers/okta-provider \
  --output-file=login-config.json

# Now authenticate - this opens a browser for SSO login
gcloud auth login --login-config=/path/to/login-config.json
```

After authentication, gcloud commands work with the workforce identity. The user's access is determined by the IAM bindings on their workforce identity or groups.

## Setting Up Console Access at Scale

For large organizations, you probably want to automate the IAM bindings using Terraform:

```hcl
# Terraform configuration for workforce IAM bindings
# Map corporate groups to GCP roles across multiple projects

locals {
  # Define the mapping between corporate groups and GCP roles
  group_role_mapping = {
    "cloud-admins"     = "roles/owner"
    "cloud-engineers"  = "roles/editor"
    "cloud-viewers"    = "roles/viewer"
    "data-engineers"   = "roles/bigquery.admin"
    "security-team"    = "roles/iam.securityReviewer"
  }
}

resource "google_project_iam_member" "workforce_groups" {
  for_each = local.group_role_mapping

  project = var.project_id
  role    = each.value
  member  = "principalSet://iam.googleapis.com/locations/global/workforcePools/my-corporate-pool/group/${each.key}"
}
```

## Session Management

Workforce sessions have configurable durations. You can also force re-authentication by revoking sessions:

```bash
# Delete all active sessions for a specific user
gcloud iam workforce-pools providers delete-sessions okta-provider \
  --location=global \
  --workforce-pool=my-corporate-pool \
  --subject="john.doe@example.com"
```

This is useful when an employee leaves the company - revoke their workforce sessions in GCP immediately, even before the IdP deprovisioning completes.

## Monitoring and Auditing

Workforce identity authentication events appear in Cloud Audit Logs. Monitor for unusual patterns:

```bash
# Check workforce authentication events
gcloud logging read 'protoPayload.methodName="google.iam.v1.WorkforcePool.CreateSession"' \
  --organization=ORG_ID \
  --limit=20 \
  --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.requestMetadata.callerIp)"
```

Pay attention to logins from unexpected IP ranges or at unusual times. Since workforce identity passes through your corporate IdP, you get the benefits of your existing MFA and conditional access policies on top of GCP's own controls.

## Limitations

Workforce Identity Federation does not support all GCP Console features yet. Some admin-level operations still require a Google account. Check the compatibility matrix in the GCP documentation for your specific use cases.

Each organization can have a limited number of workforce pools (currently 100), and each pool can have up to 200 providers. This is plenty for most setups, but keep it in mind if you have a complex multi-IdP architecture.

Workforce Identity Federation is the cleanest way to give employees access to GCP without managing a separate set of Google identities. Your IdP remains the single source of truth for authentication, and GCP IAM handles authorization. When someone leaves the company and is deprovisioned in your IdP, they automatically lose access to GCP.
