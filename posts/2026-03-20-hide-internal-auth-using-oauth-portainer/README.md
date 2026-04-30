# How to Hide Internal Authentication When Using OAuth in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, SSO, Security, Authentication

Description: Configure Portainer to hide the internal username/password login form and show only the OAuth SSO button for a cleaner login experience.

---

Once OAuth SSO is configured and working reliably, you may want to hide the internal Portainer username/password form to enforce SSO-only authentication and provide a simpler login experience.

## Prerequisites

- OAuth authentication configured and verified working
- Access to the initial Portainer administrator account as an emergency fallback
- Portainer Business Edition

## Enable Hide Internal Authentication

### Via the UI

1. Navigate to **Settings > Authentication**
2. Enable **OAuth** authentication
3. Find the **Hide internal authentication prompt** toggle
4. Enable it and click **Save**

### Via the API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"your-initial-admin-username","password":"your-initial-admin-password"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Retrieve the current settings, then enable OAuth and hide the internal login form

SETTINGS=$(curl -s \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  --insecure)

UPDATED_SETTINGS=$(printf '%s' "$SETTINGS" | python3 -c "
import json, sys
settings = json.load(sys.stdin)
settings['AuthenticationMethod'] = 3
settings['OAuthSettings']['HideInternalAuth'] = True
json.dump({
    'AuthenticationMethod': settings['AuthenticationMethod'],
    'OAuthSettings': settings['OAuthSettings']
}, sys.stdout)
")

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATED_SETTINGS" \
  --insecure
```

## Emergency Access When OAuth is Hidden

When `HideInternalAuth` is true, the internal login form is hidden but can still be accessed using Portainer's documented internal authentication URL:

```text
https://portainer.example.com/#!/internal-auth
```

You can then sign in with the initial administrator user that was created during setup.

## Keep the Initial Admin Account Active

Before hiding internal authentication, ensure the initial administrator account can still authenticate:

```bash
# Verify the initial administrator account can still authenticate
curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"your-initial-admin-username","password":"strongpassword123!"}' \
  --insecure | python3 -c "
import sys, json
r = json.load(sys.stdin)
if 'jwt' in r:
    print('Initial admin login: SUCCESS')
else:
    print(f'Initial admin login: FAILED - {r}')
"
```

## What Users See

After enabling `HideInternalAuth`:
- The login page shows only the **Login with OAuth** button
- No username/password fields are displayed
- Users are redirected to the IdP when they click the SSO button

## Re-Enable Internal Authentication

If you need to re-enable the internal login form:

```bash
SETTINGS=$(curl -s \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  --insecure)

UPDATED_SETTINGS=$(printf '%s' "$SETTINGS" | python3 -c "
import json, sys
settings = json.load(sys.stdin)
settings['OAuthSettings']['HideInternalAuth'] = False
json.dump({'OAuthSettings': settings['OAuthSettings']}, sys.stdout)
")

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATED_SETTINGS" \
  --insecure
```

---

*Ensure your SSO-protected Portainer stays available with monitoring from [OneUptime](https://oneuptime.com).*
