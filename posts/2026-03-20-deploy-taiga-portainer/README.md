# How to Deploy Taiga (Project Management) via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Taiga, Project Management, Docker, Self-Hosted

Description: Deploy Taiga open-source agile project management platform using Portainer for Scrum and Kanban workflows.

## Introduction

Taiga is an open-source agile project management platform supporting Scrum, Kanban, and issue tracking. It features a clean UI, epics, user stories, sprints, backlogs, and wikis. This guide deploys Taiga using Taiga's official Docker architecture adapted for a Portainer stack.

## Prerequisites

- Portainer installed with Docker
- At least 2 GB RAM
- A domain name pointing to your Docker host for `TAIGA_DOMAIN`

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Taiga

version: "3.8"

x-environment: &default-back-environment
  POSTGRES_DB: taiga
  POSTGRES_USER: taiga
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  POSTGRES_HOST: taiga-db
  TAIGA_SECRET_KEY: ${TAIGA_SECRET_KEY}
  TAIGA_SITES_SCHEME: http
  TAIGA_SITES_DOMAIN: ${TAIGA_DOMAIN}
  TAIGA_SUBPATH: ""
  RABBITMQ_USER: taiga
  RABBITMQ_PASS: ${RABBITMQ_PASSWORD}
  ENABLE_TELEMETRY: "False"

services:
  taiga-db:
    image: postgres:12.3
    restart: unless-stopped
    volumes:
      - taiga_db_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: taiga
      POSTGRES_USER: taiga
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taiga"]
      interval: 2s
      timeout: 15s
      retries: 5
      start_period: 3s
    networks:
      - taiga_net

  taiga-back:
    image: taigaio/taiga-back:6.9.0
    restart: unless-stopped
    volumes:
      - taiga_static:/taiga-back/static
      - taiga_media:/taiga-back/media
    environment:
      <<: *default-back-environment
    depends_on:
      taiga-db:
        condition: service_healthy
      taiga-events-rabbitmq:
        condition: service_started
      taiga-async-rabbitmq:
        condition: service_started
    networks:
      - taiga_net

  taiga-async:
    image: taigaio/taiga-back:6.9.0
    restart: unless-stopped
    entrypoint: ["/taiga-back/docker/async_entrypoint.sh"]
    volumes:
      - taiga_static:/taiga-back/static
      - taiga_media:/taiga-back/media
    environment:
      <<: *default-back-environment
    depends_on:
      taiga-db:
        condition: service_healthy
      taiga-events-rabbitmq:
        condition: service_started
      taiga-async-rabbitmq:
        condition: service_started
    networks:
      - taiga_net

  taiga-async-rabbitmq:
    image: rabbitmq:3.8-management-alpine
    restart: unless-stopped
    environment:
      RABBITMQ_ERLANG_COOKIE: ${RABBITMQ_ERLANG_COOKIE}
      RABBITMQ_DEFAULT_USER: taiga
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
      RABBITMQ_DEFAULT_VHOST: taiga
    hostname: taiga-async-rabbitmq
    volumes:
      - taiga_async_rabbitmq_data:/var/lib/rabbitmq
    networks:
      - taiga_net

  taiga-front:
    image: taigaio/taiga-front:6.9.0
    restart: unless-stopped
    environment:
      TAIGA_URL: http://${TAIGA_DOMAIN}
      TAIGA_WEBSOCKETS_URL: ws://${TAIGA_DOMAIN}
      TAIGA_SUBPATH: ""
    networks:
      - taiga_net

  taiga-events:
    image: taigaio/taiga-events:6.9.0
    restart: unless-stopped
    environment:
      RABBITMQ_USER: taiga
      RABBITMQ_PASS: ${RABBITMQ_PASSWORD}
      TAIGA_SECRET_KEY: ${TAIGA_SECRET_KEY}
    depends_on:
      taiga-events-rabbitmq:
        condition: service_started
    networks:
      - taiga_net

  taiga-events-rabbitmq:
    image: rabbitmq:3.8-management-alpine
    restart: unless-stopped
    environment:
      RABBITMQ_ERLANG_COOKIE: ${RABBITMQ_ERLANG_COOKIE}
      RABBITMQ_DEFAULT_USER: taiga
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
      RABBITMQ_DEFAULT_VHOST: taiga
    hostname: taiga-events-rabbitmq
    volumes:
      - taiga_events_rabbitmq_data:/var/lib/rabbitmq
    networks:
      - taiga_net

  taiga-protected:
    image: taigaio/taiga-protected:6.9.0
    restart: unless-stopped
    environment:
      MAX_AGE: "360"
      SECRET_KEY: ${TAIGA_SECRET_KEY}
    networks:
      - taiga_net

  taiga-gateway:
    image: nginx:1.19-alpine
    restart: unless-stopped
    ports:
      - "80:80"
    command:
      - /bin/sh
      - -c
      - |
        cat <<'EOF' >/etc/nginx/conf.d/default.conf
        server {
            listen 80 default_server;

            client_max_body_size 100M;
            charset utf-8;

            location / {
                proxy_pass http://taiga-front/;
                proxy_pass_header Server;
                proxy_set_header Host $$http_host;
                proxy_redirect off;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Scheme $$scheme;
            }

            location /api/ {
                proxy_pass http://taiga-back:8000/api/;
                proxy_pass_header Server;
                proxy_set_header Host $$http_host;
                proxy_redirect off;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Scheme $$scheme;
            }

            location /admin/ {
                proxy_pass http://taiga-back:8000/admin/;
                proxy_pass_header Server;
                proxy_set_header Host $$http_host;
                proxy_redirect off;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Scheme $$scheme;
            }

            location /static/ {
                alias /taiga/static/;
            }

            location /_protected/ {
                internal;
                alias /taiga/media/;
                add_header Content-disposition "attachment";
            }

            location /media/exports/ {
                alias /taiga/media/exports/;
                add_header Content-disposition "attachment";
            }

            location /media/ {
                proxy_set_header Host $$http_host;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Scheme $$scheme;
                proxy_set_header X-Forwarded-Proto $$scheme;
                proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
                proxy_pass http://taiga-protected:8003/;
                proxy_redirect off;
            }

            location /events {
                proxy_pass http://taiga-events:8888/events;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $$http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_connect_timeout 7d;
                proxy_send_timeout 7d;
                proxy_read_timeout 7d;
            }
        }
        EOF
        exec nginx -g 'daemon off;'
    volumes:
      - taiga_static:/taiga/static:ro
      - taiga_media:/taiga/media:ro
    depends_on:
      - taiga-front
      - taiga-back
      - taiga-events
      - taiga-protected
    networks:
      - taiga_net

