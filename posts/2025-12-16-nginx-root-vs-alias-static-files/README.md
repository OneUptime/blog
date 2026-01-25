# How to Configure Static File Serving with root vs alias in Nginx

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Nginx, Static Files, Web Server, Configuration, DevOps

Description: Learn the difference between Nginx root and alias directives for serving static files, including proper usage patterns, common pitfalls, and production configuration examples.

---

Nginx provides two directives for serving static files: `root` and `alias`. Understanding the difference is crucial for correctly configuring your web server. Misconfiguring these directives is one of the most common Nginx mistakes.

## The Fundamental Difference

### root Directive

The `root` directive appends the URI to the specified path.

```nginx
location /images/ {
    root /var/www/example.com;
}
# Request: /images/photo.jpg
# File path: /var/www/example.com/images/photo.jpg
```

### alias Directive

The `alias` directive replaces the location match with the specified path.

```nginx
location /images/ {
    alias /var/www/media/;
}
# Request: /images/photo.jpg
# File path: /var/www/media/photo.jpg
```

## Visual Comparison

```mermaid
graph TD
    subgraph "root /var/www/site"
        A[Request: /images/photo.jpg] --> B[Path: /var/www/site + /images/photo.jpg]
        B --> C[/var/www/site/images/photo.jpg]
    end

    subgraph "alias /var/www/media/"
        D[Request: /images/photo.jpg] --> E[Path: /var/www/media/ + photo.jpg]
        E --> F[/var/www/media/photo.jpg]
    end

    style C fill:#c8e6c9
    style F fill:#bbdefb
```

## When to Use root

Use `root` when your URL path matches your filesystem structure:

```nginx
server {
    listen 80;
    server_name example.com;

    # Files are at /var/www/example.com/
    root /var/www/example.com;

    # /index.html -> /var/www/example.com/index.html
    location / {
        try_files $uri $uri/ =404;
    }

    # /css/style.css -> /var/www/example.com/css/style.css
    location /css/ {
        expires 30d;
    }

    # /js/app.js -> /var/www/example.com/js/app.js
    location /js/ {
        expires 30d;
    }

    # /images/logo.png -> /var/www/example.com/images/logo.png
    location /images/ {
        expires 1y;
    }
}
```

## When to Use alias

Use `alias` when the URL path differs from the filesystem path:

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/example.com;

    # Serve files from a different directory
    # /downloads/file.pdf -> /var/www/files/file.pdf
    location /downloads/ {
        alias /var/www/files/;
    }

    # Serve user uploads from separate storage
    # /uploads/image.jpg -> /mnt/storage/uploads/image.jpg
    location /uploads/ {
        alias /mnt/storage/uploads/;
    }

    # Serve documentation from another location
    # /docs/guide.html -> /opt/documentation/guide.html
    location /docs/ {
        alias /opt/documentation/;
    }
}
```

## Critical: Trailing Slash Rules

### With alias - Always Match Trailing Slashes

```nginx
# CORRECT - both have trailing slashes
location /images/ {
    alias /var/www/media/;
}

# WRONG - missing trailing slash in alias
location /images/ {
    alias /var/www/media;  # Results in /var/www/mediaphoto.jpg
}

# WRONG - missing trailing slash in location
location /images {
    alias /var/www/media/;  # Inconsistent behavior
}
```

### With root - Trailing Slash Optional

```nginx
# Both work correctly with root
location /images/ {
    root /var/www/example.com;
}

location /images {
    root /var/www/example.com;
}
```

## Common Use Cases

### Serving Multiple Static Directories

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/example.com/public;

    location / {
        try_files $uri $uri/ @backend;
    }

    # Main application assets
    location /assets/ {
        # Uses root - files at /var/www/example.com/public/assets/
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # User-generated content on separate storage
    location /user-content/ {
        alias /mnt/user-storage/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Documentation served from package
    location /docs/ {
        alias /usr/share/doc/myapp/html/;
        index index.html;
    }

    # Legacy assets location
    location /old-assets/ {
        alias /var/www/legacy/assets/;
        expires 7d;
    }

    location @backend {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### Version-Specific Static Files

```nginx
server {
    listen 80;
    server_name example.com;

    # Current version
    location /static/ {
        alias /var/www/releases/current/static/;
        expires 1y;
    }

    # Specific version fallback
    location ~ ^/static/v(\d+)/ {
        alias /var/www/releases/v$1/static/;
        expires 1y;
    }
}
```

### Serving Hidden Files Safely

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com;

    # Block hidden files by default
    location ~ /\. {
        deny all;
    }

    # But allow .well-known for SSL verification
    location ^~ /.well-known/ {
        alias /var/www/letsencrypt/.well-known/;
        allow all;
    }
}
```

