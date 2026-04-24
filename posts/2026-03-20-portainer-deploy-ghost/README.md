# How to Deploy Ghost Blog via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Ghost, Blog, CMS, Self-Hosted

Description: Deploy Ghost blog platform via Portainer with MySQL, persistent content storage, and email newsletter configuration for a modern, professional publishing platform.

## Introduction

Ghost is a modern, open-source publishing platform focused on professional blogging and newsletters. It's faster and leaner than WordPress, with built-in membership and newsletter features. Deploying via Portainer with MySQL gives you a solid self-hosted Ghost instance.

## Deploy as a Stack

```yaml
services:
  ghost:
    image: ghost:6-alpine
    container_name: ghost
    environment:
      # URL - change to your site URL. Use https:// behind a TLS reverse proxy.
      url: http://ghost.example.com
      
      # Database
      database__client: mysql
      database__connection__host: ghost-db
      database__connection__port: 3306
      database__connection__database: ghost
      database__connection__user: ghost
      database__connection__password: ghost_password
      
      # Transactional email (Mailgun SMTP example)
      mail__transport: SMTP
      mail__from: noreply@example.com
      mail__options__host: smtp.mailgun.org
      mail__options__port: 587
      mail__options__auth__user: postmaster@mg.example.com
      mail__options__auth__pass: mailgun_password
      
      # Security
      NODE_ENV: production
    volumes:
      - ghost_content:/var/lib/ghost/content
    ports:
      - "2368:2368"
    depends_on:
      ghost-db:
        condition: service_healthy
    restart: unless-stopped

  ghost-db:
    image: mysql:8.4
    container_name: ghost-db
    environment:
      MYSQL_DATABASE: ghost
      MYSQL_USER: ghost
      MYSQL_PASSWORD: ghost_password
      MYSQL_ROOT_PASSWORD: root_password
    volumes:
      - ghost_db:/var/lib/mysql
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "ghost", "-pghost_password"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  ghost_content:
  ghost_db:
```

## Accessing Ghost

- **Blog**: `http://<host>:2368`
- **Admin**: `http://<host>:2368/ghost`

Complete the setup wizard to create your admin account.

## Configuring Membership and Newsletter

In Ghost Admin:

1. Navigate to **Settings > Membership > Access**
2. Enable member signups
3. Configure paid tiers if needed
4. Set up Stripe for payments (optional)

The stack environment variables above configure Ghost's standard SMTP mail transport for member sign-in and other transactional emails. For bulk newsletter delivery on self-hosted Ghost, go to **Settings > Membership > Email newsletter** and configure Mailgun API keys.

## Ghost with Traefik

```yaml
services:
  ghost:
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik-public"
      - "traefik.http.routers.ghost.rule=Host(`blog.example.com`)"
      - "traefik.http.routers.ghost.entrypoints=websecure"
      - "traefik.http.routers.ghost.tls.certresolver=letsencrypt"
      - "traefik.http.services.ghost.loadbalancer.server.port=2368"
    networks:
      - traefik-public
      - default

networks:
  traefik-public:
    external: true
```

## Custom Theme Deployment

```bash
# Copy a custom theme to Ghost

docker cp ./my-theme ghost:/var/lib/ghost/content/themes/my-theme

# Restart to load theme
docker restart ghost

# In Ghost Admin: Settings > Site > Theme > Change theme, then activate the copied theme from Installed
```

## Backup Ghost Content

```bash
# Backup content directory
docker run --rm \
  -v ghost_content:/source \
  -v /backups:/backup \
  alpine tar czf /backup/ghost-content-$(date +%Y%m%d).tar.gz /source

# Backup database
docker exec ghost-db mysqldump \
  -u ghost -pghost_password ghost \
  > /backups/ghost-db-$(date +%Y%m%d).sql

# Export content via Ghost Admin
# Settings > Advanced > Import/Export > Export (JSON)
```

## Conclusion

Ghost deployed via Portainer provides a clean, modern publishing platform that's significantly lighter than WordPress. The built-in membership and newsletter features make it excellent for content creators who want to monetize their audience. Persistent volumes for both content and database ensure your posts, themes, and member data are preserved across updates.
