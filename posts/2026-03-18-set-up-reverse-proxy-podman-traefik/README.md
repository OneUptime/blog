# How to Set Up a Reverse Proxy with Podman and Traefik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Traefik, Reverse Proxy, Container, Networking

Description: Learn how to deploy Traefik as a reverse proxy with Podman, using labels and file-based configuration to route traffic to containerized services automatically.

---

> Traefik is a modern reverse proxy designed for containerized environments. When paired with Podman, it provides automatic service discovery and dynamic routing without the overhead of a container daemon.

Managing reverse proxy configurations manually becomes tedious as the number of services grows. Traefik solves this problem by discovering services automatically through container labels or configuration files. While Traefik is often associated with Docker, it works well with Podman too, especially when you use file-based providers or the Podman socket for service discovery.

This guide covers how to set up Traefik as a reverse proxy in a Podman environment, configure routing rules, and manage multiple backend services with minimal manual intervention.

---

## Prerequisites

You will need:

- Podman 4.0 or later for the manual setup, or Podman 4.6 or later if you want to use Quadlet for the systemd section
- A Linux system with systemd support
- Basic understanding of container networking and HTTP routing

Verify your Podman installation:

```bash
podman --version
```

## Understanding Traefik Architecture

Traefik uses a concept of providers to discover services. The most common providers are:

- **Docker provider**: Reads container labels through a Docker-compatible API, such as the Podman socket
- **File provider**: Reads routing rules from YAML or TOML files
- **HTTP provider**: Fetches configuration from an HTTP endpoint

For Podman, you can either enable the Podman socket (which exposes a Docker-compatible API) or use the file provider. This guide covers both approaches.

## Setting Up the Podman Network

Create a dedicated network for Traefik and your backend services:

```bash
podman network create traefik-net
```

## Approach 1: File-Based Configuration

The file provider approach does not require the Podman socket and works reliably without additional setup.

### Create the Directory Structure

```bash
mkdir -p ~/traefik/{config,dynamic}
```

### Create the Static Configuration

```bash
cat > ~/traefik/config/traefik.yml << 'EOF'
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true

api:
  dashboard: true
  insecure: true

log:
  level: INFO
EOF
```

### Create the Dynamic Configuration

```bash
cat > ~/traefik/dynamic/services.yml << 'EOF'
http:
  routers:
    app1-router:
      rule: "Host(`app1.example.com`)"
      service: app1-service
      entryPoints:
        - web

    app2-router:
      rule: "Host(`app2.example.com`)"
      service: app2-service
      entryPoints:
        - web

  services:
    app1-service:
      loadBalancer:
        servers:
          - url: "http://app1:80"

    app2-service:
      loadBalancer:
        servers:
          - url: "http://app2:80"
EOF
```

### Launch the Backend Containers

```bash
podman run -d \
  --name app1 \
  --network traefik-net \
  docker.io/library/nginx:alpine

podman run -d \
  --name app2 \
  --network traefik-net \
  docker.io/library/httpd:alpine
```

### Launch Traefik

```bash
podman run -d \
  --name traefik \
  --network traefik-net \
  -p 8081:80 \
  -p 8080:8080 \
  -v ~/traefik/config/traefik.yml:/etc/traefik/traefik.yml:ro,Z \
  -v ~/traefik/dynamic:/etc/traefik/dynamic:ro,Z \
  docker.io/library/traefik:v3.0
```

Port 8081 exposes the web entrypoint in a way that works with rootless Podman. If you run Podman as root or configure the host to allow unprivileged low ports, you can publish `80:80` instead. Port 8080 exposes the Traefik dashboard, which provides a visual overview of all configured routers and services.

## Approach 2: Using the Podman Socket

If you want Traefik to discover containers automatically through labels, you need to enable the Podman socket.

### Enable the Podman Socket

```bash
systemctl --user enable --now podman.socket
```

Verify the socket is active:

```bash
systemctl --user status podman.socket
```

The socket is typically located at `/run/user/$(id -u)/podman/podman.sock`.

### Create the Traefik Configuration