## Using try_files with root and alias

### With root

```nginx
location / {
    root /var/www/example.com;
    try_files $uri $uri/ /index.html;
}
```

### With alias

```nginx
location /app/ {
    alias /var/www/spa/;
    try_files $uri $uri/ /app/index.html;
}
```

**Note**: When using `try_files` with `alias`, the fallback path should include the location prefix.

## Regular Expression Locations

### Using root with Regex

```nginx
# Match all image files
location ~* \.(jpg|jpeg|png|gif|ico|svg)$ {
    root /var/www/example.com;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Using alias with Regex (More Complex)

```nginx
# Rewrite image paths
location ~ ^/img/(.+)$ {
    alias /var/www/images/$1;
}

# Serve thumbnails from different directory
location ~ ^/thumbs/(.+)$ {
    alias /var/www/thumbnails/$1;
}
```

## Performance Optimization

### Combining with sendfile and tcp_nopush

```nginx
server {
    listen 80;
    server_name example.com;

    # Enable efficient file serving
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    root /var/www/example.com;

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";

        # Optimize for large files
        aio on;
        directio 512;
        output_buffers 1 128k;
    }

    location /downloads/ {
        alias /var/www/files/;

        # For very large files
        sendfile on;
        sendfile_max_chunk 1m;
    }
}
```

### Gzip Static Files

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com;

    # Enable gzip
    gzip on;
    gzip_static on;  # Serve pre-compressed files if available
    gzip_types text/plain text/css text/javascript application/javascript application/json;
    gzip_vary on;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Pre-compress your static files:

```bash
# Compress all CSS and JS files
find /var/www/example.com -type f \( -name "*.css" -o -name "*.js" \) -exec gzip -k -9 {} \;
```

## Common Mistakes and Fixes

### Mistake 1: Wrong Path Construction

```nginx
# WRONG
location /downloads {
    alias /var/www/files;
}
# Request: /downloads/file.pdf
# Actual path: /var/www/filesfile.pdf (missing slash)

# CORRECT
location /downloads/ {
    alias /var/www/files/;
}
```

### Mistake 2: Using alias in Server Context

```nginx
# WRONG - alias cannot be used in server context
server {
    alias /var/www/example.com;  # Invalid!
}

# CORRECT - use root in server context
server {
    root /var/www/example.com;
}
```

### Mistake 3: Duplicate root Directives

```nginx
# WRONG - redundant root
server {
    root /var/www/example.com;

    location /images/ {
        root /var/www/example.com;  # Unnecessary
    }
}

# CORRECT - inherit from server
server {
    root /var/www/example.com;

    location /images/ {
        expires 1y;  # Uses inherited root
    }
}
```

### Mistake 4: Security Issue with alias and regex

```nginx
# POTENTIALLY DANGEROUS
location ~ /uploads/(.*)$ {
    alias /var/www/uploads/$1;
}
# Could allow path traversal: /uploads/../../../etc/passwd

# SAFER
location ^~ /uploads/ {
    alias /var/www/uploads/;
    # No regex capture, no path manipulation
}
```

## Testing Your Configuration

```bash
# Test nginx configuration
sudo nginx -t

# Check effective paths
curl -I http://example.com/images/test.jpg

# Debug with error log
tail -f /var/log/nginx/error.log

# Verify file exists
ls -la /var/www/example.com/images/test.jpg
```

## Summary Table

| Feature | root | alias |
|---------|------|-------|
| Path construction | Appends URI | Replaces location match |
| Server context | Yes | No |
| Location context | Yes | Yes |
| Trailing slash | Optional | Required (match location) |
| With try_files | Straightforward | Needs location prefix |
| Use case | Matching directory structure | Different path mapping |

Choose `root` when your URL structure mirrors your filesystem, and `alias` when you need to map URLs to different directory paths. Always verify your configuration with `nginx -t` and test actual file access to ensure correct path resolution.
