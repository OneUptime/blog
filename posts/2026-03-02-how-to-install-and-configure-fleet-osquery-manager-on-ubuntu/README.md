# How to Install and Configure Fleet (osquery Manager) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Fleet, Osquery, Security, Monitoring

Description: Learn how to install and configure Fleet, the open-source osquery manager, on Ubuntu to centrally manage osquery agents and collect security data across your infrastructure.

---

Fleet is an open-source platform for managing osquery agents at scale. Where osquery gives you the query engine, Fleet gives you the management layer: enroll hosts, write queries, schedule them across your fleet, collect results, and browse your infrastructure's security posture through a web interface. If you're running osquery on more than a handful of servers, Fleet is the tool that keeps it manageable.

## Prerequisites

Fleet requires:
- Ubuntu 20.04 or 22.04
- MySQL 8.0 or later
- Redis 6.0 or later
- An SSL certificate (or you can use the self-signed option for testing)

## Installing Dependencies

### MySQL

```bash
# Install MySQL
sudo apt update
sudo apt install -y mysql-server

# Secure the installation
sudo mysql_secure_installation

# Create the Fleet database and user
sudo mysql -u root -p << 'EOF'
CREATE DATABASE fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fleet'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON fleet.* TO 'fleet'@'localhost';
FLUSH PRIVILEGES;
EOF

# Verify the database was created
sudo mysql -u fleet -p -e "SHOW DATABASES;"
```

### Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Enable and start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify Redis is working
redis-cli ping
# Should return: PONG
```

## Installing Fleet

### Download the Fleet Binary

```bash
# Set the Fleet version
FLEET_VERSION="4.48.0"

# Download Fleet server binary
wget https://github.com/fleetdm/fleet/releases/download/fleet-v${FLEET_VERSION}/fleet_v${FLEET_VERSION}_linux.tar.gz \
  -O /tmp/fleet.tar.gz

# Extract
tar -xzf /tmp/fleet.tar.gz -C /tmp

# Move binary to system path
sudo mv /tmp/fleet /usr/local/bin/fleet
sudo chmod +x /usr/local/bin/fleet

# Download fleetctl (the CLI tool)
wget https://github.com/fleetdm/fleet/releases/download/fleet-v${FLEET_VERSION}/fleetctl_v${FLEET_VERSION}_linux.tar.gz \
  -O /tmp/fleetctl.tar.gz

tar -xzf /tmp/fleetctl.tar.gz -C /tmp
sudo mv /tmp/fleetctl /usr/local/bin/fleetctl
sudo chmod +x /usr/local/bin/fleetctl

# Verify installation
fleet version
fleetctl version
```

## Configuring Fleet

### Create Configuration File

```bash
sudo mkdir -p /etc/fleet
sudo nano /etc/fleet/fleet.yml
```

```yaml
mysql:
  address: 127.0.0.1:3306
  database: fleet
  username: fleet
  password: your-secure-password

redis:
  address: 127.0.0.1:6379

server:
  address: 0.0.0.0:8080
  # For production, specify your TLS certificate paths:
  # cert: /etc/fleet/server.cert
  # key: /etc/fleet/server.key
  # For testing, use insecure mode (NOT for production):
  tls: false

logging:
  json: true
  level: info

auth:
  jwt_key: "generate-a-strong-random-key-here"

filesystem:
  status_log_file: /var/log/fleet/status.log
  result_log_file: /var/log/fleet/result.log
```

Generate a random JWT key:

```bash
# Generate a secure random key
openssl rand -base64 32
```

### Create the Log Directory

```bash
sudo mkdir -p /var/log/fleet
sudo chown -R fleet:fleet /var/log/fleet 2>/dev/null || true
```

### Initialize the Database

```bash
# Run Fleet's database migration
sudo fleet prepare db --config /etc/fleet/fleet.yml
```

### Create a Fleet System User

```bash
sudo useradd -r -s /usr/sbin/nologin -d /etc/fleet fleet
sudo chown -R fleet:fleet /etc/fleet
sudo chown -R fleet:fleet /var/log/fleet
```

### Create the Systemd Service

```bash
sudo nano /etc/systemd/system/fleet.service
```

```ini
[Unit]
Description=Fleet osquery Manager
After=network.target mysql.service redis-server.service

[Service]
Type=simple
User=fleet
Group=fleet
ExecStart=/usr/local/bin/fleet serve --config /etc/fleet/fleet.yml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=fleet

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable fleet
sudo systemctl start fleet

# Check it started correctly
sudo systemctl status fleet
sudo journalctl -u fleet -f
```

## Initial Setup

### Set Up Admin Account

With Fleet running, complete initial setup via `fleetctl`:

```bash
# Configure fleetctl to talk to your server
fleetctl config set --address http://localhost:8080

# Set up the admin account
fleetctl setup \
  --email admin@yourcompany.com \
  --name "Admin User" \
  --password "your-admin-password" \
  --org-name "Your Organization"

