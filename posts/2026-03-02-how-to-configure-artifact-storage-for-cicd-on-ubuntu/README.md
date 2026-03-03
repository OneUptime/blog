# How to Configure Artifact Storage for CI/CD on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CI/CD, DevOps, Artifact Storage, Nexus

Description: Set up artifact storage for CI/CD pipelines on Ubuntu using Nexus Repository Manager or Gitea packages, configure Maven, npm, and Docker registry support, and integrate with build pipelines.

---

Every CI/CD pipeline eventually produces artifacts: compiled JARs, npm packages, Docker images, binary releases, test reports. Where those artifacts go matters. You can push to cloud registries, but for self-hosted teams a local artifact repository gives you faster downloads, private package storage, and full control over retention policies.

This guide covers setting up Sonatype Nexus Repository Manager (the most common self-hosted artifact repository) on Ubuntu, configuring it for Maven, npm, and Docker, and integrating it into build pipelines.

## Why a Dedicated Artifact Repository

Without a dedicated artifact server, teams often resort to:
- Uploading artifacts to cloud storage (S3, GCS) - works but lacks package-native features
- Storing in Git repositories - bad idea for binaries
- Re-downloading from public registries on every build - slow and vulnerable to upstream outages

A local Nexus instance provides:
- **Proxy repositories** - cache public Maven Central, npm registry, Docker Hub downloads locally
- **Hosted repositories** - store your own private packages
- **Group repositories** - combine proxy and hosted repos under a single URL
- **Docker registry** - serve as a private container registry

## Installing Nexus Repository Manager

Nexus requires Java 11 or 17 and at least 4GB RAM.

```bash
# Install Java 17
sudo apt update
sudo apt install -y openjdk-17-jdk

# Create dedicated nexus user
sudo useradd -r -m -s /bin/bash -d /opt/nexus-data nexus

# Download Nexus (check https://help.sonatype.com for latest version)
NEXUS_VERSION="3.76.1-01"
cd /tmp
wget "https://download.sonatype.com/nexus/3/nexus-${NEXUS_VERSION}-unix.tar.gz"

# Extract to /opt
sudo tar -xzf "nexus-${NEXUS_VERSION}-unix.tar.gz" -C /opt

# Create symlink for easier upgrades
sudo ln -s /opt/nexus-${NEXUS_VERSION} /opt/nexus

# Create data directory
sudo mkdir -p /opt/nexus-data
sudo chown -R nexus:nexus /opt/nexus /opt/nexus-data

# Set the run user
sudo nano /opt/nexus/bin/nexus.rc
```

Set:
```text
run_as_user="nexus"
```

Configure JVM memory settings:

```bash
sudo nano /opt/nexus/bin/nexus.vmoptions
```

```text
# JVM options for Nexus
-Xms2703m
-Xmx2703m
-XX:MaxDirectMemorySize=2703m
-XX:+UnlockDiagnosticVMOptions
-XX:+LogVMOutput
-XX:LogFile=../sonatype-work/nexus3/log/jvm.log
-XX:-OmitStackTraceInFastThrow
-Djava.net.preferIPv4Stack=true
-Dkaraf.home=.
-Dkaraf.base=.
-Dkaraf.etc=etc/karaf
-Djava.util.logging.config.file=etc/karaf/java.util.logging.properties
-Dkaraf.data=../sonatype-work/nexus3
-Dkaraf.log=../sonatype-work/nexus3/log
-Djava.io.tmpdir=../sonatype-work/nexus3/tmp
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=../sonatype-work/nexus3
-Dkaraf.startLocalConsole=false
```

### Create systemd Service

```bash
sudo nano /etc/systemd/system/nexus.service
```

```ini
[Unit]
Description=Sonatype Nexus Repository Manager
After=network.target

[Service]
Type=forking
User=nexus
Group=nexus
ExecStart=/opt/nexus/bin/nexus start
ExecStop=/opt/nexus/bin/nexus stop
ExecReload=/opt/nexus/bin/nexus restart
PIDFile=/opt/nexus/bin/nexus.pid
Restart=on-failure
RestartSec=10
TimeoutStartSec=300
TimeoutStopSec=120
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nexus

# Check status (Nexus takes 2-3 minutes to start)
sudo systemctl status nexus

# Monitor startup
sudo tail -f /opt/nexus-data/sonatype-work/nexus3/log/nexus.log

# Get initial admin password
cat /opt/nexus-data/sonatype-work/nexus3/admin.password
```

Nexus UI is available at `http://your-server:8081`. Log in with admin and the initial password.

## Configuring Nginx as Reverse Proxy

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/nexus
```

```nginx
# Nexus behind Nginx with SSL
server {
    listen 80;
    server_name nexus.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nexus.example.com;

    ssl_certificate     /etc/letsencrypt/live/nexus.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexus.example.com/privkey.pem;

    # Allow large artifact uploads (JARs, Docker layers)
    client_max_body_size 2000m;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Nexus requires this for repository operations
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}

