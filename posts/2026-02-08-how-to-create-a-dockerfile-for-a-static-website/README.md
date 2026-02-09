# How to Create a Dockerfile for a Static Website

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Static Website, Nginx, Apache, DevOps, Web Hosting

Description: Step-by-step guide to creating optimized Dockerfiles for static websites using Nginx, Apache, and multi-stage builds.

---

Serving a static website from a Docker container is one of the simplest and most practical uses of Docker. You get a consistent deployment artifact, easy scaling, and the ability to run your site anywhere Docker runs. Whether your site is a hand-crafted collection of HTML files or the output of a static site generator like Hugo, Jekyll, or Next.js, the approach is straightforward.

This guide covers several Dockerfile patterns for static websites, from the most basic setup to optimized multi-stage builds with custom server configurations.

## The Simplest Possible Dockerfile

If you have HTML, CSS, and JavaScript files ready to serve, a two-line Dockerfile gets you running.

A minimal Dockerfile using the official Nginx image:

```dockerfile
# Minimal static site Dockerfile
FROM nginx:alpine

# Copy static files to Nginx's default serving directory
COPY ./site /usr/share/nginx/html
```

Build and run it:

```bash
# Build the image
docker build -t my-static-site .

# Run the container, mapping port 8080 on the host to port 80 in the container
docker run -d -p 8080:80 my-static-site
```

Visit `http://localhost:8080` in your browser and your site is live. The Nginx Alpine image is about 40MB, making it one of the smallest options for serving static content.

## Project Structure

A typical project directory for a static site Docker setup looks like this:

```
my-website/
  Dockerfile
  nginx.conf          # Custom Nginx configuration (optional)
  site/
    index.html
    css/
      style.css
    js/
      app.js
    images/
      logo.png
```

## Custom Nginx Configuration

The default Nginx configuration works for basic sites, but you will likely want to customize it for production use. Common needs include gzip compression, caching headers, and single-page application (SPA) routing.

Create a custom Nginx configuration file:

```nginx
# nginx.conf - Production-ready static site configuration
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression for text-based assets
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Cache static assets for 1 year (use cache-busting filenames)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache HTML files for a shorter period
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # SPA fallback: serve index.html for all unmatched routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Use this configuration in your Dockerfile:

```dockerfile
# Static site with custom Nginx configuration
FROM nginx:alpine

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files
COPY ./site /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Multi-Stage Build for React Applications

React, Vue, and Angular projects need a build step before they produce static files. A multi-stage Dockerfile keeps the build tools out of the final image.

Build a React app and serve it with Nginx:

```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the built files with Nginx
FROM nginx:alpine

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

The first stage installs Node.js, all dependencies, and runs the build. The second stage starts fresh with only Nginx and the compiled output. Your final image will be around 40-50MB instead of the 1GB+ that a Node.js image with all dependencies would be.

## Multi-Stage Build for Hugo Sites

Hugo is a fast static site generator written in Go. Here is how to build a Hugo site inside Docker.

Build and serve a Hugo site:

```dockerfile
# Stage 1: Build the Hugo site
FROM hugomods/hugo:latest AS builder

WORKDIR /src
COPY . .

# Build the site (output goes to /src/public by default)
RUN hugo --minify

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=builder /src/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Using Apache Instead of Nginx

If you prefer Apache, the `httpd` image works just as well for static content.

Serve a static site with Apache:

```dockerfile
# Static site with Apache httpd
FROM httpd:2.4-alpine

# Enable useful modules by uncommenting them in the config
RUN sed -i \
    -e 's/^#LoadModule deflate_module/LoadModule deflate_module/' \
    -e 's/^#LoadModule expires_module/LoadModule expires_module/' \
    -e 's/^#LoadModule rewrite_module/LoadModule rewrite_module/' \
    /usr/local/apache2/conf/httpd.conf

# Copy static files to Apache's document root
COPY ./site /usr/local/apache2/htdocs/

# Copy custom Apache configuration for caching and compression
COPY .htaccess /usr/local/apache2/htdocs/.htaccess

EXPOSE 80
```

Create a `.htaccess` file for Apache optimizations:

```apache
# .htaccess - Enable compression and caching
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/json application/javascript text/xml application/xml
</IfModule>

<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
```

## Adding Health Checks

Production deployments benefit from health checks that let orchestrators verify the container is serving content.

Add a health check to your Dockerfile:

```dockerfile
# Static site with health check
FROM nginx:alpine

COPY ./site /usr/share/nginx/html

# Health check pings the root URL every 30 seconds
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Running as a Non-Root User

For improved security, configure the container to run as a non-privileged user.

Nginx non-root setup:

```dockerfile
# Secure static site running as non-root
FROM nginx:alpine

# Copy site files
COPY ./site /usr/share/nginx/html

# Copy a custom nginx.conf that listens on port 8080 (non-privileged)
COPY nginx-nonroot.conf /etc/nginx/nginx.conf

# Create a non-root user and set ownership
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

The custom `nginx-nonroot.conf` should listen on port 8080 (or any port above 1024) since non-root users cannot bind to privileged ports.

## Docker Compose for Local Development

During development, use Docker Compose with a bind mount to see changes without rebuilding.

A docker-compose.yml for local development:

```yaml
# docker-compose.yml - Local development with live reload
services:
  website:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      # Mount local files for live editing
      - ./site:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

Start the development server:

```bash
# Start the development server in the background
docker compose up -d

# View logs
docker compose logs -f website

# Stop when done
docker compose down
```

Changes to files in the `./site` directory appear immediately without rebuilding.

## Optimizing Image Size

A few techniques keep your static site images as small as possible.

First, always use Alpine-based images. The standard `nginx` image is around 140MB, while `nginx:alpine` is about 40MB.

Second, use a `.dockerignore` file to exclude unnecessary files from the build context:

```
# .dockerignore - Exclude files not needed in the image
node_modules
.git
.gitignore
README.md
*.md
.env
.env.*
tests/
docs/
```

Third, minimize the number of layers by combining commands:

```dockerfile
# Combine RUN commands to reduce layers
RUN rm /etc/nginx/conf.d/default.conf && \
    mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx
```

## Summary

A static website Dockerfile at its core copies files into a web server image. Start with `nginx:alpine` for the smallest footprint, add a custom configuration for compression and caching, and use multi-stage builds when your site requires a build step. Add health checks for production, run as non-root for security, and keep a `.dockerignore` to minimize your build context. These patterns will serve you well whether you are hosting a personal blog or deploying a corporate marketing site.
