# How to Set Up a Node.js Development Environment with Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Node.js, JavaScript, TypeScript, Development, DevOps

Description: Build a complete Node.js/TypeScript development environment with hot-reload, debugging, and supporting services using Docker and Portainer.

## Introduction

A containerized Node.js development environment ensures consistent behavior across all developer machines. With Docker and Portainer, you can run your Node.js application alongside databases and other services with a single command. This guide covers building a full-featured Node.js dev environment with TypeScript support.

## Step 1: Create the Development Dockerfile

```dockerfile
# Dockerfile.dev - Node.js development image

FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Install global development tools
RUN npm install -g \
    # TypeScript
    typescript \
    ts-node \
    tsup \
    # Development server
    nodemon \
    # Code quality
    eslint \
    prettier \
    # Testing
    jest \
    # CLI tools
    @nestjs/cli \
    # Package management
    pnpm

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Expose ports
# 3000 - Application
EXPOSE 3000
# 9229 - Node.js debugger
EXPOSE 9229
```

## Step 2: Deploy the Node.js Stack

```yaml
# docker-compose.yml - Node.js Development Stack
version: "3.8"

networks:
  node_dev:
    driver: bridge

volumes:
  node_modules:
  postgres_data:
  mongo_data:
  redis_data:

services:
  # Node.js application with hot-reload
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: node_app
    restart: unless-stopped
    ports:
      - "3000:3000"   # Application
      - "9229:9229"   # Inspector/debugger
    environment:
      - NODE_ENV=development
      - PORT=3000
      - DATABASE_URL=postgresql://devuser:devpassword@postgres:5432/devdb
      - MONGODB_URL=mongodb://mongodb:27017/devdb
      - REDIS_URL=redis://redis:6379
    volumes:
      # Mount source code (excludes node_modules)
      - .:/app
      # Use named volume for node_modules (faster)
      - node_modules:/app/node_modules
    # Hot-reload with nodemon
    command: >
      nodemon
      --watch src
      --ext ts,js,json
      --exec "ts-node -r tsconfig-paths/register src/index.ts"
    networks:
      - node_dev
    depends_on:
      - postgres
      - redis

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: node_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=devdb
      - POSTGRES_USER=devuser
      - POSTGRES_PASSWORD=devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - node_dev

  # MongoDB
  mongodb:
    image: mongo:7.0
    container_name: node_mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=devuser
      - MONGO_INITDB_ROOT_PASSWORD=devpassword
      - MONGO_INITDB_DATABASE=devdb
    volumes:
      - mongo_data:/data/db
    networks:
      - node_dev

  # Redis
  redis:
    image: redis:7-alpine
    container_name: node_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - node_dev

  # Mongo Express - MongoDB UI
  mongo_express:
    image: mongo-express:latest
    container_name: mongo_express
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_ADMINUSERNAME=devuser
      - ME_CONFIG_MONGODB_ADMINPASSWORD=devpassword
      - ME_CONFIG_MONGODB_URL=mongodb://devuser:devpassword@mongodb:27017/
      - ME_CONFIG_BASICAUTH=false
    networks:
      - node_dev
    depends_on:
      - mongodb

  # Redis Commander - Redis UI
  redis_commander:
    image: rediscommander/redis-commander:latest
    container_name: redis_commander
    restart: unless-stopped
    ports:
      - "8082:8081"
    environment:
      - REDIS_HOSTS=local:redis:6379
    networks:
      - node_dev
```

## Step 3: TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Step 4: Configure Node.js Debugger in VS Code

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
      "localRoot": "${workspaceFolder}/src",
      "remoteRoot": "/app/src",
      "protocol": "inspector",
      "restart": true
    }
  ]
}
```

```json
// package.json - scripts
{
  "scripts": {
    "dev": "nodemon --inspect=0.0.0.0:9229 --watch src --ext ts src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "jest --watchAll",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

## Step 5: Example Application Structure

```typescript
// src/index.ts - Express + TypeScript app
import express from 'express';
import { createClient } from 'redis';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis connection
const redis = createClient({ url: process.env.REDIS_URL });

app.use(express.json());

app.get('/health', async (req, res) => {
  const dbOk = await pool.query('SELECT 1').then(() => true).catch(() => false);
  const redisOk = await redis.ping().then(() => true).catch(() => false);

  res.json({
    status: 'ok',
    database: dbOk ? 'connected' : 'disconnected',
    redis: redisOk ? 'connected' : 'disconnected',
  });
});

async function start() {
  await redis.connect();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(console.error);
```

## Step 6: Running Tests

```bash
# Run tests in the container
docker exec node_app npm test

# Run with coverage
docker exec node_app npm run test:coverage

# Run specific test file
docker exec node_app npx jest src/services/user.test.ts
```

## Conclusion

Your Node.js development environment is fully containerized and managed through Portainer. Hot-reload ensures your changes are reflected immediately, the VS Code debugger lets you set breakpoints in TypeScript code, and supporting services (PostgreSQL, MongoDB, Redis) are always available. Portainer provides a dashboard to view container logs, restart services, and manage the entire development stack from a web browser.
