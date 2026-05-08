# How to Create a Secret from an Environment Variable in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Security, Environment Variable

Description: Learn how to create Podman secrets from environment variables for seamless integration with CI/CD pipelines and automation scripts.

---

> Creating secrets from environment variables bridges the gap between CI/CD pipeline secrets and Podman's secret management, enabling secure automated deployments.

In CI/CD pipelines and automation scripts, sensitive data is often available as environment variables. Podman can create secrets from these variables, letting you transition from environment-based secrets to Podman's more secure secret storage without changing your pipeline configuration.

---

## Creating a Secret from an Environment Variable

```bash
# Set the environment variable (typically done by your CI/CD system)

export DB_PASSWORD="my-secure-password"

# Create a Podman secret from the environment variable
echo -n "$DB_PASSWORD" | podman secret create db_password -

# Verify the secret was created
podman secret ls
```

## Using printf for Exact Values

```bash
# Use printf to avoid issues with special characters
export API_KEY='sk-abc123!@#$%'

printf '%s' "$API_KEY" | podman secret create api_key -
```

## CI/CD Pipeline Integration

```bash
#!/bin/bash
# deploy.sh - Example deployment script

# These variables are set by the CI/CD system
# DB_PASSWORD, API_KEY, SMTP_SECRET are injected by the pipeline

# Create Podman secrets from CI/CD environment variables
printf '%s' "$DB_PASSWORD" | podman secret create db_password - 2>/dev/null || true
printf '%s' "$API_KEY" | podman secret create api_key - 2>/dev/null || true
printf '%s' "$SMTP_SECRET" | podman secret create smtp_secret - 2>/dev/null || true

# Deploy the application using the secrets
podman run -d \
  --name my-app \
  --secret db_password \
  --secret api_key \
  --secret smtp_secret \
  my-app:latest
```

## Handling Existing Secrets

```bash
# Remove and recreate if the secret already exists
recreate_secret() {
  local name="$1"
  local value="$2"
  podman secret rm "$name" 2>/dev/null || true
  printf '%s' "$value" | podman secret create "$name" -
}

# Usage in a deployment script
recreate_secret "db_password" "$DB_PASSWORD"
recreate_secret "api_key" "$API_KEY"
recreate_secret "redis_auth" "$REDIS_AUTH"
```

## Security Considerations

```bash
# AVOID: Passing secrets directly on the command line
# This exposes them in process listings and shell history
# podman run -e DB_PASSWORD="secret" my-app:latest  # BAD

# BETTER: Use Podman secrets from environment variables
printf '%s' "$DB_PASSWORD" | podman secret create db_password -
podman run -d --secret db_password my-app:latest

# The secret value never appears in:
# - Process listings (ps aux)
# - Container inspect output
# - Shell history (when using env vars from CI/CD)
```

## Batch Creation from Multiple Variables

```bash
#!/bin/bash
# Create multiple secrets from a list of environment variable names

SECRET_VARS=("DB_PASSWORD" "API_KEY" "SMTP_SECRET" "REDIS_AUTH")

for var_name in "${SECRET_VARS[@]}"; do
  secret_name=$(echo "$var_name" | tr '[:upper:]' '[:lower:]')
  value="${!var_name}"

  if [ -n "$value" ]; then
    podman secret rm "$secret_name" 2>/dev/null || true
    printf '%s' "$value" | podman secret create "$secret_name" -
    echo "Created secret: $secret_name"
  else
    echo "Warning: $var_name is not set, skipping"
  fi
done
```

## Summary

Creating Podman secrets from environment variables is essential for CI/CD integration. Use `printf '%s' "$VAR" | podman secret create name -` to safely transfer environment variable values into Podman secrets. This approach keeps sensitive data out of process listings and command history while leveraging your existing pipeline secret management.
