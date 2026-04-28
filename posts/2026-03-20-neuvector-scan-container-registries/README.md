# How to Scan Container Registries with NeuVector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Registry Scanning, Container Security, Harbor, ECR, Kubernetes

Description: Step-by-step guide to scanning multiple container registries with NeuVector, including Harbor, Docker Hub, ECR, and Azure Container Registry.

## Introduction

Scanning container registries with NeuVector gives you a comprehensive vulnerability inventory of all images stored in your organization's registries. This guide covers practical scanning workflows for the most common registry types, including Harbor, Docker Hub, Amazon ECR, and Azure Container Registry (ACR).

## Prerequisites

- NeuVector installed with Scanner running
- Registry credentials (robot accounts recommended for production)
- NeuVector Manager API or UI access

## Step 1: Scan Docker Hub Repositories

Public and private Docker Hub repositories can be scanned directly:

```bash
# Authenticate with NeuVector

TOKEN=$(curl -sk -X POST \
  "https://neuvector-manager:8443/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"yourpassword"}}' \
  | jq -r '.token.token')

# Add Docker Hub registry
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "docker-hub-org",
      "registry_type": "Docker Registry",
      "registry": "https://registry-1.docker.io",
      "username": "myorg",
      "password": "dckr_pat_xxxxxxxxxxxx",
      "filters": ["myorg/*"],
      "scan_layers": true,
      "rescan_after_db_update": true,
      "schedule": {"schedule": "periodical", "interval": 86400}
    }
  }'

# Trigger immediate scan
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry/docker-hub-org/scan" \
  -H "X-Auth-Token: ${TOKEN}"
```

## Step 2: Scan Harbor Registry

Harbor is a common enterprise registry. Use a robot account for scanning:

```bash
# First, create a robot account in Harbor with pull permissions
# Then configure NeuVector to use it

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "harbor-production",
      "registry_type": "Harbor Registry",
      "registry": "https://harbor.company.com",
      "username": "robot$nv-scanner",
      "password": "robot-secret-token",
      "filters": [
        "production/*:*",
        "staging/webapp:*"
      ],
      "scan_layers": true,
      "rescan_after_db_update": true,
      "schedule": {
        "schedule": "periodical",
        "interval": 86400
      }
    }
  }'
```

Verify Harbor connectivity:

```bash
# Check if the registry was added successfully
curl -sk \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-production" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.config.name'
```

## Step 3: Scan Amazon ECR

ECR requires either IAM credentials or IRSA (IAM Roles for Service Accounts):

```bash
# Option 1: Using AWS access keys
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "aws-ecr-us-east-1",
      "registry_type": "Amazon ECR Registry",
      "registry": "https://123456789012.dkr.ecr.us-east-1.amazonaws.com",
      "aws_key": {
        "id": "123456789012",
        "access_key_id": "AKIAIOSFODNN7EXAMPLE",
        "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "region": "us-east-1"
      },
      "filters": ["*:latest", "*:stable"],
      "scan_layers": true,
      "rescan_after_db_update": true
    }
  }'
```

For IRSA-based authentication, annotate the NeuVector controller service account:

```bash
# Annotate controller service account for IRSA
kubectl annotate serviceaccount controller \
  -n neuvector \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/NeuVectorScannerRole
```

## Step 4: Scan Azure Container Registry (ACR)

```bash
# Create a service principal for ACR scanning
az ad sp create-for-rbac \
  --name neuvector-scanner \
  --role AcrPull \
  --scopes /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.ContainerRegistry/registries/<acr-name>

# Add ACR to NeuVector
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "azure-acr",
      "registry_type": "Azure Container Registry",
      "registry": "https://mycompany.azurecr.io",
      "username": "<service-principal-app-id>",
      "password": "<service-principal-password>",
      "filters": ["production/*"],
      "scan_layers": true,
      "rescan_after_db_update": true,
      "schedule": {"schedule": "periodical", "interval": 86400}
    }
  }'
```

## Step 5: Scan Google Artifact Registry

```bash
# Create a service account with Artifact Registry Reader role
gcloud iam service-accounts create nv-scanner \
  --description="NeuVector Scanner" \
  --display-name="NeuVector Scanner"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:nv-scanner@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Create and download a key
gcloud iam service-accounts keys create nv-scanner-key.json \
  --iam-account=nv-scanner@my-project.iam.gserviceaccount.com

# Add to NeuVector (pass the JSON key contents in gcr_key.json_key)
JSON_KEY=$(jq -Rs . < nv-scanner-key.json)

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "{
    \"config\": {
      \"name\": \"google-gar\",
      \"registry_type\": \"Google Container Registry\",
      \"registry\": \"https://us-central1-docker.pkg.dev\",
      \"gcr_key\": {
        \"json_key\": ${JSON_KEY}
      },
      \"filters\": [\"my-project/production/*\"],
      \"scan_layers\": true,
      \"rescan_after_db_update\": true
    }
  }"
```

## Step 6: Monitor All Registry Scans

```bash
# List all configured registries and their scan status
curl -sk \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.registries[] | {
    name: .config.name,
    registry: .config.registry,
    status: .status.status,
    scanned: .status.scanned,
    total: .status.total,
    last_scan: .status.scanned_at
  }'
```

## Step 7: Stop or Delete a Registry

```bash
# Stop an in-progress scan
curl -sk -X DELETE \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-production/scan" \
  -H "X-Auth-Token: ${TOKEN}"

# Remove a registry configuration
curl -sk -X DELETE \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-production" \
  -H "X-Auth-Token: ${TOKEN}"
```

## Conclusion

NeuVector supports all major container registries, making it easy to centralize vulnerability management across your entire image inventory. By configuring robot accounts with minimal permissions, scheduling regular scans, and enabling automatic rescan on CVE database updates, you ensure that your registry images are continuously evaluated for new threats without manual intervention.
