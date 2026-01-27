# How to Configure Keycloak Realms and Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Keycloak, OAuth2, Identity Management, SSO, Authentication, OIDC

Description: Learn how to configure Keycloak realms and clients for identity management, including OAuth2 flows, roles, and application integration.

---

> Keycloak turns identity management from a security nightmare into a configuration exercise. Master realms and clients, and you have the foundation for enterprise-grade authentication.

## Understanding Realms

A realm is a security domain in Keycloak. Each realm manages its own set of users, credentials, roles, and clients. Think of realms as isolated tenants - users in one realm cannot access resources in another.

### When to Use Multiple Realms

- **Multi-tenancy**: Separate realms for each customer
- **Environment isolation**: Development, staging, production
- **Business units**: Different divisions with distinct user bases
- **Partner access**: External organizations with separate identity needs

### Creating a Realm

```bash
# Using the Keycloak Admin CLI
# First, authenticate to the master realm
./kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

# Create a new realm
./kcadm.sh create realms \
  -s realm=mycompany \
  -s enabled=true \
  -s displayName="My Company" \
  -s loginWithEmailAllowed=true \
  -s duplicateEmailsAllowed=false
```

### Realm Configuration via JSON

```json
{
  "realm": "mycompany",
  "enabled": true,
  "displayName": "My Company",
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": true,
  "editUsernameAllowed": false,
  "bruteForceProtected": true,
  "failureFactor": 5,
  "maxFailureWaitSeconds": 900,
  "minimumQuickLoginWaitSeconds": 60,
  "waitIncrementSeconds": 60,
  "quickLoginCheckMilliSeconds": 1000,
  "maxDeltaTimeSeconds": 43200,
  "sslRequired": "external",
  "accessTokenLifespan": 300,
  "accessTokenLifespanForImplicitFlow": 900,
  "ssoSessionIdleTimeout": 1800,
  "ssoSessionMaxLifespan": 36000,
  "offlineSessionIdleTimeout": 2592000,
  "accessCodeLifespan": 60,
  "accessCodeLifespanUserAction": 300,
  "accessCodeLifespanLogin": 1800
}
```

Import it with:

```bash
./kcadm.sh create realms -f realm-config.json
```

## Client Types Explained

Keycloak supports three client types, each for different use cases.

### Confidential Clients

Used for server-side applications that can securely store a client secret.

```json
{
  "clientId": "backend-api",
  "enabled": true,
  "clientAuthenticatorType": "client-secret",
  "secret": "your-client-secret-here",
  "protocol": "openid-connect",
  "publicClient": false,
  "bearerOnly": false,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": true,
  "serviceAccountsEnabled": true,
  "authorizationServicesEnabled": false,
  "redirectUris": [
    "https://api.example.com/callback",
    "https://api.example.com/auth/callback"
  ],
  "webOrigins": [
    "https://api.example.com"
  ]
}
```

### Public Clients

For browser-based SPAs and mobile apps that cannot keep secrets.

```json
{
  "clientId": "frontend-spa",
  "enabled": true,
  "protocol": "openid-connect",
  "publicClient": true,
  "bearerOnly": false,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "redirectUris": [
    "https://app.example.com/*",
    "http://localhost:3000/*"
  ],
  "webOrigins": [
    "https://app.example.com",
    "http://localhost:3000"
  ],
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
```

### Bearer-Only Clients

For APIs that only validate tokens and never initiate login flows.

```json
{
  "clientId": "resource-server",
  "enabled": true,
  "protocol": "openid-connect",
  "publicClient": false,
  "bearerOnly": true,
  "standardFlowEnabled": false,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false
}
```

## OAuth2 and OIDC Flows

### Authorization Code Flow (Recommended)

The most secure flow for web applications.

