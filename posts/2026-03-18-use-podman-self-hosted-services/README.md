# How to Use Podman for Self-Hosted Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Self-Hosting, Container, Privacy, Open Source

Description: Learn how to deploy self-hosted alternatives to cloud services using Podman, including email, git hosting, project management, and collaboration tools in rootless containers.

---

> Podman enables you to self-host alternatives to cloud services in rootless containers, giving you complete ownership of your data and eliminating recurring subscription costs.

Self-hosting means running your own instances of services that you would otherwise rely on cloud providers for. This gives you data sovereignty, privacy, and often better performance for local use. Podman is well suited for self-hosting because it requires no privileged daemon, supports automatic updates, and integrates with systemd for reliable service management.

This guide covers deploying popular self-hosted services with Podman, from git hosting to project management, documentation, and monitoring tools.

---

## Why Self-Host with Podman

Self-hosting with Podman provides three key advantages. First, rootless Podman runs containers without a root-privileged daemon, and container processes cannot have more privileges than the user who launched them. Second, Podman's daemonless architecture means fewer moving parts and less resource overhead. Third, Quadlet integration lets you manage startup and restarts with systemd without additional tooling.

## Git Hosting with Gitea

Deploy a lightweight GitHub alternative:

```bash
podman pod create --name gitea -p 3000:3000 -p 2222:22

podman run -d --pod gitea \
  --name gitea-db \
  -e POSTGRES_DB=gitea \
  -e POSTGRES_USER=gitea \
  -e POSTGRES_PASSWORD=gitea \
  -v gitea-db:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine

podman run -d --pod gitea \
  --name gitea-app \
  -e GITEA__database__DB_TYPE=postgres \
  -e GITEA__database__HOST=127.0.0.1:5432 \
  -e GITEA__database__NAME=gitea \
  -e GITEA__database__USER=gitea \
  -e GITEA__database__PASSWD=gitea \
  -v gitea-data:/data:Z \
  docker.io/gitea/gitea:latest
```

Access Gitea at `http://localhost:3000` and complete the initial setup.

## Bookmarks with Linkding

A self-hosted bookmark manager:

```bash
podman run -d \
  --name linkding \
  -p 9090:9090 \
  -e LD_SUPERUSER_NAME=admin \
  -e LD_SUPERUSER_PASSWORD=change-this-password \
  -v linkding-data:/etc/linkding/data:Z \
  docker.io/sissbruecker/linkding:latest
```

Open `http://localhost:9090` and sign in with the configured superuser.

## Note-Taking with Outline

Deploy a team wiki and documentation platform:

```bash
podman pod create --name outline -p 3000:3000

podman run -d --pod outline \
  --name outline-db \
  -e POSTGRES_DB=outline \
  -e POSTGRES_USER=outline \
  -e POSTGRES_PASSWORD=outlinepass \
  -v outline-db:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine

podman run -d --pod outline \
  --name outline-redis \
  docker.io/library/redis:7-alpine

podman run -d --pod outline \
  --name outline-app \
  -e DATABASE_URL=postgres://outline:outlinepass@127.0.0.1:5432/outline \
  -e PGSSLMODE=disable \
  -e REDIS_URL=redis://127.0.0.1:6379 \
  -e URL=http://localhost:3000 \
  -e FORCE_HTTPS=false \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e UTILS_SECRET=$(openssl rand -hex 32) \
  -e FILE_STORAGE=local \
  -e FILE_STORAGE_LOCAL_ROOT_DIR=/var/lib/outline/data \
  -e OIDC_CLIENT_ID=outline \
  -e OIDC_CLIENT_SECRET=replace-with-your-client-secret \
  -e OIDC_AUTH_URI=https://id.example.com/authorize \
  -e OIDC_TOKEN_URI=https://id.example.com/oauth/token \
  -e OIDC_USERINFO_URI=https://id.example.com/userinfo \
  -e 'OIDC_SCOPES=openid profile email' \
  -v outline-data:/var/lib/outline/data:Z \
  docker.io/outlinewiki/outline:latest
```

