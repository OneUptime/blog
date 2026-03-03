# How to Set Up a Pull-Through Cache (Registry Mirror) in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Registry Mirror, Pull-Through Cache, Docker, Container Image

Description: Learn how to set up a pull-through cache registry mirror for Talos Linux to speed up image pulls and avoid rate limits.

---

If you run a Talos Linux cluster with more than a handful of nodes, you have probably noticed that image pulls can be slow and you might hit Docker Hub rate limits. A pull-through cache is a local registry that acts as a transparent proxy. When a node requests an image, the cache checks if it already has a copy. If it does, it serves it locally. If not, it fetches the image from the upstream registry, caches it, and serves it to the node. Every subsequent pull of the same image is served from the cache.

This guide shows you how to deploy a pull-through cache and configure Talos Linux to use it.

## Why Use a Pull-Through Cache

There are several compelling reasons to use a pull-through cache:

Docker Hub rate limits are a real problem. Anonymous pulls are limited to 100 per 6 hours, and authenticated pulls to 200. A cluster with 20 nodes can easily exhaust these limits during a deployment that rolls out across all nodes.

Pull speed improves dramatically. Pulling from a local cache over a fast network is much faster than pulling from a remote registry over the internet.

Bandwidth savings are significant. Each image is downloaded from the internet only once, regardless of how many nodes need it.

Reliability improves because you are not dependent on external registry availability for every pod start.

## Deploying a Pull-Through Cache with Docker Registry

The simplest pull-through cache is the official Docker registry configured in proxy mode. You can run this on a dedicated machine or as a Kubernetes deployment:

```yaml
# Docker registry pull-through cache deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry-cache
  namespace: registry
spec:
  replicas: 1
  selector:
    matchLabels:
      app: registry-cache
  template:
    metadata:
      labels:
        app: registry-cache
    spec:
      containers:
        - name: registry
          image: registry:2
          ports:
            - containerPort: 5000
          env:
            # Configure as a pull-through cache for Docker Hub
            - name: REGISTRY_PROXY_REMOTEURL
              value: "https://registry-1.docker.io"
            # Set cache storage location
            - name: REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY
              value: "/var/lib/registry"
            # Configure garbage collection
            - name: REGISTRY_STORAGE_DELETE_ENABLED
              value: "true"
          volumeMounts:
            - name: cache-storage
              mountPath: /var/lib/registry
      volumes:
        - name: cache-storage
          persistentVolumeClaim:
            claimName: registry-cache-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: registry-cache
  namespace: registry
spec:
  selector:
    app: registry-cache
  ports:
    - port: 5000
      targetPort: 5000
  type: ClusterIP
```

Create the persistent volume claim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: registry-cache-pvc
  namespace: registry
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

## Running the Cache Outside the Cluster

For a chicken-and-egg situation where the cluster needs the cache to pull images but the cache runs inside the cluster, consider running the cache outside the cluster:

```bash
# Run the pull-through cache on a separate host using Docker
docker run -d \
  --name registry-cache \
  --restart always \
  -p 5000:5000 \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -v /data/registry-cache:/var/lib/registry \
  registry:2
```

This approach ensures the cache is available even before the Kubernetes cluster is fully bootstrapped.

## Configuring Talos to Use the Cache

Once the pull-through cache is running, configure Talos nodes to use it:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - http://registry-cache.registry.svc.cluster.local:5000
          - https://registry-1.docker.io
```

If the cache is running outside the cluster:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - http://10.0.0.100:5000
          - https://registry-1.docker.io
```

The second endpoint is the fallback. If the cache is down, pulls go directly to Docker Hub.

## Setting Up Caches for Multiple Registries

You can set up separate caches for different upstream registries:

```bash
# Cache for Docker Hub
docker run -d --name docker-cache -p 5001:5000 \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -v /data/docker-cache:/var/lib/registry \
  registry:2

# Cache for GitHub Container Registry
docker run -d --name ghcr-cache -p 5002:5000 \
  -e REGISTRY_PROXY_REMOTEURL=https://ghcr.io \
  -v /data/ghcr-cache:/var/lib/registry \
  registry:2

# Cache for Quay.io
docker run -d --name quay-cache -p 5003:5000 \
  -e REGISTRY_PROXY_REMOTEURL=https://quay.io \
  -v /data/quay-cache:/var/lib/registry \
  registry:2
```

Then configure all of them in Talos:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - http://10.0.0.100:5001
          - https://registry-1.docker.io
      ghcr.io:
        endpoints:
          - http://10.0.0.100:5002
          - https://ghcr.io
      quay.io:
        endpoints:
          - http://10.0.0.100:5003
          - https://quay.io
```

## Adding TLS to the Cache

For production, enable TLS on the cache:

```bash
# Generate a self-signed certificate (or use your CA)
openssl req -newkey rsa:4096 -nodes -sha256 \
  -keyout registry.key -x509 -days 365 \
  -out registry.crt \
  -subj "/CN=registry-cache.example.com"

# Run with TLS
docker run -d --name registry-cache -p 5000:5000 \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/registry.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/registry.key \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -v /data/registry-cache:/var/lib/registry \
  -v /path/to/certs:/certs \
  registry:2
```

Configure Talos to trust the certificate:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://registry-cache.example.com:5000
    config:
      registry-cache.example.com:5000:
        tls:
          ca: |
            -----BEGIN CERTIFICATE-----
            ...your CA cert here...
            -----END CERTIFICATE-----
```

## Cache Authentication for Upstream Registries

If you need to authenticate with the upstream registry (for example, Docker Hub with a paid account):

```bash
docker run -d --name registry-cache -p 5000:5000 \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -e REGISTRY_PROXY_USERNAME=your-docker-username \
  -e REGISTRY_PROXY_PASSWORD=your-docker-password \
  -v /data/registry-cache:/var/lib/registry \
  registry:2
```

This way, the cache authenticates with Docker Hub using your paid credentials, and individual nodes do not need their own credentials.

## Monitoring Cache Usage

Monitor your cache to understand its effectiveness:

```bash
# Check cache disk usage
du -sh /data/registry-cache/

# View cache logs
docker logs registry-cache

# Check the catalog of cached images
curl -s http://10.0.0.100:5000/v2/_catalog | python3 -m json.tool
```

## Applying the Configuration

Apply the registry mirror configuration to all nodes:

```bash
# Create a patch file
cat > mirror-patch.yaml <<EOF
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - http://10.0.0.100:5000
          - https://registry-1.docker.io
EOF

# Apply to all nodes
for node in 10.0.0.2 10.0.0.3 10.0.0.4 10.0.0.5 10.0.0.6; do
  talosctl patch machineconfig --nodes $node --patch @mirror-patch.yaml
done
```

## Conclusion

A pull-through cache is one of the most practical improvements you can make to a Talos Linux cluster. It reduces external dependencies, speeds up deployments, and helps you avoid rate limits. Deploy the cache outside the cluster for maximum reliability, configure TLS for security, and set up caches for all the registries your cluster uses. The small investment in setup time pays for itself quickly in faster, more reliable deployments.