```bash
# Step 1: Redirect user to authorization endpoint
# Browser navigates to:
https://keycloak.example.com/realms/mycompany/protocol/openid-connect/auth?\
  client_id=frontend-spa&\
  redirect_uri=https://app.example.com/callback&\
  response_type=code&\
  scope=openid%20profile%20email&\
  state=random-state-value&\
  code_challenge=BASE64URL_ENCODED_CHALLENGE&\
  code_challenge_method=S256

# Step 2: Exchange authorization code for tokens
curl -X POST \
  "https://keycloak.example.com/realms/mycompany/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=frontend-spa" \
  -d "code=AUTH_CODE_FROM_CALLBACK" \
  -d "redirect_uri=https://app.example.com/callback" \
  -d "code_verifier=ORIGINAL_CODE_VERIFIER"
```

### Client Credentials Flow

For machine-to-machine authentication.

```bash
# Get access token using client credentials
curl -X POST \
  "https://keycloak.example.com/realms/mycompany/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=backend-api" \
  -d "client_secret=your-client-secret-here"

# Response:
# {
#   "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI...",
#   "expires_in": 300,
#   "token_type": "Bearer",
#   "scope": "profile email"
# }
```

### Resource Owner Password Flow

Only for trusted applications - avoid in production when possible.

```bash
curl -X POST \
  "https://keycloak.example.com/realms/mycompany/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=trusted-app" \
  -d "client_secret=your-client-secret" \
  -d "username=user@example.com" \
  -d "password=userpassword" \
  -d "scope=openid profile email"
```

## Client Scopes and Mappers

Client scopes define what claims appear in tokens.

### Creating a Custom Scope

```bash
# Create a custom scope
./kcadm.sh create client-scopes \
  -r mycompany \
  -s name=custom-api \
  -s description="Custom API access" \
  -s protocol=openid-connect \
  -s "attributes.include.in.token.scope=true" \
  -s "attributes.display.on.consent.screen=true"
```

### Scope Configuration JSON

```json
{
  "name": "custom-api",
  "description": "Custom API access scope",
  "protocol": "openid-connect",
  "attributes": {
    "include.in.token.scope": "true",
    "display.on.consent.screen": "true",
    "consent.screen.text": "Access your custom API data"
  },
  "protocolMappers": [
    {
      "name": "audience-mapper",
      "protocol": "openid-connect",
      "protocolMapper": "oidc-audience-mapper",
      "consentRequired": false,
      "config": {
        "included.client.audience": "resource-server",
        "id.token.claim": "false",
        "access.token.claim": "true"
      }
    }
  ]
}
```

### Assigning Scopes to Clients

```bash
# Get the scope ID
SCOPE_ID=$(./kcadm.sh get client-scopes -r mycompany --fields id,name | \
  jq -r '.[] | select(.name=="custom-api") | .id')

# Get the client ID
CLIENT_ID=$(./kcadm.sh get clients -r mycompany --fields id,clientId | \
  jq -r '.[] | select(.clientId=="frontend-spa") | .id')

# Assign as default scope
./kcadm.sh update clients/$CLIENT_ID/default-client-scopes/$SCOPE_ID -r mycompany
```

## Protocol Mappers for Token Customization

Protocol mappers transform user attributes into token claims.

### User Attribute Mapper

Add custom user attributes to tokens.

```json
{
  "name": "department-mapper",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "consentRequired": false,
  "config": {
    "user.attribute": "department",
    "claim.name": "department",
    "jsonType.label": "String",
    "id.token.claim": "true",
    "access.token.claim": "true",
    "userinfo.token.claim": "true",
    "multivalued": "false",
    "aggregate.attrs": "false"
  }
}
```

### Group Membership Mapper

Include user's groups in tokens.

```json
{
  "name": "group-membership-mapper",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-group-membership-mapper",
  "consentRequired": false,
  "config": {
    "full.path": "false",
    "claim.name": "groups",
    "id.token.claim": "true",
    "access.token.claim": "true",
    "userinfo.token.claim": "true"
  }
}
```

### Hardcoded Claim Mapper

Add static values to tokens.

