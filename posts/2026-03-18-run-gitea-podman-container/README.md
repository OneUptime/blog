# How to Run Gitea in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Gitea, Git, Self-Hosted, Version Control

Description: Learn how to run Gitea in a Podman container for a lightweight, self-hosted Git service with persistent repositories and SSH access.

---

> Gitea in Podman provides a lightweight, self-hosted Git service with a web interface and minimal resource usage.

Gitea is a painless, self-hosted Git service written in Go. It is lightweight, fast, and provides a feature-rich web interface similar to GitHub. Running Gitea in a Podman container gives you a portable Git hosting platform that is easy to deploy, back up, and manage. This guide covers setup, persistent storage, SSH access, database backends, and administrative tasks.

---

## Pulling the Gitea Image

Download the official Gitea image.

```bash
# Pull the latest Gitea image

podman pull docker.io/gitea/gitea:latest

# Verify the image
podman images | grep gitea
```

## Running a Basic Gitea Container

Start Gitea with the built-in SQLite database.

```bash
# Create volumes for Gitea data
podman volume create gitea-data

# Run Gitea in detached mode
podman run -d \
  --name my-gitea \
  -p 3000:3000 \
  -p 2222:22 \
  -e GITEA__database__DB_TYPE=sqlite3 \
  -e GITEA__server__ROOT_URL=http://localhost:3000/ \
  -v gitea-data:/data:Z \
  docker.io/gitea/gitea:latest

# Check the container is running
podman ps

# Wait for Gitea to initialize
sleep 5

# Verify Gitea is responding
curl -s http://localhost:3000/api/v1/version | python3 -m json.tool

# Access Gitea
echo "Open http://localhost:3000 in your browser"
echo "Complete the initial configuration wizard"
```

## Running Gitea with PostgreSQL

Set up Gitea with a PostgreSQL database for better performance.

```bash
# Create a pod for Gitea and PostgreSQL
podman pod create \
  --name gitea-pod \
  -p 3001:3000 \
  -p 2223:22

# Create volumes
podman volume create gitea-pg-data
podman volume create gitea-app-data

# Run PostgreSQL in the pod
podman run -d \
  --pod gitea-pod \
  --name gitea-db \
  -e POSTGRES_DB=gitea \
  -e POSTGRES_USER=gitea \
  -e POSTGRES_PASSWORD=gitea-secret \
  -v gitea-pg-data:/var/lib/postgresql/data:Z \
  postgres:16

# Wait for PostgreSQL to initialize
sleep 10

# Run Gitea connected to PostgreSQL
podman run -d \
  --pod gitea-pod \
  --name gitea-app \
  -e GITEA__database__DB_TYPE=postgres \
  -e GITEA__database__HOST=127.0.0.1:5432 \
  -e GITEA__database__NAME=gitea \
  -e GITEA__database__USER=gitea \
  -e GITEA__database__PASSWD=gitea-secret \
  -e GITEA__server__ROOT_URL=http://localhost:3001/ \
  -e GITEA__server__SSH_DOMAIN=localhost \
  -e GITEA__server__SSH_PORT=2223 \
  -v gitea-app-data:/data:Z \
  docker.io/gitea/gitea:latest

# Wait for Gitea to start
sleep 10

# Verify Gitea is running
curl -s http://localhost:3001/api/v1/version | python3 -m json.tool
```

## Configuring Gitea with Environment Variables

Customize Gitea settings through environment variables.

```bash
# Run Gitea with custom configuration
podman run -d \
  --name gitea-custom \
  -p 3002:3000 \
  -e GITEA__database__DB_TYPE=sqlite3 \
  -e GITEA__server__ROOT_URL=http://localhost:3002/ \
  -e GITEA__server__LANDING_PAGE=explore \
  -e GITEA__service__DISABLE_REGISTRATION=false \
  -e GITEA__service__REQUIRE_SIGNIN_VIEW=false \
  -e GITEA__service__ENABLE_NOTIFY_MAIL=false \
  -e GITEA__repository__DEFAULT_BRANCH=main \
  -e GITEA__repository__ENABLE_PUSH_CREATE_USER=true \
  -e GITEA__ui__DEFAULT_THEME=gitea-dark \
  -e GITEA__log__LEVEL=Info \
  -v gitea-data:/data:Z \
  docker.io/gitea/gitea:latest
```

## Creating Repositories via the API

Use the Gitea API to create and manage repositories.

```bash
# Create an admin user first (via the initial setup or CLI)
# Then use the API with basic auth or token

# Create a new repository
curl -s -X POST "http://localhost:3000/api/v1/user/repos" \
  -u "admin:admin-password" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-project",
    "description": "A project hosted on Gitea in Podman",
    "private": false,
    "auto_init": true,
    "default_branch": "main",
    "readme": "Default"
  }' | python3 -m json.tool | head -15

# List repositories
curl -s "http://localhost:3000/api/v1/repos/search" | python3 -m json.tool | head -20

# Create an organization
curl -s -X POST "http://localhost:3000/api/v1/orgs" \
  -u "admin:admin-password" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "my-org",
    "full_name": "My Organization",
    "description": "Team organization on Gitea",
    "visibility": "public"
  }' | python3 -m json.tool
```

## SSH Access for Git Operations

Configure SSH access to clone and push via SSH.

```bash
# Add your SSH key via the API
curl -s -X POST "http://localhost:3000/api/v1/user/keys" \
  -u "admin:admin-password" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"My SSH Key\",
    \"key\": \"$(cat ~/.ssh/id_rsa.pub)\"
  }"

# Clone a repository via SSH
git clone ssh://git@localhost:2222/admin/my-project.git

# Or use HTTP cloning
git clone http://localhost:3000/admin/my-project.git
```

## Administrative Commands

Use the Gitea CLI for administrative tasks.

```bash
# Create an admin user from the command line
podman exec -u git -it my-gitea gitea --config /data/gitea/conf/app.ini admin user create \
  --username admin \
  --password admin-password \
  --email admin@example.com \
  --admin

# List all users
podman exec -u git -it my-gitea gitea --config /data/gitea/conf/app.ini admin user list

# Regenerate Git hooks for all repositories
podman exec -u git -it my-gitea gitea --config /data/gitea/conf/app.ini admin regenerate hooks

# Check Gitea doctor for issues
podman exec -u git -it my-gitea gitea --config /data/gitea/conf/app.ini doctor check
```

## Managing the Containers

Common management operations.

```bash
# View Gitea logs
podman logs my-gitea

# Stop and start
podman stop my-gitea
podman start my-gitea

# Remove standalone container
podman rm -f my-gitea gitea-custom

# Remove the pod
podman pod rm -f gitea-pod

# Clean up volumes
podman volume rm gitea-data gitea-pg-data gitea-app-data
```

## Summary

Running Gitea in a Podman container provides a lightweight, self-hosted Git platform with a web interface, issue tracking, pull requests, and SSH access. The built-in SQLite database is suitable for small teams, while PostgreSQL supports larger deployments. Environment variables give you full control over Gitea's configuration, and the REST API enables automated repository and user management. Named volumes preserve your repositories and settings across container restarts. Running Podman rootless, when supported by your host configuration, helps keep your Git hosting isolated.
