# How to Deploy Seafile via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Seafile, Cloud Storage, Self-Hosted, File Sync

Description: Deploy Seafile via Portainer as a high-performance self-hosted file sync and share solution with end-to-end encryption support and desktop client integration.

## Introduction

Seafile is a high-performance, reliable file sync and share platform. It offers client-side encrypted libraries, fast syncing, and native clients for major platforms. Deploying via Portainer with MariaDB gives you a production-ready file storage solution.

## Deploy as a Stack

```yaml
services:
  seafile:
    image: seafileltd/seafile-mc:13.0-latest
    container_name: seafile
    environment:
      SEAFILE_MYSQL_DB_HOST: seafile-db
      SEAFILE_MYSQL_DB_PORT: 3306
      SEAFILE_MYSQL_DB_USER: seafile
      SEAFILE_MYSQL_DB_PASSWORD: seafile_db_password
      INIT_SEAFILE_MYSQL_ROOT_PASSWORD: db_root_password
      SEAFILE_MYSQL_DB_CCNET_DB_NAME: ccnet_db
      SEAFILE_MYSQL_DB_SEAFILE_DB_NAME: seafile_db
      SEAFILE_MYSQL_DB_SEAHUB_DB_NAME: seahub_db
      INIT_SEAFILE_ADMIN_EMAIL: admin@example.com
      INIT_SEAFILE_ADMIN_PASSWORD: admin_password
      SEAFILE_SERVER_HOSTNAME: seafile.example.com
      SEAFILE_SERVER_PROTOCOL: http
      TIME_ZONE: America/New_York
      JWT_PRIVATE_KEY: change-this-jwt-private-key
      CACHE_PROVIDER: memcached
      MEMCACHED_HOST: memcached
      MEMCACHED_PORT: 11211
      ENABLE_SEADOC: "false"
    volumes:
      - seafile_data:/shared
    ports:
      - "80:80"
    depends_on:
      seafile-db:
        condition: service_healthy
      memcached:
        condition: service_started
    restart: unless-stopped

  seafile-db:
    image: mariadb:10.11
    container_name: seafile-db
    environment:
      MYSQL_ROOT_PASSWORD: db_root_password
      MYSQL_LOG_CONSOLE: "true"
      MARIADB_AUTO_UPGRADE: "1"
    volumes:
      - seafile_db:/var/lib/mysql
    restart: unless-stopped
    healthcheck:
      test:
        [
          "CMD",
          "/usr/local/bin/healthcheck.sh",
          "--connect",
          "--mariadbupgrade",
          "--innodb_initialized",
        ]
      interval: 20s
      start_period: 30s
      timeout: 5s
      retries: 10

  # Memcached is still supported, though Redis is now the default in Seafile 13.
  memcached:
    image: memcached:1.6-alpine
    container_name: seafile-memcached
    command: memcached -m 256
    restart: unless-stopped

volumes:
  seafile_data:
  seafile_db:
```

## Initial Configuration

After deployment, access Seafile at `http://<host>:80`.

Log in with your admin credentials and configure:

1. **System Settings**: Verify the service URL matches the hostname configured in the stack
2. **Libraries**: Create your first encrypted library
3. **Users**: Invite team members

## Seafile CLI Configuration

```bash
# Access Seafile container

docker exec -it seafile /bin/bash

# Check service status inside the container
cd /opt/seafile/seafile-server-latest
./seafile.sh status
./seahub.sh status

# Add or reset an admin account
./reset-admin.sh
```

## Enabling HTTPS with Nginx Proxy

Before redeploying behind Nginx, change `SEAFILE_SERVER_PROTOCOL` to `https` in the Seafile service and redeploy the stack.

```yaml
services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./seafile-nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
    ports:
      - "443:443"
    depends_on:
      - seafile
```

Nginx configuration (`seafile-nginx.conf`):

```nginx
server {
    listen 443 ssl;
    server_name seafile.example.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://seafile:80;
        proxy_read_timeout 310s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
        client_max_body_size 0;
    }
}
```

## Desktop Client Setup

Download Seafile desktop client from `https://www.seafile.com/en/download/`:

1. Install on Windows, Mac, or Linux
2. Add server: `https://seafile.example.com`
3. Log in with your account
4. Select libraries to sync

## Backup Strategy

```bash
# Backup databases first
docker exec seafile-db mariadb-dump -uroot -pdb_root_password --opt ccnet_db \
  > /backups/ccnet_db-$(date +%Y%m%d).sql
docker exec seafile-db mariadb-dump -uroot -pdb_root_password --opt seafile_db \
  > /backups/seafile_db-$(date +%Y%m%d).sql
docker exec seafile-db mariadb-dump -uroot -pdb_root_password --opt seahub_db \
  > /backups/seahub_db-$(date +%Y%m%d).sql

# Backup the Seafile data volume
docker run --rm \
  -v seafile_data:/source:ro \
  -v /backups:/backup \
  alpine \
  tar czf /backup/seafile-data-$(date +%Y%m%d).tar.gz -C /source .
```

## Conclusion

Seafile deployed via Portainer provides a fast, reliable file sync platform that works well for large libraries and many small files alike. Its sync engine and deduplicated block storage make it a practical fit for design assets, video files, and software repositories. Client-side encrypted libraries provide strong privacy guarantees for sensitive file contents.
