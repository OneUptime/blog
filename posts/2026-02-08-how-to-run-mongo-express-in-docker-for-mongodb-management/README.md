# How to Run Mongo Express in Docker for MongoDB Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, MongoDB, Mongo Express, Database Management, Docker Compose, Web UI

Description: Set up Mongo Express in Docker to get a web-based MongoDB admin interface for browsing, editing, and managing your databases visually.

---

Managing MongoDB through the command line works, but sometimes you want a visual interface to browse collections, inspect documents, and run quick queries. Mongo Express fills that gap perfectly. It is a lightweight, web-based MongoDB admin interface that runs in a Docker container alongside your database. This guide covers everything from basic setup to production-safe configuration.

## What Is Mongo Express?

Mongo Express is an open-source web application written in Node.js that provides a clean UI for MongoDB administration. You can browse databases, view and edit documents, run queries, and manage indexes, all from your browser. Think of it as phpMyAdmin but for MongoDB.

Running it in Docker means zero installation on your host machine and easy cleanup when you no longer need it.

## Quick Start with Docker Run

The fastest way to get Mongo Express running is with two Docker commands. First, start MongoDB:

```bash
# Start a MongoDB container with authentication enabled
docker run -d \
  --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=adminpass \
  -v mongodata:/data/db \
  -p 27017:27017 \
  mongo:7
```

Then start Mongo Express, linking it to the MongoDB container:

```bash
# Start Mongo Express and connect it to the MongoDB container
docker run -d \
  --name mongo-express \
  --link mongodb:mongo \
  -e ME_CONFIG_MONGODB_ADMINUSERNAME=admin \
  -e ME_CONFIG_MONGODB_ADMINPASSWORD=adminpass \
  -e ME_CONFIG_MONGODB_URL=mongodb://admin:adminpass@mongo:27017/ \
  -e ME_CONFIG_BASICAUTH_USERNAME=webuser \
  -e ME_CONFIG_BASICAUTH_PASSWORD=webpass \
  -p 8081:8081 \
  mongo-express:latest
```

Open your browser to `http://localhost:8081` and log in with the basic auth credentials (`webuser` / `webpass`). You should see the MongoDB admin dashboard.

## Docker Compose Setup

For a cleaner, reproducible setup, Docker Compose is the way to go. Here is a complete configuration:

```yaml
# docker-compose.yml - MongoDB with Mongo Express admin interface
version: "3.8"

services:
  mongodb:
    image: mongo:7
    container_name: mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: adminpass
      MONGO_INITDB_DATABASE: myapp
    volumes:
      # Persist database files across container restarts
      - mongodata:/data/db
      # Optional: seed scripts run on first initialization
      - ./mongo-init:/docker-entrypoint-initdb.d
    ports:
      - "27017:27017"
    networks:
      - mongonet

  mongo-express:
    image: mongo-express:latest
    container_name: mongo-express
    restart: unless-stopped
    depends_on:
      - mongodb
    environment:
      # MongoDB connection settings
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: adminpass
      ME_CONFIG_MONGODB_URL: mongodb://admin:adminpass@mongodb:27017/
      # Basic auth protects the web UI from unauthorized access
      ME_CONFIG_BASICAUTH_USERNAME: webuser
      ME_CONFIG_BASICAUTH_PASSWORD: webpass
      # Optional: set the site name displayed in the UI header
      ME_CONFIG_SITE_COOKIESECRET: changethissecret
      ME_CONFIG_SITE_SESSIONSECRET: changethissecrettoo
    ports:
      - "8081:8081"
    networks:
      - mongonet

volumes:
  mongodata:

networks:
  mongonet:
    driver: bridge
```

Start the stack:

```bash
# Launch both MongoDB and Mongo Express in detached mode
docker compose up -d
```

Check that both containers are running:

```bash
# Verify container status
docker compose ps
```

You should see both `mongodb` and `mongo-express` listed with "Up" status.

## Seeding Initial Data

Mongo Express is more useful when there is data to browse. You can seed your database with an initialization script that MongoDB runs on first startup.

Create a seed file:

```javascript
// mongo-init/init.js - Seed script that runs when MongoDB initializes for the first time
db = db.getSiblingDB('myapp');

// Create a collection with sample documents
db.createCollection('users');
db.users.insertMany([
  { name: 'Alice', email: 'alice@example.com', role: 'admin', createdAt: new Date() },
  { name: 'Bob', email: 'bob@example.com', role: 'user', createdAt: new Date() },
  { name: 'Charlie', email: 'charlie@example.com', role: 'user', createdAt: new Date() }
]);

// Create an index on the email field for faster lookups
db.users.createIndex({ email: 1 }, { unique: true });

print('Database seeded with sample data.');
```

