# How to Deploy Ghost Blog via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Ghost, Blog, MySQL, Docker

Description: Learn how to deploy Ghost, the modern open-source publishing platform, via Portainer with MySQL persistence, automatic HTTPS via Traefik, and email configuration.

## What Is Ghost?

Ghost is a modern, open-source publishing platform built for professional bloggers and newsletters. It's faster and simpler than WordPress, with built-in membership and email subscription support.

## Ghost via Portainer Stack

**Stacks → Add Stack → ghost**

```yaml
version: "3.8"

services:
  ghost:
    image: ghost:6-alpine
    restart: unless-stopped
    environment:
      # URL (must match your domain exactly)
      - url=https://blog.yourdomain.com
      # MySQL database
      - database__client=mysql
      - database__connection__host=ghost-db
      - database__connection__user=${MYSQL_USER}
      - database__connection__password=${MYSQL_PASSWORD}
      - database__connection__database=${MYSQL_DATABASE}
      # Email (for notifications and newsletters)
      - mail__transport=SMTP
      - mail__from=Ghost Blog <noreply@yourdomain.com>
      - mail__options__service=Mailgun
      - mail__options__auth__user=${MAILGUN_USER}
      - mail__options__auth__pass=${MAILGUN_PASSWORD}
      # Optional: Mailgun domain
      # - mail__options__host=smtp.mailgun.org
      # - mail__options__port=587
    volumes:
      - ghost_content:/var/lib/ghost/content
    networks:
      - proxy
      - backend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ghost.rule=Host(`blog.yourdomain.com`)"
      - "traefik.http.routers.ghost.entrypoints=websecure"
      - "traefik.http.routers.ghost.tls.certresolver=letsencrypt"
      - "traefik.http.services.ghost.loadbalancer.server.port=2368"
    depends_on:
      ghost-db:
        condition: service_healthy

  ghost-db:
    image: mysql:8.0
    container_name: ghost-db
    restart: unless-stopped
    environment:
      - MYSQL_DATABASE=${MYSQL_DATABASE}
      - MYSQL_USER=${MYSQL_USER}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
    volumes:
      - ghost_db_data:/var/lib/mysql
    networks:
      - backend
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      retries: 5

volumes:
  ghost_content:
  ghost_db_data:

networks:
  proxy:
    external: true    # Traefik proxy network
  backend:
    driver: bridge    # Internal network for Ghost-DB communication
```

## Environment Variables

```text
MYSQL_DATABASE = ghost_production
MYSQL_USER = ghost_user
MYSQL_PASSWORD = ghost-db-password
MYSQL_ROOT_PASSWORD = root-password
MAILGUN_USER = postmaster@mg.yourdomain.com
MAILGUN_PASSWORD = mailgun-api-key-or-smtp-password
```

## First-Time Setup

1. Visit `https://blog.yourdomain.com/ghost` after deployment
2. Complete the setup wizard:
   - Blog title and description
   - Create admin account
   - Set up your theme

## Ghost Admin

The admin panel is at `https://blog.yourdomain.com/ghost`:

- Write and publish posts
- Manage members and subscriptions
- Configure newsletters
- Install themes
- View analytics

## Updating Ghost

```bash
# Via Portainer: Stacks > ghost > Editor

# Change: ghost:6-alpine → ghost:6.x.y-alpine (specific version)
# Click: Update the Stack

# Ghost will apply database migrations automatically on first start of new version
```

## Ghost CLI (ghost-cli) via Portainer Console

```bash
# Ghost CLI is not available in the Docker image
# But Node.js admin API is accessible:

# Via API - create a new post
curl -X POST "https://blog.yourdomain.com/ghost/api/admin/posts/" \
  -H "Authorization: Ghost ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"posts": [{"title": "My Post", "status": "draft"}]}'
```

## Ghost vs WordPress Comparison

| Feature | Ghost | WordPress |
|---------|-------|-----------|
| Focus | Publishing/newsletters | General CMS |
| Performance | Fast | Moderate |
| Plugins | Limited | 50,000+ |
| Built-in membership | Yes | Via plugins |
| Complexity | Simple | Complex |
| Resource usage | Light | Heavy |

## Backup Ghost

```bash
# Backup content volume (posts, images, themes)
docker run --rm \
  -v ghost_ghost_content:/source:ro \
  -v /backup:/backup \
  alpine tar czf /backup/ghost-content-$(date +%Y%m%d).tar.gz -C /source .

# Backup database
docker exec ghost-db mysqldump \
  -u root -p"${MYSQL_ROOT_PASSWORD}" ghost_production \
  > /backup/ghost-db-$(date +%Y%m%d).sql
```

## Conclusion

Ghost via Portainer is an excellent choice for professional blogs and newsletters. Its clean architecture - single Node.js process, MySQL backend, file-based content - makes it easy to manage, backup, and restore. Traefik handles HTTPS automatically, and Portainer simplifies version updates. Unlike WordPress, Ghost doesn't require plugin management for core functionality like memberships and email newsletters.
