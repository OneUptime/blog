# How to Fix the 5-Minute Admin Timeout in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Self-Hosted, Security

Description: Learn why Portainer locks itself after 5 minutes without admin account creation and how to properly reset or bypass this timeout.

## Introduction

When you first install Portainer, you have exactly 5 minutes to navigate to the UI and create an admin account. If that window expires, Portainer displays an error and stops the Portainer service until the container is restarted. This security feature prevents unauthorized users from claiming your uninitialized instance - but it can catch new users off guard.

## What Happens After the Timeout

After 5 minutes without initialization:
- You may see the error: *"Your Portainer instance timed out for security purposes."*
- The container can continue running, but the Portainer service inside it stops until you restart the container
- Restarting the container gives you another 5-minute window to complete the initial setup

## Method 1: Reset via --admin-password Flag (Recommended)

The cleanest approach is to provide the admin password at startup using a bcrypt hash:

```bash
# Stop and remove the existing container (keep or remove the volume)

docker stop portainer
docker rm portainer

# Option A: Inline bcrypt hash (less secure, visible in shell history and process arguments)
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --admin-password='$2y$05$8qOfvkl7D4FtcC/eCIbVGeFNQtYjC6.gg5bflnEsOxOinqPgXHzaC'

# The hash above is an example only - generate your own:
# docker run --rm httpd:2.4-alpine htpasswd -nbB admin "your-password" | cut -d ':' -f 2

# Option B: Hash in a shell variable
HASHED_PASS=$(docker run --rm httpd:2.4-alpine htpasswd -nbB admin "your-password" | cut -d ':' -f 2)

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --admin-password="$HASHED_PASS"
```

## Method 2: Reset by Removing the Data Volume

If you haven't configured anything in Portainer yet and want a full reset:

```bash
# Stop the timed-out container
docker stop portainer
docker rm portainer

# Remove the old data volume
docker volume rm portainer_data

# Start fresh - you'll have a new 5-minute window
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Navigate to https://your-host:9443 IMMEDIATELY
```

## Method 3: Delete the portainer.db File

If you want to fully reset Portainer from inside the data volume instead of removing the whole volume:

```bash
# Stop Portainer before modifying the database
docker stop portainer

# Access the Portainer data volume
docker run --rm -it \
  -v portainer_data:/data \
  alpine:latest \
  sh -c "ls -la /data/"

# The portainer.db file stores Portainer's configuration
docker run --rm \
  -v portainer_data:/data \
  alpine:latest \
  rm /data/portainer.db

# Start Portainer - you'll have a fresh 5-minute window
docker start portainer
```

> **Warning**: Removing `portainer.db` deletes all Portainer configuration (environments, users, stacks metadata). Backed-up stacks and containers are unaffected.

## Method 4: Use --admin-password-file Flag

For more secure password handling:

```bash
# Create a plaintext password file
echo -n "yourpassword" > /tmp/portainer-password
chmod 600 /tmp/portainer-password

# Start Portainer with the password file
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /tmp/portainer-password:/tmp/portainer-password:ro \
  portainer/portainer-ce:latest \
  --admin-password-file=/tmp/portainer-password
```

## Preventing Future Timeouts

Use an automation script that starts Portainer AND immediately sets up the admin account:

```bash
#!/bin/bash
# deploy-portainer.sh

# Assumes /tmp/portainer-password already exists and contains the plaintext password

# Start Portainer
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /tmp/portainer-password:/tmp/portainer-password:ro \
  portainer/portainer-ce:latest \
  --admin-password-file=/tmp/portainer-password

echo "Portainer started. Admin account configured via password file."
echo "Access: https://$(hostname -I | awk '{print $1}'):9443"
```

## Using Docker Compose

In a compose file, you can avoid the timeout entirely:

```yaml
services:
  portainer:
    container_name: portainer
    image: portainer/portainer-ce:latest
    command: >
      --admin-password=$$2y$$05$$8qOfvkl7D4FtcC/eCIbVGeFNQtYjC6.gg5bflnEsOxOinqPgXHzaC
    restart: always
    ports:
      - 9443:9443
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    # Note: Double $$ to escape in compose files

volumes:
  portainer_data:
```

## Conclusion

The 5-minute initialization timeout is a security feature, not a bug. The cleanest way to handle it is to use the `--admin-password` or `--admin-password-file` flag at startup, which configures the admin account before anyone can navigate to the UI. For a fresh installation that has already timed out, restarting the container is the quickest recovery path. If a previously working installation suddenly shows the timeout message, verify that your `portainer_data` volume is still mounted and intact.
