# How to Set Up a Reverse Proxy with Podman and Caddy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Caddy, Reverse Proxy, Container, HTTPS

Description: Learn how to use Caddy as a reverse proxy with Podman containers, featuring automatic HTTPS, simple configuration syntax, and straightforward multi-service routing.

---

> Caddy is a modern web server that provides automatic HTTPS out of the box. When combined with Podman, it offers one of the simplest paths to a production-ready reverse proxy setup for containerized services.

Setting up a reverse proxy should not require hundreds of lines of configuration. Caddy takes this philosophy to heart by offering a clean, readable configuration format called the Caddyfile and automatic TLS certificate management through Let's Encrypt. For containerized environments running on Podman, Caddy provides a lightweight and secure reverse proxy that handles HTTPS with zero additional configuration.

This guide demonstrates how to deploy Caddy as a reverse proxy for Podman containers, configure routing rules, and take advantage of Caddy's automatic HTTPS capabilities.

---

## Prerequisites

Make sure you have the following:

- Podman 4.4 or later if you plan to use the Quadlet systemd example
- A Linux system (Fedora, RHEL, Ubuntu, or Debian)
- For automatic HTTPS: a domain name with DNS records pointing to your server
- For rootless Podman on ports 80 and 443: either run as root, use higher host ports, or configure Linux to allow unprivileged low ports

Check your Podman version:

```bash
podman --version
```

## Creating the Podman Network

Start by creating a dedicated network for your proxy and backend services:

```bash
podman network create caddy-net
```

This network enables DNS-based container name resolution, allowing Caddy to reach backend containers by name.

## Launching Backend Services

Deploy two sample backend applications:

```bash
podman run -d \
  --name webapp \
  --network caddy-net \
  docker.io/library/nginx:alpine

podman run -d \
  --name api \
  --network caddy-net \
  docker.io/library/httpd:alpine
```

Neither container publishes ports to the host. Caddy will be the only publicly accessible entry point.

## Writing the Caddyfile

Create a directory for Caddy configuration:

```bash
mkdir -p ~/caddy/config
mkdir -p ~/caddy/data
```

Create the Caddyfile:

```bash
cat > ~/caddy/Caddyfile << 'EOF'
webapp.example.com {
    reverse_proxy webapp:80
}

api.example.com {
    reverse_proxy api:80
}
EOF
```

That is the entire configuration for two reverse proxy routes. Caddy automatically provisions TLS certificates from Let's Encrypt for both domains when they are publicly reachable. The simplicity of the Caddyfile is one of Caddy's strongest features.

### Local Development Configuration

If you are testing locally without real domains, use HTTP instead:

```bash
cat > ~/caddy/Caddyfile << 'EOF'
:80 {
    @webapp host webapp.example.com
    handle @webapp {
        reverse_proxy webapp:80
    }

    @api host api.example.com
    handle @api {
        reverse_proxy api:80
    }

    handle {
        respond "Service not found" 404
    }
}
EOF
```

This configuration listens on port 80 without attempting to provision certificates.

## Running the Caddy Container

Launch Caddy with the Caddyfile mounted:

```bash
podman run -d \
  --name caddy \
  --network caddy-net \
  -p 80:80 \
  -p 443:443 \
  -v ~/caddy/Caddyfile:/etc/caddy/Caddyfile:ro,Z \
  -v ~/caddy/data:/data:Z \
  -v ~/caddy/config:/config:Z \
  docker.io/library/caddy:2-alpine
```

The `/data` volume stores TLS certificates and the `/config` volume stores Caddy's runtime configuration. Both volumes are important for persisting state across container restarts.

## Testing the Proxy

Add test entries to your hosts file:

```bash
sudo sh -c 'echo "127.0.0.1 webapp.example.com api.example.com" >> /etc/hosts'
```

Test the routes:

```bash
curl -H "Host: webapp.example.com" http://localhost
curl -H "Host: api.example.com" http://localhost
```

## Path-Based Routing

Caddy supports path-based routing with a clean syntax:

```caddyfile
example.com {
    handle_path /webapp/* {
        reverse_proxy webapp:80
    }

    handle_path /api/* {
        reverse_proxy api:80
    }

    handle {
        respond "Welcome to example.com" 200
    }
}
```

The `handle_path` directive automatically strips the matched prefix before forwarding the request, so `/webapp/page` becomes `/page` when it reaches the backend.

## Adding Headers and Middleware

Caddy makes it easy to add headers and other middleware to your routes:

```caddyfile
webapp.example.com {
    reverse_proxy webapp:80 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Port {server_port}
    }

    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    encode gzip zstd
}
```

The `header_up` directives modify headers sent to the backend, while `header` modifies response headers sent to the client. The `encode` directive enables compression.

## Health Checks

Configure active health checks to monitor backend availability:

```caddyfile
webapp.example.com {
    reverse_proxy webapp:80 {
        health_uri /health
        health_interval 30s
        health_timeout 5s
        health_status 200
    }
}
```

Caddy will periodically send requests to the `/health` endpoint and remove unhealthy backends from the pool.

## Load Balancing Multiple Backends

When running multiple instances of a service, Caddy can distribute traffic:

```caddyfile
webapp.example.com {
    reverse_proxy webapp1:80 webapp2:80 webapp3:80 {
        lb_policy round_robin
        health_uri /health
        health_interval 10s
    }
}
```

Supported load balancing policies include `round_robin`, `least_conn`, `random`, `first`, and `ip_hash`.

## Using the Caddy API

Caddy exposes an admin API for dynamic configuration changes. By default, it listens on `localhost:2019`:

```bash
# View current configuration

podman exec caddy curl -s http://localhost:2019/config/ | python3 -m json.tool

# Add a new route dynamically
podman exec caddy curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"match": [{"host": ["newapp.example.com"]}], "handle": [{"handler": "reverse_proxy", "upstreams": [{"dial": "newapp:80"}]}]}' \
  http://localhost:2019/config/apps/http/servers/srv0/routes
```

## Reloading Configuration

To apply changes to the Caddyfile without downtime:

```bash
podman exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Caddy performs a graceful reload, ensuring existing connections are not interrupted.

## Running as a Systemd Service

The recommended way to run Podman containers under systemd is using Quadlet files. The older `podman generate systemd` command is deprecated.

Create a Quadlet container file:

```bash
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/caddy.container << 'EOF'
[Container]
ContainerName=caddy
Image=docker.io/library/caddy:2-alpine
Network=caddy-net
PublishPort=80:80
PublishPort=443:443
Volume=%h/caddy/Caddyfile:/etc/caddy/Caddyfile:ro,Z
Volume=%h/caddy/data:/data:Z
Volume=%h/caddy/config:/config:Z

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now caddy.service
loginctl enable-linger $USER
```

## Logging and Debugging

Enable structured logging in your Caddyfile:

```caddyfile
{
    log {
        output stdout
        format json
        level INFO
    }
}

webapp.example.com {
    log {
        output stdout
        format json
    }
    reverse_proxy webapp:80
}
```

View logs with:

```bash
podman logs -f caddy
```

## Conclusion

Caddy combined with Podman provides one of the most streamlined paths to a working reverse proxy with automatic HTTPS. The Caddyfile syntax is intuitive and requires far fewer lines than equivalent Nginx or Apache configurations. For teams that value simplicity and want TLS handled automatically, Caddy is an excellent choice. Its built-in health checks, load balancing, and admin API make it suitable for both development and production environments. Paired with Podman's rootless containers, you get a secure, modern infrastructure stack with minimal operational overhead.
