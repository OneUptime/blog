# How to Deploy Taiga (Project Management) via Portainer - Project Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Taiga, Project Management, Portainer, Docker, Agile, Scrum, Self-Hosted

Description: Deploy Taiga open-source agile project management platform via Portainer for Scrum boards, sprints, and team collaboration.

---

This guide covers deploying this self-hosted productivity application via Portainer with persistent data storage and proper configuration.

## Deploy via Portainer Stack

Navigate to **Stacks > Add Stack** in Portainer and use the following configuration. Replace `YOUR_SERVER_IP_OR_DOMAIN` and the password/secret placeholders before deploying:

```yaml
x-environment: &default-back-environment
  POSTGRES_DB: "taiga"
  POSTGRES_USER: "taiga"
  POSTGRES_PASSWORD: "change-this-postgres-password"
  POSTGRES_HOST: "taiga-db"
  TAIGA_SECRET_KEY: "change-this-taiga-secret-key"
  TAIGA_SITES_SCHEME: "http"
  TAIGA_SITES_DOMAIN: "YOUR_SERVER_IP_OR_DOMAIN:9000"
  TAIGA_SUBPATH: ""
  EMAIL_BACKEND: "django.core.mail.backends.console.EmailBackend"
  DEFAULT_FROM_EMAIL: "changeme@example.com"
  EMAIL_USE_TLS: "True"
  EMAIL_USE_SSL: "False"
  EMAIL_HOST: "smtp.host.example.com"
  EMAIL_PORT: "587"
  EMAIL_HOST_USER: "user"
  EMAIL_HOST_PASSWORD: "password"
  RABBITMQ_USER: "taiga"
  RABBITMQ_PASS: "change-this-rabbitmq-password"
  ENABLE_TELEMETRY: "True"

x-volumes: &default-back-volumes
  - taiga-static-data:/taiga-back/static
  - taiga-media-data:/taiga-back/media

services:
  taiga-db:
    image: postgres:12.3
    environment:
      POSTGRES_DB: "taiga"
      POSTGRES_USER: "taiga"
      POSTGRES_PASSWORD: "change-this-postgres-password"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taiga"]
      interval: 2s
      timeout: 15s
      retries: 5
      start_period: 3s
    volumes:
      - taiga-db-data:/var/lib/postgresql/data
    networks:
      - taiga

  taiga-back:
    image: taigaio/taiga-back:latest
    environment: *default-back-environment
    volumes: *default-back-volumes
    depends_on:
      taiga-db:
        condition: service_healthy
      taiga-events-rabbitmq:
        condition: service_started
      taiga-async-rabbitmq:
        condition: service_started
    networks:
      - taiga

  taiga-async:
    image: taigaio/taiga-back:latest
    entrypoint: ["/taiga-back/docker/async_entrypoint.sh"]
    environment: *default-back-environment
    volumes: *default-back-volumes
    depends_on:
      taiga-db:
        condition: service_healthy
      taiga-events-rabbitmq:
        condition: service_started
      taiga-async-rabbitmq:
        condition: service_started
    networks:
      - taiga

  taiga-async-rabbitmq:
    image: rabbitmq:3.8-management-alpine
    environment:
      RABBITMQ_ERLANG_COOKIE: "change-this-erlang-cookie"
      RABBITMQ_DEFAULT_USER: "taiga"
      RABBITMQ_DEFAULT_PASS: "change-this-rabbitmq-password"
      RABBITMQ_DEFAULT_VHOST: "taiga"
    hostname: "taiga-async-rabbitmq"
    volumes:
      - taiga-async-rabbitmq-data:/var/lib/rabbitmq
    networks:
      - taiga

  taiga-front:
    image: taigaio/taiga-front:latest
    environment:
      TAIGA_URL: "http://YOUR_SERVER_IP_OR_DOMAIN:9000"
      TAIGA_WEBSOCKETS_URL: "ws://YOUR_SERVER_IP_OR_DOMAIN:9000"
      TAIGA_SUBPATH: ""
    networks:
      - taiga

  taiga-events:
    image: taigaio/taiga-events:latest
    environment:
      RABBITMQ_USER: "taiga"
      RABBITMQ_PASS: "change-this-rabbitmq-password"
      TAIGA_SECRET_KEY: "change-this-taiga-secret-key"
    depends_on:
      taiga-events-rabbitmq:
        condition: service_started
    networks:
      - taiga

  taiga-events-rabbitmq:
    image: rabbitmq:3.8-management-alpine
    environment:
      RABBITMQ_ERLANG_COOKIE: "change-this-erlang-cookie"
      RABBITMQ_DEFAULT_USER: "taiga"
      RABBITMQ_DEFAULT_PASS: "change-this-rabbitmq-password"
      RABBITMQ_DEFAULT_VHOST: "taiga"
    hostname: "taiga-events-rabbitmq"
    volumes:
      - taiga-events-rabbitmq-data:/var/lib/rabbitmq
    networks:
      - taiga

  taiga-protected:
    image: taigaio/taiga-protected:latest
    environment:
      MAX_AGE: "360"
      SECRET_KEY: "change-this-taiga-secret-key"
    networks:
      - taiga

  taiga-gateway:
    image: nginx:1.19-alpine
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
            proxy_set_header Host $http_host;
            proxy_redirect off;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Scheme $scheme;
          }

          location /api/ {
            proxy_pass http://taiga-back:8000/api/;
            proxy_pass_header Server;
            proxy_set_header Host $http_host;
            proxy_redirect off;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Scheme $scheme;
          }

          location /admin/ {
            proxy_pass http://taiga-back:8000/admin/;
            proxy_pass_header Server;
            proxy_set_header Host $http_host;
            proxy_redirect off;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Scheme $scheme;
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
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Scheme $scheme;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_pass http://taiga-protected:8003/;
            proxy_redirect off;
          }

          location /events {
            proxy_pass http://taiga-events:8888/events;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
          }
        }
        EOF
        exec nginx -g 'daemon off;'
    ports:
      - "9000:80"
    volumes:
      - taiga-static-data:/taiga/static
      - taiga-media-data:/taiga/media
    depends_on:
      - taiga-front
      - taiga-back
      - taiga-events
    networks:
      - taiga

volumes:
  taiga-static-data:
  taiga-media-data:
  taiga-db-data:
  taiga-async-rabbitmq-data:
  taiga-events-rabbitmq-data:

networks:
  taiga:
    driver: bridge
```

