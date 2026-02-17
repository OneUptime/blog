# How to Use Compute Engine Instance Metadata to Dynamically Configure Application Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Instance Metadata, Configuration, Cloud Infrastructure

Description: Learn how to leverage Compute Engine instance metadata to dynamically configure applications at runtime without hardcoding settings or managing external configuration files.

---

Hardcoding configuration values into your application is a recipe for pain. Different environments need different settings, and rebuilding images every time a config changes is wasteful. Google Compute Engine's instance metadata gives you a clean way to pass configuration to your VMs at boot time and even update it while they are running.

I use metadata extensively for things like feature flags, database endpoints, and environment-specific settings. Here is how it all works.

## How Instance Metadata Works

Every Compute Engine VM has access to a metadata server at a well-known IP address: `169.254.169.254`. Your application can query this server over HTTP to get configuration values. No authentication is needed from within the VM - the metadata server is only accessible from the instance itself.

There are two levels of metadata:
- **Project metadata** - shared across all instances in the project
- **Instance metadata** - specific to a single VM

Instance metadata takes precedence when both define the same key.

## Setting Metadata When Creating an Instance

You can attach custom metadata key-value pairs when creating a VM:

```bash
# Create an instance with custom metadata for app configuration
gcloud compute instances create app-server \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --metadata=db-host=10.0.0.5,db-port=5432,app-env=production,log-level=info
```

Each key-value pair is separated by commas. If your values contain commas or special characters, use the `--metadata-from-file` flag instead.

## Setting Project-Level Metadata

For settings that should apply to every VM in the project, use project metadata:

```bash
# Set project-wide metadata that all VMs can access
gcloud compute project-info add-metadata \
  --metadata=shared-cache-host=10.0.1.10,monitoring-endpoint=https://monitor.example.com
```

## Reading Metadata from Inside the VM

The metadata server exposes values through a simple HTTP API. The key thing to remember is to include the `Metadata-Flavor: Google` header - requests without it are rejected.

Here is how to read metadata using curl:

```bash
# Read a specific custom metadata value from the instance
curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/db-host" \
  -H "Metadata-Flavor: Google"
```

This returns just the value - no JSON wrapping, no extra formatting. You can use this directly in scripts:

```bash
# Use metadata values in a configuration script
DB_HOST=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/db-host" \
  -H "Metadata-Flavor: Google")

DB_PORT=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/db-port" \
  -H "Metadata-Flavor: Google")

APP_ENV=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/app-env" \
  -H "Metadata-Flavor: Google")

echo "Connecting to database at ${DB_HOST}:${DB_PORT} in ${APP_ENV} mode"
```

For project-level metadata:

```bash
# Read project-level metadata
curl -s "http://metadata.google.internal/computeMetadata/v1/project/attributes/shared-cache-host" \
  -H "Metadata-Flavor: Google"
```

## Reading Metadata in Application Code

Most applications should read metadata during startup. Here is how to do it in a few common languages.

Python example using the requests library:

```python
import requests

# Helper function to fetch metadata values from the GCE metadata server
def get_metadata(key, level="instance"):
    """Fetch a metadata value from the Compute Engine metadata server."""
    base_url = "http://metadata.google.internal/computeMetadata/v1"
    if level == "instance":
        url = f"{base_url}/instance/attributes/{key}"
    else:
        url = f"{base_url}/project/attributes/{key}"

    headers = {"Metadata-Flavor": "Google"}
    response = requests.get(url, headers=headers, timeout=5)

    if response.status_code == 200:
        return response.text
    return None

# Read configuration from metadata at application startup
db_host = get_metadata("db-host")
db_port = get_metadata("db-port")
app_env = get_metadata("app-env")
log_level = get_metadata("log-level")

print(f"Database: {db_host}:{db_port}")
print(f"Environment: {app_env}, Log Level: {log_level}")
```

Node.js example:

```javascript
const http = require('http');

// Fetch a metadata value from the GCE metadata server
function getMetadata(key) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'metadata.google.internal',
      path: `/computeMetadata/v1/instance/attributes/${key}`,
      headers: { 'Metadata-Flavor': 'Google' },
      timeout: 5000
    };

    http.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Load all configuration from metadata during startup
async function loadConfig() {
  const config = {
    dbHost: await getMetadata('db-host'),
    dbPort: await getMetadata('db-port'),
    appEnv: await getMetadata('app-env'),
    logLevel: await getMetadata('log-level')
  };

  console.log('Configuration loaded from metadata:', config);
  return config;
}

loadConfig();
```

