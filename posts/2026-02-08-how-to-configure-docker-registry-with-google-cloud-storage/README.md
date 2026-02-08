# How to Configure Docker Registry with Google Cloud Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Registry, Google Cloud Storage, GCS, Cloud, Self-Hosted, Container Registry

Description: Configure a private Docker registry to use Google Cloud Storage as its backend for scalable, durable image storage.

---

Running a Docker registry with local filesystem storage works for small setups, but it has clear limitations. Disk space is finite, backups require extra tooling, and you cannot scale horizontally because each registry instance would need its own copy of the data. Google Cloud Storage (GCS) solves all of these problems by giving you effectively unlimited, highly durable storage that multiple registry instances can share.

This guide walks through configuring a Docker registry to use GCS as its storage backend, including authentication, permissions, and performance tuning.

## Why Google Cloud Storage?

GCS provides 99.999999999% (eleven nines) annual durability for stored objects. Your images are automatically replicated across multiple zones, and you pay only for what you store. For a private registry, this means you never worry about disk failures, RAID configurations, or running out of space.

Compared to filesystem storage:
- No disk capacity planning needed
- Built-in redundancy and durability
- Multiple registry instances can share the same bucket
- No backup infrastructure required
- Pay-per-use pricing

## Prerequisites

You need a Google Cloud account with a project. You also need the `gcloud` CLI installed and authenticated. Create a GCS bucket and a service account before starting the Docker setup.

## Step 1: Create a GCS Bucket

```bash
# Set your project ID
export PROJECT_ID=your-gcp-project-id

# Create a bucket for registry storage
# Choose a region close to your registry server
gsutil mb -p $PROJECT_ID -l us-central1 -c standard gs://my-docker-registry-storage

# Verify the bucket exists
gsutil ls gs://my-docker-registry-storage
```

## Step 2: Create a Service Account

The registry needs credentials to access GCS. Create a dedicated service account with minimal permissions.

```bash
# Create the service account
gcloud iam service-accounts create docker-registry \
  --display-name="Docker Registry" \
  --project=$PROJECT_ID

# Grant Storage Admin permissions on the bucket
gsutil iam ch \
  serviceAccount:docker-registry@${PROJECT_ID}.iam.gserviceaccount.com:roles/storage.admin \
  gs://my-docker-registry-storage

# Generate a JSON key file
gcloud iam service-accounts keys create registry-sa-key.json \
  --iam-account=docker-registry@${PROJECT_ID}.iam.gserviceaccount.com
```

The `storage.admin` role lets the registry read, write, and delete objects in the bucket. If you want tighter permissions, use `storage.objectAdmin` instead.

## Step 3: Registry Configuration

Create a registry configuration file that points to GCS:

```yaml
# config.yml - Docker registry with GCS storage backend
version: 0.1

storage:
  gcs:
    bucket: my-docker-registry-storage
    # Use a key file for authentication
    keyfile: /etc/docker/registry/gcs-key.json
    # Root directory within the bucket
    rootdirectory: /docker/registry/v2
    # Chunk size for multipart uploads (5MB minimum)
    chunksize: 5242880
  # Enable image deletion
  delete:
    enabled: true
  # Cache blob descriptors in memory
  cache:
    blobdescriptor: inmemory

http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]

health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
```

## Docker Compose Configuration

```yaml
# Docker Registry with Google Cloud Storage backend
version: "3.8"

services:
  # Docker Registry using GCS for storage
  registry:
    image: registry:2
    ports:
      - "5000:5000"
    volumes:
      # Mount the registry configuration
      - ./config.yml:/etc/docker/registry/config.yml:ro
      # Mount the GCS service account key
      - ./registry-sa-key.json:/etc/docker/registry/gcs-key.json:ro
    restart: unless-stopped
    networks:
      - registry-network

  # Nginx reverse proxy with TLS (recommended for production)
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx/registry.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - ./auth:/etc/nginx/auth:ro
    depends_on:
      - registry
    restart: unless-stopped
    networks:
      - registry-network

networks:
  registry-network:
    driver: bridge
```

Notice there is no volume for registry data. All image data lives in GCS now, so the registry container itself is stateless. You can destroy and recreate it without losing any images.

## Using Environment Variables Instead

If you prefer environment variables over a config file:

```yaml
# Registry with GCS configured via environment variables
registry:
  image: registry:2
  ports:
    - "5000:5000"
  environment:
    REGISTRY_STORAGE: gcs
    REGISTRY_STORAGE_GCS_BUCKET: my-docker-registry-storage
    REGISTRY_STORAGE_GCS_KEYFILE: /etc/docker/registry/gcs-key.json
    REGISTRY_STORAGE_GCS_ROOTDIRECTORY: /docker/registry/v2
    REGISTRY_STORAGE_GCS_CHUNKSIZE: "5242880"
    REGISTRY_STORAGE_DELETE_ENABLED: "true"
    REGISTRY_STORAGE_CACHE_BLOBDESCRIPTOR: inmemory
  volumes:
    - ./registry-sa-key.json:/etc/docker/registry/gcs-key.json:ro
```

