# How to Configure Atlas API Keys for Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, API Key, Automation, Security

Description: Create and manage MongoDB Atlas API keys for automation, restrict access with IP allowlists, and integrate keys with CI/CD pipelines and Terraform.

---

## Overview

Atlas API keys are long-lived credentials used to authenticate programmatic access to the Atlas Admin API. Unlike user accounts, API keys are not subject to MFA and are designed for automation scenarios such as CI/CD pipelines, Terraform provisioning, and monitoring integrations.

## Creating an API Key

API keys can be scoped to an organization or a project.

```bash
# Create an org-level API key
atlas organizations apikeys create \
  --desc "terraform-provisioning" \
  --role ORG_GROUP_CREATOR \
  --orgId <ORG_ID>

# Create a project-level API key
atlas projects apikeys create \
  --desc "ci-pipeline-key" \
  --role GROUP_CLUSTER_MANAGER \
  --projectId <PROJECT_ID>
```

Atlas displays the private key only once when the key is created. Store it immediately in a secrets manager.

## Restricting Keys with IP Allowlists

Always restrict API keys to the IP addresses or CIDR ranges that will use them.

```bash
# Allow a specific IP address
atlas organizations apikeys accesslists create \
  --apiKey <API_KEY_ID> \
  --ip "203.0.113.10" \
  --orgId <ORG_ID>

# Allow a CIDR range (e.g., a CI/CD platform's egress range)
atlas organizations apikeys accesslists create \
  --apiKey <API_KEY_ID> \
  --cidr "10.0.0.0/16" \
  --orgId <ORG_ID>
```

## Using API Keys in Shell Scripts

```bash
#!/usr/bin/env bash
set -euo pipefail

PUBLIC_KEY="${ATLAS_PUBLIC_KEY}"
PRIVATE_KEY="${ATLAS_PRIVATE_KEY}"
PROJECT_ID="${ATLAS_PROJECT_ID}"

# List clusters in a project
curl -s -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Accept: application/vnd.atlas.2023-01-01+json" \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/clusters" \
  | jq '.results[] | {name: .name, state: .stateName}'
```

Always read credentials from environment variables, never hard-code them.

## Integrating with GitHub Actions

```yaml
name: Atlas Cluster Management

on:
  workflow_dispatch:
    inputs:
      action:
        description: 'pause or resume'
        required: true

jobs:
  manage-cluster:
    runs-on: ubuntu-latest
    steps:
      - name: Pause or Resume Cluster
        env:
          ATLAS_PUBLIC_KEY: ${{ secrets.ATLAS_PUBLIC_KEY }}
          ATLAS_PRIVATE_KEY: ${{ secrets.ATLAS_PRIVATE_KEY }}
          ATLAS_PROJECT_ID: ${{ secrets.ATLAS_PROJECT_ID }}
        run: |
          PAUSED=$( [ "${{ github.event.inputs.action }}" = "pause" ] && echo "true" || echo "false" )
          curl -s -u "${ATLAS_PUBLIC_KEY}:${ATLAS_PRIVATE_KEY}" --digest \
            --header "Content-Type: application/json" \
            --header "Accept: application/vnd.atlas.2023-01-01+json" \
            --request PATCH \
            "https://cloud.mongodb.com/api/atlas/v2/groups/${ATLAS_PROJECT_ID}/clusters/my-cluster" \
            --data "{\"paused\": ${PAUSED}}"
```

## Configuring Terraform with Atlas API Keys

```hcl
provider "mongodbatlas" {
  public_key  = var.atlas_public_key
  private_key = var.atlas_private_key
}

# Reference project ID for resources
data "mongodbatlas_project" "production" {
  name = "production"
}
```

Store keys as Terraform variables in a `.tfvars` file (excluded from version control) or pass via environment variables.

```bash
export MONGODB_ATLAS_PUBLIC_KEY="your-public-key"
export MONGODB_ATLAS_PRIVATE_KEY="your-private-key"
terraform apply
```

## Rotating API Keys

Create a new key, update all consumers, then delete the old key.

```bash
# Create replacement key
atlas organizations apikeys create \
  --desc "terraform-provisioning-v2" \
  --role ORG_GROUP_CREATOR \
  --orgId <ORG_ID>

# After updating all secrets stores, delete the old key
atlas organizations apikeys delete <OLD_API_KEY_ID> \
  --orgId <ORG_ID> --force
```

## Summary

Atlas API keys provide credential-based programmatic access without MFA. Always restrict them to known IP addresses, store the private key in a secrets manager immediately on creation, and read credentials from environment variables in scripts and pipelines. Rotate keys regularly by creating a replacement before deleting the old one to avoid downtime.
