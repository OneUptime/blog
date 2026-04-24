# How to Create Custom Templates from a Git Repository in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Git, DevOps

Description: Learn how to create versioned Portainer custom templates by linking to Compose files stored in a Git repository.

## Introduction

Storing Portainer templates in a Git repository provides version control, collaboration, and consistency across multiple Portainer instances. Instead of manually maintaining templates in each Portainer installation, you maintain a single source of truth in Git and link Portainer to it. This guide covers creating custom templates from a Git repository.

## Prerequisites

- Portainer 2.x+ (use Portainer Business Edition if you want custom template variables)
- A Git repository with Docker Compose files (GitHub, GitLab, Gitea, Bitbucket)
- Portainer network access to the Git host
- (For private repos) Credentials or a token with repository read access

## Repository Structure

Organize your template repository clearly:

```text
portainer-templates/
├── README.md
├── stacks/
│   ├── monitoring/
│   │   ├── docker-compose.yml    # Prometheus + Grafana stack
│   │   └── README.md
│   ├── wordpress/
│   │   ├── docker-compose.yml
│   │   └── README.md
│   └── gitea/
│       ├── docker-compose.yml
│       └── README.md
└── containers/
    ├── nginx/
    │   └── docker-compose.yml
    └── postgres/
        └── docker-compose.yml
```

## Step 1: Prepare Your Compose File in Git

Create a Compose file with Mustache variables where customization is needed. Define default values in Portainer when you create the template:

```yaml
# stacks/monitoring/docker-compose.yml

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "{{ prometheus_port }}:9090"
    volumes:
      - prometheus-data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "{{ grafana_port }}:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD={{ admin_password }}
      - GF_SERVER_ROOT_URL=https://{{ domain }}/grafana
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:
```

Commit and push this file to your repository.

## Step 2: Create the Custom Template in Portainer

1. Go to **Templates > Custom**
2. Click **Add Custom Template**
3. Select **Repository** as the build method

## Step 3: Fill in Repository Details

| Field | Value |
|-------|-------|
| Repository URL | `https://github.com/myorg/portainer-templates` |
| Repository reference | `refs/heads/main` |
| Compose path | `stacks/monitoring/docker-compose.yml` |
| Authentication | Toggle ON for private repos |
| Username | Your Git username or token username (if private) |
| Personal access token | Your personal access token or password (if private) |

For GitHub personal access tokens, create one at **Settings → Developer settings → Personal access tokens** with either the classic `repo` scope or a fine-grained token scoped to the target repository with **Contents: Read-only**.

## Step 4: Add Template Metadata

```text
Title:       Monitoring Stack (Prometheus + Grafana)
Description: Production-ready monitoring with alerting

Note:        Includes Prometheus and Grafana
Platform:    Linux
Type:        Standalone / Podman
```

## Step 5: Configure Template Variables

Add variable definitions matching the Mustache variables in your Compose file. This feature is available in Portainer Business Edition:

```text
Variable 1:
  Name:        admin_password
  Label:       Grafana admin password
  Description: Password for Grafana admin account
  Default:     (empty - required)

Variable 2:
  Name:        domain
  Label:       Application domain
  Description: Domain name for Grafana URL configuration
  Default:     localhost

Variable 3:
  Name:        grafana_port
  Label:       Grafana UI port
  Description: Host port to expose Grafana
  Default:     3000

Variable 4:
  Name:        prometheus_port
  Label:       Prometheus UI port
  Description: Host port to expose Prometheus
  Default:     9090
```

## Step 6: Save the Template

Click **Create custom template**. Portainer clones the repository, verifies that the referenced Compose file exists, and then saves the template.

## Updating Templates from Git

If your template points to a moving reference such as `refs/heads/main`, users get the version at that reference the next time they deploy the template. If you point to a tag such as `refs/tags/v2.0.0`, deployments stay pinned to that tag until you change the repository reference.

To update the template configuration itself (variables, metadata):

1. Go to **Custom templates**
2. Click **Edit** on the template
3. Update the repository URL, reference, path, or variable definitions
4. Save

## Using Tags for Stable Template Versions

Point to specific tags for stable releases:

```text
Repository reference: refs/tags/v2.0.0   # Always deploy from tag v2.0.0
```

Or branches for environment-specific templates:

```text
refs/heads/production    # Production template branch
refs/heads/staging       # Staging template branch
```

## Private Repository Authentication

### GitHub Personal Access Token

```bash
# Create either:
# - A classic PAT with the repo scope
# - A fine-grained PAT scoped to the target repository with Contents: Read-only
```

### GitLab Deploy Token

```bash
# Create at: Repository Settings → Repository → Deploy tokens
# Scope: read_repository
```

### Self-hosted Gitea

```bash
# Create at: User Settings → Applications → Generate Token
# Use a token or password with read access to the repository
```

## Multiple Portainer Instances

Git-based templates shine when managing multiple Portainer instances. Since templates are stored centrally in Git, all instances can reference the same repository and deploy the same versioned templates without manual synchronization.

## Conclusion

Git-backed custom templates are the recommended approach for production Portainer environments. They provide version control for your templates, enable team collaboration, and make it easy to maintain consistency across multiple Portainer instances. Set up a dedicated template repository and structure it to mirror your application catalog.
