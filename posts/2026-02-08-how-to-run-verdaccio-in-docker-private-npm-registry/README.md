# How to Run Verdaccio in Docker (Private npm Registry)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Verdaccio, npm, Node.js, Package Registry, Docker Compose, JavaScript

Description: Deploy Verdaccio in Docker as a private npm registry for hosting internal packages and caching public ones

---

Verdaccio is a lightweight, zero-configuration private npm registry. It serves two purposes: hosting your organization's private packages and caching public packages from npmjs.com. When you install a package through Verdaccio, it fetches from the public registry once and caches it locally. Subsequent installs pull from the cache, which is faster and works offline. For private packages, Verdaccio provides a full publishing workflow with access control. Docker makes deployment effortless, giving you a private registry in under a minute.

This guide covers deploying Verdaccio in Docker, publishing private packages, configuring caching, and integrating it with CI/CD pipelines.

## Quick Start

Run Verdaccio with a single command:

```bash
# Start Verdaccio on port 4873
docker run -d \
  --name verdaccio \
  -p 4873:4873 \
  -v verdaccio-storage:/verdaccio/storage \
  -v verdaccio-conf:/verdaccio/conf \
  -v verdaccio-plugins:/verdaccio/plugins \
  verdaccio/verdaccio:6
```

Access the web UI at http://localhost:4873. The interface shows all hosted and cached packages.

## Docker Compose Setup

For a production deployment with custom configuration:

```yaml
# docker-compose.yml - Verdaccio private npm registry
version: "3.8"

services:
  verdaccio:
    image: verdaccio/verdaccio:6
    container_name: verdaccio
    ports:
      - "4873:4873"
    volumes:
      - verdaccio-storage:/verdaccio/storage
      - verdaccio-plugins:/verdaccio/plugins
      - ./config.yaml:/verdaccio/conf/config.yaml
    environment:
      - VERDACCIO_PORT=4873
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:4873/-/ping"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  verdaccio-storage:
  verdaccio-plugins:
```

## Custom Configuration

Create a configuration file with access control and caching rules:

```yaml
# config.yaml - Verdaccio configuration
storage: /verdaccio/storage
plugins: /verdaccio/plugins

# Web interface configuration
web:
  title: "My Company npm Registry"
  sort_packages: asc

# Authentication - use the built-in htpasswd file
auth:
  htpasswd:
    file: /verdaccio/storage/htpasswd
    # Maximum number of users allowed to register
    max_users: 100

# Upstream npm registry for packages not found locally
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    timeout: 30s
    maxage: 10m
    cache: true

# Package access rules
packages:
  # Scoped packages under @mycompany are private
  "@mycompany/*":
    access: $authenticated
    publish: $authenticated
    unpublish: $authenticated

  # All other packages proxy to npmjs
  "**":
    access: $all
    publish: $authenticated
    proxy: npmjs

# Server settings
server:
  keepAliveTimeout: 60

# Logging
logs:
  type: stdout
  format: pretty
  level: warn

# Rate limiting
middlewares:
  audit:
    enabled: true

# Maximum package size (100 MB)
max_body_size: 100mb

# Listen on all interfaces
listen: 0.0.0.0:4873
```

Start with the custom configuration:

```bash
# Launch Verdaccio with custom config
docker compose up -d
```

## Registering and Logging In

Configure npm to use your Verdaccio instance:

```bash
# Point npm at your Verdaccio registry
npm set registry http://localhost:4873

# Create a user account
npm adduser --registry http://localhost:4873

# Verify you are logged in
npm whoami --registry http://localhost:4873
```

## Publishing a Private Package

Create and publish an internal package:

```bash
# Initialize a new package
mkdir my-internal-lib && cd my-internal-lib
npm init --scope=@mycompany -y
```

```json
{
  "name": "@mycompany/utils",
  "version": "1.0.0",
  "description": "Internal utility functions",
  "main": "index.js",
  "publishConfig": {
    "registry": "http://localhost:4873"
  }
}
```

```javascript
// index.js - example utility module
/**
 * Format a date as YYYY-MM-DD string.
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Generate a random ID string.
 * @param {number} length - Length of the ID
 * @returns {string} Random alphanumeric string
 */
function generateId(length = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = { formatDate, generateId };
```

Publish it:

```bash
# Publish the package to Verdaccio
npm publish --registry http://localhost:4873
```

## Installing Private and Public Packages

Once Verdaccio is configured as your registry, npm works normally:

```bash
# Install your private package
npm install @mycompany/utils

# Install a public package (fetched through Verdaccio proxy)
npm install express
```

The first time you install a public package, Verdaccio fetches it from npmjs.org and caches it. Subsequent installs of the same version pull from the local cache.

## Scoped Registry Configuration

If you want to use Verdaccio only for private scoped packages and go directly to npm for everything else:

```bash
# Use Verdaccio only for @mycompany packages
npm config set @mycompany:registry http://localhost:4873

# Public packages still go directly to npmjs.org
npm config set registry https://registry.npmjs.org/
```

Or use a project-level `.npmrc` file:

```ini
# .npmrc - project-level registry configuration
@mycompany:registry=http://localhost:4873
//localhost:4873/:_authToken=${NPM_TOKEN}
```

## Using with Yarn and pnpm

Verdaccio works with all Node.js package managers:

```bash
# Yarn - set registry
yarn config set registry http://localhost:4873

# pnpm - set registry
pnpm config set registry http://localhost:4873

# Or use .npmrc (works with all package managers)
echo "registry=http://localhost:4873" > .npmrc
```

## CI/CD Integration

Use Verdaccio in CI pipelines for faster, more reliable builds:

```yaml
# .github/workflows/ci.yml - CI with Verdaccio caching
name: CI
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    services:
      verdaccio:
        image: verdaccio/verdaccio:6
        ports:
          - 4873:4873
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Configure npm registry
        run: |
          npm config set registry http://localhost:4873
          # Authenticate for private packages
          echo "//localhost:4873/:_authToken=${{ secrets.NPM_TOKEN }}" >> .npmrc

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

## Publishing in CI

Automate package publishing on tagged releases:

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: http://your-verdaccio-host:4873
      - run: npm ci
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.VERDACCIO_TOKEN }}
```

## Storage Management

Monitor and manage Verdaccio storage:

```bash
# Check storage usage
docker exec verdaccio du -sh /verdaccio/storage

# List all stored packages
docker exec verdaccio ls /verdaccio/storage

# Remove a specific cached package to force re-fetch
docker exec verdaccio rm -rf /verdaccio/storage/express
```

## Adding HTTPS with a Reverse Proxy

For production, put Verdaccio behind Nginx with TLS:

```yaml
# Add to docker-compose.yml
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - verdaccio
```

```nginx
# nginx.conf - TLS termination for Verdaccio
server {
    listen 443 ssl;
    server_name npm.example.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://verdaccio:4873;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Conclusion

Verdaccio in Docker gives your team a private npm registry with zero hassle. Private packages stay under your control, public packages get cached for speed and reliability, and the whole thing runs in a single container. The scoped registry approach is particularly clean, letting you use Verdaccio for company packages while npm handles everything else. Start with the Docker Compose setup, create your custom configuration, publish your first internal package, and configure your CI pipeline to use the registry for faster, more deterministic builds.
