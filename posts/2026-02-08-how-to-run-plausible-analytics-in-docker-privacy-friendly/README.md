# How to Run Plausible Analytics in Docker (Privacy-Friendly)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Plausible Analytics, Privacy, Web Analytics, Docker Compose, Self-Hosted, GDPR

Description: Deploy Plausible Analytics in Docker for privacy-friendly, cookie-free web analytics that comply with GDPR without consent banners.

---

Google Analytics is powerful, but it comes with baggage. Cookie consent banners, complex privacy policies, data being sent to Google's servers, and a bloated tracking script that slows down your pages. Plausible Analytics takes a different approach. It provides clean, useful web analytics without cookies, without personal data collection, and without needing consent banners under GDPR, CCPA, or PECR.

Self-hosting Plausible in Docker gives you all these privacy benefits while keeping your analytics data entirely on your own infrastructure. The tracking script is lightweight, so it has negligible impact on page load times. This guide covers deploying Plausible with Docker Compose, configuring it for your sites, and getting the most out of its features.

## Why Self-Host Plausible

Plausible offers a hosted service at plausible.io, which is a great option if you want zero maintenance. But self-hosting gives you several advantages:

- Complete data ownership, nothing leaves your servers
- No monthly subscription fees (the hosted plan starts at $9/month)
- No usage limits beyond your server's capacity
- Full control over data retention policies
- Can run on an internal network for intranet analytics

## Prerequisites

Docker and Docker Compose are required. Plausible uses ClickHouse for analytics data storage, which benefits from at least 2 GB of RAM and a CPU with SSE 4.2 or NEON support. A small VPS or dedicated server works well.

```bash
# Verify Docker installation

docker --version
docker compose version
```

## Setting Up Plausible with Docker Compose

Plausible's self-hosted version requires three services: the Plausible web application, a PostgreSQL database for user accounts and site configuration, and a ClickHouse database for analytics event storage.

Clone the official Community Edition repository or create the configuration from scratch.

```yaml
# docker-compose.yml - Plausible Analytics self-hosted
services:
  plausible:
    image: ghcr.io/plausible/community-edition:v3.2.1
    container_name: plausible
    restart: unless-stopped
    command: sh -c "/entrypoint.sh db createdb && /entrypoint.sh db migrate && /entrypoint.sh run"
    ports:
      - "8000:8000"
    volumes:
      - plausible-data:/var/lib/plausible
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
    environment:
      TMPDIR: /var/lib/plausible/tmp
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
    image: clickhouse/clickhouse-server:24.12-alpine
    container_name: plausible-clickhouse
    restart: unless-stopped
    volumes:
      - plausible-clickhouse-data:/var/lib/clickhouse
      - plausible-clickhouse-logs:/var/log/clickhouse-server
      # ClickHouse configuration for Plausible
      - ./clickhouse/logs.xml:/etc/clickhouse-server/config.d/logs.xml:ro
      - ./clickhouse/ipv4-only.xml:/etc/clickhouse-server/config.d/ipv4-only.xml:ro
      - ./clickhouse/low-resources.xml:/etc/clickhouse-server/config.d/low-resources.xml:ro
      - ./clickhouse/default-profile-low-resources-overrides.xml:/etc/clickhouse-server/users.d/default-profile-low-resources-overrides.xml:ro
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    environment:
      CLICKHOUSE_SKIP_USER_SETUP: "1"
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 -O - http://127.0.0.1:8123/ping || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  plausible-postgres-data:
  plausible-clickhouse-data:
  plausible-clickhouse-logs:
  plausible-data:
```

Create the ClickHouse configuration files to reduce log verbosity.

```xml
<!-- clickhouse/logs.xml - Reduce ClickHouse logging -->
<clickhouse>
    <logger>
        <level>warning</level>
        <console>true</console>
    </logger>

    <query_log replace="1">
        <database>system</database>
        <table>query_log</table>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
        <engine>
            ENGINE = MergeTree
            PARTITION BY event_date
            ORDER BY (event_time)
            TTL event_date + interval 30 day
            SETTINGS ttl_only_drop_parts=1
        </engine>
    </query_log>

    <metric_log remove="remove" />
    <asynchronous_metric_log remove="remove" />
    <query_thread_log remove="remove" />
    <text_log remove="remove" />
    <trace_log remove="remove" />
    <session_log remove="remove" />
    <part_log remove="remove" />
</clickhouse>
```

