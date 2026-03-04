# How to Run Appwrite in Docker for Backend-as-a-Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Appwrite, BaaS, Backend-as-a-Service, Self-Hosted, Authentication, Database, Storage, Containers

Description: Complete guide to self-hosting Appwrite in Docker, covering installation, database setup, authentication, storage, and serverless functions for your backend needs.

---

Appwrite is an open-source backend-as-a-service platform that provides developers with a set of REST APIs covering authentication, databases, file storage, serverless functions, and real-time subscriptions. Think of it as a self-hosted alternative to Firebase. You get all the convenience of a managed backend with the control of running it on your own infrastructure.

Docker is the officially recommended way to deploy Appwrite. The platform ships as a collection of microservices, all orchestrated through Docker Compose. This guide walks you through installation, configuration, and practical usage.

## Prerequisites

Before starting, make sure you have:

- Docker Engine 20.10+
- Docker Compose v2
- At least 2GB of free RAM
- A domain name (optional, for production with SSL)

```bash
# Check your Docker installation
docker --version
docker compose version
```

## Quick Installation

Appwrite provides a one-line installation command that downloads the Docker Compose file and starts everything.

```bash
# Run the Appwrite installation script
docker run -it --rm \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
  --entrypoint="install" \
  appwrite/appwrite:1.5
```

This interactive installer asks for your domain, port settings, and other configuration options. It generates a `docker-compose.yml` and `.env` file in the `appwrite` directory.

## Manual Setup

If you prefer to configure things manually, create the Docker Compose file yourself.

```yaml
# docker-compose.yml - Appwrite self-hosted stack
version: "3.8"

services:
  # Main Appwrite application server
  appwrite:
    image: appwrite/appwrite:1.5
    container_name: appwrite
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - appwrite-uploads:/storage/uploads
      - appwrite-cache:/storage/cache
      - appwrite-config:/storage/config
      - appwrite-certificates:/storage/certificates
      - appwrite-functions:/storage/functions
    environment:
      - _APP_ENV=production
      - _APP_LOCALE=en
      - _APP_CONSOLE_WHITELIST_ROOT=enabled
      - _APP_CONSOLE_WHITELIST_EMAILS=
      - _APP_CONSOLE_WHITELIST_IPS=
      - _APP_SYSTEM_EMAIL_NAME=Appwrite
      - _APP_SYSTEM_EMAIL_ADDRESS=team@appwrite.io
      - _APP_SYSTEM_RESPONSE_FORMAT=
      - _APP_OPTIONS_ABUSE=enabled
      - _APP_OPTIONS_FORCE_HTTPS=disabled
      - _APP_OPENSSL_KEY_V1=your-secret-key-change-me
      - _APP_DOMAIN=localhost
      - _APP_DOMAIN_TARGET=localhost
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=appwrite
      - _APP_DB_PASS=appwrite_password
      - _APP_INFLUXDB_HOST=influxdb
      - _APP_INFLUXDB_PORT=8086
      - _APP_STATSD_HOST=telegraf
      - _APP_STATSD_PORT=8125
    depends_on:
      - redis
      - mariadb
      - influxdb
    networks:
      - appwrite-network

  # MariaDB stores all application data
  mariadb:
    image: mariadb:10.11
    container_name: appwrite-mariadb
    restart: unless-stopped
    volumes:
      - appwrite-mariadb:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: appwrite
      MYSQL_USER: appwrite
      MYSQL_PASSWORD: appwrite_password
    command: >
      --innodb-flush-method=fsync
      --innodb-flush-log-at-trx-commit=0
    networks:
      - appwrite-network

  # Redis handles caching and pub/sub messaging
  redis:
    image: redis:7-alpine
    container_name: appwrite-redis
    restart: unless-stopped
    volumes:
      - appwrite-redis:/data
    networks:
      - appwrite-network

  # InfluxDB stores usage metrics and analytics
  influxdb:
    image: influxdb:1.8-alpine
    container_name: appwrite-influxdb
    restart: unless-stopped
    volumes:
      - appwrite-influxdb:/var/lib/influxdb
    networks:
      - appwrite-network

  # Telegraf collects StatsD metrics from Appwrite
  telegraf:
    image: appwrite/telegraf:1.4.0
    container_name: appwrite-telegraf
    restart: unless-stopped
    networks:
      - appwrite-network

volumes:
  appwrite-uploads:
  appwrite-cache:
  appwrite-config:
  appwrite-certificates:
  appwrite-functions:
  appwrite-mariadb:
  appwrite-redis:
  appwrite-influxdb:

networks:
  appwrite-network:
    driver: bridge
```

## Starting the Stack

