# How to Use Podman for Home Lab Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Home Lab, Self-Hosting, Container, Homelab

Description: Learn how to build a home lab using Podman to run services like DNS, VPN, dashboards, and monitoring tools in rootless containers on a single machine.

---

> Podman is ideal for home labs because it runs without a daemon, supports rootless containers, and integrates with systemd to start services automatically on boot.

A home lab is a personal environment for running self-hosted services, learning new technologies, and having full control over your infrastructure. Podman is an excellent choice for home labs because it requires no background daemon, runs containers as your regular user, and uses fewer resources than alternatives that need a persistent service.

This guide walks through setting up a complete home lab with Podman, covering essential services like DNS ad-blocking, reverse proxying, monitoring, and dashboards.

---

## Planning Your Home Lab

A typical home lab includes several categories of services:

- Network services: DNS, VPN, reverse proxy
- Monitoring: uptime checks, resource monitoring
- Media: streaming, photo management
- Productivity: note-taking, bookmarks, password management
- Infrastructure: container registry, backup services

Podman can run many of these in rootless containers, but services that need privileged ports or extra kernel networking capabilities may still require additional host configuration or rootful containers.

## Setting Up the Foundation

Start by creating a dedicated network for your home lab services:

```bash
podman network create homelab
```

If you want rootless containers to bind directly to DNS and HTTP/S on ports `53`, `80`, and `443`, lower the unprivileged port floor on the host first:

```bash
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=53
```

Make this change persistent in `/etc/sysctl.d/` if you want these services to keep working after a reboot.

Set your default container configuration for consistent behavior:

```bash
mkdir -p ~/.config/containers
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
log_driver = "journald"
log_size_max = 52428800

[engine]
runtime = "crun"
EOF
```

## Pi-hole for DNS Ad-Blocking

Pi-hole blocks ads and trackers at the DNS level for your entire network:

```bash
podman run -d \
  --name pihole \
  --network homelab \
  -p 53:53/tcp -p 53:53/udp \
  -p 8053:80 \
  -e TZ=America/New_York \
  -e WEBPASSWORD=adminpass \
  -v pihole-data:/etc/pihole:Z \
  docker.io/pihole/pihole:latest
```

Access the Pi-hole dashboard at `http://localhost:8053/admin`. Point your router's DNS settings to your home lab's IP address to filter ads for all devices on your network.

## Reverse Proxy with Traefik

Traefik routes traffic to your services based on configuration files:

```bash
mkdir -p ~/homelab/traefik/dynamic

cat > ~/homelab/traefik/traefik.yml << 'EOF'
api:
  dashboard: true
  insecure: true

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true
EOF

cat > ~/homelab/traefik/dynamic/services.yml << 'EOF'
http:
  routers:
    pihole:
      rule: "Host(`pihole.home.lab`)"
      service: pihole
      entryPoints:
        - web
    grafana:
      rule: "Host(`grafana.home.lab`)"
      service: grafana
      entryPoints:
        - web
  services:
    pihole:
      loadBalancer:
        servers:
          - url: "http://pihole:80"
    grafana:
      loadBalancer:
        servers:
          - url: "http://grafana:3000"
EOF

podman run -d \
  --name traefik \
  --network homelab \
  -p 80:80 -p 443:443 -p 8081:8080 \
  -v ~/homelab/traefik/traefik.yml:/etc/traefik/traefik.yml:ro,Z \
  -v ~/homelab/traefik/dynamic:/etc/traefik/dynamic:ro,Z \
  docker.io/library/traefik:v3.0
```

## Homepage Dashboard

Set up a dashboard to see all your services at a glance:

