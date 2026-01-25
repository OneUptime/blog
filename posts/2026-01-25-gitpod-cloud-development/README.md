# How to Use Gitpod for Cloud Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gitpod, Cloud Development, Developer Experience, Remote Development, DevOps

Description: Learn how to configure Gitpod workspaces for instant, reproducible cloud development environments that work with GitHub, GitLab, and Bitbucket repositories.

---

Gitpod provides ephemeral, cloud-based development environments that spin up in seconds. Unlike local development where you manage dependencies and configurations yourself, Gitpod handles everything through a simple configuration file. Developers get consistent environments regardless of their local machine specs or operating system.

## Getting Started with Gitpod

The fastest way to try Gitpod is by prefixing any Git repository URL with `gitpod.io/#`. For example:

```
https://gitpod.io/#https://github.com/yourorg/yourproject
```

This launches a workspace using default settings. For production use, you want explicit configuration through a `.gitpod.yml` file in your repository root.

## Basic Configuration

Here is a complete `.gitpod.yml` for a Node.js project:

```yaml
# .gitpod.yml - Gitpod workspace configuration

# Base image for the workspace
# Gitpod provides optimized images for common stacks
image: gitpod/workspace-node-lts

# Tasks run when the workspace starts
# Each task gets its own terminal
tasks:
  # First task: install dependencies and start the dev server
  - name: Development Server
    # init runs during prebuild (cached)
    init: npm ci
    # command runs every time workspace starts
    command: npm run dev

  # Second task: start background services
  - name: Database
    command: |
      docker-compose up -d postgres redis
      echo "Services started!"

# Ports to expose
ports:
  # Main application port
  - port: 3000
    onOpen: open-preview    # Open in preview pane
    visibility: public      # Accessible without authentication

  # PostgreSQL port
  - port: 5432
    onOpen: ignore          # Don't take action when port opens
    visibility: private     # Only accessible within workspace

# VS Code extensions to install
vscode:
  extensions:
    - dbaeumer.vscode-eslint
    - esbenp.prettier-vscode
    - bradlc.vscode-tailwindcss
    - prisma.prisma
```

## Custom Docker Images

When the default images lack tools you need, create a custom Dockerfile:

```dockerfile
# .gitpod.Dockerfile
FROM gitpod/workspace-full

# Install system packages
# Using sudo because workspace runs as gitpod user
RUN sudo apt-get update && sudo apt-get install -y \
    postgresql-client \
    redis-tools \
    && sudo rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g @nestjs/cli prisma

# Install Python packages for data scripts
RUN pip install pandas numpy requests

# Configure shell aliases
RUN echo 'alias k=kubectl' >> ~/.bashrc
RUN echo 'alias dc=docker-compose' >> ~/.bashrc
```

Reference the Dockerfile in your configuration:

```yaml
# .gitpod.yml
image:
  file: .gitpod.Dockerfile

tasks:
  - name: Setup
    init: npm ci && npx prisma generate
    command: npm run dev

ports:
  - port: 3000
    onOpen: open-preview
```

## Multi-Service Development

Most applications need databases and other services. Gitpod supports Docker Compose for multi-container setups:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

volumes:
  pgdata:
```

Configure Gitpod to start these services:

```yaml
# .gitpod.yml
image: gitpod/workspace-full

tasks:
  - name: Services
    # Start Docker services before the main application
    before: docker-compose up -d
    init: |
      # Wait for PostgreSQL to be ready
      until docker-compose exec -T postgres pg_isready; do
        echo "Waiting for PostgreSQL..."
        sleep 2
      done
      # Run database migrations
      npm ci
      npx prisma migrate deploy
      npx prisma db seed
    command: npm run dev

  - name: Worker
    # Start background job processor
    command: |
      gp await-port 5432
      npm run worker

ports:
  - port: 3000
    onOpen: open-preview
  - port: 5432
    onOpen: ignore
  - port: 6379
    onOpen: ignore
  - port: 8025
    onOpen: open-browser
    name: Mail UI

vscode:
  extensions:
    - cweijan.vscode-postgresql-client2
```

## Prebuilds for Faster Startup

Prebuilds run the `init` phase ahead of time, so developers get instant workspaces. Configure prebuilds through your Git provider integration:

```yaml
# .gitpod.yml
image: gitpod/workspace-node-lts

# Prebuild configuration
github:
  prebuilds:
    # Enable prebuilds for the default branch
    master: true
    # Enable prebuilds for all branches
    branches: true
    # Enable prebuilds for pull requests from the same repo
    pullRequests: true
    # Enable prebuilds for pull requests from forks
    pullRequestsFromForks: true
    # Add a commit status for prebuild progress
    addCheck: prevent-hierarchical-merge

tasks:
  - name: Dev Server
    # Everything in init is cached in prebuilds
    init: |
      npm ci
      npm run build
      npx prisma generate
    command: npm run dev
