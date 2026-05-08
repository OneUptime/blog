# How to Configure Environment Files in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Environment Files, Configuration

Description: Learn how to use environment files with Podman Quadlet to load multiple environment variables from external files.

---

> Keep your container configuration clean by loading environment variables from external files using the EnvironmentFile directive in Quadlet.

When your container needs many environment variables, listing them all in the Quadlet file becomes unwieldy. The `EnvironmentFile` directive lets you load variables from an external file, keeping your Quadlet unit file clean and making it easy to manage environment-specific configurations.

---

## Create an Environment File

First, create a file containing your environment variables in `KEY=VALUE` format:

```bash
# Create the environment file

cat > ~/.config/containers/systemd/myapp.env << 'ENVEOF'
# Database configuration
DATABASE_HOST=db.example.com
DATABASE_PORT=5432
DATABASE_USER=appuser
DATABASE_PASSWORD=secretpass
DATABASE_NAME=myappdb

# Application settings
NODE_ENV=production
LOG_LEVEL=info
APP_PORT=3000
ENVEOF
```

## Reference the Environment File in Quadlet

Use the `EnvironmentFile` directive to load the file:

```ini
# ~/.config/containers/systemd/myapp.container
[Unit]
Description=My application with env file

[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
# Load environment variables from an external file
EnvironmentFile=%h/.config/containers/systemd/myapp.env
PublishPort=3000:3000

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

The `%h` specifier expands to the user's home directory in systemd.

## Using Multiple Environment Files

You can specify multiple environment files:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# Load base configuration
EnvironmentFile=%h/.config/containers/systemd/base.env
# Load environment-specific overrides
EnvironmentFile=%h/.config/containers/systemd/production.env
```

Later files override values from earlier ones if there are duplicate keys.

## Combining Environment Files and Inline Variables

You can mix both approaches. Inline variables take precedence:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
EnvironmentFile=%h/.config/containers/systemd/myapp.env
# This overrides LOG_LEVEL from the env file
Environment=LOG_LEVEL=debug
```

## Reload and Verify

```bash
# Reload systemd
systemctl --user daemon-reload

# Start the service
systemctl --user start myapp.service

# Verify environment variables are loaded
podman exec myapp env | sort
```

## Summary

Environment files keep your Quadlet container files clean and make it easy to manage configuration separately. Use `EnvironmentFile` to load variables from external files and combine multiple files for layered configuration.
