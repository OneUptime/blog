# How to Use Startup Scripts to Bootstrap a Compute Engine Instance with Docker and Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Startup Scripts, Docker, Nginx

Description: Learn how to use GCP Compute Engine startup scripts to automatically bootstrap instances with Docker and Nginx, including practical examples and debugging tips.

---

Startup scripts are one of the first things you learn when working with Compute Engine, and for good reason. They let you automatically configure a VM the moment it boots up - installing packages, pulling container images, starting services, and anything else you need to get your application running. In this post, I will show you how to use startup scripts effectively to set up a Docker and Nginx environment on a fresh Compute Engine instance.

## How Startup Scripts Work

When a Compute Engine instance boots, it checks its metadata for a `startup-script` key. If one exists, it runs it as root. The script runs every time the instance boots, not just the first time, which is something to keep in mind when writing your scripts.

There are two ways to provide a startup script:

1. **Inline**: Pass the script directly in the metadata
2. **From Cloud Storage**: Reference a script stored in a GCS bucket

## Basic Inline Startup Script

Let me start with a simple example that installs Docker and Nginx on a Debian-based instance.

```bash
# Create a VM with an inline startup script that installs Docker and Nginx
gcloud compute instances create web-server \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --tags=http-server \
    --metadata=startup-script='#!/bin/bash
set -e

# Log startup script execution for debugging
exec > /var/log/startup-script.log 2>&1
echo "Startup script started at $(date)"

# Update package lists and install prerequisites
apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Install Docker from official repository
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Install Nginx
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

echo "Startup script completed at $(date)"'
```

This works, but inline scripts have a practical limit - they get messy when they are more than a few lines. For anything substantial, use a script file.

## Using a Startup Script from Cloud Storage

A better approach for longer scripts is to store them in a Cloud Storage bucket.

First, write your startup script to a file:

```bash
#!/bin/bash
# startup.sh - Bootstrap script for web server instances
set -e

# Redirect all output to a log file for debugging
exec > /var/log/startup-script-custom.log 2>&1
echo "=== Startup script began at $(date) ==="

# Prevent apt from prompting for input
export DEBIAN_FRONTEND=noninteractive

# Check if this is a first-time setup or a reboot
SETUP_MARKER="/var/lib/startup-script-completed"
if [ -f "$SETUP_MARKER" ]; then
    echo "Setup already completed. Ensuring services are running."
    systemctl start docker
    systemctl start nginx
    docker start my-app 2>/dev/null || true
    exit 0
fi

# Update and install dependencies
apt-get update
apt-get install -y -q \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    nginx

# Install Docker
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Configure Nginx as a reverse proxy for a Docker container
cat > /etc/nginx/sites-available/default << 'NGINX_CONF'
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        return 200 'healthy';
        add_header Content-Type text/plain;
    }
}
NGINX_CONF

# Restart Nginx with the new configuration
systemctl restart nginx

# Pull and run the application container
docker pull my-registry/my-app:latest
docker run -d \
    --name my-app \
    --restart unless-stopped \
    -p 8080:8080 \
    my-registry/my-app:latest

# Mark setup as complete so we do not repeat it on reboot
touch "$SETUP_MARKER"
echo "=== Startup script completed at $(date) ==="
```

Upload it to Cloud Storage and reference it:

```bash
# Upload the startup script to a GCS bucket
gsutil cp startup.sh gs://my-project-scripts/startup.sh

# Create a VM that pulls its startup script from GCS
gcloud compute instances create web-server \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --tags=http-server \
    --scopes=storage-ro \
    --metadata=startup-script-url=gs://my-project-scripts/startup.sh
```

The `--scopes=storage-ro` flag gives the VM read access to Cloud Storage so it can fetch the script.

## Handling Idempotency

Since startup scripts run on every boot, you need to make them idempotent - meaning running them multiple times produces the same result as running them once. The marker file approach shown above is one way to handle this. Another approach is to check for each component before installing it:

```bash
#!/bin/bash
# Idempotent startup script that checks before installing

# Only install Docker if it is not already present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
fi

# Only install Nginx if it is not already present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update && apt-get install -y nginx
fi

# Always ensure services are running
systemctl start docker
systemctl start nginx
```

## Using Docker Compose with Startup Scripts

For multi-container setups, Docker Compose works well in startup scripts.

```bash
#!/bin/bash
# Startup script that deploys a multi-container application with Docker Compose
set -e

# Install Docker if needed
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
fi

# Create the application directory
mkdir -p /opt/myapp

# Write the Docker Compose file
cat > /opt/myapp/docker-compose.yml << 'COMPOSE'
version: "3.8"
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - app
    restart: unless-stopped

  app:
    image: my-registry/my-app:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://db:5432/myapp
    restart: unless-stopped

  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    restart: unless-stopped

volumes:
  pgdata:
COMPOSE

# Start the application stack
cd /opt/myapp
docker compose up -d
```

## Passing Configuration Through Metadata

Startup scripts can read other metadata values, making them dynamic. This is great for passing environment-specific configuration.

```bash
# Create a VM with custom metadata that the startup script can read
gcloud compute instances create web-server \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --metadata=startup-script-url=gs://my-scripts/startup.sh,app-version=v2.1.0,environment=production
```

Inside the startup script, read these values using the metadata server:

```bash
# Read custom metadata values from the instance metadata server
APP_VERSION=$(curl -s -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/attributes/app-version)

ENVIRONMENT=$(curl -s -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/attributes/environment)

echo "Deploying app version $APP_VERSION in $ENVIRONMENT environment"

# Use the metadata values to pull the right container image
docker pull my-registry/my-app:$APP_VERSION
docker run -d --name my-app -e ENV=$ENVIRONMENT my-registry/my-app:$APP_VERSION
```

## Debugging Startup Scripts

When your startup script does not work as expected, here is how to troubleshoot:

```bash
# Check the startup script output log
sudo journalctl -u google-startup-scripts.service

# Or check the serial port output from outside the VM
gcloud compute instances get-serial-port-output web-server --zone=us-central1-a

# Check if the startup script metadata is set correctly
gcloud compute instances describe web-server \
    --zone=us-central1-a \
    --format="value(metadata.items)"
```

The serial port output is especially useful when you cannot SSH into the instance because the startup script broke something.

## Terraform Example

Here is the Terraform version for completeness.

```hcl
# Compute Engine instance with a startup script from a local file
resource "google_compute_instance" "web" {
  name         = "web-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  # Load startup script from a local file
  metadata_startup_script = file("${path.module}/scripts/startup.sh")

  tags = ["http-server"]
}
```

## Wrapping Up

Startup scripts are the simplest way to automate VM provisioning on Compute Engine. For quick setups, inline scripts work fine. For production use, store your scripts in Cloud Storage, make them idempotent, and always log their output. If your startup script is growing beyond a few hundred lines or takes more than a few minutes to run, that is a sign you should be using golden images instead - bake the slow, stable parts into an image and use the startup script only for dynamic configuration.