```

The prebuild process flow:

```mermaid
flowchart LR
    A[Push to Branch] --> B[Gitpod Detects Change]
    B --> C[Run init Commands]
    C --> D[Snapshot Workspace]
    D --> E[Store Prebuild Image]

    F[Developer Opens Workspace] --> G{Prebuild Available?}
    G -->|Yes| H[Load Snapshot]
    G -->|No| I[Run init from Scratch]
    H --> J[Run command]
    I --> J
    J --> K[Workspace Ready]
```

## Environment Variables and Secrets

Store secrets in Gitpod's environment variable storage rather than in your repository:

```yaml
# .gitpod.yml
image: gitpod/workspace-node-lts

tasks:
  - name: Development
    init: npm ci
    command: |
      # Environment variables configured in Gitpod settings
      # are automatically available
      echo "Starting with API endpoint: $API_ENDPOINT"
      npm run dev

# Document required variables for team members
# Set these in Gitpod dashboard: gitpod.io/variables
# Required:
#   - DATABASE_URL: PostgreSQL connection string
#   - API_KEY: Third-party API authentication
#   - AWS_ACCESS_KEY_ID: AWS credentials
#   - AWS_SECRET_ACCESS_KEY: AWS credentials
```

Configure variables through the Gitpod dashboard or CLI:

```bash
# Set a variable for all workspaces in a repository
gp env DATABASE_URL=postgresql://user:pass@host:5432/db

# Set a variable for all your workspaces
gp env -u API_KEY=your-api-key

# List configured variables
gp env
```

## JetBrains IDE Support

Gitpod works with JetBrains IDEs through JetBrains Gateway:

```yaml
# .gitpod.yml
image: gitpod/workspace-full

# Configure JetBrains IDE settings
jetbrains:
  intellij:
    plugins:
      - com.intellij.plugins.vscodekeymap
      - org.jetbrains.plugins.go
    prebuilds:
      version: stable

tasks:
  - name: Build
    init: ./gradlew build
    command: ./gradlew bootRun
```

## Workspace Lifecycle

Understand the Gitpod workspace states for better configuration:

```yaml
# .gitpod.yml
tasks:
  - name: Main Task
    # before: runs before init, every time
    # Good for service startup that cannot be cached
    before: docker-compose up -d

    # init: runs once during prebuild or first start
    # Good for dependency installation and builds
    init: |
      npm ci
      npm run build

    # command: runs every time workspace starts
    # Good for dev servers and interactive processes
    command: npm run dev
```

Workspace states:

1. **Prebuild**: Runs `init` commands, creates snapshot
2. **Starting**: Restores snapshot, runs `before` and `command`
3. **Running**: Workspace is active
4. **Stopping**: Workspace going idle (30 min default)
5. **Stopped**: Workspace hibernated, can be restarted

## Collaboration Features

Gitpod supports workspace sharing for pair programming:

```yaml
# .gitpod.yml
image: gitpod/workspace-node-lts

tasks:
  - name: Dev Server
    init: npm ci
    command: npm run dev

ports:
  - port: 3000
    # Make the port accessible to anyone with the URL
    visibility: public
  - port: 3001
    # Restrict to workspace owner and shared users
    visibility: private

# Allow other Gitpod users to access this workspace
# Configure through workspace settings, not here
```

Share a running workspace:

1. Click "Share" in the workspace
2. Choose sharing level (read-only or full access)
3. Send the link to collaborators

## CLI Commands

Gitpod provides a CLI for workspace management:

```bash
# Open a workspace from your terminal
gitpod open https://github.com/yourorg/yourproject

# Stop the current workspace
gp stop

# Take a snapshot of the current state
gp snapshot

# Wait for a port to be available
gp await-port 3000

# Open a URL in the browser
gp preview http://localhost:3000

# Get workspace information
gp info

# Synchronize environment variables
gp env sync
```

## Integrating with CI/CD

Use the same environment for development and CI:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Gitpod Image
        run: docker build -f .gitpod.Dockerfile -t test-image .

      - name: Run Tests
        run: |
          docker run --rm test-image npm ci
          docker run --rm test-image npm test
```

## Best Practices

1. **Optimize init commands**: Move slow operations like `npm ci` to `init` so prebuilds cache them. Keep `command` fast.

2. **Use workspace-full sparingly**: It includes many tools but is large. Use language-specific images like `workspace-node-lts` when possible.

3. **Pin image versions**: Avoid surprises by specifying exact versions in your Dockerfile.

4. **Document environment setup**: Include a README section explaining required Gitpod variables.

5. **Test configuration changes**: Before merging, open a Gitpod workspace from your branch to verify the configuration works.

Gitpod transforms repository exploration from a multi-hour setup process to a single click. Contributors can fix bugs, review code, or add features without ever touching their local machine configuration.
