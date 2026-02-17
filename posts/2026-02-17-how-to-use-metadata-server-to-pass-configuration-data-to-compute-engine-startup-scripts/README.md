# How to Use Metadata Server to Pass Configuration Data to Compute Engine Startup Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Metadata Server, Startup Scripts, Configuration

Description: Learn how to use the GCP Compute Engine metadata server to dynamically pass configuration data to startup scripts and running applications.

---

Hardcoding configuration values into startup scripts is a recipe for trouble. Every environment needs different settings, and you end up maintaining multiple versions of the same script. The GCP metadata server provides a cleaner approach - you store configuration values as instance or project metadata, and your scripts read them dynamically at runtime.

In this post, I will show you how to use the metadata server effectively for passing configuration to startup scripts, reading instance identity information, and building environment-aware applications.

## What is the Metadata Server?

Every Compute Engine instance has access to a metadata server at `http://metadata.google.internal` (or `169.254.169.254`). This server provides information about the instance and project without requiring any authentication from within the VM. It is available immediately when the instance boots, making it perfect for startup scripts.

The metadata server provides:
- Instance-level metadata (name, zone, machine type, network interfaces)
- Project-level metadata (project ID, project number)
- Custom metadata that you set (configuration values, feature flags, secrets)
- Service account tokens (for authenticating to GCP APIs)

## Setting Custom Metadata

You can set metadata at the instance level or the project level.

**Instance-level metadata** (applies to a specific VM):

```bash
# Set custom metadata on a specific instance
gcloud compute instances add-metadata my-vm \
    --zone=us-central1-a \
    --metadata=app-version=v2.3.1,environment=production,log-level=info,db-host=10.128.0.50
```

**Project-level metadata** (inherited by all instances in the project):

```bash
# Set project-wide metadata
gcloud compute project-info add-metadata \
    --metadata=default-region=us-central1,alert-email=ops@example.com
```

You can also set metadata when creating an instance:

```bash
# Create a VM with custom metadata
gcloud compute instances create app-server \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --metadata=app-version=v2.3.1,environment=staging,feature-flags=new-ui:true:dark-mode:false
```

## Reading Metadata in Startup Scripts

Inside a VM, use `curl` to read metadata values. The key requirement is including the `Metadata-Flavor: Google` header - requests without this header are rejected.

```bash
#!/bin/bash
# startup.sh - Read configuration from metadata server and configure the application

# Helper function to read metadata values
get_metadata() {
    curl -s -H "Metadata-Flavor: Google" \
        "http://metadata.google.internal/computeMetadata/v1/$1"
}

# Read custom metadata values
APP_VERSION=$(get_metadata "instance/attributes/app-version")
ENVIRONMENT=$(get_metadata "instance/attributes/environment")
LOG_LEVEL=$(get_metadata "instance/attributes/log-level")
DB_HOST=$(get_metadata "instance/attributes/db-host")

# Read built-in instance metadata
INSTANCE_NAME=$(get_metadata "instance/name")
INSTANCE_ZONE=$(get_metadata "instance/zone")
INTERNAL_IP=$(get_metadata "instance/network-interfaces/0/ip")
PROJECT_ID=$(get_metadata "project/project-id")

echo "Configuring $INSTANCE_NAME in $ENVIRONMENT environment"
echo "App version: $APP_VERSION"
echo "Database host: $DB_HOST"

# Use the metadata to configure the application
cat > /opt/app/config.yaml << EOF
environment: ${ENVIRONMENT}
version: ${APP_VERSION}
logging:
  level: ${LOG_LEVEL}
database:
  host: ${DB_HOST}
  port: 5432
instance:
  name: ${INSTANCE_NAME}
  ip: ${INTERNAL_IP}
  project: ${PROJECT_ID}
EOF

# Start the application with the generated config
/opt/app/start.sh --config /opt/app/config.yaml
```

## Available Metadata Endpoints

Here is a reference of commonly used metadata endpoints:

```bash
# Instance metadata
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/name
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/zone
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/machine-type
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/hostname
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/id
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/tags

# Network metadata
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip

# Project metadata
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/project/project-id
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/project/numeric-project-id

# Custom attributes (instance level)
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/my-custom-key

# Custom attributes (project level)
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/project/attributes/my-project-key

# Service account token
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token
```

## Reading Metadata in Python

If your application is written in Python, use the `requests` library or the Google Cloud metadata library:

