# How to Deploy Outline Wiki via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Outline, Wiki, Team Documentation, Self-Hosted

Description: Deploy Outline Wiki via Portainer as a Notion-like team knowledge base with real-time collaboration, OIDC authentication, and S3-compatible file storage.

## Introduction

Outline is a modern, Notion-like team wiki with real-time collaboration, nested document structures, and excellent search. Self-hosted Outline requires a compatible authentication provider; this guide uses OIDC (Keycloak, Authentik, Google via OIDC, etc.) with MinIO-backed S3 storage. Deploy via Portainer for a polished team knowledge management platform.

## Prerequisites

- Compatible authentication provider (this guide uses OIDC with Keycloak, Authentik, Google via OIDC, etc.)
- Public HTTPS endpoints for Outline and MinIO uploads (for example `https://wiki.example.com` and `https://s3.example.com`)
- S3-compatible storage (MinIO or AWS S3) for this setup
- Portainer installed

## Deploy as a Stack

```yaml
version: "3.8"

services:
  outline:
    image: outlinewiki/outline:latest
    container_name: outline
    environment:
      # Server
      SECRET_KEY: generate_with_openssl_rand_hex_32
      UTILS_SECRET: generate_with_openssl_rand_hex_32
      URL: https://wiki.example.com
      PORT: 3000
      
      # Database
      DATABASE_URL: postgres://outline:outline_password@outline-db:5432/outline
      PGSSLMODE: disable
      
      # Redis
      REDIS_URL: redis://outline-redis:6379
      
      # File storage (MinIO)
      FILE_STORAGE: s3
      AWS_ACCESS_KEY_ID: minio_access_key
      AWS_SECRET_ACCESS_KEY: minio_secret_key
      AWS_REGION: us-east-1
      AWS_S3_UPLOAD_BUCKET_URL: https://s3.example.com
      AWS_S3_UPLOAD_BUCKET_NAME: outline-uploads
      AWS_S3_FORCE_PATH_STYLE: "true"
      AWS_S3_ACL: private
      
      # Authentication (Keycloak/Authentik OIDC)
      OIDC_CLIENT_ID: outline
      OIDC_CLIENT_SECRET: your_client_secret
      OIDC_AUTH_URI: https://auth.example.com/realms/company/protocol/openid-connect/auth
      OIDC_TOKEN_URI: https://auth.example.com/realms/company/protocol/openid-connect/token
      OIDC_USERINFO_URI: https://auth.example.com/realms/company/protocol/openid-connect/userinfo
      OIDC_LOGOUT_URI: https://auth.example.com/realms/company/protocol/openid-connect/logout
      OIDC_SCOPES: openid profile email
      OIDC_USERNAME_CLAIM: email
      
      # Features
      ENABLE_UPDATES: "false"
      WEB_CONCURRENCY: 1
    ports:
      - "3000:3000"
    depends_on:
      - outline-db
      - outline-redis
    restart: unless-stopped

  outline-db:
    image: postgres:16-alpine
    container_name: outline-db
    environment:
      POSTGRES_DB: outline
      POSTGRES_USER: outline
      POSTGRES_PASSWORD: outline_password
    volumes:
      - outline_db:/var/lib/postgresql/data
    restart: unless-stopped

  outline-redis:
    image: redis:7-alpine
    container_name: outline-redis
    restart: unless-stopped

  # MinIO for file storage (if not using external S3)
  minio:
    image: minio/minio:latest
    container_name: minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio_access_key
      MINIO_ROOT_PASSWORD: minio_secret_key
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped

volumes:
  outline_db:
  minio_data:
```

## MinIO Bucket Setup

After deploying, ensure `s3.example.com` points to MinIO's API on port `9000`, then create the required bucket and apply CORS so browser uploads from Outline work:

```bash
docker run --rm --network container:minio \
  -e MC_HOST_local=http://minio_access_key:minio_secret_key@127.0.0.1:9000 \
  minio/mc mb local/outline-uploads

cat <<'EOF' | docker run --rm -i --network container:minio \
  -e MC_HOST_local=http://minio_access_key:minio_secret_key@127.0.0.1:9000 \
  minio/mc cors set local/outline-uploads -
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://wiki.example.com</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
  </CORSRule>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
  </CORSRule>
</CORSConfiguration>
EOF
```

## Initial Setup

1. Access `https://wiki.example.com` through your reverse proxy
2. Sign in via your OIDC provider
3. Complete workspace setup

## Workspace Organization

Outline uses **Collections** to organize documents within a workspace:

- **Engineering** - Technical docs, runbooks
- **Product** - Specs, roadmaps
- **Company** - Policies, onboarding

Documents support nested structure:

```bash
Engineering
└── Infrastructure
    ├── Docker Setup
    │   └── Production Setup
    └── Kubernetes
        └── Deployment Guide
```

## Conclusion

Outline deployed via Portainer provides a polished, collaborative team knowledge base. Self-hosted Outline needs a compatible authentication provider; this guide uses OIDC, which also ensures proper access control and single sign-on across your team tools. Real-time collaboration and excellent search make it comparable to Notion or Confluence for team documentation needs.