Replace the OIDC placeholder values with your provider details before signing in to Outline.

## Project Management with Planka

A Trello-like kanban board:

```bash
podman pod create --name planka -p 1337:1337

podman run -d --pod planka \
  --name planka-db \
  -e POSTGRES_DB=planka \
  -e POSTGRES_USER=planka \
  -e POSTGRES_PASSWORD=plankapass \
  -v planka-db:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine

podman run -d --pod planka \
  --name planka-app \
  -e BASE_URL=http://localhost:1337 \
  -e DATABASE_URL=postgresql://planka:plankapass@127.0.0.1:5432/planka \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e DEFAULT_ADMIN_EMAIL=admin@example.com \
  -e DEFAULT_ADMIN_PASSWORD=adminpass \
  -e DEFAULT_ADMIN_NAME=Admin \
  -e DEFAULT_ADMIN_USERNAME=admin \
  -v planka-data:/app/data:Z \
  ghcr.io/plankanban/planka:latest
```

## RSS Reader with FreshRSS

Stay updated without relying on social media algorithms:

```bash
podman run -d \
  --name freshrss \
  -p 8080:80 \
  -e TZ=America/New_York \
  -e CRON_MIN=*/15 \
  -v freshrss-data:/var/www/FreshRSS/data:Z \
  docker.io/freshrss/freshrss:latest
```

## Status Page with Uptime Kuma

Monitor and display the status of all your services:

```bash
podman run -d \
  --name uptime-kuma \
  --restart=always \
  -p 3001:3001 \
  -v uptime-kuma-data:/app/data:Z \
  docker.io/louislam/uptime-kuma:2
```

## Recipe Manager with Mealie

Organize your recipes in a self-hosted app:

```bash
podman run -d \
  --name mealie \
  -p 9925:9000 \
  -e ALLOW_SIGNUP=true \
  -e BASE_URL=http://localhost:9925 \
  -e TZ=America/New_York \
  -v mealie-data:/app/data:Z \
  ghcr.io/mealie-recipes/mealie:latest
```

## URL Shortener with Shlink

```bash
podman pod create --name shlink -p 8080:8080

podman run -d --pod shlink \
  --name shlink-db \
  -e POSTGRES_DB=shlink \
  -e POSTGRES_USER=shlink \
  -e POSTGRES_PASSWORD=shlinkpass \
  -v shlink-db:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine

podman run -d --pod shlink \
  --name shlink-app \
  -e DEFAULT_DOMAIN=short.example.com \
  -e IS_HTTPS_ENABLED=false \
  -e INITIAL_API_KEY=change-this-api-key \
  -e DB_DRIVER=postgres \
  -e DB_HOST=127.0.0.1 \
  -e DB_NAME=shlink \
  -e DB_USER=shlink \
  -e DB_PASSWORD=shlinkpass \
  docker.io/shlinkio/shlink:stable
```

Use the `INITIAL_API_KEY` value with the Shlink web client, or generate a key later with `podman exec -it shlink-app shlink api-key:generate`.

## Automatic Updates

Configure automatic container updates for your systemd-managed services. `podman auto-update` relies on containers being started by systemd units, such as the Quadlet example below.

```bash
# Check for updates
podman auto-update --dry-run

# Apply updates
podman auto-update
```

Set up a systemd timer for automatic updates:

```bash
systemctl --user enable --now podman-auto-update.timer
```

## Managing Services with Quadlet

Create Quadlet files for each service to ensure automatic startup:

```ini
# ~/.config/containers/systemd/gitea.container
[Container]
Image=docker.io/gitea/gitea:latest
PublishPort=3000:3000
PublishPort=2222:22
Volume=gitea-data:/data:Z
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=60

[Install]
WantedBy=default.target
```

## Conclusion

Self-hosting with Podman gives you full ownership of your services and data without the complexity of managing a container daemon. Each service runs in an isolated, rootless container that can be started automatically and restarted on failure through systemd integration. Start with the services you use most frequently and expand your self-hosted infrastructure at your own pace.
