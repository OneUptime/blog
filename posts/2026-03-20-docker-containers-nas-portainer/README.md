# How to Manage Docker Containers on a NAS with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, NAS, Docker, Container Management, Self-Hosted, Home Lab

Description: Use Portainer to manage Docker containers on any NAS device, covering container lifecycle management, volume management, and log inspection.

## Introduction

Many NAS devices from Synology, QNAP, ASUSTOR, and others can run Docker containers, but their native management interfaces are limited. Portainer provides a consistent, powerful management layer that works across many NAS platforms. This guide covers the day-to-day container management tasks you'll perform most often.

## Accessing Your NAS via Portainer

After installing Portainer on your NAS (see platform-specific guides), access it at `https://<nas-ip>:9443` by default. If you explicitly exposed Portainer's legacy HTTP port during installation, you can also use `http://<nas-ip>:9000`. The home screen shows your Docker environment with a summary of running containers, volumes, images, and networks.

## Managing the Container Lifecycle

### Starting and Stopping Containers

In the **Containers** list:

- Click the **Start** button (▶) to start a stopped container
- Click **Stop** (■) to gracefully stop a running container
- Click **Restart** (↺) to restart a container
- Click **Kill** for a forced stop (use only when stop hangs)

### Creating a New Container

1. Click **Add container**
2. Fill in:
   - **Name**: e.g., `my-app`
   - **Image**: e.g., `nginx:alpine`
   - **Manual network port publishing**: Add port mappings
3. Under **Advanced container settings**:
   - **Volumes**: Add volume mounts
   - **Env**: Set environment variables
   - **Restart policy**: Set to `Unless stopped`
4. Click **Deploy the container**

### Creating Containers with Docker Compose (Stacks)

For multi-container applications, use **Stacks**:

```yaml
services:
  # Example: WordPress on NAS
  wordpress:
    image: wordpress:latest
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: mariadb
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: secure_password
      WORDPRESS_DB_NAME: wordpress
    volumes:
      # Store WordPress files on a NAS directory
      - /path/on/your/nas/wordpress:/var/www/html
    restart: unless-stopped

  mariadb:
    image: mariadb:10.11
    environment:
      MARIADB_DATABASE: wordpress
      MARIADB_USER: wordpress
      MARIADB_PASSWORD: secure_password
      MARIADB_ROOT_PASSWORD: root_secure_password
    volumes:
      # Store database on a NAS directory
      - /path/on/your/nas/wordpress-db:/var/lib/mysql
    restart: unless-stopped
```

## Volume Management

### Creating Named Volumes

1. Navigate to **Volumes > Add volume**
2. Enter a name and select driver `local`
3. Click **Create the volume**

### Binding to NAS Directories

For NAS users, binding to the NAS filesystem is often preferred for easy access to files:

```yaml
volumes:
  # Bind mount to a NAS share
  - /path/on/your/nas/media:/media
  # Bind mount to an app config directory on your NAS
  - /path/on/your/nas/appname:/config
```

### Inspecting Volume Usage

In Portainer, review the volume details and whether the volume is marked `unused` before deleting it. For external volumes, Portainer may have limited usage information.

## Viewing Logs

Navigate to **Containers**, click on a container name, then click **Logs**:

- Use the **Auto-refresh** toggle to stream live logs
- Use the **Lines** field to control how many lines to show
- Click **Copy** to copy logs to clipboard
- Filter logs by typing in the search box

```bash
# Equivalent Docker CLI command

docker logs --tail 100 --follow <container-name>
```

## Monitoring Resource Usage

Navigate to **Containers** and click on a container, then **Stats** to see:

- CPU usage percentage
- Memory usage and limit
- Network I/O (bytes in/out)
- Disk I/O (read/write)

For NAS devices with limited RAM, monitor memory usage carefully to avoid the NAS running out of memory.

## Container Console Access

Click on a container, then **Console** to open an interactive terminal:

- Select the shell: `/bin/bash`, `/bin/sh`, `/bin/ash`, or custom
- Click **Connect**

This is equivalent to `docker exec -it <container> /bin/sh` (or whichever shell you selected).

## Network Management

### Creating Custom Networks

1. Navigate to **Networks > Add network**
2. Set name and driver (`bridge` for most NAS use cases)
3. Optionally set a custom subnet

### Isolating Containers

Best practice for NAS deployments: create separate networks for each application stack:

```yaml
networks:
  # Isolated network for this app's containers
  app-network:
    driver: bridge
    internal: false  # Set to true to block internet access
```

## Image Management

### Pulling New Images

1. Navigate to **Images > Pull image**
2. Enter the image name and tag
3. Click **Pull the image**

### Cleaning Up Old Images

```bash
# Remove unused images via Portainer or CLI
docker image prune -a
```

In Portainer: **Images** > select unused images > **Remove**

## NAS-Specific Tips

### Using NAS Shares as Volumes

Map NAS shared folders directly:

```yaml
volumes:
  - /path/on/your/nas/media:/media:ro   # Read-only media library
  - /path/on/your/nas/config:/config    # Config files (read-write)
  - /path/on/your/nas/downloads:/downloads  # Download directory
```

Resource Limits for NAS Containers

NAS devices often have limited resources. If you're deploying a stack in Portainer, you can declare limits in the Compose file:

```yaml
services:
  myapp:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'       # Maximum 50% of one CPU
          memory: 512M       # Maximum 512MB RAM
        reservations:
          memory: 128M       # Minimum guaranteed RAM
```

## Conclusion

Portainer provides a consistent, powerful interface for managing Docker containers on a NAS device running Docker. From container lifecycle management to log inspection and resource monitoring, Portainer covers all the day-to-day tasks that NAS users need. Using NAS directories as bind mounts keeps your application data accessible through the NAS filesystem and included in your existing backup jobs.
