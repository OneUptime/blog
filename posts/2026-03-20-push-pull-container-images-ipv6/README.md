# How to Push and Pull Container Images over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Container Image, Registry, Podman, Containerd, DevOps

Description: Push and pull container images over IPv6 using Docker, Podman, and containerd, covering registry authentication, IPv6 address syntax, and common runtime configurations.

---

Pushing and pulling container images over IPv6 requires the host and container runtime to resolve and connect to registry endpoints via IPv6, correct registry reference formatting, and the usual registry trust and authentication setup.

## Optional: Enable Docker IPv6 for Container Networking

This is only needed if you also want Docker bridge networks to assign IPv6 addresses to containers; it is not required just to push or pull images from the host.

`/etc/docker/daemon.json`

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:1::/64"
}
```

```bash
sudo systemctl restart docker
```

## Pulling Images Using IPv6 Registry Address

When using a registry reachable over IPv6:

```bash
# Pull from a registry at an IPv6 address

# Use bracket notation for IPv6 in the registry URL
docker pull [2001:db8::1]:5000/myapp:latest

# Pull from a hostname that resolves to an IPv6 address
docker pull registry.example.com/myapp:latest
# (the host must be able to resolve and reach the registry over IPv6)

# Pull from Docker Hub; the actual address family depends on host connectivity and DNS policy
docker pull nginx:latest

# Watch for IPv6 HTTPS connections during the pull
sudo tcpdump -i any -n 'ip6 and tcp port 443' &
TCPDUMP_PID=$!
docker pull alpine:latest
sudo kill "$TCPDUMP_PID"
```

## Pushing Images to an IPv6 Registry

```bash
# Authenticate first if the registry requires credentials

# Tag image for IPv6 registry
docker tag myapp:latest [2001:db8::1]:5000/myapp:latest

# Push to IPv6-addressed registry
docker push [2001:db8::1]:5000/myapp:latest

# Push to hostname-based registry
docker tag myapp:latest registry.example.com/myapp:latest
docker push registry.example.com/myapp:latest

# Push to Docker Hub
docker tag myapp:latest username/myapp:latest
docker push username/myapp:latest
```

## Running a Local IPv6 Registry

For testing, run a local registry on IPv6:

```bash
# Start a local registry listening on IPv6
docker run -d \
  --name local-registry \
  -p "[::]:5000:5000" \
  -v /data/registry:/var/lib/registry \
  registry:3

# Verify it's listening on IPv6
ss -tlnp | grep :5000
```

`/etc/docker/daemon.json`

```json
{
  "insecure-registries": ["[::1]:5000", "[2001:db8::1]:5000"]
}
```

```bash
# Restart Docker
sudo systemctl restart docker

# Push to the local IPv6 registry
docker tag nginx:latest [::1]:5000/nginx:latest
docker push [::1]:5000/nginx:latest

# Pull from it
docker pull [::1]:5000/nginx:latest
```

## Using Podman with IPv6 Registries

Podman doesn't require a daemon and can use registries reachable over IPv6:

```bash
# Pull image over IPv6 with Podman
podman pull registry.example.com:5000/myapp:latest

# Push a local image to the same registry
podman push myapp:latest docker://registry.example.com:5000/myapp:latest

# Configure insecure registries for Podman
cat > /etc/containers/registries.conf.d/ipv6-registry.conf << 'EOF'
[[registry]]
location = "registry.example.com:5000"
insecure = true
EOF

# Show configured registries
podman info | grep -A3 registries
```

## Using containerd with IPv6 Registries

For containerd (used by Kubernetes):

In containerd 1.x, set `config_path` as shown below; in containerd 2.x, use the same `config_path` under `[plugins."io.containerd.cri.v1.images".registry]`.

`/etc/containerd/config.toml`

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"
```

`/etc/containerd/certs.d/registry.example.com:5000/hosts.toml`

```toml
server = "https://registry.example.com:5000"

[host."https://registry.example.com:5000"]
  capabilities = ["pull", "resolve", "push"]
  skip_verify = true
```

```bash
sudo systemctl restart containerd

# Pull using ctr with the hosts configuration directory
sudo ctr images pull --hosts-dir /etc/containerd/certs.d registry.example.com:5000/myapp:latest
```

## Multi-Platform Image Push over IPv6

```bash
# Create and push multi-platform manifest over IPv6
docker buildx create --name ipv6builder --use

# Build for multiple architectures and push
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/myapp:latest \
  --push \
  .

# Verify the image index
docker buildx imagetools inspect registry.example.com/myapp:latest
```

## Troubleshooting Image Push/Pull over IPv6

```bash
# Error: no such host
# Fix: Add AAAA record or use IP directly
dig AAAA registry.example.com

# Error: x509: certificate
# Fix: Trust the registry CA
sudo mkdir -p /etc/docker/certs.d/registry.example.com:5000
sudo cp registry-ca.crt \
  /etc/docker/certs.d/registry.example.com:5000/ca.crt

# Error: dial tcp: connect: network unreachable
# Fix: Check IPv6 routing
ip -6 route show
ping -6 -c 3 2001:db8::1
```

Container image operations over IPv6 work once the host can reach the registry over IPv6, the registry reference is formatted correctly, and TLS or authentication are configured the same way they would be over IPv4.
