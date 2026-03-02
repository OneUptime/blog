# How to Set Up Aqua Security for Containers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Container, Docker

Description: Deploy Aqua Security on Ubuntu to scan container images for vulnerabilities, enforce runtime policies, and secure your containerized workloads.

---

Container security is often an afterthought until something goes wrong. Aqua Security is a full-lifecycle container security platform that covers image scanning, runtime protection, and policy enforcement. This guide covers setting up the open-source components of Aqua's tooling on Ubuntu, along with the Aqua Community Edition for teams that need a complete container security workflow.

## Understanding Aqua's Architecture

Aqua Security consists of several components:

- **Aqua Server**: The central management platform with web UI
- **Aqua Gateway**: Handles communication between the server and enforcers
- **Aqua Enforcer**: Agent deployed on each host that enforces runtime policies
- **Trivy**: The open-source vulnerability scanner (now under Aqua's umbrella)

For most Ubuntu deployments, starting with Trivy for image scanning is the right first step, then expanding to the full Aqua platform if needed.

## Installing Trivy for Image Scanning

Trivy is Aqua's open-source vulnerability scanner. It scans container images, filesystems, and repositories for known CVEs.

```bash
# Add the Trivy apt repository
sudo apt install -y wget apt-transport-https gnupg lsb-release

wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | \
  sudo gpg --dearmor -o /usr/share/keyrings/trivy.gpg

echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] \
  https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | \
  sudo tee /etc/apt/sources.list.d/trivy.list

# Install Trivy
sudo apt update
sudo apt install -y trivy

# Verify installation
trivy --version
```

### Scanning a Container Image

```bash
# Scan an image from Docker Hub
trivy image nginx:latest

# Scan with only HIGH and CRITICAL severity vulnerabilities
trivy image --severity HIGH,CRITICAL nginx:latest

# Scan a local image
trivy image --input /path/to/image.tar

# Output results as JSON for further processing
trivy image --format json --output results.json nginx:latest

# Scan and fail if HIGH or CRITICAL vulnerabilities are found (for CI pipelines)
trivy image --exit-code 1 --severity HIGH,CRITICAL nginx:latest
```

### Scanning a Running Container's Filesystem

```bash
# Scan the filesystem of a running container
trivy rootfs /var/lib/docker/overlay2/LAYER_ID/merged

# Or scan a specific directory
trivy fs /path/to/application
```

### Configuring Trivy

Create a configuration file for consistent scanning options:

```bash
sudo mkdir -p /etc/trivy
sudo nano /etc/trivy/trivy.yaml
```

```yaml
# /etc/trivy/trivy.yaml
severity:
  - HIGH
  - CRITICAL

# Skip vulnerabilities with no available fix
ignore-unfixed: true

# Cache directory for vulnerability database
cache-dir: /var/cache/trivy

# Output format
format: table
```

```bash
# Use the config file
trivy image --config /etc/trivy/trivy.yaml nginx:latest
```

## Setting Up Aqua Community Edition

The Aqua Community Edition provides the full platform with web UI for environments that need centralized management.

### Prerequisites

```bash
# Ensure Docker and Docker Compose are installed
sudo apt install -y docker.io docker-compose-plugin

# Verify Docker is running
sudo systemctl start docker
sudo systemctl enable docker
```

### Deploying Aqua CE with Docker Compose

```bash
# Create a directory for Aqua CE
mkdir -p ~/aqua-ce && cd ~/aqua-ce

# Create the Docker Compose file
nano docker-compose.yml
```

```yaml
version: "3.7"

services:
  aqua-db:
    image: postgres:12-alpine
    container_name: aqua-db
    restart: always
    environment:
      POSTGRES_PASSWORD: aqua_db_password
      POSTGRES_USER: aqua
      POSTGRES_DB: aqua
    volumes:
      - aqua-db-data:/var/lib/postgresql/data

  aqua-server:
    image: aquasec/aqua-server:latest
    container_name: aqua-server
    restart: always
    depends_on:
      - aqua-db
    environment:
      SCALOCK_DBUSER: aqua
      SCALOCK_DBPASSWORD: aqua_db_password
      SCALOCK_DBNAME: aqua
      SCALOCK_DBHOST: aqua-db
      ADMIN_PASSWORD: change_this_admin_password
      LICENSE_TOKEN: your_license_token
    ports:
      - "8080:8080"
      - "8443:8443"

  aqua-gateway:
    image: aquasec/aqua-gateway:latest
    container_name: aqua-gateway
    restart: always
    depends_on:
      - aqua-server
    environment:
      SCALOCK_DBUSER: aqua
      SCALOCK_DBPASSWORD: aqua_db_password
      SCALOCK_DBNAME: aqua
      SCALOCK_DBHOST: aqua-db
      AQUA_SERVER: aqua-server:8443
    ports:
      - "3622:3622"
      - "8089:8089"

volumes:
  aqua-db-data:
```

```bash
# Start the Aqua CE stack
docker compose up -d

# Check all containers are running
docker compose ps
```

Access the Aqua web UI at `http://your-server-ip:8080`. Log in with username `administrator` and the password you set in `ADMIN_PASSWORD`.

## Deploying the Aqua Enforcer

The Enforcer runs on each host and enforces runtime security policies:

```bash
# Pull the Enforcer image
docker pull aquasec/aqua-enforcer:latest

# Run the Enforcer - connect it to your Aqua Gateway
docker run -d \
  --name aqua-enforcer \
  --restart always \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /dev:/dev \
  -v /sys:/sys \
  -v /proc:/proc \
  -e AQUA_TOKEN=your_enforcer_token \
  -e AQUA_SERVER=aqua-gateway-host:3622 \
  -e AQUA_LOGICAL_NAME=ubuntu-host-01 \
  aquasec/aqua-enforcer:latest
```

Get the Enforcer token from the Aqua web UI under Infrastructure > Enforcers.

## Configuring Image Assurance Policies

Image Assurance policies define what makes an image acceptable for deployment. Configure them in the Aqua UI or via the API:

```bash
# Example: Block images with critical CVEs using the Aqua CLI
# First, download the Aqua CLI (aquactl)
wget https://get.aquasec.com/aquactl/stable/aquactl_linux_amd64.tar.gz
tar -xzf aquactl_linux_amd64.tar.gz
sudo mv aquactl /usr/local/bin/

# Configure the CLI to connect to your Aqua server
aquactl configure --server http://aqua-server-ip:8080 \
  --user administrator \
  --password your_admin_password
```

## Integrating Trivy in CI/CD Pipelines

A common pattern is to scan images during the build pipeline and prevent deployment of vulnerable images:

```bash
#!/bin/bash
# Example CI scan script

IMAGE_NAME="$1"
SEVERITY_THRESHOLD="HIGH,CRITICAL"

echo "Scanning image: $IMAGE_NAME"

# Run Trivy scan
trivy image \
  --exit-code 1 \
  --severity "$SEVERITY_THRESHOLD" \
  --ignore-unfixed \
  --format table \
  "$IMAGE_NAME"

SCAN_EXIT_CODE=$?

if [ $SCAN_EXIT_CODE -ne 0 ]; then
    echo "FAIL: Image has HIGH or CRITICAL vulnerabilities. Blocking deployment."
    exit 1
fi

echo "PASS: Image passed vulnerability scan."
exit 0
```

```bash
# Make executable and use in pipelines
chmod +x /usr/local/bin/scan-image.sh
scan-image.sh myapp:latest
```

## Scheduling Regular Scans

Set up a cron job to scan your deployed images regularly:

```bash
sudo nano /etc/cron.d/trivy-scan
```

```
# Run Trivy scan on all local images every night at 2 AM
0 2 * * * root /usr/local/bin/scan-all-images.sh >> /var/log/trivy-scan.log 2>&1
```

```bash
# Create the scan-all-images script
sudo nano /usr/local/bin/scan-all-images.sh
```

```bash
#!/bin/bash
# Scan all locally cached Docker images

echo "=== Trivy scan started at $(date) ==="

# Get list of all local images
IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>")

for IMAGE in $IMAGES; do
    echo "Scanning: $IMAGE"
    trivy image --severity HIGH,CRITICAL --ignore-unfixed "$IMAGE"
    echo "---"
done

echo "=== Scan completed at $(date) ==="
```

```bash
sudo chmod +x /usr/local/bin/scan-all-images.sh
```

## Keeping the Vulnerability Database Updated

Trivy maintains a local cache of vulnerability data. Keep it current:

```bash
# Update the vulnerability database manually
trivy image --download-db-only

# Check when the database was last updated
trivy image --version
```

For air-gapped environments, download the database on an internet-connected machine and transfer it:

```bash
# Download the database to a tarball
trivy image --download-db-only
tar -czf trivy-db.tar.gz ~/.cache/trivy/

# On the air-gapped machine
tar -xzf trivy-db.tar.gz -C ~/
trivy image --skip-update your-image:tag
```

Container security scanning is most effective when integrated early - catching vulnerabilities in base images before they reach production is far better than discovering them during a security audit. Trivy's combination of accuracy, speed, and ease of integration makes it a solid foundation for container security on Ubuntu.
