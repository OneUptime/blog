# How to Implement Keycloak SSO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Keycloak, SSO, SAML, OIDC, Identity, Security, Authentication

Description: A comprehensive guide to implementing Single Sign-On with Keycloak, covering client configuration, protocol selection, identity brokering, and session management.

---

> SSO is not just about convenience - it is about centralizing identity, reducing credential sprawl, and giving security teams a single pane of glass for access control.

## Understanding Single Sign-On Concepts

Single Sign-On (SSO) allows users to authenticate once and gain access to multiple applications without re-entering credentials. Keycloak is an open-source identity and access management solution that provides SSO capabilities out of the box.

### Core Components

- **Realm**: A realm manages a set of users, credentials, roles, and groups. Think of it as a tenant in a multi-tenant system.
- **Client**: An application or service that wants to use Keycloak for authentication. Each application you want to protect becomes a client.
- **User**: End users who authenticate through Keycloak to access your applications.
- **Identity Provider (IdP)**: An external system that can authenticate users, such as Google, GitHub, or another SAML/OIDC provider.
- **Protocol Mapper**: Transforms user attributes and roles into tokens that clients can consume.

### How SSO Works

1. User attempts to access Application A
2. Application A redirects to Keycloak
3. User authenticates with Keycloak (if not already logged in)
4. Keycloak creates a session and redirects back with tokens
5. User attempts to access Application B
6. Application B redirects to Keycloak
7. Keycloak recognizes the existing session and redirects back with tokens (no login prompt)

---

## Configuring Clients for SSO

Setting up clients correctly is the foundation of a working SSO implementation. Each application that participates in SSO needs to be registered as a client in Keycloak.

### Creating an OIDC Client

```json
// Keycloak client configuration (JSON export format)
{
  "clientId": "my-web-application",
  "name": "My Web Application",
  "description": "Main web application for the company",
  "enabled": true,
  "protocol": "openid-connect",

  // Public clients cannot securely store secrets (SPAs, mobile apps)
  // Confidential clients can store secrets (backend services)
  "publicClient": false,

  // Valid redirect URIs after authentication
  // Be specific to prevent open redirect vulnerabilities
  "redirectUris": [
    "https://app.example.com/callback",
    "https://app.example.com/silent-refresh"
  ],

  // Allowed origins for CORS
  "webOrigins": [
    "https://app.example.com"
  ],

  // Standard flow enables authorization code flow (recommended)
  "standardFlowEnabled": true,

  // Direct access grants enable resource owner password flow
  // Only enable for legacy apps that cannot redirect
  "directAccessGrantsEnabled": false,

  // Service accounts enable client credentials flow
  // Use for machine-to-machine authentication
  "serviceAccountsEnabled": false,

  // Token settings
  "attributes": {
    "access.token.lifespan": "300",
    "client.session.idle.timeout": "1800",
    "client.session.max.lifespan": "36000"
  }
}
```

### Creating a SAML Client

```xml
<!-- SAML Service Provider metadata -->
<EntityDescriptor
  xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="https://app.example.com/saml/metadata">

  <SPSSODescriptor
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
    AuthnRequestsSigned="true"
    WantAssertionsSigned="true">

    <!-- Where Keycloak sends the SAML response -->
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://app.example.com/saml/acs"
      index="0"
      isDefault="true"/>

    <!-- Where Keycloak sends logout responses -->
    <SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://app.example.com/saml/slo"/>

    <!-- Requested attributes from the IdP -->
    <AttributeConsumingService index="0">
      <ServiceName xml:lang="en">My Application</ServiceName>
      <RequestedAttribute
        Name="email"
        NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"
        isRequired="true"/>
      <RequestedAttribute
        Name="firstName"
        NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"/>
      <RequestedAttribute
        Name="lastName"
        NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"/>
    </AttributeConsumingService>

  </SPSSODescriptor>
</EntityDescriptor>
```

### Client Configuration via Admin CLI

```bash
# Authenticate with Keycloak admin CLI
/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

# Create a new OIDC client
/opt/keycloak/bin/kcadm.sh create clients \
  -r my-realm \
  -s clientId=my-api-service \
  -s enabled=true \
  -s protocol=openid-connect \
  -s publicClient=false \
  -s serviceAccountsEnabled=true \
  -s 'redirectUris=["https://api.example.com/callback"]'

# Get the client secret for the newly created client
CLIENT_ID=$(/opt/keycloak/bin/kcadm.sh get clients \
  -r my-realm \
  -q clientId=my-api-service \
  --fields id \
  --format csv \
  --noquotes)

/opt/keycloak/bin/kcadm.sh get clients/$CLIENT_ID/client-secret \
  -r my-realm
```

