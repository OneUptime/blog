# How to Deploy Bookstack via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, BookStack, Wiki, Documentation, Self-Hosted

Description: Deploy Bookstack via Portainer as a self-hosted wiki and documentation platform with a book/chapter/page hierarchy for organized knowledge management.

## Introduction

Bookstack is an opinionated, self-hosted wiki platform organized around books, chapters, and pages - just like a real bookshelf. It's simpler than MediaWiki or Confluence while being more structured than flat wikis. Deploy via Portainer for team documentation, personal knowledge bases, or project wikis.

## Deploy as a Stack

```yaml
services:
  bookstack:
    image: lscr.io/linuxserver/bookstack:latest
    container_name: bookstack
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - APP_URL=http://<host>:8080
      - APP_KEY=base64:your_generated_app_key
      - DB_HOST=bookstack-db
      - DB_PORT=3306
      - DB_DATABASE=bookstack
      - DB_USERNAME=bookstack
      - DB_PASSWORD=bookstack_db_password
      # Email settings
      - MAIL_DRIVER=smtp
      - MAIL_HOST=smtp.example.com
      - MAIL_PORT=587
      - MAIL_FROM=bookstack@example.com
      - MAIL_USERNAME=bookstack@example.com
      - MAIL_PASSWORD=smtp_password
      - MAIL_ENCRYPTION=tls
    volumes:
      - bookstack_data:/config
    ports:
      - "8080:80"
    depends_on:
      - bookstack-db
    restart: unless-stopped

  bookstack-db:
    image: mariadb:10.11
    container_name: bookstack-db
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: bookstack
      MYSQL_USER: bookstack
      MYSQL_PASSWORD: bookstack_db_password
    volumes:
      - bookstack_db:/var/lib/mysql
    restart: unless-stopped

volumes:
  bookstack_data:
  bookstack_db:
```

Generate `APP_KEY` with `docker run -it --rm --entrypoint /bin/bash lscr.io/linuxserver/bookstack:latest appkey` and paste the returned value into `APP_KEY`.

## Initial Access

Navigate to `http://<host>:8080`.

Default credentials:
- Email: `admin@admin.com`
- Password: `password`

**Change these immediately** via **My Account > Edit Profile**.

## Organizing Knowledge in Bookstack

Bookstack uses a hierarchy:

```text
📚 Shelves (optional top-level grouping)
  📖 Books (main containers)
    📑 Chapters (sections within books)
      📄 Pages (actual content)
```

Example structure for a company wiki:

```bash
📚 Company Knowledge Base
  📖 Engineering
    📑 Infrastructure
      📄 Docker Setup Guide
      📄 Kubernetes Deployment
    📑 Development
      📄 Coding Standards
      📄 Git Workflow
  📖 HR
    📑 Onboarding
      📄 Day 1 Guide
      📄 Benefits Overview
```

## Configuring SSO (OIDC)

```yaml
environment:
  # OIDC with Keycloak or Authentik
  - AUTH_METHOD=oidc
  - OIDC_NAME=Company SSO
  - OIDC_DISPLAY_NAME_CLAIMS=name
  - OIDC_CLIENT_ID=bookstack
  - OIDC_CLIENT_SECRET=your_client_secret
  - OIDC_ISSUER=https://auth.example.com/realms/company
  - OIDC_USER_TO_GROUPS=true
  - OIDC_GROUPS_CLAIM=groups
```

## Backup Bookstack

```bash
# Backup configuration (includes uploads)

docker run --rm \
  -v bookstack_data:/source \
  -v /backups:/backup \
  alpine tar czf /backup/bookstack-$(date +%Y%m%d).tar.gz /source

# Backup database
docker exec bookstack-db mysqldump \
  -u bookstack -pbookstack_db_password bookstack \
  > /backups/bookstack-db-$(date +%Y%m%d).sql
```

## Conclusion

Bookstack deployed via Portainer provides a structured, easy-to-navigate documentation platform. Its book/chapter/page hierarchy imposes useful organization discipline while remaining simple enough for non-technical users. The built-in search, drawing tools, and Markdown support make it versatile for both technical and non-technical documentation needs.
