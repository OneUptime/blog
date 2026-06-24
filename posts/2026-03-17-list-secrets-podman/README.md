# How to List Secrets in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Management

Description: Learn how to list and view secrets stored in Podman for inventory and management purposes.

---

> Listing secrets helps you manage your secret inventory, verify which secrets exist, and audit secret usage across your Podman environment.

As your containerized applications grow, you may have dozens of secrets for databases, APIs, certificates, and other sensitive data. Podman provides commands to list and filter secrets so you can keep track of what exists and when it was last updated.

---

## Listing All Secrets

```bash
# List all secrets

podman secret ls

# Example output:
# ID                         NAME             DRIVER    CREATED          UPDATED
# a1b2c3d4e5f6g7h8i9j0      db_password      file      2 hours ago      2 hours ago
# b2c3d4e5f6g7h8i9j0k1      api_key          file      1 hour ago       1 hour ago
# c3d4e5f6g7h8i9j0k1l2      tls_cert         file      30 minutes ago   30 minutes ago
```

## Custom Output Format

```bash
# Show only secret names
podman secret ls --format "{{.Name}}"

# Show names and creation dates
podman secret ls --format "table {{.Name}}\t{{.CreatedAt}}"

# JSON-style output for scripting
podman secret ls --format '{{printf "{\"ID\":%q,\"Name\":%q,\"Driver\":%q}" .ID .Name .Driver}}'

# Show names and IDs
podman secret ls --format "table {{.ID}}\t{{.Name}}\t{{.Driver}}"
```

## Filtering Secrets

```bash
# Filter secrets by name
podman secret ls --filter name=db_password

# Filter secrets by ID
podman secret ls --filter id=a1b2c3d4
```

## Scripting with Secret Lists

```bash
# Get a list of all secret names for automation
podman secret ls --format "{{.Name}}" | while read -r secret_name; do
  echo "Found secret: $secret_name"
done

# Check if a specific secret exists
if podman secret ls --format "{{.Name}}" | grep -q "^db_password$"; then
  echo "Secret db_password exists"
else
  echo "Secret db_password does not exist"
fi

# Count total number of secrets
SECRET_COUNT=$(podman secret ls --format "{{.Name}}" | wc -l)
echo "Total secrets: $SECRET_COUNT"
```

## Auditing Secrets

```bash
# List all secrets with their update timestamps
podman secret ls --format "table {{.Name}}\t{{.CreatedAt}}\t{{.UpdatedAt}}"

# Print secret names and creation timestamps for review
podman secret ls --format "{{.Name}} {{.CreatedAt}}" | while read -r name created; do
  echo "Secret: $name, Created: $created"
done
```

## Listing Secrets Used by Containers

```bash
# Check which secrets a specific container uses
podman inspect --format='{{range .HostConfig.Secrets}}{{.Name}} {{end}}' my-app

# List all running containers and their secrets
podman ps --format '{{.Names}}' | while read -r container; do
  secrets=$(podman inspect --format='{{range .HostConfig.Secrets}}{{.Name}} {{end}}' "$container" 2>/dev/null)
  if [ -n "$secrets" ]; then
    echo "$container: $secrets"
  fi
done
```

## Summary

Use `podman secret ls` to list all secrets in your Podman environment. The command supports custom output formats with `--format` for scripting, filtering with `--filter`, and JSON-style output for programmatic processing. Regularly listing and auditing your secrets helps maintain good security hygiene and ensures you know what sensitive data is stored in your system.
