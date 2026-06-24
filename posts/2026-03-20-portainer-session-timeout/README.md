# How to Configure Session Timeout Duration in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Session Management, Administration, Configuration

Description: Set the user session timeout in Portainer to automatically log out inactive users and meet security compliance requirements.

## Introduction

Session lifetime controls how long a user can remain logged into Portainer before being required to reauthenticate. This is a critical security control for shared workstations, compliance-driven environments, and general security hygiene. Portainer allows configuring this via the UI and API.

## Default Session Timeout

Portainer's default session lifetime is **8 hours**. For production environments, this may be too long.

Session lifetime changes apply only to new logins. Existing sessions keep their original expiry.

## Method 1: No Dedicated CLI Flag

Portainer does not currently document a dedicated CLI flag for setting the user session lifetime at startup. Configure the setting after deployment using the Settings UI or the `/api/settings` endpoint.

Common duration format strings:

```text
1h      = 1 hour
30m     = 30 minutes
2h30m   = 2.5 hours
24h     = 24 hours (1 day)
168h    = 1 week
```

## Method 2: Settings UI (Recommended)

1. Log in as an administrator
2. Go to **Settings** → **Authentication**
3. Find **Session lifetime**
4. Choose a preset duration:
   - `30m` - 30 minutes
   - `1h` - 1 hour
   - `4h` - 4 hours
   - `8h` - 8 hours (Portainer default)
   - `24h` - 24 hours
   - `168h` - 1 week
   - `720h` - 1 month
   - `4320h` - 6 months
   - `8640h` - 1 year

## Method 3: API Configuration

Use the `/api/settings` endpoint with an administrator account:

```bash
# Authenticate
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Update session lifetime to 2 hours
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "UserSessionTimeout": "2h"
  }'

# Verify the change
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/settings \
  | python3 -c "import sys,json; s=json.load(sys.stdin); print('Timeout:', s.get('UserSessionTimeout','not set'))"
```

## Docker Compose Configuration

```yaml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:sts
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

Then configure via the Settings UI after deployment for easier management.

## Session Timeout vs. Token Expiry

It's important to understand the difference:

| Setting | What It Controls |
|---------|-----------------|
| **Session lifetime** | How long a Portainer login session remains valid after authentication |
| **JWT token expiry** | The expiry embedded in the JWT issued at login; it follows the configured session lifetime |
| **API Access Tokens** | Separate API keys used for API access and not affected by session lifetime |

API access tokens (generated in **My account** → **Access tokens**) are not affected by session lifetime and remain valid until they are deleted.

## Compliance Recommendations

**HIPAA / Healthcare**: HIPAA includes an addressable automatic logoff safeguard; choose a session lifetime that fits your risk analysis and operating environment.

**PCI-DSS**: Requires users to reauthenticate after no more than 15 minutes of idle time. Portainer documents this setting as session lifetime, so verify it satisfies your assessor's inactivity-timeout expectations.

**NIST 800-53**: AC-12 requires automatic session termination after an organization-defined condition such as inactivity.

```json
{
  "UserSessionTimeout": "15m"
}
```

## Monitoring Session Activity

Track session-related activity via Portainer Business Edition logs:

1. Go to **Logs** → **Authentication** to review sign-in events.
2. Go to **Logs** → **Activity** to review user actions.
3. Use the date filters and export logs to CSV if needed.

You can also stream authentication and activity logs to an external SIEM using the `--syslog-*` CLI options.

## Conclusion

Configuring session lifetime is a simple but important security measure. Start with the Settings UI for the most straightforward approach, and use the API for automation. For compliance-driven environments, confirm that Portainer's session lifetime behavior matches your specific framework requirements, and document the setting as part of your security controls.
