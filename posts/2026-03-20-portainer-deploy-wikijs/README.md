# How to Deploy WikiJS via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Wikijs, Wiki, Documentation, Self-Hosted

Description: Deploy Wiki.js via Portainer as a powerful, modern wiki platform with multiple storage backends, rich editing options, and extensive authentication methods.

## Introduction

Wiki.js is a modern, full-featured wiki platform built on Node.js. It stores content in a database and can back it up or synchronize it to external storage targets such as Git and cloud storage. It supports many authentication providers and multiple editors (Markdown, Visual Editor, Code, AsciiDoc). Deploy via Portainer with PostgreSQL for a production-ready knowledge base.

## Deploy as a Stack

```yaml
services:
  wikijs:
    image: ghcr.io/requarks/wiki:2
    container_name: wikijs
    environment:
      DB_TYPE: postgres
      DB_HOST: wikijs-db
      DB_PORT: 5432
      DB_USER: wikijs
      DB_PASS: wikijs_db_password
      DB_NAME: wikijs
    ports:
      - "3000:3000"
    depends_on:
      wikijs-db:
        condition: service_healthy
    restart: unless-stopped

  wikijs-db:
    image: postgres:16-alpine
    container_name: wikijs-db
    environment:
      POSTGRES_DB: wikijs
      POSTGRES_USER: wikijs
      POSTGRES_PASSWORD: wikijs_db_password
    volumes:
      - wikijs_db:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wikijs"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  wikijs_db:
```

## Initial Setup

1. Access `http://<host>:3000`
2. Complete setup wizard:
   - Set admin email and password
   - Choose site name and URL
3. Log in to the admin area

## Configure Git Storage (Optional)

Back up content to a Git repository:

1. Navigate to **Administration > Storage**
2. Enable **Git**
3. Configure:
   - Dedicated repository URL
   - Branch: `main`
   - Auth: SSH key
4. Set sync direction: **Bi-directional**
5. Click **Apply Changes**

## Configure Authentication

Wiki.js supports many auth providers:

1. Navigate to **Administration > Authentication**
2. Add a provider:
   - **Local** (default, users created in Wiki.js)
   - **Google** - OAuth2
   - **GitHub** - OAuth2
   - **SAML 2.0** - Enterprise SSO
   - **LDAP/Active Directory**

## Page Management

Wiki.js organizes content by path:

- `/` - Root homepage
- `/engineering/docker/setup` - Nested path
- `/hr/onboarding/day-one` - Any depth

## Using Multiple Editors

Wiki.js supports:
- **Markdown** - Standard MD with extensions
- **Visual Editor** - WYSIWYG HTML editing
- **Code** - Raw HTML
- **AsciiDoc** - Alternative markup

## Conclusion

Wiki.js deployed via Portainer provides a flexible, modern wiki with more features than most alternatives. Git storage integration means your wiki content can be version-controlled in a repository, and the wide authentication support handles everything from simple local users to enterprise LDAP. The multiple editor options accommodate different team members' preferences.
