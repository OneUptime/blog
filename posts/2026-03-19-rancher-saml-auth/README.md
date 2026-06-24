# How to Configure SAML Authentication in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, SAML, SSO

Description: A practical guide to configuring SAML-based single sign-on authentication in Rancher with any SAML 2.0 identity provider.

SAML (Security Assertion Markup Language) enables single sign-on (SSO) authentication between Rancher and your identity provider. This allows users to authenticate once with their corporate identity provider and gain access to Rancher without entering separate credentials. This guide covers the general setup process for Rancher's supported SAML providers, such as AD FS, PingIdentity, Keycloak, Okta, and Shibboleth.

## Prerequisites

- Rancher v2.6 or later with admin access
- A Rancher-supported SAML identity provider (such as AD FS, PingIdentity, Keycloak, Okta, or Shibboleth)
- Access to configure your identity provider
- The Rancher server URL must be accessible from users' browsers
- TLS configured on the Rancher server

## Understanding SAML Flow

The SAML authentication flow works as follows:

1. User navigates to the Rancher login page.
2. User clicks the SAML login button.
3. Browser redirects to the identity provider.
4. User authenticates with the IdP.
5. IdP sends a SAML assertion back to Rancher.
6. Rancher validates the assertion and creates a session.

## Step 1: Get Rancher SP Metadata

First, identify the Rancher Service Provider (SP) metadata URL for your provider:

1. Log in to Rancher as an administrator.
2. Navigate to **Users & Authentication** then **Auth Provider**.
3. Select your SAML provider (for example, **Ping Identity**, **Keycloak SAML**, **ADFS**, **Okta**, or **Shibboleth**).
4. Note the SP metadata URL, typically:

```plaintext
https://rancher.example.com/v1-saml/adfs/saml/metadata
```

For providers that publish metadata after the configuration is saved, you can download it with:

```bash
curl -sk "https://rancher.example.com/v1-saml/adfs/saml/metadata" > rancher-sp-metadata.xml
```

For PingIdentity, Keycloak SAML, and Shibboleth, Rancher documents that the metadata URL does not return valid data until the authentication configuration has been saved in Rancher.

## Step 2: Configure Your Identity Provider

Register Rancher as a Service Provider in your IdP. The general process involves:

1. Import or manually enter the Rancher SP settings that your provider requires.
2. Configure the following endpoints:

```plaintext
Entity ID / Relying Party Trust Identifier: https://rancher.example.com/v1-saml/adfs/saml/metadata
ACS URL / SAML 2.0 WebSSO Protocol Service URL: https://rancher.example.com/v1-saml/adfs/saml/acs
```

3. Configure attribute mappings for the fields Rancher expects. The exact attribute names must match what your IdP emits. For example:

```plaintext
UID Attribute: a unique user attribute such as email, userPrincipalName, or sAMAccountName
Display Name Attribute: displayName or name
User Name Attribute: givenName, email, or another username attribute
Groups Attribute: groups, memberOf, member, or an IdP-specific group claim
Email Attribute: email (optional, but commonly included)
```

## Step 3: Configure Attribute Statements

Set up SAML attribute statements in your IdP to send the user information Rancher is configured to read. The attribute names below are examples only:

```xml
<!-- Example SAML attribute statement configuration -->
<AttributeStatement>
  <Attribute Name="uid">
    <AttributeValue>john.doe</AttributeValue>
  </Attribute>
  <Attribute Name="displayName">
    <AttributeValue>John Doe</AttributeValue>
  </Attribute>
  <Attribute Name="email">
    <AttributeValue>john.doe@example.com</AttributeValue>
  </Attribute>
  <Attribute Name="groups">
    <AttributeValue>developers</AttributeValue>
    <AttributeValue>devops</AttributeValue>
  </Attribute>
</AttributeStatement>
```

## Step 4: Obtain IdP Metadata

Get the identity provider metadata XML:

```bash
# Download IdP metadata (example for ADFS)

curl -sk "https://adfs.example.com/FederationMetadata/2007-06/FederationMetadata.xml" \
  > idp-metadata.xml

# Or for Shibboleth
curl -sk "https://idp.example.com/idp/shibboleth" > idp-metadata.xml
```

Extract the key information from the metadata:

```plaintext
IdP Entity ID: https://adfs.example.com/adfs/services/trust
SSO URL: https://adfs.example.com/adfs/ls/
Certificate: (the IdP signing certificate)
```

If you are using Keycloak, Rancher documents that the metadata pasted into Rancher may need `EntityDescriptor` as the root element instead of `EntitiesDescriptor`.

