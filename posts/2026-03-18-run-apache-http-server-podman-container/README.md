# How to Run Apache HTTP Server in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Apache, HTTPD, Web Server

Description: Learn how to run Apache HTTP Server inside a Podman container with virtual hosts, SSL, and custom modules.

---

> Apache HTTP Server in Podman delivers a battle-tested web server with full module support in a portable, rootless container.

Apache HTTP Server (httpd) remains one of the most popular and feature-rich web servers available. Running it inside a Podman container lets you maintain consistent configurations, quickly spin up isolated instances, and leverage the full power of Apache modules without installing anything on the host. This guide covers everything from basic setup to virtual hosts.

---

## Pulling the Apache Image

Download the official Apache httpd image.

```bash
# Pull the official Apache HTTP Server image

podman pull docker.io/library/httpd:latest

# Verify the image is available
podman images | grep httpd
```

## Running a Basic Apache Container

Start a simple Apache container serving the default page.

```bash
# Run Apache in detached mode on port 8080
podman run -d \
  --name my-apache \
  -p 8080:80 \
  httpd:latest

# Confirm the container is running
podman ps

# Test the default Apache page
curl http://localhost:8080
```

## Serving Custom Content

Mount a local directory to serve your own files.

```bash
# Create a directory for web content
mkdir -p ~/apache-site

# Create a sample HTML file
cat > ~/apache-site/index.html <<'EOF'
<!DOCTYPE html>
<html>
<head><title>Apache on Podman</title></head>
<body><h1>Apache HTTP Server running in Podman!</h1></body>
</html>
EOF

# Run Apache with custom document root
podman run -d \
  --name apache-static \
  -p 8081:80 \
  -v ~/apache-site:/usr/local/apache2/htdocs:Z \
  httpd:latest

# Verify the custom page loads
curl http://localhost:8081
```

## Using a Custom Apache Configuration

Override the default httpd.conf with your own settings.

```bash
# Create a config directory
mkdir -p ~/apache-config

# Copy the default config from a running container
podman cp my-apache:/usr/local/apache2/conf/httpd.conf ~/apache-config/httpd.conf

# Edit the configuration to enable modules and set custom directives
cat >> ~/apache-config/httpd.conf <<'EOF'

# Enable mod_rewrite for URL rewriting
LoadModule rewrite_module modules/mod_rewrite.so

# Custom logging format
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\"" custom_log

# Set server name to suppress warning
ServerName localhost:80
EOF

# Run Apache with the custom configuration
podman run -d \
  --name apache-custom \
  -p 8082:80 \
  -v ~/apache-config/httpd.conf:/usr/local/apache2/conf/httpd.conf:Z \
  -v ~/apache-site:/usr/local/apache2/htdocs:Z \
  httpd:latest

# Test the configuration syntax
podman exec apache-custom apachectl configtest
```

## Setting Up Virtual Hosts

Configure Apache to serve multiple sites from a single container.

```bash
# Create directories for two virtual hosts
mkdir -p ~/apache-sites/site-a ~/apache-sites/site-b

echo "<h1>Site A</h1>" > ~/apache-sites/site-a/index.html
echo "<h1>Site B</h1>" > ~/apache-sites/site-b/index.html

# Enable the virtual hosts configuration from the main Apache config
grep -q '^Include conf/extra/httpd-vhosts.conf' ~/apache-config/httpd.conf || \
  echo 'Include conf/extra/httpd-vhosts.conf' >> ~/apache-config/httpd.conf

# Create a virtual hosts configuration file
cat > ~/apache-config/vhosts.conf <<'EOF'
# Virtual host for Site A
<VirtualHost *:80>
    ServerName site-a.local
    DocumentRoot /usr/local/apache2/htdocs/site-a
    <Directory /usr/local/apache2/htdocs/site-a>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

# Virtual host for Site B
<VirtualHost *:80>
    ServerName site-b.local
    DocumentRoot /usr/local/apache2/htdocs/site-b
    <Directory /usr/local/apache2/htdocs/site-b>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF

# Run Apache with virtual hosts
podman run -d \
  --name apache-vhosts \
  -p 8083:80 \
  -v ~/apache-config/httpd.conf:/usr/local/apache2/conf/httpd.conf:Z \
  -v ~/apache-config/vhosts.conf:/usr/local/apache2/conf/extra/httpd-vhosts.conf:Z \
  -v ~/apache-sites:/usr/local/apache2/htdocs:Z \
  httpd:latest

# Test each virtual host using the Host header
curl -H "Host: site-a.local" http://localhost:8083
curl -H "Host: site-b.local" http://localhost:8083
```

## Managing the Apache Container

Useful commands for day-to-day Apache container management.

```bash
# View Apache access and error logs
podman logs my-apache

# Reload Apache configuration gracefully
podman exec my-apache apachectl graceful

# Check running Apache processes in the container
podman top my-apache

# Stop and remove the container
podman stop my-apache
podman rm my-apache

# Remove all Apache containers at once
podman rm -f apache-static apache-custom apache-vhosts
```

## Summary

Running Apache HTTP Server in a Podman container gives you all the flexibility of Apache - modules, virtual hosts, URL rewriting, and more - without installing it directly on your system. By mounting configuration files and document roots as volumes, you can iterate on your setup quickly and keep everything version-controlled. Podman's rootless mode adds a security advantage, making Apache containers safe for development and suitable for production deployments behind a load balancer.
