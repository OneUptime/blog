# How to Configure Docker Hub Mirror in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Docker Hub, Registry Mirror, Container Images, Rate Limiting

Description: Learn how to configure a Docker Hub mirror in Talos Linux to avoid rate limits, speed up pulls, and improve cluster reliability.

---

Docker Hub is the default registry for most container images. When you write `nginx:latest` in a Kubernetes manifest, it pulls from Docker Hub. The problem is that Docker Hub has strict rate limits: 100 pulls per 6 hours for anonymous users and 200 for authenticated users. In a Talos Linux cluster with multiple nodes, these limits get exhausted quickly during deployments, upgrades, or when nodes restart and re-pull images.

Setting up a Docker Hub mirror solves this problem. This guide covers multiple approaches to mirroring Docker Hub for your Talos Linux cluster.

## Understanding Docker Hub Rate Limits

Before setting up a mirror, it helps to understand how rate limits work. Docker Hub tracks pulls by IP address for anonymous users and by account for authenticated users. Each image layer pull counts as one request. A single `docker pull nginx` might count as 5-10 pulls depending on how many layers the image has.

In a Kubernetes cluster, the situation is worse because:
- Every node independently pulls images
- Scaling a deployment causes pulls on every new node
- Node restarts can trigger re-pulls if images were garbage collected
- DaemonSets pull on every node simultaneously

A 20-node cluster deploying a new image can easily consume 100+ pulls in seconds.

## Option 1: Simple Pull-Through Cache

The quickest solution is a Docker registry in proxy mode:

```bash
# Run on a dedicated host outside the cluster
docker run -d \
  --name docker-mirror \
  --restart always \
  -p 5000:5000 \
  -v /data/docker-mirror:/var/lib/registry \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  registry:2
```

Configure Talos to use it:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - http://10.0.0.100:5000
          - https://registry-1.docker.io
```

This cache transparently proxies requests to Docker Hub and caches the responses. Subsequent pulls come from the local cache.

## Option 2: Authenticated Mirror

If you have a Docker Hub subscription with higher rate limits, configure the mirror to authenticate:

```bash
# Run the mirror with Docker Hub authentication
docker run -d \
  --name docker-mirror \
  --restart always \
  -p 5000:5000 \
  -v /data/docker-mirror:/var/lib/registry \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -e REGISTRY_PROXY_USERNAME=your-dockerhub-username \
  -e REGISTRY_PROXY_PASSWORD=your-dockerhub-token \
  registry:2
```

The mirror authenticates with Docker Hub using your account, getting the higher rate limits. Individual nodes do not need Docker Hub credentials because they only talk to the mirror.

## Option 3: Cloud Provider Mirror

Many cloud providers offer Docker Hub mirrors:

For AWS, you can use ECR pull-through cache:

```bash
# Create an ECR pull-through cache rule for Docker Hub
aws ecr create-pull-through-cache-rule \
  --ecr-repository-prefix docker-hub \
  --upstream-registry-url registry-1.docker.io
```

Then configure Talos:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://123456789012.dkr.ecr.us-east-1.amazonaws.com/docker-hub
          - https://registry-1.docker.io
    config:
      123456789012.dkr.ecr.us-east-1.amazonaws.com:
        auth:
          username: AWS
          password: "<ecr-token>"
```

## Configuring the Mirror in Talos

Regardless of which mirror approach you use, the Talos configuration follows the same pattern:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          # Primary: your local mirror
          - https://docker-mirror.internal.example.com:5000
          # Fallback: original Docker Hub
          - https://registry-1.docker.io
```

Apply this to all nodes in your cluster:

```bash
# Create a patch file
cat > docker-mirror-patch.yaml <<EOF
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://docker-mirror.internal.example.com:5000
          - https://registry-1.docker.io
EOF

# Apply to all worker nodes
for node in 10.0.0.5 10.0.0.6 10.0.0.7 10.0.0.8; do
  talosctl patch machineconfig --nodes $node --patch @docker-mirror-patch.yaml
done

# Apply to control plane nodes too
for node in 10.0.0.2 10.0.0.3 10.0.0.4; do
  talosctl patch machineconfig --nodes $node --patch @docker-mirror-patch.yaml
done
```

## Adding TLS to the Mirror

For production, always use TLS:

```bash
# Generate certificates (use your CA in production)
mkdir -p /data/certs
openssl req -newkey rsa:4096 -nodes -sha256 \
  -keyout /data/certs/mirror.key \
  -x509 -days 365 \
  -out /data/certs/mirror.crt \
  -subj "/CN=docker-mirror.internal.example.com" \
  -addext "subjectAltName=DNS:docker-mirror.internal.example.com,IP:10.0.0.100"

# Run with TLS
docker run -d \
  --name docker-mirror \
  --restart always \
  -p 5000:5000 \
  -v /data/docker-mirror:/var/lib/registry \
  -v /data/certs:/certs \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/mirror.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/mirror.key \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  registry:2
```

Configure Talos to trust the certificate:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://docker-mirror.internal.example.com:5000
          - https://registry-1.docker.io
    config:
      docker-mirror.internal.example.com:5000:
        tls:
          ca: |
            -----BEGIN CERTIFICATE-----
            ...your mirror CA cert...
            -----END CERTIFICATE-----
```

## Storage Configuration for the Mirror

Size your mirror storage based on how many unique images your cluster uses:

```bash
# Check current mirror storage usage
du -sh /data/docker-mirror/

# Configure storage with garbage collection
docker run -d \
  --name docker-mirror \
  --restart always \
  -p 5000:5000 \
  -v /data/docker-mirror:/var/lib/registry \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -e REGISTRY_STORAGE_DELETE_ENABLED=true \
  registry:2
```

Set up periodic garbage collection:

```bash
# Run garbage collection (stop the mirror first for read-only GC)
docker exec docker-mirror /bin/registry garbage-collect \
  /etc/docker/registry/config.yml
```

## Monitoring and Verification

Verify the mirror is working:

```bash
# Check the mirror is serving requests
curl -s https://docker-mirror.internal.example.com:5000/v2/_catalog

# Deploy a test pod to verify end-to-end
kubectl run test-mirror --image=nginx:alpine --restart=Never
kubectl describe pod test-mirror | grep "Successfully pulled"

# Check node logs for mirror usage
talosctl logs containerd --nodes 10.0.0.5 | grep "docker-mirror"

# Clean up
kubectl delete pod test-mirror
```

## High Availability Mirror Setup

For production, run multiple mirror instances behind a load balancer:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          # Load-balanced mirror endpoint
          - https://docker-mirror-lb.internal.example.com:5000
          # Direct mirror instances as fallback
          - https://docker-mirror-1.internal.example.com:5000
          - https://docker-mirror-2.internal.example.com:5000
          # Original Docker Hub as last resort
          - https://registry-1.docker.io
```

## Conclusion

Configuring a Docker Hub mirror for your Talos Linux cluster is one of the simplest improvements you can make to avoid rate limit issues and speed up deployments. Start with a basic pull-through cache, add authentication if you have a Docker Hub subscription, and add TLS for security. The Talos configuration is straightforward and can be applied to all nodes with a simple patch command. Once in place, you will never worry about Docker Hub rate limits again.
