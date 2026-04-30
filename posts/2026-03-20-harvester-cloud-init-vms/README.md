# How to Configure Cloud-Init for VMs in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Cloud-init, Automation

Description: A comprehensive guide to using cloud-init in Harvester VMs for automated configuration, software installation, and post-boot customization.

## Introduction

Cloud-init is the industry-standard mechanism for initial VM configuration on first boot. In Harvester, cloud-init data is passed to VMs through an ephemeral disk attached with the `cloudInitNoCloud` volume source. Cloud-init can configure users, SSH keys, network interfaces, install packages, run commands, write files, and much more - allowing you to create fully configured VMs without manual intervention.

## Cloud-Init Data Structure

For NoCloud data in Harvester, you'll typically work with two types of data:

1. **User Data** (`#cloud-config`): YAML configuration for system settings
2. **Network Data**: Network interface configuration using cloud-init network schema

## Step 1: Basic Cloud-Init Configuration

```yaml
#cloud-config

# Set the system hostname
hostname: web-server-01

# Configure the guest user and authentication
users:
  - name: ubuntu
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... admin@company.com

# Disable root SSH login
disable_root: true

# Disable password authentication (key-only)
ssh_pwauth: false

# Install packages
packages:
  - qemu-guest-agent
  - nginx
  - curl
  - vim
  - htop
  - jq
  - ufw

# Ensure packages are updated on first boot
package_update: true
package_upgrade: false

# Run commands at first boot
runcmd:
  # Enable services
  - systemctl enable --now qemu-guest-agent
  - systemctl enable --now nginx

  # Set timezone
  - timedatectl set-timezone UTC

  # Configure firewall
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw --force enable
```

## Step 2: Apply Cloud-Init in a VM Spec

```yaml
# vm-with-cloud-init.yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: web-server-01
  namespace: default
spec:
  runStrategy: Always
  template:
    spec:
      domain:
        cpu:
          cores: 4
        resources:
          requests:
            memory: 8Gi
        machine:
          type: q35
        devices:
          disks:
            - name: rootdisk
              bootOrder: 1
              disk:
                bus: virtio
            - name: cloudinit
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: web-server-01-root
        - name: cloudinit
          cloudInitNoCloud:
            # Inline user data
            userData: |
              #cloud-config
              hostname: web-server-01
              users:
                - name: ubuntu
                  sudo: ALL=(ALL) NOPASSWD:ALL
                  ssh_authorized_keys:
                    - ssh-ed25519 AAAAC3NzaC1... admin@host
              packages:
                - qemu-guest-agent
                - nginx
              runcmd:
                - systemctl enable --now qemu-guest-agent
                - systemctl enable --now nginx
```

## Step 3: Cloud-Init via Kubernetes Secrets

For reusable or sensitive cloud-init data, use a Kubernetes Secret:

```bash
# Create the cloud-init user data as a secret
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: web-server-cloud-init
  namespace: default
type: Opaque
stringData:
  userdata: |
    #cloud-config
    hostname: web-server-01
    users:
      - name: ubuntu
        sudo: ALL=(ALL) NOPASSWD:ALL
        ssh_authorized_keys:
          - ssh-ed25519 AAAAC3NzaC1... admin@host
    packages:
      - qemu-guest-agent
      - nginx
    runcmd:
      - systemctl enable --now qemu-guest-agent
      - systemctl enable --now nginx
  networkdata: |
    version: 2
    ethernets:
      enp1s0:
        dhcp4: true
EOF
```

Reference the secret in the VM:

```yaml
# vm-with-cloud-init-secret.yaml
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: web-server-01-root
        - name: cloudinit
          cloudInitNoCloud:
            # Reference the secret instead of inline data
            secretRef:
              name: web-server-cloud-init
            networkDataSecretRef:
              name: web-server-cloud-init
```

## Step 4: Advanced Cloud-Init Examples

### Write Configuration Files

```yaml
#cloud-config
users:
  - name: app
    system: true

write_files:
  # Write an nginx configuration
  - path: /etc/nginx/conf.d/app.conf
    permissions: '0644'
    owner: root:root
    content: |
      server {
          listen 80;
          server_name _;

          location / {
              proxy_pass http://localhost:3000;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
          }
      }

  # Write an environment file
  - path: /etc/app/environment
    permissions: '0600'
    owner: app:app
    defer: true
    content: |
      APP_ENV=production
      DB_HOST=10.0.100.5
      DB_PORT=5432

  # Write a systemd service
  - path: /etc/systemd/system/myapp.service
    permissions: '0644'
    content: |
      [Unit]
      Description=My Application
      After=network.target

      [Service]
      Type=simple
      User=app
      WorkingDirectory=/opt/app
      ExecStart=/opt/app/bin/server
      Restart=always
      EnvironmentFile=/etc/app/environment

      [Install]
      WantedBy=multi-user.target
```

### Install Docker and Configure Storage

```yaml
#cloud-config
# Install Docker and configure the daemon
package_update: true
packages:
  - ca-certificates
  - curl

runcmd:
  # Install Docker
  - install -m 0755 -d /etc/apt/keyrings
  - curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  - chmod a+r /etc/apt/keyrings/docker.asc
  - |
    cat > /etc/apt/sources.list.d/docker.sources <<EOF
    Types: deb
    URIs: https://download.docker.com/linux/ubuntu
    Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
    Components: stable
    Architectures: $(dpkg --print-architecture)
    Signed-By: /etc/apt/keyrings/docker.asc
    EOF
  - apt-get update
  - apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  - systemctl enable --now docker
  - usermod -aG docker ubuntu

write_files:
  - path: /etc/docker/daemon.json
    content: |
      {
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "100m",
          "max-file": "3"
        },
        "storage-driver": "overlay2",
        "data-root": "/var/lib/docker"
      }
```

### Configure Static Network

```yaml
# This is the networkdata section (cloud-init network config v2)
version: 2
ethernets:
  enp1s0:
    # Static IP configuration
    addresses:
      - 192.168.1.50/24
    gateway4: 192.168.1.1
    nameservers:
      addresses:
        - 8.8.8.8
        - 8.8.4.4
      search:
        - company.internal
  enp2s0:
    # Second interface for VLAN traffic
    addresses:
      - 10.0.100.50/24
```

## Step 5: Debugging Cloud-Init

```bash
# SSH into the VM and check cloud-init logs
sudo journalctl -u cloud-init -f

# Check cloud-init status
sudo cloud-init status --long

# Re-run cloud-init for testing (use with caution in production)
sudo cloud-init clean --logs --reboot

# View the cloud-init output log
sudo cat /var/log/cloud-init-output.log

# Check if cloud-init completed successfully
sudo cloud-init status
# Expected: status: done
```

## Conclusion

Cloud-init is the most powerful tool for automating VM configuration in Harvester. By embedding your configuration, package installation, and initialization scripts in cloud-init data, you create repeatable, reproducible VM provisioning workflows that configure guests from the first boot. Store sensitive cloud-init data in Kubernetes Secrets, use YAML anchors for reusable configuration blocks, and always validate your cloud-init syntax before deploying to production. A well-crafted cloud-init configuration eliminates hours of manual VM setup work.
