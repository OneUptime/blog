# How to Run Caddy in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Caddy, Web Server, Reverse Proxy, HTTPS

Description: Learn how to run Caddy web server in a Podman container with automatic HTTPS, reverse proxying, and a simple Caddyfile configuration.

---

> Caddy in Podman provides a modern web server with automatic HTTPS support in a lightweight, rootless container.

Caddy is a powerful, enterprise-ready web server with automatic HTTPS as its standout feature. When you configure a domain name and make ports 80 and 443 externally reachable, it handles TLS certificate provisioning and renewal automatically, making it an excellent choice for serving websites and acting as a reverse proxy. Running Caddy in a Podman container gives you a secure, isolated web server with minimal configuration. This guide covers static file serving, reverse proxying, custom Caddyfile configurations, and persistent data.

---

## Pulling the Caddy Image

Download the official Caddy image.

```bash
# Pull the latest Caddy image

podman pull docker.io/library/caddy:2

# Verify the image
podman images | grep caddy
```

## Running a Basic Caddy Container

Start Caddy serving the default welcome page.

```bash
# Run Caddy in detached mode
podman run -d \
  --name my-caddy \
  -p 8080:80 \
  caddy:2

# Check the container is running
podman ps

# Test the default page
curl http://localhost:8080
```

## Serving Static Files

Mount a local directory to serve custom content.

```bash
# Create a directory for your website
mkdir -p ~/caddy-site

# Create an index.html file
cat > ~/caddy-site/index.html <<'EOF'
<!DOCTYPE html>
<html>
<head><title>Caddy on Podman</title></head>
<body>
  <h1>Hello from Caddy running in Podman!</h1>
  <p>Serving static files from a Podman container.</p>
</body>
</html>
EOF

# Run Caddy with the static site mounted
podman run -d \
  --name caddy-static \
  -p 8081:80 \
  -v ~/caddy-site:/usr/share/caddy:Z \
  caddy:2

# Verify the custom page
curl http://localhost:8081
```

## Using a Custom Caddyfile

Write a Caddyfile for full control over Caddy's behavior.

```bash
# Create a config directory
mkdir -p ~/caddy-config

# Write a custom Caddyfile
cat > ~/caddy-config/Caddyfile <<'EOF'
# Listen on port 80 for local HTTP testing
:80 {
	# Set the root directory for static files
	root * /usr/share/caddy

	# Enable file serving
	file_server

	# Enable gzip compression
	encode gzip

	# Custom headers
	header {
		X-Frame-Options "DENY"
		X-Content-Type-Options "nosniff"
		X-XSS-Protection "1; mode=block"
		-Server
	}

	# Access logging
	log {
		output stdout
		format console
	}
}
EOF

# Run Caddy with the custom Caddyfile
podman run -d \
  --name caddy-custom \
  -p 8082:80 \
  -v ~/caddy-config:/etc/caddy:Z \
  -v ~/caddy-site:/usr/share/caddy:Z \
  caddy:2

# Verify the custom headers are set
curl -I http://localhost:8082
```

## Caddy as a Reverse Proxy

Configure Caddy to proxy requests to backend services.

```bash
# Write a reverse proxy Caddyfile
mkdir -p ~/caddy-proxy-config

cat > ~/caddy-proxy-config/Caddyfile <<'EOF'
:80 {
	# Reverse proxy to a backend application
	reverse_proxy /api/* host.containers.internal:3000

	# Reverse proxy with load balancing
	reverse_proxy /app/* host.containers.internal:4000 host.containers.internal:4001 {
		lb_policy round_robin
		health_uri /health
		health_interval 10s
	}

	# Serve static files for everything else
	root * /usr/share/caddy
	file_server

	log {
		output stdout
	}
}
EOF

# Run Caddy as a reverse proxy
podman run -d \
  --name caddy-proxy \
  -p 8083:80 \
  -v ~/caddy-proxy-config:/etc/caddy:Z \
  -v ~/caddy-site:/usr/share/caddy:Z \
  caddy:2
```

## Persistent Data and Certificates

Store Caddy's data directory persistently. This is where Caddy stores certificates, private keys, OCSP staples, and other managed TLS assets when automatic HTTPS is enabled.

```bash
# Create volumes for Caddy data and config
podman volume create caddy-data
podman volume create caddy-config-vol

# Run Caddy with persistent storage
podman run -d \
  --name caddy-persistent \
  -p 8084:80 \
  -v ~/caddy-config:/etc/caddy:Z \
  -v ~/caddy-site:/usr/share/caddy:Z \
  -v caddy-data:/data:Z \
  -v caddy-config-vol:/config:Z \
  caddy:2

# Verify volumes are attached
podman inspect caddy-persistent --format '{{range .Mounts}}{{.Name}} {{end}}'
```

## Using the Caddy Admin API

Manage Caddy dynamically through its admin API.

```bash
# Check Caddy's current configuration
podman exec caddy-custom curl -s localhost:2019/config/ | python3 -m json.tool | head -20

# Reload the Caddyfile
podman exec caddy-custom caddy reload --config /etc/caddy/Caddyfile

# Validate the Caddyfile
podman exec caddy-custom caddy validate --config /etc/caddy/Caddyfile

# Format the Caddyfile
podman exec caddy-custom caddy fmt --overwrite /etc/caddy/Caddyfile
```

## Managing the Container

Common management operations.

```bash
# View Caddy logs
podman logs my-caddy

# Stop and start
podman stop my-caddy
podman start my-caddy

# Remove containers and volumes
podman rm -f my-caddy caddy-static caddy-custom caddy-proxy caddy-persistent
podman volume rm caddy-data caddy-config-vol
```

## Summary

Running Caddy in a Podman container gives you a modern web server with automatic HTTPS, simple configuration syntax, and built-in reverse proxy capabilities. The Caddyfile format is straightforward and human-readable, making it easy to set up static file serving, reverse proxying with load balancing, and security headers. Persistent volumes preserve TLS certificates and configuration state. The admin API enables runtime configuration changes without restarts. Podman's rootless execution pairs well with Caddy's security-first design.
