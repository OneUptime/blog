# How to Configure Apache mod_rewrite for URL Rewriting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, mod_rewrite, Web Server, URL

Description: A practical guide to Apache mod_rewrite on Ubuntu covering rules, conditions, flags, and real-world examples for redirects, clean URLs, and HTTPS enforcement.

---

mod_rewrite is one of Apache's most powerful and most misunderstood modules. It lets you transform incoming URLs, enforce redirects, rewrite requests to different files, and conditionally modify URLs based on almost any request attribute. This guide covers how it works and walks through the most common use cases.

## Enabling mod_rewrite

```bash
# Enable the module
sudo a2enmod rewrite

# Reload Apache
sudo systemctl reload apache2

# Verify it's loaded
sudo apache2ctl -M | grep rewrite
# Should show: rewrite_module (shared)
```

## Allowing .htaccess Overrides

For rewrite rules in `.htaccess` files to work, the VirtualHost must allow them:

```apache
<Directory /var/www/html>
    AllowOverride All
    # Or more precisely:
    # AllowOverride FileInfo Options
    Require all granted
</Directory>
```

## How mod_rewrite Works

mod_rewrite processes rules in order. For each rule, Apache checks:

1. Does the `RewriteCond` match? (optional - zero or more conditions)
2. Does the `RewriteRule` pattern match the URL?
3. If both match, apply the substitution

```apache
# Basic syntax:
RewriteEngine On

# Optional condition(s)
RewriteCond %{CONDITION} pattern [flags]

# The rule itself
RewriteRule pattern substitution [flags]
```

### URL Patterns

The `RewriteRule` pattern matches against the URL path. In `.htaccess`, the leading `/` is stripped, so the pattern matches relative to the directory:

```apache
# In .htaccess at /var/www/html/:
# Request: /about-us
# Pattern matches against: about-us (no leading slash)
RewriteRule ^about-us$ about.html [L]
```

In VirtualHost config, the full path is matched.

### Condition Variables

Common `%{VARIABLE}` values for `RewriteCond`:

| Variable | Description |
|----------|-------------|
| `%{HTTP_HOST}` | The Host header |
| `%{REQUEST_URI}` | Full URI with query string |
| `%{REQUEST_FILENAME}` | Full filesystem path |
| `%{QUERY_STRING}` | Query string portion |
| `%{HTTPS}` | "on" if HTTPS, empty if HTTP |
| `%{SERVER_PORT}` | Server port number |
| `%{REMOTE_ADDR}` | Client IP address |
| `%{HTTP:HeaderName}` | Any HTTP request header |

### Rule Flags

Flags modify rule behavior:

| Flag | Meaning |
|------|---------|
| `[L]` | Last rule - stop processing further rules |
| `[R=301]` | External redirect with status code |
| `[R=302]` | Temporary external redirect |
| `[NC]` | No case - case-insensitive matching |
| `[QSA]` | Query String Append - keep the original query string |
| `[NE]` | No Escape - don't escape special characters in output |
| `[PT]` | Pass Through - pass to next handler |
| `[F]` | Forbidden - return 403 |
| `[G]` | Gone - return 410 |

## Common Rewrite Use Cases

### HTTPS Redirect

```apache
RewriteEngine On

# Check if not already HTTPS
RewriteCond %{HTTPS} off

# Redirect all HTTP to HTTPS
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

### Remove www

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\.(.+)$ [NC]
RewriteRule ^ https://%1%{REQUEST_URI} [R=301,L]
```

### Force www

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} !^www\. [NC]
RewriteRule ^ https://www.%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

### Combined HTTPS and www

```apache
RewriteEngine On

# Redirect to HTTPS non-www version
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} ^www\.example\.com [NC]
RewriteRule ^ https://example.com%{REQUEST_URI} [R=301,L]
```

### WordPress / CMS Front Controller

Route all requests to index.php unless the file or directory exists:

```apache
RewriteEngine On

# Don't rewrite requests for files that exist
RewriteCond %{REQUEST_FILENAME} !-f

# Don't rewrite requests for directories that exist
RewriteCond %{REQUEST_FILENAME} !-d

# Route everything else to index.php
RewriteRule . /index.php [L]
```

For WordPress specifically:

```apache
RewriteEngine On

# Conditions: file and directory must not exist
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Route to WordPress
RewriteRule . /index.php [L]
```

### Remove File Extensions

Make `/about.html` accessible as `/about`:

```apache
RewriteEngine On

# Don't apply to directories
RewriteCond %{REQUEST_FILENAME} !-d

# Check if the path with .html extension exists
RewriteCond %{REQUEST_FILENAME}\.html -f

# Rewrite without the extension (internally - no redirect)
RewriteRule ^(.+)$ $1.html [L]
```

