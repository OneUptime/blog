# How to Run Nginx in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Nginx, Web Server, Reverse Proxy

Description: Learn how to run Nginx as a web server and reverse proxy inside a Podman container with custom configuration and persistent storage.

---

> Nginx in a Podman container gives you a lightweight web server that can run rootless and be ready for production traffic in seconds.

Nginx is one of the most widely used web servers and reverse proxies in the world. Running it inside a Podman container lets you isolate your web server, manage configurations declaratively, and deploy consistently across environments. This guide walks you through pulling the Nginx image, running it with custom configurations, serving static content, and setting up reverse proxying - all using Podman.

---

## Pulling the Nginx Image

Start by pulling the official Nginx image from a container registry.

```bash
# Pull the latest official Nginx image

podman pull docker.io/library/nginx:latest

# Verify the image was downloaded
podman images | grep nginx
```

## Running a Basic Nginx Container

Launch a simple Nginx container that serves the default welcome page.

```bash
# Run Nginx in detached mode, mapping port 8080 on the host to port 80 in the container
podman run -d \
  --name my-nginx \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Verify the container is running
podman ps

# Test the default Nginx welcome page
curl http://localhost:8080
```

## Serving Custom Static Content

Mount a local directory to serve your own HTML files through Nginx.

```bash
# Create a directory for your static site
mkdir -p ~/my-website

# Create a simple index.html file
cat > ~/my-website/index.html <<'EOF'
<!DOCTYPE html>
<html>
<head><title>My Podman Site</title></head>
<body><h1>Hello from Nginx on Podman!</h1></body>
</html>
EOF

# Run Nginx with the custom content directory mounted
podman run -d \
  --name nginx-static \
  -p 8081:80 \
  -v ~/my-website:/usr/share/nginx/html:z \
  docker.io/library/nginx:latest

# Verify your custom page is served
curl http://localhost:8081
```

## Using a Custom Nginx Configuration

Create and mount a custom Nginx configuration file for full control over server behavior.

```bash
# Create a directory for your Nginx config
mkdir -p ~/nginx-config

# Write a custom nginx.conf
cat > ~/nginx-config/nginx.conf <<'EOF'
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    server {
        listen 80;
        server_name localhost;

        # Serve static files from the html directory
        location / {
            root   /usr/share/nginx/html;
            index  index.html;
        }

        # Custom error page
        error_page 404 /404.html;
    }
}
EOF

# Run Nginx with custom configuration
podman run -d \
  --name nginx-custom \
  -p 8082:80 \
  -v ~/nginx-config/nginx.conf:/etc/nginx/nginx.conf:Z \
  -v ~/my-website:/usr/share/nginx/html:z \
  docker.io/library/nginx:latest

# Test that the custom config is loaded
podman exec nginx-custom nginx -t
```

## Setting Up Nginx as a Reverse Proxy

Configure Nginx to forward requests to a backend application.

```bash
# Create a reverse proxy configuration
cat > ~/nginx-config/reverse-proxy.conf <<'EOF'
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    upstream backend {
        # Points to a backend service running on the host
        server host.containers.internal:3000;
    }

    server {
        listen 80;

        # Forward all requests to the backend
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Run the reverse proxy container
podman run -d \
  --name nginx-proxy \
  -p 8083:80 \
  -v ~/nginx-config/reverse-proxy.conf:/etc/nginx/nginx.conf:Z \
  docker.io/library/nginx:latest
```

## Managing the Nginx Container

Common management commands for your Nginx container.

```bash
# View Nginx access logs
podman logs my-nginx

# Reload Nginx configuration without downtime
podman exec my-nginx nginx -s reload

# Stop the container gracefully
podman stop my-nginx

# Start it again
podman start my-nginx

# Remove the container when done
podman rm -f my-nginx
```

## Summary

Running Nginx in a Podman container provides a clean, isolated web server environment that is easy to configure and manage. You can serve static content by mounting local directories, apply custom Nginx configurations for fine-tuned control, and set up reverse proxying to backend services. When you run Podman as a non-root user, your Nginx container benefits from rootless container isolation compared to traditional installations. Combine volume mounts with custom configs to build a portable, reproducible web server setup that works identically across development and production.
