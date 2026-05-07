# How to Use Podman for Frontend Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Frontend, React, Vue, Angular, Web Development

Description: Learn how to use Podman containers for frontend development workflows, including development servers with hot reloading, build pipelines, and multi-framework setups.

---

> Podman containers ensure every frontend developer on your team uses the same Node.js version, build tools, and dependencies, eliminating environment drift without requiring local installations.

Frontend development involves a complex toolchain: Node.js, npm or yarn, bundlers, transpilers, linters, and testing frameworks. Different projects may need different Node versions, and global tool installations can conflict. Running your frontend development environment inside a Podman container standardizes the toolchain, isolates dependencies, and makes onboarding new team members faster. This post covers setting up Podman for frontend development with React, Vue, and Angular, including hot reloading, build pipelines, and testing.

---

## Basic Frontend Container Setup

The simplest approach is running a Node.js container with your project source mounted as a volume:

```bash
# Run an interactive Node.js container with your project mounted

podman run -it --rm \
  -v ./my-project:/app:Z \
  -w /app \
  -p 3000:3000 \
  node:20-bookworm-slim \
  bash

# Inside the container, install dependencies and start the dev server
npm install
npm start
```

For a more repeatable setup, create a Containerfile:

```dockerfile
# Containerfile.dev
FROM node:20-bookworm-slim

# Install useful development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the dev server port
EXPOSE 3000

# Enable polling for file change detection (needed in containers)
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]
```

## React Development with Podman

Create a React development environment with Vite:

```bash
# Create a new React project (run this once on the host or in a container)
podman run --rm -v .:/workspace:Z -w /workspace \
  node:20-bookworm-slim \
  npm create vite@latest my-react-app -- --template react

cd my-react-app
npm install
```

Create a Containerfile optimized for React development:

```dockerfile
# Containerfile.react
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

Run the React development container:

```bash
# Build and run the React dev container
podman build -t react-dev -f Containerfile.react .

podman run -d \
  --name react-app \
  -p 5173:5173 \
  -v ./src:/app/src:Z \
  -v ./public:/app/public:Z \
  react-dev

# Open http://localhost:5173 in your browser
# Edit files in ./src and the browser will hot-reload
```

## Vue.js Development with Podman

```dockerfile
# Containerfile.vue
FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

For a Vite-based Vue project, update the Vite config to work in a container:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    // Bind to all interfaces so the container port mapping works
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Enable polling for file watching in containers
    watch: {
      usePolling: true,
      interval: 1000
    }
  }
});
```

```bash
# Build and run the Vue dev container
podman build -t vue-dev -f Containerfile.vue .

podman run -d \
  --name vue-app \
  -p 5173:5173 \
  -v ./src:/app/src:Z \
  vue-dev
```

## Angular Development with Podman

```dockerfile
# Containerfile.angular
FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200

# Angular dev server settings
ENV NG_CLI_ANALYTICS=false

CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]
```

```bash
# Build and run the Angular dev container
podman build -t angular-dev -f Containerfile.angular .

podman run -d \
  --name angular-app \
  -p 4200:4200 \
  -v ./src:/app/src:Z \
  angular-dev
```

## Running Frontend Tests in Containers

Running tests in containers ensures consistency across developer machines and CI:

```bash
# Run Jest tests
podman run --rm \
  -v ./:/app:Z \
  -w /app \
  node:20-bookworm-slim \
  bash -c "npm ci && npm test -- --watchAll=false --coverage"

# Run Cypress end-to-end tests
podman run --rm \
  --network host \
  -v ./:/app:Z \
  -w /app \
  cypress/included:15.14.2 \
  --config baseUrl=http://localhost:5173
```

For a more complete testing setup, use a pod that runs both the dev server and the test runner:

```bash
# Create a testing pod
podman pod create --name test-pod -p 5173:5173

