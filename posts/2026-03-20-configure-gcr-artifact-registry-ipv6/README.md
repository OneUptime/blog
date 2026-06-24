# How to Configure GCR/Artifact Registry Access over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCR, Google Artifact Registry, IPv6, GCP, Docker, Container Registry

Description: Configure Google Container Registry (GCR) and Artifact Registry to push and pull container images over IPv6 from GCP and external IPv6-capable infrastructure.

---

Artifact Registry supports IPv6 access, and `gcr.io` hostnames continue to work when they are backed by Artifact Registry `gcr.io` repositories. Container Registry itself is deprecated and, as of March 18, 2025, no longer accepts image writes. This guide covers configuring access from GCP VMs, external IPv6 hosts, and Kubernetes clusters.

## Checking IPv6 Support for Google Registries

```bash
# Check if Artifact Registry resolves to IPv6

dig AAAA us-docker.pkg.dev +short
dig AAAA gcr.io +short
dig AAAA us.gcr.io +short
dig AAAA eu.gcr.io +short

# Test IPv6 connectivity
curl -6 https://us-docker.pkg.dev/v2/ 2>&1
```

## Installing gcloud CLI and Configuring Auth

```bash
# Install the Google Cloud CLI by following the official instructions for your OS:
# https://cloud.google.com/sdk/docs/install
gcloud init

# Configure Docker authentication for gcr.io repositories hosted on Artifact Registry
gcloud auth configure-docker gcr.io,us.gcr.io,eu.gcr.io,asia.gcr.io
# Or for an Artifact Registry repository hostname
gcloud auth configure-docker LOCATION-docker.pkg.dev

# Verify authentication
gcloud auth print-access-token | head -c 20
```

## Pulling Images from Artifact Registry over IPv6

```bash
# Authenticate
gcloud auth configure-docker LOCATION-docker.pkg.dev

# Pull from Artifact Registry
docker pull LOCATION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG

# Verify IPv6 was used
curl -6 "https://LOCATION-docker.pkg.dev/v2/PROJECT_ID/REPO/IMAGE/tags/list" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Pushing Images to Artifact Registry over IPv6

```bash
# Create an Artifact Registry repository
gcloud artifacts repositories create my-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="My Docker repository"

# Build and tag image for Artifact Registry
docker build -t myapp:latest .
docker tag myapp:latest \
  us-central1-docker.pkg.dev/PROJECT_ID/my-repo/myapp:latest

# Push the image
docker push us-central1-docker.pkg.dev/PROJECT_ID/my-repo/myapp:latest

# Monitor push progress
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/PROJECT_ID/my-repo
```

## Configuring GKE IPv6 Cluster for Artifact Registry

```bash
# Create GKE cluster with dual-stack support on a custom-mode VPC network
gcloud container clusters create my-cluster \
  --enable-ip-alias \
  --stack-type=ipv4-ipv6 \
  --ipv6-access-type=EXTERNAL \
  --network=VPC_NAME \
  --create-subnetwork name=my-gke-subnet,range=10.100.0.0/20 \
  --location=us-central1

# Configure kubectl
gcloud container clusters get-credentials my-cluster --location=us-central1

# Deploy using Artifact Registry image
kubectl create deployment myapp \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/my-repo/myapp:latest
```

## Using Workload Identity Federation for GKE with Artifact Registry

Artifact Registry image pulls on GKE use the node service account. Use Workload Identity Federation for GKE if workloads inside Pods need to call Artifact Registry APIs directly.

```bash
# Enable Workload Identity Federation for GKE on the cluster
gcloud container clusters update my-cluster \
  --location=us-central1 \
  --workload-pool=PROJECT_ID.svc.id.goog

# Create a Kubernetes service account
kubectl create serviceaccount artifact-sa --namespace=default

# Create a Google service account
gcloud iam service-accounts create artifact-sa \
  --display-name="Artifact Registry Service Account"

# Grant Artifact Registry access to the Google service account
gcloud artifacts repositories add-iam-policy-binding my-repo \
  --location=us-central1 \
  --member="serviceAccount:artifact-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Allow the Kubernetes service account to impersonate the Google service account
gcloud iam service-accounts add-iam-policy-binding \
  artifact-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:PROJECT_ID.svc.id.goog[default/artifact-sa]"

# Annotate the Kubernetes service account
kubectl annotate serviceaccount artifact-sa \
  --namespace=default \
  iam.gke.io/gcp-service-account=artifact-sa@PROJECT_ID.iam.gserviceaccount.com
```

## Artifact Registry from External IPv6 Hosts

```bash
# From an external IPv6-capable host (non-GCP)
# Authenticate using service account key
gcloud auth activate-service-account SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com \
  --key-file=/path/to/service-account-key.json

# Configure Docker authentication
gcloud auth configure-docker LOCATION-docker.pkg.dev

# Pull over IPv6 (if host has IPv6 and DNS returns AAAA)
docker pull LOCATION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG

# Force IPv6 for connectivity testing
curl -6 -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  https://LOCATION-docker.pkg.dev/v2/PROJECT_ID/REPO/IMAGE/tags/list
```

## Troubleshooting Artifact Registry IPv6

```bash
# Verify DNS returns IPv6 addresses
dig AAAA LOCATION-docker.pkg.dev +short

# Test TCP connection over IPv6
nc -6 -w 5 LOCATION-docker.pkg.dev 443 && echo "Connected"

# Check authentication token
gcloud auth print-access-token 2>&1 | head -c 30

# Test with curl verbose
curl -6 -v \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://LOCATION-docker.pkg.dev/v2/" 2>&1 | head -30
```

Google Artifact Registry's dual-stack infrastructure makes it naturally accessible over IPv6, requiring only proper authentication setup and IPv6-capable DNS to fully utilize IPv6 connectivity for container image management.
