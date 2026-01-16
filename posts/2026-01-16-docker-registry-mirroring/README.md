# How to Set Up Docker Registry Mirroring for High Availability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Registry, Mirroring, High Availability, DevOps

Description: Learn how to set up Docker registry mirroring for high availability, faster pulls, and reduced bandwidth usage.

---

Registry mirroring provides local image caching, reduces external bandwidth, and improves pull performance. This guide covers setting up pull-through caches and registry replication.

## Pull-Through Cache

### Basic Mirror Setup

```yaml
version: '3.8'

services:
  registry:
    image: registry:2
    ports:
      - "5000:5000"
    environment:
      REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io
    volumes:
      - registry_data:/var/lib/registry

volumes:
  registry_data:
```

### Configure Docker Daemon

```json
// /etc/docker/daemon.json
{
  "registry-mirrors": ["http://localhost:5000"]
}
```

```bash
sudo systemctl restart docker
```

## Registry with Authentication

```yaml
version: '3.8'

services:
  registry:
    image: registry:2
    ports:
      - "5000:5000"
    environment:
      REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io
      REGISTRY_PROXY_USERNAME: ${DOCKER_HUB_USER}
      REGISTRY_PROXY_PASSWORD: ${DOCKER_HUB_PASSWORD}
      REGISTRY_HTTP_SECRET: ${REGISTRY_SECRET}
    volumes:
      - registry_data:/var/lib/registry
      - ./config.yml:/etc/docker/registry/config.yml

volumes:
  registry_data:
```

### Registry Configuration

```yaml
# config.yml
version: 0.1
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
http:
  addr: :5000
proxy:
  remoteurl: https://registry-1.docker.io
  username: ${DOCKER_HUB_USER}
  password: ${DOCKER_HUB_PASSWORD}
```

## Multi-Registry Mirror

```yaml
version: '3.8'

services:
  dockerhub-mirror:
    image: registry:2
    ports:
      - "5001:5000"
    environment:
      REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io
    volumes:
      - dockerhub_cache:/var/lib/registry

  gcr-mirror:
    image: registry:2
    ports:
      - "5002:5000"
    environment:
      REGISTRY_PROXY_REMOTEURL: https://gcr.io
    volumes:
      - gcr_cache:/var/lib/registry

  quay-mirror:
    image: registry:2
    ports:
      - "5003:5000"
    environment:
      REGISTRY_PROXY_REMOTEURL: https://quay.io
    volumes:
      - quay_cache:/var/lib/registry

volumes:
  dockerhub_cache:
  gcr_cache:
  quay_cache:
```

## High Availability Setup

```yaml
version: '3.8'

services:
  registry1:
    image: registry:2
    volumes:
      - ./config.yml:/etc/docker/registry/config.yml
      - registry_data:/var/lib/registry

  registry2:
    image: registry:2
    volumes:
      - ./config.yml:/etc/docker/registry/config.yml
      - registry_data:/var/lib/registry

  haproxy:
    image: haproxy:2.8
    ports:
      - "5000:5000"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    depends_on:
      - registry1
      - registry2

volumes:
  registry_data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server,rw
      device: ":/registry"
```

## S3 Storage Backend

```yaml
version: '3.8'

services:
  registry:
    image: registry:2
    ports:
      - "5000:5000"
    environment:
      REGISTRY_STORAGE: s3
      REGISTRY_STORAGE_S3_ACCESSKEY: ${AWS_ACCESS_KEY}
      REGISTRY_STORAGE_S3_SECRETKEY: ${AWS_SECRET_KEY}
      REGISTRY_STORAGE_S3_BUCKET: my-registry
      REGISTRY_STORAGE_S3_REGION: us-east-1
      REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io
```

## Garbage Collection

```bash
# Run garbage collection
docker exec registry bin/registry garbage-collect /etc/docker/registry/config.yml

# With dry-run
docker exec registry bin/registry garbage-collect --dry-run /etc/docker/registry/config.yml
```

## Complete Production Setup

```yaml
version: '3.8'

services:
  registry:
    image: registry:2
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      REGISTRY_HTTP_SECRET: ${REGISTRY_SECRET}
      REGISTRY_STORAGE_DELETE_ENABLED: "true"
    volumes:
      - ./config.yml:/etc/docker/registry/config.yml:ro
      - registry_data:/var/lib/registry
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5000/v2/"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Scheduled garbage collection
  gc:
    image: registry:2
    volumes:
      - ./config.yml:/etc/docker/registry/config.yml:ro
      - registry_data:/var/lib/registry
    entrypoint: /bin/sh
    command: -c "while true; do sleep 86400; /bin/registry garbage-collect /etc/docker/registry/config.yml; done"
    depends_on:
      - registry

volumes:
  registry_data:
```

## Summary

| Feature | Benefit |
|---------|---------|
| Pull-through cache | Faster pulls, reduced bandwidth |
| Mirror registry | Local availability |
| S3 backend | Scalable storage |
| HA setup | No single point of failure |

Registry mirroring improves Docker performance and reliability. Use pull-through caches for development, and HA setups with shared storage for production. For volume backups, see our post on [Docker Volume Backups](https://oneuptime.com/blog/post/2026-01-16-docker-volume-backups/view).

