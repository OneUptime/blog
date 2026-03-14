# How to Use cloud-init to Automate Ubuntu Server Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cloud-init, Automation, DevOps, Cloud

Description: Learn how to write cloud-init user-data configurations to fully automate Ubuntu Server setup, including users, packages, files, and post-install commands across cloud providers and bare metal.

---

cloud-init is the standard tool for automating Linux server initialization across cloud providers and bare-metal deployments. It runs on the first boot of a new instance and processes a configuration file (called user-data) that you provide. Ubuntu has supported cloud-init since 2011, and it is baked into every Ubuntu cloud image. Understanding cloud-init well means you can provision a new Ubuntu server in any environment - AWS, Azure, GCP, Hetzner, or local VMs - with a fully configured system on the very first boot, no manual steps required.

## How cloud-init Works

On first boot, cloud-init:

1. Detects the data source (AWS, Azure, OpenStack, local nocloud, etc.)
2. Fetches user-data from the data source
3. Parses the user-data and runs modules in order
4. Marks the instance as initialized so it does not run again

Subsequent boots run only a subset of modules (like network configuration updates). The full initialization only happens once unless you reset the state.

## User-Data Formats

cloud-init accepts several user-data formats. The most common is cloud-config (YAML), identified by the `#cloud-config` header:

```yaml
#cloud-config
# This line is required - cloud-init identifies the format from it
```

Other formats include shell scripts (starting with `#!/bin/sh`), and multi-part MIME archives combining multiple formats.

## A Minimal cloud-config

A basic cloud-config to set up a server with a user, SSH key, and updated packages:

```yaml
#cloud-config

# System hostname
hostname: my-server
fqdn: my-server.example.com
manage_etc_hosts: true

# Create user accounts
users:
  - name: deploy
    gecos: Deploy User
    groups: sudo, docker
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAbcdefghijklmnopqrstuvwxyz your@email.com

# Disable root login and password auth (SSH hardening)
disable_root: true
ssh_pwauth: false

# Update and upgrade packages on first boot
package_update: true
package_upgrade: true

# Install packages
packages:
  - curl
  - wget
  - git
  - vim
  - htop
  - ufw
  - fail2ban
  - unattended-upgrades
```

## Writing Files

The `write_files` module creates files before `runcmd` runs. Use it for configuration files:

```yaml
#cloud-config

write_files:
  # Nginx configuration
  - path: /etc/nginx/sites-available/default
    owner: root:root
    permissions: '0644'
    content: |
      server {
          listen 80 default_server;
          server_name _;
          root /var/www/html;
          index index.html;
          location / {
              try_files $uri $uri/ =404;
          }
      }

  # Custom SSH configuration
  - path: /etc/ssh/sshd_config.d/hardening.conf
    owner: root:root
    permissions: '0600'
    content: |
      PasswordAuthentication no
      PermitRootLogin no
      PubkeyAuthentication yes
      MaxAuthTries 3
      LoginGraceTime 30

  # UFW application profile
  - path: /etc/ufw/applications.d/myapp
    content: |
      [MyApp]
      title=My Application
      description=Custom application
      ports=8080/tcp
```

## Running Commands

Use `runcmd` for commands that need to run after packages are installed and files are written. Commands run as root:

```yaml
#cloud-config

packages:
  - nginx
  - ufw

runcmd:
  # Configure UFW firewall
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow ssh
  - ufw allow http
  - ufw allow https
  - ufw --force enable

  # Start and enable nginx
  - systemctl enable nginx
  - systemctl start nginx

  # Configure fail2ban
  - systemctl enable fail2ban
  - systemctl start fail2ban

  # Create application directory
  - mkdir -p /var/www/html
  - chown -R www-data:www-data /var/www/html
  - chmod -R 755 /var/www/html
```

## Setting Up a Complete Application Server

Here is a comprehensive cloud-config for a Node.js application server:

