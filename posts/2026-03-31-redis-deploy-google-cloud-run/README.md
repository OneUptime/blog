# How to Deploy Redis with Google Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Google Cloud, Cloud Run, Deployment, Container

Description: Deploy a self-managed Redis container on Google Cloud Run with a persistent Filestore volume, VPC connectivity, and Secret Manager for passwords.

---

Google Cloud Run is well-known for stateless containers, but with Cloud Run volumes backed by Cloud Filestore (NFS) or Cloud Storage, you can run stateful services like Redis for development and low-scale production workloads. This guide deploys Redis on Cloud Run with persistent storage and Secret Manager for secure password management.

## Prerequisites

```bash
# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  vpcaccess.googleapis.com \
  file.googleapis.com
```

## Store the Redis Password in Secret Manager

```bash
# Create the secret
echo -n "your-strong-password" | gcloud secrets create redis-password \
  --data-file=- \
  --replication-policy=automatic

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding redis-password \
  --member="serviceAccount:$(gcloud projects describe $(gcloud config get-value project) \
    --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Create a Cloud Filestore Instance for Persistence

```bash
PROJECT=$(gcloud config get-value project)
REGION="us-central1"
ZONE="us-central1-a"

gcloud filestore instances create redis-storage \
  --project=$PROJECT \
  --location=$ZONE \
  --tier=BASIC_HDD \
  --file-share=name=redis_data,capacity=1TB \
  --network=name=default

# Get Filestore IP
FILESTORE_IP=$(gcloud filestore instances describe redis-storage \
  --location=$ZONE --format="value(networks[0].ipAddresses[0])")
```

## Create a VPC Access Connector

```bash
gcloud compute networks vpc-access connectors create my-connector \
  --region $REGION \
  --network default \
  --range 10.8.0.0/28
```

## Deploy Redis to Cloud Run

```bash
gcloud run deploy redis \
  --image redis:7-alpine \
  --region $REGION \
  --no-allow-unauthenticated \
  --port 6379 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 1 \
  --set-secrets REDIS_PASSWORD=redis-password:latest \
  --command sh \
  --args="-c,exec redis-server --requirepass \$REDIS_PASSWORD --maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes --dir /data" \
  --vpc-connector projects/$PROJECT/locations/$REGION/connectors/my-connector \
  --vpc-egress all-traffic \
  --add-volume name=redis-vol,type=nfs,location=$FILESTORE_IP:/redis_data \
  --add-volume-mount volume=redis-vol,mount-path=/data
```

## Connecting from Other Cloud Run Services

Cloud Run services only support HTTP-based ingress, so other services cannot connect to this Redis instance directly via the Redis protocol. For production inter-service Redis connectivity, use [Memorystore for Redis](https://cloud.google.com/memorystore/docs/redis) which provides a stable private IP accessible from Cloud Run via VPC.

If you need Redis only as a sidecar within the same Cloud Run service, add it as a secondary container using `--add-container` so the primary container can reach Redis at `localhost:6379`.

To pass the Redis password to dependent services that use Memorystore or an external Redis:

```bash
gcloud run services update my-app \
  --region $REGION \
  --set-secrets REDIS_PASSWORD=redis-password:latest
```

## Verifying the Deployment

```bash
# Check service status
gcloud run services describe redis --region $REGION

# Stream logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=redis" \
  --limit 50 --format "value(textPayload)"
```

## Summary

This guide deploys a Redis container on Cloud Run with a Cloud Filestore NFS volume for persistence and Secret Manager for password storage. Note that Cloud Run services only support HTTP-based ingress, so this setup is suitable for single-service use (e.g., Redis as a sidecar) or experimentation. For inter-service Redis connectivity, use Memorystore for Redis with a VPC connector. Setting min-instances to 1 prevents cold starts that would lose in-memory data between requests.
