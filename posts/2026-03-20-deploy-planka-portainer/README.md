# How to Deploy Planka (Trello Alternative) via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Planka, Kanban, Docker, Self-Hosted

Description: Deploy Planka open-source Kanban board using Portainer as a self-hosted Trello alternative for project management.

## Introduction

Planka is a fast, self-hosted Kanban board built with React and Node.js, backed by PostgreSQL. It is a self-hosted alternative to Trello with boards, lists, cards, labels, members, and real-time updates.

## Prerequisites

- Portainer installed with Docker

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Planka

services:
  planka:
    image: ghcr.io/plankanban/planka:latest
    container_name: planka
    restart: unless-stopped
    ports:
      - "1337:1337"
    volumes:
      - planka_user_avatars:/app/public/user-avatars
      - planka_project_background_images:/app/public/project-background-images
      - planka_attachments:/app/private/attachments
    environment:
      - DATABASE_URL=postgresql://planka:${DB_PASSWORD}@planka_postgres/planka
      - SECRET_KEY=${SECRET_KEY}
      - BASE_URL=${BASE_URL}
      - DEFAULT_ADMIN_EMAIL=${ADMIN_EMAIL}
      - DEFAULT_ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - DEFAULT_ADMIN_NAME=Admin
      - DEFAULT_ADMIN_USERNAME=admin
    depends_on:
      planka_postgres:
        condition: service_healthy
    networks:
      - planka_net

  planka_postgres:
    image: postgres:16-alpine
    container_name: planka_postgres
    restart: unless-stopped
    volumes:
      - planka_postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=planka
      - POSTGRES_USER=planka
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U planka"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - planka_net

volumes:
  planka_user_avatars:
  planka_project_background_images:
  planka_attachments:
  planka_postgres_data:

networks:
  planka_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
DB_PASSWORD=your-postgres-password
SECRET_KEY=your-random-128-char-hex-secret
BASE_URL=http://your-server-ip-or-domain:1337
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-admin-password
```

Generate a secret key:
```bash
openssl rand -hex 64
```

## Step 3: Access Planka

Open the URL you set in `BASE_URL` and log in with the email and password you set in `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Step 4: Create a Project and Board

1. Click **Create project**
2. Add lists (e.g., "To Do", "In Progress", "Done")
3. Create cards within lists
4. Add labels, due dates, and assign members

## Step 5: Backup Planka Data

```bash
# Backup PostgreSQL database
docker exec planka_postgres pg_dump -U planka -d planka > planka_backup.sql

# Backup user avatars
docker run --rm --volumes-from planka -v "$(pwd)":/backup alpine \
  tar czf /backup/planka_user_avatars.tar.gz -C /app/public/user-avatars .

# Backup project background images
docker run --rm --volumes-from planka -v "$(pwd)":/backup alpine \
  tar czf /backup/planka_project_background_images.tar.gz -C /app/public/project-background-images .

# Backup file attachments
docker run --rm --volumes-from planka -v "$(pwd)":/backup alpine \
  tar czf /backup/planka_attachments.tar.gz -C /app/private/attachments .
```

## Conclusion

Planka stores all board data in PostgreSQL and files in Docker volumes. The `SECRET_KEY` is used for session signing - if changed, all existing sessions are invalidated. The `BASE_URL` must match the URL you use to access Planka, as it is used for email notifications and avatar generation.