### Old URL to New URL (301 Redirect)

```apache
RewriteEngine On

# Specific page redirect
RewriteRule ^old-page/?$ /new-page/ [R=301,L]

# Redirect entire old section
RewriteRule ^blog/(.*)$ /articles/$1 [R=301,L]

# Query string redirect
RewriteCond %{QUERY_STRING} ^id=([0-9]+)$
RewriteRule ^article\.php$ /articles/%1? [R=301,L]
# The ? at the end strips the original query string
```

### Block Bad Bots

```apache
RewriteEngine On

# Block requests from specific user agents
RewriteCond %{HTTP_USER_AGENT} (bot|crawler|spider) [NC]
RewriteRule .* - [F,L]

# Block empty user agents
RewriteCond %{HTTP_USER_AGENT} ^$
RewriteRule .* - [F,L]
```

### Restrict Access by IP

```apache
RewriteEngine On

# Only allow access from specific IPs to /admin
RewriteCond %{REMOTE_ADDR} !^192\.168\.1\.
RewriteRule ^admin/ - [F,L]
```

### API URL Routing

Route `/api/users/123` to `api.php?endpoint=users&id=123`:

```apache
RewriteEngine On

# Route API requests
RewriteRule ^api/([a-z]+)/([0-9]+)/?$ api.php?endpoint=$1&id=$2 [L,QSA]
RewriteRule ^api/([a-z]+)/?$ api.php?endpoint=$1 [L,QSA]
```

### Proxy Pass (with mod_proxy)

Internally proxy requests to a different backend:

```apache
RewriteEngine On

# Proxy /app requests to a Node.js server
RewriteRule ^app/(.*)$ http://localhost:3000/$1 [P,L]
```

Note: The `[P]` flag requires `mod_proxy` to be enabled.

## Enabling Rewrite Logging for Debugging

When rules aren't working as expected, enable verbose logging:

```bash
# Add to VirtualHost or apache2.conf (not .htaccess)
# WARNING: This generates a LOT of output - only use for debugging
LogLevel alert rewrite:trace3
# or trace4, trace5 for even more detail

sudo systemctl reload apache2

# Watch the log while testing
sudo tail -f /var/log/apache2/error.log | grep rewrite

# Don't forget to remove the LogLevel directive when done
```

## Testing Rewrite Rules

```bash
# Test what a URL returns
curl -I http://localhost/old-page/
# Check the Location header for redirects

# Follow redirects
curl -L http://localhost/old-page/

# Show the full request/response
curl -v http://localhost/api/users/123 2>&1 | grep -E "< HTTP|Location"

# Test with specific headers
curl -H "Host: www.example.com" http://localhost/
```

## Backreferences

Capture groups in patterns become accessible as `$1`, `$2`, etc.:

```apache
# Capture the path in a group
RewriteRule ^images/([^/]+)/(.+)$ /media/$1/images/$2 [L]
# /images/large/photo.jpg -> /media/large/images/photo.jpg
```

In `RewriteCond`, captured groups are `%1`, `%2`:

```apache
RewriteCond %{HTTP_HOST} ^(www\.)?([^.]+)\.example\.com$
# %1 = "www." or empty
# %2 = subdomain name
RewriteRule ^(.*)$ /sites/%2/$1 [L]
```

## Common Mistakes

**Not starting with RewriteEngine On** - every section that uses RewriteRule needs this.

**Using absolute paths in .htaccess** - patterns are relative to the directory, no leading slash:

```apache
# Wrong:
RewriteRule ^/about$ about.html

# Right:
RewriteRule ^about$ about.html
```

**Missing the [L] flag** - without `[L]`, Apache continues processing rules after a match, which can cause unexpected behavior.

**Conflicting conditions** - when multiple conditions are specified, all must match (AND logic) by default. Use `[OR]` between conditions for OR logic:

```apache
# Both conditions must match (AND)
RewriteCond %{HTTP_HOST} ^www\.
RewriteCond %{HTTPS} off
RewriteRule ...

# Either condition triggers the rule (OR)
RewriteCond %{HTTP_HOST} ^www\. [OR]
RewriteCond %{HTTPS} off
RewriteRule ...
```

**Infinite loops** - a rule that matches its own output creates an infinite loop. Use conditions to prevent:

```apache
# Prevent redirect loop for HTTPS redirect
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
# Without the condition, this would redirect forever
```

mod_rewrite is complex, but most real-world needs can be met with a handful of patterns. Start simple, test each rule in isolation, and use `trace3` logging when something isn't working as expected.
