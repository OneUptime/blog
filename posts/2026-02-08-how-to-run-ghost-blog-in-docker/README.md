# How to Run Ghost Blog in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Ghost, Blog, CMS, Docker Compose, Self-Hosted, Node.js, Publishing

Description: Deploy Ghost blog platform in Docker for a fast, modern publishing experience with built-in membership and newsletter features.

---

Ghost is a modern publishing platform built on Node.js. It provides a clean writing experience, built-in SEO features, membership management, newsletter delivery, and a theme system that produces fast, well-structured pages. Unlike WordPress, which evolved from a blog into a general-purpose CMS with thousands of plugins, Ghost stays focused on publishing and does it exceptionally well.

Running Ghost in Docker keeps the Node.js runtime contained and makes updates as simple as pulling a new image. This guide covers deploying Ghost with Docker Compose, connecting it to a MySQL database for production use, configuring email delivery, and managing the platform.

## Why Choose Ghost

Ghost is ideal when your primary need is content publishing. It excels at:

- Blog posts and long-form articles with a distraction-free editor
- Newsletter delivery built directly into the platform
- Paid memberships and subscriptions (Stripe integration)
- SEO optimization with structured data, sitemaps, and meta controls
- Fast page loads with server-side rendering and minimal JavaScript

The built-in membership system means you can run a paid newsletter or gated content site without third-party plugins or services like Mailchimp or Substack.

## Prerequisites

Docker and Docker Compose are required. Ghost is lightweight, using around 200-500 MB of RAM depending on traffic. MySQL is recommended for production (Ghost also supports SQLite for simple setups).

```bash
# Verify Docker installation
docker --version
docker compose version
```

## Quick Start with SQLite

For testing or personal blogs with light traffic, SQLite is the simplest option.

```bash
# Run Ghost with embedded SQLite storage
docker run -d \
  --name ghost \
  -p 2368:2368 \
  -v ghost-content:/var/lib/ghost/content \
  -e NODE_ENV=production \
  -e url=http://localhost:2368 \
  ghost:5-alpine
```

Open `http://localhost:2368` to see your blog. Navigate to `http://localhost:2368/ghost` to access the admin panel and create your account.

## Production Setup with Docker Compose

For production, use MySQL for better concurrency handling and data reliability.

```yaml
# docker-compose.yml - Ghost Blog with MySQL
version: "3.8"

services:
  ghost:
    image: ghost:5-alpine
    container_name: ghost
    restart: unless-stopped
    ports:
      - "2368:2368"
    volumes:
      # Persist themes, images, and configuration
      - ghost-content:/var/lib/ghost/content
    environment:
      NODE_ENV: production
      # Public URL where the blog will be accessible
      url: https://blog.yourdomain.com
      # MySQL database configuration
      database__client: mysql
      database__connection__host: ghost-mysql
      database__connection__port: 3306
      database__connection__user: ghost
      database__connection__password: ${MYSQL_PASSWORD}
      database__connection__database: ghost
      # Email configuration for newsletters and transactional emails
      mail__transport: SMTP
      mail__options__host: smtp.gmail.com
      mail__options__port: 587
      mail__options__auth__user: ${SMTP_USER}
      mail__options__auth__pass: ${SMTP_PASSWORD}
      mail__from: "Your Blog <noreply@yourdomain.com>"
    depends_on:
      ghost-mysql:
        condition: service_healthy

  ghost-mysql:
    image: mysql:8.0
    container_name: ghost-mysql
    restart: unless-stopped
    volumes:
      - ghost-mysql-data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ghost
      MYSQL_USER: ghost
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    command:
      - --default-authentication-plugin=mysql_native_password
      - --innodb-buffer-pool-size=128M
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  ghost-content:
  ghost-mysql-data:
```

Create the environment file.

```bash
# .env - Credentials for Ghost and MySQL
MYSQL_ROOT_PASSWORD=your-secure-root-password
MYSQL_PASSWORD=your-secure-ghost-password
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

Start the stack.

```bash
# Launch Ghost and MySQL
docker compose up -d

# Watch the startup logs
docker compose logs -f ghost
```

Visit `https://blog.yourdomain.com/ghost` to create your admin account and start configuring the blog.

## Configuring Email for Newsletters

Ghost's newsletter feature requires a bulk email service. For small lists (under 300 subscribers), SMTP works fine. For larger lists, Ghost recommends Mailgun.

