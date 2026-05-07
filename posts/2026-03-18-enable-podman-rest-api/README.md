# How to Enable the Podman REST API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Container, DevOps, Linux

Description: Learn how to enable and configure the Podman REST API to manage containers programmatically using HTTP requests.

---

> The Podman REST API gives you full programmatic control over containers, images, volumes, and networks through standard HTTP endpoints.

Podman is a daemonless container engine that offers a Docker-compatible REST API for managing containers. Unlike Docker, Podman does not run a persistent background daemon by default. Instead, you explicitly start the API service when you need it. This guide walks you through enabling the Podman REST API, configuring it for different use cases, and verifying that it works correctly.

---

## Understanding the Podman REST API

Podman provides a REST API that is largely compatible with the Docker Engine API. This means tools and libraries built for Docker can often work with Podman by simply pointing them at the Podman API socket. The API supports two sets of endpoints: the Podman-native Libpod endpoints, such as `/v4.0.0/libpod/`, and the Docker-compatible endpoints, such as `/v1.40/`.

The API service can listen on either a Unix socket or a TCP port, depending on your needs. Unix sockets are the default and recommended approach for local access, while TCP listeners are useful for remote management.

## Prerequisites

Before enabling the API, ensure Podman is installed on your system.

```bash
# Install Podman on Ubuntu/Debian

sudo apt-get update
sudo apt-get install -y podman

# Install Podman on Fedora/RHEL/CentOS
sudo dnf install -y podman

# Verify the installation
podman --version
```

You should see output such as `podman version 4.9.3`, depending on your distribution.

## Starting the API Service Manually

The simplest way to start the Podman REST API is with the `podman system service` command.

```bash
# Start the API service with a Unix socket (foreground)
podman system service --time 0 unix:///tmp/podman.sock

# The --time 0 flag means the service runs indefinitely
# Without it, the service stops after 5 seconds of inactivity
```

The `--time` flag controls the idle timeout in seconds. Setting it to `0` keeps the service running until you manually stop it. This is useful for development and testing.

To start the service in the background, append an ampersand or use nohup.

```bash
# Run in background
podman system service --time 0 unix:///tmp/podman.sock &

# Or use nohup to persist across terminal sessions
nohup podman system service --time 0 unix:///tmp/podman.sock &
```

## Starting the API with TCP

If you need remote access to the API, you can bind it to a TCP port instead of a Unix socket.

```bash
# Start the API on TCP port 8080, listening on all interfaces
podman system service --time 0 tcp://0.0.0.0:8080

# Start the API on TCP port 8080, listening only on localhost
podman system service --time 0 tcp://127.0.0.1:8080
```

**Warning**: Exposing the Podman API over TCP without mutual TLS gives anyone with network access full control over your containers. Prefer SSH forwarding for remote access, or restrict access with firewall rules and require client authentication in production environments.

## Verifying the API Is Running

Once the service is started, verify it by making a simple HTTP request.

```bash
# Test with a Unix socket using curl
curl --unix-socket /tmp/podman.sock http://localhost/v4.0.0/libpod/info

# Test with a TCP listener
curl http://localhost:8080/v4.0.0/libpod/info
```

A successful response returns a JSON object with system information including the Podman version, host details, and storage configuration.

```bash
# Check the API version
curl --unix-socket /tmp/podman.sock http://localhost/version

# You can also use the Docker-compatible endpoint
curl --unix-socket /tmp/podman.sock http://localhost/v1.40/info
```

## Using systemd to Manage the API Service

For production systems, use systemd to manage the Podman API service. Podman ships with a systemd socket unit that starts the API on demand.

```bash
# Enable and start the Podman socket (root mode)
sudo systemctl enable --now podman.socket

# Check the status
sudo systemctl status podman.socket
```

The socket unit creates a Unix socket at `/run/podman/podman.sock` and starts the API service automatically when a connection arrives. This is more efficient than running the service continuously because it only activates when needed.

```bash
# Verify the socket is listening
sudo ls -la /run/podman/podman.sock

# Test the API through the systemd socket
sudo curl --unix-socket /run/podman/podman.sock http://localhost/v4.0.0/libpod/info
```

## Configuring the API with a Custom systemd Unit

If you need custom configuration, create your own systemd service unit.

```ini
# /etc/systemd/system/podman-api.service
[Unit]
Description=Podman API Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/podman system service --time 0 tcp://127.0.0.1:8080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd, enable and start the custom service
sudo systemctl daemon-reload
sudo systemctl enable --now podman-api.service

# Check status
sudo systemctl status podman-api.service
```

## Testing with Docker-Compatible Clients

Because the Podman API is Docker-compatible, you can point Docker clients at it.

```bash
# Set the Docker host to the Podman socket
export DOCKER_HOST=unix:///tmp/podman.sock

# Now Docker CLI commands use Podman's API
docker ps
docker images
docker info
```

This also works with Docker SDKs in Python, Go, and other languages.

```python
import docker

# Connect to the Podman API
client = docker.DockerClient(base_url='unix:///tmp/podman.sock')

# List containers
containers = client.containers.list()
for c in containers:
    print(c.name, c.status)
```

## Securing the API

When exposing the API over TCP, take steps to secure it.

```bash
# Use a reverse proxy like nginx with mutual TLS
# Example nginx configuration snippet:
# server {
#     listen 443 ssl;
#     ssl_certificate /etc/ssl/certs/podman.crt;
#     ssl_certificate_key /etc/ssl/private/podman.key;
#     ssl_client_certificate /etc/ssl/certs/client-ca.crt;
#     ssl_verify_client on;
#     location / {
#         proxy_pass http://127.0.0.1:8080;
#     }
# }

# Restrict access with firewall rules
sudo firewall-cmd --add-rich-rule='rule family="ipv4" source address="10.0.0.0/24" port port="8080" protocol="tcp" accept'
```

You can also use SSH tunneling for secure remote access without configuring TLS directly.

```bash
# Create an SSH tunnel from your local machine to the remote Podman host
ssh -L 8080:127.0.0.1:8080 user@remote-host

# Now access the API locally through the tunnel
curl http://localhost:8080/v4.0.0/libpod/info
```

## Troubleshooting

If the API fails to start, check for common issues.

```bash
# Check if another process is using the socket
ls -la /tmp/podman.sock

# Remove a stale socket file
rm -f /tmp/podman.sock

# Check Podman system logs
journalctl -u podman.socket --no-pager -n 50

# Verify Podman storage is configured correctly
podman system info
```

If you receive permission errors, ensure your user has the necessary privileges or switch to rootless mode, which is covered in the next guide.

## Conclusion

Enabling the Podman REST API unlocks programmatic access to all container management operations. You can start the API manually for quick testing, use systemd for production deployments, and choose between Unix sockets for local access or TCP for remote management. The Docker-compatible endpoints make it straightforward to integrate Podman with existing tools and workflows. Always secure the API when exposing it beyond localhost, using mutual TLS, SSH tunnels, or firewall rules to protect your container environment.
