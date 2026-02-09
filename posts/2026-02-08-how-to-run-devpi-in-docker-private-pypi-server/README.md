# How to Run Devpi in Docker (Private PyPI Server)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Devpi, PyPI, Python, Package Registry, Docker Compose, pip

Description: Deploy Devpi in Docker as a private PyPI server for hosting internal Python packages and caching public ones

---

Devpi is a private PyPI server and caching proxy for Python packages. It serves two roles: hosting your organization's internal Python packages and caching packages from the public PyPI. When pip installs a package through Devpi, the package gets stored locally. Future installs of the same version pull from the cache instantly, regardless of network conditions. This speeds up builds, provides resilience against PyPI outages, and gives you a place to publish internal packages. Docker makes deploying Devpi straightforward.

This guide covers deploying Devpi in Docker, publishing private packages, configuring pip and build tools, and setting up caching for faster installs.

## Quick Start

Run Devpi with minimal configuration:

```bash
# Start Devpi server on port 3141
docker run -d \
  --name devpi \
  -p 3141:3141 \
  -v devpi-data:/data \
  -e DEVPI_PASSWORD=admin_password \
  muccg/devpi:latest
```

The server starts with a `root` user and a `root/pypi` index that proxies to the public PyPI. Access the web interface at http://localhost:3141.

## Docker Compose Setup

For a production deployment:

```yaml
# docker-compose.yml - Devpi with persistent storage
version: "3.8"

services:
  devpi:
    image: muccg/devpi:latest
    container_name: devpi
    ports:
      - "3141:3141"
    volumes:
      - devpi-data:/data
    environment:
      - DEVPI_PASSWORD=admin_password
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3141/+api"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  devpi-data:
```

Start it:

```bash
# Launch Devpi
docker compose up -d

# Check the logs for startup confirmation
docker compose logs devpi
```

## Building a Custom Devpi Image

If the community image does not meet your needs, build your own:

```dockerfile
# Dockerfile - custom Devpi server
FROM python:3.12-slim

# Install devpi-server and devpi-web (the web interface)
RUN pip install --no-cache-dir \
    devpi-server \
    devpi-web \
    devpi-client

# Create data directory
RUN mkdir -p /data

# Initialize the server data directory
RUN devpi-init --serverdir /data

EXPOSE 3141

# Start devpi-server
CMD ["devpi-server", \
     "--serverdir", "/data", \
     "--host", "0.0.0.0", \
     "--port", "3141"]
```

Build and run:

```bash
# Build custom Devpi image
docker build -t devpi-custom .

docker run -d \
  --name devpi \
  -p 3141:3141 \
  -v devpi-data:/data \
  devpi-custom
```

## Initial Configuration

After starting Devpi, set up users and indexes using the devpi client:

```bash
# Install the devpi client on your host
pip install devpi-client

# Connect to the server
devpi use http://localhost:3141

# Log in as root
devpi login root --password admin_password

# Create a user for your team
devpi user -c myteam password=teampassword email=team@example.com

# Log in as the new user
devpi login myteam --password teampassword

# Create an index that inherits from root/pypi (public PyPI proxy)
devpi index -c myteam/stable bases=root/pypi volatile=False

# Create a dev index for pre-release packages
devpi index -c myteam/dev bases=myteam/stable volatile=True
```

The index hierarchy works like this: when pip asks `myteam/stable` for a package, it first checks the local index. If the package is not there, it falls back to `root/pypi`, which proxies to the public PyPI.

## Configuring pip to Use Devpi

Point pip at your Devpi server:

```bash
# Set the global pip index URL
pip config set global.index-url http://localhost:3141/myteam/stable/+simple/
pip config set global.trusted-host localhost
```

Or use a project-level `pip.conf`:

```ini
# pip.conf (Linux: ~/.config/pip/pip.conf, Mac: ~/Library/Application Support/pip/pip.conf)
[global]
index-url = http://localhost:3141/myteam/stable/+simple/
trusted-host = localhost
```

For a specific install command:

