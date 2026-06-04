# How to Run Appwrite in Docker for Backend-as-a-Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Appwrite, BaaS, Backend-as-a-Service, Self-Hosted, Authentication, Database, Storage, Container

Description: Complete guide to self-hosting Appwrite in Docker, covering installation, database setup, authentication, storage, and serverless functions for your backend needs.

---

Appwrite is an open-source backend-as-a-service platform that provides developers with a set of REST APIs covering authentication, databases, file storage, serverless functions, and real-time subscriptions. Think of it as a self-hosted alternative to Firebase. You get all the convenience of a managed backend with the control of running it on your own infrastructure.

Docker is the officially recommended way to deploy Appwrite. The platform ships as a collection of microservices, all orchestrated through Docker Compose. This guide walks you through installation, configuration, and practical usage.

## Prerequisites

Before starting, make sure you have:

- Docker Engine 20.10+
- Docker Compose v2
- At least 2 CPU cores
- At least 4GB of free RAM
- At least 2GB of swap memory
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
  --publish 20080:20080 \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
  --entrypoint="install" \
  appwrite/appwrite:1.9.0
```

Once the installer is running, open `http://localhost:20080` in your browser. The web-based setup wizard asks for your domain, port settings, database backend, and other configuration options. It generates a `docker-compose.yml` and `.env` file in the `appwrite` directory.

## Manual Setup

If you prefer to configure things manually, use the generated `docker-compose.yml` and `.env` templates from the official Appwrite installation docs. Appwrite's current self-hosted stack includes Traefik, the Appwrite API containers, background workers, an executor, Redis, and your selected database backend, so a minimal single-service Compose file is not enough.

Create a directory named `appwrite`, place both files inside it, and edit the `.env` file before starting the stack. At minimum, replace `_APP_OPENSSL_KEY_V1` and `_APP_EXECUTOR_SECRET` with unique secret values. During setup you can choose MongoDB, which is the default database backend in Appwrite 1.9, or MariaDB if you prefer a relational backend.

## Starting the Stack

```bash
# Start all Appwrite services in the background
cd appwrite
docker compose up -d --remove-orphans

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

After logging in, create a project from the console and initialize the CLI for that project.

```bash
# Install the Appwrite CLI
npm install -g appwrite-cli

# Log in to your Appwrite instance
appwrite login --endpoint http://localhost/v1

# Initialize the CLI for the project you created in the console
appwrite init project
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
import { Client, Account, ID } from "appwrite";

const client = new Client();
client
  .setEndpoint("http://localhost/v1")
  .setProject("my-app");

const account = new Account(client);

// Create a new user account
async function createUser() {
  const user = await account.create({
    userId: ID.unique(),
    email: "user@example.com",
    password: "securepassword123",
    name: "John Doe"
  });
  console.log("User created:", user);
}

// Log in with email and password
async function login() {
  const session = await account.createEmailPasswordSession({
    email: "user@example.com",
    password: "securepassword123"
  });
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
  --function-id "hello-world" \
  --name "Hello World" \
  --runtime "node-18.0" \
  --entrypoint "index.js" \
  --commands "npm install"

# Deploy function code from a directory
appwrite functions create-deployment \
  --function-id "hello-world" \
  --entrypoint "index.js" \
  --commands "npm install" \
  --code "./my-function" \
  --activate true
```

## Backup and Restore

Regularly back up your database. If you chose MariaDB during setup, back up all MariaDB databases with `mysqldump`.

```bash
# Create a database backup
docker compose exec mariadb sh -c 'exec mysqldump --all-databases --add-drop-database --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD"' > appwrite_backup.sql

# Restore from backup
cat appwrite_backup.sql | docker compose exec -T mariadb sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'
```

## Upgrading Appwrite

To upgrade to a newer version of Appwrite, follow these steps.

```bash
# From the parent directory that contains the appwrite folder, run the upgrade tool
docker run -it --rm \
  --publish 20080:20080 \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
  --entrypoint="upgrade" \
  appwrite/appwrite:<APPWRITE_VERSION>

# Run database migrations from the Appwrite directory
cd appwrite
docker compose exec appwrite migrate

# Watch the main Appwrite logs
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
