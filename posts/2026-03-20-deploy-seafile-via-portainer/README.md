# How to Deploy Seafile via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Seafile, Self-Hosting, Docker, File Sync, Docker Compose

Description: Learn how to deploy Seafile, the high-performance file synchronization and sharing platform, using Portainer's stack deployment with MariaDB and Memcached.

---

Seafile offers fast file sync with built-in encryption and team collaboration features. Unlike Nextcloud it focuses purely on file storage, giving it better performance for large datasets. This guide deploys the community edition via Portainer.

## Prerequisites

- Portainer running on a host with at least 2GB RAM
- Port 8081 available on the host, or ports 80/443 if you plan to place Seafile behind a reverse proxy
- A hostname or domain name for the `SEAFILE_SERVER_HOSTNAME` variable

## Compose Stack

In Portainer go to **Stacks > Add Stack**. Paste the following YAML. This example uses MariaDB plus a Memcached instance for caching:

```yaml
services:
  db:
    image: mariadb:10.11
    container_name: seafile-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: db_root_password      # Change this
      MYSQL_LOG_CONSOLE: "true"
    volumes:
      - seafile_db:/var/lib/mysql

  memcached:
    image: memcached:1.6-alpine
    container_name: seafile-memcached
    restart: unless-stopped
    # Allocate 256MB to Memcached
    command:
      - --memory-limit=256

  seafile:
    image: seafileltd/seafile-mc:13.0-latest
    container_name: seafile
    restart: unless-stopped
    ports:
      - "8081:80"
    depends_on:
      - db
      - memcached
    volumes:
      - seafile_data:/shared
    environment:
      SEAFILE_MYSQL_DB_HOST: db
      SEAFILE_MYSQL_DB_USER: seafile
      SEAFILE_MYSQL_DB_PASSWORD: seafile_db_password     # Change this
      INIT_SEAFILE_MYSQL_ROOT_PASSWORD: db_root_password # Must match db service
      TIME_ZONE: UTC
      INIT_SEAFILE_ADMIN_EMAIL: admin@example.com
      INIT_SEAFILE_ADMIN_PASSWORD: adminpass             # Change this
      SEAFILE_SERVER_HOSTNAME: seafile.example.com:8081
      SEAFILE_SERVER_PROTOCOL: http
      JWT_PRIVATE_KEY: change-this-to-a-random-32-character-string
      CACHE_PROVIDER: memcached
      MEMCACHED_HOST: memcached
      MEMCACHED_PORT: 11211

volumes:
  seafile_db:
  seafile_data:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name the stack `seafile` and paste the YAML above.
3. Update `SEAFILE_SERVER_HOSTNAME`, `JWT_PRIVATE_KEY`, and the placeholder passwords before deploying.
4. Click **Deploy the stack**.

Initialization takes about 60 seconds. Watch progress in **Containers > seafile > Logs**.

## Configuring HTTPS

For production, place Seafile behind an Nginx or Traefik reverse proxy and set:

```yaml
SEAFILE_SERVER_HOSTNAME: seafile.example.com
SEAFILE_SERVER_PROTOCOL: https
```

## Monitoring

Use OneUptime to create an HTTP monitor on `http://<host>:8081/`. A `200` or `302` response from the web interface confirms Seafile is operational. Add an alert for response times above 5 seconds to catch slowdowns early.
