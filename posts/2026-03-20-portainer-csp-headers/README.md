# How to Configure Content-Security-Policy Headers in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, CSP, Header, Nginx

Description: Learn how to configure Content-Security-Policy and other security headers for Portainer deployments to protect against XSS and clickjacking attacks.

## Introduction

Content-Security-Policy (CSP) and other security headers protect web applications against cross-site scripting (XSS), clickjacking, and other injection attacks. When running Portainer behind a reverse proxy like Nginx or Traefik, you can add many of these headers at the proxy layer to enhance the security of the Portainer management interface. Portainer already sends its own CSP header by default, so you should avoid stacking a second enforced CSP on top of it unless you intentionally disable Portainer's built-in CSP first.

## Prerequisites

- Portainer running behind a reverse proxy (Nginx or Traefik)
- HTTPS enabled (required for many security headers to be effective)
- Admin access to the proxy configuration

## Security Headers Overview

| Header | Protection |
|--------|-----------|
| `Content-Security-Policy` | Prevents XSS by restricting resource sources |
| `X-Frame-Options` | Prevents clickjacking (embedding in iframes) |
| `X-Content-Type-Options` | Prevents MIME type sniffing |
| `Strict-Transport-Security` | Forces HTTPS connections |
| `Referrer-Policy` | Controls referrer information leakage |
| `Permissions-Policy` | Restricts browser API access |

## Step 1: Configure Headers in Nginx

```nginx
# /etc/nginx/sites-available/portainer.conf

server {
    listen 443 ssl;
    http2 on;
    server_name portainer.example.com;

    # TLS configuration
    ssl_certificate /etc/letsencrypt/live/portainer.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portainer.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # ===== Security Headers =====

    # Prevent embedding in iframes (clickjacking)
    add_header X-Frame-Options "DENY" always;

    # Prevent MIME type sniffing
    add_header X-Content-Type-Options "nosniff" always;

    # Force HTTPS for 1 year, include subdomains
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Control referrer information
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Restrict browser API permissions
    add_header Permissions-Policy "
        camera=(),
        microphone=(),
        geolocation=(),
        payment=(),
        usb=()
    " always;

    # Hide nginx version in the Server header
    server_tokens off;

    location / {
        proxy_pass https://localhost:9443;
        proxy_http_version 1.1;
        proxy_hide_header X-Content-Type-Options;
        proxy_hide_header X-Powered-By;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for Portainer console
        proxy_read_timeout 900;
    }
}

# HTTP to HTTPS redirect

server {
    listen 80;
    server_name portainer.example.com;
    return 301 https://$host$request_uri;
}
```

## Step 2: Portainer-Specific CSP Considerations

Portainer already sets a CSP header by default. Current Portainer builds send a policy similar to:

```http
Content-Security-Policy: script-src 'self' https://js.hsforms.net https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; object-src 'none'; frame-ancestors 'none'; frame-src https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/
```

If you add another enforced CSP header at the proxy layer, browsers will apply both policies and only the most restrictive result will take effect. If you want Nginx or Traefik to provide the CSP instead, start Portainer with `--no-csp` (or `--csp=false`) so the browser receives a single enforced policy.

## Step 3: Configure Headers in Traefik

```yaml
# traefik-dynamic.yml - Security headers middleware

http:
  middlewares:
    portainer-security-headers:
      headers:
        contentTypeNosniff: true
        forceSTSHeader: true
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        frameDeny: true
        referrerPolicy: "strict-origin-when-cross-origin"
        customResponseHeaders:
          X-Powered-By: ""
          Server: ""
        permissionsPolicy: "camera=(), microphone=(), geolocation=(), payment=()"

  routers:
    portainer:
      rule: "Host(`portainer.example.com`)"
      service: portainer
      middlewares:
        - portainer-security-headers
      tls:
        certResolver: letsencrypt

  services:
    portainer:
      loadBalancer:
        servers:
          - url: "http://portainer:9000"
```

## Step 4: Verify Header Configuration

```bash
# Check security headers are being returned
curl -sI https://portainer.example.com | grep -i -E "(Content-Security|X-Frame|X-Content|Strict|Referrer|Permissions)"

# Expected output:
# content-security-policy: script-src 'self' https://js.hsforms.net ...
# x-frame-options: DENY
# x-content-type-options: nosniff
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# referrer-policy: strict-origin-when-cross-origin
# permissions-policy: camera=(), microphone=(), geolocation=(), payment=()

# Use Mozilla Observatory for comprehensive header analysis
# https://observatory.mozilla.org/analyze/portainer.example.com
```

## Step 5: Test with Security Scanners

```bash
# Use nikto for web security scanning
docker run --rm sullo/nikto -h https://portainer.example.com

# Use securityheaders.com
# https://securityheaders.com/?q=portainer.example.com&followRedirects=on

# Use OWASP ZAP
docker run --rm -v "$(pwd)":/zap/wrk/:rw -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://portainer.example.com \
  -r security-report.html
```

## Step 6: Portainer Native HTTPS Headers

If Portainer is directly exposed (not behind a proxy), HTTPS can be configured via Portainer startup flags. Portainer also serves its own CSP header by default; if you want a reverse proxy to replace it later, start Portainer with `--no-csp` (or `--csp=false`).

```bash
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /path/to/your/certs:/certs:ro \
  portainer/portainer-ee:sts \
  --tlsverify \
  --tlscert /certs/cert.pem \
  --tlskey /certs/key.pem \
  --http-disabled  # Disable plain HTTP entirely
```

## Conclusion

Configuring security headers for Portainer typically means adding the non-CSP headers at the reverse proxy layer and keeping Portainer's built-in CSP intact. If you do replace the CSP at the proxy, disable Portainer's built-in CSP first so the browser only receives one enforced policy. Regularly test your headers with Mozilla Observatory and keep up with Portainer releases, as the built-in CSP sources may change over time.
