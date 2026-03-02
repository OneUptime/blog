# How to Configure Caddy Caddyfile Syntax on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Caddy, Web Server, Configuration, HTTPS

Description: Master the Caddyfile configuration syntax on Ubuntu, covering site blocks, directives, matchers, snippets, and global options for flexible web server setup.

---

The Caddyfile is Caddy's primary configuration format. It is designed to be human-readable and concise, avoiding the repetitive boilerplate common in Nginx or Apache configs. Understanding the syntax structure helps you write configurations that are maintainable and correct.

This guide covers the Caddyfile syntax systematically, from basic structure to advanced features like matchers, snippets, and named routes.

## Basic Caddyfile Structure

A Caddyfile consists of site blocks and an optional global options block. Each site block defines one or more sites (domains or addresses) and the directives that apply to them.

```caddyfile
# This is a comment
# Global options block - must appear first
{
    admin off           # Disable the admin API
    email webmaster@example.com    # Let's Encrypt account email
}

# Site block
example.com {
    root * /var/www/html
    file_server
}
```

The global options block starts with an opening brace on its own line. Site blocks follow, each headed by one or more addresses.

## Site Addresses

A site address tells Caddy where to listen and what domain to serve. Multiple formats are valid:

```caddyfile
# Domain name - enables automatic HTTPS
example.com {
    respond "HTTPS site"
}

# Domain with port - no automatic HTTPS on non-standard ports
example.com:8080 {
    respond "HTTP on port 8080"
}

# Bare IP address - no automatic HTTPS
192.168.1.10 {
    respond "Local server"
}

# Localhost - uses self-signed certificate
localhost {
    respond "Development server"
}

# Multiple addresses for one site block
www.example.com, example.com {
    root * /var/www/html
    file_server
}

# Wildcard - requires DNS challenge for TLS
*.example.com {
    respond "Wildcard: {labels.1}"
}
```

## Common Directives

Directives are the instructions inside a site block. Order matters in the Caddyfile - Caddy processes directives in a defined precedence order, not the order they appear in the file.