```python
# read_metadata.py - Read GCP metadata in Python
import requests

METADATA_URL = "http://metadata.google.internal/computeMetadata/v1"
METADATA_HEADERS = {"Metadata-Flavor": "Google"}


def get_metadata(path):
    """Fetch a value from the GCP metadata server."""
    url = f"{METADATA_URL}/{path}"
    response = requests.get(url, headers=METADATA_HEADERS, timeout=5)
    response.raise_for_status()
    return response.text


def get_instance_config():
    """Build application config from metadata."""
    return {
        "instance_name": get_metadata("instance/name"),
        "zone": get_metadata("instance/zone").split("/")[-1],
        "project_id": get_metadata("project/project-id"),
        "internal_ip": get_metadata("instance/network-interfaces/0/ip"),
        "environment": get_metadata("instance/attributes/environment"),
        "app_version": get_metadata("instance/attributes/app-version"),
        "log_level": get_metadata("instance/attributes/log-level"),
    }


if __name__ == "__main__":
    config = get_instance_config()
    for key, value in config.items():
        print(f"{key}: {value}")
```

## Watching for Metadata Changes

One powerful feature of the metadata server is the ability to watch for changes. Your application can long-poll the metadata server and react to configuration changes without restarting.

```bash
# Watch for changes to a specific metadata key
# This blocks until the value changes, then returns the new value
curl -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/app-version?wait_for_change=true"
```

Here is a Python script that watches for metadata changes:

```python
# watch_metadata.py - Watch for metadata changes and reload configuration
import requests
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

METADATA_URL = "http://metadata.google.internal/computeMetadata/v1"
HEADERS = {"Metadata-Flavor": "Google"}


def watch_metadata(key, last_etag=None):
    """Watch a metadata key for changes. Blocks until the value changes."""
    url = f"{METADATA_URL}/instance/attributes/{key}"
    params = {"wait_for_change": "true"}
    if last_etag:
        params["last_etag"] = last_etag

    response = requests.get(url, headers=HEADERS, params=params, timeout=300)
    new_etag = response.headers.get("ETag")
    return response.text, new_etag


def main():
    """Continuously watch for configuration changes."""
    etag = None
    while True:
        try:
            value, etag = watch_metadata("app-version", etag)
            logger.info(f"Configuration changed: app-version = {value}")
            # Trigger application reload here
            reload_application(value)
        except requests.exceptions.Timeout:
            # No change within timeout, loop and try again
            continue
        except Exception as e:
            logger.error(f"Error watching metadata: {e}")
            time.sleep(10)
```

## Updating Metadata on a Running VM

You can change metadata values on a running VM, and applications watching for changes will pick them up immediately:

```bash
# Update a metadata value on a running instance
gcloud compute instances add-metadata my-vm \
    --zone=us-central1-a \
    --metadata=app-version=v2.4.0

# Update multiple values at once
gcloud compute instances add-metadata my-vm \
    --zone=us-central1-a \
    --metadata=app-version=v2.4.0,log-level=debug,feature-flags=new-ui:true
```

This is a great way to do feature flag toggles or configuration updates without redeploying.

## Terraform Configuration

```hcl
# Instance with custom metadata for configuration
resource "google_compute_instance" "app" {
  name         = "app-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }

  # Custom metadata for application configuration
  metadata = {
    app-version   = var.app_version
    environment   = var.environment
    log-level     = var.log_level
    db-host       = var.db_host
    feature-flags = join(",", var.feature_flags)
  }

  metadata_startup_script = file("${path.module}/scripts/startup.sh")
}

# Variables for environment-specific configuration
variable "app_version" {
  default = "v2.3.1"
}

variable "environment" {
  default = "production"
}

variable "log_level" {
  default = "info"
}

variable "db_host" {
  default = "10.128.0.50"
}

variable "feature_flags" {
  type    = list(string)
  default = ["new-ui:true", "dark-mode:false"]
}
```

## Security Considerations

The metadata server is accessible to any process running on the VM, so be thoughtful about what you store there:

1. **Do not store secrets in metadata.** Use Secret Manager instead. Metadata is visible to anyone who can access the instance.
2. **Restrict metadata access** by using the metadata concealment feature for GKE nodes.
3. **Be aware that metadata is visible** through the `gcloud compute instances describe` command to anyone with the `compute.instances.get` permission.
4. **Use project-level metadata sparingly** since it applies to all VMs in the project.

For secrets, the pattern looks like this:

```bash
# Store the secret name in metadata, not the secret value
gcloud compute instances add-metadata my-vm \
    --zone=us-central1-a \
    --metadata=db-password-secret=projects/my-project/secrets/db-password/versions/latest

# In the startup script, use the metadata to know which secret to fetch
SECRET_NAME=$(curl -s -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/attributes/db-password-secret)

# Fetch the actual secret from Secret Manager
DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password)
```

## Wrapping Up

The metadata server is a simple but powerful tool for making your Compute Engine instances configuration-driven. It is available immediately at boot time, requires no authentication from inside the VM, and supports real-time change notifications. Use it for environment configuration, feature flags, and instance discovery. Just remember to keep secrets in Secret Manager and use metadata only for non-sensitive configuration data.
