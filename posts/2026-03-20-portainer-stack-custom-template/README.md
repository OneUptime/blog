# How to Create a Stack from a Custom Template in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Template, DevOps

Description: Learn how to create reusable custom app templates in Portainer that teams can deploy with one click and customizable parameters.

## Introduction

Portainer's Custom Templates let you define reusable Docker Compose configurations that team members can deploy with a single click, filling in only the values that change between deployments. Custom templates are ideal for standardizing how your team deploys common services - databases, monitoring stacks, web applications - ensuring consistency and reducing the chance of misconfiguration. This feature is available in Portainer Business Edition (BE).

## Prerequisites

- Portainer Business Edition (BE) installed
- Admin or appropriate role to create templates
- A Docker Compose YAML to use as the template

## Step 1: Navigate to Custom Templates

1. Log into Portainer.
2. In the left menu, expand **Templates** and select **Custom**.
3. Click **Add Custom Template**.

## Step 2: Define the Template Metadata

Fill in the template details:

```text
Title:       WordPress with MySQL
Description: Deploys WordPress CMS with a MySQL 8 database and persistent volumes

Note:        Change DB_PASSWORD and DB_ROOT_PASSWORD before deploying to production
Logo:        https://cdn.example.com/wordpress-logo.png  (optional)
Platform:    linux
Type:        Standalone / Podman (or Swarm)
```

## Step 3: Write the Template Compose Content

In the **Web editor** tab, enter the Compose YAML:

```yaml
# Custom template: WordPress + MySQL

services:
  wordpress:
    image: "wordpress:{{ WORDPRESS_VERSION }}"
    restart: unless-stopped
    ports:
      - "{{ WP_PORT }}:80"
    networks:
      - wp-net
    environment:
      WORDPRESS_DB_HOST: mysql
      WORDPRESS_DB_NAME: "{{ DB_NAME }}"
      WORDPRESS_DB_USER: "{{ DB_USER }}"
      WORDPRESS_DB_PASSWORD: "{{ DB_PASSWORD }}"
    volumes:
      - wp_content:/var/www/html/wp-content

  mysql:
    image: mysql:8
    restart: unless-stopped
    networks:
      - wp-net
    environment:
      MYSQL_DATABASE: "{{ DB_NAME }}"
      MYSQL_USER: "{{ DB_USER }}"
      MYSQL_PASSWORD: "{{ DB_PASSWORD }}"
      MYSQL_ROOT_PASSWORD: "{{ DB_ROOT_PASSWORD }}"
    volumes:
      - mysql_data:/var/lib/mysql

networks:
  wp-net:
    driver: bridge

volumes:
  wp_content:
  mysql_data:
```

Portainer custom templates use `{{ VARIABLE_NAME }}` placeholders for variables. When Portainer detects a variable, it lets you configure the label, description, and default value in the UI.

## Step 4: Configure Template Variables

When Portainer detects the placeholders above, configure the variables it finds so users know what to enter at deploy time:

| Name | Label | Default | Description |
|------|-------|---------|-------------|
| `WORDPRESS_VERSION` | WordPress Image Tag | `latest` | WordPress image tag to deploy |
| `WP_PORT` | WordPress Port | `8080` | Host port for WordPress |
| `DB_NAME` | Database Name | `wordpress` | MySQL database name |
| `DB_USER` | Database User | `wpuser` | MySQL application user |
| `DB_PASSWORD` | Database Password | _(empty)_ | MySQL application user password |
| `DB_ROOT_PASSWORD` | DB Root Password | _(empty)_ | MySQL root password |

## Step 5: Save and Deploy from Template

1. Click **Create custom template**.
2. The template appears in the **Templates** → **Custom** section.

To deploy from the template:
1. Navigate to **Templates** → **Custom**.
2. Click the template card.
3. Fill in the variable values.
4. Enter a stack name.
5. Click **Deploy the stack**.

## Step 6: Publish App Templates via URL

If you want a centrally managed template catalog rather than per-instance custom templates, Portainer can load **App Templates** from an external JSON file:

```json
{
  "version": "2",
  "templates": [
    {
      "type": 3,
      "title": "WordPress with MySQL",
      "description": "WordPress CMS with MySQL 8 database",
      "categories": ["CMS", "Database"],
      "platform": "linux",
      "logo": "https://cdn.example.com/wordpress.png",
      "repository": {
        "url": "https://github.com/myorg/portainer-templates",
        "stackfile": "wordpress/docker-compose.yml"
      },
      "env": [
        {
          "name": "WP_PORT",
          "label": "WordPress Port",
          "default": "8080"
        },
        {
          "name": "DB_PASSWORD",
          "label": "Database Password"
        }
      ]
    }
  ]
}
```

The `env` names must match the variables used by the Compose file in that repository. Configure the template URL in Portainer:
1. Navigate to **Settings** → **App Templates**.
2. Set the URL to your JSON template file.
3. Save. Templates load from the URL.

## Step 7: Organize Templates by Category

In app-template JSON, use categories to group related templates:

```text
"categories": ["Database", "Storage"]
"categories": ["Monitoring", "Observability"]
"categories": ["Web", "Proxy"]
"categories": ["Development", "Tools"]
```

## Conclusion

Custom templates in Portainer BE enable self-service deployments while maintaining standards. Define the Compose YAML once, expose the values that vary (passwords, ports, image tags) as `{{ }}` variables, and team members can deploy correctly configured stacks without knowing Docker Compose syntax. If you need a shared catalog across multiple Portainer instances, use Portainer's separate App Templates feature with a hosted JSON definition URL.
