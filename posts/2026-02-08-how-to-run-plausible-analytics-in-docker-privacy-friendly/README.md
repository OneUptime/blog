# How to Run Plausible Analytics in Docker (Privacy-Friendly)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Plausible Analytics, Privacy, Web Analytics, Docker Compose, Self-Hosted, GDPR

Description: Deploy Plausible Analytics in Docker for privacy-friendly, cookie-free web analytics that comply with GDPR without consent banners.

---

Google Analytics is powerful, but it comes with baggage. Cookie consent banners, complex privacy policies, data being sent to Google's servers, and a bloated tracking script that slows down your pages. Plausible Analytics takes a different approach. It provides clean, useful web analytics without cookies, without personal data collection, and without needing consent banners under GDPR, CCPA, or PECR.

Self-hosting Plausible in Docker gives you all these privacy benefits while keeping your analytics data entirely on your own infrastructure. The tracking script is under 1 KB, so it has negligible impact on page load times. This guide covers deploying Plausible with Docker Compose, configuring it for your sites, and getting the most out of its features.

## Why Self-Host Plausible

Plausible offers a hosted service at plausible.io, which is a great option if you want zero maintenance. But self-hosting gives you several advantages:

- Complete data ownership, nothing leaves your servers
- No monthly subscription fees (the hosted plan starts at $9/month)
- No usage limits beyond your server's capacity
- Full control over data retention policies
- Can run on an internal network for intranet analytics

## Prerequisites

Docker and Docker Compose are required. Plausible uses ClickHouse for analytics data storage, which benefits from at least 2 GB of RAM. A small VPS or dedicated server works well.

```bash
# Verify Docker installation
docker --version
docker compose version
```

## Setting Up Plausible with Docker Compose

Plausible's self-hosted version requires three services: the Plausible web application, a PostgreSQL database for user accounts and site configuration, and a ClickHouse database for analytics event storage.

Clone the official hosting repository or create the configuration from scratch.

```yaml
# docker-compose.yml - Plausible Analytics self-hosted
version: "3.8"

services:
  plausible:
    image: ghcr.io/plausible/community-edition:v2.1
    container_name: plausible
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      # Base URL where Plausible will be accessible
      BASE_URL: https://analytics.yourdomain.com
      # Secret key for session encryption (generate with openssl)
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      # TOTP vault key for two-factor authentication
      TOTP_VAULT_KEY: ${TOTP_VAULT_KEY}
      # Database connection
      DATABASE_URL: postgres://plausible:${POSTGRES_PASSWORD}@plausible-postgres:5432/plausible
      # ClickHouse connection
      CLICKHOUSE_DATABASE_URL: http://plausible-clickhouse:8123/plausible_events
      # Email configuration
      MAILER_EMAIL: plausible@yourdomain.com
      SMTP_HOST_ADDR: smtp.gmail.com
      SMTP_HOST_PORT: 587
      SMTP_USER_NAME: ${SMTP_USER}
      SMTP_USER_PWD: ${SMTP_PASSWORD}
      SMTP_HOST_SSL_ENABLED: "false"
      SMTP_RETRIES: 2
      # Disable registration after creating your account
      DISABLE_REGISTRATION: invite_only
    depends_on:
      plausible-postgres:
        condition: service_healthy
      plausible-clickhouse:
        condition: service_healthy

  plausible-postgres:
    image: postgres:16-alpine
    container_name: plausible-postgres
    restart: unless-stopped
    volumes:
      - plausible-postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: plausible
      POSTGRES_USER: plausible
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U plausible"]
      interval: 10s
      timeout: 5s
      retries: 5

  plausible-clickhouse:
    image: clickhouse/clickhouse-server:24.3-alpine
    container_name: plausible-clickhouse
    restart: unless-stopped
    volumes:
      - plausible-clickhouse-data:/var/lib/clickhouse
      # ClickHouse configuration for Plausible
      - ./clickhouse-config.xml:/etc/clickhouse-server/config.d/logging.xml:ro
      - ./clickhouse-user-config.xml:/etc/clickhouse-server/users.d/logging.xml:ro
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8123/ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  plausible-postgres-data:
  plausible-clickhouse-data:
```

Create the ClickHouse configuration files to reduce log verbosity.

```xml
<!-- clickhouse-config.xml - Reduce ClickHouse logging -->
<clickhouse>
    <logger>
        <level>warning</level>
        <console>true</console>
    </logger>
    <query_thread_log remove="remove"/>
    <query_log remove="remove"/>
    <text_log remove="remove"/>
    <trace_log remove="remove"/>
    <metric_log remove="remove"/>
    <asynchronous_metric_log remove="remove"/>
    <session_log remove="remove"/>
    <part_log remove="remove"/>
</clickhouse>
```

```xml
<!-- clickhouse-user-config.xml - User-level logging settings -->
<clickhouse>
    <profiles>
        <default>
            <log_queries>0</log_queries>
            <log_query_threads>0</log_query_threads>
        </default>
    </profiles>
</clickhouse>
```

Create the environment file.