## Configuration

After deployment, access the application at `http://host:9000` and complete the initial setup:

1. Create the first admin user by opening the `taiga-back` container console in Portainer and running `python manage.py createsuperuser`
2. Sign in with that account and create your first project
3. Configure project members and permissions
4. If you want email notifications, set `EMAIL_BACKEND` to `django.core.mail.backends.smtp.EmailBackend`, update the `EMAIL_*` values, and redeploy the stack

## Key Features

This application provides:

- **Kanban boards / Project tracking** - visual workflow management
- **Team collaboration** - assign tasks and track progress
- **Labels and categories** - organize work by type or priority
- **Due dates and deadlines** - time-based task management
- **Comments and attachments** - rich context on each task

## Backup and Restore

Backup the application data:

```bash
# Backup PostgreSQL database
docker exec <taiga-db-container> pg_dump -U taiga taiga > taiga-db-backup-$(date +%Y%m%d).sql

# Backup Taiga media files
docker exec <taiga-back-container> tar czf /tmp/taiga-media-backup.tar.gz -C /taiga-back media
docker cp <taiga-back-container>:/tmp/taiga-media-backup.tar.gz ./taiga-media-backup-$(date +%Y%m%d).tar.gz
docker exec <taiga-back-container> rm /tmp/taiga-media-backup.tar.gz
```

## Summary

This self-hosted productivity tool deployed via Portainer gives your team a private, data-owned alternative to SaaS project management platforms. Portainer handles the container lifecycle, while PostgreSQL and the Taiga media volumes persist your project data and uploaded files.