---

## SAML vs OIDC: Choosing the Right Protocol

Both SAML and OIDC provide SSO capabilities, but they have different characteristics that make them suitable for different scenarios.

### OpenID Connect (OIDC)

OIDC is built on top of OAuth 2.0 and uses JSON-based tokens (JWT). It is the modern standard for web and mobile applications.

**Advantages:**
- Lightweight JSON tokens are easy to parse
- Native support for SPAs and mobile apps
- Built-in token refresh mechanism
- Simpler to implement and debug
- Better suited for API authorization

**Use OIDC when:**
- Building modern web applications or SPAs
- Developing mobile applications
- Creating microservices architectures
- You need fine-grained API authorization

```javascript
// Example: OIDC authentication in Node.js with Express
const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const app = express();

// Session store for Keycloak adapter
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Keycloak configuration
// keycloak.json should be in the root directory
const keycloak = new Keycloak({ store: memoryStore });

// Initialize Keycloak middleware
app.use(keycloak.middleware());

// Protect routes with Keycloak
// This route requires authentication
app.get('/protected', keycloak.protect(), (req, res) => {
  // Access token info from the request
  const token = req.kauth.grant.access_token;
  res.json({
    message: 'You are authenticated',
    user: token.content.preferred_username,
    roles: token.content.realm_access.roles
  });
});

// Protect routes with specific roles
app.get('/admin', keycloak.protect('realm:admin'), (req, res) => {
  res.json({ message: 'You have admin access' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### SAML 2.0

SAML is an XML-based standard that has been around since 2005. It is widely adopted in enterprise environments.

**Advantages:**
- Mature and battle-tested in enterprises
- Strong support in legacy systems
- Rich attribute statements
- Well-understood by enterprise security teams

**Use SAML when:**
- Integrating with enterprise legacy systems
- The service provider only supports SAML
- Compliance requirements mandate SAML
- Federating with external organizations that use SAML

```python
# Example: SAML authentication in Python with Flask
from flask import Flask, redirect, request, session
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.utils import OneLogin_Saml2_Utils

app = Flask(__name__)
app.secret_key = 'your-secret-key'

def init_saml_auth(req):
    """Initialize SAML auth object with request data."""
    auth = OneLogin_Saml2_Auth(req, custom_base_path='/path/to/saml/config')
    return auth

def prepare_flask_request(request):
    """Convert Flask request to format expected by SAML library."""
    return {
        'https': 'on' if request.scheme == 'https' else 'off',
        'http_host': request.host,
        'script_name': request.path,
        'get_data': request.args.copy(),
        'post_data': request.form.copy()
    }

@app.route('/saml/login')
def saml_login():
    """Initiate SAML login flow."""
    req = prepare_flask_request(request)
    auth = init_saml_auth(req)
    # Redirect to Keycloak for authentication
    return redirect(auth.login())

@app.route('/saml/acs', methods=['POST'])
def saml_acs():
    """SAML Assertion Consumer Service endpoint."""
    req = prepare_flask_request(request)
    auth = init_saml_auth(req)

    # Process the SAML response
    auth.process_response()
    errors = auth.get_errors()

    if not errors:
        # Authentication successful
        session['samlUserdata'] = auth.get_attributes()
        session['samlNameId'] = auth.get_nameid()
        return redirect('/dashboard')
    else:
        return f'SAML Error: {", ".join(errors)}', 400

@app.route('/saml/logout')
def saml_logout():
    """Initiate SAML logout flow."""
    req = prepare_flask_request(request)
    auth = init_saml_auth(req)
    return redirect(auth.logout())