```yaml
# Mailgun configuration for larger newsletter lists
environment:
  mail__transport: "SMTP"
  mail__options__service: "Mailgun"
  mail__options__host: "smtp.mailgun.org"
  mail__options__port: 587
  mail__options__secure: "false"
  mail__options__auth__user: "postmaster@mail.yourdomain.com"
  mail__options__auth__pass: "${MAILGUN_PASSWORD}"
  # Configure the bulk email service
  bulkEmail__provider: "mailgun"
  bulkEmail__mailgun__apiKey: "${MAILGUN_API_KEY}"
  bulkEmail__mailgun__domain: "mail.yourdomain.com"
  bulkEmail__mailgun__baseUrl: "https://api.mailgun.net/v3"
```

## Setting Up Membership and Subscriptions

Ghost has built-in support for free and paid memberships. Configure Stripe for paid subscriptions through the admin panel.

1. Go to Ghost Admin > Settings > Membership
2. Connect your Stripe account
3. Set up pricing tiers

Ghost handles the subscription flow, payment processing, and member management. Members can sign up on your site, and Ghost delivers newsletter emails to them based on their subscription tier.

## Custom Themes

Ghost themes are Handlebars templates. The default Casper theme works well, but you can install custom themes.

```bash
# Upload a theme through the Ghost admin panel
# Or mount a custom theme directory

# If developing locally, mount your theme into the container
volumes:
  - ./my-theme:/var/lib/ghost/content/themes/my-theme
```

Ghost also supports the Theme Marketplace where you can download free and premium themes.

## Ghost Content API

Ghost provides a Content API for building custom frontends (headless CMS approach) and a Admin API for managing content programmatically.

```bash
# Fetch published posts via the Content API
curl "https://blog.yourdomain.com/ghost/api/content/posts/?key=your-content-api-key&limit=5"

# Fetch a specific post by slug
curl "https://blog.yourdomain.com/ghost/api/content/posts/slug/my-first-post/?key=your-content-api-key"

# Fetch all tags
curl "https://blog.yourdomain.com/ghost/api/content/tags/?key=your-content-api-key"
```

Find your Content API key in Ghost Admin > Settings > Integrations > Custom integration.

For the Admin API (creating and updating posts programmatically), you need a different authentication approach.

```javascript
// ghost-admin-api.js - Create a post using the Ghost Admin API
const GhostAdminAPI = require('@tryghost/admin-api');

const api = new GhostAdminAPI({
    url: 'https://blog.yourdomain.com',
    key: 'your-admin-api-key',
    version: 'v5.0'
});

// Create a new post
api.posts.add({
    title: 'Automated Post',
    html: '<p>This post was created via the Admin API.</p>',
    status: 'draft'
}).then(post => {
    console.log('Created post:', post.title);
});
```

## Reverse Proxy with SSL

Put Ghost behind Traefik or Nginx for SSL termination.

```yaml
# Traefik labels for Ghost
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.ghost.rule=Host(`blog.yourdomain.com`)"
  - "traefik.http.routers.ghost.entrypoints=websecure"
  - "traefik.http.routers.ghost.tls.certresolver=letsencrypt"
  - "traefik.http.services.ghost.loadbalancer.server.port=2368"
```

Make sure the `url` environment variable matches your public domain, including the `https://` protocol. Ghost uses this URL to generate links, sitemaps, and email content.

## Backup Strategy

```bash
# Backup the MySQL database
docker exec ghost-mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" ghost > ghost-db-$(date +%Y%m%d).sql

# Backup Ghost content (themes, images, settings)
docker run --rm \
  -v ghost-content:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/ghost-content-$(date +%Y%m%d).tar.gz -C /source .
```

You can also export all content as JSON from Ghost Admin > Settings > Labs > Export content.

## Updating Ghost

```bash
# Pull the latest Ghost image
docker compose pull

# Recreate the container (Ghost runs migrations automatically)
docker compose up -d

# Check the logs for migration status
docker compose logs -f ghost
```

Always back up before updating. Ghost database migrations are generally smooth, but having a rollback option is essential.

## Performance Optimization

Ghost is fast by default, but you can squeeze more performance out of it.

```yaml
# Add a Redis cache for improved session handling (optional)
environment:
  # Enable caching headers
  caching__frontend__maxAge: 600
```

For high-traffic sites, consider putting a CDN like Cloudflare in front of Ghost to cache static assets and reduce server load.

## Summary

Ghost in Docker provides a polished, focused publishing platform that handles content creation, membership management, and newsletter delivery out of the box. The MySQL-backed Docker Compose setup gives you a production-ready foundation, and the Content API opens up headless CMS possibilities for custom frontends. For monitoring your Ghost instance, MySQL database health, and email delivery success rates, integrate with OneUptime to get proactive alerts before issues affect your readers.
