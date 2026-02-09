# How to Run Umami Analytics in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Umami, Web Analytics, Privacy, Docker Compose, Self-Hosted, Open Source

Description: Deploy Umami in Docker for lightweight, privacy-focused web analytics with a clean dashboard and simple tracking setup.

---

Umami is a lightweight, open-source web analytics tool focused on privacy and simplicity. It collects website usage data without using cookies, fingerprinting, or any personal data, making it GDPR-compliant by default. The dashboard is clean and fast, showing you exactly what you need: page views, visitors, referrers, browsers, devices, and countries, without the overwhelming complexity of Google Analytics.

Running Umami in Docker is the recommended deployment method. The setup takes minutes and requires minimal resources. This guide covers deploying Umami with Docker Compose, adding tracking to your sites, using the API, and maintaining the installation.

## Why Choose Umami

Umami occupies a sweet spot between doing nothing and deploying a full analytics platform. The tracking script is about 2 KB. It loads fast, tracks what matters, and presents it in a dashboard that anyone on your team can understand without training. There are no cookies to consent to, no personal data to worry about, and no third-party data sharing.

Compared to Plausible (another privacy-focused alternative), Umami is fully free and open source with no premium tier. The trade-off is a smaller feature set, but for many sites, Umami covers everything you need.

## Prerequisites

Docker and Docker Compose are required. Umami is very resource-efficient, using around 200 MB of RAM. It runs comfortably on the smallest VPS instances.

```bash
# Verify Docker is ready
docker --version
docker compose version
```

## Docker Compose Setup

Umami needs a database backend. It supports both PostgreSQL and MySQL. PostgreSQL is recommended.

```yaml
# docker-compose.yml - Umami Analytics with PostgreSQL
version: "3.8"

services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: umami
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # PostgreSQL connection string
      DATABASE_URL: postgresql://umami:${POSTGRES_PASSWORD}@umami-postgres:5432/umami
      # Hash salt for anonymizing data (generate a random string)
      APP_SECRET: ${APP_SECRET}
      # Disable telemetry
      DISABLE_TELEMETRY: 1
    depends_on:
      umami-postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/heartbeat"]
      interval: 30s
      timeout: 5s
      retries: 3

  umami-postgres:
    image: postgres:16-alpine
    container_name: umami-postgres
    restart: unless-stopped
    volumes:
      - umami-postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  umami-postgres-data:
```

Create the environment file.

```bash
# .env - Sensitive configuration
POSTGRES_PASSWORD=your-secure-postgres-password
APP_SECRET=your-random-app-secret-string
```

Generate the app secret.

```bash
# Generate a random secret
openssl rand -hex 32
```

Launch the stack.

```bash
# Start Umami and PostgreSQL
docker compose up -d

# Watch the startup logs
docker compose logs -f umami
```

Open `http://your-server-ip:3000` and log in with the default credentials: admin / umami. Change the password immediately in the settings.

## Adding Your First Website

1. Log into the Umami dashboard
2. Go to Settings > Websites
3. Click "Add website"
4. Enter the name and domain of your site
5. Copy the tracking code snippet

The tracking snippet looks like this:

```html
<!-- Umami Analytics - privacy-friendly, no cookies -->
<script defer src="https://analytics.yourdomain.com/script.js" data-website-id="your-website-id"></script>
```

Add this to the `<head>` section of every page you want to track. For static site generators, add it to your base template. For Next.js:

```jsx
// pages/_app.js or app/layout.tsx - Add Umami tracking to Next.js
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          defer
          src="https://analytics.yourdomain.com/script.js"
          data-website-id="your-website-id"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Tracking Custom Events

Umami supports custom event tracking for user interactions.

```javascript
// Track a button click
document.getElementById('cta-button').addEventListener('click', function() {
    umami.track('CTA Click', { location: 'homepage', variant: 'blue' });
});

// Track a form submission
document.getElementById('signup-form').addEventListener('submit', function(e) {
    umami.track('Form Submit', { form: 'signup', plan: 'pro' });
});