```

### Protocol Comparison Table

| Feature | OIDC | SAML |
|---------|------|------|
| Token Format | JWT (JSON) | XML Assertion |
| Transport | REST/JSON | SOAP/XML |
| Mobile Support | Excellent | Limited |
| API Authorization | Built-in (OAuth 2.0) | Requires additional work |
| Implementation Complexity | Lower | Higher |
| Enterprise Adoption | Growing | Established |
| Token Size | Smaller | Larger |

---

## Identity Brokering

Identity brokering allows Keycloak to delegate authentication to external identity providers. This enables users to log in with their existing accounts from Google, GitHub, corporate Active Directory, or any SAML/OIDC provider.

### Configuring an External OIDC Provider

```json
// Identity Provider configuration for Google
{
  "alias": "google",
  "displayName": "Sign in with Google",
  "providerId": "google",
  "enabled": true,
  "trustEmail": true,

  // First login flow determines what happens when a user
  // authenticates via this provider for the first time
  "firstBrokerLoginFlowAlias": "first broker login",

  "config": {
    // OAuth client credentials from Google Cloud Console
    "clientId": "your-google-client-id.apps.googleusercontent.com",
    "clientSecret": "your-google-client-secret",

    // Scopes to request from Google
    "defaultScope": "openid email profile",

    // Sync user profile on every login
    "syncMode": "FORCE"
  }
}
```

### Configuring an External SAML Provider

```json
// Identity Provider configuration for corporate ADFS
{
  "alias": "corporate-adfs",
  "displayName": "Corporate Login",
  "providerId": "saml",
  "enabled": true,
  "trustEmail": true,

  "config": {
    // ADFS metadata URL for automatic configuration
    "metadataUrl": "https://adfs.corp.example.com/FederationMetadata/2007-06/FederationMetadata.xml",

    // Or manually configure endpoints
    "singleSignOnServiceUrl": "https://adfs.corp.example.com/adfs/ls/",
    "singleLogoutServiceUrl": "https://adfs.corp.example.com/adfs/ls/",

    // Signature validation
    "validateSignature": "true",
    "signingCertificate": "MIICpTCCAY0CBgF...",

    // Name ID format
    "nameIDPolicyFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",

    // Attribute mapping
    "principalType": "ATTRIBUTE",
    "principalAttribute": "email"
  }
}
```

### User Attribute Mapping

When users authenticate via external providers, you need to map their attributes to Keycloak user attributes.

```json
// Mapper configuration for external provider
{
  "name": "email-mapper",
  "identityProviderMapper": "hardcoded-attribute-idp-mapper",
  "identityProviderAlias": "google",

  "config": {
    // Map the email claim to Keycloak email attribute
    "syncMode": "INHERIT",
    "attribute": "email"
  }
}
```

```bash
# Create attribute mapper via Admin CLI
/opt/keycloak/bin/kcadm.sh create identity-provider/instances/google/mappers \
  -r my-realm \
  -s name=department-mapper \
  -s identityProviderMapper=hardcoded-attribute-idp-mapper \
  -s 'config.syncMode=INHERIT' \
  -s 'config.attribute=department' \
  -s 'config.attribute.value=external'
```

### Account Linking

Users can link multiple external identities to a single Keycloak account.

```java
// Example: Account linking in a Java application
// When a user is already authenticated and wants to link another provider

@GetMapping("/link/{provider}")
public String linkAccount(@PathVariable String provider,
                          HttpServletRequest request) {
    // Get the current Keycloak security context
    KeycloakSecurityContext context = getKeycloakSecurityContext(request);

    // Build the account link URL
    String linkUrl = KeycloakUriBuilder
        .fromUri(context.getDeployment().getAuthServerBaseUrl())
        .path("/realms/{realm}/broker/{provider}/link")
        .queryParam("client_id", context.getDeployment().getResourceName())
        .queryParam("redirect_uri", getRedirectUri(request))
        .queryParam("nonce", generateNonce())
        .build(context.getRealm(), provider)
        .toString();

    return "redirect:" + linkUrl;
}
```

---

## Session Management

Proper session management is critical for security and user experience in SSO implementations.

### Session Configuration

```json
// Realm session settings
{
  "ssoSessionIdleTimeout": 1800,
  "ssoSessionMaxLifespan": 36000,
  "ssoSessionIdleTimeoutRememberMe": 604800,
  "ssoSessionMaxLifespanRememberMe": 604800,

  "accessTokenLifespan": 300,
  "accessTokenLifespanForImplicitFlow": 900,

  "offlineSessionIdleTimeout": 2592000,
  "offlineSessionMaxLifespanEnabled": true,
  "offlineSessionMaxLifespan": 5184000,

  "clientSessionIdleTimeout": 0,
  "clientSessionMaxLifespan": 0
}
```

### Token Refresh Strategy

```javascript
// Example: Token refresh in a JavaScript SPA
class KeycloakTokenManager {
  constructor(keycloak) {
    this.keycloak = keycloak;
    this.refreshInterval = null;
  }

