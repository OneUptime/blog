# How to Host Custom Portainer Templates on GitHub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, GitHub, DevOps

Description: Learn how to create and host a custom Portainer template catalog on GitHub for easy sharing and version control.

## Introduction

GitHub is the most convenient place to host custom Portainer templates. By storing your template JSON file and associated Compose files in a GitHub repository, you get free hosting, version control, pull request workflows, and a stable raw content URL for Portainer to fetch. This guide walks through the complete setup.

## Prerequisites

- A GitHub account (free tier works)
- Portainer CE or BE admin access
- Basic Git and GitHub familiarity

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and click **New repository**
2. Name it `portainer-templates` (or similar)
3. Set visibility to **Public** so Portainer can fetch the template catalog and stack repository without authentication
4. Initialize with a README
5. Click **Create repository**

## Step 2: Plan the Repository Structure

```text
portainer-templates/
├── README.md                     # Documentation
├── logos/
│   └── nginx.png
├── templates.json                # Main template definitions file
└── stacks/
    ├── wordpress/
    │   └── docker-compose.yml
    ├── monitoring/
    │   └── docker-compose.yml
    ├── nextcloud/
    │   └── docker-compose.yml
    └── gitea/
        └── docker-compose.yml
```

## Step 3: Create the Templates JSON File

Create `templates.json` at the repository root:

```json
{
  "version": "3",
  "templates": [
    {
      "id": 1,
      "type": 1,
      "title": "Nginx Web Server",
      "description": "High-performance web server and reverse proxy",
      "categories": ["webserver"],
      "platform": "linux",
      "logo": "https://raw.githubusercontent.com/myorg/portainer-templates/main/logos/nginx.png",
      "image": "nginx:alpine",
      "ports": [
        "80/tcp",
        "443/tcp"
      ],
      "volumes": [
        {
          "container": "/usr/share/nginx/html",
          "bind": "/data/www"
        },
        {
          "container": "/etc/nginx/conf.d"
        }
      ],
      "restart_policy": "unless-stopped"
    },
    {
      "id": 2,
      "type": 3,
      "title": "WordPress + MySQL",
      "description": "WordPress CMS with MySQL 8 database",
      "categories": ["CMS", "blog"],
      "platform": "linux",
      "logo": "https://portainer-io-assets.sfo2.digitaloceanspaces.com/logos/wordpress.png",
      "repository": {
        "url": "https://github.com/myorg/portainer-templates",
        "stackfile": "stacks/wordpress/docker-compose.yml"
      },
      "env": [
        {
          "name": "WORDPRESS_PORT",
          "label": "WordPress port",
          "default": "80"
        },
        {
          "name": "MYSQL_ROOT_PASSWORD",
          "label": "MySQL root password"
        },
        {
          "name": "MYSQL_PASSWORD",
          "label": "WordPress DB password"
        }
      ]
    },
    {
      "id": 3,
      "type": 3,
      "title": "Monitoring Stack",
      "description": "Prometheus + Grafana monitoring",
      "categories": ["monitoring", "observability"],
      "platform": "linux",
      "logo": "https://portainer-io-assets.sfo2.digitaloceanspaces.com/logos/prometheus.png",
      "repository": {
        "url": "https://github.com/myorg/portainer-templates",
        "stackfile": "stacks/monitoring/docker-compose.yml"
      },
      "env": [
        {
          "name": "GRAFANA_PASSWORD",
          "label": "Grafana admin password"
        },
        {
          "name": "GRAFANA_PORT",
          "label": "Grafana port",
          "default": "3000"
        }
      ]
    }
  ]
}
```

## Step 4: Create Compose Files for Stack Templates

Create `stacks/wordpress/docker-compose.yml`:

```yaml
version: "2"

services:
  wordpress:
    image: wordpress:latest
    ports:
      - "${WORDPRESS_PORT:-80}:80"
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: ${MYSQL_PASSWORD}
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wordpress-data:/var/www/html
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    restart: unless-stopped

volumes:
  wordpress-data:
  mysql-data:
```

## Step 5: Commit and Push

```bash
# Clone the repository

git clone https://github.com/myorg/portainer-templates.git
cd portainer-templates

# Create the directory structure
mkdir -p stacks/wordpress stacks/monitoring

# Add your files
# ... (add templates.json and compose files)

# Commit and push
git add .
git commit -m "Add initial template catalog"
git push origin main
```

## Step 6: Get the Raw Content URL

GitHub provides direct raw file access via:

```text
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
```

For your templates file:

```text
https://raw.githubusercontent.com/myorg/portainer-templates/main/templates.json
```

## Step 7: Configure Portainer to Use Your Templates

1. In Portainer, go to **Settings**
2. Find **App Templates URL**
3. Enter your raw GitHub URL:

```text
https://raw.githubusercontent.com/myorg/portainer-templates/main/templates.json
```

4. Click **Save settings**
5. Verify your templates appear in **App Templates**

## Step 8: Keep Templates Updated

Portainer fetches the template catalog URL when loading the **App Templates** list, so after you push changes, refresh **App Templates** in Portainer to load the latest version.

```bash
# Update a Compose file
vim stacks/monitoring/docker-compose.yml

# Add a new template to templates.json
vim templates.json

# Push changes
git add .
git commit -m "Update monitoring stack, add Alertmanager"
git push origin main
# Refresh App Templates in Portainer to load the updated version
```

## Private Repository Access

For GitHub-hosted app templates, use a public repository.

Portainer's app template format expects `repository.url` to point to a public Git repository, and the **App Templates URL** setting only accepts a URL. If you need private Git access, use a different publishing method that exposes the files over unauthenticated HTTPS, or deploy stacks from Git directly in Portainer instead of through app templates.

## Versioning Your Templates

Tag stable releases for production environments:

```bash
git tag -a v1.0.0 -m "Stable template release 1.0.0"
git push origin v1.0.0
```

Use the tagged URL in production Portainer:

```text
https://raw.githubusercontent.com/myorg/portainer-templates/v1.0.0/templates.json
```

## Conclusion

GitHub is an excellent platform for hosting Portainer templates. The free raw content CDN, version control, and pull request workflow make it easy to maintain and share template catalogs. Set up your repository, create a well-structured `templates.json`, and configure Portainer to point to it for an easily updated template catalog.