```yaml
#cloud-config

hostname: app-server-01
manage_etc_hosts: true

users:
  - name: app
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... your_key_here

package_update: true
package_upgrade: true

packages:
  - curl
  - git
  - ufw
  - nginx

write_files:
  - path: /etc/nginx/sites-available/app
    content: |
      server {
          listen 80;
          server_name _;
          location / {
              proxy_pass http://localhost:3000;
              proxy_http_version 1.1;
              proxy_set_header Upgrade $http_upgrade;
              proxy_set_header Connection 'upgrade';
              proxy_set_header Host $host;
              proxy_cache_bypass $http_upgrade;
          }
      }

  - path: /etc/systemd/system/app.service
    content: |
      [Unit]
      Description=Node.js App
      After=network.target

      [Service]
      Type=simple
      User=app
      WorkingDirectory=/home/app/myapp
      ExecStart=/usr/bin/node server.js
      Restart=on-failure

      [Install]
      WantedBy=multi-user.target

runcmd:
  # Install Node.js via NodeSource
  - curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  - apt-get install -y nodejs

  # Configure nginx
  - ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
  - rm -f /etc/nginx/sites-enabled/default
  - nginx -t && systemctl restart nginx
  - systemctl enable nginx

  # Configure firewall
  - ufw allow ssh
  - ufw allow http
  - ufw allow https
  - ufw --force enable

final_message: |
  App server is ready. SSH in with: ssh app@<IP>
  Setup took $UPTIME seconds.
```

## cloud-init on Different Platforms

### AWS EC2

Paste user-data in the EC2 launch wizard under "Advanced Details - User data", or pass it via AWS CLI:

```bash
# Launch an EC2 instance with user-data
aws ec2 run-instances \
    --image-id ami-0c7217cdde317cfec \
    --instance-type t3.micro \
    --key-name my-key \
    --user-data file://cloud-config.yaml \
    --security-group-ids sg-xxxxxxxxx \
    --subnet-id subnet-xxxxxxxxx
```

### Hetzner Cloud

```bash
# Create a Hetzner cloud server with cloud-init
hcloud server create \
    --name my-server \
    --type cx21 \
    --image ubuntu-24.04 \
    --user-data-from-file cloud-config.yaml \
    --ssh-key my-key
```

### DigitalOcean

```bash
# Create a DigitalOcean droplet with user-data
doctl compute droplet create my-server \
    --image ubuntu-24-04-x64 \
    --size s-1vcpu-1gb \
    --region nyc3 \
    --ssh-keys my-key-id \
    --user-data-file cloud-config.yaml
```

### Local VMs (nocloud datasource)

For VMs without a cloud provider, use the `nocloud` datasource. Create an ISO containing your user-data:

```bash
# Create user-data and meta-data files
cat > user-data << 'EOF'
#cloud-config
hostname: test-server
users:
  - name: admin
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAA... your_key
EOF

cat > meta-data << 'EOF'
instance-id: test-vm-001
local-hostname: test-server
EOF

# Package into an ISO
genisoimage -output cloud-init.iso -volid cidata -joliet -rock user-data meta-data
```

Attach the ISO to the VM as a second CD drive. cloud-init reads from it on first boot.

## Debugging cloud-init

If your user-data does not work as expected:

```bash
# View cloud-init logs
sudo cat /var/log/cloud-init.log
sudo cat /var/log/cloud-init-output.log

# Check cloud-init status
cloud-init status --long

# Re-run cloud-init (for testing - this re-runs on the current instance)
sudo cloud-init clean --logs
sudo cloud-init init
sudo cloud-init modules --mode=config
sudo cloud-init modules --mode=final

# Validate user-data syntax without running it
cloud-init schema --config-file user-data.yaml
```

## Combining cloud-init with Terraform

A common pattern is generating cloud-init user-data from Terraform templates:

```hcl
# main.tf
data "cloudinit_config" "server" {
  gzip          = false
  base64_encode = false

  part {
    content_type = "text/cloud-config"
    content = templatefile("cloud-config.yaml.tpl", {
      ssh_key  = var.ssh_public_key
      hostname = var.hostname
    })
  }
}

resource "hcloud_server" "main" {
  name        = var.hostname
  image       = "ubuntu-24.04"
  server_type = "cx21"
  user_data   = data.cloudinit_config.server.rendered
}
```

cloud-init is one of the most valuable tools in a Linux sysadmin's toolkit. Mastering it means you can go from a new cloud instance to a fully configured, secured, application-ready server in the time it takes for the VM to boot - without touching a keyboard on the remote end.