  // Start automatic token refresh
  // Refresh tokens before they expire to prevent session interruption
  startAutoRefresh() {
    // Check token validity every 30 seconds
    this.refreshInterval = setInterval(async () => {
      // Refresh if token expires in less than 60 seconds
      if (this.keycloak.isTokenExpired(60)) {
        try {
          const refreshed = await this.keycloak.updateToken(60);
          if (refreshed) {
            console.log('Token refreshed successfully');
            // Notify application of new token
            this.onTokenRefresh(this.keycloak.token);
          }
        } catch (error) {
          console.error('Failed to refresh token:', error);
          // Redirect to login if refresh fails
          this.keycloak.login();
        }
      }
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  onTokenRefresh(token) {
    // Update authorization headers in your HTTP client
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

// Initialize Keycloak and start token management
const keycloak = new Keycloak({
  url: 'https://keycloak.example.com',
  realm: 'my-realm',
  clientId: 'my-spa'
});

keycloak.init({
  onLoad: 'check-sso',
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html'
}).then(authenticated => {
  if (authenticated) {
    const tokenManager = new KeycloakTokenManager(keycloak);
    tokenManager.startAutoRefresh();
  }
});
```

### Session Events and Auditing

```java
// Example: Custom event listener for session auditing
public class SessionAuditEventListener implements EventListenerProvider {

    private final AuditService auditService;

    @Override
    public void onEvent(Event event) {
        switch (event.getType()) {
            case LOGIN:
                auditService.log(AuditEvent.builder()
                    .type("USER_LOGIN")
                    .userId(event.getUserId())
                    .clientId(event.getClientId())
                    .ipAddress(event.getIpAddress())
                    .timestamp(Instant.now())
                    .details(event.getDetails())
                    .build());
                break;

            case LOGOUT:
                auditService.log(AuditEvent.builder()
                    .type("USER_LOGOUT")
                    .userId(event.getUserId())
                    .sessionId(event.getSessionId())
                    .timestamp(Instant.now())
                    .build());
                break;

            case LOGIN_ERROR:
                auditService.log(AuditEvent.builder()
                    .type("LOGIN_FAILED")
                    .userId(event.getUserId())
                    .ipAddress(event.getIpAddress())
                    .error(event.getError())
                    .timestamp(Instant.now())
                    .build());
                // Trigger alert for repeated failures
                checkBruteForce(event);
                break;
        }
    }

    private void checkBruteForce(Event event) {
        // Implementation for brute force detection
    }
}
```

---

## Logout Flows

Implementing logout correctly in an SSO environment requires careful consideration of all participating applications.

### Single Logout (SLO)

Single Logout ensures that when a user logs out from one application, they are logged out from all applications in the SSO session.

```javascript
// Example: Implementing logout in a JavaScript application
async function performLogout() {
  // Option 1: Redirect-based logout (recommended)
  // This redirects to Keycloak which handles SLO
  const logoutUrl = keycloak.createLogoutUrl({
    redirectUri: window.location.origin + '/logged-out'
  });
  window.location.href = logoutUrl;
}

// Option 2: Backchannel logout receiver
// Your application receives logout notifications from Keycloak
app.post('/backchannel-logout', express.urlencoded({ extended: true }), (req, res) => {
  const logoutToken = req.body.logout_token;

  try {
    // Verify and decode the logout token
    const decoded = jwt.verify(logoutToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://keycloak.example.com/realms/my-realm'
    });

    // Extract session ID from the token
    const sessionId = decoded.sid;

    // Invalidate the local session
    sessionStore.destroy(sessionId, (err) => {
      if (err) {
        console.error('Failed to destroy session:', err);
        return res.status(500).send();
      }
      res.status(200).send();
    });
  } catch (error) {
    console.error('Invalid logout token:', error);
    res.status(400).send();
  }
});
```

### SAML Single Logout

```xml
<!-- SAML Logout Request -->
<samlp:LogoutRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_logout_request_123"
  Version="2.0"
  IssueInstant="2026-01-27T10:00:00Z"
  Destination="https://keycloak.example.com/realms/my-realm/protocol/saml">

  <saml:Issuer>https://app.example.com/saml/metadata</saml:Issuer>

  <!-- The session index from the original authentication -->
  <samlp:SessionIndex>_session_abc123</samlp:SessionIndex>

  <!-- The user being logged out -->
  <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
    user@example.com
  </saml:NameID>

</samlp:LogoutRequest>
```

### Handling Logout in Multi-Application Environments

```python
# Example: Coordinating logout across multiple applications
class LogoutCoordinator:
    def __init__(self, keycloak_admin):
        self.keycloak = keycloak_admin
        self.registered_apps = []

    def register_app(self, app_config):
        """Register an application for coordinated logout."""
        self.registered_apps.append(app_config)

    async def perform_global_logout(self, user_id: str):
        """Logout user from all applications."""
        # Get all active sessions for the user
        sessions = self.keycloak.get_user_sessions(user_id)

        results = []
        for session in sessions:
            # Terminate session in Keycloak
            self.keycloak.delete_session(session['id'])

            # Notify registered applications
            for app in self.registered_apps:
                try:
                    result = await self.notify_app_logout(
                        app,
                        session['id'],
                        user_id
                    )
                    results.append({
                        'app': app['name'],
                        'success': True
                    })
                except Exception as e:
                    results.append({
                        'app': app['name'],
                        'success': False,
                        'error': str(e)
                    })

        return results

    async def notify_app_logout(self, app, session_id, user_id):
        """Send logout notification to an application."""
        if app['logout_type'] == 'backchannel':
            # Send backchannel logout request
            async with aiohttp.ClientSession() as session:
                response = await session.post(
                    app['logout_url'],
                    data={
                        'logout_token': self.create_logout_token(
                            session_id,
                            user_id,
                            app['client_id']
                        )
                    }
                )
                return response.status == 200
        else:
            # For front-channel, return URL for redirect
            return app['logout_url']
```

### Client Configuration for Logout

```bash
# Configure backchannel logout for a client
/opt/keycloak/bin/kcadm.sh update clients/$CLIENT_ID \
  -r my-realm \
  -s 'attributes.backchannel.logout.url=https://app.example.com/backchannel-logout' \
  -s 'attributes.backchannel.logout.session.required=true' \
  -s 'attributes.backchannel.logout.revoke.offline.tokens=true'

# Configure front-channel logout
/opt/keycloak/bin/kcadm.sh update clients/$CLIENT_ID \
  -r my-realm \
  -s 'attributes.frontchannel.logout.url=https://app.example.com/logout'
```

---

## Best Practices Summary

### Security Best Practices

1. **Always use HTTPS** - Never deploy Keycloak or applications without TLS in production
2. **Validate redirect URIs strictly** - Use exact matches, not wildcards
3. **Enable PKCE for public clients** - Prevents authorization code interception
4. **Set appropriate token lifespans** - Balance security with user experience
5. **Implement proper logout** - Use backchannel logout for reliable session termination
6. **Rotate client secrets regularly** - Automate secret rotation where possible
7. **Enable brute force protection** - Configure account lockout policies

### Operational Best Practices

1. **Use infrastructure as code** - Version control your Keycloak configuration
2. **Monitor authentication events** - Set up alerting for failed logins and anomalies
3. **Plan for high availability** - Deploy Keycloak in a clustered configuration
4. **Test disaster recovery** - Regularly verify backup and restore procedures
5. **Document your flows** - Maintain runbooks for common operations

### Development Best Practices

1. **Use official adapters** - Leverage Keycloak adapters instead of building custom solutions
2. **Implement silent token refresh** - Prevent session interruptions for users
3. **Handle token expiration gracefully** - Show appropriate UI when re-authentication is needed
4. **Test with multiple identity providers** - Verify your flows work with all configured IdPs
5. **Use protocol mappers effectively** - Customize tokens to include only necessary claims

---

Keycloak provides a robust foundation for implementing SSO across your applications. By understanding the protocols, configuring clients correctly, and implementing proper session management, you can deliver a seamless authentication experience while maintaining strong security controls.

For monitoring your Keycloak deployment and tracking authentication metrics, consider using [OneUptime](https://oneuptime.com) to gain visibility into your identity infrastructure alongside your other services.
