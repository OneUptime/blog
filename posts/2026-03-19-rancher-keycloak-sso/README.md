# How to Configure Keycloak SSO with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, SSO, Keycloak, SAML

Description: A practical guide to integrating Keycloak identity management with Rancher for SAML-based single sign-on authentication.

Keycloak is an open-source identity and access management solution that supports SAML, OIDC, and LDAP federation. Integrating Keycloak with Rancher provides enterprise-grade SSO without vendor lock-in. This guide covers setting up Keycloak as a SAML identity provider for Rancher.

## Prerequisites

- Rancher v2.6 or later with admin access
- Keycloak 18.0 or later installed and accessible
- A Keycloak realm configured for your organization
- Admin access to both Keycloak and Rancher
- TLS configured on both Keycloak and Rancher servers

## Step 1: Create a Keycloak Realm

If you do not already have a realm, create one:

1. Log in to the Keycloak Admin Console.
2. Click the realm dropdown in the top-left corner.
3. Click **Create Realm**.

```plaintext
Realm Name: rancher-org
Enabled: ON
```

4. Click **Create**.

## Step 2: Create a SAML Client in Keycloak

Register Rancher as a SAML client:

1. In your realm, navigate to **Clients**.
2. Click **Create client**.

```plaintext
Client Type: SAML
Client ID: https://rancher.example.com/v1-saml/keycloak/saml/metadata
```

3. Click **Next** and configure the settings:

```plaintext
Name: Rancher
Description: Rancher Kubernetes Management Platform

Enabled: ON
Always Display in Console: ON

Home URL: https://rancher.example.com
Valid Redirect URIs: https://rancher.example.com/v1-saml/keycloak/saml/acs
IDP-Initiated SSO URL Name: rancher
Master SAML Processing URL: https://rancher.example.com/v1-saml/keycloak/saml/acs
```

4. Click **Save**.

## Step 3: Configure SAML Client Settings

Fine-tune the SAML settings:

1. In the Rancher client configuration, set the following values across the **Settings** and **Keys** tabs:

```plaintext
Sign Documents: ON
Sign Assertions: ON
Client Signature Required: OFF
Encrypt Assertions: OFF
Signature Algorithm: RSA_SHA256
SAML Signature Key Name: KEY_ID
Canonicalization Method: EXCLUSIVE
Name ID Format: username
Force POST Binding: OFF
Include AuthnStatement: ON
Force Name ID Format: ON
```

2. Under **Logout Settings**:

```plaintext
Front Channel Logout: ON
Logout Service POST Binding URL: https://rancher.example.com/v1-saml/keycloak/saml/slo
```

## Step 4: Configure Protocol Mappers

Add attribute mappers to send user information to Rancher:

1. In the Rancher client, go to the **Client scopes** tab.
2. Click on the dedicated scope.
3. Click **Add mapper** then **By configuration**.

Create the following mappers:

**Display Name mapper:**
```plaintext
Mapper Type: User Attribute
Name: displayName
User Attribute: firstName
SAML Attribute Name: displayName
SAML Attribute NameFormat: Basic
```

**Username mapper:**
```plaintext
Mapper Type: User Property
Name: userName
Property: username
SAML Attribute Name: userName
SAML Attribute NameFormat: Basic
```

**UID mapper:**
```plaintext
Mapper Type: User Property
Name: uid
Property: username
SAML Attribute Name: uid
SAML Attribute NameFormat: Basic
```

**Email mapper:**
```plaintext
Mapper Type: User Property
Name: email
Property: email
SAML Attribute Name: email
SAML Attribute NameFormat: Basic
```

**Groups mapper:**
```plaintext
Mapper Type: Group list
Name: groups
Group attribute name: groups
SAML Attribute NameFormat: Basic
Single Group Attribute: ON
Full group path: OFF
```

## Step 5: Create Groups in Keycloak

Set up groups for Rancher access control:

1. Navigate to **Groups** in your Keycloak realm.
2. Create groups that correspond to Rancher roles.

```yaml
Groups:
  - rancher-admins
  - rancher-devops
  - rancher-developers
  - rancher-readonly
```

3. Assign users to the appropriate groups.

## Step 6: Download Keycloak IdP Metadata

Get the Keycloak SAML metadata:

1. Open the Rancher SAML client in Keycloak.
2. Click the **Installation** tab.
3. Choose **SAML Metadata IDPSSODescriptor**.
4. Download the `metadata.xml` file.

If you use the realm metadata endpoint instead:

