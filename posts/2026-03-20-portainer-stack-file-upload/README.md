# How to Create a Stack from a File Upload in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Docker Compose, DevOps

Description: Learn how to deploy Docker Compose stacks by uploading a file to Portainer, useful for air-gapped environments or quick one-off deployments.

## Introduction

Portainer's file upload method lets you deploy a Docker Compose stack by uploading a `.yml` file directly from your local machine. This approach is useful in air-gapped environments without Git access, for one-off deployments where a repository would be overkill, or when sharing a stack configuration as a file. Unlike the Git repository method, there is no ongoing sync with the original source file after deployment.

## Prerequisites

- Portainer installed with a connected Docker environment
- A Docker Compose YAML file on your local machine

## When to Use File Upload vs. Other Methods

| Method | Best For |
|--------|---------|
| Web editor | Quick tests, learning, ad-hoc stacks |
| File upload | Air-gapped environments, one-off deploys, sharing configs |
| Git repository | Production, version-controlled, optional GitOps auto-update |
| Custom template | Reusable patterns, team self-service |

## Step 1: Prepare Your Compose File

Create or save a complete Docker Compose file locally:

```yaml
# wordpress-stack.yml - WordPress with MySQL

services:
  # WordPress web application
  wordpress:
    image: wordpress:6-apache
    restart: unless-stopped
    ports:
      - "8080:80"
    networks:
      - wp-net
    environment:
      - WORDPRESS_DB_HOST=mysql
      - WORDPRESS_DB_NAME=${DB_NAME:-wordpress}
      - WORDPRESS_DB_USER=${DB_USER:-wpuser}
      - WORDPRESS_DB_PASSWORD=${DB_PASSWORD}
    volumes:
      - wp_content:/var/www/html/wp-content

  # MySQL database
  mysql:
    image: mysql:8-oracle
    restart: unless-stopped
    networks:
      - wp-net
    environment:
      - MYSQL_DATABASE=${DB_NAME:-wordpress}
      - MYSQL_USER=${DB_USER:-wpuser}
      - MYSQL_PASSWORD=${DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql

networks:
  wp-net:
    driver: bridge

volumes:
  wp_content:
  mysql_data:
```

Save this file as `wordpress-stack.yml` on your local machine.

## Step 2: Upload the Stack File in Portainer

1. Navigate to **Stacks** → **Add stack**.
2. Enter a stack **Name**: `wordpress`.
3. Select **Upload** as the build method.
4. Click **Select file** and browse to `wordpress-stack.yml`.
5. The file name appears when selected.

## Step 3: Add Environment Variables

In the **Environment variables** section:

```text
DB_NAME           wordpress
DB_USER           wpuser
DB_PASSWORD       securepassword123
DB_ROOT_PASSWORD  rootpassword456
```

## Step 4: Deploy the Stack

1. Click **Deploy the stack**.
2. Portainer reads the uploaded file, creates networks and volumes, pulls images if needed, and starts the stack.
3. The stack appears in the Stacks list.

## Step 5: Limitations of File Upload Method

Understand what file upload does NOT do:

```text
1. No source tracking - Portainer does not stay linked to the original local file
2. No auto-update - changes to the local file won't propagate
3. To apply local file changes: re-upload the file or edit the stack in Portainer

After upload, the stack content remains visible in Portainer.
You can edit it there without re-uploading.
```

## Step 6: Prepare Files for Air-Gapped Deployment

For environments without internet access, pre-load images before deploying:

```bash
# On an internet-connected machine:
# Pull and save all images the stack needs:
docker pull wordpress:6-apache
docker pull mysql:8-oracle

docker save wordpress:6-apache mysql:8-oracle | gzip > stack-images.tar.gz

# Transfer stack-images.tar.gz and wordpress-stack.yml to the air-gapped machine

# On the air-gapped machine:
# Import images:
gunzip -c stack-images.tar.gz | docker load

# Verify images are present:
docker images | grep -E "wordpress|mysql"

# Then upload the stack file in Portainer - it will use local images
```

## Step 7: Convert an Existing Stack to Git-Based

Once a stack is deployed from a file, you can switch it to Git tracking:

1. In Portainer, navigate to **Stacks** → click the stack name.
2. Copy the current Compose content from the editor.
3. Commit it to a Git repository.
4. Remove the current stack.
5. Redeploy using the Git repository method.

This migration adds version control and can add GitOps-based auto-update capabilities if you enable them.

## Conclusion

File upload is the most direct deployment path for situations where Git repositories are unavailable or unnecessary - particularly air-gapped environments, quick demos, or configuration sharing between teams. Prepare a complete Compose file with environment variable placeholders, upload it to Portainer, fill in the variable values, and deploy. For long-running production services, consider migrating to Git-based deployment to gain version history and, if configured, GitOps-based automatic updates.
