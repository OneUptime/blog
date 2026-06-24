# How to Fix 'Origin Invalid' Errors After Upgrading Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, CSRF, Origin, Security, Upgrade, Reverse Proxy

Description: Learn how to fix 'Origin Invalid' or 'CSRF check failed' errors that appear after upgrading Portainer, caused by stricter origin validation introduced in newer versions.

---

Portainer 2.27.7+ introduced stricter CSRF origin validation after an underlying library update. After upgrading, users behind reverse proxies or accessing Portainer via alternate URLs may see "Origin Invalid" errors when trying to log in or perform actions. Portainer later added a documented workaround in 2.27.9 LTS and 2.31.3 STS: `--trusted-origins` / `TRUSTED_ORIGINS`.

## Why This Happens After Upgrade

Portainer validates the `Origin` and `Referer` headers on browser requests, and reverse-proxy headers such as `X-Forwarded-Proto` can affect how those checks are evaluated. If the browser is using a different scheme, host, or subpath than Portainer expects - or the proxy is not forwarding the external request details correctly - POST requests can fail with 403 errors.

## Step 1: Identify the Mismatch

```bash
# Check what origin Portainer is receiving

docker logs portainer 2>&1 | grep -i "origin\|csrf\|referer" | tail -20

# You may see messages like:
# 'Failed to validate Origin or Referer | error="origin invalid"'
# or 'CSRF check failed'
```

## Step 2: Access Portainer via Its Configured URL

The simplest fix: access Portainer via the exact URL Portainer expects, including scheme, host, and subpath:

```bash
# If Portainer is behind a reverse proxy at https://portainer.example.com/portainer,
# always access it via that URL, not via direct IP:port or a different hostname
```

## Step 3: Preserve Host and Forwarded Headers in Reverse Proxy

Configure your reverse proxy to preserve the external host and scheme Portainer should see:

```nginx
location / {
    # If you kept Portainer's legacy HTTP port 9000 enabled:
    proxy_pass http://portainer:9000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
}
```

## Step 4: Set --base-url Flag

If Portainer is served from a subpath (e.g., `/portainer`), set the base URL flag:

```bash
docker run -d ... portainer/portainer-ce:lts \
  --base-url /portainer
```

Without this, Portainer generates incorrect redirect URLs and origin checks can fail. Your reverse proxy still needs to strip the `/portainer` prefix before proxying the request upstream.

## Step 5: Roll Back to Previous Version Temporarily

If you need immediate access while diagnosing, roll back only with a matching database backup:

```bash
# Stop and remove the current container, but keep the data volume
docker stop portainer
docker rm portainer

# Portainer cannot use a newer database on an older image.
# Restore the backup at /data/backups/portainer.db.bak to /data/portainer.db
# inside the portainer_data volume, then start the exact previous version.
docker run -d -p 8000:8000 -p 9443:9443 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:<your-previous-working-version>
```

## Step 6: Set `--trusted-origins`

If Portainer is behind a reverse proxy or is intentionally accessed via more than one valid external URL, use Portainer's documented workaround:

```bash
docker run -d ... portainer/portainer-ce:lts \
  --trusted-origins https://portainer.example.com
```

Or in Compose:

```yaml
environment:
  - TRUSTED_ORIGINS=https://portainer.example.com
```

If you access Portainer directly by IP instead, use that exact origin consistently in the browser and in your Portainer configuration.
