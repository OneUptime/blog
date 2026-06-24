# How to Fix Login Failures in Portainer v2.30.0 - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Authentication, Login

Description: Resolve login failures and authentication issues introduced in Portainer v2.30.0, including password validation changes, session handling updates, and migration issues.

## Introduction

Portainer v2.30.0 has a documented known issue for some reverse-proxy deployments that can cause "Origin invalid" login failures. Portainer also documents post-update authentication failures caused by stale browser cache or local storage after security-related changes. If your instance enforces a higher minimum password length, users with older shorter passwords are prompted to update them on their next login. This guide covers the supported troubleshooting steps for this version.

## Step 1: Check the Exact Error Message

Different error messages indicate different causes:

```bash
# Portainer serves HTTPS on 9443 by default.
# Use http://localhost:9000 only if you explicitly enabled legacy HTTP.
curl -k -v -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' 2>&1

# Success returns JSON with a jwt field.
# If this works but the browser UI still fails, clear browser data
# or check for reverse-proxy "Origin invalid" issues.
```

## Step 2: Reset Admin Password

If credentials are not working after upgrade, use Portainer's password reset helper. The `--admin-password` flag only works when the admin user is first created.

```bash
# Stop Portainer
docker stop portainer

# Reset the default admin account password
docker pull portainer/helper-reset-password
docker run --rm -v portainer_data:/data \
  portainer/helper-reset-password --password "MyNewP@ssw0rd!"

# Start Portainer again
docker start portainer
```

## Step 3: Fix Post-Update Browser Session Issues

Portainer documents post-update login failures caused by stale authentication data stored in the browser:

```bash
# If browser login fails with a 403 on /api/auth after an upgrade:
# 1. Clear browser cache and site data for the Portainer URL
# 2. Try an incognito/private browsing window
# 3. Retry the login after the old browser state has been removed
```

## Step 4: Fix LDAP/OAuth Login Issues

If you use LDAP or OAuth and login stopped working:

```bash
# Check Portainer logs for authentication-provider errors
docker logs portainer 2>&1 | grep -iE "ldap|oauth|saml|auth" | tail -20
```

Only the initial admin account can use internal authentication when an external provider is enabled.

In Portainer UI:
1. If external authentication is enabled and you're locked out, browse to `https://<your-portainer>:9443/#!/internal-auth`
2. Sign in with the initial admin account
3. Go to **Settings** → **Authentication**
4. For LDAP/AD, update the configured service account credentials and run the connectivity check
5. For OAuth, verify that the redirect/callback URL still matches your Portainer URL

## Step 5: Check Password Policy Requirements

Portainer lets administrators enforce a minimum password length. The default is 12 characters, and users whose passwords do not meet the current requirement are prompted to update them on their next login.

In Portainer UI:
1. Go to **Settings** → **Authentication**
2. Review the minimum password length configured for internal authentication
3. If the user's password no longer meets the policy, reset it to a compliant value

## Step 6: Fix Reverse-Proxy "Origin invalid" Issues

Portainer documents "Origin invalid" as a known issue for some reverse-proxy deployments on v2.30.0 and recommends updating to 2.31.3, which added the supported workaround:

```bash
# Upgrade to a release with the reverse-proxy workaround
docker stop portainer && docker rm portainer
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:2.31.3 \
  --trusted-origins portainer.example.com
```

Replace `portainer.example.com` with the domain you use to access Portainer through the proxy.

## Step 7: Switch Back to Internal Authentication

If an external authentication or SSO configuration is preventing logins, Portainer provides a break-glass internal login path for the initial admin account:

```text
https://localhost:9443/#!/internal-auth
```

Replace `https://localhost:9443` with your Portainer URL, then sign in as the initial admin user. If you no longer know that password, use the password reset helper from Step 2.

## Step 8: Fix Team/RBAC Access Issues

In Portainer BE, user, team, and role configuration can cause access-denied errors after login even when authentication itself succeeds:

1. Log in with the initial admin account
2. Go to **Users** and review the user's role
3. Verify the user's team membership and environment access
4. Correct the permissions, then have the user log in again

## Step 9: Verify API Version Compatibility

Portainer 2.30.0 changed several API endpoints, and the release notes specifically list `GET /system/info` as deleted. Review automation or API clients that still depend on older endpoints and update them against the official Portainer release notes and API documentation.

- Release notes: https://docs.portainer.io/release-notes
- API docs: https://docs.portainer.io/api/docs

## Step 10: Roll Back to Stable Version

If v2.30.0 login issues cannot be resolved:

```bash
# Stop and remove the 2.30.0 container
docker stop portainer && docker rm portainer

# Restore the database backup you took before upgrading to 2.30.0
docker run --rm \
  -v portainer_data:/data \
  -v /tmp:/backup \
  alpine cp /backup/portainer.db.pre-2.30.0.bak /data/portainer.db

# Start with the previous stable version
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:2.29.2
```

> **Best Practice**: Always back up `portainer_data` before upgrading to a new version.

## Conclusion

Login failures in Portainer v2.30.0 are most commonly tied to the documented reverse-proxy "Origin invalid" issue or stale browser authentication data after an upgrade. The supported password recovery method is the `portainer/helper-reset-password` helper, not the `--admin-password` startup flag on an existing installation. If you rely on external authentication, use the `/#!/internal-auth` path with the initial admin account to recover access. Always maintain a pre-upgrade backup of `portainer_data` so you can roll back safely if needed.
