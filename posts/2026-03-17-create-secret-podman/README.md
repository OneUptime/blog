# How to Create a Secret in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Security

Description: Learn how to create and manage secrets in Podman to securely store sensitive data like passwords, API keys, and certificates.

---

> Podman secrets provide a secure way to store and deliver sensitive data to containers without storing it in command lines, source control, or image layers.

Storing sensitive data like passwords and API keys directly in container configurations is a security risk. Podman secrets offer a dedicated mechanism to manage this data securely, keeping mounted secrets out of image layers, environment variable listings, and process tables.

---

## Creating a Secret from Standard Input

The simplest way to create a secret is by piping data to `podman secret create`:

```bash
# Create a secret by piping the value

echo -n "my-super-secret-password" | podman secret create db_password -

# The '-' tells podman to read from standard input
# Use echo -n to avoid adding a trailing newline
```

## Verifying the Secret Was Created

```bash
# List all secrets to confirm creation
podman secret ls

# Example output:
# ID                         NAME          DRIVER      CREATED         UPDATED
# a1b2c3d4e5f6g7h8i9j0      db_password   file        5 seconds ago   5 seconds ago
```

## Creating Multiple Secrets

```bash
# Create secrets for a typical application
echo -n "postgres_password_123" | podman secret create postgres_pass -
echo -n "redis_auth_token_456" | podman secret create redis_token -
echo -n "sk-api-key-789" | podman secret create api_key -

# Verify all secrets were created
podman secret ls
```

## Using a Secret with a Container

```bash
# Create the secret
echo -n "my-database-password" | podman secret create db_pass -

# Use the secret in a container as a file mount
podman run -d \
  --name my-db \
  --secret db_pass \
  -e POSTGRES_PASSWORD_FILE=/run/secrets/db_pass \
  postgres:15

# The secret is mounted at /run/secrets/db_pass inside the container
```

## Secret Naming Conventions

```bash
# Use descriptive names that indicate the purpose
echo -n "value1" | podman secret create app_database_password -
echo -n "value2" | podman secret create app_redis_auth_token -
echo -n "value3" | podman secret create app_smtp_api_key -

# Avoid generic names like 'secret1' or 'password'
```

## Inspecting Secret Metadata

```bash
# View secret metadata (does not reveal the secret value)
podman secret inspect db_password

# Output shows creation time, driver, and other metadata
# The actual secret value is not displayed unless you explicitly use --showsecret
```

## Summary

Podman secrets provide a secure way to manage sensitive data for containers. Create secrets using `podman secret create` with data from standard input, files, or environment variables. Secrets can be delivered to containers as files under `/run/secrets/`, keeping sensitive data out of environment variables and command-line arguments.
