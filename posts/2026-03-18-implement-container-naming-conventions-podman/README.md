# How to Implement Container Naming Conventions with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Naming Convention, Container, Best Practice, DevOps

Description: Learn how to implement consistent container naming conventions with Podman for containers, pods, volumes, networks, and images to improve manageability and team coordination.

---

> Consistent container naming conventions prevent confusion, simplify automation, and make it possible to manage dozens of containers without losing track of what each one does.

As your container environment grows, finding and managing specific containers becomes increasingly difficult without a structured naming system. A good naming convention tells you at a glance what a container does, which project it belongs to, and what environment it runs in.

This guide establishes practical naming conventions for all Podman resources and shows how to enforce them through scripts and automation.

---

## Why Naming Conventions Matter

Without conventions, container environments quickly look like this:

```bash
podman ps --format "{{.Names}}"
# my-db

# test
# nginx
# app
# redis-1
# web_server
# postgres
# temp-container
```

With conventions, the same environment becomes self-documenting:

```bash
podman ps --format "{{.Names}}"
# myapp-prod-web
# myapp-prod-api
# myapp-prod-db
# myapp-prod-cache
# blog-staging-web
# blog-staging-db
```

## Container Naming Pattern

Use a hierarchical pattern that includes project, environment, and role:

```text
{project}-{environment}-{role}[-{instance}]
```

Examples:

```bash
podman run -d --name myapp-prod-web nginx
podman run -d --name myapp-prod-api my-api
podman run -d --name myapp-prod-db -e POSTGRES_PASSWORD=change-me postgres:16
podman run -d --name myapp-prod-cache redis:7

podman run -d --name myapp-staging-web nginx
podman run -d --name myapp-staging-api my-api
podman run -d --name myapp-staging-db -e POSTGRES_PASSWORD=change-me postgres:16
```

For scaled services, add an instance number:

```bash
podman run -d --name myapp-prod-worker-1 my-worker
podman run -d --name myapp-prod-worker-2 my-worker
podman run -d --name myapp-prod-worker-3 my-worker
```

## Pod Naming Pattern

Pods group related containers, so name them by project and environment:

```text
{project}-{environment}-pod
```

```bash
podman pod create --name myapp-prod-pod -p 8080:80
podman pod create --name myapp-staging-pod -p 8081:80
podman pod create --name blog-prod-pod -p 80:80
```

## Volume Naming Pattern

Volumes store persistent data. Name them by what data they contain:

```text
{project}-{environment}-{service}-{type}
```

```bash
podman volume create myapp-prod-postgres-data
podman volume create myapp-prod-redis-data
podman volume create myapp-prod-api-uploads
podman volume create myapp-prod-web-static
podman volume create myapp-prod-api-logs

podman volume create myapp-staging-postgres-data
podman volume create myapp-staging-redis-data
```

## Network Naming Pattern

Networks define communication boundaries:

```text
{project}-{environment}-{purpose}
```

```bash
podman network create myapp-prod-frontend
podman network create myapp-prod-backend
podman network create myapp-prod-monitoring

podman network create myapp-staging-frontend
podman network create myapp-staging-backend
```

## Image Naming Pattern

For locally built images:

```text
{registry}/{organization}/{project}-{component}:{version}
```

```bash
podman build -t registry.example.com/myteam/myapp-api:1.2.3 .
podman build -t registry.example.com/myteam/myapp-web:1.2.3 .
podman build -t registry.example.com/myteam/myapp-worker:1.2.3 .
```

## Labels for Metadata

Supplement names with labels for queryable metadata:

```bash
podman run -d \
  --name myapp-prod-api \
  --label project=myapp \
  --label environment=production \
  --label role=api \
  --label team=backend \
  --label version=1.2.3 \
  --label maintainer=teamlead@example.com \
  my-api:1.2.3
```

Query containers by labels:

```bash
# Find all production containers
podman ps --filter label=environment=production

# Find all containers for a project
podman ps --filter label=project=myapp

# Find containers by team
podman ps --filter label=team=backend

# List with custom format
podman ps --filter label=project=myapp \
  --format "table {{.Names}}\t{{.Status}}\t{{.Labels}}"
```

