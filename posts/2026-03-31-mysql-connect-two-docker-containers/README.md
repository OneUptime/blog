# How to Connect Two Docker Containers to MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Docker, Network, Container, Docker Compose

Description: Connect an application container and a MySQL container on the same Docker network so they can communicate using the container name as the hostname.

---

## How Docker Container Networking Works

Docker provides built-in DNS resolution for containers on the same user-defined network. Each container can reach another using its service name (in Docker Compose) or container name (with `docker run`) as the hostname. Containers on the default `bridge` network do not get this DNS resolution, so always create a named network.

## Connecting Containers with Docker Compose

Docker Compose automatically creates a network named after the project directory. Services on the same Compose file share this network and can refer to each other by service name.

```yaml
version: "3.9"

services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_secret
      MYSQL_DATABASE: myapp
      MYSQL_USER: appuser
      MYSQL_PASSWORD: app_secret
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  app:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./app:/app
    command: node server.js
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: myapp
      DB_USER: appuser
      DB_PASS: app_secret
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - backend

volumes:
  mysql_data:

networks:
  backend:
```

The `app` container connects to MySQL using `DB_HOST=mysql` because Docker DNS resolves the service name `mysql` to the MySQL container's IP.

## Connecting Containers with docker run

Create a named network first:

```bash
docker network create backend
```

Start MySQL on the network:

```bash
docker run -d \
  --name mysql \
  --network backend \
  -e MYSQL_ROOT_PASSWORD=root_secret \
  -e MYSQL_DATABASE=myapp \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0
```

Start a second container on the same network and connect to MySQL by name:

```bash
docker run -it --rm \
  --network backend \
  mysql:8.0 \
  mysql -h mysql -u root -proot_secret myapp
```

## Connecting a Third-Party Tool Container

Add Adminer for database management:

```yaml
  adminer:
    image: adminer:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    networks:
      - backend
    environment:
      ADMINER_DEFAULT_SERVER: mysql
```

Adminer connects to MySQL at `mysql:3306` inside the Docker network, and you access Adminer from the host browser at `http://localhost:8080`.

## Troubleshooting Network Connectivity

Test connectivity between containers using `ping` or `mysqladmin`:

```bash
# From inside the app container
docker exec -it <app-container> sh -c "ping mysql -c 3"

# Test MySQL reachability
docker exec -it <app-container> sh -c \
  "mysqladmin -h mysql -u appuser -papp_secret ping"
```

Check that both containers are on the same network:

```bash
docker network inspect backend
```

## Summary

Two Docker containers connect to MySQL by joining the same Docker network and using the MySQL container's service or container name as the hostname. In Docker Compose, this happens automatically when both services are in the same file. With `docker run`, create an explicit named network and attach both containers to it. Always use `depends_on` with a health check condition so the application container waits for MySQL to be ready before starting.
