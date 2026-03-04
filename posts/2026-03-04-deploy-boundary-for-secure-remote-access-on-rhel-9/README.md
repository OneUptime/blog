# How to Deploy Boundary for Secure Remote Access on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Boundary, HashiCorp, Remote Access, Zero Trust, Security, Linux

Description: Learn how to deploy HashiCorp Boundary on RHEL to provide secure, identity-based remote access to infrastructure without exposing private networks or managing VPN credentials.

---

HashiCorp Boundary provides identity-based access to hosts and services across any environment. Instead of giving users VPN access to your entire network, Boundary lets you grant access to specific targets based on user identity and role. Sessions are authenticated, authorized, and audited, and users never see the network credentials. This guide covers deploying Boundary on RHEL.

## How Boundary Works

Boundary has three main components:

- **Controller** - handles authentication, authorization, and session management
- **Worker** - proxies sessions between users and targets
- **Client** - the CLI or Desktop application users interact with

Users authenticate to the controller, which authorizes their access to specific targets. The worker proxies the actual connection, so users never need direct network access to the target.

## Prerequisites

- RHEL systems for controller and worker (can be the same machine for testing)
- PostgreSQL 11 or newer for the controller database
- Root or sudo access

## Installing Boundary

```bash
# Add the HashiCorp repository
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
```

```bash
# Install Boundary
sudo dnf install -y boundary
```

Verify the installation:

```bash
# Check the version
boundary version
```

## Setting Up PostgreSQL

```bash
# Install PostgreSQL
sudo dnf install -y postgresql-server postgresql
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Create the Boundary database:

```bash
# Create the database and user
sudo -u postgres psql << 'SQL'
CREATE USER boundary WITH PASSWORD 'boundary_db_password';
CREATE DATABASE boundary OWNER boundary;
SQL
```

## Configuring the Controller

Create the controller configuration:

```bash
# Create configuration directory
sudo mkdir -p /etc/boundary
```

```bash
# Create the controller configuration
sudo tee /etc/boundary/controller.hcl > /dev/null << 'EOF'
disable_mlock = true

controller {
  name = "boundary-controller"
  description = "Boundary controller on RHEL"
  database {
    url = "postgresql://boundary:boundary_db_password@127.0.0.1:5432/boundary?sslmode=disable"
  }
}

listener "tcp" {
  address = "0.0.0.0:9200"
  purpose = "api"
  tls_disable = true
}

listener "tcp" {
  address = "0.0.0.0:9201"
  purpose = "cluster"
  tls_disable = true
}

kms "aead" {
  purpose = "root"
  aead_type = "aes-gcm"
  key = "sP1fnF5Xz85RrXpS+DAANXNueTriiQOk"
  key_id = "global_root"
}

kms "aead" {
  purpose = "worker-auth"
  aead_type = "aes-gcm"
  key = "8fZBjCUfN0TzjEGLQldGY4+iE9AkOvCf"
  key_id = "global_worker-auth"
}

kms "aead" {
  purpose = "recovery"
  aead_type = "aes-gcm"
  key = "8fZBjCUfN0TzjEGLQldGY4+iE9AkOvCg"
  key_id = "global_recovery"
}
EOF
```

Initialize the database:

```bash
# Initialize the Boundary database
boundary database init -config /etc/boundary/controller.hcl
```

Save the output, which contains the initial auth method ID, login name, and password.

## Starting the Controller

```bash
# Create a systemd service for the controller
sudo tee /etc/systemd/system/boundary-controller.service > /dev/null << 'EOF'
[Unit]
Description=Boundary Controller
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/boundary server -config /etc/boundary/controller.hcl
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

```bash
# Start the controller
sudo systemctl daemon-reload
sudo systemctl enable --now boundary-controller
```

## Configuring the Worker

```bash
# Create the worker configuration
sudo tee /etc/boundary/worker.hcl > /dev/null << 'EOF'
disable_mlock = true

worker {
  name = "boundary-worker-1"
  description = "Boundary worker on RHEL"
  controllers = ["127.0.0.1:9201"]
}

listener "tcp" {
  address = "0.0.0.0:9202"
  purpose = "proxy"
  tls_disable = true
}

kms "aead" {
  purpose = "worker-auth"
  aead_type = "aes-gcm"
  key = "8fZBjCUfN0TzjEGLQldGY4+iE9AkOvCf"
  key_id = "global_worker-auth"
}
EOF
```

```bash
# Create a systemd service for the worker
sudo tee /etc/systemd/system/boundary-worker.service > /dev/null << 'EOF'
[Unit]
Description=Boundary Worker
After=network-online.target boundary-controller.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/boundary server -config /etc/boundary/worker.hcl
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

```bash
# Start the worker
sudo systemctl daemon-reload
sudo systemctl enable --now boundary-worker
```

## Authenticating to Boundary

```bash
# Set the Boundary address
export BOUNDARY_ADDR="http://127.0.0.1:9200"
```

```bash
# Authenticate with the initial admin credentials
boundary authenticate password \
  -auth-method-id ampw_1234567890 \
  -login-name admin \
  -password "initial_password_from_init"
```

## Creating an Organization and Project

```bash
# Create an organization
boundary scopes create -name "MyOrg" -scope-id global -description "Production organization"
```

```bash
# Create a project within the organization (use the org scope ID from the previous command)
boundary scopes create -name "Production" -scope-id o_abc123 -description "Production infrastructure"
```

## Adding Targets

Create a target that users can connect to:

```bash
# Create a host catalog
boundary host-catalogs create static \
  -name "prod-servers" \
  -scope-id p_xyz789

# Create a host
boundary hosts create static \
  -name "db-server" \
  -address "10.0.1.50" \
  -host-catalog-id hcst_abc123

# Create a host set
boundary host-sets create static \
  -name "database-hosts" \
  -host-catalog-id hcst_abc123

# Add the host to the host set
boundary host-sets add-hosts \
  -id hsst_def456 \
  -host hst_ghi789

# Create a target
boundary targets create tcp \
  -name "prod-database-ssh" \
  -scope-id p_xyz789 \
  -default-port 22 \
  -session-max-seconds 3600

# Add the host set to the target
boundary targets add-host-sources \
  -id ttcp_jkl012 \
  -host-source hsst_def456
```

## Connecting to a Target

```bash
# Connect to the target (this opens a local proxy)
boundary connect ssh -target-id ttcp_jkl012
```

For non-SSH connections:

```bash
# Connect with a generic TCP proxy
boundary connect -target-id ttcp_jkl012 -listen-port 5432
```

This creates a local listener on port 5432 that proxies through Boundary to the target. Connect your database client to localhost:5432.

## Configuring the Firewall

```bash
# Open Boundary ports
sudo firewall-cmd --permanent --add-port=9200/tcp
sudo firewall-cmd --permanent --add-port=9201/tcp
sudo firewall-cmd --permanent --add-port=9202/tcp
sudo firewall-cmd --reload
```

## Viewing Session History

```bash
# List active sessions
boundary sessions list -scope-id p_xyz789
```

```bash
# Read session details
boundary sessions read -id s_abc123
```

## Conclusion

HashiCorp Boundary on RHEL replaces traditional VPNs and bastion hosts with identity-based access to infrastructure targets. Users authenticate to Boundary, which authorizes and proxies their connections to specific hosts and services. Every session is logged and auditable, and users never need direct network access or static credentials for the target systems.
