# How to Set Up Boundary for Remote Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Boundary, HashiCorp, Remote Access, Security

Description: Install and configure HashiCorp Boundary on Ubuntu to provide identity-based remote access to infrastructure without VPNs or long-lived credentials.

---

HashiCorp Boundary is an open-source tool that provides secure remote access to infrastructure based on identity rather than network location. Instead of giving engineers VPN access to your entire internal network, Boundary grants access to specific targets (SSH hosts, databases, Kubernetes clusters) based on identity provider roles. Access is brokered through short-lived credentials and logged for auditing. This guide sets up a single-host deployment suitable for a small team or development environment.

## Prerequisites

- Ubuntu 22.04
- PostgreSQL 12+ for the Boundary database
- A domain name or static IP for the controller
- Root or sudo access

## Architecture Overview

Boundary has three components:

- **Controller**: Manages configuration, identity, permissions, and sessions (stores state in PostgreSQL)
- **Worker**: Proxies connections between clients and targets; sits in the same network as the targets
- **Client**: The `boundary` CLI or Boundary Desktop app used by engineers

For this guide, we run both the controller and worker on the same Ubuntu server.

## Installing PostgreSQL

```bash
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl enable --now postgresql

# Create the Boundary database and user
sudo -u postgres psql <<'PSQL'
CREATE DATABASE boundary;
CREATE USER boundary WITH ENCRYPTED PASSWORD 'StrongBoundaryPassword123!';
GRANT ALL PRIVILEGES ON DATABASE boundary TO boundary;
\c boundary
GRANT ALL ON SCHEMA public TO boundary;
PSQL
```

## Installing Boundary

```bash
# Add HashiCorp's GPG key and repository
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/hashicorp.list

sudo apt update
sudo apt install -y boundary

# Verify installation
boundary version
```

## Generating Encryption Keys

Boundary requires several KMS (Key Management Service) keys for encrypting session state and tokens. For the open-source version, use the built-in AEAD key type:

```bash
# Generate three random 32-byte keys and base64-encode them
# These are used for root, worker-auth, and recovery KMS
KEY_ROOT=$(openssl rand -base64 32)
KEY_WORKER=$(openssl rand -base64 32)
KEY_RECOVERY=$(openssl rand -base64 32)

echo "Root key: $KEY_ROOT"
echo "Worker auth key: $KEY_WORKER"
echo "Recovery key: $KEY_RECOVERY"
# Save these securely - you will need them in the configuration
```

## Configuring the Controller

```bash
sudo tee /etc/boundary/boundary.hcl > /dev/null <<EOF
# Disable memory locking for simplicity
disable_mlock = true

# Controller configuration
controller {
  name = "boundary-controller-1"
  description = "Boundary Controller"

  # PostgreSQL database connection
  database {
    url = "postgresql://boundary:StrongBoundaryPassword123!@localhost/boundary"
  }
}

# Encryption keys for the controller
kms "aead" {
  purpose = "root"
  aead_type = "aes-gcm"
  key = "${KEY_ROOT}"
  key_id = "global_root"
}

kms "aead" {
  purpose = "worker-auth"
  aead_type = "aes-gcm"
  key = "${KEY_WORKER}"
  key_id = "global_worker-auth"
}

kms "aead" {
  purpose = "recovery"
  aead_type = "aes-gcm"
  key = "${KEY_RECOVERY}"
  key_id = "global_recovery"
}

# Controller listener - API and cluster traffic
listener "tcp" {
  purpose = "api"
  address = "0.0.0.0:9200"
  # For production, add TLS:
  # tls_cert_file = "/etc/boundary/tls/boundary.crt"
  # tls_key_file  = "/etc/boundary/tls/boundary.key"
}

listener "tcp" {
  purpose = "cluster"
  address = "0.0.0.0:9201"
}

# Worker proxy listener
listener "tcp" {
  purpose = "proxy"
  address = "0.0.0.0:9202"
}

# Worker configuration (running on same host as controller)
worker {
  name = "boundary-worker-1"
  description = "Boundary Worker"

  # Address the worker advertises to clients
  public_addr = "$(curl -s ifconfig.me)"

  controllers = ["127.0.0.1:9201"]
}
EOF
```

Replace `${KEY_ROOT}`, `${KEY_WORKER}`, and `${KEY_RECOVERY}` with the actual key values you generated.

## Initializing the Database

