# How to Fix Environment Variable Issues on Synology with Portainer - Env Var

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Synology, NAS, Troubleshooting, Environment Variable

Description: Resolve environment variable handling problems when running Portainer on Synology NAS, including DSM Docker differences, env file parsing issues, and variable escaping.

## Introduction

Synology NAS devices run containers through DSM (DiskStation Manager) using Synology's Docker package or Container Manager. Depending on your DSM version, the bundled Docker Engine can lag upstream releases. When running Portainer on Synology, environment variable issues are common - dollar signs can be interpolated unexpectedly, `.env` files with CRLF line endings can cause parsing problems, or variables passed to containers via Portainer's UI can behave differently than expected.

## Understanding the Synology Docker Environment

Synology DSM Docker:
- Uses Synology's Docker package or Container Manager to manage containers
- May use an older Docker Engine version than current upstream releases
- Shared-folder permissions can affect what containers can read or write
- Common bind mounts use shared-folder paths such as `/volume1/...`

## Step 1: Verify Portainer Is Running Correctly on Synology

```bash
# SSH into your Synology NAS

ssh your-admin-user@synology-ip

# Check Docker version
docker version

# Check Portainer status
docker ps | grep portainer

# Check Portainer logs
docker logs portainer --tail 50
```

## Step 2: Fix Special Characters in Environment Variables

In Portainer stack definitions, dollar signs in values can be interpreted as Compose variables unless you escape them or quote them correctly in an env file:

```bash
# PROBLEMATIC: $ can be treated as variable interpolation
# PASSWORD=my$ecret
# MY_VAR="value_with_$dollar"

# FIX: Use .env files instead of inline values in the Portainer UI,
# and single-quote values that contain $
```

Create an `.env` file on the Synology:

```bash
# Create a secure directory for environment files
mkdir -p /volume1/docker/myapp/
touch /volume1/docker/myapp/.env
chmod 600 /volume1/docker/myapp/.env

# Write the env file
cat > /volume1/docker/myapp/.env << 'EOF'
DB_PASSWORD='my$ecret!with@special#chars'
SECRET_KEY='abc"def"ghi'
API_KEY='Bearer eyJhbGciOiJSUzI1NiIsImtp'
EOF
```

## Step 3: Use .env Files in Portainer Stacks

When creating a Docker Standalone stack in Portainer on Synology:

```yaml
services:
  myapp:
    image: myapp:latest
    env_file:
      # Absolute host paths work, but Compose warns they are not portable
      - /volume1/docker/myapp/.env
    # Do NOT inline sensitive values here
```

Do not expect `env_file` to make variables available for `${...}` substitution in the Compose file itself. If you want Portainer to substitute specific values before deployment, define them in Portainer's stack environment variables and reference them like this:

```yaml
services:
  myapp:
    image: myapp:latest
    environment:
      DB_PASSWORD: "${STACK_DB_PASSWORD}"
      SECRET_KEY: "${STACK_SECRET_KEY}"
```

## Step 4: Fix Variable Escaping in Portainer Stack Editor

In Portainer's web editor, dollar signs in values need escaping:

```yaml
# In Portainer's web editor:
services:
  myapp:
    environment:
      # Use $$ for literal $ in Portainer web editor
      MY_VAR: "value_with_$$dollar"

      # Or use the .env file approach (preferred)
```

## Step 5: Fix Portainer Stack Variables on Synology

When using Portainer's "Environment variables" feature for stacks:

```yaml
services:
  myapp:
    image: myapp:latest
    environment:
      DB_PASSWORD: ${STACK_DB_PASSWORD}

    # Or, on Docker Standalone, expose all stack variables:
    env_file:
      - stack.env
```

## Step 6: Fix Synology Volume Path Issues

On Synology, bind mounts commonly use shared-folder paths under `/volume1`, `/volume2`, and so on:

```bash
# Standard Linux path
-v /home/user/data:/data

# Synology shared-folder path
-v /volume1/docker/myapp/data:/data

# Verify the path exists
ls -la /volume1/docker/myapp/data/

# Create if missing
mkdir -p /volume1/docker/myapp/data
```

## Step 7: Fix newline Characters in Variables

CRLF line endings in `.env` files can leave a trailing `\r` in variable values:

```bash
# Check for hidden characters
cat -A /volume1/docker/myapp/.env
# ^M$ at the end of a line indicates Windows-style CRLF line endings

# Fix line endings
sed -i 's/\r$//' /volume1/docker/myapp/.env

# Or use tr
tr -d '\r' < /volume1/docker/myapp/.env > /volume1/docker/myapp/.env.fixed
mv /volume1/docker/myapp/.env.fixed /volume1/docker/myapp/.env
chmod 600 /volume1/docker/myapp/.env
```

## Step 8: Verify Environment Variables Inside Container

```bash
# Start a shell in the running container
docker exec -it myapp-container sh

# List all environment variables
env | sort

# Check for specific variable
printf '%s\n' "$DB_PASSWORD"

# Verify no truncation
printf '%s' "${SECRET_KEY}" | wc -c  # Count characters exactly

exit
```

## Step 9: Fix DSM Docker Compatibility Issues

On Synology DSM, Portainer compatibility depends on the Docker Engine version provided by DSM:

```bash
# Check DSM Docker version
docker version

# Compare your Docker Engine version with Portainer's documented requirements:
# https://docs.portainer.io/start/requirements-and-prerequisites

# Do not assume an older DSM Docker package is compatible with a newer Portainer tag.
# For example, Portainer 2.19.5 was validated on Docker 23.x/24.x, while older
# 2.18.x releases were the ones validated on Docker 20.10.x.
```

## Step 10: Use Docker Compose Validation Before Deploying

```bash
# Validate your compose file locally before uploading to Portainer
docker compose -f /volume1/docker/myapp/docker-compose.yml config

# Test environment variable substitution
docker compose --env-file /volume1/docker/myapp/.env -f /volume1/docker/myapp/docker-compose.yml config
```

## Conclusion

Environment variable issues on Synology with Portainer are primarily caused by special character handling in the Portainer web editor and CRLF line endings in `.env` files. The most reliable approach is to store environment variables in an `.env` file on a Synology volume, single-quote values containing `$` so Compose does not interpolate them, and reference the file via `env_file` in your compose stack - avoiding the need to type special characters in the Portainer UI altogether. For truly sensitive data, Docker recommends using secrets instead of environment variables.
