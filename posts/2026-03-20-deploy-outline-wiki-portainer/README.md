# How to Deploy Outline Wiki via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Outline, Wiki, Team Documentation, Docker, Self-Hosting, PostgreSQL

Description: Learn how to deploy Outline, the modern team knowledge base with a Notion-like editor, via Portainer with PostgreSQL, Redis, and S3-compatible storage.

---

Outline is a fast, real-time collaborative wiki with a beautiful Notion-inspired editor. It requires PostgreSQL for data and Redis for sessions. For this setup, file uploads use S3-compatible storage, and MinIO (deployed separately) works well as the backend.

## Prerequisites

- Portainer running
- MinIO or another S3-compatible store already deployed
- A public HTTPS URL for Outline and a supported authentication provider configured (Slack, Google, or a custom OIDC provider)
- At least 512MB RAM

## Compose Stack

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: outline
      POSTGRES_USER: outline
      POSTGRES_PASSWORD: outlinepass      # Change this
    volumes:
      - outline_db:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  outline:
    image: outlinewiki/outline:latest
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    ports:
      - "3101:3000"
    environment:
      SECRET_KEY: changeme-64-char-hex-string  # openssl rand -hex 32
      UTILS_SECRET: changeme-64-char-hex-string
      DATABASE_URL: postgres://outline:outlinepass@postgres:5432/outline
      REDIS_URL: redis://redis:6379
      URL: https://outline.example.com
      PORT: 3000
      FILE_STORAGE: s3
      AWS_ACCESS_KEY_ID: minioadmin
      AWS_SECRET_ACCESS_KEY: minioadmin123
      AWS_REGION: us-east-1
      AWS_S3_UPLOAD_BUCKET_URL: http://minio.example.com:9000
      AWS_S3_UPLOAD_BUCKET_NAME: outline
      AWS_S3_FORCE_PATH_STYLE: "true"
      # OAuth - configure one provider (example uses Slack)
      SLACK_CLIENT_ID: your-slack-client-id
      SLACK_CLIENT_SECRET: your-slack-client-secret

volumes:
  outline_db:
```

## Deploying

1. Create a bucket named `outline` in MinIO first.
2. In Portainer go to **Stacks > Add Stack**.
3. Name it `outline`, fill in all environment variables.
4. Click **Deploy the stack**.

## Running Migrations

Outline runs database migrations automatically on startup. If you start it with `--no-migrate`, run them manually:

```bash
# In Portainer, go to Containers > outline > Console

# Or via docker exec:
docker exec <outline-container-name> yarn db:migrate
```

## Monitoring

Use OneUptime to monitor `http://<host>:3101/_health`. Outline returns `OK` with HTTP 200 when healthy, and HTTP 500 if the PostgreSQL or Redis checks fail. Alert on non-200 responses as Outline downtime affects team knowledge sharing in real time.
