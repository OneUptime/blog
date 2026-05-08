# How to Inspect a Secret in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Inspection

Description: Learn how to inspect Podman secrets to view metadata, driver information, and creation details without exposing the secret value.

---

> By default, the `podman secret inspect` command reveals metadata about a secret such as its ID, driver, and timestamps, while keeping the actual secret value safe from exposure.

When managing secrets, you often need to check when a secret was created, which driver stores it, or verify that it exists with the right configuration. Podman provides the `inspect` command for secrets, which shows metadata without revealing the secret value itself unless you explicitly use `--showsecret`.

---

## Inspecting a Secret

```bash
# Inspect a secret by name

podman secret inspect db_password

# Example output:
# [
#     {
#         "ID": "a1b2c3d4e5f6a1b2c3d4",
#         "CreatedAt": "2026-03-17T10:00:00.000000000Z",
#         "UpdatedAt": "2026-03-17T10:00:00.000000000Z",
#         "Spec": {
#             "Name": "db_password",
#             "Driver": {
#                 "Name": "file",
#                 "Options": null
#             }
#         }
#     }
# ]
```

## Inspecting by ID

```bash
# Inspect a secret by its ID
podman secret inspect a1b2c3d4e5f6a1b2c3d4
```

## Formatted Output

```bash
# Get just the secret name
podman secret inspect --format='{{.Spec.Name}}' db_password

# Get the creation timestamp
podman secret inspect --format='{{.CreatedAt}}' db_password

# Get the storage driver name
podman secret inspect --format='{{.Spec.Driver.Name}}' db_password

# Get the secret ID
podman secret inspect --format='{{.ID}}' db_password
```

## Inspecting Multiple Secrets

```bash
# Inspect multiple secrets at once
podman secret inspect db_password api_key tls_cert

# Compare creation dates of multiple secrets
for secret in db_password api_key tls_cert; do
  created=$(podman secret inspect --format='{{.CreatedAt}}' "$secret" 2>/dev/null)
  if [ -n "$created" ]; then
    echo "$secret: created $created"
  else
    echo "$secret: not found"
  fi
done
```

## Showing Secret Data

```bash
# Show the actual secret value (use with caution)
podman secret inspect --showsecret db_password

# This flag reveals the secret data and should only be used
# in secure contexts, never in logs or shared terminals
```

## Scripting with Secret Inspection

```bash
#!/bin/bash
# Audit script to report on all secrets

echo "=== Secret Audit Report ==="
echo ""

podman secret ls --format "{{.Name}}" | while read -r name; do
  id=$(podman secret inspect --format='{{.ID}}' "$name")
  created=$(podman secret inspect --format='{{.CreatedAt}}' "$name")
  driver=$(podman secret inspect --format='{{.Spec.Driver.Name}}' "$name")

  echo "Name: $name"
  echo "  ID: $id"
  echo "  Created: $created"
  echo "  Driver: $driver"
  echo ""
done
```

## Checking If a Secret Exists

```bash
# Check if a secret exists using inspect
if podman secret inspect my_secret > /dev/null 2>&1; then
  echo "Secret exists"
else
  echo "Secret does not exist"
fi
```

## Summary

The `podman secret inspect` command provides detailed metadata about secrets including their ID, creation time, update time, and storage driver, without exposing the actual secret value by default. Use `--format` for targeted queries in scripts, and `--showsecret` only when you need to view the actual data in a secure context. This command is essential for auditing and managing your secret inventory.
