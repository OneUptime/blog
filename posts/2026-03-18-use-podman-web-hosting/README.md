# How to Use Podman for Web Hosting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Web Hosting, Container, Nginx, Apache

Description: Learn how to use Podman to host websites and web applications using containerized web servers like Nginx and Apache, with rootless security and systemd integration.

---

> Podman provides a secure, daemonless approach to web hosting that eliminates the risks of running a privileged Docker daemon while giving you full control over your web infrastructure.

Web hosting has traditionally required careful server configuration, package management, and security hardening. Podman simplifies this process by letting you run web servers in isolated containers without a long-running daemon, and many common setups can run without root privileges. Whether you are hosting a static site, a dynamic web application, or multiple virtual hosts, Podman gives you a lightweight and secure foundation.

This guide walks you through setting up web hosting with Podman, covering everything from basic Nginx containers to multi-site configurations with TLS termination.

---

## Why Podman for Web Hosting

Podman runs containers without a central daemon, so container lifecycle does not depend on a long-running privileged service. Its rootless mode lets unprivileged users run many container workloads, reducing the attack surface of your web server. Combined with systemd integration through Quadlet, Podman containers can start on boot, restart on failure, and behave like native system services.

## Setting Up a Basic Nginx Container

Start by pulling the official Nginx image and running it with Podman:

```bash
podman pull docker.io/library/nginx:stable-alpine

podman run -d \
  --name web-server \
  -p 8080:80 \
  -v ./html:/usr/share/nginx/html:ro,Z \
  docker.io/library/nginx:stable-alpine
```

The `:Z` suffix handles SELinux relabeling automatically for a single container. Use `:z` instead if multiple containers need to share the same host content. Place your website files in the `./html` directory and they will be served immediately.

## Serving a Static Website

Create a simple directory structure for your site:

```bash
mkdir -p ~/mysite/html
cat > ~/mysite/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>My Podman Site</title></head>
<body><h1>Hello from Podman</h1></body>
</html>
EOF
```

Run the container pointing to your site content:

```bash
podman run -d \
  --name my-static-site \
  -p 8080:80 \
  -v ~/mysite/html:/usr/share/nginx/html:ro,Z \
  docker.io/library/nginx:stable-alpine
```

Visit `http://localhost:8080` to see your site live.

## Custom Nginx Configuration

For more control, mount a custom Nginx configuration file:

```nginx
# ~/mysite/nginx.conf

server {
    listen 80;
    server_name example.com;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

Run with the custom config:

```bash
podman run -d \
  --name web-custom \
  -p 8080:80 \
  -v ~/mysite/nginx.conf:/etc/nginx/conf.d/default.conf:ro,Z \
  -v ~/mysite/html:/usr/share/nginx/html:ro,Z \
  docker.io/library/nginx:stable-alpine
```

## Hosting Multiple Sites with a Reverse Proxy

When hosting multiple sites, use an Nginx reverse proxy container that routes traffic to backend containers. Because the proxy below publishes port 80 on the host, these examples use rootful Podman. First, create a shared Podman network:

```bash
sudo podman network create web-network
```

Run two backend site containers:

```bash
sudo podman run -d --name site-a --network web-network \
  -v ~/sites/site-a:/usr/share/nginx/html:ro,Z \
  docker.io/library/nginx:stable-alpine

sudo podman run -d --name site-b --network web-network \
  -v ~/sites/site-b:/usr/share/nginx/html:ro,Z \
  docker.io/library/nginx:stable-alpine
```

Create a reverse proxy configuration:

```nginx
# ~/proxy/nginx.conf
upstream site_a { server site-a:80; }
upstream site_b { server site-b:80; }

server {
    listen 80;
    server_name sitea.example.com;
    location / { proxy_pass http://site_a; }
}

server {
    listen 80;
    server_name siteb.example.com;
    location / { proxy_pass http://site_b; }
}
```

Run the proxy container:

```bash
sudo podman run -d --name reverse-proxy \
  --network web-network \
  -p 80:80 \
  -v ~/proxy/nginx.conf:/etc/nginx/conf.d/default.conf:ro,Z \
  docker.io/library/nginx:stable-alpine
```

## Adding TLS with Let's Encrypt

Use Certbot to obtain certificates before starting the HTTPS container, or stop anything already listening on port 80 while Certbot runs. Because Certbot stores the live certificate files as symlinks, mount the full `/etc/letsencrypt` tree into your container:

```bash
sudo certbot certonly --standalone -d example.com

sudo podman run -d --name web-tls \
  --security-opt label=disable \
  -p 443:443 -p 80:80 \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  -v ~/mysite/nginx-tls.conf:/etc/nginx/conf.d/default.conf:ro,Z \
  -v ~/mysite/html:/usr/share/nginx/html:ro,Z \
  docker.io/library/nginx:stable-alpine
```

The TLS Nginx config:

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;
}
```

## Running as a systemd Service with Quadlet

Create a Quadlet file so your web server starts automatically on boot:

```ini
# ~/.config/containers/systemd/web-server.container
[Container]
Image=docker.io/library/nginx:stable-alpine
PublishPort=8080:80
Volume=%h/mysite/html:/usr/share/nginx/html:ro,Z
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
```

Reload systemd, start the service, and enable lingering so the user service can start at boot:

```bash
systemctl --user daemon-reload
systemctl --user start web-server.service
loginctl enable-linger $USER
```

## Hosting a Dynamic Application

For a Node.js or Python application, build a custom container image:

```dockerfile
FROM docker.io/library/node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run it with Podman:

```bash
podman build -t my-web-app .
podman run -d --name web-app -p 3000:3000 my-web-app
```

## Monitoring and Logs

Check your web server logs in real time:

```bash
podman logs -f web-server
```

Monitor resource usage:

```bash
podman stats web-server
```

## Conclusion

Podman is a strong choice for web hosting because it eliminates the daemon dependency, supports rootless operation, and integrates cleanly with systemd for production workloads. You can host static sites, dynamic applications, and multi-site configurations with the same security-first approach. Start with a single container and scale up to a full reverse proxy setup as your hosting needs grow.
