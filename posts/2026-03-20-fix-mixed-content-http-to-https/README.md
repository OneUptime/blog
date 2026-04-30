# How to Fix Mixed Content Warnings When Migrating from HTTP to HTTPS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTPS, Mixed Content, TLS, SSL, Web Security, CSP, Nginx, Apache

Description: Learn how to identify and fix mixed content warnings that appear when migrating a website from HTTP to HTTPS, including server-side redirects, CSP headers, and content scanning techniques.

---

Mixed content occurs when an HTTPS page loads resources (images, scripts, stylesheets) over HTTP. Browsers block these requests or auto-upgrade some of them, which can still break functionality or trigger warnings.

## Types of Mixed Content

- **Active / blockable mixed content** (scripts, iframes, XHR, stylesheets): Blocked by modern browsers.
- **Passive / upgradable mixed content** (commonly images, video, audio): Modern browsers usually try to upgrade these requests to HTTPS automatically; if the resource is not available over HTTPS, the load can still fail.

## Step 1: Identify Mixed Content

```bash
# Use curl to check for obvious HTTP references in page HTML

curl -sS https://example.com | grep -Eo '(src|href)="http://[^"]*"' | head -20

# Use the browser console: open DevTools → Console tab
# Look for: "Mixed Content: The page was loaded over HTTPS..."
```

```javascript
// In-browser scan for common mixed-content resource URLs already in the DOM
document.querySelectorAll(
  'script[src^="http:"], iframe[src^="http:"], img[src^="http:"], audio[src^="http:"], video[src^="http:"], source[src^="http:"], link[rel="stylesheet"][href^="http:"]'
).forEach(el => {
  console.warn("Mixed content:", el.getAttribute("src") || el.getAttribute("href"));
});
```

## Step 2: Redirect All HTTP to HTTPS at the Server

**Nginx:**
```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}
```

**Apache:**
```apache
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com
    Redirect permanent / https://example.com/
</VirtualHost>
```

## Step 3: Use Content Security Policy to Upgrade HTTP Requests

```nginx
# Upgrade insecure requests automatically (where possible)
add_header Content-Security-Policy "upgrade-insecure-requests;" always;
```

This CSP directive tells the browser to rewrite HTTP URLs to HTTPS before the request is made. It helps with legacy URLs, but requests still fail if the target is not available over HTTPS.

## Step 4: Fix Hardcoded HTTP URLs in HTML/CSS/JS

```bash
# Find hardcoded http:// references in web root
grep -rl --include="*.html" --include="*.php" --include="*.js" --include="*.css" 'http://' /var/www/html

# Replace hardcoded URLs with https://
sed -i 's|http://static.example.com|https://static.example.com|g' /var/www/html/index.html
```

## Step 5: Fix Mixed Content in Databases (CMS)

For WordPress, prefer WP-CLI so serialized data is updated safely:

```bash
wp option update home 'https://example.com'
wp option update siteurl 'https://example.com'
wp search-replace 'http://example.com' 'https://example.com' --all-tables-with-prefix --skip-columns=guid
```

## Step 6: Add HSTS After the Migration Is Clean

Once all mixed content is resolved, add HSTS:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

If you plan to use HSTS preload, only add `preload` after confirming every current and future subdomain supports HTTPS and you intend to submit the domain to the preload list.

## Verifying the Fix

```bash
# Check for remaining HTTP references
curl -sS https://example.com | grep -c 'http://'

# Use online tools:
# https://www.whynopadlock.com/
# https://www.ssllabs.com/ssltest/
```

## Key Takeaways

- Use `upgrade-insecure-requests` CSP header as a quick mitigation while fixing underlying URLs.
- Replace all hardcoded `http://` references in HTML, CSS, JavaScript, and database content.
- For CMS platforms like WordPress, use a safe search-and-replace tool such as WP-CLI to update stored URLs.
- Add HSTS after confirming zero mixed content to enforce HTTPS for all future requests.
