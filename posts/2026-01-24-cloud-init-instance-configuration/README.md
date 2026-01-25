# How to Implement Cloud-init for Instance Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud-init, Cloud Computing, DevOps, Infrastructure Automation, AWS, Azure, GCP

Description: Use cloud-init to configure cloud instances at boot time with user data scripts, package installation, file creation, and integration with configuration management tools.

---

Cloud-init is the industry standard for cloud instance initialization. It runs during the first boot of a virtual machine and configures everything from SSH keys to package installation. Every major cloud provider supports cloud-init, making it essential for consistent instance configuration across AWS, Azure, GCP, and private clouds.

This guide covers cloud-init configuration formats, common use cases, and integration with other automation tools.

## How Cloud-init Works

Cloud-init runs early in the boot process and configures the instance based on metadata and user data.

```mermaid
sequenceDiagram
    participant Instance
    participant Metadata Service
    participant Cloud-init

    Instance->>Metadata Service: Request instance metadata
    Metadata Service-->>Instance: Return metadata + user data
    Instance->>Cloud-init: Parse configuration
    Cloud-init->>Instance: Configure network
    Cloud-init->>Instance: Set hostname
    Cloud-init->>Instance: Create users/SSH keys
    Cloud-init->>Instance: Run user scripts
    Cloud-init->>Instance: Signal completion
```

Cloud-init runs in stages:
1. **Generator**: Detects datasource (AWS, Azure, etc.)
2. **Local**: Network-independent configuration
3. **Network**: Fetch metadata, configure network
4. **Config**: User/group creation, package installation
5. **Final**: User scripts, signals

## User Data Formats

Cloud-init accepts several formats for user data.

### Cloud-config (YAML)

The most common format for declarative configuration.

```yaml
#cloud-config
# This comment line tells cloud-init this is cloud-config format

# Set the hostname
hostname: web-server-01

# Create users
users:
  - name: deploy
    groups: sudo, docker
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... deploy@workstation

# Install packages
packages:
  - nginx
  - docker.io
  - htop
  - vim
  - curl

# Update and upgrade packages
package_update: true
package_upgrade: true

# Write files
write_files:
  - path: /etc/nginx/nginx.conf
    owner: root:root
    permissions: '0644'
    content: |
      user www-data;
      worker_processes auto;
      events {
          worker_connections 1024;
      }
      http {
          include /etc/nginx/mime.types;
          default_type application/octet-stream;
          server {
              listen 80;
              root /var/www/html;
          }
      }

  - path: /var/www/html/index.html
    content: |
      <!DOCTYPE html>
      <html>
      <head><title>Welcome</title></head>
      <body><h1>Server is running</h1></body>
      </html>

# Run commands on first boot
runcmd:
  - systemctl enable nginx
  - systemctl start nginx
  - docker pull nginx:latest

# Set timezone
timezone: UTC

# Final message
final_message: "Instance ready after $UPTIME seconds"
```

### Shell Script

For imperative configuration needs.

```bash
#!/bin/bash
# User data shell script format

set -e  # Exit on error

# Log all output
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting instance configuration..."

# Update packages
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y nginx docker.io htop vim curl

# Configure Nginx
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

# Create web content
echo "<h1>Hello from $(hostname)</h1>" > /var/www/html/index.html

# Start services
systemctl enable nginx
systemctl start nginx

# Add deploy user
useradd -m -s /bin/bash -G sudo,docker deploy
mkdir -p /home/deploy/.ssh
echo "ssh-ed25519 AAAAC3NzaC1..." > /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

echo "Instance configuration complete!"
```

### Multi-part MIME

Combine multiple formats in one user data block.

```python
#!/usr/bin/env python3
# Generate multi-part MIME user data

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Create multipart message
combined = MIMEMultipart()

# Cloud-config part
cloud_config = """#cloud-config
packages:
  - nginx
  - docker.io

users:
  - name: deploy
    groups: sudo
    shell: /bin/bash
"""

# Shell script part
shell_script = """#!/bin/bash
echo "Running custom script..."
systemctl enable nginx
systemctl start nginx
"""

# Add parts
combined.attach(MIMEText(cloud_config, 'cloud-config', 'utf-8'))
combined.attach(MIMEText(shell_script, 'x-shellscript', 'utf-8'))

print(combined.as_string())
```

## Common Configuration Examples

### Web Server with SSL

```yaml
#cloud-config

packages:
  - nginx
  - certbot
  - python3-certbot-nginx

write_files:
  - path: /etc/nginx/sites-available/app
    content: |
      server {
          listen 80;
          server_name app.example.com;
          root /var/www/app;

          location / {
              proxy_pass http://localhost:3000;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
          }
      }

runcmd:
  - ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
  - rm -f /etc/nginx/sites-enabled/default
  - nginx -t
  - systemctl reload nginx
  # Request SSL certificate (requires DNS to be configured)
  # - certbot --nginx -d app.example.com --non-interactive --agree-tos -m admin@example.com
```

### Docker Host

