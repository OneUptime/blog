# How to Configure OCI Registries over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OCI, Container Registry, Docker, Harbor, Distribution, Kubernetes

Description: Configure OCI-compliant container registries to serve images over IPv6, including Docker Distribution, Harbor, and Quay, with client configuration for Docker, containerd, and Kubernetes nodes.

## Introduction

OCI (Open Container Initiative) registries store and serve container images and Helm charts. Configuring registries for IPv6 requires binding the registry to IPv6 interfaces and ensuring clients use IPv6-formatted URLs. This affects Docker daemon configuration, Kubernetes node containerd settings, and GitOps tools that pull images from private registries.

## Docker Distribution (registry:2) over IPv6

```bash
# Start the Docker Distribution registry on IPv6

docker run -d \
    -p "[::]:5000:5000" \
    --name registry \
    -v /var/lib/registry:/var/lib/registry \
    registry:2

# Or with configuration file
cat > /etc/docker/registry/config.yml << 'EOF'
version: 0.1
log:
  level: info
storage:
  filesystem:
    rootdirectory: /var/lib/registry
http:
  addr: "[::]:5000"   # Listen on all IPv6 interfaces
  headers:
    X-Content-Type-Options: [nosniff]
EOF

docker run -d \
    -p "[::]:5000:5000" \
    --name registry \
    -v /etc/docker/registry/config.yml:/etc/docker/registry/config.yml \
    -v /var/lib/registry:/var/lib/registry \
    registry:2
```

## Push and Pull Images over IPv6

```bash
# Tag image for IPv6 registry
docker tag myapp:latest [2001:db8::1]:5000/myapp:latest

# Push to IPv6 registry
docker push [2001:db8::1]:5000/myapp:latest

# Pull from IPv6 registry
docker pull [2001:db8::1]:5000/myapp:latest

# For insecure (HTTP) IPv6 registry: add to Docker daemon config
# /etc/docker/daemon.json
{
    "insecure-registries": ["[2001:db8::1]:5000"]
}
# Restart Docker
systemctl restart docker
```

## TLS Certificate for IPv6 Registry

```bash
# Generate TLS cert with IPv6 SAN
openssl req -newkey rsa:2048 -nodes \
    -keyout /etc/docker/registry/tls.key \
    -out /etc/docker/registry/tls.crt \
    -x509 -days 365 \
    -subj "/CN=registry" \
    -addext "subjectAltName=IP:2001:db8::1,DNS:registry.example.com"

# Configure registry with TLS
cat > /etc/docker/registry/config.yml << 'EOF'
version: 0.1
http:
  addr: "[::]:5000"
  tls:
    certificate: /etc/docker/registry/tls.crt
    key: /etc/docker/registry/tls.key
storage:
  filesystem:
    rootdirectory: /var/lib/registry
EOF
```

## Harbor Registry with IPv6

```yaml
# harbor.yml - Harbor configuration for IPv6

hostname: registry.example.com
# Ensure DNS resolves to AAAA record for hostname

# Or use IPv6 literal:
# hostname: [2001:db8::1]   (NOTE: Harbor may not support IPv6 literals in hostname)

# HTTP settings
http:
  port: 80

https:
  port: 443
  certificate: /etc/harbor/tls.crt
  private_key: /etc/harbor/tls.key

# Harbor binds to all interfaces by default
# Ensure the Docker/docker-compose network has IPv6 enabled
```

```yaml
# docker-compose.yml - add IPv6 to Harbor networks
networks:
  harbor:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: "fd00:1::/64"
```

## containerd Configuration for IPv6 Registry

```toml
# /etc/containerd/config.toml

[plugins."io.containerd.grpc.v1.cri".registry]
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
    # Mirror requests to IPv6 registry
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
      endpoint = ["https://[2001:db8::1]:5000"]

  [plugins."io.containerd.grpc.v1.cri".registry.configs]
    # Auth for IPv6 registry
    [plugins."io.containerd.grpc.v1.cri".registry.configs."[2001:db8::1]:5000".auth]
      username = "admin"
      password = "password"
    # TLS config for IPv6 registry
    [plugins."io.containerd.grpc.v1.cri".registry.configs."[2001:db8::1]:5000".tls]
      ca_file = "/etc/containerd/certs.d/registry/ca.crt"
      insecure_skip_verify = false
```

## Kubernetes: Image Pull Secret for IPv6 Registry

```bash
# Create imagePullSecret for IPv6 registry
kubectl create secret docker-registry ipv6-registry \
    --docker-server="[2001:db8::1]:5000" \
    --docker-username="user" \
    --docker-password="password" \
    --docker-email="admin@example.com" \
    -n production

# Use in pod spec
kubectl patch serviceaccount default -n production \
    -p '{"imagePullSecrets": [{"name": "ipv6-registry"}]}'
```

```yaml
# pod-from-ipv6-registry.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: "[2001:db8::1]:5000/myapp:latest"
  imagePullSecrets:
    - name: ipv6-registry
```

## Skopeo: Copy Images Between IPv6 Registries

```bash
# Copy image from IPv6 source to IPv6 destination
skopeo copy \
    "docker://[2001:db8::1]:5000/myapp:latest" \
    "docker://[2001:db8::2]:5000/myapp:latest" \
    --src-tls-verify=false \
    --dest-tls-verify=false

# Copy from public to private IPv6 registry
skopeo copy \
    "docker://docker.io/library/nginx:latest" \
    "docker://[2001:db8::1]:5000/nginx:latest"
```

## Verify IPv6 Registry Operation

```bash
# Check registry API (catalog)
curl -6 "http://[2001:db8::1]:5000/v2/_catalog"
# Expected: {"repositories":["myapp"]}

# List image tags
curl -6 "http://[2001:db8::1]:5000/v2/myapp/tags/list"
# Expected: {"name":"myapp","tags":["latest","1.0.0"]}

# Check registry is listening on IPv6
ss -tlnp | grep 5000
# Should show [::]:5000
```

## Conclusion

OCI registries serve container images over IPv6 by binding to `[::]:port` in their configuration. Docker Distribution uses `addr: "[::]:5000"` in `config.yml`. Harbor listens on all interfaces by default - ensure the Docker network has IPv6 enabled. Clients use bracket notation for IPv6 registry addresses in Docker daemon `insecure-registries`, containerd's `config.toml` registry configuration, and Kubernetes imagePullSecrets. TLS certificates must include the IPv6 address as a SAN IP entry. Kubernetes nodes with containerd or CRI-O pull from IPv6 registries when the node's network stack has IPv6 connectivity and the registry address is configured in the CRI's registry config.
