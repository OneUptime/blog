# How to Self-Host a Wiki with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Wiki, Documentation, Home Lab

Description: Deploy a self-hosted wiki using Wiki.js or BookStack with Portainer for team documentation and knowledge management.

## Introduction

A self-hosted wiki gives your team a centralized place for documentation, procedures, and knowledge sharing - without sending sensitive information to third-party services. This guide covers deploying Wiki.js (a powerful modern wiki) and BookStack (a book-style documentation platform) using Portainer.

## Prerequisites

- Portainer installed and running
- A reverse proxy for HTTPS
- At least 2GB RAM available

## Option 1: Deploy Wiki.js

Wiki.js is a feature-rich wiki platform with git-based storage, LDAP authentication, and a beautiful editor.

### Step 1: Create the Stack

In Portainer, navigate to **Stacks** > **Add stack**:

```yaml
# docker-compose.yml - Wiki.js with PostgreSQL

version: "3.8"

networks:
  wiki_network:
    driver: bridge

volumes:
  wiki_db:
  wiki_data:

services:
  # PostgreSQL database
  wiki_db:
    image: postgres:15-alpine
    container_name: wiki_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=wiki
      - POSTGRES_USER=wiki
      - POSTGRES_PASSWORD=strong_password_here
    volumes:
      - wiki_db:/var/lib/postgresql/data
    networks:
      - wiki_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wiki"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Wiki.js application
  wikijs:
    image: ghcr.io/requarks/wiki:2
    container_name: wikijs
    restart: unless-stopped
    depends_on:
      wiki_db:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      # Database connection
      - DB_TYPE=postgres
      - DB_HOST=wiki_db
      - DB_PORT=5432
      - DB_NAME=wiki
      - DB_USER=wiki
      - DB_PASS=strong_password_here
    volumes:
      - wiki_data:/wiki/data
    networks:
      - wiki_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.wikijs.rule=Host(`wiki.yourdomain.com`)"
      - "traefik.http.routers.wikijs.entrypoints=websecure"
      - "traefik.http.routers.wikijs.tls.certresolver=letsencrypt"
      - "traefik.http.services.wikijs.loadbalancer.server.port=3000"
```

### Step 2: Configure Wiki.js

1. Access `http://server-ip:3000` after deployment
2. Complete the setup wizard with admin email and password
3. Configure storage under **Administration** > **Storage**:
   - Enable Git storage for version control
   - Configure your remote Git repository

### Step 3: Configure Git Sync (Optional but Recommended)

```yaml
# In Wiki.js admin panel > Storage > Git
# Settings to sync wiki content to a Git repo:
# - Authentication Type: SSH
# - Repository URL: git@github.com:youruser/wiki-content.git
# - Branch: main
# - SSH Private Key: (generate and paste)
# - Sync Direction: Bi-directional
# - Sync Schedule: Every 5 minutes
```

## Option 2: Deploy BookStack

BookStack is a simple, self-hosted platform for organising and storing information using a book/chapter/page structure.

```yaml
# docker-compose.yml - BookStack
version: "3.8"

networks:
  bookstack_network:
    driver: bridge

volumes:
  bookstack_db:
  bookstack_data:

services:
  # MariaDB database
  bookstack_db:
    image: mariadb:10.11
    container_name: bookstack_db
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=bookstack
      - MYSQL_USER=bookstack
      - MYSQL_PASSWORD=strong_password_here
    volumes:
      - bookstack_db:/var/lib/mysql
    networks:
      - bookstack_network
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5

  # BookStack application
  bookstack:
    image: lscr.io/linuxserver/bookstack:latest
    container_name: bookstack
    restart: unless-stopped
    depends_on:
      bookstack_db:
        condition: service_healthy
    ports:
      - "6875:80"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      # Application URL and encryption key (both required)
      - APP_URL=https://docs.yourdomain.com
      - APP_KEY=base64:generate_with_appkey_command
      # Database connection
      - DB_HOST=bookstack_db
      - DB_PORT=3306
      - DB_DATABASE=bookstack
      - DB_USER=bookstack
      - DB_PASS=strong_password_here
      # Mail settings
      - MAIL_HOST=smtp.gmail.com
      - MAIL_PORT=587
      - MAIL_FROM=noreply@yourdomain.com
      - MAIL_USERNAME=your-email@gmail.com
      - MAIL_PASSWORD=your-app-password
      - MAIL_ENCRYPTION=tls
    volumes:
      - bookstack_data:/config
    networks:
      - bookstack_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bookstack.rule=Host(`docs.yourdomain.com`)"
      - "traefik.http.routers.bookstack.entrypoints=websecure"
      - "traefik.http.routers.bookstack.tls.certresolver=letsencrypt"
      - "traefik.http.services.bookstack.loadbalancer.server.port=80"
```

## Step 3: Set Up LDAP Authentication (Enterprise)

For team wikis, connecting to LDAP/Active Directory centralizes authentication. Wiki.js does not expose LDAP settings through environment variables — configure it from the admin UI after the initial setup wizard:

1. Log in as the admin and open **Administration** > **Authentication**
2. Click **Add Strategy** and select **LDAP / Active Directory**
3. Fill in the strategy with values such as:
   - **LDAP URL**: `ldap://ldap.yourdomain.com:389`
   - **Admin Bind DN**: `cn=admin,dc=yourdomain,dc=com`
   - **Admin Bind Credentials**: the bind password
   - **Search Base**: `ou=users,dc=yourdomain,dc=com`
   - **Search Filter**: `(uid={{username}})`
4. Map the **Email**, **Display Name** and **Unique ID** fields to the appropriate LDAP attributes (e.g. `mail`, `cn`, `uid`), then **Apply** the strategy.

## Step 4: Backup and Restore

```bash
#!/bin/bash
# backup-wiki.sh - Backup Wiki.js or BookStack

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/wiki"
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL (Wiki.js)
docker exec wiki_db pg_dump -U wiki wiki | \
  gzip > "$BACKUP_DIR/wiki_db_$DATE.sql.gz"

# Backup uploaded files
tar -czf "$BACKUP_DIR/wiki_data_$DATE.tar.gz" \
  $(docker volume inspect wiki_data -f '{{ .Mountpoint }}')

echo "Wiki backup completed: $DATE"

# Rotate old backups (keep 14 days)
find "$BACKUP_DIR" -mtime +14 -delete
```

## Managing the Wiki in Portainer

### Key Portainer Features for Wikis
- **Automatic restarts**: Set `restart: unless-stopped` to recover from crashes
- **Environment variables**: Store database passwords securely using Portainer secrets
- **Log monitoring**: Check container logs for authentication errors or DB connection issues
- **Health checks**: Monitor container health status in the dashboard

### Using Portainer Secrets for Credentials

```yaml
# Using Portainer secrets instead of plain-text passwords
services:
  wiki_db:
    secrets:
      - db_password
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    external: true  # Create in Portainer > Secrets
```

## Conclusion

You now have a powerful self-hosted wiki running in Docker containers managed through Portainer. Wiki.js offers a modern editing experience with git-based version control, while BookStack provides an intuitive hierarchical structure for documentation. Both solutions give your team a private, fast, and fully controlled knowledge base. Use Portainer's update features to keep your wiki software current and maintain regular backups.
