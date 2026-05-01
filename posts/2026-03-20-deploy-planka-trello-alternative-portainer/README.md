# How to Deploy Planka (Trello Alternative) via Portainer - Trello Alternative

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Planka, Trello, Kanban, Portainer, Docker, Self-Hosted, Project Management

Description: Deploy Planka as a self-hosted Trello alternative using Portainer for project boards, cards, and team collaboration.

---

This guide covers deploying this self-hosted productivity application via Portainer with persistent data storage and proper configuration.

## Deploy via Portainer Stack

Navigate to **Stacks > Add Stack** in Portainer and use the following configuration, replacing the placeholder `BASE_URL`, `SECRET_KEY`, and password values before deploying:

```yaml
services:
  planka:
    image: ghcr.io/plankanban/planka:latest
    environment:
      - BASE_URL=http://your-server-ip:3000
      - DATABASE_URL=postgresql://planka:change-this-postgres-password@postgres:5432/planka
      - SECRET_KEY=replace-with-openssl-rand-hex-64
      - DEFAULT_ADMIN_EMAIL=admin@example.com
      - DEFAULT_ADMIN_PASSWORD=change-this-admin-password
      - DEFAULT_ADMIN_NAME=Planka Admin
      - DEFAULT_ADMIN_USERNAME=admin
    volumes:
      - data:/app/data
    ports:
      - "3000:1337"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-net

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: planka
      POSTGRES_USER: planka
      POSTGRES_PASSWORD: change-this-postgres-password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U planka -d planka"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-net

volumes:
  data:
  postgres-data:

networks:
  app-net:
    driver: bridge
```

## Configuration

After deployment, access the application at the `BASE_URL` you configured and sign in with the `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` values from the stack:

1. Configure your workspace or organization settings
2. Invite team members via the admin panel
3. Configure email notifications (SMTP settings)
4. Remove the `DEFAULT_ADMIN_*` values from the stack after the first successful startup if you do not want them enforced

## Key Features

This application provides:

- **Kanban boards / Project tracking** - visual workflow management
- **Team collaboration** - assign tasks and track progress
- **Labels and categories** - organize work by type or priority
- **Due dates and deadlines** - time-based task management
- **Comments and attachments** - rich context on each task

## Backup and Restore

Replace the placeholder container and volume names with the actual names from your Portainer stack, then back up the application data:

```bash
# Backup PostgreSQL database

docker exec <postgres_container_name> pg_dump -U planka planka > planka-backup-$(date +%Y%m%d).sql

# Backup application files
docker run --rm \
  -v <planka_data_volume_name>:/data:ro \
  -v /opt/backups:/backups \
  alpine tar czf "/backups/planka-data-$(date +%Y%m%d).tar.gz" -C /data .
```

## Summary

This self-hosted productivity tool deployed via Portainer gives your team a private, data-owned alternative to SaaS project management platforms. Portainer handles the container lifecycle, and PostgreSQL provides reliable persistent storage for all project data.
