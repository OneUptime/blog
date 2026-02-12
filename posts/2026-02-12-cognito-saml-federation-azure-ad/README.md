# How to Set Up Cognito SAML Federation with Azure AD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, SAML, Azure AD, SSO

Description: Configure SAML-based single sign-on between Microsoft Entra ID (Azure AD) and Amazon Cognito User Pools for enterprise authentication.

---

Microsoft Entra ID (formerly Azure Active Directory) is used by millions of organizations for identity management. If your enterprise customers use Microsoft 365, they almost certainly have Entra ID. Setting up SAML federation between Entra ID and Cognito lets those users sign into your application with their existing corporate credentials.

## Azure AD vs Entra ID

Microsoft renamed Azure Active Directory to Microsoft Entra ID in 2023. You'll see both names in documentation and the portal. They refer to the same service. This post uses both terms since many people still search for "Azure AD."

## Step 1: Gather Cognito Details

You'll need these values from your Cognito User Pool:

The **Reply URL** (ACS endpoint):
```
https://your-domain.auth.us-east-1.amazoncognito.com/saml2/idpresponse
```

The **Identifier** (Entity ID):
```
urn:amazon:cognito:sp:us-east-1_XXXXXXXXX
```

The **Sign-on URL** (optional, for IdP-initiated SSO):
```
https://your-domain.auth.us-east-1.amazoncognito.com/saml2/idpresponse
```

## Step 2: Configure Azure AD Enterprise Application

In the Azure portal:

1. Go to Microsoft Entra ID (or Azure Active Directory)
2. Select "Enterprise applications" from the sidebar
3. Click "New application" then "Create your own application"
4. Name it (e.g., "MyApp - Cognito") and select "Integrate any other application you don't find in the gallery (Non-gallery)"

After creating the application, go to "Single sign-on" and select "SAML."

### Basic SAML Configuration

```
Identifier (Entity ID): urn:amazon:cognito:sp:us-east-1_XXXXXXXXX
Reply URL (ACS URL): https://your-domain.auth.us-east-1.amazoncognito.com/saml2/idpresponse
Sign on URL: https://your-domain.auth.us-east-1.amazoncognito.com/saml2/idpresponse
```

### Attributes & Claims

Configure the following claim mappings:

| Claim name | Source attribute |
|---|---|
| email | user.mail (or user.userprincipalname) |
| name | user.displayname |
| given_name | user.givenname |
| family_name | user.surname |

The default "Unique User Identifier" should be set to `user.userprincipalname` or `user.mail`.

### Download the Federation Metadata XML

In the "SAML Certificates" section, download the "Federation Metadata XML" file. You'll upload this to Cognito.

Note the following from the SAML configuration screen:
- **Login URL**: `https://login.microsoftonline.com/{tenant-id}/saml2`
- **Azure AD Identifier**: `https://sts.windows.net/{tenant-id}/`
- **Logout URL**: `https://login.microsoftonline.com/{tenant-id}/saml2`

## Step 3: Configure Cognito

Using Terraform:

```hcl
# Azure AD SAML identity provider
resource "aws_cognito_identity_provider" "azure_ad" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "AzureAD"
  provider_type = "SAML"

  provider_details = {
    # Option 1: Metadata URL (recommended - auto-refreshes certificates)
    MetadataURL = "https://login.microsoftonline.com/{tenant-id}/federationmetadata/2007-06/federationmetadata.xml?appid={app-id}"

    # Option 2: Upload metadata file
    # MetadataFile = file("azure-ad-metadata.xml")

    # Enable single logout
    IDPSignout = "true"
  }

  # Map Azure AD SAML claims to Cognito attributes
  attribute_mapping = {
    email       = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    name        = "http://schemas.microsoft.com/identity/claims/displayname"
    given_name  = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
    family_name = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
  }

  idp_identifiers = ["azure-ad"]
}
```

Notice the attribute mapping values - Azure AD uses full URI-formatted claim names by default. This is the most common source of setup issues.

Via CLI:

```bash
# Create the Azure AD identity provider
aws cognito-idp create-identity-provider \
  --user-pool-id us-east-1_XXXXXXXXX \
  --provider-name AzureAD \
  --provider-type SAML \
  --provider-details '{
    "MetadataURL": "https://login.microsoftonline.com/TENANT_ID/federationmetadata/2007-06/federationmetadata.xml?appid=APP_ID",
    "IDPSignout": "true"
  }' \
  --attribute-mapping '{
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "name": "http://schemas.microsoft.com/identity/claims/displayname",
    "given_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    "family_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
  }'
```