```bash
# Start all Appwrite services in the background
docker compose up -d

# Check that all containers are running
docker compose ps

# Watch the main Appwrite logs
docker compose logs -f appwrite
```

Wait about 30 seconds for all services to initialize. Then open `http://localhost` in your browser.

## Initial Configuration

When you first access the Appwrite console, you need to create your admin account.

1. Open `http://localhost` in your browser
2. Click "Sign Up" to create the first admin account
3. Enter your name, email, and a strong password
4. You will be redirected to the console dashboard

## Creating Your First Project

After logging in, create a project from the console or use the CLI.

```bash
# Install the Appwrite CLI
npm install -g appwrite-cli

# Log in to your Appwrite instance
appwrite login --endpoint http://localhost/v1

# Create a new project
appwrite projects create --projectId "my-app" --name "My Application"
```

## Working with the Database

Appwrite provides a document-based database. Create collections and documents through the SDK or REST API.

```bash
# Create a database using the REST API
curl -X POST http://localhost/v1/databases \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Project: my-app" \
  -H "X-Appwrite-Key: YOUR_API_KEY" \
  -d '{
    "databaseId": "main",
    "name": "Main Database"
  }'

# Create a collection within the database
curl -X POST http://localhost/v1/databases/main/collections \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Project: my-app" \
  -H "X-Appwrite-Key: YOUR_API_KEY" \
  -d '{
    "collectionId": "users-data",
    "name": "User Profiles",
    "permissions": ["read(\"any\")"]
  }'
```

## Authentication

Appwrite supports multiple authentication methods out of the box, including email/password, OAuth providers, phone verification, and anonymous sessions.

```javascript
// Example: Using the Appwrite Web SDK for authentication
import { Client, Account } from "appwrite";

const client = new Client();
client
  .setEndpoint("http://localhost/v1")
  .setProject("my-app");

const account = new Account(client);

// Create a new user account
async function createUser() {
  const user = await account.create(
    "unique()",           // Let Appwrite generate the user ID
    "user@example.com",
    "securepassword123",
    "John Doe"
  );
  console.log("User created:", user);
}

// Log in with email and password
async function login() {
  const session = await account.createEmailPasswordSession(
    "user@example.com",
    "securepassword123"
  );
  console.log("Session created:", session);
}
```

## File Storage

Upload and manage files through the storage API.

```bash
# Create a storage bucket
curl -X POST http://localhost/v1/storage/buckets \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Project: my-app" \
  -H "X-Appwrite-Key: YOUR_API_KEY" \
  -d '{
    "bucketId": "images",
    "name": "Image Uploads",
    "maximumFileSize": 10485760,
    "allowedFileExtensions": ["jpg", "png", "gif", "webp"]
  }'

# Upload a file to the bucket
curl -X POST http://localhost/v1/storage/buckets/images/files \
  -H "X-Appwrite-Project: my-app" \
  -H "X-Appwrite-Key: YOUR_API_KEY" \
  -F "fileId=unique()" \
  -F "file=@/path/to/photo.jpg"
```

## Serverless Functions

Appwrite can run serverless functions written in multiple languages. Deploy a function using the CLI.

```bash
# Create a new function
appwrite functions create \
  --functionId "hello-world" \
  --name "Hello World" \
  --runtime "node-18.0"

# Deploy function code from a directory
appwrite functions createDeployment \
  --functionId "hello-world" \
  --entrypoint "index.js" \
  --code "./my-function"
```

## Backup and Restore

Regularly back up your MariaDB database.

```bash
# Create a database backup
docker compose exec mariadb mysqldump -u appwrite -pappwrite_password appwrite > appwrite_backup.sql

# Restore from backup
cat appwrite_backup.sql | docker compose exec -T mariadb mysql -u appwrite -pappwrite_password appwrite
```

## Upgrading Appwrite

To upgrade to a newer version of Appwrite, follow these steps.

```bash
# Pull the latest images
docker compose pull

# Restart the stack with the new images
docker compose up -d

# Appwrite automatically runs database migrations on startup
docker compose logs -f appwrite
```

## Stopping and Cleaning Up

```bash
# Stop all services
docker compose stop

# Remove containers but keep data
docker compose down

# Remove everything including all data
docker compose down -v
```

## Summary

Appwrite provides a comprehensive backend-as-a-service solution that you can self-host with Docker. The stack includes authentication, databases, file storage, serverless functions, and real-time capabilities. By running Appwrite in Docker, you maintain full control over your data and infrastructure while still benefiting from a polished developer experience. The platform supports SDKs for multiple languages and frameworks, making it a versatile choice for web, mobile, and server-side applications.
