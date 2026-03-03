# How to Configure Content Security Policy Headers in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Web Security

Description: Learn how to configure Content Security Policy (CSP) headers and other security headers in ArgoCD to protect against XSS and injection attacks.

---

Content Security Policy (CSP) headers are a critical defense mechanism against cross-site scripting (XSS), clickjacking, and other code injection attacks. ArgoCD exposes a web UI that is accessible to your engineering team, and without proper security headers, it could be vulnerable to client-side attacks. This guide covers how to configure CSP and other security headers for ArgoCD.

## What Are Content Security Policy Headers

CSP is an HTTP response header that tells the browser which content sources are allowed to load on a page. Without CSP, an attacker who finds an XSS vulnerability can inject scripts from any domain. With CSP, the browser blocks any content that does not match the policy, significantly reducing the impact of XSS attacks.

Other important security headers include:

- **X-Frame-Options** - prevents clickjacking by controlling iframe embedding
- **X-Content-Type-Options** - prevents MIME type sniffing
- **Strict-Transport-Security** - enforces HTTPS
- **X-XSS-Protection** - legacy XSS filter (mostly replaced by CSP)
- **Referrer-Policy** - controls referrer information sent with requests

## ArgoCD's Default Security Headers

ArgoCD includes some security headers by default. You can check what headers are currently being served:

```bash
# Check current security headers
curl -sI https://argocd.example.com | grep -iE "content-security|x-frame|x-content|strict-transport|referrer"
```

By default, ArgoCD sets some basic headers, but they may not be strict enough for your security requirements.

## Configuring CSP via Ingress Annotations

The most common approach is to add security headers at the ingress level. This works with any ArgoCD installation and does not require modifying ArgoCD itself.

### Nginx Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    # Security headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none'";
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
      more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
      more_set_headers "Permissions-Policy: camera=(), microphone=(), geolocation=()";
spec:
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-server-tls
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

### Traefik Ingress

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: argocd-security-headers
  namespace: argocd
spec:
  headers:
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none'"
    frameDeny: true
    contentTypeNosniff: true
    browserXssFilter: true
    referrerPolicy: "strict-origin-when-cross-origin"
    permissionsPolicy: "camera=(), microphone=(), geolocation=()"
    stsSeconds: 31536000
    stsIncludeSubdomains: true
    stsPreload: true
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: argocd-server
  namespace: argocd
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`argocd.example.com`)
      kind: Rule
      middlewares:
        - name: argocd-security-headers
      services:
        - name: argocd-server
          port: 443
  tls:
    secretName: argocd-server-tls
```

## Configuring CSP via ArgoCD Server Directly

ArgoCD allows you to set custom headers through its server configuration. This is useful when you do not control the ingress configuration or want the headers to apply regardless of how the server is accessed.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Set custom security headers
  server.x.frame.options: "DENY"
  server.content.security.policy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none'"
  server.strict.transport.security: "max-age=31536000; includeSubDomains; preload"
```

After updating the ConfigMap, restart the ArgoCD server:

```bash
kubectl rollout restart deployment argocd-server -n argocd
```

## Understanding CSP Directives for ArgoCD

ArgoCD's UI requires specific CSP directives to function properly. Here is what each directive does and why it is needed:

```text
default-src 'self'
```
Only allow content from the same origin by default.

```text
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```
ArgoCD's React UI uses inline scripts and eval for certain features. Unfortunately, these are required for the UI to function.

```text
style-src 'self' 'unsafe-inline'
```
The UI uses inline styles for dynamic layouts.

```text
img-src 'self' data:
```
Allows images from the same origin and data URIs (used for inline SVGs and icons).

```text
font-src 'self' data:
```
Fonts are loaded from the same origin or embedded as data URIs.

```text
connect-src 'self' wss:
```
Allows API connections to the same origin and WebSocket connections (used for real-time updates).

```text
frame-ancestors 'none'
```
Prevents the ArgoCD UI from being embedded in iframes on other sites, protecting against clickjacking.

## Testing Your CSP Configuration

After applying headers, test them:

```bash
# Check all security headers
curl -sI https://argocd.example.com | grep -iE "^(content-security|x-frame|x-content|strict-transport|referrer|permissions)"

# Test with a specific CSP reporting tool
# Mozilla Observatory
# Visit: https://observatory.mozilla.org and enter your ArgoCD URL
```

You can also use browser developer tools. Open the ArgoCD UI, open DevTools (F12), and check the Console tab for CSP violations. If the UI is broken, you need to relax specific directives.

## CSP Report-Only Mode

When you are not sure if your CSP policy will break the ArgoCD UI, use report-only mode first. This logs violations without blocking anything:

```yaml
# Nginx Ingress - report-only mode
nginx.ingress.kubernetes.io/configuration-snippet: |
  more_set_headers "Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; report-uri /api/csp-report";
```

Check the browser console for any reported violations, then adjust your policy before switching from report-only to enforcement mode.

## HSTS Configuration

HTTP Strict Transport Security (HSTS) tells browsers to only use HTTPS for your ArgoCD instance:

```yaml
# Strong HSTS configuration
nginx.ingress.kubernetes.io/configuration-snippet: |
  more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";
```

The `preload` directive submits your domain for browser HSTS preloading, ensuring HTTPS is enforced even on the very first visit. Only enable this if you are committed to HTTPS permanently.

## Combining All Security Headers

Here is a comprehensive security headers configuration that balances security with ArgoCD functionality:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "false"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      # Content Security Policy
      more_set_headers "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
      # Prevent clickjacking
      more_set_headers "X-Frame-Options: DENY";
      # Prevent MIME sniffing
      more_set_headers "X-Content-Type-Options: nosniff";
      # Enable XSS filter
      more_set_headers "X-XSS-Protection: 1; mode=block";
      # Control referrer information
      more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
      # Enforce HTTPS
      more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains";
      # Restrict browser features
      more_set_headers "Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()";
spec:
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-server-tls
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

## Conclusion

Configuring security headers for ArgoCD is a straightforward but important step in hardening your deployment. CSP prevents XSS attacks, X-Frame-Options prevents clickjacking, and HSTS ensures encrypted connections. Start with report-only mode to test your CSP policy, then switch to enforcement once you confirm the UI works correctly. Remember that ArgoCD's React UI requires `unsafe-inline` and `unsafe-eval` for scripts, so you cannot achieve the strictest possible CSP, but the headers still provide significant protection against common web attacks.

For more security hardening, see our guide on [hardening ArgoCD server for production](https://oneuptime.com/blog/post/2026-02-26-argocd-harden-server-production/view).
