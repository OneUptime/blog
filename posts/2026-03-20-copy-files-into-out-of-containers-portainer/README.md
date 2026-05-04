# How to Copy Files Into and Out of Containers in Portainer - Into Out

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, File Management, DevOps, Container, Operation

Description: Use Portainer's file browser and Docker CLI to copy files into running containers and extract files from containers for debugging, configuration updates, and data export.

---

Sometimes you need to get files in or out of a running container - copy a configuration file, extract a log file, or update an asset. Portainer provides a built-in file browser for some operations, while `docker cp` is the primary tool for copying files.

## Method 1: Portainer's Built-in Volume Browser

For files stored in named Docker volumes, Portainer provides a built-in browser:

1. Go to **Volumes > [Volume Name]**
2. Click the **Browse** button
3. Browse the volume's filesystem
4. Use the upload, download, rename, and delete actions to manage files

The Volume Browser is available in both Community and Business Edition, but requires the Portainer Agent or a Docker Swarm deployment - it does not work on a local Docker endpoint without the agent. Note that this only browses the contents of named volumes, not the container's writable layer or arbitrary paths inside the container.

## Method 2: Docker cp (via Portainer Console or Host)

`docker cp` copies files between the host and container filesystem:

```bash
# Copy FROM container TO host

docker cp container_name:/path/inside/container /path/on/host

# Examples:
# Extract a log file from the container
docker cp webapp:/var/log/app/error.log ./error.log

# Extract the nginx configuration
docker cp nginx:/etc/nginx/nginx.conf ./nginx.conf

# Copy a directory out of the container
docker cp database:/var/backups ./database-backups/
```

```bash
# Copy FROM host TO container
docker cp /path/on/host container_name:/path/inside/container

# Examples:
# Update an app configuration without rebuilding
docker cp ./config.json webapp:/app/config.json

# Copy SSL certificates into a running nginx container
docker cp ./certs/ nginx:/etc/nginx/certs/

# Send a script into a container for one-time execution
docker cp ./fix-permissions.sh webapp:/tmp/fix-permissions.sh
docker exec webapp bash /tmp/fix-permissions.sh
```

## Method 3: Portainer Console

For smaller files, use the Portainer container console:

1. Open **Containers > [Container Name] > Console**
2. Use `cat` to view files
3. Use `echo` to create small files

```bash
# In the Portainer console
# View a configuration file
cat /app/config.json

# Create/update a small file
echo '{"debug": true, "logLevel": "verbose"}' > /app/config.json

# Download a file by encoding it (for environments without docker cp access)
base64 /app/config.json
# Copy the base64 output, decode it on your local machine
```

## Method 4: Volume Access

For files stored in named volumes, access them directly from the host:

```bash
# Named volumes are stored at /var/lib/docker/volumes/<volume-name>/_data/
ls /var/lib/docker/volumes/webapp-data/_data/

# Copy from volume (container can be stopped)
cp -r /var/lib/docker/volumes/webapp-data/_data/uploads ./uploads-backup

# Restore to volume
cp -r ./uploads-restore/* /var/lib/docker/volumes/webapp-data/_data/uploads/
```

## Use Cases

| Scenario | Recommended Method |
|----------|-------------------|
| Emergency config update | `docker cp` |
| Extract logs for debugging | `docker cp` |
| Browse named volume contents | Portainer Volume Browser |
| Update multiple files | Volume access |
| One-off script execution | Console + exec |

## Security Consideration

Copying files into containers bypasses the image build process and creates configuration drift - the container no longer matches its image. For persistent changes, rebuild the image or use volume mounts. Use direct file copying only for emergency fixes and debugging.

## Summary

Portainer's Volume Browser and `docker cp` provide practical ways to transfer files between the host and containers. For debugging and emergency fixes, these tools are invaluable. For production configuration management, prefer volume mounts or image rebuilds to maintain reproducibility.
