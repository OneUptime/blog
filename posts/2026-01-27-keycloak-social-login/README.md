# How to Implement Keycloak Social Login

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Keycloak, Social Login, OAuth2, Identity Management, Authentication, SSO, Google, GitHub, Facebook

Description: A complete guide to configuring social login providers in Keycloak, including Google, GitHub, and Facebook integration with account linking, first login flows, and attribute mappers.

---

> Social login reduces friction at signup and lets users authenticate with credentials they already trust. Keycloak makes adding these providers straightforward while keeping you in control of the user data that flows into your system.

## Understanding Identity Providers in Keycloak

Keycloak treats external authentication sources as Identity Providers (IdPs). When a user clicks "Login with Google," Keycloak redirects them to Google, receives an authentication token, and either creates a new local user or links to an existing one.

The flow looks like this:

1. User clicks social login button
2. Keycloak redirects to the external provider
3. User authenticates with the provider
4. Provider redirects back to Keycloak with tokens
5. Keycloak validates tokens and extracts user attributes
6. Keycloak creates or links a local user account
7. User receives a Keycloak session

Each provider requires configuration on both sides: you create OAuth credentials in the provider's developer console, then configure Keycloak to use those credentials.

## Setting Up Google Login

Google is often the first social provider teams add. Here is how to configure it end-to-end.

### Step 1: Create Google OAuth Credentials

Navigate to the Google Cloud Console and create OAuth 2.0 credentials:

```bash
# Google Cloud Console URL
https://console.cloud.google.com/apis/credentials

# You will need:
# 1. A Google Cloud project
# 2. OAuth consent screen configured
# 3. OAuth 2.0 Client ID (Web application type)
```

When creating the OAuth client, add the Keycloak redirect URI:

```
# Redirect URI format
https://your-keycloak-domain/realms/your-realm/broker/google/endpoint

# Example
https://auth.example.com/realms/production/broker/google/endpoint
```

### Step 2: Configure Keycloak

In the Keycloak Admin Console:

```yaml
# Navigate to: Identity Providers > Add provider > Google

# Basic Settings
alias: google                          # Unique identifier for this provider
display-name: Google                   # Shown on the login button
enabled: true

# OAuth Settings
client-id: your-google-client-id       # From Google Cloud Console
client-secret: your-google-secret      # From Google Cloud Console

# Scopes (space-separated)
default-scopes: openid email profile

# Advanced Settings
store-tokens: false                    # Set true if you need to call Google APIs
trust-email: true                      # Skip email verification for Google users
```

### Step 3: Test the Integration

Visit your Keycloak login page and verify the Google button appears:

```bash
# Login page URL
https://your-keycloak-domain/realms/your-realm/account

# You should see "Login with Google" button
# Click it and complete the Google authentication flow
```

## Setting Up GitHub Login

GitHub login is popular for developer-focused applications. The setup process is similar to Google.

### Step 1: Create GitHub OAuth App

Register a new OAuth application in GitHub:

```bash
# GitHub Developer Settings
https://github.com/settings/developers

# Navigate to: OAuth Apps > New OAuth App

# Required fields:
# Application name: Your App Name
# Homepage URL: https://your-app.example.com
# Authorization callback URL: https://auth.example.com/realms/production/broker/github/endpoint
```

### Step 2: Configure Keycloak

Add GitHub as an identity provider:

```yaml
# Navigate to: Identity Providers > Add provider > GitHub

# Basic Settings
alias: github
display-name: GitHub
enabled: true

# OAuth Settings
client-id: your-github-client-id       # From GitHub OAuth App
client-secret: your-github-secret      # From GitHub OAuth App

# Scopes
default-scopes: user:email read:user   # Request email and basic profile

# Advanced Settings
store-tokens: false
trust-email: true
```

### Step 3: Handle Private Emails

GitHub users can hide their email addresses. Configure a mapper to handle this:

```yaml
# Navigate to: Identity Providers > GitHub > Mappers > Add mapper

# Mapper for GitHub username as fallback
name: github-username
mapper-type: Attribute Importer
claim: login                           # GitHub username field
user-attribute: github_username
```

## Setting Up Facebook Login

Facebook requires additional configuration due to its review process for certain permissions.

### Step 1: Create Facebook App

Set up a Facebook application:

