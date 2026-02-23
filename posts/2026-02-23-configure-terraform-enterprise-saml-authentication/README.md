# How to Configure Terraform Enterprise SAML Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, SAML, SSO, Authentication, Security, Identity

Description: Complete guide to configuring SAML-based single sign-on for Terraform Enterprise, with examples for Okta, Azure AD, and common troubleshooting steps.

---

Single sign-on is table stakes for enterprise software. Nobody wants to manage separate credentials for every tool, and security teams want centralized control over who can access what. Terraform Enterprise supports SAML 2.0 for SSO, which means you can integrate it with pretty much any identity provider - Okta, Azure AD, OneLogin, PingFederate, ADFS, and more.

This guide walks through the SAML configuration process in TFE and provides specific setup instructions for the most popular identity providers.

## How SAML Works with TFE

The SAML flow in Terraform Enterprise follows the standard Service Provider (SP)-initiated pattern:

1. A user visits TFE and clicks "Sign in with SSO"
2. TFE redirects the user to your Identity Provider (IdP)
3. The user authenticates with the IdP
4. The IdP sends a SAML assertion back to TFE
5. TFE validates the assertion and creates/updates the user session

TFE acts as the Service Provider. Your IdP needs to know about TFE (the SP metadata), and TFE needs to know about your IdP (the IdP metadata).

## Prerequisites

- Terraform Enterprise with admin access
- Access to your identity provider's admin console
- The TFE hostname (e.g., `tfe.example.com`)
- TFE's SAML metadata URL: `https://tfe.example.com/users/saml/metadata`

## Step 1: Gather TFE SAML Metadata

Before configuring your IdP, grab the TFE SAML metadata:

```bash
# Download the TFE SP metadata
curl -o tfe-sp-metadata.xml https://tfe.example.com/users/saml/metadata

# Key values you will need from this:
# - Entity ID: https://tfe.example.com/users/saml/metadata
# - ACS URL: https://tfe.example.com/users/saml/auth
# - SLO URL: https://tfe.example.com/users/saml/slo (if using single logout)
```

## Step 2: Configure Your Identity Provider

### Okta Configuration

In the Okta admin console:

1. Go to **Applications** > **Create App Integration**
2. Select **SAML 2.0**
3. Fill in the general settings:

```
App Name: Terraform Enterprise
Logo: (upload the Terraform logo)
```

4. Configure the SAML settings:

```
Single sign-on URL:    https://tfe.example.com/users/saml/auth
Audience URI (SP Entity ID): https://tfe.example.com/users/saml/metadata
Name ID format:        EmailAddress
Application username:  Email

Attribute Statements:
  - Name: email,     Value: user.email
  - Name: firstName, Value: user.firstName
  - Name: lastName,  Value: user.lastName

Group Attribute Statements:
  - Name: memberOf,  Filter: Matches regex, Value: .*
```

5. Download the IdP metadata XML from Okta after saving the application.

### Azure AD Configuration

In the Azure portal:

1. Go to **Azure Active Directory** > **Enterprise applications** > **New application**
2. Select **Create your own application** and name it "Terraform Enterprise"
3. Under **Single sign-on**, select **SAML**

```
Basic SAML Configuration:
  Identifier (Entity ID):  https://tfe.example.com/users/saml/metadata
  Reply URL (ACS URL):     https://tfe.example.com/users/saml/auth
  Sign on URL:             https://tfe.example.com
  Logout URL:              https://tfe.example.com/users/saml/slo

Attributes & Claims:
  email:     user.mail
  firstName: user.givenname
  lastName:  user.surname
  memberOf:  user.groups (or a filtered set)
```

4. Download the **Federation Metadata XML** from the SAML configuration page.

### ADFS Configuration

For Active Directory Federation Services, create a new Relying Party Trust:

```powershell
# Add the relying party trust using TFE metadata URL
Add-AdfsRelyingPartyTrust `
  -Name "Terraform Enterprise" `
  -MetadataUrl "https://tfe.example.com/users/saml/metadata" `
  -IssuanceAuthorizationRules '@RuleTemplate = "AllowAllAuthzRule" => issue(Type = "http://schemas.microsoft.com/authorization/claims/permit", Value = "true");'

