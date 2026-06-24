# How to Configure Docker Container IPv4 Networking in Rootless Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Rootless, Security, Container

Description: Configure IPv4 networking for Docker containers running in rootless mode using slirp4netns or pasta, understand port binding limitations, and expose services without root privileges.

## Introduction

Docker rootless mode runs the Docker daemon as a non-root user, improving security by preventing container escapes from escalating to root. Networking in rootless mode typically uses a userspace network stack (`slirp4netns`), and Docker Engine 25.0+ can also be configured to use the experimental `pasta` driver through RootlessKit.

## Installing Docker Rootless

```bash
# Install rootless setup script dependencies

sudo apt install -y uidmap dbus-user-session

# Run the rootless install script
curl -fsSL https://get.docker.com/rootless | sh

# Add the user-local Docker binaries to PATH
export PATH=$HOME/bin:$PATH

# Start the rootless daemon
systemctl --user start docker
systemctl --user enable docker

# Some clients may need the rootless socket explicitly
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
```

## Network Behavior in Rootless Mode

Rootless Docker usually uses `slirp4netns` for outbound networking; if `slirp4netns` is unavailable it falls back to VPNKit. Docker Engine 25.0+ can also be configured to use the experimental `pasta` RootlessKit driver:
- Containers still use Docker-managed bridge networks and private IPv4 addresses
- Those bridge interfaces live inside the rootless daemon's network namespace, not in the host namespace
- `docker0` is therefore not visible on the host in `ip link show`
- Container IPs shown by `docker inspect` are not directly reachable from the host
- Containers can still reach the internet through userspace NAT

```bash
# Confirm the client is using the rootless daemon
docker info | grep -i rootless

# Containers still get private IPv4 addresses on Docker-managed networks
docker run -d --name netdemo alpine sleep 60
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' netdemo
docker rm -f netdemo
```

## Exposing Ports in Rootless Mode

Non-root users cannot publish host ports below 1024 by default. Publishing host ports 80 and 443 requires either:
- Kernel capability: `CAP_NET_BIND_SERVICE` on `rootlesskit`
- `sysctl net.ipv4.ip_unprivileged_port_start=0` (allows all users to bind to any port)
- Binding to ports ≥ 1024 and using a reverse proxy

```bash
# Allow rootless Docker to publish privileged host ports
echo "net.ipv4.ip_unprivileged_port_start=0" | sudo tee -a /etc/sysctl.d/99-rootless.conf
sudo sysctl --system

# Now rootless Docker can publish host port 80
docker run -d -p 80:80 nginx:alpine
```

## Using pasta Instead of slirp4netns

`pasta` (Pack A Subtle Tap Abstraction) is an experimental alternative to `slirp4netns` on Docker Engine 25.0+:

```bash
# Install pasta (provided by the passt package on Debian/Ubuntu)
sudo apt install passt

# Configure Docker rootless to use pasta with the implicit port driver
mkdir -p ~/.config/systemd/user/docker.service.d
tee ~/.config/systemd/user/docker.service.d/override.conf << 'EOF'
[Service]
Environment="DOCKERD_ROOTLESS_ROOTLESSKIT_NET=pasta"
Environment="DOCKERD_ROOTLESS_ROOTLESSKIT_PORT_DRIVER=implicit"
EOF

systemctl --user daemon-reload
systemctl --user restart docker
```

## Custom Network Configuration in Rootless Mode

```bash
# Create a custom bridge network for container-to-container communication
docker network create --subnet 192.168.200.0/24 mynet

# Run containers on the custom network
docker run -d --network mynet --name web nginx:alpine
docker run -d --network mynet --name db postgres:15-alpine
```

The custom subnet exists inside the rootless daemon's network namespace, so publish ports with `-p` when you need host access.

## Limitations of Rootless Networking

| Feature | Rootful | Rootless |
|---|---|---|
| Ports < 1024 | Yes (default) | Requires sysctl tuning or `CAP_NET_BIND_SERVICE` |
| macvlan networks | Yes | No (requires root) |
| ipvlan networks | Yes | No |
| Host network mode | Yes | Not equivalent to rootful host mode |
| Custom bridge networks | Yes | Yes (inside rootless daemon namespace) |

## Conclusion

Docker rootless mode supports user-defined bridge networking and container-to-container communication, while host connectivity and published ports are handled through RootlessKit userspace networking. Enable low-port publishing with `net.ipv4.ip_unprivileged_port_start=0` or `CAP_NET_BIND_SERVICE` on `rootlesskit` for web services. macvlan and ipvlan networks are not available in rootless mode.