## Workload Identity (GKE)

If you run the registry on Google Kubernetes Engine, use Workload Identity instead of a key file. This avoids managing long-lived credentials.

```yaml
# config.yml for GKE with Workload Identity - no keyfile needed
version: 0.1

storage:
  gcs:
    bucket: my-docker-registry-storage
    rootdirectory: /docker/registry/v2
    chunksize: 5242880
  delete:
    enabled: true
```

When Workload Identity is configured, the registry automatically uses the bound Kubernetes service account's GCP identity. No key file is needed.

## Testing the Setup

```bash
# Start the registry
docker compose up -d

# Verify the registry is running and can reach GCS
curl http://localhost:5000/v2/_catalog
# Should return: {"repositories":[]}

# Push a test image
docker pull alpine:latest
docker tag alpine:latest localhost:5000/test/alpine:latest
docker push localhost:5000/test/alpine:latest

# Verify the image is stored in GCS
gsutil ls gs://my-docker-registry-storage/docker/registry/v2/repositories/

# Pull the image back
docker rmi localhost:5000/test/alpine:latest
docker pull localhost:5000/test/alpine:latest
```

## Performance Tuning

### Chunk Size

The `chunksize` setting controls the size of multipart upload chunks. Larger chunks mean fewer API calls but more memory usage per upload.

```yaml
# Default: 5MB - good for most cases
chunksize: 5242880

# For large images over slow connections: 10MB
chunksize: 10485760

# For fast networks with large images: 16MB
chunksize: 16777216
```

### Adding Redis Cache

For high-traffic registries, add a Redis cache to reduce GCS API calls:

```yaml
# config.yml with Redis cache for GCS backend
version: 0.1

storage:
  gcs:
    bucket: my-docker-registry-storage
    keyfile: /etc/docker/registry/gcs-key.json
    rootdirectory: /docker/registry/v2
  cache:
    blobdescriptor: redis
  delete:
    enabled: true

redis:
  addr: redis:6379
  pool:
    maxidle: 16
    maxactive: 64
    idletimeout: 300s
```

This caches blob descriptor lookups in Redis, avoiding GCS API calls for metadata that does not change.

## Cost Management

GCS charges for storage, API operations, and network egress.

```bash
# Check current bucket size
gsutil du -s gs://my-docker-registry-storage

# Set a lifecycle policy to automatically delete old data
# lifecycle.json:
# {
#   "lifecycle": {
#     "rule": [
#       {
#         "action": {"type": "Delete"},
#         "condition": {"age": 90}
#       }
#     ]
#   }
# }
gsutil lifecycle set lifecycle.json gs://my-docker-registry-storage
```

Use Nearline or Coldline storage classes for images that are rarely pulled:

```bash
# Change storage class for cost savings on infrequently accessed images
gsutil rewrite -s nearline gs://my-docker-registry-storage/**
```

## Garbage Collection

Even with GCS, you need to run garbage collection to clean up unreferenced layers:

```bash
# Dry run to see what would be deleted
docker compose exec registry bin/registry garbage-collect /etc/docker/registry/config.yml --dry-run

# Actually delete unreferenced blobs
docker compose exec registry bin/registry garbage-collect /etc/docker/registry/config.yml
```

## Migrating from Filesystem to GCS

If you have an existing registry with filesystem storage, migrate the data using gsutil:

```bash
# Copy existing registry data to GCS
gsutil -m cp -r /var/lib/registry/* gs://my-docker-registry-storage/docker/registry/v2/
```

The `-m` flag enables parallel uploads for faster transfer.

## Troubleshooting

```bash
# Check registry logs for GCS errors
docker compose logs registry | grep -i "gcs\|storage\|error"

# Verify the service account has correct permissions
gsutil iam get gs://my-docker-registry-storage

# Test GCS access from the registry container
docker compose exec registry sh -c "wget -qO- http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/ -H 'Metadata-Flavor: Google' || echo 'Not on GCE'"

# Check if the key file is readable
docker compose exec registry cat /etc/docker/registry/gcs-key.json | head -5
```

## Summary

Google Cloud Storage turns your Docker registry from a stateful service into a stateless one. All image data lives in a durable, scalable object store, and the registry container itself can be replaced at will. Combined with Redis caching for frequently accessed metadata, this setup handles everything from small team registries to large-scale enterprise deployments.
