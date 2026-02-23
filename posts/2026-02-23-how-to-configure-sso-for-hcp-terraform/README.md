# How to Configure SSO for HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, SSO, SAML, Authentication, Security

Description: Step-by-step guide to configuring Single Sign-On (SSO) with SAML for HCP Terraform to centralize authentication and user management.

---

Single Sign-On is one of those things that every growing engineering team eventually needs. Once you have more than a handful of people using HCP Terraform, managing individual accounts becomes tedious and error-prone. SSO lets you centralize authentication through your identity provider, enforce consistent security policies, and automate user provisioning.

HCP Terraform supports SAML 2.0-based SSO, which means it works with most major identity providers including Okta, Azure AD (now Entra ID), OneLogin, and others. Let us walk through the full setup process.

## Prerequisites

Before configuring SSO, make sure you have:

- An HCP Terraform organization on the **Business** tier (SSO is not available on free or Team plans)
- Owner access to the HCP Terraform organization
- Admin access to your identity provider (Okta, Azure AD, etc.)
- A verified email domain for your organization

## How SAML SSO Works with HCP Terraform

Here is the flow at a high level:

1. A user tries to access HCP Terraform
2. HCP Terraform redirects them to your identity provider
3. The user authenticates with the identity provider
4. The identity provider sends a SAML assertion back to HCP Terraform
5. HCP Terraform creates or updates the user session

HCP Terraform acts as the SAML Service Provider (SP), and your identity provider is the SAML Identity Provider (IdP).

## Step 1: Get Your HCP Terraform SAML Metadata

Start on the HCP Terraform side:

1. Log in to HCP Terraform as an organization owner
2. Go to **Settings** > **SSO**
3. Click **Setup SSO**
4. You will see your organization's SAML metadata, including:
   - **Entity ID**: `https://app.terraform.io/sso/saml/metadata/your-org`
   - **Assertion Consumer Service (ACS) URL**: `https://app.terraform.io/sso/saml/actions/your-org`

Keep this page open - you will need these values for your identity provider configuration.

## Step 2: Configure Your Identity Provider

### Configuring Okta

If you are using Okta as your identity provider:

1. Log in to the Okta admin console
2. Go to **Applications** > **Create App Integration**
3. Select **SAML 2.0** and click **Next**
4. Set the general settings:
   - **App name**: HCP Terraform
   - **App logo**: Optional (you can use the Terraform logo)
5. Configure the SAML settings:

```
Single Sign-On URL:    https://app.terraform.io/sso/saml/actions/your-org
Audience URI (SP Entity ID):  https://app.terraform.io/sso/saml/metadata/your-org
Name ID format:        EmailAddress
Application username:  Email
```

6. Add attribute statements:

| Name | Value |
|---|---|
| `MemberOf` | Groups that match the regex `.*` (or specific group patterns) |

7. Click **Next**, then **Finish**

8. From the app's **Sign On** tab, download the IdP metadata XML or note the:
   - **Identity Provider Single Sign-On URL**
   - **Identity Provider Issuer**
   - **X.509 Certificate**

### Configuring Azure AD (Entra ID)

For Azure AD:

1. Go to **Azure Portal** > **Enterprise Applications** > **New Application**
2. Click **Create your own application**
3. Name it "HCP Terraform" and select **Integrate any other application you don't find in the gallery**
4. Go to **Single sign-on** > **SAML**
5. Edit the **Basic SAML Configuration**:

```
Identifier (Entity ID):     https://app.terraform.io/sso/saml/metadata/your-org
Reply URL (ACS URL):        https://app.terraform.io/sso/saml/actions/your-org
Sign on URL:                https://app.terraform.io
```

6. Edit **User Attributes & Claims**:
   - The default NameID claim should be set to `user.userprincipalname` or `user.mail`
   - Add a group claim if you want to map Azure AD groups to HCP Terraform teams

7. Download the **Federation Metadata XML** from the SAML Signing Certificate section

### Configuring OneLogin

For OneLogin:

1. Go to **Applications** > **Add App**
2. Search for "SAML Custom Connector (Advanced)"
3. Configure the connector:

```
Audience:                    https://app.terraform.io/sso/saml/metadata/your-org
Recipient:                   https://app.terraform.io/sso/saml/actions/your-org
ACS URL:                     https://app.terraform.io/sso/saml/actions/your-org
ACS URL Validator:           https://app.terraform.io/sso/saml/actions/your-org
```

4. Under **Parameters**, ensure the NameID maps to Email
5. Copy the **Issuer URL** and **SAML 2.0 Endpoint** from the SSO tab

