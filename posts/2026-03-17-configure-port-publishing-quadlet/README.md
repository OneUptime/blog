# How to Configure Port Publishing in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Networking, Port

Description: Learn how to publish container ports using Podman Quadlet container files to expose services on the host network.

---

> Expose container services to the host and external networks by configuring port publishing in your Quadlet container files with the PublishPort directive.

When a container runs a network service, you need to publish its ports to make it accessible from the host or external clients. Quadlet provides the `PublishPort` directive to map container ports to host ports declaratively.

---

## Basic Port Publishing

Map a host port to a container port:

```ini
# ~/.config/containers/systemd/nginx.container

[Unit]
Description=Nginx web server

[Container]
Image=docker.io/library/nginx:latest
# Map host port 8080 to container port 80
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Publishing Multiple Ports

Add multiple `PublishPort` lines:

```ini
# ~/.config/containers/systemd/myapp.container
[Unit]
Description=Application with multiple ports

[Container]
Image=docker.io/myorg/myapp:latest
# HTTP traffic
PublishPort=8080:80
# HTTPS traffic
PublishPort=8443:443
# Metrics endpoint
PublishPort=9090:9090

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Binding to a Specific Interface

Restrict a port to a specific host IP address:

```ini
[Container]
Image=docker.io/library/nginx:latest
# Only listen on localhost
PublishPort=127.0.0.1:8080:80
# Listen on a specific network interface
PublishPort=192.168.1.100:8443:443
```

## Publishing UDP Ports

Specify the protocol for non-TCP ports:

```ini
[Container]
Image=docker.io/myorg/dns-server:latest
# TCP port
PublishPort=53:53/tcp
# UDP port
PublishPort=53:53/udp
```

## Dynamic Port Assignment

Let Podman assign a random available host port:

```ini
[Container]
Image=docker.io/library/nginx:latest
# Podman assigns a random host port mapped to container port 80
PublishPort=80
```

Check the assigned port after starting:

```bash
# Find the dynamically assigned port
podman port systemd-nginx
```

## Reload and Verify

```bash
# Reload systemd
systemctl --user daemon-reload

# Start the service
systemctl --user start nginx.service

# Verify published ports
podman port systemd-nginx

# Test connectivity
curl http://localhost:8080
```

## Summary

The `PublishPort` directive in Quadlet container files maps container ports to the host. You can publish multiple ports, bind to specific interfaces, specify UDP or TCP protocols, and use dynamic port assignment. For rootless containers, remember that binding to ports below 1024 requires additional configuration.
