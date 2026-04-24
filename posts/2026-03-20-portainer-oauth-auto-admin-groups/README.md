# How to Set Up Auto-Admin Assignment for OAuth Groups in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, Admin, Group, Automation, RBAC

Description: Automatically assign administrator privileges to Portainer users who belong to specific OAuth identity provider groups.

## Introduction

Manually assigning admin roles to users after OAuth login creates management overhead. Portainer Business Edition supports automatic admin role assignment based on group membership in your OAuth identity provider. Members of a designated "admin group" receive Portainer administrator privileges automatically on login.

## Prerequisites

- Portainer Business Edition
- OAuth authentication configured
- IdP configured to return the group claim in the ID token or user info/resource response
- Admin group created in your IdP

## How Auto-Admin Assignment Works

1. User logs in via OAuth
2. Portainer reads the configured claim name (`groups` is a common choice)
3. If any claim value matches a configured admin-group regex, user gets admin role
4. If no admin-group regex matches, user gets standard user role
5. Role is re-evaluated on each login

## Step 1: Create Admin Group in IdP

### Microsoft Entra ID (Azure AD)

```powershell
Connect-Entra -Scopes 'Group.ReadWrite.All','GroupMember.ReadWrite.All','User.Read.All'

# Create a security group for Portainer admins
$group = New-EntraGroup -DisplayName "portainer-admins" `
  -MailEnabled $false `
  -SecurityEnabled $true `
  -MailNickname "portainer-admins"

# Add an admin user to the group
$user = Get-EntraUser -UserId "alice@corp.com"
Add-EntraGroupMember -GroupId $group.Id -MemberId $user.Id
```

### Keycloak

```bash
KEYCLOAK_URL="https://keycloak.example.com"
REALM="myrealm"

# Create the admin group
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "${KEYCLOAK_URL}/admin/realms/${REALM}/groups" \
  -d '{"name": "portainer-admins"}'
```

### Authentik

Create a group named `portainer-admins` in Authentik's admin UI under **Directory** → **Groups**.

## Step 2: Ensure Admin Group Claim Is Available to Portainer

Verify the group value you want Portainer to match is present in the OAuth data Portainer reads. For some providers this is in the ID token, while for others it is returned by the configured user info/resource endpoint.

```bash
# If your IdP puts groups in the ID token, decode a test token and inspect the claim
python3 - <<'PY'
import base64, json

token = "eyJ..."
payload = token.split(".")[1]
payload += "=" * (-len(payload) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(payload)), indent=2))
PY

# Example output:
# "groups": ["portainer-admins", "all-employees", "it-department"]
# Microsoft Entra ID emits group Object IDs by default unless you changed the claim format.
```

## Step 3: Configure Auto-Admin in Portainer

### Via Web UI (Portainer BE)

1. Go to Settings → Authentication → OAuth
2. Turn on **Automatic team membership**
3. Set **Claim name** to the claim that contains your group values (commonly `groups`)
4. Enable automatic admin assignment and add a regex that matches your admin group value (for example `portainer-admins`; for Microsoft Entra ID, use the group's Object ID)
5. Save settings

### Via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 3,
    "OAuthSettings": {
      "ClientID": "your-client-id",
      "ClientSecret": "your-client-secret",
      "AuthorizationURI": "https://idp.example.com/oauth/authorize",
      "AccessTokenURI": "https://idp.example.com/oauth/token",
      "ResourceURI": "https://idp.example.com/oauth/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "email",
      "Scopes": "openid profile email",
      "OAuthAutoCreateUsers": true,
      "OAuthAutoMapTeamMemberships": true,
      "SSO": true,
      "DefaultTeamID": 0,
      "TeamMemberships": {
        "OAuthClaimName": "groups",
        "AdminAutoPopulate": true,
        "AdminGroupClaimsRegexList": [
          "portainer-admins"
        ],
        "OAuthClaimMappings": []
      }
    }
  }'
```

For Microsoft Entra ID, replace `portainer-admins` in `AdminGroupClaimsRegexList` with the group's Object ID unless you explicitly changed the emitted claim format.

## Step 4: Test Admin Assignment

1. Log in with an account that's a member of `portainer-admins`
2. After login, check if you see the admin menu items (Settings, Users, Teams, etc.)
3. If you already have a Portainer bearer token for that same user, verify via API:

```bash
# Inspect the current user's role
curl -s -H "Authorization: Bearer $PORTAINER_TOKEN" \
  "https://portainer.example.com/api/users/me?noEndpointAuthorizations=true" \
  | python3 -m json.tool
# Expect "Role": 1 for an administrator account
```

## Security Considerations

- Keep the admin group small and well-governed
- Review admin group membership regularly in your IdP
- Remove admin group membership (not just Portainer access) for users who leave admin roles
- Consider naming the admin group something specific to Portainer (e.g., `portainer-admins`) rather than using a generic IT-admins group that includes more people than need Portainer admin access

## Conclusion

Auto-admin assignment based on OAuth groups centralizes role management in your identity provider. Granting or revoking Portainer admin privileges is now a matter of adding or removing users from the admin group in your IdP and having them log in again - no Portainer UI interaction required. This is particularly valuable in organizations where the IdP team manages group membership independently from the infrastructure team managing Portainer.
