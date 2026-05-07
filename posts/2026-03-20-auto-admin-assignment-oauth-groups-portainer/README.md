# How to Set Up Auto-Admin Assignment for OAuth Groups in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, Admin, RBAC, Business Edition

Description: Configure Portainer to automatically grant administrator privileges to users who belong to a specific OAuth group or claim.

---

Instead of manually promoting OAuth users to administrators, Portainer BE can automatically grant admin role to users whose IdP group claim values match a configured admin-group regex.

## How Admin Auto-Assignment Works

When a user logs in via OAuth:
1. Portainer checks the configured OAuth claim values for the user, commonly the `groups` claim
2. If the claim values match one of the configured admin-group regexes, they are granted the Administrator role
3. Admin assignment is based on the current claim values returned by the IdP during authentication

## Configure Admin Group in Portainer

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Configure OAuth with admin group assignment

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
      "Scopes": "openid profile email groups",
      "OAuthAutoCreateUsers": true,
      "OAuthAutoMapTeamMemberships": true,
      "TeamMemberships": {
        "OAuthClaimName": "groups",
        "AdminAutoPopulate": true,
        "AdminGroupClaimsRegexList": ["^portainer-admins$"]
      }
    }
  }' \
  --insecure
```

## Set Up the Admin Group in Your IdP

### Microsoft Entra ID (Azure AD)

```powershell
# Connect to Microsoft Entra PowerShell first
Connect-Entra -Scopes 'Group.ReadWrite.All'

# Create a security group for Portainer admins.
# For Microsoft Entra ID, use the group's Object ID in Portainer's
# AdminGroupClaimsRegexList instead of the display name.
$groupParams = @{
  DisplayName = 'portainer-admins'
  MailEnabled = $false
  SecurityEnabled = $true
  MailNickName = 'NotSet'
}
$group = New-EntraGroup @groupParams

# Add admin users
$user = Get-EntraUser -UserId 'admin@example.com'
Add-EntraGroupMember -GroupId $group.Id -MemberId $user.Id
```

### Keycloak

1. Navigate to **Groups** in your realm
2. Create a group named `portainer-admins`
3. Add users who should have admin access
4. Ensure a Group Membership mapper returns a `groups` claim; if it uses full group paths, match that full path in Portainer or use a regex

### Testing the Admin Group Claim

```bash
# After getting an OAuth token, check the groups returned
curl -H "Authorization: Bearer <access-token>" \
  https://idp.example.com/oauth/userinfo | python3 -m json.tool

# Look for output like:
# {
#   "email": "admin@example.com",
#   "groups": ["portainer-admins", "developers"],
#   ...
# }
```

## Verify Admin Assignment

```bash
# After an admin group member logs in, check their role
curl -s https://localhost:9443/api/users \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
users = json.load(sys.stdin)
for u in users:
    role = 'Admin' if u.get('Role') == 1 else 'User'
    print(f'{u[\"Username\"]:<40} Role: {role}')
"
```

## Security Considerations

- `AdminGroupClaimsRegexList` uses regex matching - ensure the expression matches the exact claim value returned by your IdP
- For Microsoft Entra ID, use the group's Object ID in the regex instead of the display name
- Use a dedicated IdP group for Portainer admins, separate from general IT admin groups
- Regularly audit IdP group membership for the admin group
- Keep the initial local admin account available as a fallback

---

*Monitor admin actions and container events with [OneUptime](https://oneuptime.com) observability.*
