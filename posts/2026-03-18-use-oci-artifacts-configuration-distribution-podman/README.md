# How to Use OCI Artifacts for Configuration Distribution with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, Configuration Management, Distribution

Description: Learn how to use OCI artifacts with Podman to distribute application configuration files across environments and teams.

---

> Using OCI artifacts for configuration distribution gives you versioned, registry-hosted, and integrity-verified config files alongside your container images.

Managing application configuration across multiple environments is a common challenge. OCI artifacts let you package configuration files and distribute them through the same registries you use for container images. With Podman, you can add, version, push, and pull configuration artifacts, creating a consistent workflow for config management. This post shows you how to set up configuration distribution using OCI artifacts.

---

## Why Use OCI Artifacts for Configuration

Traditional approaches to config distribution include git repositories, configuration management tools, or baking config into images. OCI artifacts offer several advantages:

- Versioned with tags and immutable digests
- Stored in the same registry as your container images
- Pulled using the same authentication and tooling
- Content-addressable for integrity verification

## Creating Configuration Artifacts

Start by organizing your configuration files and adding them to the Podman artifact store.

```bash
# Create environment-specific configuration files

cat > app-config-production.yaml <<EOF
app:
  name: myservice
  environment: production
  log_level: warn
  metrics_enabled: true
  database:
    host: db.prod.internal
    port: 5432
    pool_size: 50
  cache:
    host: redis.prod.internal
    ttl: 7200
EOF

cat > app-config-staging.yaml <<EOF
app:
  name: myservice
  environment: staging
  log_level: info
  metrics_enabled: true
  database:
    host: db.staging.internal
    port: 5432
    pool_size: 10
  cache:
    host: redis.staging.internal
    ttl: 300
EOF
```

## Adding Configuration to the Artifact Store

Add each environment configuration as a separate artifact with clear naming.

```bash
# Add production configuration
podman artifact add registry.example.com/myorg/myservice-config:prod-v1.0 \
    app-config-production.yaml

# Add staging configuration
podman artifact add registry.example.com/myorg/myservice-config:staging-v1.0 \
    app-config-staging.yaml

# Verify both artifacts
podman artifact ls | grep myservice-config
```

## Bundling Multiple Config Files

Applications often need multiple configuration files. Bundle them into a single artifact.

```bash
# Create additional config files
cat > logging.yaml <<EOF
logging:
  format: json
  output: stdout
  level: info
  rotation:
    max_size: 100MB
    max_files: 5
EOF

cat > feature-flags.yaml <<EOF
features:
  new_dashboard: true
  beta_api: false
  dark_mode: true
EOF

# Bundle all config files into one artifact
podman artifact add registry.example.com/myorg/myservice-config:full-v1.0 \
    app-config-production.yaml logging.yaml feature-flags.yaml
```

## Pushing Configuration to a Registry

Push the configuration artifacts so other team members and environments can pull them.

```bash
# Log in to the registry
podman login registry.example.com

# Push all configuration artifacts
podman artifact push registry.example.com/myorg/myservice-config:prod-v1.0
podman artifact push registry.example.com/myorg/myservice-config:staging-v1.0
podman artifact push registry.example.com/myorg/myservice-config:full-v1.0

echo "All configuration artifacts pushed"
```

## Consuming Configuration in Deployments

On the target machine or in a CI/CD pipeline, pull the configuration artifact into the local artifact store and extract it for the deployment.

```bash
#!/bin/bash
# Deployment script: pull configuration for the target environment

ENVIRONMENT="${DEPLOY_ENV:-staging}"
CONFIG_VERSION="${CONFIG_VERSION:-v1.0}"
REGISTRY="registry.example.com"
ARTIFACT="${REGISTRY}/myorg/myservice-config:${ENVIRONMENT}-${CONFIG_VERSION}"
TARGET_DIR="./config/${ENVIRONMENT}"

# Pull the configuration artifact
echo "Pulling configuration for ${ENVIRONMENT}..."
podman artifact pull "${ARTIFACT}"

# Inspect to verify the config was pulled correctly
podman artifact inspect "${ARTIFACT}" | \
    jq -r '.Manifest.layers[].annotations["org.opencontainers.image.title"]'

# Extract the configuration files for the deployment
mkdir -p "${TARGET_DIR}"
podman artifact extract "${ARTIFACT}" "${TARGET_DIR}"
```

## Versioning Configuration

Use semantic versioning for configuration artifacts to track changes.

```bash
# Version 1.0 - initial configuration
podman artifact add registry.example.com/myorg/myservice-config:v1.0 app-config-production.yaml

# Version 1.1 - updated pool size
sed -i 's/pool_size: 50/pool_size: 75/' app-config-production.yaml
podman artifact add registry.example.com/myorg/myservice-config:v1.1 app-config-production.yaml

# Always update the latest tag
podman artifact add --replace registry.example.com/myorg/myservice-config:latest app-config-production.yaml

# Push all versions
podman artifact push registry.example.com/myorg/myservice-config:v1.0
podman artifact push registry.example.com/myorg/myservice-config:v1.1
podman artifact push registry.example.com/myorg/myservice-config:latest
```

## Automating Configuration Updates

Build a script that pulls the latest configuration and applies it when the artifact digest changes.

```bash
#!/bin/bash
# Pull the latest configuration and apply it if the artifact digest changed

ARTIFACT="registry.example.com/myorg/myservice-config:latest"
DIGEST_FILE="/var/run/config-digest"
TARGET_DIR="/etc/myservice"

# Pull the latest artifact into the local store
podman artifact pull "$ARTIFACT"

# Read the current artifact digest from the local store
CURRENT_DIGEST=$(podman artifact inspect "$ARTIFACT" --format '{{.Digest}}')

# Compare with the last known digest
if [ -f "$DIGEST_FILE" ]; then
    PREVIOUS_DIGEST=$(cat "$DIGEST_FILE")
    if [ "$CURRENT_DIGEST" = "$PREVIOUS_DIGEST" ]; then
        echo "Configuration is up to date"
        exit 0
    fi
fi

# Extract the updated configuration
echo "New configuration detected, extracting..."
mkdir -p "$TARGET_DIR"
podman artifact extract "$ARTIFACT" "$TARGET_DIR"

# Save the new digest
echo "$CURRENT_DIGEST" > "$DIGEST_FILE"
echo "Configuration updated successfully"
```

## Summary

OCI artifacts provide a robust mechanism for distributing application configuration through container registries. With Podman, you can package single or multiple config files into versioned artifacts, push them to any OCI-compliant registry, and pull them in deployment pipelines or on target machines. This approach gives you versioning, integrity verification, and a unified workflow for managing both container images and their configuration. It fits naturally into existing container infrastructure without requiring additional tools.