# Start the dev server
podman run -d --pod test-pod --name test-server \
  -v ./src:/app/src:Z \
  -v ./public:/app/public:Z \
  react-dev

# Wait for the server to be ready
sleep 10

# Run end-to-end tests against the dev server
podman run --rm --pod test-pod \
  -v ./:/app:Z \
  -w /app \
  cypress/included:15.14.2 \
  --config baseUrl=http://localhost:5173

# Clean up
podman pod stop test-pod
podman pod rm test-pod
```

## Production Builds with Multi-Stage Containers

For Vite-based frontend apps, use a multi-stage build to create an optimized production image:

```dockerfile
# Containerfile.prod
# Stage 1: Build the frontend
FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add security headers
RUN echo 'server_tokens off;' > /etc/nginx/conf.d/security.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

If you're building an Angular app, change the copy source to match your configured `outputPath` (commonly `dist/<project-name>`).

Create the Nginx configuration:

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Serve static files with caching
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback: serve index.html for client-side routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to a backend running in the same pod
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
```

Build and run the production image:

```bash
# Build the production image
podman build -t my-frontend:prod -f Containerfile.prod .

# Run the production build locally for testing
podman run -d --name frontend-prod -p 8080:80 my-frontend:prod

# Verify the production build
curl -I http://localhost:8080
```

## Linting and Code Quality

Run linters and formatters in containers for consistent results:

```bash
# Run ESLint
podman run --rm \
  -v ./:/app:Z \
  -w /app \
  node:20-bookworm-slim \
  npx eslint src/ --ext .js,.jsx,.ts,.tsx

# Run Prettier check
podman run --rm \
  -v ./:/app:Z \
  -w /app \
  node:20-bookworm-slim \
  npx prettier --check "src/**/*.{js,jsx,ts,tsx,css}"

# Run TypeScript type checking
podman run --rm \
  -v ./:/app:Z \
  -w /app \
  node:20-bookworm-slim \
  bash -c "npm ci && npx tsc --noEmit"
```

## Storybook in a Container

Run Storybook for component development in a container:

```dockerfile
# Containerfile.storybook
FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 6006

ENV CHOKIDAR_USEPOLLING=true

CMD ["npx", "storybook", "dev", "-p", "6006", "--host", "0.0.0.0"]
```

```bash
# Run Storybook
podman build -t storybook-dev -f Containerfile.storybook .
podman run -d \
  --name storybook \
  -p 6006:6006 \
  -v ./src:/app/src:Z \
  -v ./stories:/app/stories:Z \
  storybook-dev

echo "Storybook available at http://localhost:6006"
```

## Managing Multiple Frontend Projects

When you work on multiple frontend projects that need different Node.js versions, Podman keeps them isolated:

```bash
# Project A needs Node 18
podman run -d --name project-a \
  -p 3000:3000 \
  -v ./project-a:/app:Z \
  -w /app \
  node:18-bookworm-slim \
  bash -c "npm install && npm start"

# Project B needs Node 20
podman run -d --name project-b \
  -p 3001:3000 \
  -v ./project-b:/app:Z \
  -w /app \
  node:20-bookworm-slim \
  bash -c "npm install && npm start"

# Project C uses Bun instead of Node
podman run -d --name project-c \
  -p 3002:3000 \
  -v ./project-c:/app:Z \
  -w /app \
  oven/bun:latest \
  bash -c "bun install && bun run dev"
```

## Conclusion

Podman provides a clean way to containerize frontend development workflows. By running dev servers inside containers with volume mounts, you get consistent toolchain versions across your team while keeping hot reloading functional. Multi-stage builds produce optimized production images served by Nginx. And because Podman runs rootless, you do not need elevated privileges for any of this. The key configuration to remember is enabling polling-based file watching, whether through framework-specific environment variables like `WATCHPACK_POLLING` or tool configuration such as Vite's `server.watch.usePolling`, since filesystem events from the host do not always propagate into the container.
