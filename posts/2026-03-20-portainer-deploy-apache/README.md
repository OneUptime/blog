# How to Deploy Apache HTTP Server via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Apache, HTTP Server, Web Server, Self-Hosted

Description: Deploy Apache HTTP Server via Portainer with virtual host configuration, mod_rewrite, SSL support, and PHP-FPM integration.

## Introduction

Apache HTTP Server remains one of the most widely used web servers, particularly popular for PHP applications. Deploying it via Portainer simplifies configuration management and makes it easy to run multiple virtual hosts in Docker containers.

## Deploy as a Stack

In Portainer, create a stack named `apache` and update the host paths to match where you've stored the files on your Docker host:

```yaml
services:
  apache:
    image: httpd:2.4-alpine
    container_name: apache
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Custom Apache configuration
      - /opt/portainer/apache/httpd.conf:/usr/local/apache2/conf/httpd.conf:ro
      # Virtual host configs
      - /opt/portainer/apache/vhosts:/usr/local/apache2/conf/extra/vhosts:ro
      # Web content
      - /opt/portainer/apache/www:/var/www:ro
      # SSL certificates
      - /opt/portainer/apache/certs:/usr/local/apache2/conf/certs:ro
      # Logs
      - apache_logs:/usr/local/apache2/logs
    restart: unless-stopped

  # PHP-FPM for PHP application support
  php:
    image: php:8.3-fpm-alpine
    container_name: php-fpm
    volumes:
      - /opt/portainer/apache/www:/var/www
    restart: unless-stopped

volumes:
  apache_logs:
```

## Custom Apache Configuration

Create `httpd.conf`:

```apache
# httpd.conf - main Apache configuration

ServerRoot "/usr/local/apache2"
Listen 80
Listen 443

# Required modules
LoadModule mpm_event_module modules/mod_mpm_event.so
LoadModule authn_core_module modules/mod_authn_core.so
LoadModule authz_core_module modules/mod_authz_core.so
LoadModule dir_module modules/mod_dir.so
LoadModule mime_module modules/mod_mime.so
LoadModule log_config_module modules/mod_log_config.so
LoadModule env_module modules/mod_env.so
LoadModule setenvif_module modules/mod_setenvif.so
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_fcgi_module modules/mod_proxy_fcgi.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule ssl_module modules/mod_ssl.so
LoadModule headers_module modules/mod_headers.so

ServerAdmin webmaster@localhost
ServerName localhost

# Security: hide Apache version
ServerTokens Prod
ServerSignature Off

# Default document root
DocumentRoot "/var/www/html"
DirectoryIndex index.php index.html
<Directory "/var/www/html">
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>

# Log format
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
CustomLog /usr/local/apache2/logs/access.log combined
ErrorLog /usr/local/apache2/logs/error.log
LogLevel warn

# Include virtual host configs
IncludeOptional conf/extra/vhosts/*.conf

TypesConfig conf/mime.types
```

## Virtual Host Configuration

Create `vhosts/example.conf`:

```apache
# Virtual host for example.com
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/example.com/public

    # Enable .htaccess override
    <Directory /var/www/example.com/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # PHP-FPM proxy
    <FilesMatch \.php$>
        SetHandler "proxy:fcgi://php:9000"
    </FilesMatch>

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"

    ErrorLog /usr/local/apache2/logs/example.com-error.log
    CustomLog /usr/local/apache2/logs/example.com-access.log combined
</VirtualHost>
```

## WordPress-Ready Configuration

```apache
# vhosts/wordpress.conf
<VirtualHost *:80>
    ServerName blog.example.com
    DocumentRoot /var/www/wordpress

    <Directory /var/www/wordpress>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # WordPress pretty permalinks
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.php$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.php [L]
    </Directory>

    # PHP-FPM for WordPress
    <FilesMatch \.php$>
        SetHandler "proxy:fcgi://php:9000"
    </FilesMatch>
</VirtualHost>
```

## SSL Configuration

```apache
# vhosts/ssl.conf
<VirtualHost *:443>
    ServerName secure.example.com
    DocumentRoot /var/www/secure

    SSLEngine on
    SSLCertificateFile /usr/local/apache2/conf/certs/fullchain.pem
    SSLCertificateKeyFile /usr/local/apache2/conf/certs/privkey.pem

    # Modern SSL protocols only
    SSLProtocol -all +TLSv1.2 +TLSv1.3
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256

    <Directory /var/www/secure>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

## Reloading Configuration

```bash
# Test configuration
docker exec apache httpd -t

# Graceful reload without dropping connections
docker exec apache httpd -k graceful
```

## Conclusion

Apache deployed via Portainer supports complex virtual hosting, PHP-FPM integration, and SSL - making it suitable for running multiple PHP applications on a single Docker host. The bind-mounted configuration makes updates quick and auditable, while Portainer's stack management keeps the full setup reproducible.
