# How to Use Application Templates in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, DevOps

Description: Learn how to use Portainer's built-in and custom application templates to quickly deploy containers and stacks.

## Introduction

Portainer's Application Templates feature provides a catalog of pre-configured containers and stacks that you can deploy with just a few clicks. Templates eliminate the need to remember complex Docker commands or write Compose files from scratch for common applications. This guide covers how to find, configure, and deploy using Portainer templates.

## Prerequisites

- Portainer CE or BE installed and running
- At least one Docker environment connected
- Internet access to pull images (or images pre-cached locally)

## Understanding Template Types

Portainer supports two types of templates:

1. **Container templates** - Deploy a single container with pre-set configuration
2. **Stack templates** - Deploy a multi-service application using a Compose file

Both types can include variables that you fill in before deploying, such as passwords, port numbers, or volume paths.

## Step 1: Access the Templates Catalog

1. Log in to Portainer
2. Select your Docker environment
3. Expand **Templates**, then click **Application** in the left sidebar

If you're using Portainer's default built-in templates, the catalog includes popular applications like:

- Nginx, Httpd
- MySQL, PostgreSQL, Mongo, Redis
- WordPress, Ghost
- Swarm monitoring (Prometheus + Grafana)
- Portainer Agent

## Step 2: Browse and Search Templates

Use the search bar to find templates by name, or use the available category and Type filters to narrow the list:

- Type `wordpress` to filter WordPress-related templates
- Use the category filter to focus on templates such as `database`
- Use the **Type** dropdown to show only container or stack templates

Each template card shows:

- Application name and logo
- Short description
- Template type (container or stack)

## Step 3: Deploy a Container Template

1. Click on a container template (e.g., **Nginx**)
2. The configuration panel expands with options:

```text
Name:        nginx-web          # Container name
Port mapping: 8080:80           # Host:Container port
Volume:      /data/www:/usr/share/nginx/html   # Optional volume
Network:     bridge             # Network to attach
Restart policy: Unless stopped
```

3. Fill in any required variables (marked with an asterisk)
4. Click **Deploy the container**

## Step 4: Deploy a Stack Template

1. Click on a stack template (e.g., **WordPress**)
2. Configure the stack settings. For the built-in WordPress template, this includes:

```text
Stack name:             my-wordpress
Database root password: [your-secure-password]
```

3. Click **Deploy the stack**

Portainer creates all services defined in the template's Compose file with your provided values.

## Step 5: View Deployed Resources

After deployment:

- **Container templates** → Appear in the **Containers** list
- **Stack templates** → Appear in the **Stacks** list with all services grouped

## Built-in Template Examples

### Nginx Template (Container)

Deploys a basic Nginx web server. Variables typically include the port mapping and optional document root volume.

### WordPress + MySQL Stack

```yaml
# Underlying template Compose file (simplified)

version: "2"
services:
  db:
    image: mysql:5.7
    environment:
      MYSQL_ROOT_PASSWORD: "${MYSQL_DATABASE_PASSWORD}"
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
    volumes:
      - db_data:/var/lib/mysql
    restart: always
  wordpress:
    image: wordpress:latest
    ports:
      - 80
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
    restart: always
volumes:
  db_data:
```

### Redis Template (Container)

Deploys Redis with optional port exposure and persistence volume.

## Customizing Templates Before Deploy

Most templates allow you to customize:

- **Exposed ports** - Change host-side port to avoid conflicts
- **Volume paths** - Point to your preferred data directory
- **Environment variables** - Set passwords, config values
- **Network** - Choose which Docker network to join

## Adding Custom Templates

If the built-in templates don't cover your needs, you can:

1. Add a custom template URL under **Settings** → **General** → **App Templates**
2. Create your own templates via the **Custom Templates** section
3. Use community template collections like Lissy93's templates

## Conclusion

Portainer's Application Templates feature dramatically speeds up deploying common applications. Instead of researching Docker run commands or writing Compose files, you select a template, fill in a few variables, and deploy. Start with the built-in catalog and extend it with custom templates as your needs grow.