```xml
<!-- clickhouse/ipv4-only.xml - Bind ClickHouse to IPv4 inside Docker -->
<clickhouse>
    <listen_host>0.0.0.0</listen_host>
</clickhouse>
```

```xml
<!-- clickhouse/low-resources.xml - Lower ClickHouse memory use on small servers -->
<clickhouse>
    <mark_cache_size>524288000</mark_cache_size>
</clickhouse>
```

```xml
<!-- clickhouse/default-profile-low-resources-overrides.xml - User-level resource settings -->
<clickhouse>
    <profiles>
        <default>
            <max_threads>1</max_threads>
            <max_block_size>8192</max_block_size>
            <max_download_threads>1</max_download_threads>
            <input_format_parallel_parsing>0</input_format_parallel_parsing>
            <output_format_parallel_formatting>0</output_format_parallel_formatting>
        </default>
    </profiles>
</clickhouse>
```

Create the environment file.

```bash
# .env - Sensitive configuration

# Generate with: openssl rand -base64 48
SECRET_KEY_BASE=your-64-byte-secret-key-base

# Generate with: openssl rand -base64 32
TOTP_VAULT_KEY=your-base64-totp-vault-key

POSTGRES_PASSWORD=your-secure-postgres-password
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

Generate the required secrets.

```bash
# Generate SECRET_KEY_BASE (must be at least 64 bytes)
openssl rand -base64 48

# Generate TOTP_VAULT_KEY (32 random bytes, base64 encoded)
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

Plausible's tracking script is lightweight and privacy-respecting. Add it to the `<head>` section of your website.

```html
<!-- Plausible Analytics tracking script - lightweight, no cookies -->
<script defer data-domain="yourdomain.com" src="https://analytics.yourdomain.com/js/script.js"></script>
```

For enhanced features like outbound link tracking, file download tracking, and form submission tracking, enable optional measurements in the site settings or initialize the script with the relevant options.

```html
<!-- Extended tracking with outbound links, file downloads, and form submissions -->
<script defer data-domain="yourdomain.com" src="https://analytics.yourdomain.com/js/script.js"></script>
<script>
  window.plausible = window.plausible || function() {
    (window.plausible.q = window.plausible.q || []).push(arguments)
  }
  plausible.init({
    outboundLinks: true,
    fileDownloads: true,
    formSubmissions: true
  })
</script>
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
    proxy_http_version 1.1;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
}
```

Then update your tracking script to use the proxied paths.

```html
<script defer data-domain="yourdomain.com" src="/js/script.js"></script>
<script>
  window.plausible = window.plausible || function() {
    (window.plausible.q = window.plausible.q || []).push(arguments)
  }
  plausible.init({
    endpoint: "/api/event"
  })
</script>
```

## Using the Stats API

Plausible provides an API for pulling analytics data programmatically.

```bash
# Get overall stats for a site
curl --request POST \
  --header "Authorization: Bearer your-api-key" \
  --header "Content-Type: application/json" \
  --url "https://analytics.yourdomain.com/api/v2/query" \
  --data '{ "site_id": "yourdomain.com", "metrics": ["visitors"], "date_range": "24h" }'

# Get aggregate stats for a time period
curl --request POST \
  --header "Authorization: Bearer your-api-key" \
  --header "Content-Type: application/json" \
  --url "https://analytics.yourdomain.com/api/v2/query" \
  --data '{ "site_id": "yourdomain.com", "metrics": ["visitors", "pageviews", "bounce_rate", "visit_duration"], "date_range": "30d" }'

# Get top pages
curl --request POST \
  --header "Authorization: Bearer your-api-key" \
  --header "Content-Type: application/json" \
  --url "https://analytics.yourdomain.com/api/v2/query" \
  --data '{ "site_id": "yourdomain.com", "metrics": ["visitors"], "date_range": "7d", "dimensions": ["event:page"], "pagination": { "limit": 10 } }'
```

## Importing Existing Google Analytics Data

If you are migrating from Google Analytics, Plausible can import your historical GA4 data. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then go to the site settings in Plausible and use the Google Analytics import feature to link your Google account and select the property to import.

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

Plausible Analytics in Docker gives you privacy-friendly web analytics without the complexity and privacy concerns of Google Analytics. The lightweight tracking script, cookie-free operation, and GDPR compliance out of the box mean you can add analytics to any site without consent banners. Self-hosting keeps your data under your control, and the ClickHouse backend handles millions of events efficiently. Monitor the stack with OneUptime to catch any ClickHouse or PostgreSQL issues before they affect your analytics data collection.
