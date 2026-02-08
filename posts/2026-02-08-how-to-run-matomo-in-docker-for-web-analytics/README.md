# How to Run Matomo in Docker for Web Analytics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Matomo, Web Analytics, Privacy, Docker Compose, Self-Hosted, Google Analytics Alternative

Description: Deploy Matomo in Docker as a full-featured, self-hosted Google Analytics alternative with complete data ownership and privacy controls.

---

Matomo (formerly Piwik) is the most established open-source web analytics platform available. It has been around since 2007 and provides a feature set that rivals Google Analytics, including real-time analytics, custom dashboards, e-commerce tracking, heatmaps, session recordings, A/B testing, and full-funnel analysis. The critical difference is that you own all the data. Nothing gets sent to third parties.

Running Matomo in Docker makes the deployment straightforward, even though the application itself has more moving parts than lighter alternatives like Umami or Plausible. This guide covers deploying Matomo with Docker Compose, configuring it for production workloads, and integrating it with your websites.

## When to Choose Matomo

Matomo is the right choice when you need analytics features beyond basic page views and referrers. If you need goal tracking, e-commerce conversion funnels, custom dimensions, tag management, or detailed visitor profiles, Matomo delivers all of that. It is also the go-to choice for organizations with strict data residency requirements, since the data never leaves your infrastructure.

The trade-off compared to simpler tools is complexity. Matomo requires MySQL/MariaDB, benefits from a cron job for report archiving, and its tracking script is larger. For simple blogs and landing pages, Umami or Plausible might be better fits. For serious business analytics, Matomo is the answer.

## Prerequisites

Docker and Docker Compose are required. Matomo benefits from at least 2 GB of RAM, and sites with heavy traffic should plan for more. Disk space needs grow with your data retention period and traffic volume.

```bash
# Verify Docker installation
docker --version
docker compose version
```

## Docker Compose Setup

Matomo needs a web server (the official image includes Apache), a MariaDB database, and optionally a Redis cache for improved performance.

```yaml
# docker-compose.yml - Matomo Analytics with MariaDB
version: "3.8"

services:
  matomo:
    image: matomo:5-apache
    container_name: matomo
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      # Persist Matomo configuration and plugins
      - matomo-data:/var/www/html
    environment:
      MATOMO_DATABASE_HOST: matomo-mariadb
      MATOMO_DATABASE_ADAPTER: mysql
      MATOMO_DATABASE_TABLES_PREFIX: matomo_
      MATOMO_DATABASE_USERNAME: matomo
      MATOMO_DATABASE_PASSWORD: ${MARIADB_PASSWORD}
      MATOMO_DATABASE_DBNAME: matomo
    depends_on:
      matomo-mariadb:
        condition: service_healthy

  matomo-mariadb:
    image: mariadb:11
    container_name: matomo-mariadb
    restart: unless-stopped
    volumes:
      - matomo-mariadb-data:/var/lib/mysql
    environment:
      MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD}
      MARIADB_DATABASE: matomo
      MARIADB_USER: matomo
      MARIADB_PASSWORD: ${MARIADB_PASSWORD}
    command:
      # Optimized MariaDB settings for Matomo
      - --max-allowed-packet=64MB
      - --innodb-buffer-pool-size=512M
      - --innodb-log-file-size=64M
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  matomo-data:
  matomo-mariadb-data:
```

Create the environment file.

```bash
# .env - Database credentials
MARIADB_PASSWORD=your-secure-matomo-password
MARIADB_ROOT_PASSWORD=your-secure-root-password
```

Start the stack.

```bash
# Launch Matomo and MariaDB
docker compose up -d

# Watch startup logs
docker compose logs -f matomo
```

Navigate to `http://your-server-ip:8080` to start the web-based installation wizard. The wizard walks you through database configuration, creating an admin account, and adding your first website.

## Setting Up the Archive Cron Job

Matomo archives reports on demand by default, which means the first time someone views a report, it gets generated in real time. This causes slow dashboard loads on high-traffic sites. The recommended approach is to set up a cron job that pre-processes reports.

```yaml
# Add a cron service to docker-compose.yml
services:
  matomo-cron:
    image: matomo:5-apache
    container_name: matomo-cron
    restart: unless-stopped
    volumes:
      # Share the same data volume as the main Matomo instance
      - matomo-data:/var/www/html
    environment:
      MATOMO_DATABASE_HOST: matomo-mariadb
      MATOMO_DATABASE_ADAPTER: mysql
      MATOMO_DATABASE_TABLES_PREFIX: matomo_
      MATOMO_DATABASE_USERNAME: matomo
      MATOMO_DATABASE_PASSWORD: ${MARIADB_PASSWORD}
      MATOMO_DATABASE_DBNAME: matomo
    # Override the entrypoint to run the archive command every 5 minutes
    entrypoint: >
      bash -c "while true; do
        php /var/www/html/console core:archive --url=http://matomo:80;
        sleep 300;
      done"
    depends_on:
      - matomo
```

After adding the cron service, disable browser-triggered archiving in Matomo's settings. Go to Administration > System > General Settings and set "Archive reports when viewed from the browser" to No.