```bash
cat > ~/traefik/config/traefik.yml << 'EOF'
entryPoints:
  web:
    address: ":80"

providers:
  docker:
    endpoint: "unix:///var/run/podman/podman.sock"
    exposedByDefault: false

api:
  dashboard: true
  insecure: true
EOF
```

### Launch Backend Containers with Labels

```bash
podman run -d \
  --name app1 \
  --network traefik-net \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.app1.rule=Host(\`app1.example.com\`)" \
  --label "traefik.http.services.app1.loadbalancer.server.port=80" \
  docker.io/library/nginx:alpine

podman run -d \
  --name app2 \
  --network traefik-net \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.app2.rule=Host(\`app2.example.com\`)" \
  --label "traefik.http.services.app2.loadbalancer.server.port=80" \
  docker.io/library/httpd:alpine
```

### Launch Traefik with the Socket

```bash
podman run -d \
  --name traefik \
  --network traefik-net \
  -p 8081:80 \
  -p 8080:8080 \
  -v ~/traefik/config/traefik.yml:/etc/traefik/traefik.yml:ro,Z \
  -v /run/user/$(id -u)/podman/podman.sock:/var/run/podman/podman.sock \
  docker.io/library/traefik:v3.0
```

## Configuring Middleware

Traefik middleware allows you to modify requests before they reach your services. Here are common middleware configurations:

### Rate Limiting

```yaml
http:
  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        burst: 50

  routers:
    app1-router:
      rule: "Host(`app1.example.com`)"
      service: app1-service
      middlewares:
        - rate-limit
      entryPoints:
        - web
```

### Request Headers

```yaml
http:
  middlewares:
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        customResponseHeaders:
          X-Custom-Header: "managed-by-traefik"
```

### Path Stripping

```yaml
http:
  middlewares:
    strip-api-prefix:
      stripPrefix:
        prefixes:
          - "/api"

  routers:
    api-router:
      rule: "Host(`example.com`) && PathPrefix(`/api`)"
      service: api-service
      middlewares:
        - strip-api-prefix
      entryPoints:
        - web
```

## Testing the Setup

Add the test domains to your hosts file:

```bash
sudo sh -c 'echo "127.0.0.1 app1.example.com app2.example.com" >> /etc/hosts'
```

Test routing:

```bash
curl http://app1.example.com:8081
curl http://app2.example.com:8081
```

If you published `80:80` instead, you can omit the port from the URLs.

Access the Traefik dashboard at `http://localhost:8080/dashboard/` to see all configured routers, services, and middleware.

## Updating Configuration Dynamically

One of the key advantages of the file provider is that Traefik watches for changes. To add a new service, simply create or edit a file in the dynamic configuration directory:

```bash
cat > ~/traefik/dynamic/app3.yml << 'EOF'
http:
  routers:
    app3-router:
      rule: "Host(`app3.example.com`)"
      service: app3-service
      entryPoints:
        - web

  services:
    app3-service:
      loadBalancer:
        servers:
          - url: "http://app3:80"
EOF
```

Traefik picks up the change automatically without requiring a restart.

## Running Traefik as a Systemd Service

The recommended way to run Podman containers under systemd is using Quadlet files. The older `podman generate systemd` command is deprecated.

Create a Quadlet container file:

```bash
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/traefik.container << 'EOF'
[Container]
ContainerName=traefik
Image=docker.io/library/traefik:v3.0
Network=traefik-net
PublishPort=8081:80
PublishPort=8080:8080
Volume=%h/traefik/config/traefik.yml:/etc/traefik/traefik.yml:ro,Z
Volume=%h/traefik/dynamic:/etc/traefik/dynamic:ro,Z

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now traefik.service
loginctl enable-linger $USER
```

## Conclusion

Traefik provides a dynamic and flexible reverse proxy solution for Podman environments. Whether you choose the file-based provider for simplicity or the Podman socket for automatic discovery, Traefik reduces the manual configuration burden significantly. Its built-in dashboard, middleware system, and automatic configuration reloading make it an excellent choice for environments where services change frequently. Combined with Podman's rootless and daemonless architecture, you get a secure and maintainable infrastructure for routing traffic to your containerized applications.
