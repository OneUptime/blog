# How to Fix stack.env Not Found Errors in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Troubleshooting, DevOps

Description: Learn how to diagnose and fix 'stack.env not found' and related environment file errors when deploying or updating stacks in Portainer.

## Introduction

The `stack.env not found` error appears when Portainer cannot locate the environment file referenced in a stack configuration. This commonly happens when a Compose file references an `env_file` path that doesn't exist in the deployment context, when a Git-based stack expects an env file that isn't in the repository, or when Portainer-managed stack files under `/data/compose/<stack-id>/` are missing. On Docker Swarm, `env_file` is not supported by `docker stack deploy`, so `env_file` entries should be removed and the variables defined manually.

## Prerequisites

- Portainer with a stack experiencing the env not found error
- Shell access to the Portainer host
- Know whether the stack is deployed to Docker Standalone, Podman, or Docker Swarm

## Common Error Messages

```hcl
# Error 1: env_file reference in Compose:

Error response from daemon: open /data/compose/12/stack.env: no such file or directory

# Error 2: Portainer-managed stack.env missing:
Failed to deploy a stack: env file /data/compose/12/stack.env not found: stat /data/compose/12/stack.env: no such file or directory

# Error 3: Variable undefined:
The "DB_PASSWORD" variable is not set. Defaulting to a blank string.
```

## Step 1: Understand Portainer's Stack File Storage

Portainer stores stack files in its data volume:

```bash
# Find where Portainer stores stack files:
docker exec portainer ls /data/compose/

# Each stack gets a numbered directory:
# /data/compose/1/  → stack ID 1
# /data/compose/12/ → stack ID 12

# Inside each directory:
docker exec portainer ls /data/compose/12/
# docker-compose.yml  (the Compose file)
# stack.env           (environment variables - if configured)
```

## Step 2: Identify the Missing File

```bash
# Check if the stack.env file exists:
docker exec portainer ls -la /data/compose/12/

# If stack.env is missing on a Docker Standalone or Podman stack that uses
# Portainer-managed variables:
# → Portainer's data may be corrupted or the generated file was deleted

# Check the Compose file for env_file references:
docker exec portainer cat /data/compose/12/docker-compose.yml | grep env_file
```

## Step 3: Fix Missing stack.env (Portainer Data Issue)

If the `stack.env` file is missing for a Docker Standalone or Podman stack that relies on Portainer-managed variables:

```bash
# 1. Find the stack ID in Portainer:
#    Navigate to Stacks → click the stack → note the URL: /stacks/12

# 2. Check what's in the compose directory:
docker exec portainer ls /data/compose/12/

# 3. Re-enter or re-upload the variables in Portainer:
#    Portainer UI: Stacks → stack name → Update the stack
#    Use the environment variables section or Load variables from .env file

# 4. Redeploy the stack from Portainer so it regenerates the managed env file.
#    If the stack can't be recovered cleanly, remove and redeploy it from the UI.
```

## Step 4: Fix env_file Reference in Compose YAML

If your Compose file has an `env_file` directive:

```yaml
# Portainer's documented pattern on Docker Standalone / Podman
services:
  api:
    image: myorg/api:latest
    env_file:
      - stack.env
```

Paths in `env_file` are resolved relative to the Compose file. On Docker Standalone and Podman, Portainer can supply `stack.env` for variables defined in the UI or uploaded from a `.env` file. On Docker Swarm, `docker stack deploy` does not support `env_file`, so this pattern must not be used there.

Solutions:

**Option A: On Docker Standalone or Podman, keep `env_file: - stack.env` and define the values in Portainer**:

```yaml
# Portainer-managed variables are loaded from stack.env
services:
  api:
    image: myorg/api:latest
    env_file:
      - stack.env
```

**Option B: On Docker Swarm, remove `env_file` and define each variable explicitly**:

```yaml
# Docker Swarm: use explicit environment entries instead of env_file
services:
  api:
    image: myorg/api:latest
    environment:
      - DB_PASSWORD=${DB_PASSWORD}
      - LOG_LEVEL=${LOG_LEVEL}
```

**Option C: For Git-based stacks, commit the referenced env file to the repository**:

```bash
# Repository structure:
my-infra/
├── docker-compose.yml    # References ./app.env
└── app.env               # Non-secret defaults committed to Git
```

Note: Only commit non-sensitive defaults to Git. If you want Portainer to generate the file from UI or uploaded variables, reference `stack.env` in the Compose file instead.

## Step 5: Fix for Git-Based Stacks

If the Git repository is missing the referenced env file:

```bash
# Check which env file the Compose file references:
git grep -n "env_file"

# Add the missing env file with default values (no secrets):
cat > app.env << 'EOF'
# Stack environment defaults - override sensitive values in Portainer
LOG_LEVEL=info
APP_PORT=8080
WORKERS=2
DB_PORT=5432
EOF

git add app.env
git commit -m "Add env file defaults for Portainer deployment"
git push
```

If you prefer Portainer-managed variables instead of a repo file, change the Compose file to reference `stack.env` and define or upload the values in Portainer. If Git-based stacks still fail on an older Portainer release, update Portainer first - recent releases fixed multiple `env_file` and `.env` handling issues for Git deployments.

## Step 6: Recreate the Stack to Fix Persistent Errors

If the stack is in a broken state that won't update:

```bash
# 1. Copy the current Compose YAML from Portainer UI editor
# 2. Note all environment variables

# 3. Remove the broken stack (preserving volumes):
#    Portainer UI: Stacks → check the stack → Remove (no volumes option)

# 4. Redeploy as a new stack:
#    Portainer UI: Stacks → Add stack → paste Compose YAML
#    Add environment variables
#    Deploy

# The containers will reconnect to existing volumes by name
```

## Step 7: Verify Environment Variables After Fix

```bash
# Confirm all expected variables are present in the container:
docker exec <container_name> env | sort

# Check for any blank/undefined variables:
docker exec <container_name> env | grep -E '^[A-Za-z_][A-Za-z0-9_]*=$'
# Should return nothing (no blank variables)

# Test the application responds correctly:
curl http://localhost:8080/health
```

## Conclusion

The `stack.env not found` error usually comes from one of four causes: a missing env file in the stack context, a Git-based stack that references a file not present in the repository, a missing Portainer-managed file under `/data/compose/<stack-id>/`, or use of `env_file` on Docker Swarm where `docker stack deploy` does not support it. On Docker Standalone and Podman, `env_file: - stack.env` is a valid Portainer pattern. On Docker Swarm, remove `env_file` and define variables explicitly. For Git-based stacks, either commit the referenced env file to the repository or switch the Compose file to `stack.env` and manage the values in Portainer. If Portainer's own generated stack file is missing, re-enter the variables in Portainer and redeploy or recreate the stack from the UI instead of relying on direct edits under `/data`.