# Log in
fleetctl login --email admin@yourcompany.com
```

Or access the web UI at `http://your-server:8080` and complete the setup wizard.

## Enrolling Hosts

### Generate an Enrollment Secret

```bash
# Get the enrollment secret from fleetctl
fleetctl get enroll-secret
```

Or from the web UI: Settings > Enrolling Hosts.

### Install osquery on Client Hosts

```bash
# On each Ubuntu host you want to enroll
curl -s https://pkg.osquery.io/deb/pubkey.gpg | sudo apt-key add -
sudo add-apt-repository 'deb [arch=amd64] https://pkg.osquery.io/deb deb main'
sudo apt update
sudo apt install osquery
```

### Configure osquery to Connect to Fleet

Create the osquery flag file on each client:

```bash
sudo nano /etc/osquery/osquery.flags
```

```text
--tls_hostname=your-fleet-server:8080
--host_identifier=instance
--enroll_secret_path=/etc/osquery/enroll_secret
--tls_server_certs=/etc/osquery/fleet.pem
--enroll_tls_endpoint=/api/osquery/enroll
--config_plugin=tls
--config_tls_endpoint=/api/osquery/config
--config_tls_refresh=10
--disable_distributed=false
--distributed_plugin=tls
--distributed_tls_max_attempts=3
--distributed_tls_read_endpoint=/api/osquery/distributed/read
--distributed_tls_write_endpoint=/api/osquery/distributed/write
--logger_plugin=tls
--logger_tls_endpoint=/api/osquery/log
--logger_tls_period=10
```

```bash
# Write the enrollment secret to file
echo "your-enrollment-secret" | sudo tee /etc/osquery/enroll_secret
sudo chmod 600 /etc/osquery/enroll_secret

# Download the Fleet server certificate
sudo curl -s http://your-fleet-server:8080/assets/fleet.pem \
  -o /etc/osquery/fleet.pem
```

### Using fleetd (The Modern Approach)

Fleet now provides `fleetd`, a unified agent package that bundles osquery and handles enrollment automatically:

```bash
# Generate a package for Ubuntu hosts
fleetctl package \
  --type=deb \
  --fleet-url=https://your-fleet-server:8080 \
  --enroll-secret=your-enrollment-secret \
  --output=fleet-agent.deb

# Install on target hosts
sudo dpkg -i fleet-agent.deb
```

## Writing and Scheduling Queries

### Via the fleetctl CLI

```bash
# Save a query
fleetctl apply -f - << 'EOF'
apiVersion: v1
kind: query
spec:
  name: active_network_connections
  description: Show all established network connections
  query: >
    SELECT pid, local_address, local_port, remote_address, remote_port,
    p.name as process_name, p.path as process_path
    FROM process_open_sockets pos
    JOIN processes p ON pos.pid = p.pid
    WHERE pos.state = 'ESTABLISHED';
EOF
```

### Scheduling Queries Across the Fleet

```bash
fleetctl apply -f - << 'EOF'
apiVersion: v1
kind: pack
spec:
  name: security-monitoring
  targets:
    labels:
      - All Hosts
  queries:
    - name: active_network_connections
      interval: 60
      removed: true
    - name: listening_ports_with_processes
      interval: 300
      removed: false
EOF
```

## Viewing Results

```bash
# List all hosts
fleetctl get hosts

# Get details for a specific host
fleetctl get host --name hostname.example.com

# View query results
fleetctl get query-results --name active_network_connections
```

In the web UI, the "Queries" section shows recent results, and "Hosts" lets you drill into individual machines to view their configuration, queries, and collected data.

## Setting Up Policies for Compliance Checks

Fleet has a "Policies" feature that runs queries as pass/fail checks:

```bash
fleetctl apply -f - << 'EOF'
apiVersion: v1
kind: policy
spec:
  name: SSH root login disabled
  query: >
    SELECT 1 FROM etc_hosts
    WHERE PermitRootLogin = 'no'
    LIMIT 1;
  description: Checks that root login via SSH is disabled
  resolution: Set PermitRootLogin to no in /etc/ssh/sshd_config
EOF
```

Policies show which hosts are compliant and which fail, giving you a quick view of your security posture across the fleet.

## Upgrading Fleet

```bash
# Download new version
FLEET_VERSION="4.49.0"
wget https://github.com/fleetdm/fleet/releases/download/fleet-v${FLEET_VERSION}/fleet_v${FLEET_VERSION}_linux.tar.gz -O /tmp/fleet.tar.gz
tar -xzf /tmp/fleet.tar.gz -C /tmp

# Stop service, replace binary, run migrations, start again
sudo systemctl stop fleet
sudo mv /tmp/fleet /usr/local/bin/fleet
sudo fleet prepare db --config /etc/fleet/fleet.yml
sudo systemctl start fleet
```

Fleet's combination of scheduled queries, live queries, and compliance policies gives you a solid foundation for endpoint visibility across an Ubuntu infrastructure without requiring specialized agents or complex integrations.
