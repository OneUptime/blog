# How to Run Nexus Repository Manager in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Nexus, Repository Manager, Artifact Management, DevOps, Docker Compose, Maven

Description: Deploy Sonatype Nexus Repository Manager in Docker for managing build artifacts and package repositories

---

Sonatype Nexus Repository Manager is a universal artifact repository that supports Maven, npm, PyPI, Docker, NuGet, and many other package formats. It acts as a proxy cache for public registries and hosts your private packages. Running Nexus in Docker simplifies deployment and makes it easy to back up and migrate your artifact storage. A single Nexus instance can replace separate registries for each package format, giving your team one place to manage all dependencies.

This guide covers deploying Nexus in Docker, configuring repositories for different formats, setting up Docker registry hosting, and integrating with build tools.

## Quick Start

Get Nexus running with a single command:

```bash
# Start Nexus Repository Manager OSS
docker run -d \
  --name nexus \
  -p 8081:8081 \
  -v nexus-data:/nexus-data \
  sonatype/nexus3:3.72.0
```

Nexus takes 2-3 minutes to start up. Monitor the logs:

```bash
# Wait for "Started Sonatype Nexus" in the logs
docker logs -f nexus
```

Access the web UI at http://localhost:8081. The default admin password is stored in a file:

```bash
# Retrieve the initial admin password
docker exec nexus cat /nexus-data/admin.password
```

Log in with username `admin` and the retrieved password. Nexus will prompt you to change it.

## Production Setup with Docker Compose

For production use, configure proper resource limits and persistent storage:

```yaml
# docker-compose.yml - Nexus Repository Manager production deployment
version: "3.8"

services:
  nexus:
    image: sonatype/nexus3:3.72.0
    container_name: nexus
    ports:
      - "8081:8081"   # Web UI and API
      - "8082:8082"   # Docker hosted registry
      - "8083:8083"   # Docker proxy registry
    volumes:
      - nexus-data:/nexus-data
    environment:
      # JVM memory settings - adjust based on available RAM
      - INSTALL4J_ADD_VM_PARAMS=-Xms1g -Xmx2g -XX:MaxDirectMemorySize=2g
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/service/rest/v1/status"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s

volumes:
  nexus-data:
```

Start it:

```bash
# Launch Nexus
docker compose up -d
```

## Setting Up a Maven Proxy Repository

Nexus comes with Maven Central proxy pre-configured. To add additional Maven repositories, use the REST API:

```bash
# Create a proxy repository for JBoss Maven
curl -u admin:yourpassword -X POST \
  http://localhost:8081/service/rest/v1/repositories/maven/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "name": "jboss-releases",
    "online": true,
    "storage": {
      "blobStoreName": "default",
      "strictContentTypeValidation": true
    },
    "proxy": {
      "remoteUrl": "https://repository.jboss.org/nexus/content/repositories/releases/",
      "contentMaxAge": 1440,
      "metadataMaxAge": 1440
    },
    "maven": {
      "versionPolicy": "RELEASE",
      "layoutPolicy": "STRICT"
    },
    "httpClient": {
      "autoBlock": true
    },
    "negativeCache": {
      "enabled": true,
      "timeToLive": 1440
    }
  }'
```

## Configuring Maven to Use Nexus

Point your Maven builds at Nexus by updating `settings.xml`:

```xml
<!-- ~/.m2/settings.xml - configure Maven to use Nexus -->
<settings>
  <mirrors>
    <mirror>
      <!-- Route all Maven requests through Nexus -->
      <id>nexus</id>
      <mirrorOf>*</mirrorOf>
      <url>http://localhost:8081/repository/maven-public/</url>
    </mirror>
  </mirrors>
  <servers>
    <server>
      <!-- Credentials for publishing artifacts -->
      <id>nexus-releases</id>
      <username>admin</username>
      <password>yourpassword</password>
    </server>
    <server>
      <id>nexus-snapshots</id>
      <username>admin</username>
      <password>yourpassword</password>
    </server>
  </servers>
</settings>
```

## Setting Up npm Registry

Create an npm proxy to cache packages from the public registry and host private packages:

```bash
# Create an npm proxy repository
curl -u admin:yourpassword -X POST \
  http://localhost:8081/service/rest/v1/repositories/npm/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "name": "npm-proxy",
    "online": true,
    "storage": {
      "blobStoreName": "default",
      "strictContentTypeValidation": true
    },
    "proxy": {
      "remoteUrl": "https://registry.npmjs.org",
      "contentMaxAge": 1440,
      "metadataMaxAge": 1440
    },
    "httpClient": {
      "autoBlock": true
    },
    "negativeCache": {
      "enabled": true,
      "timeToLive": 1440
    }
  }'
```

Configure npm to use Nexus:

```bash
# Point npm at your Nexus instance
npm config set registry http://localhost:8081/repository/npm-proxy/

# Authenticate for publishing
npm login --registry=http://localhost:8081/repository/npm-hosted/
```

## Docker Registry in Nexus

Nexus can serve as a Docker registry. You need to create a hosted repository and configure a dedicated port:

```bash
# Create a Docker hosted repository via the API
curl -u admin:yourpassword -X POST \
  http://localhost:8081/service/rest/v1/repositories/docker/hosted \
  -H "Content-Type: application/json" \
  -d '{
    "name": "docker-hosted",
    "online": true,
    "storage": {
      "blobStoreName": "default",
      "strictContentTypeValidation": true,
      "writePolicy": "ALLOW"
    },
    "docker": {
      "v1Enabled": false,
      "forceBasicAuth": true,
      "httpPort": 8082
    }
  }'
```

Use the Docker registry:

```bash
# Log in to the Nexus Docker registry
docker login localhost:8082 -u admin -p yourpassword

# Tag and push an image
docker tag myapp:latest localhost:8082/myapp:latest
docker push localhost:8082/myapp:latest

# Pull an image
docker pull localhost:8082/myapp:latest
```

## PyPI Repository

Set up a Python package repository:

```bash
# Create a PyPI proxy repository
curl -u admin:yourpassword -X POST \
  http://localhost:8081/service/rest/v1/repositories/pypi/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pypi-proxy",
    "online": true,
    "storage": {
      "blobStoreName": "default",
      "strictContentTypeValidation": true
    },
    "proxy": {
      "remoteUrl": "https://pypi.org",
      "contentMaxAge": 1440,
      "metadataMaxAge": 1440
    }
  }'
```

Configure pip:

```bash
# Install packages through Nexus
pip install --index-url http://localhost:8081/repository/pypi-proxy/simple/ \
  --trusted-host localhost \
  requests
```

## Cleanup Policies

Prevent your storage from growing indefinitely by configuring cleanup policies:

```bash
# Create a cleanup policy to remove old snapshots
curl -u admin:yourpassword -X POST \
  http://localhost:8081/service/rest/v1/lifecycle/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "delete-old-snapshots",
    "format": "maven2",
    "notes": "Remove snapshots older than 30 days",
    "criteria": {
      "lastDownloaded": 30,
      "lastBlobUpdated": 30
    }
  }'
```

Schedule a compact task to reclaim disk space after cleanup runs. You can do this through the admin UI under System > Tasks.

## Backup

Back up Nexus data regularly:

```bash
# Create a backup of the Nexus data volume
docker run --rm \
  -v nexus-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/nexus-backup-$(date +%Y%m%d).tar.gz /data

# Alternatively, use Nexus's built-in database backup task
# Configure it through Admin > System > Tasks > Create task > Admin - Export databases
```

## Monitoring

Check Nexus health and status:

```bash
# System health check
curl -s http://localhost:8081/service/rest/v1/status | python3 -m json.tool

# Check available disk space
curl -u admin:yourpassword \
  http://localhost:8081/service/rest/v1/status/check
```

## Conclusion

Nexus Repository Manager in Docker provides a centralized artifact management solution for your entire development stack. A single instance handles Maven, npm, PyPI, Docker, and more. The proxy feature caches packages from public registries, speeding up builds and providing resilience against registry outages. Start with the repositories your team uses most, configure build tools to point at Nexus, and expand to additional formats as needed. The cleanup policies keep storage manageable, and regular backups protect your private packages.