```json
{
  "name": "environment-mapper",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-hardcoded-claim-mapper",
  "consentRequired": false,
  "config": {
    "claim.name": "environment",
    "claim.value": "production",
    "jsonType.label": "String",
    "id.token.claim": "false",
    "access.token.claim": "true",
    "userinfo.token.claim": "false"
  }
}
```

## Roles and Role Mappings

### Realm Roles

Global roles that apply across all clients.

```bash
# Create a realm role
./kcadm.sh create roles -r mycompany \
  -s name=admin \
  -s description="Administrator role"

# Create another role
./kcadm.sh create roles -r mycompany \
  -s name=user \
  -s description="Regular user role"
```

### Client Roles

Roles specific to a client application.

```bash
# Get the client ID first
CLIENT_ID=$(./kcadm.sh get clients -r mycompany --fields id,clientId | \
  jq -r '.[] | select(.clientId=="backend-api") | .id')

# Create client roles
./kcadm.sh create clients/$CLIENT_ID/roles -r mycompany \
  -s name=api-read \
  -s description="Read access to API"

./kcadm.sh create clients/$CLIENT_ID/roles -r mycompany \
  -s name=api-write \
  -s description="Write access to API"
```

### Composite Roles

Roles that include other roles.

```bash
# Create a composite role
./kcadm.sh create roles -r mycompany \
  -s name=api-admin \
  -s description="Full API access" \
  -s composite=true

# Add child roles to the composite
./kcadm.sh add-roles -r mycompany \
  --rname api-admin \
  --cclientid backend-api \
  --rolename api-read \
  --rolename api-write
```

## Users and Groups

### Creating Users

```bash
# Create a user
./kcadm.sh create users -r mycompany \
  -s username=john.doe \
  -s email=john.doe@example.com \
  -s emailVerified=true \
  -s enabled=true \
  -s firstName=John \
  -s lastName=Doe \
  -s "attributes.department=[\"Engineering\"]"

# Set password
USER_ID=$(./kcadm.sh get users -r mycompany -q username=john.doe --fields id | \
  jq -r '.[0].id')

./kcadm.sh set-password -r mycompany \
  --userid $USER_ID \
  --new-password "initial-password" \
  --temporary
```

### Creating Groups

```bash
# Create a parent group
./kcadm.sh create groups -r mycompany \
  -s name=engineering

# Get the group ID
GROUP_ID=$(./kcadm.sh get groups -r mycompany --fields id,name | \
  jq -r '.[] | select(.name=="engineering") | .id')

# Create a subgroup
./kcadm.sh create groups/$GROUP_ID/children -r mycompany \
  -s name=backend-team
```

### Assigning Users to Groups and Roles

```bash
# Get user ID
USER_ID=$(./kcadm.sh get users -r mycompany -q username=john.doe --fields id | \
  jq -r '.[0].id')

# Add user to group
./kcadm.sh update users/$USER_ID/groups/$GROUP_ID -r mycompany

# Assign realm role to user
./kcadm.sh add-roles -r mycompany \
  --uusername john.doe \
  --rolename admin

# Assign client role to user
./kcadm.sh add-roles -r mycompany \
  --uusername john.doe \
  --cclientid backend-api \
  --rolename api-read
```

### Assigning Roles to Groups

```bash
# All users in the group inherit these roles
./kcadm.sh add-roles -r mycompany \
  --gname engineering \
  --rolename user

./kcadm.sh add-roles -r mycompany \
  --gname engineering \
  --cclientid backend-api \
  --rolename api-read
```

## Testing with curl and Postman

### Get Discovery Document

```bash
# Fetch OIDC discovery document
curl -s "https://keycloak.example.com/realms/mycompany/.well-known/openid-configuration" | jq .
```

### Get Token and Inspect Claims

