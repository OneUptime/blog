# How to Install Nexus Repository Manager on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nexus, Repository Manager, Artifacts, DevOps

Description: Learn how to install and configure Sonatype Nexus Repository Manager on RHEL for managing build artifacts and proxying remote repositories.

---

Sonatype Nexus Repository Manager is a universal artifact repository that supports Maven, npm, Docker, PyPI, and many other package formats. It acts as a local cache for remote repositories and hosts your internal artifacts.

## Prerequisites

```bash
# Install Java 8 or 11 (required by Nexus)
sudo dnf install -y java-11-openjdk java-11-openjdk-devel
java -version
```

## Installing Nexus

```bash
# Download Nexus
curl -L https://download.sonatype.com/nexus/3/nexus-3.68.0-04-unix.tar.gz \
  -o /tmp/nexus.tar.gz

# Extract to /opt
sudo tar xzf /tmp/nexus.tar.gz -C /opt/
sudo mv /opt/nexus-3.68.0-04 /opt/nexus

# Create a nexus user
sudo useradd -r -s /sbin/nologin nexus
sudo chown -R nexus:nexus /opt/nexus /opt/sonatype-work
```

## Configuring Nexus

```bash
# Set the run-as user
echo 'run_as_user="nexus"' | sudo tee /opt/nexus/bin/nexus.rc

# Configure JVM memory in /opt/nexus/bin/nexus.vmoptions
# Adjust based on available memory:
# -Xms1024m
# -Xmx1024m
# -XX:MaxDirectMemorySize=1024m
```

## Creating a systemd Service

```bash
cat << 'SERVICE' | sudo tee /etc/systemd/system/nexus.service
[Unit]
Description=Sonatype Nexus Repository Manager
After=network.target

[Service]
Type=forking
User=nexus
Group=nexus
LimitNOFILE=65536
ExecStart=/opt/nexus/bin/nexus start
ExecStop=/opt/nexus/bin/nexus stop
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now nexus
```

## Retrieving the Admin Password

```bash
# The initial admin password is stored in a file
sudo cat /opt/sonatype-work/nexus3/admin.password

# You will be prompted to change it on first login
```

## Firewall Configuration

```bash
sudo firewall-cmd --add-port=8081/tcp --permanent
sudo firewall-cmd --reload
```

## Accessing the Web UI

Open `http://your-server:8081` in a browser. Log in with:
- Username: `admin`
- Password: (from the admin.password file)

## Creating a Maven Proxy Repository

Through the web UI, or via the REST API:

```bash
# Create a Maven proxy repository using the API
curl -u admin:newpassword -X POST \
  "http://localhost:8081/service/rest/v1/repositories/maven/proxy" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "maven-central-proxy",
    "online": true,
    "storage": {
      "blobStoreName": "default",
      "strictContentTypeValidation": true
    },
    "proxy": {
      "remoteUrl": "https://repo1.maven.org/maven2/",
      "contentMaxAge": 1440,
      "metadataMaxAge": 1440
    },
    "negativeCache": {
      "enabled": true,
      "timeToLive": 1440
    },
    "maven": {
      "versionPolicy": "RELEASE",
      "layoutPolicy": "STRICT"
    }
  }'
```

Nexus stores all data in `/opt/sonatype-work/nexus3/`. Back up this directory regularly. The blob store can grow large, so consider placing it on a dedicated volume.
