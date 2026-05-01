# How to Deploy Vikunja (Task Manager) via Portainer - Task Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vikunja, Task Manager, Portainer, Docker, To-Do, Self-Hosted, Productivity

Description: Deploy Vikunja open-source task management application via Portainer as a self-hosted alternative to Todoist and Microsoft To-Do.

---

This guide covers deploying this self-hosted productivity application via Portainer with persistent data storage and proper configuration.

## Deploy via Portainer Stack

Navigate to **Stacks > Add Stack** in Portainer and use the following configuration:

```yaml
services:
  app:
    image: vikunja/vikunja
    environment:
      VIKUNJA_SERVICE_PUBLICURL: "http://<your-server-ip-or-domain>:3456/"
      VIKUNJA_DATABASE_HOST: postgres
      VIKUNJA_DATABASE_PASSWORD: password
      VIKUNJA_DATABASE_TYPE: postgres
      VIKUNJA_DATABASE_USER: app
      VIKUNJA_DATABASE_DATABASE: appdb
      VIKUNJA_SERVICE_SECRET: "<your-random-secret>"
    volumes:
      - app-data:/app/vikunja/files
    ports:
      - "3456:3456"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-net

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h localhost -U $$POSTGRES_USER"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-net

volumes:
  app-data:
  postgres-data:

networks:
  app-net:
    driver: bridge
```

## Configuration

After deployment, access the application at `http://<your-server-ip-or-domain>:3456` and complete the initial setup:

1. Register the first user account
2. Create your first project or team
3. Share projects with other users or teams after they create accounts
4. If you need email notifications, add the appropriate `VIKUNJA_MAILER_*` settings to the stack

## Key Features

This application provides:

- **Kanban boards / Project tracking** - visual workflow management
- **Team collaboration** - assign tasks and track progress
- **Labels and filters** - organize work across projects
- **Due dates and deadlines** - time-based task management
- **Comments and attachments** - rich context on each task

## Backup and Restore

Backup the application data:

```bash
# Backup PostgreSQL database

docker exec <postgres-container-name> pg_dump -U app appdb > backup-$(date +%Y%m%d).sql

# Backup Vikunja attachment files
docker run --rm \
  -v app-data:/data:ro \
  -v /opt/backups:/backups \
  alpine tar czf "/backups/app-data-$(date +%Y%m%d).tar.gz" /data
```

## Summary

This self-hosted productivity tool deployed via Portainer gives your team a private, data-owned alternative to SaaS project management platforms. Portainer handles the container lifecycle, and PostgreSQL provides reliable persistent storage for all project data.