```bash
# Facebook Developers Console
https://developers.facebook.com/apps

# Create a new app:
# 1. Choose "Consumer" as app type
# 2. Add "Facebook Login" product
# 3. Configure OAuth settings
```

Configure the Facebook Login settings:

```yaml
# Valid OAuth Redirect URIs
https://auth.example.com/realms/production/broker/facebook/endpoint

# Permissions needed (basic, no review required):
# - email
# - public_profile
```

### Step 2: Configure Keycloak

Add Facebook as an identity provider:

```yaml
# Navigate to: Identity Providers > Add provider > Facebook

# Basic Settings
alias: facebook
display-name: Facebook
enabled: true

# OAuth Settings
client-id: your-facebook-app-id        # From Facebook Developer Console
client-secret: your-facebook-secret    # App Secret from Facebook

# Scopes
default-scopes: email public_profile

# Advanced Settings
store-tokens: false
trust-email: false                     # Facebook emails may not be verified
```

### Step 3: Handle App Review

For production use, submit your app for Facebook review:

```bash
# Required for production:
# 1. Privacy Policy URL
# 2. Terms of Service URL
# 3. App Icon
# 4. Business Verification (for some permissions)

# Until approved, only test users can authenticate
```

## Configuring Account Linking

Account linking allows users with existing accounts to connect their social identities. This prevents duplicate accounts when users sign up with email first, then try social login later.

### Automatic Linking by Email

Configure Keycloak to automatically link accounts with matching email addresses:

```yaml
# Navigate to: Identity Providers > [Provider] > Advanced Settings

# Account Linking Settings
first-broker-login-flow-alias: first broker login

# Navigate to: Authentication > Flows > first broker login
# This flow controls what happens on first social login

# Default behavior:
# 1. If email exists and is verified, prompt to link accounts
# 2. If email does not exist, create new account
```

### Custom Linking Flow

Create a custom first broker login flow for more control:

```yaml
# Navigate to: Authentication > Flows > Create flow

# Flow Name: Custom First Broker Login
# Flow Type: basic-flow

# Add executions in order:
# 1. Review Profile (REQUIRED)
#    - Lets user review/edit profile from social provider
# 2. Create User If Unique (ALTERNATIVE)
#    - Creates user if email is not taken
# 3. Automatically Link Brokered Account (ALTERNATIVE)
#    - Links if email matches and is verified
# 4. Confirm Link Existing Account (ALTERNATIVE)
#    - Prompts user to confirm linking

# Then assign this flow to your identity provider:
# Identity Providers > [Provider] > First Login Flow
```

### Handling Conflicts

When a user tries to link an already-linked account:

```yaml
# Configure in: Authentication > Flows > first broker login

# Add execution: Handle Existing Account
# Requirement: REQUIRED

# Options:
# - fail: Block the login attempt
# - overwrite: Replace the existing link
# - confirm: Ask user what to do
```

## Customizing First Login Flow

The first login flow determines what happens when a user authenticates with a social provider for the first time.

### Review Profile Step

Let users review and edit their profile data before account creation:

```yaml
# Execution: Review Profile
# Requirement: REQUIRED

# This step shows users the data imported from the social provider
# They can edit fields like username before the account is created
```

### Custom Registration Actions

Add required actions to first-time social logins:

```yaml
# Navigate to: Authentication > Required Actions

# Common required actions for social users:
# - Verify Email (if trust-email is false)
# - Update Password (if you want local password too)
# - Configure OTP (for additional security)
# - Update Profile (to collect additional fields)
```

### Example: Force Terms Acceptance

Create a custom authenticator to require terms acceptance:

```yaml
# Navigate to: Authentication > Flows > first broker login

# Add a new execution:
name: Accept Terms
provider: terms-and-conditions
requirement: REQUIRED

# This shows a terms page that users must accept
# before their account is created
```

## Configuring Attribute Mappers

Mappers transform data from social providers into Keycloak user attributes and token claims.

### Built-in Mappers

Each identity provider comes with default mappers. Review and customize them:

```yaml
# Navigate to: Identity Providers > [Provider] > Mappers

# Common default mappers:
# - Username: Maps provider username to Keycloak username
# - Email: Maps provider email to Keycloak email
# - First Name: Maps to firstName attribute
# - Last Name: Maps to lastName attribute
```

### Creating Custom Mappers

Add mappers for additional attributes:

