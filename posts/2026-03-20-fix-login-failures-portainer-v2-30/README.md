# How to Fix Login Failures in Portainer v2.30.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Authentication, Login, V2.30, JWT, Upgrade

Description: Learn how to fix login failures introduced in Portainer v2.30.0, including JWT changes, admin password reset procedures, and database migration issues.

---

After upgrading to Portainer v2.30.0, some users may hit login failures caused by stale browser-side authentication state or the known reverse proxy `Origin invalid` issue documented for this release.

## Step 1: Clear Browser State

Before anything else, rule out stale browser state after the upgrade:

```bash
# In browser DevTools (F12) > Application > Storage > Clear site data
# Or test the login flow in a private/incognito window first
#
# This clears cached tokens, cookies, and local storage that can block
# authentication after an update
```

## Step 2: Check for CSRF / Origin Validation Changes

Portainer v2.30.0 has a documented known issue where deployments behind some reverse proxies may return `Forbidden - Origin invalid` during login:

```bash
# Check Portainer logs for origin errors
docker logs portainer 2>&1 | grep -Ei "origin|csrf|referer|forbidden"
```

If origin errors appear, update to `2.31.3` or newer. When Portainer is behind a reverse proxy, use the documented `--trusted-origins` option (or `TRUSTED_ORIGINS` environment variable) with the hostname you use to access Portainer:

```bash
docker stop portainer && docker rm portainer

docker run -d --name portainer \
  -p 9443:9443 -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:2.31.3 \
  --trusted-origins portainer.example.com
```

## Step 3: Reset the Admin Password

If you cannot log in with the correct password:

```bash
# Stop Portainer
docker stop portainer

# Pull and run the reset utility against the Portainer data volume
docker pull portainer/helper-reset-password
docker run --rm -v portainer_data:/data portainer/helper-reset-password

# The output will show a new random password
# Use it to log in, then change it in the UI
docker start portainer
```

## Step 4: Check for Database Migration Errors

```bash
# Look for migration errors in the startup logs
docker logs portainer 2>&1 | grep -Ei "migration|migrate|database"

# Portainer cannot use a newer database on an older version.
# If you need to roll back, restore the automatic DB backup first.
docker stop portainer && docker rm portainer

docker run --rm -v portainer_data:/data alpine sh -c \
  'mv /data/portainer.db /data/portainer.db.oldversion && \
   cp /data/backups/portainer.db.bak /data/portainer.db'

# Start Portainer again using the exact image tag you were running before
# the upgrade. The version must match the backed up database.
```

## Step 5: Verify the URL and Protocol You Are Using

Portainer serves HTTPS on `9443` by default. If your upgrade also changed published ports or disabled HTTP, make sure you are signing in to the correct URL for your deployment:

```bash
# Example default URL for current Portainer deployments
# https://your-hostname:9443
```

## Step 6: Check LDAP/OAuth Configuration

If using external authentication, re-test the configuration stored under **Settings > Authentication**. For LDAP, Portainer specifically recommends rechecking the configured service account credentials and running the built-in connectivity check:

1. Go to **Settings > Authentication**.
2. Re-enter and re-test your LDAP/OAuth configuration.
3. For LDAP, run the connectivity check before saving changes.