## Updating Metadata on a Running Instance

One of the most useful features is the ability to update metadata without restarting the VM:

```bash
# Update a metadata value on a running instance
gcloud compute instances add-metadata app-server \
  --zone=us-central1-a \
  --metadata=log-level=debug
```

This changes the `log-level` metadata immediately. But your application needs to know about the change. That is where the metadata wait endpoint comes in.

## Watching for Metadata Changes

The metadata server supports long-polling through the `wait-for-change` parameter. Your application can block on this endpoint and get notified the instant metadata changes:

```bash
# Wait for metadata changes using long polling (blocks until a change occurs)
curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/?recursive=true&wait_for_change=true" \
  -H "Metadata-Flavor: Google"
```

Here is a Python script that watches for changes and reloads configuration:

```python
import requests
import json
import time

METADATA_URL = "http://metadata.google.internal/computeMetadata/v1"
HEADERS = {"Metadata-Flavor": "Google"}

def watch_metadata():
    """Watch for metadata changes and reload configuration dynamically."""
    last_etag = None

    while True:
        try:
            url = f"{METADATA_URL}/instance/attributes/"
            params = {"recursive": "true", "wait_for_change": "true"}

            # Include the ETag to only return when something actually changes
            if last_etag:
                params["last_etag"] = last_etag

            response = requests.get(url, headers=HEADERS, params=params, timeout=300)

            if response.status_code == 200:
                last_etag = response.headers.get("ETag")
                new_config = response.text
                print(f"Metadata changed: {new_config}")
                # Apply the new configuration to your application here
                apply_config(json.loads(new_config))

        except requests.exceptions.Timeout:
            # Timeout is normal - just retry the long poll
            continue
        except Exception as e:
            print(f"Error watching metadata: {e}")
            time.sleep(5)

def apply_config(config):
    """Apply updated configuration to the running application."""
    print(f"Applying new config: {config}")

watch_metadata()
```

## Using Metadata in Startup Scripts

A common pattern is to use metadata values in your startup script to configure the VM at boot time:

```bash
#!/bin/bash
# Startup script that reads metadata to configure the application

METADATA_URL="http://metadata.google.internal/computeMetadata/v1"
METADATA_HEADER="Metadata-Flavor: Google"

# Read configuration from instance metadata
APP_VERSION=$(curl -s "${METADATA_URL}/instance/attributes/app-version" -H "${METADATA_HEADER}")
CONFIG_BUCKET=$(curl -s "${METADATA_URL}/instance/attributes/config-bucket" -H "${METADATA_HEADER}")

# Download configuration file from GCS based on metadata
gsutil cp "gs://${CONFIG_BUCKET}/config-${APP_VERSION}.yaml" /etc/myapp/config.yaml

# Start the application with metadata-driven configuration
systemctl start myapp
```

## Built-in Metadata You Should Know About

Beyond custom metadata, there are several built-in metadata values that are useful for application configuration:

```bash
# Get the instance name
curl -s "http://metadata.google.internal/computeMetadata/v1/instance/name" -H "Metadata-Flavor: Google"

# Get the zone (returns something like projects/123/zones/us-central1-a)
curl -s "http://metadata.google.internal/computeMetadata/v1/instance/zone" -H "Metadata-Flavor: Google"

# Get the internal IP address
curl -s "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip" -H "Metadata-Flavor: Google"

# Get the service account access token for API calls
curl -s "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" -H "Metadata-Flavor: Google"
```

## Best Practices

A few things I have learned the hard way:

1. Do not store secrets in metadata. Use Secret Manager instead. Metadata is not encrypted at rest and is visible to anyone with instance read permissions.

2. Keep metadata values short. There is a 256KB limit for all custom metadata combined. For large configurations, store them in Cloud Storage and put the bucket path in metadata.

3. Always set a timeout when querying the metadata server from your application. If you are not running on GCE (like in local development), the request will hang without a timeout.

4. Use project-level metadata for shared settings and instance-level metadata for instance-specific overrides. This keeps your configuration DRY.

Instance metadata is one of those features that seems simple but unlocks a lot of flexibility. Once you start using it, you will wonder how you managed without it.