## Step 5: Configure SAML in Rancher

Enter the IdP details in Rancher:

1. Navigate to **Users & Authentication** then **Auth Provider**.
2. Select your SAML provider.
3. Fill in the configuration:

```plaintext
Display Name Field: the IdP attribute that contains display names
User Name Field: the IdP attribute that contains usernames
UID Field: the IdP attribute that uniquely identifies each user
Groups Field: the IdP attribute that exposes groups
Entity ID Field: https://rancher.example.com/v1-saml/keycloak/saml/metadata (provider-specific; for example, Keycloak or PingIdentity)
Rancher API Host: https://rancher.example.com
Private Key / Certificate: (paste or generate the key/certificate pair Rancher uses for SAML)
IDP Metadata: (paste the IdP metadata XML)
```

The exact fields vary by provider, but Rancher's current SAML provider documentation centers on importing the IdP metadata XML and supplying a private key/certificate pair.

## Step 6: Configure Group Mappings

Map SAML groups to Rancher roles:

```plaintext
SAML Group Attribute Name: the group attribute your IdP emits (for example, groups, memberOf, member, or http://schemas.xmlsoap.org/claims/Group)

Group Mappings:
  "platform-admins" -> Administrator
  "developers" -> Standard User
  "readonly-users" -> User-Base
```

Rancher assigns permissions based on the groups returned in the SAML response. In the Rancher UI:

1. Go to **Users & Authentication** then **Groups**.
2. Start typing the group name and select it from the drop-down when it appears.
3. Assign the appropriate global role.

## Step 7: Test SAML Authentication

Validate the configuration as part of the enable flow. Use the external account you intend to administer Rancher with, because Rancher grants admin permissions to the account used to enable the external provider:

1. Click **Enable** in the SAML configuration page.
2. You will be redirected to your IdP login page.
3. Authenticate with your IdP credentials.
4. Verify that you are redirected back to Rancher and signed in successfully.

If testing fails, check:

```bash
# Check Rancher logs for SAML errors
kubectl logs -l app=rancher -n cattle-system --tail=200 | grep -i "saml\|auth"
```

Common SAML errors:

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid signature | Certificate mismatch | Update the IdP certificate in Rancher |
| Audience mismatch | Wrong Entity ID | Ensure Entity ID matches in both Rancher and IdP |
| Clock skew | Time difference between servers | Sync NTP on both Rancher and IdP servers |
| Missing attributes | Attribute mapping error | Verify attribute names match between IdP and Rancher |

## Step 8: Enable SAML Authentication

After the validation login succeeds, Rancher keeps SAML enabled and signs you in through the external provider. The Rancher login page will now show the configured SAML provider button.

## Step 9: Configure Single Logout

If your provider supports SAML Single Logout (SLO), Rancher exposes logout behavior options for it:

1. In Rancher, open **Users & Authentication** then **Auth Provider**.
2. Under **Log Out behavior**, choose whether Rancher should log out only the Rancher session, also log out of the authentication provider, or prompt the user to choose.
3. If your IdP requires explicit SLO settings, use the SLO values published in the provider metadata.

Test SLO by logging out of Rancher and verifying you are also logged out of the IdP.

## Step 10: Maintain the SAML Integration

Ongoing maintenance tasks:

### Certificate Rotation

When your IdP certificate is about to expire:

1. Generate a new certificate in your IdP.
2. Update the certificate in Rancher's SAML configuration.
3. Test authentication with the new certificate.
4. Remove the old certificate from the IdP.

### Monitor Authentication

```bash
# Inspect recent SAML-related log entries
kubectl logs -l app=rancher -n cattle-system --tail=500 | \
  grep -Ei "saml|auth"
```

## Best Practices

- **Use HTTPS everywhere**: Both Rancher and the IdP must use HTTPS for SAML to function securely.
- **Sync clocks**: Ensure NTP is configured on both Rancher and IdP servers to prevent clock skew issues.
- **Map groups, not individuals**: Use group-based role assignments for scalable access management.
- **Plan for certificate rotation**: Track IdP certificate expiration dates and rotate well in advance.
- **Test thoroughly**: Test SAML login, logout, and group-based access with multiple users before rolling out to the organization.

## Conclusion

SAML authentication in Rancher provides enterprise-grade single sign-on for your Kubernetes management platform. By integrating with your organization's identity provider, you eliminate the need for separate Rancher credentials and leverage your existing identity governance policies. Follow the configuration steps carefully, test extensively, and maintain your certificates to ensure a smooth authentication experience for all users.