```bash
# Initialize the Boundary database (creates schema and initial data)
sudo boundary database init -config /etc/boundary/boundary.hcl

# The init command outputs:
# - Initial auth method ID
# - Initial login name (admin)
# - Initial password
# - Initial scope IDs
# Save all of this output - you need the credentials to log in

# Example output:
# Authmethods:
#   AuthMethod  Resources:
#     ID:           ampw_xxxxxxxx
#     Type:         password
#     Name:         Generated global scope initial auth method
#     Login Name:   admin
#     Password:     <RANDOM_PASSWORD>
```

## Creating the Systemd Service

```bash
sudo tee /etc/systemd/system/boundary.service > /dev/null <<'EOF'
[Unit]
Description=HashiCorp Boundary
Documentation=https://www.boundaryproject.io/docs
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=boundary
Group=boundary
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes

ExecStart=/usr/bin/boundary server -config=/etc/boundary/boundary.hcl
ExecReload=/bin/kill --signal HUP $MAINPID
KillMode=process
KillSignal=SIGTERM
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

# Create boundary system user
sudo useradd -r -s /bin/false -d /etc/boundary boundary
sudo chown -R boundary:boundary /etc/boundary

sudo systemctl daemon-reload
sudo systemctl enable --now boundary
sudo systemctl status boundary
```

## Firewall Configuration

```bash
sudo ufw allow 9200/tcp comment "Boundary API"
sudo ufw allow 9201/tcp comment "Boundary Cluster"
sudo ufw allow 9202/tcp comment "Boundary Proxy"
sudo ufw reload
```

## Configuring Boundary via CLI

```bash
# Set the controller address
export BOUNDARY_ADDR=http://127.0.0.1:9200

# Log in using the credentials from the database init output
boundary authenticate password \
  -auth-method-id=ampw_xxxxxxxx \
  -login-name=admin \
  -password=<INIT_PASSWORD>

# The CLI stores the token for subsequent commands
# Check authentication status
boundary authenticate status
```

## Creating the Infrastructure Hierarchy

```bash
# Create an organization scope
ORG_ID=$(boundary scopes create \
  -scope-id=global \
  -name="My Organization" \
  -description="Production organization" \
  -format=json | jq -r '.item.id')

echo "Org ID: $ORG_ID"

# Create a project within the organization
PROJECT_ID=$(boundary scopes create \
  -scope-id=$ORG_ID \
  -name="Production" \
  -description="Production environment" \
  -format=json | jq -r '.item.id')

echo "Project ID: $PROJECT_ID"
```

## Adding a Host and Target

```bash
# Create a host catalog
CATALOG_ID=$(boundary host-catalogs create static \
  -scope-id=$PROJECT_ID \
  -name="Production Hosts" \
  -format=json | jq -r '.item.id')

# Add a host (your Ubuntu server to manage)
HOST_ID=$(boundary hosts create static \
  -host-catalog-id=$CATALOG_ID \
  -name="web-server-01" \
  -address="192.168.1.50" \
  -format=json | jq -r '.item.id')

# Create a host set
HOSTSET_ID=$(boundary host-sets create static \
  -host-catalog-id=$CATALOG_ID \
  -name="Production Web Servers" \
  -format=json | jq -r '.item.id')

# Add the host to the set
boundary host-sets add-hosts \
  -id=$HOSTSET_ID \
  -host=$HOST_ID

# Create an SSH target
TARGET_ID=$(boundary targets create ssh \
  -scope-id=$PROJECT_ID \
  -name="web-server-01-ssh" \
  -default-port=22 \
  -session-max-seconds=3600 \
  -format=json | jq -r '.item.id')

# Attach the host set to the target
boundary targets add-host-sets \
  -id=$TARGET_ID \
  -host-set=$HOSTSET_ID
```

## Connecting to a Target

```bash
# List available targets
boundary targets list -scope-id=$PROJECT_ID

# Connect to a target via SSH
boundary connect ssh -target-id=$TARGET_ID -- -l ubuntu

# Or use the target name
boundary connect ssh -target-name="web-server-01-ssh" \
  -scope-id=$PROJECT_ID -- -l ubuntu

# Boundary creates a local proxy and SSH connects through it
# All session data is logged in the controller
```

## Viewing Sessions and Audit Logs

```bash
# List active sessions
boundary sessions list -scope-id=$PROJECT_ID

# View session details
boundary sessions read -id=<SESSION_ID>

# Cancel an active session (for incident response)
boundary sessions cancel -id=<SESSION_ID>
```

Boundary removes the need to distribute SSH keys to team members or maintain a VPN for every engineer. Access is tied to identity, scoped to specific targets, time-limited, and fully logged - meeting the requirements of most security compliance frameworks without the operational overhead of a traditional bastion host setup.