```yaml
#cloud-config

packages:
  - docker.io
  - docker-compose

groups:
  - docker

users:
  - name: deploy
    groups: docker, sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3...

write_files:
  - path: /etc/docker/daemon.json
    content: |
      {
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "100m",
          "max-file": "3"
        },
        "storage-driver": "overlay2"
      }

  - path: /opt/app/docker-compose.yml
    owner: deploy:deploy
    content: |
      version: '3.8'
      services:
        web:
          image: nginx:latest
          ports:
            - "80:80"
          restart: unless-stopped

runcmd:
  - systemctl enable docker
  - systemctl start docker
  - cd /opt/app && docker-compose up -d
```

### Database Server

```yaml
#cloud-config

packages:
  - postgresql-15
  - postgresql-contrib-15

write_files:
  - path: /etc/postgresql/15/main/pg_hba.conf
    owner: postgres:postgres
    permissions: '0640'
    defer: true
    content: |
      # Local connections
      local   all             all                                     peer
      # IPv4 local connections
      host    all             all             127.0.0.1/32            scram-sha-256
      # Allow app servers
      host    all             all             10.0.0.0/8              scram-sha-256

  - path: /etc/postgresql/15/main/conf.d/custom.conf
    owner: postgres:postgres
    defer: true
    content: |
      listen_addresses = '*'
      max_connections = 200
      shared_buffers = 256MB
      effective_cache_size = 768MB
      work_mem = 4MB

runcmd:
  - systemctl restart postgresql
  - sudo -u postgres psql -c "CREATE USER app WITH PASSWORD 'secure_password';"
  - sudo -u postgres psql -c "CREATE DATABASE appdb OWNER app;"
```

## Integration with Configuration Management

Bootstrap instances to connect to your configuration management system.

### Ansible Pull

```yaml
#cloud-config

packages:
  - ansible
  - git

runcmd:
  - ansible-pull -U https://github.com/company/ansible-configs.git -i localhost, site.yml
```

### Chef Bootstrap

```yaml
#cloud-config

packages:
  - curl

write_files:
  - path: /etc/chef/client.rb
    content: |
      chef_server_url 'https://chef.example.com/organizations/myorg'
      node_name '${HOSTNAME}'
      validation_client_name 'myorg-validator'

  - path: /etc/chef/validation.pem
    permissions: '0600'
    content: |
      -----BEGIN RSA PRIVATE KEY-----
      ... validator key content ...
      -----END RSA PRIVATE KEY-----

runcmd:
  - curl -L https://omnitruck.chef.io/install.sh | bash
  - chef-client -j /etc/chef/first-boot.json
```

### Puppet Bootstrap

```yaml
#cloud-config

runcmd:
  - wget https://apt.puppet.com/puppet8-release-jammy.deb
  - dpkg -i puppet8-release-jammy.deb
  - apt-get update
  - apt-get install -y puppet-agent
  - /opt/puppetlabs/bin/puppet config set server puppet.example.com
  - /opt/puppetlabs/bin/puppet agent --test --waitforcert 60
```

## Cloud Provider Specifics

### AWS EC2

```bash
# Pass user data via AWS CLI
aws ec2 run-instances \
  --image-id ami-0abc123 \
  --instance-type t3.medium \
  --user-data file://cloud-init.yaml \
  --key-name my-key \
  --subnet-id subnet-123
```

### Azure

```bash
# Pass custom data via Azure CLI
az vm create \
  --resource-group mygroup \
  --name myvm \
  --image Ubuntu2204 \
  --custom-data cloud-init.yaml \
  --admin-username azureuser \
  --ssh-key-values ~/.ssh/id_ed25519.pub
```

### Google Cloud

```bash
# Pass startup script via gcloud
gcloud compute instances create myvm \
  --zone us-central1-a \
  --machine-type e2-medium \
  --image-family ubuntu-2204-lts \
  --image-project ubuntu-os-cloud \
  --metadata-from-file user-data=cloud-init.yaml
```

## Debugging Cloud-init

Troubleshoot configuration issues on running instances.

```bash
# Check cloud-init status
cloud-init status

# View cloud-init logs
cat /var/log/cloud-init.log
cat /var/log/cloud-init-output.log

# Re-run cloud-init (useful for testing)
sudo cloud-init clean
sudo cloud-init init
sudo cloud-init modules --mode=config
sudo cloud-init modules --mode=final

# Query cloud-init data
cloud-init query --all

# Validate cloud-config syntax
cloud-init schema --config-file cloud-init.yaml
```

## Best Practices

1. **Keep it idempotent**: Scripts should be safe to run multiple times
2. **Use cloud-config over scripts**: Declarative format is easier to maintain
3. **Log everything**: Redirect output for debugging
4. **Fail fast**: Use `set -e` in shell scripts
5. **Minimize user data size**: Large user data increases boot time
6. **Use write_files for configs**: Avoid heredocs in runcmd
7. **Test locally**: Use `cloud-init` command to validate before deploying

---

Cloud-init provides a consistent way to initialize instances across all major cloud providers. Start with simple package installation and user creation, then build up to complex configurations that bootstrap into your configuration management system. The initial setup you define in cloud-init becomes the foundation for all subsequent automation.