```bash
# Get access token
TOKEN_RESPONSE=$(curl -s -X POST \
  "https://keycloak.example.com/realms/mycompany/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=backend-api" \
  -d "client_secret=your-client-secret")

# Extract access token
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')

# Decode and inspect JWT (without validation - for debugging only)
echo $ACCESS_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

### Validate Token at Introspection Endpoint

```bash
curl -s -X POST \
  "https://keycloak.example.com/realms/mycompany/protocol/openid-connect/token/introspect" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=$ACCESS_TOKEN" \
  -d "client_id=backend-api" \
  -d "client_secret=your-client-secret" | jq .
```

### Get User Info

```bash
curl -s \
  "https://keycloak.example.com/realms/mycompany/protocol/openid-connect/userinfo" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### Postman Collection Setup

```json
{
  "info": {
    "name": "Keycloak API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "keycloak_url",
      "value": "https://keycloak.example.com"
    },
    {
      "key": "realm",
      "value": "mycompany"
    },
    {
      "key": "client_id",
      "value": "backend-api"
    },
    {
      "key": "client_secret",
      "value": "your-client-secret"
    }
  ],
  "item": [
    {
      "name": "Get Token",
      "request": {
        "method": "POST",
        "url": "{{keycloak_url}}/realms/{{realm}}/protocol/openid-connect/token",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/x-www-form-urlencoded"
          }
        ],
        "body": {
          "mode": "urlencoded",
          "urlencoded": [
            { "key": "grant_type", "value": "client_credentials" },
            { "key": "client_id", "value": "{{client_id}}" },
            { "key": "client_secret", "value": "{{client_secret}}" }
          ]
        }
      }
    }
  ]
}
```

## Best Practices for Production

### Security Configuration

```json
{
  "realm": "production",
  "sslRequired": "all",
  "bruteForceProtected": true,
  "failureFactor": 5,
  "maxFailureWaitSeconds": 900,
  "passwordPolicy": "length(12) and upperCase(1) and lowerCase(1) and digits(1) and specialChars(1) and notUsername and passwordHistory(5)",
  "accessTokenLifespan": 300,
  "ssoSessionIdleTimeout": 1800,
  "ssoSessionMaxLifespan": 36000
}
```

### Client Security Settings

1. **Always use HTTPS** - Set `sslRequired` to `all` in production
2. **Use PKCE for public clients** - Prevents authorization code interception
3. **Minimize token lifespans** - 5-15 minutes for access tokens
4. **Restrict redirect URIs** - Never use wildcards in production
5. **Disable unused flows** - Turn off implicit flow, limit direct access grants

### Token Best Practices

1. **Use short-lived access tokens** - Refresh frequently
2. **Implement token refresh** - Handle 401 responses gracefully
3. **Validate tokens server-side** - Use introspection or JWT verification
4. **Include only necessary claims** - Minimize token size
5. **Rotate client secrets** - Periodically update credentials

### Operational Recommendations

1. **Export realm configuration** - Store in version control
2. **Automate client provisioning** - Use Admin API or Terraform
3. **Monitor authentication events** - Enable event logging
4. **Set up database backups** - Keycloak state is critical
5. **Use external database** - PostgreSQL or MySQL for high availability

### Summary Checklist

- [ ] Create separate realms for each environment or tenant
- [ ] Use confidential clients for backend services
- [ ] Use public clients with PKCE for SPAs and mobile apps
- [ ] Configure appropriate token lifespans
- [ ] Set up realm and client roles for access control
- [ ] Create protocol mappers for custom claims
- [ ] Organize users into groups with inherited roles
- [ ] Enable brute force protection
- [ ] Enforce strong password policies
- [ ] Test authentication flows before deployment
- [ ] Document client configurations and scopes
- [ ] Set up monitoring and alerting for auth failures

---

Keycloak provides enterprise-grade identity management without the enterprise price tag. With properly configured realms and clients, you get secure authentication, flexible authorization, and seamless single sign-on across all your applications.

Monitor your Keycloak-protected applications with [OneUptime](https://oneuptime.com) - get alerts when authentication services fail and track login success rates across your infrastructure.
