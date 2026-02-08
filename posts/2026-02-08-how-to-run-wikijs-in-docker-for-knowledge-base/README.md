# How to Run Wiki.js in Docker for Knowledge Base

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, wikijs, knowledge-base, documentation, self-hosted, wiki

Description: Deploy Wiki.js in Docker to create a modern, feature-rich knowledge base with Git sync, Markdown support, and powerful search.

---

Wiki.js is a modern, open-source wiki engine that runs on Node.js and provides a polished editing experience with Markdown support, Git-based storage, and full-text search. It looks and feels like a contemporary web application rather than a traditional wiki. Docker deployment simplifies the setup by packaging the application and its PostgreSQL database in a reproducible stack.

## Why Wiki.js?

Traditional wiki software like MediaWiki works, but it feels dated. Wiki.js brings a modern interface with multiple editor options (Markdown, WYSIWYG, raw HTML), built-in diagramming support, and native Git synchronization. Your wiki content can live in a Git repository, giving you version control, branching, and the ability to edit content with any text editor. The search is fast and accurate, powered by the database's full-text capabilities or an optional Elasticsearch backend.

## Prerequisites

- A Linux server with Docker and Docker Compose installed
- At least 1 GB of RAM (2 GB recommended)
- A domain name for production use
- Optional: a Git repository for content synchronization

## Project Setup

```bash
# Create the Wiki.js project directory
mkdir -p ~/wikijs/{db,config}
cd ~/wikijs
```

## Docker Compose Configuration

Wiki.js works best with PostgreSQL as its database backend:

```yaml
# docker-compose.yml - Wiki.js Knowledge Base
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    container_name: wikijs-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: wikijs
      POSTGRES_USER: wikijs
      POSTGRES_PASSWORD: db_password_change_me
    volumes:
      # Persist PostgreSQL data
      - ./db:/var/lib/postgresql/data
    networks:
      - wikijs-net

  wikijs:
    image: ghcr.io/requarks/wiki:2
    container_name: wikijs
    restart: unless-stopped
    depends_on:
      - db
    ports:
      # Web interface
      - "3000:3000"
    environment:
      # Database configuration
      DB_TYPE: postgres
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: wikijs
      DB_PASS: db_password_change_me
      DB_NAME: wikijs
    networks:
      - wikijs-net

networks:
  wikijs-net:
    driver: bridge
```

## Starting Wiki.js

```bash
# Start the Wiki.js stack
docker compose up -d
```

Monitor the initialization:

```bash
# Watch the startup logs
docker compose logs -f wikijs
```

Once you see "HTTP Server: Listening on port 3000," the application is ready. Open `http://<your-server-ip>:3000` in your browser.

## Initial Setup

The first-time setup wizard asks for:

1. **Admin email and password** - Create your administrator account
2. **Site URL** - Enter the URL where Wiki.js will be accessible (e.g., `https://wiki.your-domain.com`)
3. **Telemetry** - Choose whether to send anonymous usage statistics

After completing the setup, you land on the admin dashboard.

## Configuring the Editor

Wiki.js supports multiple editors. Configure the default in Administration > Editors:

- **Markdown** - Clean syntax for developers. Supports GitHub-flavored Markdown with extensions.
- **Visual Editor** - WYSIWYG editing for non-technical users.
- **Raw HTML** - Direct HTML editing for advanced layouts.
- **Code** - Syntax-highlighted code editing.

Most teams use Markdown as the default and keep the Visual Editor enabled for users who prefer it.

## Creating Your First Pages

Click the "New Page" button, choose your editor, and start writing. Wiki.js uses a path-based structure for pages:

```
# Example page paths
/home                         # Root homepage
/engineering/getting-started  # Nested under engineering
/operations/runbooks/deploy   # Three levels deep
/api/v2/authentication        # Mirrors your API structure
```

You can create navigation menus that reflect your page hierarchy. Go to Administration > Navigation to customize the sidebar.

## Setting Up Git Synchronization

