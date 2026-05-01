# How to Deploy PocketBase via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, PocketBase, Backend as a Service, Docker, Self-Hosted

Description: Deploy PocketBase open-source backend using Portainer as a single-file BaaS with built-in authentication, realtime subscriptions, and file storage.

## Introduction

PocketBase is an open-source backend that packages a SQLite database, admin UI, REST API, real-time subscriptions, authentication, and file storage into a single Go binary. It runs as a single container with no external database dependencies.

## Prerequisites

- Portainer installed with Docker

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - PocketBase

services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:0.37.4
    container_name: pocketbase
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - pocketbase_data:/pb_data
      - pocketbase_public:/pb_public
      - pocketbase_migrations:/pb_migrations
    command:
      - --http=0.0.0.0:8090
      - --dir=/pb_data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8090/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - pocketbase_net

volumes:
  pocketbase_data:
  pocketbase_public:
  pocketbase_migrations:

networks:
  pocketbase_net:
    driver: bridge
```

## Step 2: Set Up the Admin Account

Open `http://<host>:8090/_/` to access the Admin UI. On first visit, create your admin account.

## Step 3: Create a Collection

In the Admin UI:
1. Click **New collection** and create a base collection named `posts`
2. Add fields: `title` (text), `content` (editor), `published` (bool)
3. If you want to use the auth examples below, create a second collection named `users` with type **Auth** and password authentication enabled
4. Configure API rules

## Step 4: Use the REST API

```bash
# List records
curl http://localhost:8090/api/collections/posts/records \
  -H 'Authorization: <user-auth-token>'

# Create a record
curl -X POST http://localhost:8090/api/collections/posts/records \
  -H 'Authorization: <user-auth-token>' \
  -H 'Content-Type: application/json' \
  -d '{"title": "Hello World", "content": "My first post", "published": true}'

# Authenticate a user from the users auth collection
curl -X POST http://localhost:8090/api/collections/users/auth-with-password \
  -H 'Content-Type: application/json' \
  -d '{"identity": "user@example.com", "password": "your-password"}'
```

## Step 5: JavaScript SDK Integration

```javascript
// npm install pocketbase
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// Authenticate
const authData = await pb.collection('users').authWithPassword(
    'user@example.com', 'your-password'
);

// List records with pagination
const posts = await pb.collection('posts').getList(1, 20, {
    filter: 'published = true',
    sort: '-created',
});

// Subscribe to real-time updates
pb.collection('posts').subscribe('*', (e) => {
    console.log(e.action, e.record);
});
```

## Step 6: Backup PocketBase Data

```bash
# PocketBase has a built-in backup endpoint. Use a superuser auth token.
curl -X POST http://localhost:8090/api/backups \
  -H 'Authorization: <superuser-auth-token>' \
  -H 'Content-Type: application/json' \
  -d '{"name": "pocketbase_backup.zip"}'

# Or copy the entire app data directory directly
# Stop the container first for transactional safety.
docker stop pocketbase
docker cp pocketbase:/pb_data ./pocketbase_pb_data_backup
docker start pocketbase
```

## Conclusion

PocketBase's SQLite-backed design means zero external database dependencies - the entire application state lives in a single directory. The `pb_data` volume contains the database files and uploaded files. For production, mount `pb_data` on fast storage (SSD) and back up the directory regularly. PocketBase also supports JS/Go hooks for custom server-side logic via the `pb_hooks` directory.
