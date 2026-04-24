# How to Deploy a Stack from a Template in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Stack, DevOps

Description: Learn how to deploy multi-service applications from stack templates in Portainer with customizable variables.

## Introduction

Stack templates in Portainer combine the power of Docker Compose or Swarm stack files with the convenience of a template system. Instead of writing stack files from scratch, you select a stack template, configure a few variables, and deploy a complete multi-service application. This guide shows you how.

## Prerequisites

- Portainer CE or BE installed
- Docker standalone or Docker Swarm environment
- Basic understanding of Docker Compose

## What Is a Stack Template

A stack template in Portainer can be a Swarm stack (`type: 2`) or a Compose stack (`type: 3`). For example, a Compose stack template for WordPress contains:

```json
{
  "type": 3,
  "title": "WordPress",
  "description": "WordPress setup with a MySQL database",
  "categories": ["CMS"],
  "platform": "linux",
  "logo": "https://portainer-io-assets.sfo2.digitaloceanspaces.com/logos/wordpress.png",
  "repository": {
    "url": "https://github.com/portainer/templates",
    "stackfile": "stacks/wordpress/docker-compose.yml"
  },
  "env": [
    {
      "name": "MYSQL_DATABASE_PASSWORD",
      "label": "Database root password",
      "description": "Password used by the MySQL root user."
    }
  ]
}
```

## Step 1: Navigate to Templates

1. Select your Docker environment in Portainer
2. Expand **Templates** in the sidebar
3. Click **Application** and browse or search for stack templates

## Step 2: Find a Stack Template

Examples from Portainer's official templates include:

- **WordPress** - WordPress + MySQL
- **Swarm monitoring** - Prometheus + Grafana for Swarm
- **Redis Cluster** - Redis in cluster mode
- **OpenAMT** - OpenAMT Cloud Toolkit
- **Dokku** - PaaS-style application platform
- **LiveSwitch** - Gateway, cache, database, and media server stack

## Step 3: Click the Stack Template

Click on your chosen template. The configuration panel expands showing:

- Template description
- Variable fields to fill in
- An option to enable or disable access control

## Step 4: Configure Template Variables

For the **Dokku** stack template example:

```text
Stack name:        my-dokku

Dokku version:     latest
Dokku hostname:    dokku.example.com
Dokku volume path: /var/lib/dokku
Dokku host root:   /var/lib/dokku/home/dokku
SSH port:          22
HTTP port:         80
HTTPS port:        443
```

**Important:** Use a unique stack name.

## Step 5: Review the Compose File (Optional)

Some templates are backed by Compose files stored in a Git repository. Reviewing the file helps you understand what will be deployed:

```yaml
# version: '3.2'
services:
  agent:
    image: dokku/dokku:${VERSION}
    environment:
      DOKKU_HOSTNAME: ${DOKKU_HOSTNAME}
      DOKKU_HOST_ROOT: ${DOKKU_HOST_ROOT}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${VOLUME_PATH:-/var/lib/dokku}:/mnt/dokku
    ports:
      - "${SSH_PORT:-22}:22"
      - "${HTTP_PORT:-80}:80"
      - "${HTTPS_PORT:-443}:443"
```

## Step 6: Deploy the Stack

1. Click **Deploy the stack**
2. Portainer creates the stack resources defined by the template, including containers or services, volumes, and networks
3. Watch the deployment output for errors

## Step 7: Verify the Stack

1. Go to **Stacks** in the sidebar
2. Find your new stack (named `my-dokku`)
3. Click it to see its containers or services
4. Verify everything shows **Running** status

Visit the application URL in your browser to confirm it works.

## Step 8: Manage the Deployed Stack

From the stack detail view:

- **Editor** - Modify the Compose file when the stack is editable in Portainer
- **Stop** - Stop the stack
- **Remove** - Delete the stack (optionally delete volumes)
- **Logs** - View logs for the stack's containers or services

## Updating a Stack from a Template

Stack templates create a standard Portainer stack. To update it:

1. Navigate to the stack in **Stacks**
2. If the **Editor** tab is available, modify the Compose file or environment variables
3. Update image tags or configuration
4. Click **Update the stack**

## Creating a Custom Stack Template

Save any working Compose file as a reusable template:

1. Go to **Templates > Custom**
2. Click **Add Custom Template**
3. Choose the template type that matches your environment (**Standalone / Podman** or **Swarm**)
4. Paste your Compose file or point Portainer at a Git repository
5. In Portainer BE, you can define variables using `{{ variable_name }}`

## Conclusion

Stack templates in Portainer combine the flexibility of Docker Compose with the simplicity of a template system. They are ideal for standardizing application deployments across teams and environments. Start with the built-in templates for common applications and build your own for internal services.
