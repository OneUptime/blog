# How to Run Gitea in Docker (Lightweight Git Server)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Gitea, Git, Self-Hosted, DevOps, Docker Compose, Lightweight

Description: How to deploy Gitea as a lightweight self-hosted Git server in Docker with full configuration guide

---

Gitea is a lightweight, self-hosted Git service written in Go. It provides a GitHub-like experience with repositories, pull requests, issue tracking, and a built-in CI system called Gitea Actions. Compared to GitLab CE, Gitea uses a fraction of the resources. A Gitea instance serving a small team comfortably runs in 512 MB of RAM, making it ideal for home labs, small teams, and resource-constrained environments. Docker deployment takes just a few minutes.

This guide covers deploying Gitea in Docker, configuring it with a proper database, setting up Gitea Actions for CI/CD, and securing the installation.

## Quick Start

Get Gitea running with a single command:

```bash
# Start Gitea with SQLite (simplest setup)
docker run -d \
  --name gitea \
  -p 3000:3000 \
  -p 2222:22 \
  -v gitea-data:/data \
  gitea/gitea:1.22
```

Open http://localhost:3000 and you will see the initial configuration page. Fill in your settings and create the first admin account. Gitea uses SQLite by default, which works fine for small teams.

## Production Setup with Docker Compose

For a more robust deployment, use PostgreSQL instead of SQLite:

```yaml
# docker-compose.yml - Gitea with PostgreSQL
version: "3.8"

services:
  gitea:
    image: gitea/gitea:1.22
    container_name: gitea
    ports:
      - "3000:3000"   # Web UI
      - "2222:22"     # SSH
    environment:
      - USER_UID=1000
      - USER_GID=1000
      # Database configuration
      - GITEA__database__DB_TYPE=postgres
      - GITEA__database__HOST=postgres:5432
      - GITEA__database__NAME=gitea
      - GITEA__database__USER=gitea
      - GITEA__database__PASSWD=gitea_password
      # Server configuration
      - GITEA__server__ROOT_URL=http://git.example.com:3000
      - GITEA__server__SSH_PORT=2222
      - GITEA__server__SSH_LISTEN_PORT=22
      # Mailer configuration
      - GITEA__mailer__ENABLED=true
      - GITEA__mailer__PROTOCOL=smtp+starttls
      - GITEA__mailer__SMTP_ADDR=smtp.example.com
      - GITEA__mailer__SMTP_PORT=587
      - GITEA__mailer__FROM=gitea@example.com
    volumes:
      - gitea-data:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: gitea-db
    environment:
      POSTGRES_DB: gitea
      POSTGRES_USER: gitea
      POSTGRES_PASSWORD: gitea_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "gitea"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  gitea-data:
  postgres-data:
```

Start the stack:

```bash
# Launch Gitea with PostgreSQL
docker compose up -d

# Check that both services are healthy
docker compose ps
```

## Configuration Through Environment Variables

Gitea supports configuration via environment variables using the pattern `GITEA__SECTION__KEY`. This eliminates the need to mount a custom `app.ini` file. Here are commonly used settings:

```yaml
# Useful environment variables for Gitea
environment:
  # Disable user self-registration
  - GITEA__service__DISABLE_REGISTRATION=true

  # Require sign-in to view anything
  - GITEA__service__REQUIRE_SIGNIN_VIEW=true

  # Set default theme
  - GITEA__ui__DEFAULT_THEME=gitea-dark

  # Configure repository defaults
  - GITEA__repository__DEFAULT_BRANCH=main
  - GITEA__repository__DEFAULT_PRIVATE=true

  # Attachment size limits
  - GITEA__attachment__MAX_SIZE=50
  - GITEA__attachment__MAX_FILES=10

  # Session configuration
  - GITEA__session__PROVIDER=db
  - GITEA__session__SESSION_LIFE_TIME=86400

  # Cache configuration
  - GITEA__cache__ADAPTER=memory
```

## Setting Up Gitea Actions

Gitea Actions provides GitHub Actions-compatible CI/CD. First, enable it in your configuration:

```yaml
# Add to gitea service environment
environment:
  - GITEA__actions__ENABLED=true
```

Then deploy an Actions runner:

```yaml
# Add to docker-compose.yml
  runner:
    image: gitea/act_runner:latest
    container_name: gitea-runner
    environment:
      GITEA_INSTANCE_URL: http://gitea:3000
      GITEA_RUNNER_REGISTRATION_TOKEN: ${RUNNER_TOKEN}
      GITEA_RUNNER_NAME: docker-runner
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - gitea
    restart: unless-stopped
```

Get the registration token from Gitea's admin panel under Site Administration > Runners.

Now you can use workflow files in your repositories:

```yaml
# .gitea/workflows/ci.yaml - example CI workflow
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          npm install
          npm test
      - name: Build
        run: npm run build
```

## Reverse Proxy with Nginx

For production, place Gitea behind a reverse proxy with SSL:

```yaml
# Add nginx to docker-compose.yml
  nginx:
    image: nginx:alpine
    container_name: gitea-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - gitea
    restart: unless-stopped
```

```nginx
# nginx.conf - reverse proxy for Gitea
server {
    listen 80;
    server_name git.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name git.example.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    client_max_body_size 100m;

    location / {
        proxy_pass http://gitea:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

When using a reverse proxy with HTTPS, update the ROOT_URL:

```yaml
- GITEA__server__ROOT_URL=https://git.example.com
```

## Migration from Other Platforms

Gitea can import repositories from GitHub, GitLab, and other Git hosting platforms. Use the built-in migration feature through the web interface, or automate it with the API:

```bash
# Migrate a repository from GitHub using the Gitea API
curl -X POST http://localhost:3000/api/v1/repos/migrate \
  -H "Authorization: token your-gitea-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "clone_addr": "https://github.com/user/repo.git",
    "repo_name": "repo",
    "repo_owner": "your-gitea-user",
    "service": "github",
    "mirror": false
  }'
```

## Backup and Restore

Gitea includes a built-in backup command:

```bash
# Create a full backup
docker exec gitea /usr/local/bin/gitea dump -c /data/gitea/conf/app.ini

# The backup zip file is created in the current directory inside the container
docker cp gitea:/app/gitea/gitea-dump-*.zip ./backups/
```

For database-level backups with PostgreSQL:

```bash
# Backup the PostgreSQL database
docker exec gitea-db pg_dump -U gitea gitea > gitea-db-backup.sql
```

Restore from backup:

```bash
# Stop Gitea
docker compose stop gitea

# Restore the database
docker exec -i gitea-db psql -U gitea gitea < gitea-db-backup.sql

# Restore Gitea data from the dump file
docker exec gitea unzip /data/gitea-dump-*.zip -d /data/restore/

# Start Gitea
docker compose start gitea
```

## Resource Usage

Gitea is remarkably lightweight compared to alternatives:

| Platform | Idle RAM | CPU (idle) | Disk (base) |
|----------|----------|-----------|-------------|
| Gitea | ~200 MB | < 1% | ~100 MB |
| GitLab CE | ~4 GB | ~5% | ~2.5 GB |
| Gogs | ~150 MB | < 1% | ~80 MB |

## Conclusion

Gitea in Docker delivers a full-featured Git hosting experience that runs on minimal hardware. The PostgreSQL-backed setup handles teams of hundreds of users without breaking a sweat, and Gitea Actions provides CI/CD without needing external tools. For teams that want self-hosted Git without the resource overhead of GitLab, Gitea is the clear choice. Deploy it with Docker Compose, disable registration if you want a private instance, set up a runner for CI/CD, and configure automated backups. The whole setup takes about 15 minutes.
