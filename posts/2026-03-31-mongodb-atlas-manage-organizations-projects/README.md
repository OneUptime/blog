# How to Manage Organization and Projects in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Organization, Project, Administration

Description: Learn how to structure MongoDB Atlas organizations and projects, manage membership, and use the Atlas CLI and Admin API to automate project provisioning.

---

## Overview

MongoDB Atlas uses a two-level hierarchy: organizations contain projects, and projects contain clusters. Getting this structure right from the start makes access control, billing, and environment isolation much easier to manage at scale.

## Organization and Project Hierarchy

```text
Organization
  - Billing is consolidated at this level
  - Members can be invited with org-level roles
  - Projects (1 or more)
      - Clusters, data lakes, and triggers live here
      - Network access and database users are project-scoped
      - Each project has its own IP access list and API keys
```

A common pattern is to create one project per environment.

```text
MyCompany (Organization)
  - production
  - staging
  - development
```

## Managing Projects with the Atlas CLI

Install the Atlas CLI and authenticate.

```bash
brew install mongodb-atlas-cli
atlas auth login
```

List organizations and projects.

```bash
# List organizations your account belongs to
atlas organizations list

# List projects in the current organization
atlas projects list

# Create a new project
atlas projects create staging --orgId <ORG_ID>
```

## Using the Admin API

The Atlas Admin API lets you automate project creation in CI/CD pipelines.

```bash
# Set variables
ORG_ID="your-org-id"
PUBLIC_KEY="your-public-key"
PRIVATE_KEY="your-private-key"

# Create a project via the Admin API
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" \
  --digest \
  --header "Content-Type: application/json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups" \
  --data '{
    "name": "feature-branch-xyz",
    "orgId": "'"${ORG_ID}"'"
  }'
```

## Adding Members to a Project

```bash
# Invite a user with a specific role
atlas projects invitations invite user@example.com \
  --role GROUP_READ_ONLY \
  --projectId <PROJECT_ID>

# Common project roles:
# GROUP_OWNER, GROUP_CLUSTER_MANAGER, GROUP_DATA_ACCESS_ADMIN,
# GROUP_DATA_ACCESS_READ_WRITE, GROUP_DATA_ACCESS_READ_ONLY, GROUP_READ_ONLY
```

## Automating Project Setup with Terraform

```hcl
terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
  }
}

provider "mongodbatlas" {
  public_key  = var.atlas_public_key
  private_key = var.atlas_private_key
}

resource "mongodbatlas_project" "staging" {
  name   = "staging"
  org_id = var.org_id
}

resource "mongodbatlas_project" "production" {
  name   = "production"
  org_id = var.org_id
}
```

## Project Tags for Cost Allocation

Atlas supports project-level tags for billing breakdown. You can specify tags when creating a project.

```bash
atlas projects create my-project --orgId <ORG_ID> \
  --tag environment=production \
  --tag team=platform
```

## Deleting Projects Safely

A project can only be deleted if it contains no clusters. Terminate clusters first.

```bash
# Delete all clusters in a project first
atlas clusters delete my-cluster --projectId <PROJECT_ID> --force

# Then delete the project
atlas projects delete <PROJECT_ID> --force
```

## Summary

MongoDB Atlas organizations provide consolidated billing and org-level membership, while projects isolate environments, network access lists, and database users. Use the Atlas CLI for interactive management, the Admin API for CI/CD automation, and Terraform for infrastructure-as-code provisioning. Apply project tags early to enable cost allocation reporting across teams and environments.
