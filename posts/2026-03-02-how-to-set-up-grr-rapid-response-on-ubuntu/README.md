# How to Set Up GRR Rapid Response on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Forensics, Incident Response, GRR

Description: Install and configure GRR Rapid Response on Ubuntu for remote live forensics and incident response, covering server setup, client deployment, and basic investigation workflows.

---

GRR Rapid Response is Google's open-source framework for remote live forensics and incident response. When something suspicious happens on a machine in your infrastructure, GRR lets you collect forensic artifacts, examine running processes, search for files, query the registry (on Windows), and run hunts across hundreds of machines simultaneously - all without requiring physical access or disrupting running processes.

## Architecture Overview

GRR has two components:

**GRR Server** - runs on a central host and provides the web interface, API, and coordinates agent communication. It uses MySQL for metadata storage and communicates with agents over HTTP.

**GRR Client (Agent)** - a lightweight daemon installed on monitored hosts. It polls the server for jobs, executes collection tasks, and returns results.

The server can be scaled across multiple components (admin UI, worker, frontend) for large deployments, but a single-host install handles hundreds of clients comfortably.

## Installing GRR Server on Ubuntu

GRR provides pre-built server packages and Docker images. The recommended method for a new deployment is the server DEB:

```bash
# Install prerequisites
sudo apt update
sudo apt install -y python3-pip python3-venv python3-dev \
  build-essential libssl-dev libffi-dev \
  default-libmysqlclient-dev default-mysql-server

# Create a virtual environment for GRR
sudo python3 -m venv /opt/grr/venv
sudo /opt/grr/venv/bin/pip install --upgrade pip

# Install GRR server
sudo /opt/grr/venv/bin/pip install grr-response-server grr-response-core

# Alternatively, use the Docker-based deployment (simpler for testing)
docker pull ghcr.io/google/grr:latest
```

### Docker-Based Deployment

For a quick deployment, Docker Compose is the easiest approach:

```bash
# Clone the GRR repository for Docker configs
git clone https://github.com/google/grr.git
cd grr/docker

# Edit docker-compose.yml to set your GRR admin password and other settings
nano docker-compose.yml
```

```yaml
# grr/docker/docker-compose.yml (simplified)
version: "3"

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: grr-mysql-root-password
      MYSQL_DATABASE: grr
      MYSQL_USER: grr
      MYSQL_PASSWORD: grr-mysql-password
    volumes:
      - mysql_data:/var/lib/mysql

  grr-admin-ui:
    image: ghcr.io/google/grr:latest
    depends_on:
      - mysql
    ports:
      - "8000:8000"  # Admin web UI
    environment:
      - MYSQL_HOST=mysql
      - MYSQL_PASSWORD=grr-mysql-password
    command: grr_admin_ui

  grr-worker:
    image: ghcr.io/google/grr:latest
    depends_on:
      - mysql
    environment:
      - MYSQL_HOST=mysql
      - MYSQL_PASSWORD=grr-mysql-password
    command: grr_worker

  grr-frontend:
    image: ghcr.io/google/grr:latest
    depends_on:
      - mysql
    ports:
      - "8080:8080"  # Client communications port
    environment:
      - MYSQL_HOST=mysql
      - MYSQL_PASSWORD=grr-mysql-password
    command: grr_frontend

volumes:
  mysql_data:
```

```bash
# Start GRR
docker-compose up -d

# Check that all services started
docker-compose ps

# Access the admin UI
# Navigate to http://your-server-ip:8000
# Default credentials are set during initial configuration
```

### Direct Installation

For a production installation directly on Ubuntu:

```bash
# Set up MySQL database
sudo mysql -u root << 'EOF'
CREATE DATABASE grr;
CREATE USER 'grr'@'localhost' IDENTIFIED BY 'strong-password-here';
GRANT ALL PRIVILEGES ON grr.* TO 'grr'@'localhost';
FLUSH PRIVILEGES;
EOF

# Create GRR configuration directory
sudo mkdir -p /etc/grr

# Initialize GRR configuration
sudo /opt/grr/venv/bin/grr_config_updater initialize \
  --noprompt \
  --config=/etc/grr/server.local.yaml \
  --mysql_hostname=localhost \
  --mysql_database=grr \
  --mysql_username=grr \
  --mysql_password=strong-password-here \
  --adminui_url=http://your-server-ip:8000 \
  --frontend_url=http://your-server-ip:8080

# Create an admin user
sudo /opt/grr/venv/bin/grr_config_updater \
  --config=/etc/grr/server.local.yaml \
  add_user admin --admin
```

