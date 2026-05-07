# How to Use a Secret as an Environment Variable in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Environment Variable, Security

Description: Learn how to expose Podman secrets as environment variables inside containers for applications that read configuration from the environment.

---

> While file mounts are preferred, some applications require secrets as environment variables. Podman supports this with the `type=env` option on secrets.

Many applications, especially those following the twelve-factor methodology, read configuration from environment variables. Podman lets you expose secrets as environment variables while still benefiting from Podman's secure secret storage, keeping values out of `podman inspect` and command-line history.

---

## Exposing a Secret as an Environment Variable

```bash
# Create a secret

echo -n "my-database-password" | podman secret create db_password -

# Expose the secret as an environment variable
podman run -d \
  --name my-app \
  --secret db_password,type=env,target=DB_PASSWORD \
  my-app:latest

# The secret is available as the DB_PASSWORD environment variable
```

## Verifying the Environment Variable

```bash
# Check the environment variable inside the container
podman exec my-app env | grep DB_PASSWORD

# Or echo it directly
podman exec my-app sh -c 'echo $DB_PASSWORD'
```

## Multiple Secrets as Environment Variables

```bash
# Create multiple secrets
echo -n "postgres-pass-123" | podman secret create db_pass -
echo -n "sk-api-key-456" | podman secret create api_key -
echo -n "redis-token-789" | podman secret create redis_token -

# Expose each as a different environment variable
podman run -d \
  --name multi-env-app \
  --secret db_pass,type=env,target=DATABASE_PASSWORD \
  --secret api_key,type=env,target=API_KEY \
  --secret redis_token,type=env,target=REDIS_AUTH_TOKEN \
  multi-env-app:latest
```

## Default Environment Variable Name

```bash
# When target is not specified, the secret name is used as the variable name
echo -n "my-value" | podman secret create MY_SECRET -

podman run -d \
  --name app \
  --secret MY_SECRET,type=env \
  my-app:latest

# The secret is available as $MY_SECRET inside the container
```

## Mixing File Mounts and Environment Variables

```bash
# Use file mount for certificates and env vars for passwords
podman secret create tls_cert ./certs/server.crt
echo -n "db-password" | podman secret create db_pass -

podman run -d \
  --name mixed-app \
  --secret tls_cert,target=/etc/ssl/server.crt \
  --secret db_pass,type=env,target=DB_PASSWORD \
  mixed-app:latest
```

## Security Considerations

```bash
# Environment variables from secrets are more secure than -e flag
# because they do not appear in:

# 1. podman inspect output
podman inspect --format='{{.Config.Env}}' my-app
# The secret value is masked here, for example DB_PASSWORD=*******

# 2. Command line history
# Unlike: podman run -e DB_PASSWORD=secret my-app:latest
# The value is not in your shell history

# However, env vars ARE visible to:
# - The container process and its child processes
# - /proc/<pid>/environ inside the container, subject to process permissions
# For maximum security, use file mounts instead
```

## Summary

Podman secrets can be exposed as environment variables using `--secret name,type=env,target=VAR_NAME`. This keeps the secret value out of `podman inspect` output and command-line history, making it more secure than the `-e` flag. However, environment variables are visible to all processes inside the container, so file mounts remain the more secure option for highly sensitive data. Use env vars when your application requires configuration through environment variables.
