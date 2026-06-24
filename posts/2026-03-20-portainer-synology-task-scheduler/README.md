# How to Install Portainer on Synology NAS via Task Scheduler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Synology, NAS, Docker, Task Scheduler, Self-Hosted, Home Lab

Description: Use Synology's Task Scheduler to automatically install and start Portainer on DSM 7 without requiring manual SSH access each time.

## Introduction

While SSH is the most direct way to install Portainer on a Synology NAS, using Task Scheduler lets you automate the installation and ensure Portainer starts after DSM updates or unexpected reboots. This method is especially useful for NAS users who prefer not to keep SSH enabled permanently.

## Prerequisites

- Synology NAS with DSM 7.2 or later
- Container Manager installed from Package Center
- Admin access to DSM

## Step 1: Enable Task Scheduler

1. Open **Control Panel** on your Synology
2. Navigate to **Task Scheduler**
3. Ensure you can see the task list (no additional setup required)

## Step 2: Create the Installation Script

Navigate to **Task Scheduler > Create > Triggered Task > User-defined script**:

- **Task name**: `Install Portainer`
- **User**: `root`
- **Event**: `Boot-up`
- **Pre-task**: (leave blank)

In the **Task Settings** tab, paste the following script in the **Run command** field:

```bash
#!/bin/bash
# Portainer auto-install script for Synology NAS

# Runs at boot to ensure Portainer is always running

PORTAINER_CONTAINER="portainer"
PORTAINER_IMAGE="portainer/portainer-ce:lts"
PORTAINER_DATA_VOLUME="portainer_data"

# Wait for Docker to be fully ready
until docker info > /dev/null 2>&1; do
    echo "Waiting for Docker daemon..."
    sleep 5
done

# Check if Portainer is already running
if docker ps --filter "name=${PORTAINER_CONTAINER}" --filter "status=running" | grep -q "${PORTAINER_CONTAINER}"; then
    echo "Portainer is already running."
    exit 0
fi

# Check if container exists but is stopped
if docker ps -a --filter "name=${PORTAINER_CONTAINER}" | grep -q "${PORTAINER_CONTAINER}"; then
    echo "Starting existing Portainer container..."
    docker start "${PORTAINER_CONTAINER}"
    exit 0
fi

# Create data volume if it doesn't exist
if ! docker volume ls | grep -q "${PORTAINER_DATA_VOLUME}"; then
    echo "Creating Portainer data volume..."
    docker volume create "${PORTAINER_DATA_VOLUME}"
fi

# Pull Portainer LTS image
echo "Pulling Portainer image..."
docker pull "${PORTAINER_IMAGE}"

# Run Portainer
echo "Starting Portainer..."
docker run -d \
    --name "${PORTAINER_CONTAINER}" \
    --restart=unless-stopped \
    -p 9000:9000 \
    -p 9443:9443 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "${PORTAINER_DATA_VOLUME}:/data" \
    "${PORTAINER_IMAGE}"

echo "Portainer started successfully."
```

## Step 3: Create an Update Task

Create a second scheduled task for keeping Portainer updated. Go to **Task Scheduler > Create > Scheduled Task > User-defined script**:

- **Task name**: `Update Portainer`
- **User**: `root`
- **Schedule**: Weekly, Sunday at 3:00 AM

Script:

```bash
#!/bin/bash
# Weekly Portainer update script for Synology NAS

PORTAINER_CONTAINER="portainer"
PORTAINER_IMAGE="portainer/portainer-ce:lts"
PORTAINER_DATA_VOLUME="portainer_data"

echo "Checking for Portainer updates..."

# Pull the latest Portainer LTS image
docker pull "${PORTAINER_IMAGE}"

# Check if the running container is using the latest Portainer LTS image
RUNNING_IMAGE_ID=$(docker inspect --format='{{.Image}}' "${PORTAINER_CONTAINER}" 2>/dev/null)
LATEST_IMAGE_ID=$(docker inspect --format='{{.Id}}' "${PORTAINER_IMAGE}" 2>/dev/null)

if [ "${RUNNING_IMAGE_ID}" = "${LATEST_IMAGE_ID}" ]; then
    echo "Portainer is already up to date."
    exit 0
fi

echo "Updating Portainer to the latest LTS version..."

# Stop and remove old container
docker stop "${PORTAINER_CONTAINER}"
docker rm "${PORTAINER_CONTAINER}"

# Start with new image
docker run -d \
    --name "${PORTAINER_CONTAINER}" \
    --restart=unless-stopped \
    -p 9000:9000 \
    -p 9443:9443 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "${PORTAINER_DATA_VOLUME}:/data" \
    "${PORTAINER_IMAGE}"

# Clean up old images
docker image prune -f

echo "Portainer updated successfully."
```

## Step 4: Save Task Output to Log File

For better debugging, enable Task Scheduler's built-in output logging or use output redirection in the script:

In Task Scheduler, click **Settings**, enable **Save output results**, and choose a folder. You can also use output redirection in the script:

```bash
# Add to the top of your script
/bin/mkdir -p /volume1/docker/logs
exec >> /volume1/docker/logs/portainer-install.log 2>&1
echo "=== $(date) ==="
```

## Step 5: Run the Task Manually

To test without rebooting:

1. Select the **Install Portainer** task in Task Scheduler
2. Click **Run**
3. Check the result in **Action > View Result**

## Step 6: Verify Installation

After the task runs:

1. Open **Container Manager** - you should see the Portainer container running
2. Access Portainer at `https://<synology-ip>:9443` (recommended) or `http://<synology-ip>:9000` if you want HTTP access

## Handling DSM Updates

After major DSM updates, Container Manager can take longer to become available. The boot-up task ensures Portainer restarts automatically. For extra reliability, use an availability check in the boot-up task instead of a fixed delay:

```bash
# Add this check for the Docker daemon being available
until docker info > /dev/null 2>&1; do
    echo "Waiting for Docker daemon..."
    sleep 5
done
```

## Conclusion

Using Synology Task Scheduler to install and maintain Portainer gives you automation without keeping SSH permanently enabled. The boot-up task ensures resilience after DSM updates, and the weekly update task keeps your Portainer installation current without manual intervention.
