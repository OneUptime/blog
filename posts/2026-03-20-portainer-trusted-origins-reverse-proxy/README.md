# How to Configure Trusted Origins in Portainer for Reverse Proxies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Reverse Proxy, Security, CSRF, Configuration

Description: Learn how to properly configure the --trusted-origins flag in Portainer to allow secure access through reverse proxies and custom domains.

## Introduction

Portainer's `--trusted-origins` configuration is a security mechanism that controls which cross-origin browser origins are allowed to make unsafe requests to the Portainer API. When deploying behind a reverse proxy, configuring this correctly is essential for both security and functionality.

## Understanding Trusted Origins

The trusted origins check operates as follows:

1. For unsafe cross-origin browser requests, the browser sends headers such as `Origin`, and modern browsers also send `Sec-Fetch-Site`
2. Portainer allows same-origin requests automatically and compares configured trusted origins against the browser's `Origin` value
3. If the origin is not trusted, the request is rejected with HTTP `403 Forbidden`

Portainer does not build a separate default trusted origins list for same-origin access. Same-origin browser requests are allowed automatically. Once the browser origin differs because of a reverse proxy, custom domain, or separate frontend, you must explicitly add that origin.

## Basic Configuration

### Via Command Flag

```bash
# Single origin

docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --trusted-origins=https://portainer.example.com

# Multiple origins (comma-separated, no spaces)
docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --trusted-origins=https://portainer.example.com,https://portainer.internal.com

# Include port if non-standard
docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --trusted-origins=https://portainer.example.com:8443
```

### Via Docker Compose

```yaml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: always
    ports:
      - "9443:9443"
      - "8000:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    command:
      - "--trusted-origins=https://portainer.example.com,https://portainer.backup.example.com"

volumes:
  portainer_data:
```

### Via Environment Variable

In some deployment scenarios, you can use environment variables to pass configuration:

```yaml
  portainer:
    image: portainer/portainer-ce:lts
    environment:
      # Use the environment variable form
      - TRUSTED_ORIGINS=https://portainer.example.com
```

Note: The `--trusted-origins` flag and `TRUSTED_ORIGINS` environment variable were added in Portainer `2.27.9` LTS and `2.31.3` STS. Older releases do not support them.

## Multi-Environment Scenarios

### Development + Production

```bash
docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --trusted-origins=https://portainer.example.com,http://localhost:9000,http://dev.example.internal:9000
```

### Multiple Subdomains

```bash
# Each subdomain must be listed explicitly - wildcards in origins are not supported
docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --trusted-origins=https://portainer.us.example.com,https://portainer.eu.example.com,https://portainer.ap.example.com
```

### Subpath Deployment

When Portainer is served at a subpath (e.g., `https://example.com/portainer/`), the origin is still just the scheme + host:

```bash
# For https://example.com/portainer/, the origin is https://example.com
docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --base-url=/portainer \
  --trusted-origins=https://example.com
```

## Verifying Your Configuration

### Check Current Configuration

```bash
# View the Portainer process arguments
docker inspect portainer | python3 -c "import sys,json; c=json.load(sys.stdin); print(c[0]['Config']['Cmd'])"
```

### Test Origin Validation

```bash
# Use -k if Portainer is still using its default self-signed certificate
curl -k -i -X POST \
  -H "Origin: https://portainer.example.com" \
  -H "Content-Type: application/json" \
  --data '{"username":"invalid","password":"invalid"}' \
  https://portainer.example.com/api/auth

# HTTP 403 means the origin was rejected before the auth handler ran
```

### Monitor Portainer Logs

```bash
# Watch for origin rejection messages
docker logs portainer -f 2>&1 | grep -i "csrf check failed\|origin\|trusted"
```

## Common Mistakes

| Mistake | Correct Approach |
|---------|-----------------|
| `--trusted-origins=portainer.example.com` | Must include scheme: `https://portainer.example.com` |
| `--trusted-origins=https://portainer.example.com/` | No trailing slash |
| Missing port: `https://portainer.example.com` | If custom port: `https://portainer.example.com:8443` |
| Wildcard: `https://*.example.com` | Not supported; list each origin |

## Security Considerations

- Portainer requires explicit origins; `*` is not a valid value for `--trusted-origins`
- List only origins your users actually access Portainer from
- Review and update the trusted origins list when changing DNS or proxy configurations
- Treat this list as part of your security configuration

## Conclusion

Properly configured trusted origins are the bridge between Portainer's CSRF protection and your reverse proxy setup. By explicitly listing every origin that users access Portainer through, you maintain security while enabling seamless proxy access. Always use the full origin with scheme and hostname, and include the port when it is non-standard, matching exactly what appears in users' browser address bars.
