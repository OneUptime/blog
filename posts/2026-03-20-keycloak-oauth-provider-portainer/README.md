# How to Set Up Keycloak as an OAuth Provider for Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Keycloak, OAuth, OIDC, Enterprise SSO

Description: Configure Keycloak as an OpenID Connect provider for Portainer to enable enterprise-grade SSO with role mapping and realm management.

---

Keycloak is a widely-used enterprise identity and access management solution. Integrating it with Portainer provides a complete SSO solution with group/role mapping, MFA, and user federation.

## Step 1: Create a Keycloak Realm (if needed)

```bash
# Or use the master realm for testing

# In Keycloak Admin Console:
# Realm Settings > New Realm > Name: "infrastructure"
```

## Step 2: Create a Keycloak Client for Portainer

1. In Keycloak Admin Console, select your realm
2. Navigate to **Clients** > **Create client**
3. Configure:
   - **Client type**: OpenID Connect
   - **Client ID**: `portainer`
   - **Name**: Portainer
4. Click **Next**
5. Enable **Client authentication** (confidential client)
6. Set **Valid redirect URIs**: `https://portainer.example.com/`
7. Set **Web origins**: `https://portainer.example.com`
8. Click **Save**
9. Go to **Credentials** tab and copy the **Client Secret**

## Step 3: Get Keycloak OIDC Endpoints

```bash
KEYCLOAK_URL="https://keycloak.example.com"
REALM="infrastructure"

# Get all OIDC endpoints from the discovery document
curl "$KEYCLOAK_URL/realms/$REALM/.well-known/openid-configuration" | \
  python3 -c "
import sys, json
config = json.load(sys.stdin)
for key in ['authorization_endpoint', 'token_endpoint', 'userinfo_endpoint']:
    print(f'{key}: {config[key]}')
"
```

## Step 4: Configure Portainer with Keycloak

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

KEYCLOAK_URL="https://keycloak.example.com"
REALM="infrastructure"

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"ClientID\": \"portainer\",
      \"ClientSecret\": \"keycloak-client-secret\",
      \"AuthorizationURI\": \"$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/auth\",
      \"AccessTokenURI\": \"$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token\",
      \"ResourceURI\": \"$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/userinfo\",
      \"RedirectURI\": \"https://portainer.example.com/\",
      \"UserIdentifier\": \"preferred_username\",
      \"Scopes\": \"openid profile email\",
      \"OAuthAutoCreateUsers\": true
    }
  }" \
  --insecure
```

## Keycloak Endpoints Reference

| Portainer Field | Keycloak Value |
|-----------------|---------------|
| Authorization URL | `https://keycloak.example.com/realms/{realm}/protocol/openid-connect/auth` |
| Access Token URL | `https://keycloak.example.com/realms/{realm}/protocol/openid-connect/token` |
| Resource URL | `https://keycloak.example.com/realms/{realm}/protocol/openid-connect/userinfo` |
| User Identifier | `preferred_username` |

## Map Keycloak Groups to Portainer Teams

Add a groups mapper to the Portainer client in Keycloak:

1. In the `portainer` client, go to **Client scopes**
2. Open `portainer-dedicated` scope
3. Add a **Group Membership** mapper:
   - Token Claim Name: `groups`
   - Full group path: disabled
4. This includes group names in the userinfo response for Portainer to consume

In Portainer Business Edition, enable **Automatic team membership** and set the **Claim name** to `groups`. Team names matching the Keycloak group names will then be auto-assigned on login. If your Keycloak group names and Portainer team names differ, use the **Statically assigned teams** mappings in Portainer.

---

*Monitor your Keycloak and Portainer services together with [OneUptime](https://oneuptime.com).*
