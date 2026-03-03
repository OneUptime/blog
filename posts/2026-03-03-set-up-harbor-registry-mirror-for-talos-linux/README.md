# How to Set Up Harbor Registry Mirror for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Harbor, Registry Mirror, Container Images, DevOps

Description: A complete walkthrough for deploying Harbor as a registry mirror and configuring Talos Linux nodes to use it for image caching.

---

Harbor is an open-source container registry that provides features like image scanning, replication, and access control. When used as a registry mirror for a Talos Linux cluster, Harbor gives you a powerful caching layer with enterprise features that the basic Docker registry does not offer. You get vulnerability scanning on cached images, detailed audit logs, and fine-grained access control.

This guide walks through deploying Harbor and configuring Talos Linux to use it as a pull-through cache for upstream registries.

## Why Harbor Over a Simple Registry Cache

A basic Docker registry in proxy mode works fine for simple caching. But Harbor adds several features that matter in production:

Vulnerability scanning lets you know if cached images have known security issues before they run in your cluster. Image signing and content trust verify that images have not been tampered with. Replication policies let you synchronize images between multiple Harbor instances across regions. And the web UI gives your team visibility into what images are being used and their security status.

## Deploying Harbor

The recommended way to deploy Harbor is using its official Helm chart. You can run Harbor either inside or outside your Talos cluster:

```bash
# Add the Harbor Helm repository
helm repo add harbor https://helm.goharbor.io
helm repo update

# Create namespace
kubectl create namespace harbor

# Install Harbor with proxy cache support
helm install harbor harbor/harbor \
  --namespace harbor \
  --set expose.type=nodePort \
  --set expose.tls.auto.commonName=harbor.example.com \
  --set externalURL=https://harbor.example.com \
  --set persistence.persistentVolumeClaim.registry.size=200Gi \
  --set persistence.persistentVolumeClaim.database.size=10Gi \
  --set persistence.persistentVolumeClaim.redis.size=5Gi \
  --set trivy.enabled=true
```

For a production setup, use an ingress with proper TLS:

```yaml
# values.yaml for Harbor Helm chart
expose:
  type: ingress
  ingress:
    hosts:
      core: harbor.example.com
    className: nginx
  tls:
    certSource: secret
    secret:
      secretName: harbor-tls

externalURL: https://harbor.example.com

persistence:
  persistentVolumeClaim:
    registry:
      size: 500Gi
    database:
      size: 20Gi

# Enable vulnerability scanning
trivy:
  enabled: true

# Configure proxy cache
proxy:
  httpProxy: ""
  httpsProxy: ""
  noProxy: "127.0.0.1,localhost,.local,.internal"
```

```bash
helm install harbor harbor/harbor -n harbor -f values.yaml
```

## Configuring Harbor as a Proxy Cache

After Harbor is running, you need to create a proxy cache project through the Harbor UI or API.

Using the Harbor API:

```bash
# Create a Docker Hub proxy cache registry endpoint
curl -X POST "https://harbor.example.com/api/v2.0/registries" \
  -H "Content-Type: application/json" \
  -u "admin:Harbor12345" \
  -d '{
    "name": "dockerhub-proxy",
    "type": "docker-hub",
    "url": "https://hub.docker.com",
    "credential": {
      "type": "basic",
      "access_key": "your-dockerhub-username",
      "access_secret": "your-dockerhub-password"
    }
  }'

# Create a proxy cache project
curl -X POST "https://harbor.example.com/api/v2.0/projects" \
  -H "Content-Type: application/json" \
  -u "admin:Harbor12345" \
  -d '{
    "project_name": "dockerhub-cache",
    "registry_id": 1,
    "public": true,
    "metadata": {
      "public": "true"
    }
  }'
```

You can create similar proxy cache projects for other registries:

```bash
# Create a ghcr.io proxy cache
curl -X POST "https://harbor.example.com/api/v2.0/registries" \
  -H "Content-Type: application/json" \
  -u "admin:Harbor12345" \
  -d '{
    "name": "ghcr-proxy",
    "type": "github",
    "url": "https://ghcr.io"
  }'

curl -X POST "https://harbor.example.com/api/v2.0/projects" \
  -H "Content-Type: application/json" \
  -u "admin:Harbor12345" \
  -d '{
    "project_name": "ghcr-cache",
    "registry_id": 2,
    "public": true
  }'
```

