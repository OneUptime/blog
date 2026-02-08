# How to Run Medusa.js in Docker for E-Commerce

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Medusa.js, E-Commerce, Node.js, PostgreSQL, Redis, JavaScript, Containers, Headless Commerce

Description: Learn how to deploy Medusa.js, the open-source headless commerce engine, in Docker containers with PostgreSQL and Redis for a modern e-commerce backend.

---

Medusa.js is an open-source headless commerce platform built with Node.js. It gives developers complete control over their e-commerce logic without the bloat that comes with traditional platforms like Magento or WooCommerce. The headless architecture means you can pair the Medusa backend with any frontend - React, Next.js, Gatsby, or even a mobile app.

Running Medusa in Docker makes local development painless and production deployments consistent. This guide covers everything from initial setup to a fully working store with an admin dashboard.

## Prerequisites

You need the following tools installed:

- Docker Engine 20.10+
- Docker Compose v2
- At least 2GB of RAM allocated to Docker
- A text editor for configuration files

Verify your Docker setup.

```bash
# Confirm Docker and Compose are available
docker --version
docker compose version
```

## Project Structure

Create a project directory with subdirectories for custom configuration.

```bash
# Set up the project directory structure
mkdir medusa-docker && cd medusa-docker
mkdir -p config
```

## Docker Compose Setup

Medusa needs a PostgreSQL database and Redis for event queuing. The Docker Compose file below brings up all three services.

```yaml
# docker-compose.yml - Medusa.js with PostgreSQL and Redis
version: "3.8"

services:
  # Medusa backend API server
  medusa:
    image: node:20-alpine
    working_dir: /app
    command: sh -c "npx create-medusa-app@latest --skip-db --db-url postgresql://medusa:medusa_pass@postgres:5432/medusa --no-browser --directory /app/medusa-store && cd /app/medusa-store && npx medusa develop --host 0.0.0.0"
    ports:
      - "9000:9000"   # Medusa API
      - "7001:7001"   # Admin dashboard
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://medusa:medusa_pass@postgres:5432/medusa
      REDIS_URL: redis://redis:6379
      JWT_SECRET: supersecret_jwt_key_change_in_production
      COOKIE_SECRET: supersecret_cookie_change_in_production
    volumes:
      - medusa-data:/app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - medusa-network

  # PostgreSQL stores all commerce data
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: medusa
      POSTGRES_PASSWORD: medusa_pass
      POSTGRES_DB: medusa
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medusa"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - medusa-network

  # Redis handles the event bus and caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - medusa-network

volumes:
  medusa-data:
  postgres-data:
  redis-data:

networks:
  medusa-network:
    driver: bridge
```

## Using a Custom Dockerfile

For more control, create a custom Dockerfile that pre-installs Medusa and its dependencies.

```dockerfile
# Dockerfile - Custom Medusa.js image
FROM node:20-alpine

WORKDIR /app

# Install the Medusa CLI globally
RUN npm install -g @medusajs/medusa-cli

# Create a new Medusa project
RUN npx create-medusa-app@latest --skip-db --no-browser --directory /app/store

WORKDIR /app/store

# Install dependencies
RUN npm install

# Expose the API and admin ports
EXPOSE 9000 7001

# Start the development server
CMD ["npx", "medusa", "develop", "--host", "0.0.0.0"]
```

Then update your docker-compose.yml to build from this Dockerfile instead of using the node image directly.

```yaml
# Updated medusa service section in docker-compose.yml
services:
  medusa:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "9000:9000"
      - "7001:7001"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://medusa:medusa_pass@postgres:5432/medusa
      REDIS_URL: redis://redis:6379
      JWT_SECRET: supersecret_jwt_key_change_in_production
      COOKIE_SECRET: supersecret_cookie_change_in_production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - medusa-network
```

## Configuring Medusa

Medusa uses a `medusa-config.js` file for its settings. Here is a configuration tuned for Docker.