1. Go to **Realm Settings**.
2. Click the **General** tab.
3. Under **Endpoints**, click **SAML 2.0 Identity Provider Metadata**.
4. Copy the raw XML response. Rancher expects an `EntityDescriptor` root element, so if the endpoint returns `EntitiesDescriptor`, adjust it before pasting it into Rancher.

## Step 7: Configure Keycloak in Rancher

Set up the Keycloak auth provider in Rancher:

1. Log in to Rancher as an administrator.
2. Navigate to **Users & Authentication** then **Auth Provider**.
3. Select **Keycloak (SAML)**.
4. If you do not already have a key/certificate pair for Rancher, generate one:

```bash
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout rancher.key -out rancher.cert
```

5. Enter the configuration:

```plaintext
Display Name Field: displayName
User Name Field: userName
UID Field: uid
Groups Field: groups
Entity ID Field: https://rancher.example.com/v1-saml/keycloak/saml/metadata
Rancher API Host: https://rancher.example.com
Private Key / Certificate: (paste the contents of rancher.key and rancher.cert)
IdP Metadata: (paste the Keycloak metadata.xml contents)
```

## Step 8: Test the Integration

Test Keycloak SSO:

1. Click the **Test** button in Rancher.
2. You will be redirected to the Keycloak login page.
3. Authenticate with your Keycloak credentials.
4. Verify that you are redirected back to Rancher with the correct user information and group memberships.

If testing fails:

```bash
# Check Rancher logs
kubectl logs -n cattle-system deploy/rancher --tail=200 | grep -Ei 'saml|keycloak|auth'

# Check Keycloak logs using your deployment, pod name, or label selector
kubectl logs -n <keycloak-namespace> <keycloak-pod-name> --tail=200 | grep -Ei 'saml|rancher'
```

Common issues:

| Issue | Solution |
|-------|----------|
| Not redirected to Keycloak | Make sure `Force POST Binding` is set to `OFF` |
| Invalid requester | Verify the Client ID in Keycloak matches the Entity ID Field in Rancher. If Keycloak logs show `SigAlg was null`, set `Client Signature Required` to `OFF` |
| Failed to process response | Set `Encrypt Assertions` to `OFF` |
| Missing attributes | Check the protocol mappers are configured correctly |
| Signature validation failed | Ensure Sign Documents and Sign Assertions are enabled |
| Groups not returned | Verify the Group list mapper is configured with correct settings |

## Step 9: Enable Keycloak Authentication

After successful testing:

1. Click **Enable** to activate Keycloak SSO.
2. Confirm the action.

The Rancher login page will show a **Log in with Keycloak** button.

## Step 10: Map Keycloak Groups to Rancher Roles

Assign Rancher roles to Keycloak groups:

1. Navigate to **Users & Authentication** then **Groups**.
2. Search for Keycloak groups.
3. Assign roles.

```plaintext
Keycloak Group: rancher-admins -> Administrator
Keycloak Group: rancher-devops -> Standard User
Keycloak Group: rancher-developers -> Standard User
Keycloak Group: rancher-readonly -> User-Base
```

For cluster-level access:

1. Navigate to a cluster.
2. Go to **Cluster Members** then **Add**.
3. Search for the Keycloak group.
4. Assign the cluster role.

## Advanced Keycloak Configuration

### LDAP Federation

If your users are in LDAP, configure Keycloak to federate from LDAP:

1. In Keycloak, go to **User Federation**.
2. Click **Add LDAP provider**.
3. Configure the LDAP connection to import users and groups.

This way Keycloak acts as a bridge between your LDAP directory and Rancher's SAML authentication.

### Keycloak MFA

Enable multi-factor authentication in Keycloak:

1. Go to **Authentication** in your Keycloak realm.
2. Configure a browser flow that requires OTP.
3. Under **Required Actions**, enable **Configure OTP** for users.

MFA configured in Keycloak will apply to all Rancher logins automatically.

## Best Practices

- **Use a dedicated realm**: Create a separate Keycloak realm for Rancher authentication to isolate configuration.
- **Enable signing**: Always enable document and assertion signing for SAML communication security.
- **Map groups carefully**: Plan your Keycloak group structure to align with Rancher role requirements.
- **Monitor Keycloak health**: Ensure Keycloak is highly available since it becomes a critical authentication dependency.
- **Back up Keycloak configuration**: Regularly export your Keycloak realm configuration for disaster recovery.

## Conclusion

Keycloak integration with Rancher provides a flexible, open-source SSO solution for your Kubernetes management platform. With support for SAML, LDAP federation, and multi-factor authentication, Keycloak serves as a comprehensive identity management layer. By following this guide, you can establish a secure and scalable authentication setup that leverages Keycloak's rich feature set for Rancher access control.
