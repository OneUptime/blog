# How to Use Mongo Express for Web-Based MongoDB Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongo Express, Administration, Docker, Web UI

Description: Learn how to set up and use Mongo Express, the web-based MongoDB admin interface, with Docker for browsing collections, running queries, and managing documents.

---

## What Is Mongo Express

Mongo Express is a lightweight, web-based MongoDB administration interface built with Node.js and Express. It provides a browser UI for browsing databases and collections, viewing and editing documents, running queries, and managing indexes - without needing the mongo shell or Compass installed locally.

## Running Mongo Express with Docker

The fastest way to run Mongo Express is with Docker:

```bash
docker run -d \
  --name mongo-express \
  -p 8081:8081 \
  -e ME_CONFIG_MONGODB_URL="mongodb://root:password@mongo:27017/" \
  -e ME_CONFIG_BASICAUTH_ENABLED="true" \
  -e ME_CONFIG_BASICAUTH_USERNAME="admin" \
  -e ME_CONFIG_BASICAUTH_PASSWORD="securepass" \
  mongo-express
```

Access the UI at `http://localhost:8081`.

## Docker Compose Setup (Recommended)

Use Docker Compose to run MongoDB and Mongo Express together:

```yaml
version: "3.8"
services:
  mongo:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: rootpassword
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  mongo-express:
    image: mongo-express:1.0
    restart: always
    depends_on:
      - mongo
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_URL: mongodb://root:rootpassword@mongo:27017/
      ME_CONFIG_MONGODB_ENABLE_ADMIN: "true"
      ME_CONFIG_BASICAUTH_ENABLED: "true"
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin123

volumes:
  mongo_data:
```

Start the stack:

```bash
docker-compose up -d
```

## Connecting to a Replica Set

For replica set connections, specify the `replicaSet` parameter:

```yaml
ME_CONFIG_MONGODB_URL: "mongodb://root:password@mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0"
```

## Key Configuration Options

| Environment Variable | Description |
|---|---|
| `ME_CONFIG_MONGODB_URL` | Full MongoDB connection string |
| `ME_CONFIG_MONGODB_ENABLE_ADMIN` | Enable admin access to all databases |
| `ME_CONFIG_BASICAUTH_ENABLED` | Enable HTTP basic auth for UI |
| `ME_CONFIG_BASICAUTH_USERNAME` | HTTP basic auth username for UI |
| `ME_CONFIG_BASICAUTH_PASSWORD` | HTTP basic auth password for UI |
| `ME_CONFIG_SITE_BASEURL` | Base URL prefix if behind a reverse proxy |
| `ME_CONFIG_REQUEST_SIZE` | Max update payload size in MB (default: 50) |

## Using the Web Interface

### Browsing Collections

The home page lists all databases. Click a database to see its collections. Each collection shows the document count and size.

### Viewing and Editing Documents

Click a collection to browse documents in a paginated table. Each document has **Edit** and **Delete** buttons. The edit view shows the document as JSON with syntax highlighting.

### Running Queries

Use the query bar above the document list. Paste a filter document:

```json
{ "status": "active", "createdAt": { "$gte": { "$date": "2024-01-01T00:00:00Z" } } }
```

### Adding Documents

Click **New Document** to open an empty JSON editor. Paste or type your document:

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin",
  "createdAt": { "$date": "2025-01-01T00:00:00Z" }
}
```

## Securing Mongo Express in Production

Mongo Express should never be exposed directly to the public internet. Place it behind a reverse proxy with TLS:

```nginx
server {
    listen 443 ssl;
    server_name mongo-admin.internal.example.com;

    ssl_certificate /etc/ssl/certs/internal.crt;
    ssl_certificate_key /etc/ssl/private/internal.key;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Additionally, use VPN or IP allowlisting to restrict access to the admin port.

## Installing Mongo Express Without Docker

```bash
npm install -g mongo-express
```

Create a config file at `/etc/mongo-express/config.js` based on the default config:

```bash
cp $(npm root -g)/mongo-express/config.default.js /etc/mongo-express/config.js
```

Edit the config and start:

```bash
ME_CONFIG_MONGODB_URL="mongodb://localhost:27017" node $(npm root -g)/mongo-express/app.js
```

## Summary

Mongo Express provides a quick web-based UI for MongoDB administration without requiring Compass or the shell. Deploy it with Docker Compose alongside your MongoDB instance, configure basic auth credentials, and restrict access via a reverse proxy or VPN. It is best suited for development environments and internal tools, not as a production-facing interface.
