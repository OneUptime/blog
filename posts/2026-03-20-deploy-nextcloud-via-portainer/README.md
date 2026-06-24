# How to Deploy Nextcloud via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nextcloud, Self-Hosting, Docker, Cloud Storage, Docker Compose

Description: Learn how to deploy Nextcloud, the open-source cloud storage platform, using Portainer's stack deployment feature with a production-ready Docker Compose configuration.

---

Nextcloud is a self-hosted alternative to Google Drive and Dropbox. Running it via Portainer gives you a visual dashboard to manage the container, inspect logs, and control restarts without touching the command line.

## Prerequisites

- Portainer installed and running
- At least 2GB RAM and 20GB disk space
- A domain or local hostname for Nextcloud

## Stack Deployment

In Portainer, navigate to **Stacks > Add Stack**, give it a name like `nextcloud`, and paste the following Compose definition.

The stack uses a MariaDB database backend and stores both database files and Nextcloud data in named Docker volumes so data persists across container restarts:

```yaml
# docker-compose.yml for Nextcloud

services:
  db:
    image: mariadb:10.11
    restart: always
    command: --transaction-isolation=READ-COMMITTED  # Required for Nextcloud on MariaDB
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword   # Change this
      MYSQL_DATABASE: nextcloud
      MYSQL_USER: nextcloud
      MYSQL_PASSWORD: nextcloudpass       # Change this
    volumes:
      - db_data:/var/lib/mysql

  nextcloud:
    image: nextcloud:33
    restart: always
    ports:
      - "8080:80"          # Access Nextcloud on host port 8080
    depends_on:
      - db
    environment:
      MYSQL_HOST: db
      MYSQL_DATABASE: nextcloud
      MYSQL_USER: nextcloud
      MYSQL_PASSWORD: nextcloudpass       # Must match db service
      NEXTCLOUD_ADMIN_USER: admin
      NEXTCLOUD_ADMIN_PASSWORD: adminpass # Change this
    volumes:
      - nextcloud_data:/var/www/html      # Main Nextcloud volume
      - nextcloud_config:/var/www/html/config  # Local configuration

volumes:
  db_data:
  nextcloud_data:
  nextcloud_config:
```

## Deploying the Stack

1. Open Portainer and go to **Stacks > Add Stack**.
2. Set the stack name to `nextcloud`.
3. Paste the Compose YAML above into the web editor.
4. Click **Deploy the stack**.

Portainer will pull both images, create the volumes, and start the containers in dependency order. Note that `depends_on` only controls startup order and does not wait for MariaDB to be fully ready.

## Post-Installation

Once running, open `http://<host>:8080` in a browser. The first load may take 30–60 seconds for database initialization.

To enable HTTPS, place Nextcloud behind a reverse proxy such as Nginx or Traefik. Configure trusted domains and, if needed, reverse-proxy overwrite settings in Nextcloud's `config.php` or via environment variables:

```yaml
# Add to nextcloud service environment
environment:
  NEXTCLOUD_TRUSTED_DOMAINS: nextcloud.example.com
  OVERWRITEPROTOCOL: https
  OVERWRITECLIURL: https://nextcloud.example.com
```

## Monitoring with OneUptime

After deployment, add an API monitor in OneUptime pointing to `http://<host>:8080/status.php`. This endpoint returns a JSON status object with fields such as `installed`, `maintenance`, and `needsDbUpgrade`. Set an alert if the response code is not 200, if the response body does not contain `"installed":true`, if it contains `"maintenance":true`, or if it contains `"needsDbUpgrade":true`.

## Updating Nextcloud

In Portainer, navigate to the stack, click **Editor**, update the image tag one major version at a time, and redeploy. Portainer will pull the new image, stop the old container, and start the updated one while leaving volumes intact. If the new container logs warn that image-specific files in `/var/www/html/config` are outdated, compare or copy the updated files from `/usr/src/nextcloud/config` as documented by the official Nextcloud image.
