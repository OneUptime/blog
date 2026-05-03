# How to Deploy Gitea via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Gitea, Git, Self-Hosted, Docker

Description: Learn how to deploy Gitea, a lightweight self-hosted Git service, via Portainer with PostgreSQL backend, SSH access, and Gitea Actions for CI/CD.

## What Is Gitea?

Gitea is a lightweight, self-hosted Git service similar to GitHub. It requires only 1-2GB RAM (compared to GitLab's 4-8GB), making it ideal for small teams and home labs.

## Gitea via Portainer Stack

**Stacks → Add Stack → gitea**

```yaml
version: "3.8"

services:
  gitea:
    image: gitea/gitea:latest
    restart: unless-stopped
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__database__DB_TYPE=postgres
      - GITEA__database__HOST=gitea-db:5432
      - GITEA__database__NAME=gitea
      - GITEA__database__USER=gitea
      - GITEA__database__PASSWD=${GITEA_DB_PASSWORD}
      - GITEA__server__DOMAIN=gitea.yourdomain.com
      - GITEA__server__SSH_DOMAIN=gitea.yourdomain.com
      - GITEA__server__HTTP_PORT=3000
      - GITEA__server__SSH_PORT=2222
      - GITEA__server__SSH_LISTEN_PORT=22
      - GITEA__server__ROOT_URL=https://gitea.yourdomain.com/
      - GITEA__mailer__ENABLED=true
      - GITEA__mailer__SMTP_ADDR=smtp.gmail.com
      - GITEA__mailer__SMTP_PORT=587
      - GITEA__mailer__FROM=gitea@yourdomain.com
      - GITEA__mailer__USER=${SMTP_USER}
      - GITEA__mailer__PASSWD=${SMTP_PASSWORD}
    volumes:
      - gitea_data:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "3000:3000"     # HTTP
      - "2222:22"       # SSH
    depends_on:
      gitea-db:
        condition: service_healthy

  gitea-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=gitea
      - POSTGRES_USER=gitea
      - POSTGRES_PASSWORD=${GITEA_DB_PASSWORD}
    volumes:
      - gitea_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gitea"]
      interval: 10s
      retries: 5

volumes:
  gitea_data:
  gitea_db_data:
```

## Environment Variables

```text
GITEA_DB_PASSWORD = secure-db-password
SMTP_USER = your-email@gmail.com
SMTP_PASSWORD = your-app-password
```

## First-Time Setup

1. Visit `https://gitea.yourdomain.com`
2. The installation page appears only once
3. Most settings are pre-configured from environment variables
4. Create the first admin account

## Gitea CLI Configuration

```bash
# Via Portainer exec on gitea container

# Create an admin user
gitea admin user create \
  --username admin \
  --password secure-password \
  --email admin@yourdomain.com \
  --admin

# List users
gitea admin user list
```

## SSH Configuration

For SSH push/pull:

```bash
# Git clone via SSH (using port 2222)
git clone ssh://git@gitea.yourdomain.com:2222/username/repo.git

# Or configure ~/.ssh/config
Host gitea.yourdomain.com
    User git
    Port 2222
    IdentityFile ~/.ssh/id_rsa
```

## Gitea Actions (CI/CD)

Gitea Actions is compatible with GitHub Actions workflows. Enabled by default since Gitea 1.21, but can be explicitly set via environment variable on the gitea service:

```text
GITEA__actions__ENABLED=true
```

Deploy an Actions runner:

```yaml
services:
  gitea-runner:
    image: gitea/act_runner:latest
    restart: unless-stopped
    environment:
      - GITEA_INSTANCE_URL=https://gitea.yourdomain.com
      - GITEA_RUNNER_REGISTRATION_TOKEN=${RUNNER_TOKEN}
    volumes:
      - gitea_runner_data:/data
      - /var/run/docker.sock:/var/run/docker.sock
```

## Comparison: Gitea vs GitLab

| Feature | Gitea | GitLab CE |
|---------|-------|-----------|
| RAM required | 1-2GB | 4-8GB |
| Setup time | 5 min | 10-15 min |
| CI/CD | Gitea Actions | GitLab CI |
| Container Registry | Yes | Yes |
| Issue tracking | Yes | Yes |
| Pages | Limited | Yes |

## Conclusion

Gitea via Portainer is the go-to self-hosted Git solution for resource-constrained environments. It runs happily on a Raspberry Pi 4, a low-spec cloud instance, or any server where GitLab's 4GB RAM minimum is too much. The Gitea Actions integration brings GitHub Actions-compatible CI/CD without needing external services.