volumes:
  taiga_db_data:
  taiga_static:
  taiga_media:
  taiga_async_rabbitmq_data:
  taiga_events_rabbitmq_data:

networks:
  taiga_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
POSTGRES_PASSWORD=your-postgres-password
TAIGA_SECRET_KEY=your-secret-key-min-32-chars
TAIGA_DOMAIN=taiga.yourdomain.com
RABBITMQ_ERLANG_COOKIE=your-erlang-cookie
RABBITMQ_PASSWORD=your-rabbitmq-password
```

## Step 3: Access Taiga

Open `http://${TAIGA_DOMAIN}`. Before logging in for the first time, open the `taiga-back` container console in Portainer and run:

```bash
cd /taiga-back && python manage.py createsuperuser
```

Then log in with the administrator account you created.

## Step 4: Create a Project

1. Click **New Project**
2. Choose **Scrum** or **Kanban**
3. Add team members, create user stories, and organize sprints

## Conclusion

Taiga's architecture separates the backend (Django), frontend, async workers, protected media handling, and real-time events through `taiga-events` backed by RabbitMQ. All user-uploaded media is stored in the `taiga_media` volume. The nginx gateway serves static assets and proxies frontend, API, media, and `/events` requests. For production, configure SMTP via `EMAIL_BACKEND`, `DEFAULT_FROM_EMAIL`, and the `EMAIL_*` environment variables in the backend service.