## Step 3: Complete the HCP Terraform SSO Configuration

Back in HCP Terraform:

1. Return to **Settings** > **SSO**
2. Enter the values from your identity provider:
   - **Single Sign-On URL**: The SSO endpoint from your IdP
   - **Entity ID**: The issuer/entity ID from your IdP
   - **Public Certificate**: Paste the X.509 certificate from your IdP (PEM format)
3. Click **Save Settings**

You can also configure SSO via the API:

```bash
# Configure SAML SSO settings
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "saml-settings",
      "attributes": {
        "idp-cert": "-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----",
        "slo-endpoint-url": "https://idp.example.com/slo",
        "sso-endpoint-url": "https://idp.example.com/sso",
        "attr-username": "Username",
        "attr-groups": "MemberOf",
        "attr-site-admin": "SiteAdmin",
        "site-admin-role": "site-admins",
        "sso-api-token-session-timeout": 1209600
      }
    }
  }' \
  https://app.terraform.io/api/v2/organizations/your-org/authentication-token
```

## Step 4: Test the SSO Connection

Before enforcing SSO for all users, test it:

1. In HCP Terraform, on the SSO settings page, click **Test** or use the test URL provided
2. You should be redirected to your identity provider
3. After authenticating, you should be redirected back to HCP Terraform
4. Verify that your user session is established correctly

If the test fails, check:
- Certificate format (should be PEM, including BEGIN/END markers)
- ACS URL matches exactly (no trailing slashes)
- NameID format is set to EmailAddress
- The user's email in the IdP matches their HCP Terraform email

## Step 5: Enable SSO Enforcement

Once testing is successful:

1. Go to **Settings** > **SSO**
2. Toggle **Enable SSO** on
3. Optionally toggle **Require SSO for all members** - this forces all users to authenticate through SSO

When SSO is enforced, users who are not part of the identity provider will lose access. Make sure all team members are configured in your IdP before enabling enforcement.

## Team Mapping with SSO

One of the most powerful features of SSO in HCP Terraform is team mapping. You can automatically add users to HCP Terraform teams based on their identity provider group memberships.

### Setting Up Team Mapping

1. In your identity provider, configure a group attribute claim (typically named `MemberOf`)
2. In HCP Terraform, go to **Settings** > **SSO** > **Team Management**
3. For each HCP Terraform team, specify the IdP group name that should map to it

```hcl
# You can also manage team mappings with the TFE provider
resource "tfe_team" "platform" {
  name         = "platform-engineering"
  organization = "your-org"
  sso_team_id  = "platform-engineers"  # This matches the IdP group name
}

resource "tfe_team" "developers" {
  name         = "developers"
  organization = "your-org"
  sso_team_id  = "engineering-developers"
}
```

When a user logs in via SSO, HCP Terraform reads the group claims from the SAML assertion and automatically adds or removes the user from teams based on the mappings.

## Handling Service Accounts and API Tokens

SSO applies to interactive user sessions, but you still need API tokens for automation. There are a few approaches:

- **Team API tokens**: Not tied to individual users, so SSO does not affect them
- **Organization API tokens**: Also not affected by SSO enforcement
- **User API tokens**: These may be affected by SSO session timeout settings

```bash
# Generate a team token that works independently of SSO
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  https://app.terraform.io/api/v2/teams/team-xxxxxxxx/authentication-token
```

## Troubleshooting SSO Issues

**"SAML response is invalid" error**: Check that the clock on your IdP server is synchronized. SAML assertions have a short validity window and clock skew can cause failures.

**Users not being mapped to teams**: Verify that the attribute name in the SAML assertion matches what HCP Terraform expects. Check the raw SAML assertion using browser developer tools or a SAML debugging tool.

**Certificate errors**: Make sure you are using the signing certificate, not the encryption certificate. The certificate should be in PEM format with the header and footer lines included.

**Users losing access after SSO enforcement**: Any user whose email does not exist in the identity provider will be locked out. Always verify user list parity before enforcing SSO.

## Summary

Configuring SSO for HCP Terraform centralizes your authentication and makes user management significantly easier as your team scales. The key steps are: gather your SAML metadata from HCP Terraform, configure your identity provider with the correct endpoints, test the connection thoroughly, and then enable enforcement. Team mapping is the real force multiplier here - it keeps your HCP Terraform team memberships in sync with your identity provider automatically.

For more on managing access in HCP Terraform, see our guide on [teams and permissions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-teams-and-permissions-in-hcp-terraform/view) and [API tokens](https://oneuptime.com/blog/post/2026-02-23-how-to-use-api-tokens-in-hcp-terraform/view).