## Configuring Talos to Use Harbor

Now configure your Talos nodes to use Harbor as a registry mirror:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://harbor.example.com/v2/dockerhub-cache
          - https://registry-1.docker.io
      ghcr.io:
        endpoints:
          - https://harbor.example.com/v2/ghcr-cache
          - https://ghcr.io
    config:
      harbor.example.com:
        auth:
          username: talos-puller
          password: "pull-only-password"
        tls:
          # If using a self-signed cert or internal CA
          ca: |
            -----BEGIN CERTIFICATE-----
            ...your Harbor CA certificate...
            -----END CERTIFICATE-----
```

## Creating a Dedicated Pull Account

For security, create a dedicated Harbor user for Talos nodes with read-only access:

```bash
# Create a robot account via the API
curl -X POST "https://harbor.example.com/api/v2.0/robots" \
  -H "Content-Type: application/json" \
  -u "admin:Harbor12345" \
  -d '{
    "name": "talos-puller",
    "duration": -1,
    "level": "system",
    "permissions": [
      {
        "kind": "project",
        "namespace": "dockerhub-cache",
        "access": [
          {"resource": "repository", "action": "pull"}
        ]
      },
      {
        "kind": "project",
        "namespace": "ghcr-cache",
        "access": [
          {"resource": "repository", "action": "pull"}
        ]
      }
    ]
  }'
```

Use the generated robot account credentials in your Talos configuration.

## Applying the Configuration

Apply the Harbor mirror configuration to all cluster nodes:

```bash
# Create the patch
cat > harbor-mirror-patch.yaml <<EOF
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://harbor.example.com/v2/dockerhub-cache
          - https://registry-1.docker.io
    config:
      harbor.example.com:
        auth:
          username: "robot\$talos-puller"
          password: "robot-account-secret"
EOF

# Apply to each node
talosctl patch machineconfig --nodes 10.0.0.2 --patch @harbor-mirror-patch.yaml
talosctl patch machineconfig --nodes 10.0.0.3 --patch @harbor-mirror-patch.yaml
talosctl patch machineconfig --nodes 10.0.0.4 --patch @harbor-mirror-patch.yaml
```

## Verifying the Setup

Test that images are being pulled through Harbor:

```bash
# Deploy a test pod
kubectl run nginx-test --image=nginx:latest --restart=Never

# Check if the pod started successfully
kubectl get pod nginx-test

# Check Harbor UI or API for the cached image
curl -s "https://harbor.example.com/api/v2.0/projects/dockerhub-cache/repositories" \
  -u "admin:Harbor12345" | python3 -m json.tool
```

You should see the nginx repository appear in the dockerhub-cache project.

## Monitoring Harbor

Keep an eye on Harbor's health and cache usage:

```bash
# Check Harbor health
curl -s "https://harbor.example.com/api/v2.0/health" | python3 -m json.tool

# Check storage usage
curl -s "https://harbor.example.com/api/v2.0/statistics" \
  -u "admin:Harbor12345" | python3 -m json.tool

# View recent pull activity in logs
kubectl logs -n harbor -l app=harbor -c registry --tail=50
```

## Garbage Collection

Configure Harbor to clean up old cached images:

```bash
# Trigger garbage collection via API
curl -X POST "https://harbor.example.com/api/v2.0/system/gc/schedule" \
  -H "Content-Type: application/json" \
  -u "admin:Harbor12345" \
  -d '{
    "schedule": {
      "type": "Weekly",
      "cron": "0 0 0 * * 0"
    },
    "parameters": {
      "delete_untagged": true
    }
  }'
```

## Conclusion

Harbor as a registry mirror for Talos Linux gives you caching with enterprise features. The setup involves deploying Harbor, creating proxy cache projects for your upstream registries, and configuring Talos nodes to point at Harbor. The added benefits of vulnerability scanning, access control, and audit logging make Harbor a strong choice for production clusters. Start with Docker Hub as your first proxy cache, verify it works, then add additional upstream registries as needed.
