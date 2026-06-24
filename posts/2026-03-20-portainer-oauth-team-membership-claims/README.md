# How to Configure Automatic Team Membership via OAuth Claims in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, Team, Claims, RBAC, Business Edition, Automation

Description: Use OAuth token claims to automatically assign users to Portainer teams based on their identity provider group membership.

## Introduction

Portainer Business Edition can use OAuth/OIDC claims to automatically assign users to Portainer teams. This reduces manual team management by assigning memberships during login based on your identity provider data.

## Prerequisites

- Portainer Business Edition
- OAuth authentication configured
- IdP configured to include the required claim in the OIDC userinfo response and/or ID token
- Portainer teams created with names matching the claim values your IdP returns, or static mappings configured when your IdP emits non-name values such as Microsoft Entra group Object IDs

## Step 1: Configure Your IdP to Include Group Claims

### Microsoft Entra ID

1. In the Microsoft Entra app registration → **Token configuration**
2. Click **Add groups claim**
3. Select **Security groups** (or **Groups assigned to the application** if you need cloud-only group display names)
4. Under **ID token**: enable group claims
5. By default, Entra emits group **Object IDs**. Portainer's Microsoft provider documentation recommends using the group's **Object Id** value in the claim value regex instead of the group name. Cloud-only group display names can only be emitted for groups assigned to the application.

```json
// Example ID token payload with groups claim
{
  "sub": "...",
  "email": "alice@corp.com",
  "groups": [
    "0760b6cf-170e-4a14-91b3-4b78e0739963",
    "3b2fa4a0-8b79-4b0e-9a97-4c0f4b7a6a3e"
  ]
}
```

### Keycloak

Add a Group Membership mapper to the client scope:

```text
Mapper Type:       Group Membership
Token Claim Name:  groups
Full group path:   Off
Add to ID token:   On
Add to userinfo:   On
```

### Authelia

Enable groups scope:
```yaml
clients:
  - client_id: portainer
    scopes:
      - openid
      - profile
      - email
      - groups  # Keep this when overriding the default scopes
```

### Authentik

Create a scope mapping that includes groups:

1. **Customization** → **Property Mappings**
2. Create a new **Scope Mapping**:

```python
# Name: Portainer Groups

# Scope name: groups
return {
    "groups": [group.name for group in request.user.ak_groups.all()]
}
```

## Step 2: Verify Claims Are Present

Test your OAuth/OIDC flow and inspect the OIDC userinfo response or decode the ID token:

```bash
# Decode an ID token payload (JWT uses base64url encoding)
ID_TOKEN="eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature"
python3 - <<'PY'
import base64, json, os

payload = os.environ["ID_TOKEN"].split(".")[1]
payload += "=" * (-len(payload) % 4)

print(json.dumps(json.loads(base64.urlsafe_b64decode(payload)), indent=2))
PY
```

Verify the `groups` claim is present and contains the expected values. For custom OAuth providers, make sure the same claim is also available from the OIDC userinfo endpoint configured as Portainer's `Resource URL`.

## Step 3: Configure Claim Name in Portainer

In Settings → Authentication → OAuth (Portainer BE), under **Team Membership**:

```text
Automatic team membership: On
Claim name:               groups
```

This tells Portainer which claim contains the values Portainer should use for team mapping.

## Step 4: Create Teams to Match Claim Values

Create the Portainer teams you want to assign. If your provider emits group names in the claim, the team names should match those values exactly. If your provider emits different values (such as Microsoft Entra Object IDs), create the teams and use Portainer's static claim-to-team mappings instead of relying on direct team-name matching.

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Example: create teams for providers that emit group names in the claim
GROUPS=("portainer-devops" "portainer-qa" "portainer-readonly" "portainer-admins")

for group in "${GROUPS[@]}"; do
  curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    https://portainer.example.com/api/teams \
    -d "{\"name\": \"${group}\"}"
  echo "Created team: $group"
done
```

## Step 5: Assign Environment Access to Teams

After teams are created, grant them environment access:

```bash
# Get team IDs
TEAMS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/teams \
  | python3 -c "import sys,json; [print(f'{t[\"Id\"]}:{t[\"Name\"]}') for t in json.load(sys.stdin)]")

echo "$TEAMS"

# Get available role IDs
ROLES=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/roles \
  | python3 -c "import sys,json; [print(f'{r[\"Id\"]}:{r[\"Name\"]}') for r in json.load(sys.stdin)]")

echo "$ROLES"

# Example: assign team 1 to environment 1 using role ID 2
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d '{"TeamAccessPolicies": {"1": {"RoleId": 2}}}'
```

## Verifying Team Synchronization

1. Log in with an OAuth user who belongs to a group
2. Log out and log back in
3. Check the user's team memberships via API:

```bash
# Get user ID for the OAuth user
curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/users \
  | python3 -c "import sys,json; [print(f'ID={u[\"Id\"]} User={u[\"Username\"]}') for u in json.load(sys.stdin)]"

# Check team memberships for user ID 3
curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/users/3/memberships \
  | python3 -m json.tool
```

## Conclusion

OAuth/OIDC claims-based team membership in Portainer Business Edition can automate team assignment based on identity provider data. The critical requirements are: your IdP returns the required claim, the correct claim name is configured in Portainer, and Portainer teams or static claim-to-team mappings are configured to match the values your provider returns.