// Track a page view with custom data
umami.track('Product View', { product_id: '123', category: 'electronics' });
```

You can also use the `data-umami-event` attribute for declarative tracking without JavaScript.

```html
<!-- Track clicks on any element with data attributes -->
<button data-umami-event="Download" data-umami-event-file="whitepaper.pdf">
  Download Whitepaper
</button>

<a href="/pricing" data-umami-event="Pricing Click" data-umami-event-source="navbar">
  Pricing
</a>
```

## Using the Umami API

Umami provides a REST API for fetching analytics data programmatically. Authenticate first, then query the stats endpoints.

```bash
# Authenticate and get an access token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}' | jq -r '.token')

# Get website stats for the last 7 days
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/websites/WEBSITE_ID/stats?startAt=$(date -d '7 days ago' +%s000)&endAt=$(date +%s000)"

# Get pageview data
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/websites/WEBSITE_ID/pageviews?startAt=$(date -d '7 days ago' +%s000)&endAt=$(date +%s000)&unit=day"

# Get active visitors (real-time)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/websites/WEBSITE_ID/active"
```

## Dashboard Sharing

You can share individual website dashboards publicly without requiring login. Go to Settings > Websites > your site > Share URL. This generates a public link that shows the dashboard in read-only mode.

This is useful for sharing analytics with clients or stakeholders who do not need a Umami account.

## Teams and User Management

Umami supports multiple users with different access levels. Create additional users from the admin interface.

```bash
# Create a user via the API
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "teammate", "password": "secure-password", "role": "user"}'
```

Roles include:
- **Admin**: full access to all settings and websites
- **User**: can view assigned websites and manage their own settings

## Environment Variables for Configuration

Umami supports several environment variables for fine-tuning.

```yaml
environment:
  # Core settings
  DATABASE_URL: postgresql://umami:password@db:5432/umami
  APP_SECRET: your-secret
  # Tracker settings
  TRACKER_SCRIPT_NAME: custom-script-name
  COLLECT_API_ENDPOINT: /api/send
  # Disable bot detection if you want to count bots
  DISABLE_BOT_CHECK: "false"
  # Force SSL
  FORCE_SSL: "true"
  # Allowed origins for the tracking script (CORS)
  ALLOWED_FRAME_URLS: "https://yourdomain.com"
```

The `TRACKER_SCRIPT_NAME` variable lets you rename the tracking script to avoid ad blockers.

## Reverse Proxy Configuration

For production with SSL, put Umami behind your reverse proxy.

```yaml
# Traefik labels for Umami
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.umami.rule=Host(`analytics.yourdomain.com`)"
  - "traefik.http.routers.umami.entrypoints=websecure"
  - "traefik.http.routers.umami.tls.certresolver=letsencrypt"
  - "traefik.http.services.umami.loadbalancer.server.port=3000"
```

For Nginx:

```nginx
# Nginx configuration for Umami
server {
    listen 443 ssl;
    server_name analytics.yourdomain.com;

    ssl_certificate /etc/ssl/certs/analytics.crt;
    ssl_certificate_key /etc/ssl/private/analytics.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backup and Restore

```bash
# Backup the PostgreSQL database
docker exec umami-postgres pg_dump -U umami umami > umami-backup-$(date +%Y%m%d).sql

# Restore from backup
docker exec -i umami-postgres psql -U umami umami < umami-backup-20260208.sql
```

## Updating Umami

```bash
# Pull the latest image
docker compose pull

# Recreate the container (migrations run automatically)
docker compose up -d

# Verify the update
docker compose logs -f umami
```

## Summary

Umami is the lightest-weight option in the self-hosted analytics space. If you want basic, privacy-respecting analytics without the complexity of larger platforms, Umami delivers exactly that. The Docker setup is minimal, the resource usage is tiny, and the tracking script adds virtually no overhead to your pages. For organizations that need to demonstrate GDPR compliance without consent banners, Umami is a straightforward solution. Monitor the Umami instance and its PostgreSQL backend with OneUptime to ensure your analytics never miss a beat.