Place this file in the `mongo-init/` directory referenced in the Docker Compose file. When MongoDB starts for the first time (with an empty data volume), it will run this script automatically.

## Configuration Options

Mongo Express offers several environment variables to customize its behavior. Here are the most useful ones:

```yaml
# Key configuration environment variables for Mongo Express
environment:
  # Restrict which databases are visible (comma-separated list)
  ME_CONFIG_MONGODB_ENABLE_ADMIN: "false"

  # Connect to a specific database instead of showing all
  ME_CONFIG_MONGODB_AUTH_DATABASE: myapp

  # Set the number of documents displayed per page
  ME_CONFIG_OPTIONS_EDITORTHEME: monokai

  # Read-only mode prevents accidental modifications
  ME_CONFIG_OPTIONS_READONLY: "false"

  # Disable document deletion for extra safety
  ME_CONFIG_OPTIONS_NO_DELETE: "true"
```

The `ME_CONFIG_OPTIONS_NO_DELETE` and `ME_CONFIG_OPTIONS_READONLY` flags are particularly valuable for production databases where you want visibility without risk.

## Connecting to a Remote MongoDB

Mongo Express does not need to run on the same host as MongoDB. You can point it at any reachable MongoDB instance by changing the connection URL:

```yaml
# Connect Mongo Express to a remote MongoDB instance or Atlas cluster
environment:
  ME_CONFIG_MONGODB_URL: mongodb+srv://admin:password@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
  ME_CONFIG_BASICAUTH_USERNAME: webuser
  ME_CONFIG_BASICAUTH_PASSWORD: webpass
```

This works with MongoDB Atlas, self-hosted clusters, or any MongoDB instance accessible over the network. Just make sure the connection string includes proper authentication credentials.

## Securing Mongo Express

Mongo Express should never be exposed to the public internet without protection. Here are several layers of security to apply.

First, always set basic auth credentials. Never run Mongo Express without the `ME_CONFIG_BASICAUTH_USERNAME` and `ME_CONFIG_BASICAUTH_PASSWORD` variables set.

Second, bind to localhost only in production:

```yaml
# Restrict Mongo Express access to the local machine only
ports:
  - "127.0.0.1:8081:8081"
```

Third, place it behind a reverse proxy with TLS. Here is an Nginx configuration snippet:

```nginx
# nginx.conf - Reverse proxy for Mongo Express with HTTPS
server {
    listen 443 ssl;
    server_name mongo-admin.internal.example.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Fourth, use read-only mode for production databases to prevent accidental writes through the UI.

## Using Mongo Express for Development

During development, Mongo Express shines as a quick way to inspect your application's data. Here is a development-focused Docker Compose configuration:

```yaml
# docker-compose.dev.yml - Development stack with Mongo Express
version: "3.8"

services:
  app:
    build: .
    environment:
      MONGODB_URI: mongodb://admin:devpass@mongodb:27017/myapp?authSource=admin
    depends_on:
      - mongodb
    ports:
      - "3000:3000"
    networks:
      - devnet

  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: devpass
    volumes:
      - devmongo:/data/db
    networks:
      - devnet

  mongo-express:
    image: mongo-express:latest
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: devpass
      ME_CONFIG_MONGODB_URL: mongodb://admin:devpass@mongodb:27017/
      # No basic auth needed in local dev
      ME_CONFIG_BASICAUTH: "false"
    ports:
      - "8081:8081"
    depends_on:
      - mongodb
    networks:
      - devnet

volumes:
  devmongo:

networks:
  devnet:
```

With this setup, your application runs on port 3000, MongoDB on 27017, and Mongo Express on 8081. You can inspect your app's data in real time as you develop.

## Troubleshooting Common Issues

**Mongo Express exits immediately:** Check the logs with `docker logs mongo-express`. The most common cause is that MongoDB has not finished starting up. Add a health check or increase the restart policy.

**Authentication failed errors:** Verify that the username, password, and authentication database match between MongoDB and Mongo Express configuration. MongoDB defaults to the `admin` database for root authentication.

**Cannot connect to MongoDB:** Make sure both containers are on the same Docker network. The `--link` flag is legacy. Use Docker Compose networks instead.

```bash
# Check if Mongo Express can reach MongoDB on the shared network
docker exec mongo-express ping -c 3 mongodb
```

**Slow performance with large collections:** Mongo Express loads documents in pages. For collections with millions of documents, consider using `mongosh` for heavy queries and Mongo Express only for browsing.

## Wrapping Up

Mongo Express in Docker gives you a zero-install MongoDB admin interface that starts in seconds and cleans up without a trace. For development, it speeds up data inspection. For production, it provides a safe read-only window into your databases when configured properly. Combined with Docker Compose, the entire setup lives in a single YAML file that any team member can spin up instantly.
