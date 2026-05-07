# How to Add Files to an Image with Buildah and Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildah, Image Building, File Management

Description: Learn how to add, copy, and manage files in container images using Buildah copy and add commands with Podman.

---

> Buildah provides precise control over how files are added to container images, including ownership, permissions, and archive extraction.

Adding files to container images is one of the most common tasks in container building. While a Containerfile offers `COPY` and `ADD` instructions, Buildah provides the same functionality through CLI commands with additional flexibility. You can copy individual files, directories, or archives, and control ownership and permissions at copy time. This guide covers all the ways to add files to images using Buildah.

---

## Prerequisites

```bash
# Ensure Buildah and Podman are installed

buildah --version
podman --version

# Create a working container from a base image
container=$(buildah from ubuntu:22.04)
echo "Working container: $container"
```

## Using buildah copy

### Copy a Single File

```bash
# Create a sample file to copy
echo "Hello from the host" > /tmp/greeting.txt

# Copy the file into the container
buildah copy $container /tmp/greeting.txt /opt/greeting.txt

# Verify the file was copied
buildah run $container -- cat /opt/greeting.txt
```

### Copy Multiple Files

```bash
# Create several files
echo "config_a=1" > /tmp/config_a.conf
echo "config_b=2" > /tmp/config_b.conf
echo "config_c=3" > /tmp/config_c.conf

# Copy multiple files to a directory (destination must end with /)
buildah copy $container /tmp/config_a.conf /tmp/config_b.conf /tmp/config_c.conf /etc/myapp/

# Verify all files were copied
buildah run $container -- ls -la /etc/myapp/
```

### Copy a Directory

```bash
# Create a sample application directory structure
mkdir -p /tmp/myapp/{src,config,static}
echo "print('hello')" > /tmp/myapp/src/main.py
echo "port=8080" > /tmp/myapp/config/settings.conf
echo "<h1>Hello</h1>" > /tmp/myapp/static/index.html

# Copy the entire directory into the container
buildah copy $container /tmp/myapp /opt/myapp

# Verify the directory structure was preserved
buildah run $container -- find /opt/myapp -type f
```

### Copy with Ownership

```bash
# Copy files and set the owner at the same time
# --chown user:group sets the ownership
buildah copy --chown 1000:1000 $container /tmp/greeting.txt /home/appuser/greeting.txt

# Verify ownership
buildah run $container -- ls -la /home/appuser/greeting.txt
# Should show owner as uid 1000

# Copy with a named user (user must exist in the container)
buildah run $container -- useradd -m appuser
buildah copy --chown appuser:appuser $container /tmp/myapp /home/appuser/app

# Verify
buildah run $container -- ls -la /home/appuser/app/
```

### Copy with Permissions

```bash
# Copy a script and set executable permissions
cat << 'EOF' > /tmp/startup.sh
#!/bin/bash
echo "Application starting..."
exec python3 /opt/app/main.py
EOF

# Copy with specific permissions using --chmod
buildah copy --chmod 755 $container /tmp/startup.sh /usr/local/bin/startup.sh

# Verify the permissions
buildah run $container -- ls -la /usr/local/bin/startup.sh
```

## Using buildah add

The `buildah add` command works like `buildah copy` but with archive extraction for local archive files. Both commands can also fetch files from URLs.

### Add and Extract a Tar Archive

```bash
# Create a tar archive
mkdir -p /tmp/archive-content
echo "file1" > /tmp/archive-content/file1.txt
echo "file2" > /tmp/archive-content/file2.txt
tar czf /tmp/app-data.tar.gz -C /tmp/archive-content .

# Add the archive to the container (it will be automatically extracted)
buildah add $container /tmp/app-data.tar.gz /opt/data/

# Verify the archive was extracted
buildah run $container -- ls -la /opt/data/
# Should show file1.txt and file2.txt, not the tar.gz
```

### Add from a URL