```yaml
# Example: Map Google profile picture
# Navigate to: Identity Providers > Google > Mappers > Add mapper

name: profile-picture
mapper-type: Attribute Importer
claim: picture                         # Google claim name
user-attribute: profilePictureUrl      # Keycloak attribute name
```

```yaml
# Example: Map GitHub organization membership
name: github-orgs
mapper-type: Attribute Importer
claim: organizations_url
user-attribute: github_orgs_url
```

### Hardcoded Attribute Mapper

Set fixed values for social login users:

```yaml
# Example: Mark users as social login users
name: social-login-flag
mapper-type: Hardcoded Attribute
user-attribute: loginSource
user-attribute-value: social
```

### Role Mapper

Automatically assign roles based on social provider:

```yaml
# Example: Assign role to all Google users
name: google-user-role
mapper-type: Hardcoded Role
role: social-user                      # Role must exist in Keycloak
```

### Advanced Mapper: Claim to Group

Map provider claims to Keycloak groups:

```yaml
# Example: Map GitHub team to Keycloak group
name: github-team-mapper
mapper-type: Advanced Claim to Group
claims: teams
group-prefix: github-

# This maps GitHub team "developers" to Keycloak group "github-developers"
```

## Complete Configuration Example

Here is a full realm export showing social login configuration:

```json
{
  "realm": "production",
  "enabled": true,
  "identityProviders": [
    {
      "alias": "google",
      "displayName": "Google",
      "providerId": "google",
      "enabled": true,
      "trustEmail": true,
      "storeToken": false,
      "firstBrokerLoginFlowAlias": "first broker login",
      "config": {
        "clientId": "your-google-client-id",
        "clientSecret": "your-google-client-secret",
        "defaultScope": "openid email profile",
        "syncMode": "IMPORT"
      }
    },
    {
      "alias": "github",
      "displayName": "GitHub",
      "providerId": "github",
      "enabled": true,
      "trustEmail": true,
      "storeToken": false,
      "firstBrokerLoginFlowAlias": "first broker login",
      "config": {
        "clientId": "your-github-client-id",
        "clientSecret": "your-github-client-secret",
        "defaultScope": "user:email read:user",
        "syncMode": "IMPORT"
      }
    },
    {
      "alias": "facebook",
      "displayName": "Facebook",
      "providerId": "facebook",
      "enabled": true,
      "trustEmail": false,
      "storeToken": false,
      "firstBrokerLoginFlowAlias": "first broker login",
      "config": {
        "clientId": "your-facebook-app-id",
        "clientSecret": "your-facebook-app-secret",
        "defaultScope": "email public_profile",
        "syncMode": "IMPORT"
      }
    }
  ],
  "identityProviderMappers": [
    {
      "name": "google-profile-picture",
      "identityProviderAlias": "google",
      "identityProviderMapper": "hardcoded-attribute-idp-mapper",
      "config": {
        "syncMode": "INHERIT",
        "attribute": "picture",
        "attribute.value": "profilePictureUrl"
      }
    },
    {
      "name": "github-username",
      "identityProviderAlias": "github",
      "identityProviderMapper": "github-user-attribute-mapper",
      "config": {
        "syncMode": "INHERIT",
        "jsonField": "login",
        "userAttribute": "github_username"
      }
    }
  ]
}
```

## Best Practices Summary

When implementing social login in Keycloak, follow these guidelines:

**Security**

- Never trust emails from providers that do not verify them (set `trust-email: false` for Facebook)
- Use HTTPS for all redirect URIs
- Rotate client secrets periodically
- Limit scopes to only what you need

**User Experience**

- Offer multiple social providers to maximize user choice
- Implement account linking so users do not create duplicate accounts
- Let users review their profile before account creation
- Provide clear error messages when linking fails

**Maintenance**

- Monitor provider deprecation notices (OAuth endpoints change)
- Test social login flows after Keycloak upgrades
- Keep client libraries and SDKs updated
- Document your first login flow configuration

**Data Handling**

- Only request scopes you actually use
- Map only necessary attributes to user profiles
- Consider GDPR implications of storing social provider data
- Allow users to disconnect social accounts

---

Social login in Keycloak gives your users convenience without sacrificing security. Start with one provider, test thoroughly, then expand to others. The patterns are consistent across providers, so adding more becomes straightforward once you have the first one working.

Monitor your authentication flows with [OneUptime](https://oneuptime.com) to catch login failures, track authentication latency, and ensure your identity infrastructure stays healthy.
