# How to Set Environment Variables for Exec in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Exec, Environment Variable

Description: Learn how to pass environment variables when executing commands inside Podman containers using the -e flag, env files, and other techniques.

---

> Setting the right environment variables during exec ensures your commands run with the correct configuration context.

Environment variables control application behavior, connection strings, feature flags, and more. When you execute commands inside a running Podman container, you may need to set or override environment variables for that specific exec session. This guide covers all the methods for managing environment variables with `podman exec`.

---

## Using the -e Flag

The `-e` or `--env` flag sets environment variables for the exec session:

```bash
# Start a test container

podman run -d --name my-app nginx:latest

# Set a single environment variable
podman exec -e MY_VAR=hello my-app printenv MY_VAR
# Output: hello

# Set multiple environment variables
podman exec -e DB_HOST=localhost -e DB_PORT=5432 -e DB_NAME=mydb my-app env | grep DB_
# Output:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=mydb
```

## Environment Variables with Spaces and Special Characters

Handle values that contain spaces or special characters by quoting them:

```bash
# Value with spaces
podman exec -e "GREETING=Hello World" my-app printenv GREETING
# Output: Hello World

# Value with equals sign
podman exec -e "CONNECTION_STRING=host=localhost;port=5432" my-app printenv CONNECTION_STRING

# Value with special characters
podman exec -e 'REGEX_PATTERN=^[a-z]+$' my-app printenv REGEX_PATTERN
```

## Using Host Environment Variables

Pass environment variables from your host into the container:

```bash
# Export a variable on the host
export API_KEY=my-secret-key-123

# Pass it to the container using -e without a value
podman exec -e API_KEY my-app printenv API_KEY
# Output: my-secret-key-123

# Pass multiple host variables
export HOST_NAME=$(hostname)
export CURRENT_USER=$(whoami)
podman exec -e HOST_NAME -e CURRENT_USER my-app env | grep -E "HOST_NAME|CURRENT_USER"
```

## Using an Environment File

For many variables, use the `--env-file` flag to read them from a file:

```bash
# Create an environment file
cat > /tmp/app.env << 'EOF'
DATABASE_URL=postgres://user:pass@db:5432/myapp
REDIS_URL=redis://cache:6379
LOG_LEVEL=debug
MAX_WORKERS=4
FEATURE_FLAG_NEW_UI=true
EOF

# Use the env file with exec
podman exec --env-file /tmp/app.env my-app env | grep -E "DATABASE_URL|REDIS_URL|LOG_LEVEL"
```

Environment files support the following format:

```bash
# Create an env file with comments and empty lines
cat > /tmp/config.env << 'EOF'
# Database configuration
DB_HOST=localhost
DB_PORT=5432

# Application settings
APP_MODE=production
DEBUG=false
EOF

podman exec --env-file /tmp/config.env my-app env | grep -E "DB_|APP_|DEBUG"
```

## Combining -e and --env-file

You can use both flags together. Individual `-e` flags override values from the env file:

```bash
# The env file sets DEBUG=false
# But we override it to true with -e
podman exec --env-file /tmp/config.env -e DEBUG=true my-app printenv DEBUG
# Output: true
```

## Viewing All Environment Variables

Check what environment variables are already set in the container:

```bash
# View all environment variables
podman exec my-app env

# Sort them for easier reading
podman exec my-app env | sort

# Filter for specific prefixes
podman exec my-app env | grep -i nginx
```

## Environment Variables in Interactive Shells

Environment variables set with `-e` are available in interactive shell sessions:

```bash
# Open a shell with custom environment
podman exec -it -e EDITOR=vim -e TERM=xterm-256color my-app /bin/sh

# Inside the container:
# root@container:/# echo $EDITOR
# vim
# root@container:/# echo $TERM
# xterm-256color
```

## Practical Examples

### Running Database Migrations

```bash
# Set database connection details for a migration command
podman exec \
    -e DATABASE_URL="postgres://admin:secret@db:5432/production" \
    -e MIGRATION_DIR="/app/migrations" \
    my-app /bin/sh -c 'echo "Connecting to $DATABASE_URL, running migrations from $MIGRATION_DIR"'
```

### Debug Mode for a Specific Command

```bash
# Enable verbose debugging for a single command
podman exec -e DEBUG=1 -e VERBOSE=true -e LOG_LEVEL=trace my-app /bin/sh -c '
    echo "Debug mode: $DEBUG"
    echo "Verbose: $VERBOSE"
    echo "Log level: $LOG_LEVEL"
'
```

### Setting Locale and Language

```bash
# Run a command with specific locale settings
podman exec -e LANG=en_US.UTF-8 -e LC_ALL=en_US.UTF-8 my-app locale 2>/dev/null || \
    podman exec -e LANG=en_US.UTF-8 my-app printenv LANG
```

## Cleanup

```bash
podman stop my-app && podman rm my-app
rm -f /tmp/app.env /tmp/config.env
```

## Summary

Podman provides flexible environment variable management for exec sessions through the `-e` flag for individual variables and `--env-file` for bulk loading. You can pass host variables, override existing values, and combine both approaches. This makes it easy to configure one-off commands with the exact runtime context they need.
