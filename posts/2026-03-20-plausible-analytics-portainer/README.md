# How to Deploy Plausible Analytics via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Plausible Analytics, Self-Hosted, Privacy, Analytics

Description: Deploy Plausible Analytics, the privacy-focused web analytics platform, as a Docker stack through Portainer for GDPR-compliant website traffic analysis.

## Introduction

Plausible Analytics is a lightweight, open-source, privacy-focused alternative to Google Analytics. It doesn't use cookies, is GDPR-compliant out of the box, and can be fully self-hosted. Deploying it via Portainer gives you a manageable, observable deployment on your own infrastructure.

## Prerequisites

- Portainer CE or BE managing a Docker Standalone environment
- A domain name pointing to your server (for automatic HTTPS)
- Docker Engine 20.10+
- CPU support for SSE 4.2 or NEON (required by ClickHouse)
- At least 2 GB of RAM recommended
- SMTP credentials for email (optional but recommended)

## Step 1: Prepare Environment Variables

Plausible requires a secret key base. Generate one:

```bash
# Generate a SECRET_KEY_BASE value

openssl rand -base64 48 | tr -d '\n'
```

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor**:

```yaml
version: "3.8"

services:
  # PostgreSQL - Plausible's primary database
  plausible_db:
    image: postgres:16-alpine
    container_name: plausible-db
    restart: unless-stopped
    volumes:
      - plausible_db_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: postgres
    networks:
      - plausible-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      start_period: 1m

  # ClickHouse - Plausible's analytics event store
  plausible_events_db:
    image: clickhouse/clickhouse-server:24.12-alpine
    container_name: plausible-events-db
    restart: unless-stopped
    volumes:
      - plausible_events_data:/var/lib/clickhouse
      - plausible_events_logs:/var/log/clickhouse-server
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    environment:
      CLICKHOUSE_SKIP_USER_SETUP: "1"
    networks:
      - plausible-net
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 -O - http://127.0.0.1:8123/ping || exit 1"]
      start_period: 1m

  # Plausible Analytics application
  plausible:
    image: ghcr.io/plausible/community-edition:v3.2.0
    container_name: plausible
    restart: unless-stopped
    depends_on:
      plausible_db:
        condition: service_healthy
      plausible_events_db:
        condition: service_healthy
    command: sh -c "/entrypoint.sh db createdb && /entrypoint.sh db migrate && /entrypoint.sh run"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - plausible_data:/var/lib/plausible
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
    environment:
      # Required: base URL for your Plausible instance
      BASE_URL: https://plausible.yourdomain.com

      # Required: generate with 'openssl rand -base64 48'
      SECRET_KEY_BASE: "your_secret_key_here"

      # Built-in HTTP/HTTPS listeners
      HTTP_PORT: "80"
      HTTPS_PORT: "443"
      TMPDIR: /var/lib/plausible/tmp

      # Database connections
      DATABASE_URL: postgres://postgres:postgres@plausible_db:5432/plausible_db
      CLICKHOUSE_DATABASE_URL: http://plausible_events_db:8123/plausible_events_db

      # Optional: SMTP for email invites and reports
      # MAILER_EMAIL: hello@yourdomain.com
      # SMTP_HOST_ADDR: smtp.yourdomain.com
      # SMTP_HOST_PORT: "587"
      # SMTP_USER_NAME: yoursmtpuser
      # SMTP_USER_PWD: yoursmtppassword
      # SMTP_HOST_SSL_ENABLED: "false"

      # Disable registration after initial setup
      # DISABLE_REGISTRATION: "invite_only"
    networks:
      - plausible-net

volumes:
  plausible_db_data:
  plausible_events_data:
  plausible_events_logs:
  plausible_data:

networks:
  plausible-net:
    driver: bridge
```

## Step 3: Deploy the Stack

1. Name the stack `plausible`
2. Click **Deploy the stack**
3. Watch the logs - the first startup takes 30-60 seconds for database migrations

## Step 4: Create Your First User

Visit `https://plausible.yourdomain.com` and create the first user from the web UI. Plausible Community Edition prompts you to create that account on first startup.

## Step 5: Add Your Website

1. Log in to `https://plausible.yourdomain.com`
2. Click **Add a website**
3. Enter your domain: `yourwebsite.com`
4. Plausible provides a tracking script

## Step 6: Add the Tracking Script

After you add the site in Plausible, copy the site-specific snippet from **Settings** → **General** → **Site Installation**. It will look similar to this:

```html
<!-- Plausible Analytics tracking script -->
<script async src="https://plausible.yourdomain.com/js/your-site-id.js"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()
</script>
```

Plausible automatically supports single-page applications that use `history.pushState`. For apps that use hash-based routing, initialize the snippet like this:

```html
<script async src="https://plausible.yourdomain.com/js/your-site-id.js"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init({ hashBasedRouting: true })
</script>
```

## Step 7: Configure Reverse Proxy (Optional, Nginx)

Plausible CE can handle HTTPS itself when `HTTP_PORT` and `HTTPS_PORT` are set to `80` and `443`, so you can skip this step if you use the stack above as-is.

If you prefer to put Plausible behind Nginx, change the `plausible` service to use `HTTP_PORT: "8000"`, remove `HTTPS_PORT`, and expose `127.0.0.1:8000:8000`, then use:

```nginx
server {
    server_name plausible.yourdomain.com;

    listen 80;
    listen [::]:80;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /live/websocket {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

If Nginx is terminating TLS, add your certificate directives there and keep `BASE_URL` set to `https://plausible.yourdomain.com`.

## Step 8: Disable New Registrations

`invite_only` is the default in Plausible CE. If you want to disable invited-user signups as well, edit the stack and set:

```yaml
environment:
  DISABLE_REGISTRATION: "true"
```

## Conclusion

Plausible Analytics running via Portainer gives you a privacy-respecting, cookie-free analytics platform that you fully control. With ClickHouse as the event store, it scales to billions of events while keeping resource usage minimal - and Portainer makes ongoing management, updates, and log inspection straightforward.