```javascript
// medusa-config.js - Configuration for Docker environment
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  projectConfig: {
    // Use Redis for the event bus
    redis_url: process.env.REDIS_URL || "redis://localhost:6379",
    // PostgreSQL connection string from environment
    database_url: process.env.DATABASE_URL || "postgresql://localhost/medusa",
    database_type: "postgres",
    // Allow connections from any host in Docker
    store_cors: process.env.STORE_CORS || "http://localhost:8000",
    admin_cors: process.env.ADMIN_CORS || "http://localhost:7001",
    jwt_secret: process.env.JWT_SECRET || "change-me",
    cookie_secret: process.env.COOKIE_SECRET || "change-me",
  },
  plugins: [],
};
```

## Starting the Stack

Bring up all services and watch the logs.

```bash
# Start all containers in detached mode
docker compose up -d

# Follow the logs to watch Medusa initialize
docker compose logs -f medusa
```

The first startup takes a few minutes because Medusa needs to run database migrations and seed initial data. Once you see "Medusa server is ready," the API is live.

## Verifying the Installation

Test that the Medusa API is responding.

```bash
# Check the health endpoint
curl http://localhost:9000/health

# List available products through the store API
curl http://localhost:9000/store/products | python3 -m json.tool
```

You should get a JSON response with product data if the seed script ran successfully.

## Accessing the Admin Dashboard

Medusa ships with an admin dashboard. Open your browser and navigate to `http://localhost:7001`. Create an admin user if one does not exist.

```bash
# Create an admin user from the command line
docker compose exec medusa npx medusa user --email admin@example.com --password admin123
```

Log in with those credentials to manage products, orders, customers, and settings.

## Adding a Storefront

Medusa is headless, so you need a separate frontend. The Medusa team provides a Next.js starter.

```bash
# Clone the Next.js storefront starter on your host machine
npx create-medusa-app@latest --skip-db --with-nextjs-starter

# Or run a separate container for the storefront
docker run -d \
  --name medusa-storefront \
  --network medusa-docker_medusa-network \
  -e NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://medusa:9000 \
  -p 8000:8000 \
  node:20-alpine sh -c "npx create-next-app@latest storefront && cd storefront && npm run dev"
```

## Working with Products

You can manage products via the API or the admin dashboard. Here is how to create a product through the API.

```bash
# Create a new product via the admin API
curl -X POST http://localhost:9000/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Docker T-Shirt",
    "description": "A comfortable t-shirt for Docker enthusiasts",
    "variants": [
      {
        "title": "Small",
        "prices": [{"amount": 2500, "currency_code": "usd"}]
      },
      {
        "title": "Medium",
        "prices": [{"amount": 2500, "currency_code": "usd"}]
      }
    ]
  }'
```

## Database Management

Useful commands for managing the PostgreSQL database.

```bash
# Open a psql shell to the database
docker compose exec postgres psql -U medusa -d medusa

# Run Medusa migrations manually
docker compose exec medusa npx medusa migrations run

# Back up the database to a SQL file
docker compose exec postgres pg_dump -U medusa medusa > medusa_backup.sql

# Restore from a backup
cat medusa_backup.sql | docker compose exec -T postgres psql -U medusa -d medusa
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | Required |
| REDIS_URL | Redis connection string | redis://localhost:6379 |
| JWT_SECRET | Secret for JWT token signing | Required |
| COOKIE_SECRET | Secret for cookie signing | Required |
| NODE_ENV | Node environment | development |
| STORE_CORS | Allowed origins for store API | http://localhost:8000 |
| ADMIN_CORS | Allowed origins for admin API | http://localhost:7001 |

## Stopping and Cleaning Up

```bash
# Stop all containers
docker compose stop

# Remove containers and networks but keep data
docker compose down

# Remove everything including database volumes
docker compose down -v
```

## Summary

Medusa.js offers a developer-friendly, headless approach to e-commerce. Running it in Docker gives you a portable stack with PostgreSQL for data persistence and Redis for event handling. The entire setup starts with a single `docker compose up` command. You can pair the Medusa backend with any frontend framework, build custom plugins, and scale individual services independently. For production, add proper secrets management, TLS termination, and database backups to your deployment pipeline.
