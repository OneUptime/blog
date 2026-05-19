# How to Install and Configure Teleport on Ubuntu for SSH Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Teleport, SSH, Security, Access Management

Description: Install and configure Teleport on Ubuntu to provide certificate-based SSH access, session recording, and centralized access management across your infrastructure.

---

Teleport is an open-source infrastructure access platform that replaces traditional SSH key-based access with short-lived certificates, provides full session recording and auditing, and gives you a single place to manage who can access what across all your servers. Instead of distributing SSH keys and hoping they get rotated, Teleport issues certificates that expire automatically and logs every session.

## Prerequisites

- Ubuntu 22.04 LTS
- A domain name or hostname for the Teleport proxy (for production)
- Port 443 accessible on the proxy node, plus any legacy Teleport listener ports you explicitly enable
- Root or sudo access

For this guide:
- `teleport-proxy.example.com` - the Teleport proxy and auth server
- `node1.internal` and `node2.internal` - nodes to be managed

## Installing Teleport

### On the Auth/Proxy Server

```bash
# Add the Teleport repository

sudo mkdir -p /etc/apt/keyrings
curl https://apt.releases.teleport.dev/gpg \
  | sudo tee /etc/apt/keyrings/teleport-archive-keyring.asc > /dev/null

# Add the repository for Ubuntu 22.04
echo "deb [signed-by=/etc/apt/keyrings/teleport-archive-keyring.asc arch=amd64] https://apt.releases.teleport.dev/ubuntu jammy stable" \
  | sudo tee /etc/apt/sources.list.d/teleport.list

sudo apt update
sudo apt install -y teleport

# Verify installation
teleport version
```

### Alternative: Script Install

```bash
# Use the official install script (handles version and OS detection)
curl https://cdn.teleport.dev/install.sh | sudo bash -s 18.8.1
```

## Configuring the Auth and Proxy Server

Create the Teleport configuration:

```bash
# Generate an initial configuration
sudo teleport configure \
  --cluster-name=mycluster \
  --public-addr=teleport-proxy.example.com:443 \
  --cert-file=/var/lib/teleport/webproxy_cert.pem \
  --key-file=/var/lib/teleport/webproxy_key.pem \
  -o /etc/teleport.yaml

# Or create the config manually
sudo tee /etc/teleport.yaml > /dev/null <<'EOF'
version: v3
teleport:
  nodename: teleport-proxy
  data_dir: /var/lib/teleport
  log:
    output: stderr
    severity: INFO

auth_service:
  enabled: "yes"
  cluster_name: "mycluster"
  tokens:
    - "node:your-join-token-here"

  # Authentication settings
  authentication:
    type: local     # or oidc, saml, github
    second_factor: "on"  # Enable MFA
    webauthn:
      rp_id: teleport-proxy.example.com

ssh_service:
  enabled: "yes"
  labels:
    role: "auth-proxy"

proxy_service:
  enabled: "yes"
  web_listen_addr: "0.0.0.0:443"
  public_addr: "teleport-proxy.example.com:443"
  ssh_public_addr: "teleport-proxy.example.com:3023"
  tunnel_listen_addr: "0.0.0.0:3024"
  listen_addr: "0.0.0.0:3023"
EOF
```

### Using Let's Encrypt for TLS

For production, use ACME/Let's Encrypt certificates:

```bash
sudo tee /etc/teleport.yaml > /dev/null <<'EOF'
version: v3
teleport:
  nodename: teleport-proxy
  data_dir: /var/lib/teleport

auth_service:
  enabled: "yes"
  cluster_name: "mycluster"

proxy_service:
  enabled: "yes"
  web_listen_addr: "0.0.0.0:443"
  public_addr: "teleport-proxy.example.com:443"
  acme:
    enabled: "yes"
    email: "admin@example.com"    # Let's Encrypt requires an email
EOF
```

## Starting Teleport

```bash
# Enable and start Teleport
sudo systemctl enable teleport
sudo systemctl start teleport

# Check status
sudo systemctl status teleport

# View logs
sudo journalctl -u teleport -f
```

## Creating the First Admin User

```bash
# Create an admin user (run on the auth server)
sudo tctl users add admin \
  --roles=editor,access \
  --logins=ubuntu,root

# This prints a signup URL like:
# https://teleport-proxy.example.com:443/web/invite/...
# Open this URL in a browser to complete registration and set up MFA
```

## Configuring Firewall