```caddyfile
example.com {
    # Set document root and serve files
    root * /var/www/html
    file_server

    # Compress responses
    encode gzip zstd

    # Reverse proxy to backend
    reverse_proxy localhost:3000

    # Redirect
    redir /old-path /new-path 301

    # Rewrite URL internally
    rewrite /app/* /app/index.html

    # Add or modify response headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        # Remove a header
        -Server
    }

    # Log access
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

## Matchers

Matchers let you apply a directive only to specific requests. The matcher syntax uses `@name` for named matchers or inline matchers directly in directives.

```caddyfile
example.com {
    # Named matcher - match requests to /api/ path prefix
    @api path /api/*

    # Use the named matcher
    reverse_proxy @api localhost:4000

    # Inline path matcher
    file_server /static/*

    # Match by HTTP method
    @post method POST
    reverse_proxy @post localhost:5000

    # Match by request header
    @mobile header User-Agent *Mobile*
    rewrite @mobile /mobile{uri}

    # Match by client IP
    @internal remote_ip 192.168.1.0/24 10.0.0.0/8
    basicauth @internal {
        # Restrict internal paths
        admin $2a$14$...hashed...
    }

    # Combine multiple conditions (AND)
    @api-post {
        path /api/*
        method POST
    }
    reverse_proxy @api-post localhost:4000
}
```

## Snippets

Snippets define reusable configuration blocks that can be imported into site blocks. They reduce repetition:

```caddyfile
# Define a snippet with (name)
(security_headers) {
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }
}

(logging) {
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 5
        }
        format json
    }
}

example.com {
    # Import the snippets
    import security_headers
    import logging

    root * /var/www/html
    file_server
}

api.example.com {
    import security_headers
    import logging

    reverse_proxy localhost:3000
}
```

## File Imports

Split large configurations into multiple files:

```caddyfile
# Main Caddyfile
{
    admin off
}

# Import all .conf files from a directory
import /etc/caddy/conf.d/*.conf

# Import a specific file
import /etc/caddy/tls.conf
```

The imported file `/etc/caddy/conf.d/myapp.conf`:

```caddyfile
myapp.example.com {
    reverse_proxy localhost:8080
}
```

## TLS Configuration

Caddy's TLS behavior can be customized per site:

```caddyfile
# Global TLS settings
{
    email admin@example.com
}

example.com {
    # Use a custom certificate instead of auto-provisioned
    tls /path/to/cert.pem /path/to/key.pem

    root * /var/www/html
    file_server
}

# Use DNS challenge for wildcard certificates (requires DNS provider plugin)
*.example.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }

    # Route by subdomain
    root * /var/www/{labels.1}
    file_server
}

# Internal PKI with custom CA
internal.example.com {
    tls {
        issuer internal {
            ca /etc/caddy/internal-ca.pem
        }
    }
    reverse_proxy localhost:8443
}
```

## Placeholders

Caddy supports placeholders that expand to request or response values at runtime:

```caddyfile
example.com {
    # Use the host header value
    header X-Served-By {system.hostname}

    # Log the client IP
    log {
        format json
        # Placeholders available in format strings
    }

    # Rewrite using path components
    # {path} is the full path
    # {uri} includes path and query
    # {host} is the Host header
    # {method} is the HTTP method

    root * /var/www/{host}
    file_server
}
```

## Conditional Logic with Route

The `route` directive groups directives and forces sequential evaluation:

```caddyfile
example.com {
    route {
        # These run in order within a route block
        # 1. Handle API requests
        handle /api/* {
            reverse_proxy localhost:3000
        }

        # 2. Handle static files
        handle /static/* {
            root * /var/www
            file_server
        }

        # 3. Fall through to main app
        handle {
            reverse_proxy localhost:8080
        }
    }
}
```

## Error Handling

Define custom error pages:

```caddyfile
example.com {
    root * /var/www/html
    file_server

    # Custom error page for 404
    handle_errors {
        @404 expression {http.error.status_code} == 404
        rewrite @404 /errors/404.html
        file_server
    }

    # Multiple error codes
    handle_errors {
        rewrite * /errors/{http.error.status_code}.html
        file_server
    }
}
```

## PHP Integration

Run PHP applications through PHP-FPM:

```caddyfile
example.com {
    root * /var/www/wordpress

    # PHP files through FPM
    php_fastcgi unix//run/php/php8.2-fpm.sock

    # Serve static files directly
    file_server

    # WordPress pretty permalinks
    @notfound not file
    rewrite @notfound /index.php{uri}

    encode gzip
}
```

## Formatting and Validation

Always validate and format Caddyfiles before applying:

```bash
# Validate configuration
caddy validate --config /etc/caddy/Caddyfile

# Format the file (Caddy has an opinionated style)
caddy fmt --overwrite /etc/caddy/Caddyfile

# Run in dry-run mode to see what Caddy would do
caddy run --config /etc/caddy/Caddyfile --environ
```

## Environment Variables

Reference environment variables in the Caddyfile for secrets:

```caddyfile
example.com {
    basicauth {
        # Use an environment variable for the hashed password
        admin {env.ADMIN_PASSWORD_HASH}
    }

    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
}
```

Set the variables before starting Caddy, or add them to the systemd service:

```bash
# /etc/systemd/system/caddy.service.d/override.conf
sudo mkdir -p /etc/systemd/system/caddy.service.d
sudo nano /etc/systemd/system/caddy.service.d/override.conf
```

```ini
[Service]
Environment="CF_API_TOKEN=your-cloudflare-token"
Environment="ADMIN_PASSWORD_HASH=your-bcrypt-hash"
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart caddy
```

The Caddyfile syntax rewards a structured approach. Start with site blocks, understand matchers for conditional behavior, and use snippets aggressively to keep the configuration DRY. The formatter enforces consistent style, which helps when reviewing configurations in version control.
