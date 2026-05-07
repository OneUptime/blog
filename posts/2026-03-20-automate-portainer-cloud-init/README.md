# How to Automate Portainer Deployment with Cloud-Init

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloud-init, Automation, Cloud, Infrastructure as Code

Description: Use cloud-init to automatically install Docker and deploy Portainer on new cloud instances or VMs with zero manual intervention.

## Introduction

Cloud-init is the industry-standard multi-distribution method for cross-platform cloud instance initialization. When a new virtual machine or cloud instance boots for the first time, cloud-init runs your configuration scripts to set up the system. By combining cloud-init with Portainer, you can have a fully configured container management platform ready within minutes of launching a new instance - completely automated.

## Prerequisites

- Cloud provider account (AWS, GCP, Azure, DigitalOcean, Hetzner, etc.)
- Basic understanding of YAML
- SSH key pair for instance access
- Ubuntu 22.04 or Debian 12 base image

## Step 1: Basic Cloud-Init Structure

Cloud-init uses a YAML file called user-data that's passed to instances at launch:

```yaml
#cloud-config
# The #cloud-config header is required - it identifies this as a cloud-init file

# System configuration

package_update: true
package_upgrade: true
packages:
  - curl
  - wget
  - git
  - htop
  - unzip

# Create users
users:
  - default
  - name: portainer-admin
    groups: [sudo]
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - "ssh-rsa AAAA... your-public-key"
```

## Step 2: Complete Portainer Deployment Cloud-Init

This cloud-init configuration installs Docker and deploys Portainer in one step:

```yaml
#cloud-config
# Portainer Auto-Deployment Cloud-Init Configuration
# Compatible with Ubuntu 22.04 and Debian 12

package_update: true
package_upgrade: false

packages:
  - curl
  - wget
  - apt-transport-https
  - ca-certificates
  - gnupg
  - lsb-release
  - openssl
  - ufw

# Write configuration files
write_files:
  # Docker daemon configuration
  - path: /etc/docker/daemon.json
    content: |
      {
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "100m",
          "max-file": "3"
        },
        "storage-driver": "overlay2",
        "live-restore": true
      }
    owner: root:root
    permissions: '0644'
  
  # Portainer docker-compose configuration
  - path: /opt/portainer/docker-compose.yml
    content: |
      services:
        portainer:
          image: portainer/portainer-ce:lts
          container_name: portainer
          restart: always
          command:
            - --admin-password-file
            - /run/secrets/portainer-admin-password
          ports:
            - "9443:9443"
            - "8000:8000"
          volumes:
            - /var/run/docker.sock:/var/run/docker.sock
            - portainer-data:/data
            - /opt/portainer/admin_password.txt:/run/secrets/portainer-admin-password:ro
          logging:
            driver: json-file
            options:
              max-size: "50m"
              max-file: "3"
      volumes:
        portainer-data:
    owner: root:root
    permissions: '0644'
  
  # Portainer initialization script
  - path: /opt/portainer/init.sh
    content: |
      #!/bin/bash
      set -euo pipefail
      
      echo "=== Installing Docker ==="
      curl -fsSL https://get.docker.com | sh
      systemctl enable docker
      systemctl start docker
      
      echo "=== Installing Docker Compose Plugin ==="
      apt-get install -y docker-compose-plugin 2>/dev/null || true

      echo "=== Generating Portainer admin password ==="
      if [ ! -s /opt/portainer/admin_password.txt ]; then
        printf 'P0rtainer!%s' "$(openssl rand -hex 12)" > /opt/portainer/admin_password.txt
        chmod 600 /opt/portainer/admin_password.txt
      fi
      
      echo "=== Starting Portainer ==="
      cd /opt/portainer
      docker compose up -d
      
      echo "=== Waiting for Portainer to start ==="
      for i in $(seq 1 30); do
        if curl -sk https://localhost:9443/api/system/status | grep -q "Version"; then
          echo "Portainer is ready!"
          break
        fi
        echo "Waiting... ($i/30)"
        sleep 5
      done
      
      echo "=== Portainer deployment complete ==="
      echo "Initial Portainer admin password saved to: /opt/portainer/admin_password.txt"
      echo "Access Portainer at: https://<your-server-ip>:9443"
    owner: root:root
    permissions: '0755'
  
  # Firewall configuration
  - path: /opt/portainer/setup-firewall.sh
    content: |
      #!/bin/bash
      # Configure UFW firewall
      ufw allow ssh
      ufw allow 9443/tcp comment "Portainer HTTPS"
      ufw allow 8000/tcp comment "Portainer Edge Agent"
      ufw --force enable
    owner: root:root
    permissions: '0755'

# Run commands in order
runcmd:
  # Install Docker and deploy Portainer
  - [bash, /opt/portainer/init.sh]
  
  # Configure firewall
  - [bash, /opt/portainer/setup-firewall.sh]

# Send notification when complete
phone_home:
  url: "https://your-webhook.example.com/cloud-init/complete"
  tries: 3
```

