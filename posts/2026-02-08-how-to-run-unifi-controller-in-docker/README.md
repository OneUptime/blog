# How to Run Unifi Controller in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Unifi, Networking, Docker Compose, Home Lab, Ubiquiti, Network Management

Description: Deploy the Unifi Network Controller in Docker to manage your Ubiquiti access points, switches, and gateways from a containerized setup.

---

Managing Ubiquiti networking gear requires the Unifi Network Controller software. Instead of installing it directly on a server or buying a Cloud Key, you can run the controller inside a Docker container. This keeps your host system clean, makes upgrades painless, and lets you back up the entire configuration by snapshotting a volume.

This guide covers deploying the Unifi Controller with Docker Compose, adopting devices, handling the tricky networking requirements, and maintaining the setup over time.

## Why Run the Unifi Controller in Docker

The Unifi Controller is a Java application with specific dependencies. Installing it natively means dealing with Java versions, MongoDB compatibility, and system-level package conflicts. Docker packages all of that into a single image. You get consistent behavior regardless of your host OS, and rolling back a bad upgrade is as simple as changing the image tag.

The controller manages your entire Ubiquiti network from a single web interface. Access points, switches, security gateways, and cameras all report to it. Running it in Docker does not change any of that functionality.

## Prerequisites

Before you start, make sure you have the following ready:

- Docker and Docker Compose installed on a Linux host (Ubuntu or Debian work best)
- At least 2 GB of RAM available for the controller
- A static IP address on the host machine, or a reliable DHCP reservation
- Your Ubiquiti devices on the same Layer 2 network, or proper Layer 3 adoption configured

```bash
# Verify Docker is installed and running
docker --version
docker compose version
```

## Docker Compose Configuration

The most popular community-maintained image comes from linuxserver.io. It bundles MongoDB and the Unifi Controller into a well-maintained package.

```yaml
# docker-compose.yml - Unifi Network Controller
version: "3.8"

services:
  unifi-controller:
    image: lscr.io/linuxserver/unifi-network-application:latest
    container_name: unifi-controller
    restart: unless-stopped
    environment:
      # Set your local timezone
      TZ: America/New_York
      # User and group IDs to match the host user
      PUID: 1000
      PGID: 1000
      # MongoDB connection details
      MONGO_USER: unifi
      MONGO_PASS: ${MONGO_PASSWORD}
      MONGO_HOST: unifi-mongo
      MONGO_PORT: 27017
      MONGO_DBNAME: unifi
    volumes:
      # Persist controller configuration and data
      - unifi-config:/config
    ports:
      # Web admin interface (HTTPS)
      - "8443:8443"
      # Device communication
      - "8080:8080"
      # STUN port for device discovery
      - "3478:3478/udp"
      # AP discovery (L2 adoption)
      - "10001:10001/udp"
      # Guest portal HTTPS
      - "8843:8843"
      # Guest portal HTTP
      - "8880:8880"
      # Throughput measurement
      - "6789:6789"
      # Device discovery broadcast
      - "1900:1900/udp"
    depends_on:
      - unifi-mongo

  unifi-mongo:
    image: mongo:4.4
    container_name: unifi-mongo
    restart: unless-stopped
    volumes:
      # Persist MongoDB data
      - unifi-mongo-data:/data/db
      # Init script to create the database user
      - ./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}

volumes:
  unifi-config:
  unifi-mongo-data:
```

Create the MongoDB initialization script that sets up the database user.

```javascript
// init-mongo.js - Create the unifi database and user on first run
db.getSiblingDB("unifi").createUser({
  user: "unifi",
  pwd: "your-mongo-password",
  roles: [{ role: "dbOwner", db: "unifi" }]
});

// Create the statistics database used by the controller
db.getSiblingDB("unifi_stat").createUser({
  user: "unifi",
  pwd: "your-mongo-password",
  roles: [{ role: "dbOwner", db: "unifi_stat" }]
});
```

Set up the environment file with your passwords.

```bash
# .env - Keep credentials out of the compose file
MONGO_PASSWORD=your-mongo-password
MONGO_ROOT_PASSWORD=your-root-mongo-password
```

Start the stack.

```bash
# Launch the controller and MongoDB
docker compose up -d

# Watch the logs to confirm startup completes
docker compose logs -f unifi-controller
```