One of Wiki.js's best features is Git sync. Your wiki content gets pushed to a Git repository, providing backup, version history, and the option to edit pages outside the wiki UI.

Configure Git storage in Administration > Storage:

1. Click "Git" in the storage targets list
2. Enable it and fill in the connection details:

```
# Git synchronization settings
Authentication Type: SSH
Repository URL: git@github.com:your-org/wiki-content.git
Branch: main
SSH Private Key: (paste your deploy key)
Sync Direction: Bi-directional
Sync Schedule: Every 5 minutes
```

Generate a deploy key for the repository:

```bash
# Generate an SSH key for Wiki.js Git sync
ssh-keygen -t ed25519 -f ~/wikijs/git-deploy-key -N ""
```

Add the public key as a deploy key on your Git repository with write access.

## Authentication and Access Control

Wiki.js supports many authentication providers. Configure them in Administration > Authentication:

- **Local** - Built-in username/password authentication
- **LDAP/Active Directory** - Enterprise directory integration
- **OAuth2/OpenID Connect** - Google, GitHub, GitLab, Okta, and others
- **SAML 2.0** - Enterprise SSO

Here is an example of adding Google OAuth:

1. Create OAuth credentials in the Google Cloud Console
2. In Wiki.js, go to Administration > Authentication
3. Click Google and enable it
4. Enter your Client ID and Client Secret
5. Set the callback URL to `https://wiki.your-domain.com/login/google/callback`

## Page Permissions

Control who can read and edit pages using groups and page rules:

1. Create groups in Administration > Groups (e.g., "Engineers," "Marketing," "Contractors")
2. Define page rules for each group:

```
# Example page rules for the Engineers group
Allow READ on /engineering/*
Allow WRITE on /engineering/*
Allow READ on /operations/runbooks/*
Deny WRITE on /operations/runbooks/production/*

# Example for Contractors group
Allow READ on /engineering/onboarding/*
Deny READ on /engineering/internal/*
```

## Search Configuration

Wiki.js uses PostgreSQL's built-in full-text search by default, which works well for most installations. For larger wikis, you can switch to Elasticsearch:

```yaml
# Add Elasticsearch to docker-compose.yml for advanced search
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    container_name: wikijs-search
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    volumes:
      - ./elasticsearch:/usr/share/elasticsearch/data
    networks:
      - wikijs-net
```

Then configure the search engine in Administration > Search to use Elasticsearch.

## Embedding Diagrams

Wiki.js has built-in support for diagrams using several libraries. In the Markdown editor, you can embed Mermaid, PlantUML, or Draw.io diagrams directly in your pages:

```markdown
# Example Mermaid diagram in a Wiki.js page
​```mermaid
sequenceDiagram
    Client->>API Gateway: Request
    API Gateway->>Auth Service: Validate Token
    Auth Service-->>API Gateway: Token Valid
    API Gateway->>Backend: Forward Request
    Backend-->>Client: Response
​```
```

Enable diagram support in Administration > Editors > Markdown > allow Mermaid diagrams.

## Backup Strategy

With Git sync enabled, your content is already backed up in a repository. For the database:

```bash
# Dump the PostgreSQL database
docker exec wikijs-db pg_dump -U wikijs wikijs > ~/wikijs-backup/db_$(date +%Y%m%d).sql
```

## Updating Wiki.js

```bash
# Pull the latest image and restart
docker compose pull wikijs
docker compose up -d wikijs
```

Wiki.js handles database migrations automatically during startup.

## Monitoring with OneUptime

Set up an HTTP monitor in OneUptime for your Wiki.js instance. During incident response, your team needs access to runbooks and documentation. If the knowledge base itself is down when you need it most, that compounds the problem. Proactive monitoring ensures you know about issues before they matter.

## Wrapping Up

Wiki.js in Docker delivers a modern knowledge base that developers and non-technical users alike enjoy using. Git synchronization provides an extra layer of backup and flexibility, while the permission system keeps sensitive documentation secure. The multiple editor options mean everyone on your team can contribute in the format they are most comfortable with.