```bash
mkdir -p ~/homelab/homepage

cat > ~/homelab/homepage/services.yaml << 'EOF'
- Network:
    - Pi-hole:
        href: http://pihole.home.lab
        description: DNS ad blocking
        icon: pi-hole
    - Traefik:
        href: http://localhost:8081/dashboard/
        description: Reverse proxy
        icon: traefik
- Monitoring:
    - Grafana:
        href: http://grafana.home.lab
        description: Metrics and dashboards
        icon: grafana
    - Uptime Kuma:
        href: http://localhost:3001
        description: Uptime monitoring
        icon: uptime-kuma
EOF

podman run -d \
  --name homepage \
  --network homelab \
  -p 3000:3000 \
  -e HOMEPAGE_ALLOWED_HOSTS=localhost:3000 \
  -v ~/homelab/homepage:/app/config:Z \
  ghcr.io/gethomepage/homepage:latest
```

## Uptime Monitoring with Uptime Kuma

Monitor the availability of all your home lab services:

```bash
podman run -d \
  --name uptime-kuma \
  --network homelab \
  -p 3001:3001 \
  -v uptime-kuma-data:/app/data:Z \
  docker.io/louislam/uptime-kuma:2
```

Access at `http://localhost:3001` and add monitors for each of your services.

## System Monitoring with Grafana and Prometheus

```bash
# Prometheus

mkdir -p ~/homelab/prometheus

cat > ~/homelab/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

podman run -d \
  --name prometheus \
  --network homelab \
  -p 9090:9090 \
  -v ~/homelab/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro,Z \
  -v prometheus-data:/prometheus:Z \
  docker.io/prom/prometheus:latest

# Node Exporter for host metrics
podman run -d \
  --name node-exporter \
  --network homelab \
  -p 9100:9100 \
  --pid=host \
  -v /:/host:ro,rslave \
  quay.io/prometheus/node-exporter:latest \
  --path.rootfs=/host

# Grafana
podman run -d \
  --name grafana \
  --network homelab \
  -p 3002:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  -v grafana-data:/var/lib/grafana:Z \
  docker.io/grafana/grafana:latest
```

## WireGuard VPN

Access your home lab remotely through a WireGuard VPN container. This service needs extra networking privileges, so run it rootful. If your host does not already have the required kernel modules loaded, load them first on the host or mount `/lib/modules` and keep `SYS_MODULE` enabled:

```bash
sudo podman run -d \
  --name wireguard \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  -p 51820:51820/udp \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=America/New_York \
  -e SERVERURL=your.domain.com \
  -e PEERS=phone,laptop,tablet \
  -v /lib/modules:/lib/modules:ro \
  -v wireguard-config:/config:Z \
  --sysctl=net.ipv4.conf.all.src_valid_mark=1 \
  lscr.io/linuxserver/wireguard:latest
```

## Password Manager with Vaultwarden

Self-host a Bitwarden-compatible password manager:

```bash
podman run -d \
  --name vaultwarden \
  --network homelab \
  -p 8082:80 \
  -e SIGNUPS_ALLOWED=false \
  -v vaultwarden-data:/data:Z \
  docker.io/vaultwarden/server:latest
```

## Managing All Services with Quadlet

Create Quadlet files for the services you want to start automatically:

```bash
mkdir -p ~/.config/containers/systemd
```

```ini
# ~/.config/containers/systemd/pihole.container
[Container]
Image=docker.io/pihole/pihole:latest
Network=homelab.network
PublishPort=53:53/tcp
PublishPort=53:53/udp
PublishPort=8053:80
Environment=TZ=America/New_York
Environment=WEBPASSWORD=adminpass
Volume=pihole-data:/etc/pihole:Z

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/homelab.network
[Network]
NetworkName=homelab
Driver=bridge
```

Repeat the same pattern for any other service you want Quadlet to manage, then reload systemd and start the units you created:

```bash
sudo loginctl enable-linger "$USER"
systemctl --user daemon-reload
systemctl --user start pihole
```

## Conclusion

Podman is a natural fit for home labs because it eliminates the overhead of a container daemon while providing all the isolation and management features you need. With rootless containers, systemd integration, and pod support, you can run dozens of services on a single machine with minimal resource overhead. Start with the essentials like DNS filtering and monitoring, and expand your lab as your needs grow.