## Step 3: AWS EC2 Deployment

Launch an EC2 instance with the cloud-init configuration:

```bash
# Save cloud-init config
cat > portainer-userdata.yaml << 'USERDATA'
#cloud-config
# ... (paste the config from Step 2)
USERDATA

# Launch EC2 instance with user-data
aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id \
  --instance-type t3.medium \
  --key-name my-key-pair \
  --security-group-ids sg-12345678 \
  --user-data file://portainer-userdata.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=portainer-server}]' \
  --region us-east-1

# Check instance status
aws ec2 describe-instances \
  --region us-east-1 \
  --filters "Name=tag:Name,Values=portainer-server" \
  --query 'Reservations[].Instances[].{ID:InstanceId,State:State.Name,IP:PublicIpAddress}'
```

## Step 4: Hetzner Cloud Deployment

```bash
# Using Hetzner Cloud CLI (hcloud)
hcloud server create \
  --name portainer-server \
  --type cpx22 \
  --image ubuntu-22.04 \
  --ssh-key my-key \
  --user-data-from-file portainer-userdata.yaml \
  --location nbg1

# Check the server status
hcloud server describe portainer-server
```

## Step 5: DigitalOcean Droplet Deployment

```bash
# Using DigitalOcean CLI (doctl)
doctl compute droplet create portainer-server \
  --region nyc3 \
  --size s-2vcpu-2gb \
  --image ubuntu-22-04-x64 \
  --ssh-keys your-key-id \
  --user-data-file portainer-userdata.yaml \
  --wait
```

## Step 6: Cloud-Init for Portainer Edge Agent

Deploy the lightweight Edge Agent on edge nodes:

```yaml
#cloud-config
# Portainer Edge Agent Cloud-Init
# Use this for remote edge nodes that connect back to central Portainer

packages:
  - curl

write_files:
  - path: /opt/portainer-agent/deploy.sh
    content: |
      #!/bin/bash
      set -euo pipefail

      # Install Docker
      curl -fsSL https://get.docker.com | sh
      
      # Deploy Portainer Edge Agent
      # Replace EDGE_ID and EDGE_KEY with the values from the Portainer UI
      docker run -d \
        --name portainer_edge_agent \
        --restart always \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v /var/lib/docker/volumes:/var/lib/docker/volumes \
        -v /:/host \
        -v portainer_agent_data:/data \
        -e EDGE=1 \
        -e EDGE_ID=your-edge-id \
        -e EDGE_KEY=your-edge-key \
        -e EDGE_INSECURE_POLL=1 \
        portainer/agent:lts
    permissions: '0755'

runcmd:
  - [bash, /opt/portainer-agent/deploy.sh]
```

## Verifying Cloud-Init Execution

```bash
# Check cloud-init status
cloud-init status

# View cloud-init logs
cat /var/log/cloud-init.log
cat /var/log/cloud-init-output.log

# Check if Portainer is running
docker ps | grep portainer
curl -sk https://localhost:9443/api/system/status
```

## Conclusion

Cloud-init automates Portainer deployment to a point where new instances are fully configured with no manual intervention. Whether you're launching EC2 instances for development environments, provisioning edge nodes in remote locations, or building immutable infrastructure, cloud-init ensures consistent, reproducible Portainer deployments. Combined with cloud provider APIs or infrastructure as code tools like Terraform, you can scale this approach to provision Portainer across entire fleets of servers automatically.