```bash
# Install a package through Devpi
pip install --index-url http://localhost:3141/myteam/stable/+simple/ \
  --trusted-host localhost \
  requests
```

## Publishing a Private Package

Create and publish an internal Python package:

```
# Package directory structure
my-internal-lib/
  pyproject.toml
  src/
    my_internal_lib/
      __init__.py
      utils.py
```

```toml
# pyproject.toml - package metadata
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "my-internal-lib"
version = "1.0.0"
description = "Internal utility library"
requires-python = ">=3.9"
dependencies = [
    "requests>=2.28",
]

[project.optional-dependencies]
dev = ["pytest", "black", "mypy"]
```

```python
# src/my_internal_lib/utils.py - example module
"""Internal utility functions for the team."""

import hashlib
import secrets


def generate_token(length=32):
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(length)


def hash_string(value, algorithm="sha256"):
    """Hash a string using the specified algorithm."""
    hasher = hashlib.new(algorithm)
    hasher.update(value.encode("utf-8"))
    return hasher.hexdigest()
```

Build and upload:

```bash
# Build the package
pip install build
python -m build

# Upload to Devpi using devpi-client
devpi use http://localhost:3141/myteam/stable
devpi login myteam --password teampassword
devpi upload dist/*
```

Or upload using twine:

```bash
# Upload with twine
pip install twine
twine upload --repository-url http://localhost:3141/myteam/stable/ \
  -u myteam -p teampassword \
  dist/*
```

## Installing Private Packages

Once published, install your private packages like any other:

```bash
# Install the private package through Devpi
pip install my-internal-lib

# It resolves dependencies from both the private index and public PyPI
pip install my-internal-lib[dev]
```

## Using in Requirements Files

Reference your Devpi server in requirements files:

```txt
# requirements.txt
--index-url http://localhost:3141/myteam/stable/+simple/
--trusted-host localhost

# Private packages
my-internal-lib==1.0.0

# Public packages (proxied through Devpi)
flask==3.0.0
requests==2.31.0
pandas==2.2.0
```

## Docker-in-Docker Builds

When building Python Docker images, use Devpi as the pip index:

```dockerfile
# Dockerfile - Python app using Devpi for package installation
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

# Install packages through Devpi (pass the URL as a build arg)
ARG PIP_INDEX_URL=http://devpi:3141/myteam/stable/+simple/
ARG PIP_TRUSTED_HOST=devpi
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python", "app.py"]
```

Build with the Devpi network:

```bash
# Build using Devpi for package caching
docker build \
  --build-arg PIP_INDEX_URL=http://devpi:3141/myteam/stable/+simple/ \
  --build-arg PIP_TRUSTED_HOST=devpi \
  --network=host \
  -t my-app .
```

## CI/CD Integration

Use Devpi in CI pipelines for faster, reliable builds:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      devpi:
        image: muccg/devpi:latest
        ports:
          - 3141:3141
        env:
          DEVPI_PASSWORD: ci_password
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies through Devpi
        run: |
          pip install --index-url http://localhost:3141/root/pypi/+simple/ \
            --trusted-host localhost \
            -r requirements.txt

      - name: Run tests
        run: pytest tests/
```

## Monitoring and Maintenance

Check server status and storage usage:

```bash
# View server status
curl http://localhost:3141/+status

# List all indexes
devpi use http://localhost:3141
devpi index -l

# List packages in an index
devpi list myteam/stable

# Check storage size
docker exec devpi du -sh /data
```

## Backup

Back up the Devpi data directory:

```bash
# Create a backup of all Devpi data
docker run --rm \
  -v devpi-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/devpi-backup-$(date +%Y%m%d).tar.gz /data
```

## Conclusion

Devpi in Docker provides a private PyPI server that makes Python package management better for your entire team. Internal packages get a proper home with versioning and access control. Public packages get cached locally for speed and reliability. The index inheritance model lets you layer private packages on top of the public PyPI seamlessly. Start with the Docker Compose setup, create team indexes, publish your first internal package, and configure pip across your team. The caching alone pays for the setup time on the first CI run.