## Naming Rules

Follow these rules for valid and consistent names:

```bash
# Rules:
# 1. Use lowercase only
# 2. Separate segments with hyphens (not underscores or dots)
# 3. Keep names under 63 characters (DNS compatibility)
# 4. Use only alphanumeric characters and hyphens
# 5. Do not start or end with a hyphen

# Good
myapp-prod-web
billing-staging-db
auth-prod-worker-1

# Bad
MyApp_Prod_Web        # Mixed case, underscores
my.app.prod.web       # Dots
-myapp-prod-web-      # Leading/trailing hyphens
my app prod web       # Spaces
```

## Enforcement Script

Create a validation script to enforce naming conventions:

```bash
#!/bin/bash
# validate-names.sh

PATTERN='^[a-z][a-z0-9]+-[a-z]+-[a-z][a-z0-9]*(-[0-9]+)?$'

echo "=== Container Name Validation ==="
violations=0

for name in $(podman ps -a --format '{{.Names}}'); do
  if ! echo "$name" | grep -qP "$PATTERN"; then
    echo "VIOLATION: '$name' does not match pattern {project}-{env}-{role}"
    violations=$((violations + 1))
  fi
done

echo ""
echo "=== Volume Name Validation ==="
for name in $(podman volume ls -q); do
  if ! echo "$name" | grep -qP '^[a-z][a-z0-9]+-[a-z]+-[a-z]+-[a-z]+$'; then
    echo "VIOLATION: Volume '$name' does not match pattern"
    violations=$((violations + 1))
  fi
done

echo ""
if [ $violations -eq 0 ]; then
  echo "All names comply with naming conventions."
else
  echo "${violations} naming violations found."
  exit 1
fi
```

## Wrapper Script for Enforcement

Create a wrapper that validates names before creating resources:

```bash
#!/bin/bash
# podman-wrapper.sh

validate_container_name() {
  local name=$1
  if ! echo "$name" | grep -qP '^[a-z][a-z0-9]+-[a-z]+-[a-z][a-z0-9]*(-[0-9]+)?$'; then
    echo "ERROR: Container name '$name' does not follow naming convention."
    echo "Expected format: {project}-{environment}-{role}[-{instance}]"
    echo "Example: myapp-prod-web, myapp-staging-db-1"
    return 1
  fi
  return 0
}

# Intercept 'run' command to validate --name
if [ "$1" = "run" ]; then
  for i in "$@"; do
    if [ "$prev" = "--name" ]; then
      validate_container_name "$i" || exit 1
    fi
    if [[ "$i" == --name=* ]]; then
      validate_container_name "${i#--name=}" || exit 1
    fi
    prev="$i"
  done
fi

# Pass through to real podman
exec /usr/bin/podman "$@"
```

## Quadlet File Naming

Apply conventions to Quadlet files as well:

```text
~/.config/containers/systemd/
├── myapp-prod.network
├── myapp-prod-db.container
├── myapp-prod-api.container
├── myapp-prod-web.container
├── myapp-prod-postgres-data.volume
├── blog-prod.network
├── blog-prod-db.container
└── blog-prod-web.container
```

## Documentation Template

Maintain a reference document for your team:

```markdown
## Container Naming Convention

### Pattern
{project}-{environment}-{role}[-{instance}]

### Projects: myapp, blog, auth, billing
### Environments: prod, staging, dev, test
### Roles: web, api, db, cache, worker, proxy, monitor

### Examples
myapp-prod-web       Web server for myapp in production
myapp-staging-db     Database for myapp in staging
auth-prod-api-1      First API instance for auth service
billing-prod-worker  Background worker for billing
```

## Conclusion

Container naming conventions are a small investment that pays off significantly as your environment grows. A consistent pattern of `{project}-{environment}-{role}` makes containers self-documenting, simplifies automation, and enables effective filtering and monitoring. Combine names with labels for additional metadata, and enforce conventions through validation scripts to maintain consistency across your team.