```bash
# .env - Sensitive configuration

# Generate with: openssl rand -base64 48
SECRET_KEY_BASE=your-64-char-secret-key-base

# Generate with: openssl rand -base64 32
TOTP_VAULT_KEY=your-32-char-totp-vault-key

POSTGRES_PASSWORD=your-secure-postgres-password
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

Generate the required secrets.

```bash
# Generate SECRET_KEY_BASE (must be at least 64 characters)
openssl rand -base64 48

# Generate TOTP_VAULT_KEY (must be exactly 32 bytes, base64 encoded)
openssl rand -base64 32
```

Start the stack.

```bash
# Launch all services
docker compose up -d

# Watch the startup and migration logs
docker compose logs -f plausible
```

## Initial Configuration

After the first startup, navigate to `http://your-server-ip:8000` and create your admin account. Then add your first website:

1. Click "Add a website"
2. Enter your domain name
3. Copy the tracking script snippet

## Adding the Tracking Script

Plausible's tracking script is tiny and privacy-respecting. Add it to the `<head>` section of your website.

```html
<!-- Plausible Analytics tracking script - under 1 KB, no cookies -->
<script defer data-domain="yourdomain.com" src="https://analytics.yourdomain.com/js/script.js"></script>
```

For enhanced features like outbound link tracking, file download tracking, and 404 error tracking, use the extended script variants.

```html
<!-- Extended tracking with outbound links, file downloads, and custom events -->
<script defer data-domain="yourdomain.com" src="https://analytics.yourdomain.com/js/script.outbound-links.file-downloads.tagged-events.js"></script>
```

## Tracking Custom Events

Plausible supports custom event tracking for actions like button clicks, form submissions, and sign-ups.

```javascript
// Track a custom event when a user clicks a signup button
document.getElementById('signup-btn').addEventListener('click', function() {
    plausible('Signup', {props: {plan: 'Pro', source: 'homepage'}});
});

// Track a form submission
document.getElementById('contact-form').addEventListener('submit', function() {
    plausible('Contact Form', {props: {department: 'Sales'}});
});
```

## Proxy the Tracking Script

Some ad blockers block analytics scripts. You can proxy the Plausible script through your own domain to avoid this.

For Nginx:

```nginx
# Nginx config to proxy the Plausible tracking script
location = /js/script.js {
    proxy_pass https://analytics.yourdomain.com/js/script.js;
    proxy_set_header Host analytics.yourdomain.com;
}

location = /api/event {
    proxy_pass https://analytics.yourdomain.com/api/event;
    proxy_set_header Host analytics.yourdomain.com;
    proxy_buffering on;
}
```

Then update your tracking script to use the proxied paths.

```html
<script defer data-domain="yourdomain.com" data-api="/api/event" src="/js/script.js"></script>
```

## Using the Stats API

Plausible provides an API for pulling analytics data programmatically.

```bash
# Get overall stats for a site
curl -H "Authorization: Bearer your-api-key" \
  "https://analytics.yourdomain.com/api/v1/stats/realtime/visitors?site_id=yourdomain.com"

# Get aggregate stats for a time period
curl -H "Authorization: Bearer your-api-key" \
  "https://analytics.yourdomain.com/api/v1/stats/aggregate?site_id=yourdomain.com&period=30d&metrics=visitors,pageviews,bounce_rate,visit_duration"

# Get top pages
curl -H "Authorization: Bearer your-api-key" \
  "https://analytics.yourdomain.com/api/v1/stats/breakdown?site_id=yourdomain.com&period=7d&property=event:page&limit=10"
```

## Importing Existing Google Analytics Data

If you are migrating from Google Analytics, Plausible can import your historical data. Go to the site settings in Plausible and use the Google Analytics import feature, which reads from a Google Analytics export file.

## Backup Strategy

Back up both databases regularly.

```bash
# Backup PostgreSQL (user accounts and site settings)
docker exec plausible-postgres pg_dump -U plausible plausible > plausible-pg-$(date +%Y%m%d).sql

# Backup ClickHouse data volume (analytics events)
docker run --rm \
  -v plausible-clickhouse-data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/plausible-ch-$(date +%Y%m%d).tar.gz -C /source .
```

## Reverse Proxy with SSL

For production, put Plausible behind a reverse proxy with SSL.

```yaml
# Traefik labels for Plausible
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.plausible.rule=Host(`analytics.yourdomain.com`)"
  - "traefik.http.routers.plausible.entrypoints=websecure"
  - "traefik.http.routers.plausible.tls.certresolver=letsencrypt"
  - "traefik.http.services.plausible.loadbalancer.server.port=8000"
```

## Summary

Plausible Analytics in Docker gives you privacy-friendly web analytics without the complexity and privacy concerns of Google Analytics. The sub-1KB tracking script, cookie-free operation, and GDPR compliance out of the box mean you can add analytics to any site without consent banners. Self-hosting keeps your data under your control, and the ClickHouse backend handles millions of events efficiently. Monitor the stack with OneUptime to catch any ClickHouse or PostgreSQL issues before they affect your analytics data collection.
