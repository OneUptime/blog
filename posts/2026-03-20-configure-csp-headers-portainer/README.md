# How to Configure Content-Security-Policy Headers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security Headers, CSP, Nginx, Web Security

Description: Learn how to configure Content Security Policy and other security headers for Portainer when running behind a reverse proxy.

## Why Security Headers Matter for Portainer

Portainer is a web application. Without proper HTTP security headers, it's vulnerable to:

- **Cross-Site Scripting (XSS)**: Injected scripts executing in the admin's browser.
- **Clickjacking**: Portainer embedded in an iframe by an attacker.
- **MIME sniffing**: Browser executing files as a different content type.
- **Mixed content**: HTTP resources loaded on HTTPS pages.

## Configuring Security Headers with Nginx

```nginx
# /etc/nginx/conf.d/portainer.conf

server {
    listen 443 ssl;
    http2 on;
    server_name portainer.mycompany.com;

    ssl_certificate /etc/ssl/certs/portainer.crt;
    ssl_certificate_key /etc/ssl/private/portainer.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Security Headers
    add_header Content-Security-Policy
        "default-src 'self';
         script-src 'self' https://js.hsforms.net https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/;
         style-src 'self' 'unsafe-inline';
         img-src 'self' data: blob:;
         font-src 'self' data:;
         connect-src 'self' wss://portainer.mycompany.com;
         object-src 'none';
         frame-src https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/;
         frame-ancestors 'none';
         form-action 'self';"
        always;

    # Prevent clickjacking
    add_header X-Frame-Options "DENY" always;

    # Stop MIME type sniffing
    add_header X-Content-Type-Options "nosniff" always;

    # Send full referrer on same-origin requests, origin only cross-origin
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # HTTP Strict Transport Security (force HTTPS for 1 year)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Disable browser caching of sensitive pages
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;

    # Remove server version info
    server_tokens off;

    location / {
        proxy_pass https://portainer:9443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for WebSocket connections (Portainer uses WebSockets)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Configuring with Traefik

```yaml
# Traefik middleware for security headers
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: portainer-security-headers
spec:
  headers:
    contentSecurityPolicy: >
      default-src 'self';
      script-src 'self' https://js.hsforms.net https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob:;
      connect-src 'self' wss:;
      object-src 'none';
      frame-src https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/;
      frame-ancestors 'none'
    frameDeny: true
    contentTypeNosniff: true
    stsSeconds: 31536000
    stsIncludeSubdomains: true
    referrerPolicy: strict-origin-when-cross-origin
    forceSTSHeader: true
```

## Testing Security Headers

```bash
# Test headers from command line
curl -I "https://portainer.mycompany.com" | grep -E "Content-Security|X-Frame|X-Content|Strict"

# Use SecurityHeaders.com for a full analysis
# Visit: https://securityheaders.com/?q=portainer.mycompany.com
```

## CSP Note for Portainer

Portainer already sends a default Content-Security-Policy header. If you want your reverse proxy to define the CSP instead, start Portainer with `--no-csp`; otherwise browsers will enforce both policies.

When defining your own CSP for Portainer, make sure it includes:
- `https://js.hsforms.net`, `https://www.google.com/recaptcha/`, and `https://www.gstatic.com/recaptcha/` in `script-src` and `frame-src` to preserve the allowances in Portainer's built-in CSP.
- `wss://` in `connect-src` for WebSocket connections used by features such as container log streaming.

## Conclusion

Adding security headers via your reverse proxy significantly hardens the Portainer web interface. The provided Nginx and Traefik configurations give you a strong security header baseline without breaking Portainer's functionality.
