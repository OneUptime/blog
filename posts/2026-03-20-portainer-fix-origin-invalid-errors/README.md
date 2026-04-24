# How to Fix 'Origin Invalid' Errors in Portainer Behind a Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Reverse Proxy, Troubleshooting, Security, CSRF

Description: Diagnose and fix the 'Origin is not trusted' or 'Origin invalid' CSRF protection error when accessing Portainer through a reverse proxy.

## Introduction

When you access Portainer through a reverse proxy, you may encounter an error like:

```json
{"message":"Access denied: origin not trusted"}
```

or the login form simply refuses to submit. This is Portainer's CSRF protection working as intended - it rejects requests whose `Origin` header doesn't match the server's expected origin. This guide explains why it happens and how to fix it.

## Why This Error Occurs

Portainer validates the `Origin` header on all state-changing requests. When accessed directly on `https://myserver:9443`, Portainer considers `https://myserver:9443` a trusted origin. When accessed via a reverse proxy at `https://portainer.example.com`, the Origin becomes `https://portainer.example.com` - which Portainer hasn't been told to trust.

## Diagnosing the Issue

Check your browser's developer console for the actual error:

```bash
# Check Portainer logs for origin-related errors

docker logs portainer 2>&1 | grep -i origin

# Test the origin header manually
curl -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -H "Origin: https://portainer.example.com" \
  -d '{"username":"admin","password":"password"}' \
  -v 2>&1 | grep -i "origin\|denied\|trusted"
```

## Fix 1: Use --trusted-origins Flag (Recommended)

Add the `--trusted-origins` flag to your Portainer startup command. This option was added in Portainer 2.27.9 LTS and 2.31.3 STS. Pass hostnames only - do not include `https://`, a path, or a port:

```bash
# Docker run
docker run -d \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --trusted-origins=portainer.example.com

# Multiple origins (comma-separated)
docker run -d \
  --name portainer \
  portainer/portainer-ce:latest \
  --trusted-origins=portainer.example.com,portainer.internal.example.com
```

### In Docker Compose

```yaml
  portainer:
    image: portainer/portainer-ce:latest
    command:
      - "--trusted-origins=portainer.example.com"
```

### In Docker Swarm Stack

```yaml
  portainer:
    image: portainer/portainer-ce:latest
    command:
      - "--trusted-origins=portainer.example.com"
    deploy:
      placement:
        constraints:
          - node.role == manager
```

## Fix 2: Ensure X-Forwarded-Proto Is Set Correctly

Portainer also checks whether the original browser request was HTTPS. Make sure your reverse proxy sets the correct `X-Forwarded-Proto` header:

### Nginx

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

### Traefik

Traefik typically forwards this header automatically.

### Apache

```apache
RequestHeader set X-Forwarded-Proto "https"
```

## Fix 3: Check for Double-Encoding or Path Prefix Issues

If Portainer is served on a subpath (e.g., `/portainer/`), use `--base-url` so Portainer generates the correct paths behind the reverse proxy. This is separate from origin validation, so use it alongside `--trusted-origins`:

```yaml
    command:
      - "--base-url=/portainer"
      - "--trusted-origins=example.com"
```

## Fix 4: Wildcard Trusted Origins Are Not Supported

Portainer expects an explicit comma-separated list of trusted hostnames. `*` is not a supported catch-all value, so list each hostname you want to trust:

```bash
docker run portainer/portainer-ce:latest \
  --trusted-origins=portainer.example.com,portainer.internal.example.com
```

## Verifying the Fix

```bash
# Attempt login via curl - should return a JWT token
curl -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -H "Origin: https://portainer.example.com" \
  -d '{"username":"admin","password":"yourpassword"}'

# Expected response:
# {"jwt":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

## Conclusion

The "Origin invalid" error is a security feature protecting Portainer from CSRF attacks, not a bug. The correct fix is to explicitly configure `--trusted-origins` with the hostname your users access Portainer through. If you are serving Portainer from a subpath, pair that with `--base-url`.