## Adding the Tracking Code

After completing the setup wizard, Matomo generates a tracking code for your site. Add it before the closing `</head>` tag.

```html
<!-- Matomo Tracking Code -->
<script>
  var _paq = window._paq = window._paq || [];
  // Track page view
  _paq.push(['trackPageView']);
  // Enable link tracking
  _paq.push(['enableLinkTracking']);
  (function() {
    var u="https://analytics.yourdomain.com/";
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', '1']);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
  })();
</script>
<noscript>
  <img referrerpolicy="no-referrer-when-downgrade"
       src="https://analytics.yourdomain.com/matomo.php?idsite=1&rec=1"
       style="border:0" alt="" />
</noscript>
<!-- End Matomo Code -->
```

## Tracking Custom Events and Goals

Matomo's JavaScript tracker supports rich event tracking.

```javascript
// Track a custom event (category, action, name, value)
_paq.push(['trackEvent', 'Downloads', 'PDF', 'Annual Report', 1]);

// Track a site search
_paq.push(['trackSiteSearch', 'docker deployment', 'Documentation', 15]);

// Track e-commerce order
_paq.push(['addEcommerceItem', 'SKU001', 'Product Name', 'Category', 29.99, 1]);
_paq.push(['trackEcommerceOrder', 'ORDER-123', 29.99, 24.99, 4.50, 5.00, 0.50]);

// Set custom dimension (requires Custom Dimensions plugin)
_paq.push(['setCustomDimension', 1, 'Pro Plan']);
_paq.push(['trackPageView']);
```

## Using the Matomo Tracking API

For server-side tracking (useful for APIs, backend events, and mobile apps), use the HTTP tracking API.

```bash
# Track a page view via the server-side API
curl "https://analytics.yourdomain.com/matomo.php?\
idsite=1&\
rec=1&\
action_name=API+Documentation&\
url=https://yourdomain.com/docs/api&\
rand=$(date +%s)&\
apiv=1"

# Track a custom event server-side
curl "https://analytics.yourdomain.com/matomo.php?\
idsite=1&\
rec=1&\
e_c=Backend&\
e_a=User+Signup&\
e_n=Pro+Plan&\
apiv=1"
```

## Using the Reporting API

Pull analytics data programmatically for dashboards and reports.

```bash
# Get visits summary for the last 7 days
curl "https://analytics.yourdomain.com/index.php?\
module=API&\
method=VisitsSummary.get&\
idSite=1&\
period=day&\
date=last7&\
format=json&\
token_auth=your-api-token"

# Get top pages for the current month
curl "https://analytics.yourdomain.com/index.php?\
module=API&\
method=Actions.getPageUrls&\
idSite=1&\
period=month&\
date=today&\
format=json&\
token_auth=your-api-token"
```

## GeoIP Location Tracking

For accurate visitor location data, configure GeoIP2 database downloads.

```bash
# Download the GeoLite2 database (requires a free MaxMind account)
docker exec matomo bash -c "cd /var/www/html/misc && \
  wget 'https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=YOUR_KEY&suffix=tar.gz' -O GeoLite2-City.tar.gz && \
  tar xzf GeoLite2-City.tar.gz --strip-components=1 && \
  rm GeoLite2-City.tar.gz"
```

Then configure Matomo to use it: Administration > System > Geolocation > GeoIP 2 (Php).

## Backup and Restore

```bash
# Backup the MariaDB database
docker exec matomo-mariadb mariadb-dump -u root -p"$MARIADB_ROOT_PASSWORD" matomo > matomo-db-$(date +%Y%m%d).sql

# Backup the Matomo data volume (config, plugins, tmp files)
docker run --rm \
  -v matomo-data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/matomo-data-$(date +%Y%m%d).tar.gz -C /source .

# Restore the database
docker exec -i matomo-mariadb mariadb -u root -p"$MARIADB_ROOT_PASSWORD" matomo < matomo-db-20260208.sql
```

## Reverse Proxy with SSL

```yaml
# Traefik labels for Matomo
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.matomo.rule=Host(`analytics.yourdomain.com`)"
  - "traefik.http.routers.matomo.entrypoints=websecure"
  - "traefik.http.routers.matomo.tls.certresolver=letsencrypt"
  - "traefik.http.services.matomo.loadbalancer.server.port=80"
```

## Performance Tuning

For high-traffic sites, add Redis caching and tune the database.

```yaml
# Add Redis to the compose stack
redis:
  image: redis:7-alpine
  container_name: matomo-redis
  restart: unless-stopped
```

Then add the QueuedTracking plugin in Matomo and configure it to use Redis. This buffers tracking requests and writes them to the database in batches, significantly improving write performance under load.

## Summary

Matomo is the most feature-complete self-hosted analytics platform available. If you need capabilities that match or exceed Google Analytics while maintaining full data ownership, Matomo is the tool to deploy. The Docker setup with MariaDB provides a solid foundation, and the archive cron job ensures dashboard performance stays snappy. For monitoring the Matomo stack itself, including MariaDB health, disk usage, and response times, OneUptime provides the infrastructure visibility you need to keep your analytics running smoothly.