## Creating systemd Services

```bash
# GRR Frontend service (handles agent connections)
sudo tee /etc/systemd/system/grr-frontend.service << 'EOF'
[Unit]
Description=GRR Frontend Server
After=network.target mysql.service

[Service]
User=grr
ExecStart=/opt/grr/venv/bin/grr_frontend \
  --config=/etc/grr/server.local.yaml
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# GRR Admin UI service
sudo tee /etc/systemd/system/grr-admin-ui.service << 'EOF'
[Unit]
Description=GRR Admin UI
After=network.target mysql.service

[Service]
User=grr
ExecStart=/opt/grr/venv/bin/grr_admin_ui \
  --config=/etc/grr/server.local.yaml
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# GRR Worker service
sudo tee /etc/systemd/system/grr-worker.service << 'EOF'
[Unit]
Description=GRR Worker
After=network.target mysql.service

[Service]
User=grr
ExecStart=/opt/grr/venv/bin/grr_worker \
  --config=/etc/grr/server.local.yaml
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create GRR user
sudo useradd -r -s /bin/false grr

sudo systemctl daemon-reload
sudo systemctl enable grr-frontend grr-admin-ui grr-worker
sudo systemctl start grr-frontend grr-admin-ui grr-worker
```

## Deploying GRR Clients

After the server is running, generate client installers from the GRR admin interface or command line:

```bash
# Build a DEB package for Ubuntu clients
sudo /opt/grr/venv/bin/grr_client_build \
  --config=/etc/grr/server.local.yaml \
  --platform linux_deb \
  --output_dir=/tmp/grr-clients

ls /tmp/grr-clients/
# grr-client_x.y.z_amd64.deb

# Deploy the client to monitored machines
scp /tmp/grr-clients/grr-client_*.deb target-machine:/tmp/

# On the target machine, install the client
sudo dpkg -i /tmp/grr-client_*.deb
sudo systemctl enable grr-client
sudo systemctl start grr-client
```

The client will appear in the GRR admin UI under "Manage Client" once it checks in.

## Basic Investigation Workflows

Once clients are connected, you can perform live forensic investigations:

### Collecting System Information

From the GRR admin UI:
1. Navigate to "Manage Clients"
2. Search for the client by hostname or IP
3. Click the client to open its details
4. Go to "Start new flow" and select from available flows

Common flows:
- **ArtifactCollectorFlow** - collect forensic artifacts (browser history, Windows registry, startup items)
- **ListProcesses** - enumerate running processes
- **ListNetworkConnections** - show open network connections
- **FileFinder** - search for files matching criteria
- **MemoryCollector** - collect a memory image

### Running Hunts

Hunts run the same flow across many machines simultaneously:

```bash
# Using the GRR API (python client)
pip install grr-api-client

python3 << 'EOF'
import grr_api_client
from grr_api_client import api

# Connect to the GRR API
grrapi = api.InitHttp(api_endpoint="http://localhost:8000")

# Create a hunt to collect process listings from all clients
hunt = grrapi.CreateHunt(
    flow_name="ListProcesses",
    hunt_runner_args=grrapi.types.CreateHuntRunnerArgs(
        client_rate=100,  # Max 100 clients/minute
        client_limit=1000  # Stop after 1000 clients
    )
)

# Start the hunt
hunt.Start()
print(f"Hunt started: {hunt.urn}")
EOF
```

## Checking Client Status

```bash
# On a monitored machine, check the GRR client
sudo systemctl status grr-client

# Check the client log
sudo journalctl -u grr-client -n 100

# Verify the client is communicating with the server
sudo cat /etc/grr/client.local.yaml | grep server

# Check client configuration
sudo /opt/grr/venv/bin/grr_client \
  --config=/etc/grr/client.local.yaml \
  --config_help
```

## Securing the GRR Deployment

For production use, several security measures are important:

```bash
# Put the admin UI behind a reverse proxy with HTTPS
sudo apt install -y nginx
sudo tee /etc/nginx/sites-available/grr << 'EOF'
server {
    listen 443 ssl;
    server_name grr.example.com;

    ssl_certificate /etc/letsencrypt/live/grr.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grr.example.com/privkey.pem;

    # Restrict access to your security team's IP range
    allow 10.0.0.0/8;
    deny all;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/grr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

GRR becomes most valuable when it's deployed before an incident - having agents already running means you can begin investigation immediately when something suspicious is detected, rather than scrambling to install forensic tools during an active incident.
