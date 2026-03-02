# How to Configure Nginx for WordPress Multisite on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, WordPress, Web Server

Description: A complete guide to configuring Nginx for WordPress Multisite on Ubuntu, covering both subdomain and subdirectory network setups with PHP-FPM and SSL.

---

WordPress Multisite lets you run multiple WordPress sites from a single installation. Configuring Nginx for it requires specific rewrite rules that differ from a single-site setup. The configuration also depends on whether you chose a subdomain network (site1.example.com, site2.example.com) or subdirectory network (example.com/site1, example.com/site2). This guide covers both.

## Prerequisites

Before configuring Nginx, you need a working WordPress Multisite installation and a standard LEMP stack (Linux, Nginx, MySQL, PHP-FPM).

```bash
# Install required packages
sudo apt update
sudo apt install nginx php8.3-fpm php8.3-mysql php8.3-xml php8.3-curl \
  php8.3-gd php8.3-mbstring php8.3-zip php8.3-intl mysql-server

# Enable and start services
sudo systemctl enable nginx php8.3-fpm mysql
sudo systemctl start nginx php8.3-fpm mysql
```

## PHP-FPM Configuration

Tune PHP-FPM for WordPress:

```bash
sudo nano /etc/php/8.3/fpm/pool.d/www.conf
```

Key settings to adjust:

```ini
[www]
user = www-data
group = www-data
listen = /run/php/php8.3-fpm.sock
listen.owner = www-data
listen.group = www-data

; Process management
pm = dynamic
pm.max_children = 20
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests = 500

; PHP settings for WordPress
php_admin_value[memory_limit] = 256M
php_admin_value[upload_max_filesize] = 64M
php_admin_value[post_max_size] = 64M
php_admin_value[max_execution_time] = 300
```

## Nginx Configuration for Subdirectory Multisite

For a subdirectory network (example.com/site1, example.com/site2):

```bash
sudo nano /etc/nginx/sites-available/wordpress-multisite
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com;

    root /var/www/wordpress;
    index index.php;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # WordPress security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logging
    access_log /var/log/nginx/wordpress.access.log;
    error_log /var/log/nginx/wordpress.error.log;

    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~* ^/wp-content/uploads/.*\.php$ {
        deny all;
    }

    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    location = /robots.txt {
        allow all;
        log_not_found off;
        access_log off;
    }

    # WordPress Multisite subdirectory rewrite rules
    # This is the key section for multisite
    if (!-e $request_filename) {
        rewrite /wp-admin$ $scheme://$host$uri/ permanent;
        rewrite ^(/[^/]+)?(/wp-.*) $2 last;
        rewrite ^(/[^/]+)?(/.*\.php) $2 last;
    }

    # Main WordPress location
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # PHP processing
    location ~ \.php$ {
        # Security: only process files that exist
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;

        # FastCGI timeouts
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_connect_timeout 300;
    }

    # Static file caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        log_not_found off;
    }

    # Allow wp-cron to run (disable the WordPress built-in cron and use system cron instead)
    location = /wp-cron.php {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Nginx Configuration for Subdomain Multisite

For a subdomain network, you need wildcard SSL and wildcard server_name:

```bash
sudo nano /etc/nginx/sites-available/wordpress-multisite-subdomain
```

```nginx
# Map subsite requests to WordPress
map $http_host $blogid {
    default       -999;
    example.com   1;
}

server {
    listen 80;
    listen [::]:80;
    server_name example.com *.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    # Wildcard for all subsites plus the main domain
    server_name example.com *.example.com;

    root /var/www/wordpress;
    index index.php;

    # Wildcard SSL certificate (from Let's Encrypt with DNS challenge)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    access_log /var/log/nginx/wordpress-multisite.access.log;
    error_log /var/log/nginx/wordpress-multisite.error.log;

    # Block PHP execution in uploads
    location ~* /files/(.+)\.php$ {
        deny all;
    }

    # Block sensitive files and directories
    location ~ /\. {
        deny all;
    }

    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    location = /robots.txt {
        allow all;
        log_not_found off;
        access_log off;
    }

    # Uploads handling for multisite (each subsite stores files under its blog ID)
    location ~ ^/files/(.*)$ {
        try_files /wp-content/blogs.dir/$blogid/$uri /wp-includes/ms-files.php?file=$1 =404;
        access_log off;
        log_not_found off;
        expires max;
    }

    # WordPress Multisite subdomain: main entry point
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # PHP processing
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_read_timeout 300;
    }

    # Static asset caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        log_not_found off;
    }
}
```

## Enabling the Site and Testing

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/wordpress-multisite /etc/nginx/sites-enabled/

# Remove default site if still active
sudo rm -f /etc/nginx/sites-enabled/default

# Test the configuration
sudo nginx -t

# Reload Nginx if the test passes
sudo systemctl reload nginx
```

## WordPress wp-config.php Settings

Ensure WordPress knows it is running as a multisite:

```php
/* Multisite settings - add before the "That's all" line */
define('WP_ALLOW_MULTISITE', true);
define('MULTISITE', true);
define('SUBDOMAIN_INSTALL', false); // true for subdomain, false for subdirectory
define('DOMAIN_CURRENT_SITE', 'example.com');
define('PATH_CURRENT_SITE', '/');
define('SITE_ID_CURRENT_SITE', 1);
define('BLOG_ID_CURRENT_SITE', 1);

/* Optional: Set upload path for multisite */
define('UPLOADBLOGSDIR', 'wp-content/blogs.dir');
```

## File Permissions

```bash
# Set correct ownership
sudo chown -R www-data:www-data /var/www/wordpress

# Set directory permissions
sudo find /var/www/wordpress -type d -exec chmod 755 {} \;

# Set file permissions
sudo find /var/www/wordpress -type f -exec chmod 644 {} \;

# wp-config.php should be more restrictive
sudo chmod 640 /var/www/wordpress/wp-config.php
```

## Performance Tuning with FastCGI Caching

Add FastCGI caching to dramatically improve performance for multisite:

```nginx
# Add to the http block in /etc/nginx/nginx.conf
fastcgi_cache_path /var/cache/nginx/wordpress
    levels=1:2
    keys_zone=wordpress:100m
    inactive=60m
    max_size=1g;

fastcgi_cache_key "$scheme$request_method$host$request_uri";
```

Then in your server block:

```nginx
# Skip cache for logged-in users and POST requests
set $skip_cache 0;

if ($request_method = POST) {
    set $skip_cache 1;
}

if ($query_string != "") {
    set $skip_cache 1;
}

# Don't cache URLs with these query strings
if ($request_uri ~* "/wp-admin/|/xmlrpc.php|wp-.*.php|/feed/|sitemap(_index)?.xml") {
    set $skip_cache 1;
}

# Don't cache for logged-in users or recent commenters
if ($http_cookie ~* "comment_author|wordpress_[a-f0-9]+|wp-postpass|wordpress_no_cache|wordpress_logged_in") {
    set $skip_cache 1;
}

location ~ \.php$ {
    fastcgi_cache wordpress;
    fastcgi_cache_valid 200 60m;
    fastcgi_cache_bypass $skip_cache;
    fastcgi_no_cache $skip_cache;
    add_header X-Cache-Status $upstream_cache_status;
    # ... rest of fastcgi settings
}
```

Test the complete setup and verify each subsite loads correctly. Check Nginx error logs if any subsite returns a 404 or redirect loop - these are the most common issues with multisite configurations.
