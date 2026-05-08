# How to Migrate Docker Secrets to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Docker, Migration

Description: Learn how to migrate your Docker secrets to Podman, including differences in implementation and command equivalents.

---

> Migrating secrets from Docker to Podman is straightforward since both tools share similar CLI syntax, but there are key differences in storage and scope to be aware of.

If you are transitioning from Docker to Podman, your existing secret management workflows will largely carry over. Podman's secret commands mirror Docker's, but there are important differences in how secrets are stored and which features are available.

---

## Command Mapping: Docker to Podman

```bash
# Docker                              # Podman (equivalent)

docker secret create name file    ->  podman secret create name file
docker secret ls                  ->  podman secret ls
docker secret inspect name        ->  podman secret inspect name
docker secret rm name             ->  podman secret rm name
```

## Migrating Existing Secrets

```bash
# Export secrets from Docker (if values are available)
# Note: Docker does not provide a way to read secret values directly
# You need the original source files or values

# Recreate each secret in Podman
echo -n "db-password-value" | podman secret create db_password -
echo -n "api-key-value" | podman secret create api_key -
podman secret create tls_cert /path/to/cert.pem
podman secret create tls_key /path/to/key.pem

# Verify all secrets were created
podman secret ls
```

## Migrating Docker Compose Secrets

Docker Compose secrets syntax can work with `podman compose`, depending on the configured Compose provider:

```yaml
# This docker-compose.yml uses standard Compose secrets syntax
version: "3.8"

services:
  app:
    image: my-app:latest
    secrets:
      - db_password
      - api_key

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

```bash
# podman compose delegates to an external Compose provider
podman compose up -d
```

## Key Differences

```bash
# 1. Podman secrets work without Swarm mode
# Docker Engine secrets are only available to Swarm services, not standalone containers
# Podman secrets work natively without any orchestrator

# 2. Podman supports secrets as environment variables
podman run -d \
  --secret db_pass,type=env,target=DB_PASSWORD \
  my-app:latest
# This type=env syntax is a Podman extension

# 3. Podman supports file permission options
podman run -d \
  --secret db_pass,mode=0400,uid=1000,gid=1000 \
  my-app:latest
# Docker Swarm has similar options but they differ in syntax

# 4. Storage location differs
# Docker Engine secrets: stored in encrypted Swarm raft logs
# Docker Compose secrets: read from the Compose-defined source and mounted into containers
# Podman: stored by the configured secret driver; the default file driver uses read-protected files
```

## Migration Script

```bash
#!/bin/bash
# migrate-secrets.sh
# Migrate secrets from a secrets file to Podman

SECRETS_DIR="./secrets"

# Check if secrets directory exists
if [ ! -d "$SECRETS_DIR" ]; then
  echo "Secrets directory not found: $SECRETS_DIR"
  exit 1
fi

# Create each secret in Podman
for secret_file in "$SECRETS_DIR"/*; do
  [ -f "$secret_file" ] || continue

  secret_name=$(basename "$secret_file" | sed 's/\.[^.]*$//')

  # Remove existing secret if present
  podman secret rm "$secret_name" 2>/dev/null

  # Create the new secret
  podman secret create "$secret_name" "$secret_file"
  echo "Created secret: $secret_name"
done

echo "Migration complete"
podman secret ls
```

## Updating Container Run Commands

```bash
# Docker Engine secrets are used with Swarm services, not standalone docker run containers
# docker run -d --name app --secret db_password my-app:latest

# Podman standalone container with a secret
podman run -d --name app --secret db_password my-app:latest

# Docker Swarm service with secrets (not applicable to Podman)
# docker service create --secret db_password my-app:latest

# Podman equivalent: just use podman run with --secret
podman run -d --secret db_password my-app:latest
```

## Summary

Migrating Docker secrets to Podman is largely a one-to-one command mapping for secret creation and management, as Podman uses similar CLI syntax. The main differences are that Podman secrets work without Swarm mode, support environment variable exposure natively, and offer granular file permission controls. Use the same source secret files and Compose definitions where your Compose provider supports them, recreate the secrets with `podman secret create`, and update standalone container commands to use Podman's `--secret` support.