```bash
# Allow Teleport ports
sudo ufw allow 443/tcp comment "Teleport Web UI and HTTPS"
sudo ufw allow 3022/tcp comment "Teleport SSH"
sudo ufw allow 3023/tcp comment "Teleport Proxy SSH"
sudo ufw allow 3024/tcp comment "Teleport Tunnel"
sudo ufw reload
```

## Adding Nodes to the Cluster

### Generating a Join Token

```bash
# On the Teleport auth server, generate a node join token
sudo tctl tokens add --type=node --ttl=1h

# The token looks like:
# Token: abc123def456...
# Valid: 1 hour
```

### Configuring the Node Agent

On each node you want to manage:

```bash
# Install Teleport (same as the proxy installation)
sudo mkdir -p /etc/apt/keyrings
curl https://apt.releases.teleport.dev/gpg \
  | sudo tee /etc/apt/keyrings/teleport-archive-keyring.asc > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/teleport-archive-keyring.asc arch=amd64] https://apt.releases.teleport.dev/ubuntu jammy stable" \
  | sudo tee /etc/apt/sources.list.d/teleport.list
sudo apt update && sudo apt install -y teleport

# Create node configuration
sudo tee /etc/teleport.yaml > /dev/null <<'EOF'
version: v3
teleport:
  nodename: node1
  data_dir: /var/lib/teleport
  auth_token: "abc123def456..."   # Token from the auth server
  proxy_server: teleport-proxy.example.com:443

auth_service:
  enabled: "no"

proxy_service:
  enabled: "no"

ssh_service:
  enabled: "yes"
  labels:
    env: production
    team: backend
    os: ubuntu
EOF

# Start the node agent
sudo systemctl enable teleport
sudo systemctl start teleport

# Verify the node shows up in the cluster
sudo tctl nodes ls  # Run this on the auth server
```

## Using tsh to Connect

`tsh` is the Teleport client CLI:

```bash
# Install tsh on your workstation (same Teleport package includes tsh)
# Login to the cluster
tsh login --proxy=teleport-proxy.example.com --user=admin

# List available nodes
tsh ls

# SSH to a node using its hostname
tsh ssh ubuntu@node1

# SSH using node labels (when the selector matches a single node)
tsh ssh ubuntu@env=production

# Copy files (like scp)
tsh scp localfile.txt ubuntu@node1:/remote/path/

# Port forwarding
tsh ssh -L 8080:localhost:80 ubuntu@node1
```

## Setting Up Role-Based Access Control (RBAC)

Teleport's roles control who can access which nodes:

```bash
# Create a role that allows access to production nodes
sudo tee /tmp/production-role.yaml > /dev/null <<'EOF'
kind: role
version: v7
metadata:
  name: production-access
spec:
  allow:
    logins:
      - ubuntu         # Linux user to log in as
    node_labels:
      env: production  # Only nodes labeled env=production
    rules:
      - resources: [session]
        verbs: [list]        # Can list but not playback others' sessions
  deny:
    logins:
      - root           # Deny root access
EOF

# Apply the role
sudo tctl create -f /tmp/production-role.yaml

# Assign the role to a user
sudo tctl users update admin --set-roles=editor,access,production-access
```

## Session Recording and Audit

One of Teleport's key features is recording SSH sessions:

```bash
# All sessions are automatically recorded
# View audit events in the Web UI: Audit > Audit Log

# List and search sessions
tsh recordings ls

# Play back a recorded session
tsh play <SESSION_ID>

# Export session as text
tsh play --format=text <SESSION_ID> > session.log
```

## Troubleshooting

### Nodes Not Appearing in Cluster

```bash
# Check the node agent logs
sudo journalctl -u teleport -n 50 --no-pager

# Verify proxy connectivity from the node
nc -zv teleport-proxy.example.com 443

# Check that the join token is valid and not expired
sudo tctl tokens ls   # Run on auth server
```

### TLS Certificate Errors

```bash
# View the certificate currently in use
sudo tctl status

# If using self-signed certs, accept them on the client
tsh login --insecure --proxy=teleport-proxy.example.com

# For production with ACME, check proxy logs for renewal errors
sudo journalctl -u teleport -n 100 --no-pager
```

Teleport transforms SSH management from a scattered pile of authorized_keys files into a centralized, auditable system. Once deployed, you can see every session in real time, replay recordings for incident investigation, and grant or revoke access through a single control plane rather than chasing down SSH keys across hundreds of servers.
