# How to Set Up Docker Compose for Development Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, Development, DevOps, Local Development

Description: Build productive local development environments with Docker Compose, including hot reloading, debugging support, and service dependencies that mirror production while remaining developer-friendly.

---

Docker Compose transforms local development by providing consistent, reproducible environments that closely match production. Instead of asking developers to install and configure multiple services manually, a single `docker compose up` command brings up the entire stack.

## Basic Structure

A development-focused Docker Compose file typically includes your application, database, cache, and any other dependencies:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      # Mount source code for hot reloading
      - .:/app
      # Prevent overwriting node_modules in container
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://devuser:devpass@postgres:5432/devdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: devdb
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres-data:
```

## Development Dockerfile

Create a separate Dockerfile optimized for development:

```dockerfile
# Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Source code mounted via volume, not copied
# This enables hot reloading

# Expose port for the application
EXPOSE 3000

# Use nodemon or similar for hot reloading
CMD ["npm", "run", "dev"]
```

Notice that we do not COPY the source code. Instead, it gets mounted as a volume, allowing changes to reflect immediately.

## Enabling Hot Reloading

Different frameworks require different approaches for hot reloading inside Docker:

### Node.js with Nodemon

```json
// package.json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts,js,json src/index.ts"
  }
}
```

### React/Vue/Next.js

These frameworks need specific configuration to detect file changes through Docker:

```javascript
// next.config.js
module.exports = {
  webpackDevMiddleware: config => {
    config.watchOptions = {
      poll: 1000,      // Check for changes every second
      aggregateTimeout: 300,
    };
    return config;
  },
};
```

### Python with Flask/FastAPI

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
    environment:
      - FLASK_DEBUG=1
    command: flask run --host=0.0.0.0 --reload
```

## Separating Development and Production Configs

Use multiple Compose files to layer configurations:

```yaml
# docker-compose.yml (base configuration)
version: '3.8'

services:
  app:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db

  postgres:
    image: postgres:16-alpine
```

```yaml
# docker-compose.override.yml (automatically loaded, dev settings)
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DEBUG=*

  postgres:
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: devpass
```

```yaml
# docker-compose.prod.yml (production overrides)
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
```

Use them together:

```bash
# Development (uses override automatically)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Adding Development Tools

Include debugging and development tools in your dev setup:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "9229:9229"    # Node.js debugger port
    volumes:
      - .:/app
      - /app/node_modules
    command: node --inspect=0.0.0.0:9229 src/index.js

  # Database admin interface
  adminer:
    image: adminer:latest
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  # Email testing
  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"    # SMTP
      - "8025:8025"    # Web UI
```

## Database Seeding and Migrations

Handle database setup automatically:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres-data:/var/lib/postgresql/data
      # Initialization scripts run on first start
      - ./db/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devuser -d devdb"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Run migrations after database is ready
  migrate:
    build:
      context: .
      dockerfile: Dockerfile.dev
    command: npm run migrate
    depends_on:
      postgres:
        condition: service_healthy
    profiles:
      - setup
```

Create initialization scripts:

```sql
-- db/init/01-extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- db/init/02-seed.sql
INSERT INTO users (id, email, name) VALUES
  (uuid_generate_v4(), 'dev@example.com', 'Developer');
```

Run migrations when needed:

```bash
# Run the migrate service
docker compose --profile setup up migrate
```

## Environment Variable Management

Keep sensitive defaults out of version control:

```yaml
# docker-compose.yml
services:
  app:
    env_file:
      - .env.development
    environment:
      # Override specific values
      - LOG_LEVEL=debug
```

```bash
# .env.development (committed to repo, dev defaults)
DATABASE_URL=postgresql://devuser:devpass@postgres:5432/devdb
REDIS_URL=redis://redis:6379

# .env.development.local (not committed, personal overrides)
API_KEY=your-personal-api-key
```

Add to `.gitignore`:

```
.env.development.local
.env.local
.env*.local
```

## Performance Optimization on macOS

Docker on macOS can be slow with large volume mounts. Use these strategies:

```yaml
services:
  app:
    volumes:
      # Use cached mode for better read performance
      - .:/app:cached
      # Or delegated for better write performance
      - ./logs:/app/logs:delegated
```

For even better performance, use Docker's synchronized file shares (Docker Desktop 4.6+):

```yaml
services:
  app:
    develop:
      watch:
        - path: ./src
          target: /app/src
          action: sync
        - path: ./package.json
          target: /app/package.json
          action: rebuild
```

## Common Development Workflows

### Starting Fresh

```bash
# Remove all containers and volumes, start fresh
docker compose down -v
docker compose up --build
```

### Running One-Off Commands

```bash
# Run tests
docker compose exec app npm test

# Access database shell
docker compose exec postgres psql -U devuser -d devdb

# Install a new package
docker compose exec app npm install lodash
```

### Viewing Logs

```bash
# Follow all logs
docker compose logs -f

# Follow specific service
docker compose logs -f app

# Show last 100 lines
docker compose logs --tail=100 app
```

### Shell Access

```bash
# Open shell in running container
docker compose exec app sh

# Start new container with shell
docker compose run --rm app sh
```

## Debugging with VS Code

Configure VS Code to attach to the Node.js debugger:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Docker: Attach to Node",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app",
      "restart": true
    }
  ]
}
```

---

A well-configured Docker Compose development environment saves hours of setup time and eliminates environment inconsistencies across your team. Start with the basics, add hot reloading for fast iteration, and include development tools like database admin interfaces and email testing. Your developers will thank you.