# Docker registry on separate port
server {
    listen 5000 ssl;
    server_name nexus.example.com;

    ssl_certificate     /etc/letsencrypt/live/nexus.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexus.example.com/privkey.pem;

    # Docker pushes large image layers
    client_max_body_size 0;

    location / {
        proxy_pass http://127.0.0.1:8082;  # Nexus Docker registry port
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Setting Up Repository Types

Log into the Nexus UI at `https://nexus.example.com`. Navigate to **Administration > Repositories > Create repository**.

### Maven Repositories

Create three repositories:
1. **maven-proxy** (type: maven2, proxy) - proxies Maven Central, stores downloaded JARs locally
2. **maven-releases** (type: maven2, hosted) - for your released artifacts
3. **maven-snapshots** (type: maven2, hosted) - for snapshot builds
4. **maven-public** (type: maven2, group) - groups all three above

In your project's `pom.xml` or Maven `settings.xml`:

```xml
<!-- ~/.m2/settings.xml - configure Maven to use Nexus -->
<settings>
  <mirrors>
    <mirror>
      <id>nexus</id>
      <mirrorOf>*</mirrorOf>
      <url>https://nexus.example.com/repository/maven-public/</url>
    </mirror>
  </mirrors>

  <servers>
    <server>
      <id>nexus-releases</id>
      <username>deploy-user</username>
      <password>deploy-password</password>
    </server>
    <server>
      <id>nexus-snapshots</id>
      <username>deploy-user</username>
      <password>deploy-password</password>
    </server>
  </servers>
</settings>
```

```xml
<!-- pom.xml - distribution management for publishing -->
<distributionManagement>
  <repository>
    <id>nexus-releases</id>
    <url>https://nexus.example.com/repository/maven-releases/</url>
  </repository>
  <snapshotRepository>
    <id>nexus-snapshots</id>
    <url>https://nexus.example.com/repository/maven-snapshots/</url>
  </snapshotRepository>
</distributionManagement>
```

### npm Registry

Create an npm proxy repository (proxies registry.npmjs.org) and an npm hosted repository for private packages.

Configure npm to use Nexus:

```bash
# Configure npm to use Nexus as the registry
npm config set registry https://nexus.example.com/repository/npm-proxy/

# For authenticated operations (publishing private packages)
npm config set always-auth true
npm config set _auth $(echo -n 'deploy-user:deploy-password' | base64)

# Publish a private package to Nexus
npm publish --registry https://nexus.example.com/repository/npm-hosted/
```

In CI pipelines, set the npm registry:

```bash
# In CI scripts, configure npm before install
npm config set registry https://nexus.example.com/repository/npm-proxy/
npm ci
```

### Docker Registry

In Nexus, create a Docker hosted repository:
- Name: docker-hosted
- HTTP port: 8082 (this is proxied by Nginx on port 5000)
- Allow anonymous pull: optional

```bash
# Configure Docker to trust the Nexus registry
# If using self-signed cert, add it to Docker's trusted store
sudo mkdir -p /etc/docker/certs.d/nexus.example.com:5000

# Log into the Nexus Docker registry
docker login nexus.example.com:5000 -u deploy-user -p deploy-password

# Tag and push an image
docker tag myapp:latest nexus.example.com:5000/myapp:latest
docker push nexus.example.com:5000/myapp:latest

# Pull from Nexus
docker pull nexus.example.com:5000/myapp:latest
```

## Integrating with CI/CD Pipelines

### Jenkins Pipeline Integration

```groovy
// Jenkinsfile - publish to Nexus
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                // Maven uses Nexus via settings.xml
                sh 'mvn clean package -DskipTests'
            }
        }

        stage('Publish to Nexus') {
            steps {
                // Deploy JAR to Nexus Maven repository
                sh 'mvn deploy -DskipTests'
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'nexus-docker-credentials',
                    usernameVariable: 'NEXUS_USER',
                    passwordVariable: 'NEXUS_PASS'
                )]) {
                    sh """
                        docker build -t nexus.example.com:5000/myapp:${BUILD_NUMBER} .
                        echo $NEXUS_PASS | docker login nexus.example.com:5000 \
                          -u $NEXUS_USER --password-stdin
                        docker push nexus.example.com:5000/myapp:${BUILD_NUMBER}
                    """
                }
            }
        }
    }
}
```

### GitHub Actions Style (Woodpecker/Drone)

```yaml
# .woodpecker.yml - publish artifacts to Nexus
steps:
  - name: build
    image: maven:3.9-eclipse-temurin-21
    environment:
      MAVEN_OPTS: "-Dmaven.repo.local=/cache/maven"
    commands:
      - mvn clean package -DskipTests
      - mvn deploy -DskipTests
    secrets:
      - source: nexus_username
        target: NEXUS_USER
      - source: nexus_password
        target: NEXUS_PASS
    volumes:
      - /opt/build-cache/maven:/cache/maven
```

## Artifact Retention Policies

Without cleanup policies, Nexus fills your disk with old artifacts. Configure cleanup in **Administration > Cleanup Policies**.

```bash
# Example: Remove snapshot artifacts older than 30 days via API
curl -X POST \
  -u admin:password \
  -H "Content-Type: application/json" \
  https://nexus.example.com/service/rest/v1/cleanup-policies \
  -d '{
    "name": "cleanup-old-snapshots",
    "format": "maven2",
    "mode": "delete",
    "criteria": {
      "lastBlobUpdated": 30,
      "isPrerelease": true
    }
  }'
```

## Monitoring Disk Usage

```bash
# Check Nexus data directory size
du -sh /opt/nexus-data/sonatype-work/nexus3/blobs/

# Watch Nexus logs for issues
sudo tail -f /opt/nexus-data/sonatype-work/nexus3/log/nexus.log

# Check Nexus health via API
curl https://nexus.example.com/service/rest/v1/status
```

## Summary

Nexus Repository Manager on Ubuntu provides a central artifact hub for all your CI/CD pipelines. The Maven proxy and npm proxy repositories alone save significant time by caching public dependencies locally - teams stop re-downloading the same Spring Boot dependencies on every build. Pair the hosted repositories for internal packages with proper cleanup policies and you have a complete artifact management solution that scales from a small team to hundreds of repositories.
