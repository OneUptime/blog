# How to Configure Automatic Team Membership via OAuth Claims in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, Team, Claims, Business Edition

Description: Configure Portainer to automatically assign users to teams based on OAuth claims (groups) returned by your identity provider.

---

Portainer Business Edition can automatically assign users to teams based on group claims returned by your OAuth provider. This eliminates manual team management when user group memberships are already managed in your IdP.

## How Claim-Based Team Assignment Works

When a user logs in via OAuth:
1. Portainer calls the configured Resource URL / userinfo endpoint
2. The IdP returns user claims including group memberships
3. Portainer uses the configured claim and either matches returned claim values to existing team names or maps claim values to teams with regex
4. The user is added to matching teams automatically

## Configure Your IdP to Return Groups

### Azure AD / Entra ID

In Azure portal, configure the app to include group claims:

1. Go to **App registrations > [Your App] > Token configuration**
2. Click **Add groups claim**
3. Select **Security groups**
4. Leave the claim values as group **Object IDs**. In Portainer, map those Object IDs to teams using claim value regex.

### Keycloak

Add a Group Membership mapper to your client (as covered in the Keycloak setup guide) with:
- **Token Claim Name**: `groups`
- **Full group path**: Disabled (return just group names, not `/path/to/group`)

### Authentik

Ensure the `profile` scope mapping is enabled. Authentik includes group membership in the `profile` scope by default.

## Configure Team Auto-Sync in Portainer

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Enable OAuth with group-based team assignment
# Add any provider-specific scopes or claim mappings needed for your IdP
# to return group membership at the configured Resource URL.

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 3,
    "OAuthSettings": {
      "ClientID": "portainer",
      "ClientSecret": "client-secret",
      "AuthorizationURI": "https://idp.example.com/oauth/authorize",
      "AccessTokenURI": "https://idp.example.com/oauth/token",
      "ResourceURI": "https://idp.example.com/oauth/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "email",
      "Scopes": "openid profile email",
      "OAuthAutoCreateUsers": true,
      "OAuthAutoMapTeamMemberships": true,
      "TeamMemberships": {
        "OAuthClaimName": "groups",
        "OAuthClaimMappings": []
      }
    }
  }' \
  --insecure
```

## Create Portainer Teams Matching IdP Groups

Teams must exist in Portainer before the assignment can happen. If your IdP returns group names directly, those values should match the Portainer team names you want to use. If your IdP returns IDs or full paths, configure claim value regex mappings in Portainer instead.

```bash
# Create teams that match the group names returned by your IdP
# when you are relying on direct name matching
for team in "devops" "developers" "platform-engineering" "qa-team"; do
  curl -s -X POST \
    https://localhost:9443/api/teams \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"Name\": \"$team\"}" \
    --insecure | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f'Created team: {r.get(\"Name\", \"?\")} (ID: {r.get(\"Id\", \"?\")})')
"
done
```

## Verify Claim-Based Assignment

After a user logs in, verify their team assignment:

```bash
# List users to find the Portainer user ID
curl -s https://localhost:9443/api/users \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
users = json.load(sys.stdin)
for u in users:
    print(f'User: {u[\"Username\"]:<30} ID: {u[\"Id\"]}')
"

# Inspect a user's team memberships
curl -s https://localhost:9443/api/users/<user-id>/memberships \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -m json.tool
```

## Debugging Team Assignment

If users aren't being assigned to teams:

```bash
# Check Portainer debug logs after a login attempt
docker logs portainer 2>&1 | grep -i "team\|group\|claim\|oauth" | tail -20

# Verify the groups claim is actually returned by your IdP
# Get an access token and call the configured Resource URL / userinfo endpoint manually
curl -H "Authorization: Bearer <access-token>" \
  https://idp.example.com/oauth/userinfo | python3 -m json.tool | grep groups
```

---

*Manage team-based access and monitor container health with [OneUptime](https://oneuptime.com).*
