# How to Configure Docker Hub Access over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Container Registry, Docker Hub, Networking, DevOps

Description: Configure Docker to pull and push images from Docker Hub over IPv6, including Docker daemon IPv6 settings, DNS configuration, and troubleshooting connectivity issues.

---

Docker Hub supports IPv6 access. In dual-stack environments, the Docker daemon can reach Docker Hub over IPv6 when the host has working IPv6 connectivity and DNS resolution. If you also want Docker's default bridge network and containers to use IPv6, configure Docker's IPv6 networking separately.

## Enabling IPv6 in Docker Daemon

On Linux, if you want the default bridge network and containers to have IPv6 addresses, Docker's IPv6 support must be explicitly enabled:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/64",
  "ip6tables": true,
  "experimental": false
}
```

```bash
# Restart Docker daemon
sudo systemctl restart docker

# Verify IPv6 is enabled on the default bridge
docker network inspect bridge --format '{{.EnableIPv6}}'
docker run --rm alpine ip -6 addr show dev eth0
```

## Verifying Docker Hub IPv6 Connectivity

```bash
# Check if Docker Hub registry endpoints resolve to IPv6
dig AAAA registry-1.docker.io +short
dig AAAA auth.docker.io +short

# Test IPv6 reachability to Docker Hub from the host
curl -6 -I -sS https://registry-1.docker.io/v2/
```

## Pulling Images from Docker Hub over IPv6

Once the host has working IPv6 connectivity:

```bash
# Pull an image - Docker uses the host network stack for registry access
docker pull nginx:latest

# Pull another image to test registry access again
docker pull alpine:3.18
```

## Creating an IPv6-Enabled Docker Network

For containers that also need IPv6 access:

```bash
# Create a Docker network with IPv6 support
docker network create \
  --ipv6 \
  --subnet "fd00:10::/64" \
  --gateway "fd00:10::1" \
  myipv6net

# Verify the network
docker network inspect myipv6net --format '{{.EnableIPv6}}'

# Run a container on the IPv6 network and test Docker Hub registry reachability
docker run --rm --network myipv6net \
  curlimages/curl -6 -I -sS https://registry-1.docker.io/v2/
```

## Configuring Docker Behind an IPv6 Proxy

If accessing Docker Hub through an IPv6 proxy:

```bash
# Configure Docker to use the proxy
sudo mkdir -p /etc/systemd/system/docker.service.d

cat > /etc/systemd/system/docker.service.d/proxy.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://[2001:db8::10]:3128"
Environment="HTTPS_PROXY=http://[2001:db8::10]:3128"
Environment="NO_PROXY=localhost,127.0.0.1,::1"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

## Docker Compose with IPv6 Networks

```yaml
# docker-compose.yml with IPv6 support
networks:
  app_net:
    enable_ipv6: true
    ipam:
      driver: default
      config:
        - subnet: "2001:db8:100::/64"
        - subnet: "172.20.0.0/16"

services:
  webapp:
    image: nginx:latest
    networks:
      app_net:
        ipv6_address: "2001:db8:100::2"
    ports:
      - "80:80"
```

## Troubleshooting Docker Hub IPv6 Access

```bash
# Check if the host can reach Docker Hub over IPv6
curl -6 -I -sS https://registry-1.docker.io/v2/

# Test DNS resolution from within Docker
docker run --rm alpine nslookup -type=AAAA registry-1.docker.io

# Check Docker network firewall rules for IPv6
sudo ip6tables -L FORWARD -n | grep "docker\|fd00"

# Check whether IPv6 forwarding is enabled
sysctl net.ipv6.conf.all.forwarding
```

With working host IPv6 connectivity and DNS resolution, Docker can reach Docker Hub over IPv6. If you also enable Docker's IPv6 networking on Linux, containers and user-defined networks can use IPv6 as well.
