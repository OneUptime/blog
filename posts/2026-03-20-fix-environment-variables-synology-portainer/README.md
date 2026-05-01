# How to Fix Environment Variable Issues on Synology with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Synology, Environment Variable, Docker, NAS

Description: Learn how to fix environment variable handling issues when running Portainer on Synology NAS, including DSM version quirks and variable escaping problems.

---

Synology NAS devices run DSM (DiskStation Manager). On DSM 6.2 this is exposed through Synology's Docker package, while DSM 7.2 and later renamed it to Container Manager. When you use Portainer on top of this environment, most environment variable issues come from Docker and Compose interpolation, precedence, or how the values are entered in Portainer.

## Common Issues on Synology

- Variables set in Portainer are not referenced correctly in the Compose file
- `environment` values override values loaded from `env_file`
- Unescaped `$` signs are interpolated unexpectedly in Compose-based stacks
- Sensitive values are hard-coded in the stack instead of being loaded from a file or secret store

## Step 1: Verify Variables Are Set Correctly

```bash
# SSH into your Synology (enable SSH in DSM if needed)

# Check if a container received its env vars
docker exec <container-name> env | sort

# If the variable is missing or has wrong value, the issue is in how it was set
```

## Step 2: Handle Special Characters in Variable Values

Portainer does not require you to remove special characters, but Docker Compose does interpolate `$VARIABLE` and `${VARIABLE}` in Compose values. If you need a literal dollar sign, escape it in the Compose file or store the value in an `.env` file and quote it correctly:

```text
# compose.yaml value: $$ becomes a literal $
DB_PASS: "p@$$w0rd!"      # final value: p@$w0rd!

# .env value: single quotes keep the value literal
DB_PASS='p@$w0rd!'
```

For actual secrets, prefer a supported secrets mechanism when available.

## Step 3: Use Stack Files Instead of Container UI

For multi-container apps or when you need Compose features like `env_file` and interpolation, use a stack (Compose file) instead of the container creation UI:

```yaml
# Place this in Portainer's stack editor
services:
  myapp:
    image: myimage:latest
    environment:
      # Use Compose variables so values can come from Portainer or an uploaded .env file
      DB_HOST: "postgres"
      DB_PORT: "5432"
      DB_PASS: "${DB_PASS}"
```

## Step 4: Use .env Files Instead of Hard-Coding Values

For values you do not want hard-coded in the stack file, use Portainer's **Load variables from .env file** option and reference them from the Compose file:

```bash
# Example .env file to upload in Portainer
DB_PASS='supersecret'
API_KEY='abc123'
```

Keep `DB_PASS: "${DB_PASS}"` and `API_KEY: "${API_KEY}"` in the stack. For actual secrets, prefer a supported secrets mechanism when available.

## Step 5: Update Docker or Container Manager

Synology renamed the package from **Docker** to **Container Manager** in DSM 7.2. Keep the package current via DSM:

1. Open **Package Center**.
2. Find **Docker** on DSM 6.2 or **Container Manager** on DSM 7.2 and later.
3. Click **Update** if available.

## Step 6: Check Variable Precedence

Containers do not automatically inherit arbitrary DSM host environment variables, but the same variable name can still be defined in multiple places. Verify no precedence issue:

```bash
docker exec <container-name> env | grep -i your_variable_name
# If you see an unexpected value, check your Compose file next
# environment: overrides env_file:, and both override image ENV when explicitly set
# Prefix your variable names to avoid collisions: APP_DB_HOST instead of DB_HOST
```