```bash
# Download a file directly into the container from a URL
buildah add $container \
  https://raw.githubusercontent.com/containers/buildah/main/README.md \
  /opt/docs/buildah-readme.md

# Verify the downloaded file
buildah run $container -- head -5 /opt/docs/buildah-readme.md
```

## Working with .containerignore Files

```bash
# Create a project with files you want to exclude
mkdir -p /tmp/project
echo "source code" > /tmp/project/app.py
echo "SECRET_KEY=abc123" > /tmp/project/.env
echo "*.pyc" > /tmp/project/.containerignore
echo ".env" >> /tmp/project/.containerignore
echo "__pycache__" >> /tmp/project/.containerignore
echo ".git" >> /tmp/project/.containerignore

# When using buildah copy with a context directory,
# the .containerignore file in that context is respected
# Copy the project excluding ignored files
buildah copy --contextdir /tmp/project $container . /opt/project

# Verify that .env was not copied
buildah run $container -- ls -la /opt/project/
# .env should not appear in the listing
```

## Copying from Other Images

```bash
# Copy files from another container image
# First, create a source container
source_container=$(buildah from alpine:3.19)
buildah run $source_container -- apk add --no-cache curl
buildah run $source_container -- sh -c "which curl"

# Copy the curl binary from the Alpine container to our Ubuntu container
buildah copy --from $source_container $container /usr/bin/curl /usr/local/bin/curl-from-alpine

# Verify the copied binary
buildah run $container -- ls -la /usr/local/bin/curl-from-alpine

# Clean up the source container
buildah rm $source_container
```

## Practical Example: Building a Web Application

```bash
# Start fresh
buildah rm $container 2>/dev/null
container=$(buildah from python:3.12-slim)

# Create the application structure
mkdir -p /tmp/webapp/{static,templates}

cat << 'EOF' > /tmp/webapp/requirements.txt
flask==3.0.0
gunicorn==21.2.0
EOF

cat << 'EOF' > /tmp/webapp/app.py
from flask import Flask, render_template_string
app = Flask(__name__)

@app.route("/")
def home():
    return "<h1>Built with Buildah</h1>"
EOF

echo "body { font-family: sans-serif; }" > /tmp/webapp/static/style.css

cat << 'EOF' > /tmp/webapp/entrypoint.sh
#!/bin/bash
exec gunicorn --bind 0.0.0.0:5000 app:app
EOF

# Copy files with appropriate ownership and permissions
buildah copy --chown 1000:1000 $container /tmp/webapp/requirements.txt /app/requirements.txt
buildah run $container -- pip install --no-cache-dir -r /app/requirements.txt
buildah copy --chown 1000:1000 $container /tmp/webapp/app.py /app/app.py
buildah copy --chown 1000:1000 $container /tmp/webapp/static /app/static
buildah copy --chmod 755 --chown 1000:1000 $container /tmp/webapp/entrypoint.sh /app/entrypoint.sh

# Configure and commit
buildah config --workingdir /app $container
buildah config --port 5000 $container
buildah config --entrypoint '["/app/entrypoint.sh"]' $container
buildah commit $container webapp:latest

# Test with Podman
podman run -d --name webapp-test -p 5000:5000 webapp:latest
curl http://localhost:5000

# Clean up
podman stop webapp-test && podman rm webapp-test
buildah rm $container
```

## Cleaning Up

```bash
# Remove all working containers
buildah rm --all

# Remove test images
podman rmi webapp:latest 2>/dev/null

# Clean up temp files
rm -rf /tmp/greeting.txt /tmp/config_*.conf /tmp/myapp /tmp/startup.sh \
  /tmp/archive-content /tmp/app-data.tar.gz /tmp/project /tmp/webapp
```

## Summary

Buildah provides flexible file management commands for building container images. The `buildah copy` command handles individual files, directories, and multiple files with support for setting ownership and permissions at copy time. The `buildah add` command extends this with automatic archive extraction and URL fetching. Using these commands with Podman for running the final images gives you complete control over what goes into your containers and how files are organized within them.
