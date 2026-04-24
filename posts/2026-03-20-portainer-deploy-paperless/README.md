# How to Deploy Paperless-ngx via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Paperless-ngx, Document Management, OCR, Self-Hosted

Description: Deploy Paperless-ngx via Portainer as a self-hosted document management system that scans, indexes, and tags your documents using OCR for a paperless office.

## Introduction

Paperless-ngx is a community-maintained document management system that scans incoming documents via OCR, automatically tags them, and makes them searchable. Deploy via Portainer to digitize and organize your paper documents, statements, and correspondence.

## Deploy as a Stack

```yaml
services:
  paperless:
    image: ghcr.io/paperless-ngx/paperless-ngx:latest
    container_name: paperless
    environment:
      PAPERLESS_REDIS: redis://paperless-redis:6379
      PAPERLESS_DBHOST: paperless-db
      PAPERLESS_DBUSER: paperless
      PAPERLESS_DBPASS: paperless_db_password
      PAPERLESS_DBNAME: paperless
      # Secret key for Django (generate with: openssl rand -hex 32)
      PAPERLESS_SECRET_KEY: your_secret_key_here
      # Admin user
      PAPERLESS_ADMIN_USER: admin
      PAPERLESS_ADMIN_PASSWORD: admin_password
      PAPERLESS_ADMIN_MAIL: admin@example.com
      # OCR language(s)
      PAPERLESS_OCR_LANGUAGE: eng
      # Time zone
      PAPERLESS_TIME_ZONE: America/New_York
      # URL for the application
      PAPERLESS_URL: https://paperless.example.com
      # Optional Office document and .eml support
      PAPERLESS_TIKA_ENABLED: 1
      PAPERLESS_TIKA_GOTENBERG_ENDPOINT: http://gotenberg:3000
      PAPERLESS_TIKA_ENDPOINT: http://tika:9998
      # Workers
      PAPERLESS_TASK_WORKERS: 2
      PAPERLESS_THREADS_PER_WORKER: 2
    volumes:
      - paperless_data:/usr/src/paperless/data
      - paperless_media:/usr/src/paperless/media
      # Consume folder: drop PDFs/images here for automatic processing
      - paperless_consume:/usr/src/paperless/consume
      # Export folder: for backup/restore
      - paperless_export:/usr/src/paperless/export
    ports:
      - "8000:8000"
    depends_on:
      - paperless-db
      - paperless-redis
      - gotenberg
      - tika
    restart: unless-stopped

  paperless-db:
    image: postgres:16-alpine
    container_name: paperless-db
    environment:
      POSTGRES_DB: paperless
      POSTGRES_USER: paperless
      POSTGRES_PASSWORD: paperless_db_password
    volumes:
      - paperless_db:/var/lib/postgresql/data
    restart: unless-stopped

  paperless-redis:
    image: redis:7-alpine
    container_name: paperless-redis
    restart: unless-stopped

  # Gotenberg - for converting Office documents and .eml files to PDF
  gotenberg:
    image: gotenberg/gotenberg:8
    container_name: gotenberg
    command: gotenberg --chromium-disable-javascript=true --chromium-allow-list=file:///tmp/.*
    restart: unless-stopped

  # Tika - for extracting text from Office documents and .eml files
  tika:
    image: apache/tika:latest
    container_name: tika
    restart: unless-stopped

volumes:
  paperless_data:
  paperless_media:
  paperless_consume:
  paperless_export:
  paperless_db:
```

## Consuming Documents

Drop documents into the consume folder for automatic processing:

```bash
# Copy a document to the consume folder

docker cp invoice.pdf paperless:/usr/src/paperless/consume/

# Or replace the consume volume with a bind mount and point a network share at that path
```

Paperless will automatically:
1. Run OCR on the document
2. Extract text and metadata
3. Create searchable PDF
4. Move to the media folder

## Setting Up Email Consumption

Configure Paperless to import documents from email:

1. Navigate to **Settings** -> **Mail**
2. Add an IMAP email account
3. Create one or more mail rules for folders, filters, and actions

## Configuring Document Classification

1. Navigate to **Correspondents** and create entities (banks, companies)
2. Navigate to **Document Types** and create categories (Invoice, Statement, etc.)
3. Navigate to **Tags** and create tags (Tax, Personal, Work)
4. Configure **Auto-tagging rules** based on content patterns

## Mobile Scanner Integration

Point mobile document scanner apps to the consume folder:

1. Replace the `paperless_consume` volume with a bind mount and share that host path via Samba/NFS
2. Point the scanner app to that network share
3. If the share does not support `inotify` (common with NFS), set `PAPERLESS_CONSUMER_POLLING` so Paperless detects new files

## Conclusion

Paperless-ngx deployed via Portainer transforms your physical document collection into a searchable, organized digital archive. The OCR engine makes all text searchable, automatic tagging rules classify documents without manual effort, and the email consumption feature captures bills and statements automatically. The persistent volumes ensure your document archive is preserved across updates.
