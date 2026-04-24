# How to Configure the App Templates URL in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Configuration, DevOps

Description: Learn how to configure a custom App Templates URL in Portainer to replace or supplement the default template catalog.

## Introduction

By default, Portainer loads its application template catalog from the official Portainer templates repository. However, you can configure a custom URL to load your own template definitions instead. This enables organizations to maintain a private template catalog with internal applications or curated community templates.

## Prerequisites

- Portainer CE or BE with admin access
- A hosted JSON template file reachable by the Portainer Server instance (on GitHub, a web server, or internal service)
- Understanding of the Portainer template JSON format

## Understanding the Template URL

Portainer fetches template definitions from a URL that returns a JSON file in the following format:

```json
{
  "version": "3",
  "templates": [
    {
      "id": 1,
      "type": 1,
      "title": "My Container App",
      "description": "Internal application template",
      "image": "registry.company.com/myapp:latest"
    }
  ]
}
```

The default URL points to:
```text
https://raw.githubusercontent.com/portainer/templates/v3/templates.json
```

## Step 1: Navigate to Settings

1. Log in to Portainer as an administrator
2. Click **Settings** in the left sidebar (gear icon)
3. Scroll to the **App Templates** section

## Step 2: Locate the App Templates URL Field

You will see:

```text
App Templates URL
[https://raw.githubusercontent.com/portainer/templates/v3/templates.json]
```

This is the currently configured URL.

## Step 3: Change the Template URL

1. Clear the existing URL
2. Enter your custom template URL

Examples:

```text
# GitHub raw URL

https://raw.githubusercontent.com/myorg/portainer-templates/main/templates.json

# Internal web server
http://templates.internal.company.com/portainer-templates.json

# Gitea raw file
https://gitea.company.com/ops/templates/raw/branch/main/templates.json

# AWS S3 public bucket
https://mybucket.s3.us-east-1.amazonaws.com/portainer-templates.json
```

## Step 4: Save the Settings

1. Click **Save settings**
2. Navigate to **Templates** > **Application** to verify the new templates load correctly

## Step 5: Verify Templates Load

1. Go to an environment compatible with the template type in your JSON file
2. Click **Templates** and then **Application**
3. You should see templates from your custom URL that apply to that environment
4. The built-in catalog will be replaced by the contents of your custom URL

## Template JSON Format Reference

Here is the complete structure for a template definition:

```json
{
  "version": "3",
  "templates": [
    {
      "id": 1,
      "type": 1,
      "title": "Nginx",
      "description": "Web server and reverse proxy",
      "categories": ["webserver"],
      "platform": "linux",
      "logo": "https://example.com/nginx-logo.png",
      "image": "nginx:alpine",
      "ports": ["80/tcp", "443/tcp"],
      "volumes": [
        {
          "container": "/usr/share/nginx/html",
          "bind": "/data/www"
        },
        {
          "container": "/etc/nginx"
        }
      ],
      "env": [
        {
          "name": "NGINX_PORT",
          "label": "Port",
          "default": "80"
        }
      ],
      "restart_policy": "unless-stopped",
      "labels": [
        {
          "name": "com.example.app",
          "value": "nginx"
        }
      ]
    },
    {
      "id": 2,
      "type": 2,
      "title": "WordPress",
      "description": "WordPress CMS with MySQL",
      "categories": ["CMS"],
      "platform": "linux",
      "logo": "https://example.com/wp-logo.png",
      "repository": {
        "url": "https://github.com/myorg/templates",
        "stackfile": "stacks/wordpress/docker-stack.yml"
      },
      "env": [
        {
          "name": "MYSQL_ROOT_PASSWORD",
          "label": "MySQL root password"
        },
        {
          "name": "WORDPRESS_PORT",
          "label": "WordPress port",
          "default": "80"
        }
      ]
    }
  ]
}
```

## Combining Default and Custom Templates

Portainer currently allows only one template URL. To combine the default Portainer templates with your own:

1. Download the official templates file:

```bash
curl -o templates.json \
  https://raw.githubusercontent.com/portainer/templates/v3/templates.json
```

2. Edit the file to add your custom templates to the `templates` array
3. Host the combined file on your own server
4. Configure Portainer to use your hosted URL

## Hosting the Template File

### Option A: GitHub Pages

```bash
# In your templates repository, enable GitHub Pages
# Place templates.json in the /docs folder or root
# Access via: https://myorg.github.io/portainer-templates/templates.json
```

### Option B: Simple Python Web Server (for testing)

```bash
# Host locally for testing
python3 -m http.server 8000 --directory /path/to/templates/

# Access at: http://your-host-ip:8000/templates.json
```

### Option C: Nginx Docker Container

```bash
# Quick template server
docker run -d \
  --name template-server \
  -p 8080:80 \
  -v /path/to/templates:/usr/share/nginx/html:ro \
  nginx:alpine
```

## Resetting to Default

To restore the default Portainer templates:

1. Go to **Settings**
2. Enter the original URL:

```text
https://raw.githubusercontent.com/portainer/templates/v3/templates.json
```

3. Save settings

## Conclusion

Configuring a custom App Templates URL gives you complete control over the template catalog presented to your users. Organizations can maintain internal application templates, curate a custom selection from the community, or combine internal and public templates in a single catalog. This is a powerful feature for standardizing deployments across teams.
