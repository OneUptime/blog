# How to Map Host Devices (USB, Serial) to Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Device, IoT, Hardware

Description: Map physical host devices including USB and serial ports to Docker containers in Portainer for hardware access.

## Introduction

Map physical host devices including USB and serial ports to Docker containers in Portainer for hardware access. This guide walks you through the process step by step with practical examples.

## Prerequisites

- Portainer installed (CE or BE)
- At least one Docker environment connected
- The host device is present on the Docker host (for example `/dev/ttyUSB0` or `/dev/ttyACM0`)
- Basic familiarity with Docker concepts

## Using the Portainer UI

### Step 1: Navigate to the Relevant Section

1. Log in to your Portainer instance
2. Select your Docker environment from the home screen
3. Navigate to **Containers**
4. Click **Add container** for a new deployment, or open an existing container and click **Duplicate/Edit** to update it

### Step 2: Locate Your Container

Use the search and filter options in Portainer if you are updating an existing container:

1. Click the **Containers** menu item
2. Use the search box to find your container
3. Click on the container name for details
4. Click **Duplicate/Edit** to change the configuration

## Step-by-Step Instructions

### View Container Details

```bash
# Confirm the device exists on the Docker host
ls -l /dev/ttyUSB0

# Inspect the container's configured device mappings
docker inspect container-name | jq '.[0].HostConfig.Devices'

# Via Portainer: Containers > container-name > Inspect
```

### Key Configuration Options

```yaml
# compose.yaml example
services:
  app:
    image: your-app:latest
    container_name: my-app
    restart: unless-stopped
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0"
    environment:
      - NODE_ENV=production
    volumes:
      - app-data:/data
    networks:
      - app-net

volumes:
  app-data:

networks:
  app-net:
    driver: bridge
```

## Command Line Examples

Useful Docker commands for this task:

```bash
# Confirm the device exists on the host
ls -l /dev/ttyUSB0

# Start a container with the device mapped
docker run -d --name my-app \
  --device=/dev/ttyUSB0:/dev/ttyUSB0 \
  your-app:latest

# Inspect the applied device mapping
docker inspect my-app | jq '.[0].HostConfig.Devices'

# Verify the device node exists inside the container
docker exec my-app ls -l /dev/ttyUSB0
```

## Portainer-Specific Features

Portainer provides several UI conveniences for this task:

1. **Duplicate/Edit**: Update an existing container and replace it with the new configuration
2. **Advanced container settings**: Under **Runtime & Resources**, use **Devices** to add the host path and container path
3. **Inspect View**: Confirm the mapped device appears under `HostConfig.Devices`
4. **Container Console**: Verify the device node is visible inside the container
5. **Quick Actions**: Start, stop, and restart the container after applying changes

## Troubleshooting Common Issues

**Issue: Device path not found**
```bash
# Check that the device exists on the Docker host
ls -l /dev/ttyUSB0

# Confirm the container mapping
docker inspect container-name | jq '.[0].HostConfig.Devices'
```

**Issue: Permission denied errors**
```bash
# Check ownership and mode of the host device
ls -l /dev/ttyUSB0

# Check which user the container runs as
docker inspect container-name | jq '.[0].Config.User'
```

**Issue: Changes not applied after editing**
```bash
# Verify the saved mapping
docker inspect container-name | jq '.[0].HostConfig.Devices'

# Portainer replaces the container when you edit it
# Containers > container-name > Duplicate/Edit > Deploy the container > Replace
```

## Automating with the Portainer API

Automate this task via the Portainer API:

```bash
# Authenticate and get JWT token
TOKEN=$(curl -s -X POST \
  "https://portainer.example.com/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"password"}' | jq -r .jwt)

# Create a container with a mapped serial device
CONTAINER_ID=$(curl -s -X POST \
  "https://portainer.example.com/api/endpoints/1/docker/containers/create?name=my-app" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Image": "your-app:latest",
    "HostConfig": {
      "Devices": [
        {
          "PathOnHost": "/dev/ttyUSB0",
          "PathInContainer": "/dev/ttyUSB0",
          "CgroupPermissions": "rwm"
        }
      ]
    }
  }' | jq -r .Id)

# Start the container
curl -s -X POST \
  "https://portainer.example.com/api/endpoints/1/docker/containers/${CONTAINER_ID}/start" \
  -H "Authorization: Bearer $TOKEN"
```

## Conclusion

Understanding how to Map Host Devices (USB, Serial) to Containers in Portainer gives you a straightforward way to expose hardware such as USB-to-serial adapters to your workloads. Portainer's visual interface makes these mappings accessible to team members who may not be comfortable with the Docker CLI, while Docker inspect and the Portainer API give you reliable ways to verify the resulting configuration.
