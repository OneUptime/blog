# How to Configure Networking in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Networking

Description: Learn how to configure container networking in Podman Quadlet files including custom networks, DNS, and network modes.

---

> Connect containers to custom Podman networks using Quadlet network files and the Network directive for reliable inter-container communication.

By default, rootless Podman containers use slirp4netns or pasta for networking. To enable container-to-container communication with DNS resolution, you need to create and connect containers to custom Podman networks. Quadlet makes this declarative with `.network` files and the `Network` directive.

---

## Creating a Quadlet Network File

Define a custom network in a `.network` file:

```ini
# ~/.config/containers/systemd/mynet.network

[Network]
# Use bridge driver (default)
Driver=bridge
# Optionally specify a subnet
Subnet=10.89.0.0/24
Gateway=10.89.0.1
```

## Connecting a Container to a Network

Reference the network file in your container unit:

```ini
# ~/.config/containers/systemd/webapp.container
[Unit]
Description=Web application on custom network

[Container]
Image=docker.io/myorg/webapp:latest
Network=mynet.network
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Multi-Container Communication

Containers on the same network can reach each other by container name:

```ini
# ~/.config/containers/systemd/api.container
[Unit]
Description=API server
After=database.service

[Container]
ContainerName=api
Image=docker.io/myorg/api:latest
Network=mynet.network
# The database container is reachable at hostname "database"
Environment=DATABASE_URL=postgresql://user:pass@database:5432/mydb
PublishPort=3000:3000

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/database.container
[Unit]
Description=PostgreSQL database

[Container]
ContainerName=database
Image=docker.io/library/postgres:16
Network=mynet.network
Environment=POSTGRES_PASSWORD=pass
Environment=POSTGRES_USER=user
Environment=POSTGRES_DB=mydb
Volume=dbdata.volume:/var/lib/postgresql/data

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Using Host Networking

For containers that need direct access to the host network:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# Use the host network namespace
Network=host
```

## Connecting to Multiple Networks

```ini
[Container]
Image=docker.io/myorg/myapp:latest
Network=frontend.network
Network=backend.network
```

## Reload and Verify

```bash
# Reload systemd
systemctl --user daemon-reload

# Start services
systemctl --user start database.service
systemctl --user start api.service

# Verify network connectivity
podman exec api ping -c 2 database

# List networks
podman network ls
```

## Summary

Quadlet network files let you define custom Podman networks declaratively. Use the `Network` directive in container files to connect containers, enabling DNS-based service discovery between containers on the same network. Quadlet supports bridge networks, host networking, and connecting containers to multiple networks.