The first startup takes a few minutes while the controller initializes its database. Once you see a message about the web interface being ready, navigate to `https://your-host-ip:8443` in your browser.

## Network Mode Considerations

The Unifi Controller needs to communicate with devices over several protocols. In a standard bridge network, Layer 2 discovery might not work. If your devices cannot find the controller automatically, you have two options.

The first option is using host networking. This gives the container direct access to the host network stack.

```yaml
# Alternative: use host networking for easier device discovery
services:
  unifi-controller:
    image: lscr.io/linuxserver/unifi-network-application:latest
    network_mode: host
    # Remove the ports section when using host networking
```

The second option is manual adoption via SSH. If you prefer keeping bridge networking, you can tell each device where the controller is by SSHing into the access point.

```bash
# SSH into the Unifi device (default credentials: ubnt/ubnt)
ssh ubnt@device-ip

# Set the inform URL to point to your Docker host
set-inform http://your-docker-host-ip:8080/inform
```

## Adopting Devices

After the controller is running, devices need to be adopted. New devices in the same Layer 2 network should appear automatically in the controller's device list. For devices that do not appear:

1. Verify the device can reach port 8080 on the Docker host
2. Check that UDP port 10001 is accessible for L2 discovery
3. Use the SSH method described above for manual adoption

```bash
# Test connectivity from another machine on the network
nc -zv your-docker-host-ip 8080
nc -zuv your-docker-host-ip 10001
```

If you are migrating from an existing controller, export a backup from the old controller and import it during the new setup wizard. All device adoptions transfer with the backup.

## Updating the Controller

Updating the Unifi Controller in Docker is straightforward. Always back up your configuration before upgrading.

```bash
# Step 1: Create a backup from the web UI or via the API
# Settings > System > Backup > Download Backup

# Step 2: Pull the latest image
docker compose pull

# Step 3: Recreate the container with the new image
docker compose up -d

# Step 4: Check the logs for any migration messages
docker compose logs -f unifi-controller
```

If something goes wrong, roll back by specifying the previous image tag.

```yaml
# Pin to a specific version if the latest breaks something
image: lscr.io/linuxserver/unifi-network-application:8.0.28
```

## Backup Strategy

The controller stores site configuration, device settings, network maps, and historical statistics. Losing this data means re-adopting and reconfiguring every device.

```bash
# Export a backup using the Unifi API
curl -k -X POST \
  -H "Content-Type: application/json" \
  -d '{"cmd":"backup"}' \
  "https://localhost:8443/api/s/default/cmd/backup"

# You can also automate backups by copying the config volume
docker run --rm \
  -v unifi-config:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/unifi-backup-$(date +%Y%m%d).tar.gz -C /source .
```

Schedule the volume backup with cron for daily snapshots.

```bash
# Add to crontab: run backup every day at 3 AM
0 3 * * * docker run --rm -v unifi-config:/source:ro -v /backups/unifi:/backup alpine tar czf /backup/unifi-$(date +\%Y\%m\%d).tar.gz -C /source .
```

## Resource Usage and Monitoring

The Unifi Controller with MongoDB uses around 1-1.5 GB of RAM for a typical home network with 10-20 devices. Monitor resource consumption to catch any memory leaks from the Java process.

```bash
# Check current resource usage
docker stats unifi-controller unifi-mongo --no-stream

# Set memory limits in the compose file if needed
```

You can add memory limits to prevent runaway usage.

```yaml
# Add resource limits to the controller service
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G
```

## Troubleshooting Common Issues

If devices show "Adopting" but never complete, the inform URL is likely wrong. Check it in the controller settings under Settings > System > Controller Configuration. The inform host should be the IP address of your Docker host, not the container's internal IP.

If the web interface is not loading, check that port 8443 is not blocked by a firewall and that the container started successfully.

```bash
# Check if the container is running and healthy
docker ps -a | grep unifi

# View recent log entries for errors
docker compose logs --tail 50 unifi-controller

# Verify the port is actually listening
ss -tlnp | grep 8443
```

## Summary

Running the Unifi Controller in Docker simplifies installation, upgrades, and backups. The main challenge is networking, since the controller relies on several ports and protocols for device communication. Use host networking if Layer 2 discovery is important to you, or use manual adoption via SSH if you prefer network isolation. Back up your configuration regularly, and pin your image version in production to avoid surprise upgrades.
