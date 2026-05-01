# How to Deploy Wiki.JS via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Wiki.js, Documentation, Docker, Self-Hosting, PostgreSQL, Markdown

Description: Learn how to deploy Wiki.js, the powerful Node.js-based wiki platform, via Portainer with a PostgreSQL backend and Git synchronization support.

---

Wiki.js is a modern, feature-rich wiki built on Node.js. It supports Markdown, WYSIWYG editing, Git synchronization for version control, and granular access permissions. Portainer makes the two-container stack straightforward to manage.

## Prerequisites

- Portainer running
- At least 1GB RAM

## Compose Stack

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: wiki
      POSTGRES_USER: wikijs
      POSTGRES_PASSWORD: wikijspass      # Change this
    volumes:
      - wikijs_db:/var/lib/postgresql/data

  wiki:
    image: ghcr.io/requarks/wiki:2
    restart: unless-stopped
    depends_on:
      - db
    ports:
      - "3100:3000"
    environment:
      DB_TYPE: postgres
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: wikijs
      DB_PASS: wikijspass                # Must match db service
      DB_NAME: wiki

volumes:
  wikijs_db:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `wikijs`.
3. Update the database password.
4. Click **Deploy the stack**.

Open `http://<host>:3100` to complete the setup wizard. Create your administrator account on the first run.

## Git Storage Backend

Wiki.js can sync all pages to a Git repository, providing automatic version history:

1. Go to **Administration > Storage**.
2. Enable **Git** storage.
3. Configure your repository URL and SSH key or token.
4. Set the sync interval (e.g., every 5 minutes).

New commits are synced to your Git repository on the schedule you configure.

## Access Control

Wiki.js has granular permissions using groups, global permissions, and path-based page rules. Create groups under **Administration > Groups** and assign permissions with page rules such as:

```text
Path starts with /public     → Allow Read for Guests
Path starts with /internal   → Allow Read/Write for Staff group
Path starts with /admin      → Allow Manage for Administrators
```

## Monitoring

Use OneUptime to monitor `http://<host>:3100` for HTTP 200. Wiki.js serves its web UI at the root path. Configure an alert so that documentation becomes available again quickly after any outage.
