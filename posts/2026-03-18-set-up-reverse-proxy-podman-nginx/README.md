# How to Set Up a Reverse Proxy with Podman and Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Nginx, Reverse Proxy, Container, Networking

Description: Learn how to set up a reverse proxy using Podman and Nginx to route traffic to multiple backend containers, including configuration examples and best practices.

---

> A reverse proxy sits between clients and your backend services, forwarding requests to the appropriate container. Combining Podman with Nginx gives you a lightweight, daemonless container runtime paired with one of the most battle-tested web servers available.

If you are running multiple containerized services on a single host, you need a way to route incoming traffic to the correct container. A reverse proxy handles this by listening on a public-facing port and forwarding requests based on hostnames, paths, or other criteria. Nginx is a natural choice for this role because of its performance, stability, and extensive documentation. Podman, as a daemonless container engine, provides a secure and rootless alternative to Docker for running both the proxy and backend services.

This guide walks you through setting up an Nginx reverse proxy in a Podman environment, from creating a shared network to configuring virtual hosts and testing the setup end to end.

---

## Prerequisites

Before you begin, make sure you have the following installed on your system:

- Podman 4.0 or later
- A Linux distribution with systemd (Fedora, RHEL, Ubuntu, or Debian)
- Basic familiarity with the command line and container concepts

You can verify your Podman installation with:

```bash
podman --version
```

## Creating a Podman Network

Containers need to communicate with each other over a shared network. By default, Podman creates a bridge network, but creating a dedicated network for your proxy setup keeps things organized and predictable.

```bash
podman network create proxy-net
```

You can inspect the network to confirm it was created:

```bash
podman network inspect proxy-net
```

This network will allow your Nginx reverse proxy container to reach backend containers by their container names, which Podman resolves through its built-in DNS.

## Launching Backend Containers

For this example, we will run two simple web applications as backend services. You can substitute these with any containerized application you need to proxy.

```bash
podman run -d \
  --name app1 \
  --network proxy-net \
  docker.io/library/nginx:alpine

podman run -d \
  --name app2 \
  --network proxy-net \
  docker.io/library/httpd:alpine
```

Both containers are attached to the `proxy-net` network and are not publishing any ports to the host. Only the reverse proxy will be exposed publicly.

## Creating the Nginx Configuration

Create a directory on your host to store the Nginx configuration files:

```bash
mkdir -p ~/nginx-proxy/conf.d
```

Now create the main reverse proxy configuration file:

```bash
cat > ~/nginx-proxy/conf.d/default.conf << 'EOF'
upstream app1_backend {
    server app1:80;
}

upstream app2_backend {
    server app2:80;
}

server {
    listen 80;
    server_name app1.example.com;

    location / {
        proxy_pass http://app1_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name app2.example.com;

    location / {
        proxy_pass http://app2_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

This configuration defines two virtual hosts. Requests arriving with the `Host` header `app1.example.com` are forwarded to the `app1` container, and requests for `app2.example.com` go to `app2`. The `proxy_set_header` directives ensure that the backend receives accurate client information.

## Running the Nginx Reverse Proxy Container

Now launch the Nginx container with the custom configuration mounted and the appropriate port published:

```bash
podman run -d \
  --name nginx-proxy \
  --network proxy-net \
  -p 8080:80 \
  -v ~/nginx-proxy/conf.d:/etc/nginx/conf.d:ro,Z \
  docker.io/library/nginx:alpine
```

The `-v` flag mounts your configuration directory into the container. The `:ro` option makes it read-only inside the container, and `:Z` handles SELinux relabeling if your system uses it. This example publishes host port `8080` so it works with rootless Podman; if you are running rootful Podman or have configured low-port binding, you can use `80:80` instead.

## Testing the Reverse Proxy

To test locally without modifying DNS records, add entries to your `/etc/hosts` file:

```bash
sudo sh -c 'echo "127.0.0.1 app1.example.com app2.example.com" >> /etc/hosts'
```

Now send requests to each virtual host:

```bash
curl -H "Host: app1.example.com" http://localhost:8080
curl -H "Host: app2.example.com" http://localhost:8080
```

Each request should return the response from the corresponding backend container.

## Adding Path-Based Routing

In addition to host-based routing, you can route traffic based on URL paths. This is useful when you want a single domain to serve multiple applications:

```nginx
server {
    listen 80;
    server_name mysite.example.com;

    location /app1/ {
        proxy_pass http://app1_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /app2/ {
        proxy_pass http://app2_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The trailing slash on `proxy_pass` is important because it strips the matched location prefix before forwarding the request to the backend.

## Health Checks and Monitoring

You can add a health check endpoint to your Nginx configuration to verify the proxy is functioning:

```nginx
server {
    listen 80 default_server;

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    location /nginx-status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

Monitor the proxy with:

```bash
curl http://localhost:8080/health
```

## Reloading Configuration Without Downtime

When you update your Nginx configuration, you do not need to restart the container. Instead, send a reload signal:

```bash
podman exec nginx-proxy nginx -s reload
```

This gracefully reloads the configuration without dropping existing connections.

## Running as a Systemd Service

The recommended way to run Podman containers under systemd is using Quadlet files. The older `podman generate systemd` command is deprecated.

Create a Quadlet container file:

```bash
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/nginx-proxy.container << 'EOF'
[Container]
ContainerName=nginx-proxy
Image=docker.io/library/nginx:alpine
Network=proxy-net
PublishPort=8080:80
Volume=%h/nginx-proxy/conf.d:/etc/nginx/conf.d:ro,Z

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now nginx-proxy.service
loginctl enable-linger $USER
```

## Common Troubleshooting

If you encounter issues, check the following:

**Container DNS resolution**: Make sure all containers are on the same Podman network. Run `podman network inspect proxy-net` to verify.

**Configuration syntax errors**: Validate your Nginx config before reloading:

```bash
podman exec nginx-proxy nginx -t
```

**Permission issues**: If you see permission denied errors on SELinux-enabled systems, ensure you are using the `:Z` flag when mounting volumes.

**Port conflicts**: If port 80 is already in use, change the published port or stop the conflicting service.

## Conclusion

Setting up a reverse proxy with Podman and Nginx is straightforward and provides a solid foundation for routing traffic to multiple containerized services. By using a dedicated Podman network, your backend containers remain isolated from the public internet while the Nginx proxy handles all incoming requests. This pattern scales well, supports both host-based and path-based routing, and integrates naturally with systemd for production use. From here, you can extend the setup with SSL/TLS termination, rate limiting, caching, and other Nginx features to build a production-ready infrastructure.