## Step 4: Update App Client

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  supported_identity_providers = ["AzureAD", "COGNITO"]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  callback_urls = [
    "https://myapp.com/auth/callback",
    "http://localhost:3000/auth/callback"
  ]

  logout_urls = [
    "https://myapp.com/"
  ]
}
```

## Step 5: Implement Sign-In

```javascript
// azure-sso.js - Sign in with Azure AD
import { signInWithRedirect } from 'aws-amplify/auth';

async function signInWithAzureAD() {
  await signInWithRedirect({
    provider: {
      custom: 'AzureAD'
    }
  });
}
```

Manual URL construction:

```javascript
function getAzureADSignInUrl() {
  const domain = 'your-domain.auth.us-east-1.amazoncognito.com';
  const clientId = 'your-app-client-id';
  const redirectUri = encodeURIComponent('https://myapp.com/auth/callback');

  return `https://${domain}/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `scope=openid+email+profile&` +
    `redirect_uri=${redirectUri}&` +
    `identity_provider=AzureAD`;
}
```

## Simplified Claim Names

If you prefer shorter claim names in the SAML assertions, you can change this in Azure AD. Under "Attributes & Claims," edit the claims and change the "Namespace" field to empty. This gives you simple names like "email" instead of the full URI.

If you do this, update the Cognito attribute mapping:

```hcl
# With simplified claim names (namespace removed in Azure AD)
attribute_mapping = {
  email       = "emailaddress"
  name        = "name"
  given_name  = "givenname"
  family_name = "surname"
}
```

## User Assignment

By default, Azure AD requires users to be assigned to the enterprise application. Under "Properties" in the enterprise app, you can:

- **User assignment required = Yes**: Only assigned users/groups can sign in
- **User assignment required = No**: All users in the tenant can sign in

For most cases, assign specific groups:

1. Go to "Users and groups" in the enterprise app
2. Click "Add user/group"
3. Select the groups that should have access

## Conditional Access Policies

Azure AD's Conditional Access can add requirements like MFA, device compliance, or location-based restrictions before allowing SAML authentication. These policies run on the Azure AD side before Cognito ever sees the user.

Common policies for SAML apps:

- Require MFA for sign-in from outside the corporate network
- Block sign-in from non-compliant devices
- Require terms of use acceptance

## Group Claims

You can include Azure AD group memberships in the SAML assertion. This is useful for role-based access control:

In Azure AD, under "Attributes & Claims," add a group claim. Then map it in Cognito:

```hcl
# Map group claims to a custom attribute
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  schema {
    attribute_data_type = "String"
    name                = "groups"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }
}

resource "aws_cognito_identity_provider" "azure_ad" {
  # ... other config ...

  attribute_mapping = {
    email             = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    "custom:groups"   = "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"
  }
}
```

## Certificate Rotation

Azure AD's SAML signing certificates expire. If you used the MetadataURL approach, Cognito automatically picks up new certificates. If you uploaded a metadata file, you'll need to update it manually when the certificate rotates.

Check certificate expiration dates in the Azure AD SAML configuration screen and set a reminder.

## Troubleshooting

**"AADSTS700016: Application not found"** - The App ID in the request doesn't match the Azure AD application. Verify the Entity ID matches.

**"Reply URL does not match"** - The ACS URL in the SAML request doesn't match any Reply URL configured in Azure AD. Check for trailing slashes or HTTP vs HTTPS mismatches.

**Attributes not mapping** - Azure AD uses full URI claim names by default. Make sure your Cognito attribute mapping uses the same format.

**"User is not assigned to a role"** - User assignment is required but the user isn't assigned to the enterprise app. Either assign them or disable the assignment requirement.

For Okta-based SAML federation, see [Cognito SAML federation with Okta](https://oneuptime.com/blog/post/cognito-saml-federation-okta/view).

## Summary

Azure AD SAML federation with Cognito is one of the most requested enterprise features. The main gotcha is the attribute mapping - Azure AD's full URI claim names are easy to get wrong. Use the MetadataURL approach instead of file upload to handle certificate rotation automatically, and remember that Conditional Access policies on the Azure AD side add an extra security layer before users reach your application.
