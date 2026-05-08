# How to Copy Files Between Host and Container with podman cp

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, File Management, Container Operations

Description: Learn how to copy files and directories between your host machine and Podman containers using the podman cp command in both directions.

---

> podman cp bridges the gap between host and container filesystems, making file transfers simple and direct.

Transferring files between your host machine and running containers is a common task. Whether you need to deploy a configuration file, extract logs, or inject test data, `podman cp` handles it. This guide covers copying in both directions with practical examples.

---

## Copying Files from Host to Container

The basic syntax follows the pattern `podman cp <source> <container>:<destination>`:

```bash
# Start a test container

podman run -d --name my-app nginx:latest

# Copy a single file into the container
cat > /tmp/server.conf << 'EOF'
server {
    listen 80;
    server_name example.com;
    root /usr/share/nginx/html;
}
EOF
podman cp /tmp/server.conf my-app:/etc/nginx/conf.d/server.conf

# Verify the file was copied
podman exec my-app cat /etc/nginx/conf.d/server.conf
```

## Copying Files from Container to Host

Reverse the source and destination:

```bash
# Copy a file from the container to the host
podman cp my-app:/etc/nginx/nginx.conf /tmp/nginx-backup.conf

# Verify
cat /tmp/nginx-backup.conf | head -5
```

## Copying Directories

Copy entire directories in either direction:

```bash
# Copy a directory from host to container
mkdir -p /tmp/html-content
echo "<h1>Hello</h1>" > /tmp/html-content/index.html
echo "<h1>About</h1>" > /tmp/html-content/about.html

podman cp /tmp/html-content/. my-app:/usr/share/nginx/html/

# Verify
podman exec my-app ls /usr/share/nginx/html/

# Copy a directory from container to host
podman cp my-app:/etc/nginx/ /tmp/nginx-config-backup/

# Verify
ls /tmp/nginx-config-backup/
```

## Important Path Behaviors

Understanding trailing slashes and dots:

```bash
# Copy directory contents (note the /. at the end)
podman cp /tmp/html-content/. my-app:/usr/share/nginx/html/
# This copies the CONTENTS of html-content into html/

# Copy the directory itself
podman cp /tmp/html-content my-app:/tmp/
# This creates /tmp/html-content/ inside the container

# Verify the difference
podman exec my-app ls /tmp/html-content/
```

## Copying Multiple Files

Copy several files using a loop or tar:

```bash
# Using a loop
for file in /tmp/html-content/*; do
    podman cp "$file" my-app:/usr/share/nginx/html/
done

# Using tar to copy multiple files at once
tar cf - -C /tmp/html-content . | podman exec -i my-app tar xf - -C /usr/share/nginx/html/
```

## Practical Use Cases

### Deploying Configuration Files

```bash
# Create a custom nginx config
cat > /tmp/custom-nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    location / {
        root /usr/share/nginx/html;
        index index.html;
    }
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Deploy it to the container
podman cp /tmp/custom-nginx.conf my-app:/etc/nginx/conf.d/default.conf

# Reload nginx to apply
podman exec my-app nginx -s reload
```

### Extracting Logs

```bash
# For the official nginx image, logs are linked to stdout and stderr
podman logs my-app > /tmp/nginx.log 2>&1

# For containers that write regular log files, copy the log directory
# podman cp my-app:/var/log/nginx /tmp/nginx-logs/
```

### Injecting Test Data

```bash
# Create test data
cat > /tmp/test-data.json << 'EOF'
{"users": [{"name": "Alice"}, {"name": "Bob"}]}
EOF

# Copy it into the container
podman cp /tmp/test-data.json my-app:/tmp/test-data.json

# Use it inside the container
podman exec my-app cat /tmp/test-data.json
```

### Database Backup and Restore

```bash
# Start a PostgreSQL container
podman run -d --name my-db -e POSTGRES_PASSWORD=secret postgres:latest
sleep 5

# Create a backup on the host from a command running inside the container
podman exec my-db pg_dumpall -U postgres > /tmp/db-backup.sql 2>/dev/null

# Alternative approach using tee
podman exec my-db pg_dumpall -U postgres 2>/dev/null | tee /tmp/db-backup.sql > /dev/null

# Copy a backup file into the container for restore
# podman cp /tmp/db-backup.sql my-db:/tmp/restore.sql
# podman exec my-db psql -U postgres -f /tmp/restore.sql
```

## Preserving File Permissions

```bash
# Create a file with specific permissions
echo "#!/bin/bash" > /tmp/my-script.sh
echo "echo 'Hello from script'" >> /tmp/my-script.sh
chmod 755 /tmp/my-script.sh

# Copy it (permissions are preserved)
podman cp /tmp/my-script.sh my-app:/tmp/my-script.sh

# Verify permissions
podman exec my-app ls -la /tmp/my-script.sh
podman exec my-app /tmp/my-script.sh
```

## Error Handling

```bash
# Handle missing source files
podman cp /nonexistent my-app:/tmp/ 2>&1 || echo "Source file not found"

# Handle missing destination directory
podman cp /tmp/server.conf my-app:/nonexistent/path/ 2>&1 || echo "Destination not found"

# Verify copy was successful
if podman cp /tmp/server.conf my-app:/tmp/server.conf 2>/dev/null; then
    echo "Copy successful"
else
    echo "Copy failed"
fi
```

## Cleanup

```bash
podman stop my-app my-db 2>/dev/null
podman rm my-app my-db 2>/dev/null
rm -rf /tmp/server.conf /tmp/html-content /tmp/custom-nginx.conf /tmp/nginx-*.conf /tmp/nginx.log /tmp/nginx-config-backup /tmp/nginx-logs /tmp/test-data.json /tmp/db-backup.sql /tmp/my-script.sh
```

## Summary

The `podman cp` command copies files and directories between host and container in both directions. Use `source destination` format where the container path includes the container name followed by a colon. Pay attention to trailing slashes for directory copies. This command works on both running and stopped containers.