# Configure claim rules
# Rule 1: Send email as Name ID
$rule1 = '@RuleTemplate = "MapClaims"
@RuleName = "Email as NameID"
c:[Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"]
=> issue(Type = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
   Value = c.Value,
   Properties["http://schemas.xmlsoap.org/ws/2005/05/identity/claimproperties/format"] = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");'

# Rule 2: Send group membership
$rule2 = '@RuleName = "Group Membership"
c:[Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/groupsid", Value =~ ".*"]
=> issue(Type = "memberOf", Value = c.Value);'

Set-AdfsRelyingPartyTrust -TargetName "Terraform Enterprise" `
  -IssuanceTransformRules "$rule1 $rule2"
```

## Step 3: Configure SAML in Terraform Enterprise

Now configure TFE with your IdP metadata. Go to the TFE admin console at `https://tfe.example.com/app/admin/saml`.

### Via the Admin UI

1. Navigate to **Admin** > **SAML**
2. Check **Enable SAML single sign-on**
3. Fill in the fields:

```
Single Sign-On URL:      [from your IdP metadata]
Single Log-Out URL:      [from your IdP metadata, optional]
IdP Certificate:         [paste the PEM-encoded certificate from IdP metadata]
Team Attribute Name:     memberOf
Site Admin Role:         site-admins (matches a group name in your IdP)
```

### Via API

```bash
# Configure SAML via the TFE Admin API
curl -s \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  https://tfe.example.com/api/v2/admin/saml-settings \
  --data '{
    "data": {
      "type": "saml-settings",
      "attributes": {
        "enabled": true,
        "idp-cert": "-----BEGIN CERTIFICATE-----\nMIID...your IdP certificate...\n-----END CERTIFICATE-----",
        "sso-api-token-session-timeout": 1209600,
        "slo-endpoint-url": "https://idp.example.com/saml/slo",
        "sso-endpoint-url": "https://idp.example.com/saml/sso",
        "attr-username": "email",
        "attr-groups": "memberOf",
        "attr-site-admin": "isSiteAdmin",
        "site-admin-role": "site-admins",
        "team-management-enabled": true,
        "authn-requests-signed": false,
        "want-assertions-signed": true,
        "signature-signing-method": "SHA256",
        "signature-digest-method": "SHA256"
      }
    }
  }'
```

## Step 4: Team Mapping

One of the most useful features of SAML in TFE is automatic team mapping. When the IdP sends group information in the SAML assertion, TFE can automatically add users to the correct teams.

```
IdP Group Name    ->    TFE Team
-------------------------------
tfe-admins        ->    owners
tfe-developers    ->    developers
tfe-platform      ->    platform-team
tfe-security      ->    security-reviewers
```

To set this up, make sure:

1. Your IdP sends group membership in the attribute specified by `attr-groups` (default: `memberOf`)
2. TFE teams exist with names matching the group values from the IdP
3. **Team Management Enabled** is turned on in the SAML settings

## Step 5: Testing the Configuration

Before enforcing SAML for all users, test it:

```bash
# Step 1: Open a browser and go to TFE
# https://tfe.example.com

# Step 2: Click "Sign in with SSO"
# You should be redirected to your IdP

# Step 3: Authenticate with your IdP credentials
# You should be redirected back to TFE and logged in

# Step 4: Verify your user profile has the correct attributes
curl -s \
  --header "Authorization: Bearer $TFE_USER_TOKEN" \
  https://tfe.example.com/api/v2/account/details | jq '.data.attributes'

# Step 5: Verify team membership
curl -s \
  --header "Authorization: Bearer $TFE_USER_TOKEN" \
  https://tfe.example.com/api/v2/teams | jq '.data[].attributes.name'
```

## Troubleshooting SAML Issues

### Decoding SAML Assertions

When things go wrong, inspect the SAML response:

```bash
# If you captured the SAMLResponse from the browser
# (check the POST to /users/saml/auth in browser dev tools)
echo "$SAML_RESPONSE" | base64 -d | xmllint --format -
```

### Common Problems

**"Invalid SAML Response"**: Usually means the ACS URL in the IdP does not match what TFE expects. Double check that the Reply URL is exactly `https://tfe.example.com/users/saml/auth`.

**Users not getting team membership**: Check that the group attribute name in TFE matches the attribute name your IdP sends. Use a SAML tracer browser extension to inspect the actual assertion.

**"Signature validation failed"**: The IdP certificate in TFE is wrong or outdated. Download a fresh copy from your IdP metadata and update TFE.

**Clock skew errors**: SAML assertions have a validity window. If the clocks on your TFE server and IdP are more than a few minutes apart, assertions will be rejected. Use NTP on both systems.

### Keeping a Local Admin Account

Always keep at least one local admin account that can log in without SAML. If your IdP goes down, you need a way to access TFE:

```bash
# The site admin account created during initial setup
# should always be accessible via username/password at:
# https://tfe.example.com/session
```

## Summary

SAML integration in Terraform Enterprise centralizes authentication and makes life easier for both users and administrators. The setup involves configuring your IdP with TFE's metadata, then configuring TFE with your IdP's metadata. Team mapping through SAML groups keeps permissions in sync automatically. Test thoroughly before enforcing SSO, and always keep a backdoor admin account in case your IdP has an outage.

For other authentication options, see [How to Configure Terraform Enterprise OIDC Authentication](https://oneuptime.com/blog/post/2026-02-23-configure-terraform-enterprise-oidc-authentication/view) and [How to Configure Terraform Enterprise LDAP Authentication](https://oneuptime.com/blog/post/2026-02-23-configure-terraform-enterprise-ldap-authentication/view).
