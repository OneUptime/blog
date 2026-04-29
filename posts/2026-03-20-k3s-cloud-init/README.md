# How to Deploy K3s with cloud-init

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Cloud-init, Automation, Infrastructure as Code, DevOps

Description: Learn how to automate K3s installation and configuration on cloud and bare-metal instances using cloud-init for repeatable, unattended deployments.

## Introduction

cloud-init is the industry-standard method for initializing cloud instances and virtual machines during their first boot. By embedding K3s installation and configuration in cloud-init user data, you can provision fully configured K3s nodes automatically without any manual intervention. This guide covers writing cloud-init configurations for K3s server and agent nodes.

## Understanding cloud-init

cloud-init processes user data on first boot and supports multiple formats:
- **Cloud Config** (`#cloud-config`): YAML-based declarative configuration
- **Shell script** (`#!/bin/bash`): Execute arbitrary scripts
- **Multi-part MIME**: Combine multiple formats

## Step 1: Basic K3s Server cloud-init

```yaml
#cloud-config
# K3s Server Node cloud-init configuration

# Update and upgrade packages on first boot

package_update: true
package_upgrade: true

# Install required packages
packages:
  - curl
  - wget
  - git
  - jq
  - nfs-common

# Create K3s configuration directory and files
write_files:
  # K3s server configuration
  - path: /etc/rancher/k3s/config.yaml
    permissions: '0644'
    content: |
      write-kubeconfig-mode: "0644"
      token: "your-secure-token-here"
      disable:
        - traefik
      kubelet-arg:
        - "max-pods=50"
        - "system-reserved=cpu=200m,memory=256Mi"
      node-label:
        - "provisioned-by=cloud-init"
        - "environment=production"

  # Install script
  - path: /usr/local/bin/install-k3s.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      set -euo pipefail

      # Install K3s server
      curl -sfL https://get.k3s.io | \
        INSTALL_K3S_CHANNEL=stable \
        sh -

      # Wait for K3s to be ready
      until kubectl get nodes 2>/dev/null | grep -q Ready; do
        sleep 5
        echo "Waiting for K3s to be ready..."
      done

      echo "K3s server is ready!"
      kubectl get nodes

# Run commands during first boot
runcmd:
  # Set hostname
  - hostnamectl set-hostname k3s-server-01

  # Install K3s
  - /usr/local/bin/install-k3s.sh

  # Copy kubeconfig for the ubuntu user on Ubuntu cloud images
  - mkdir -p /home/ubuntu/.kube
  - cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
  - chown -R ubuntu:ubuntu /home/ubuntu/.kube

  # Log completion
  - echo "K3s server initialization complete" | logger -t cloud-init

# Send notification when done
final_message: "K3s server initialization complete after $uptime seconds"
```

## Step 2: K3s Agent Node cloud-init

```yaml
#cloud-config
# K3s Agent Node cloud-init configuration

package_update: true
package_upgrade: true

packages:
  - curl
  - wget

write_files:
  # Agent configuration
  - path: /etc/rancher/k3s/config.yaml
    permissions: '0644'
    content: |
      server: "https://k3s-server-01.example.com:6443"
      token: "your-secure-token-here"
      node-label:
        - "role=worker"
        - "environment=production"
      kubelet-arg:
        - "max-pods=50"

  # Install script for agent
  - path: /usr/local/bin/install-k3s-agent.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      set -euo pipefail

      # Install K3s agent
      curl -sfL https://get.k3s.io | \
        INSTALL_K3S_CHANNEL=stable \
        INSTALL_K3S_EXEC="agent" \
        sh -

      echo "K3s agent installed and service started!"

runcmd:
  - hostnamectl set-hostname k3s-agent-01
  - /usr/local/bin/install-k3s-agent.sh

final_message: "K3s agent initialization complete after $uptime seconds"
```

## Step 3: Generate cloud-init with a Heredoc

For more complex setups, you can generate cloud-init from a shell script:

```bash
#!/bin/bash
# generate-cloud-init.sh

K3S_TOKEN="$(openssl rand -hex 32)"
SERVER_IP="192.168.1.10"

cat > cloud-init-server.yaml << EOF
#cloud-config
hostname: k3s-server-01

write_files:
  - path: /etc/rancher/k3s/config.yaml
    content: |
      write-kubeconfig-mode: "0644"
      token: "$K3S_TOKEN"
      cluster-init: true
      disable:
        - traefik
      tls-san:
        - "$SERVER_IP"
        - "k3s.example.com"
      etcd-snapshot-schedule-cron: "0 */6 * * *"
      etcd-snapshot-retention: 5

runcmd:
  - curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=stable sh -
  - systemctl enable k3s

EOF

echo "Cloud-init server config generated with token: $K3S_TOKEN"
```

## Step 4: cloud-init for Terraform/Packer

Use cloud-init in Terraform:

```hcl
# main.tf
data "aws_ssm_parameter" "ubuntu_2204_ami" {
  name = "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
}

resource "random_password" "k3s_token" {
  length  = 48
  special = false
}

resource "aws_instance" "k3s_server" {
  ami           = data.aws_ssm_parameter.ubuntu_2204_ami.value
  instance_type = "t3.medium"

  user_data = templatefile("cloud-init-server.yaml.tpl", {
    k3s_channel = "stable"
    k3s_token   = random_password.k3s_token.result
  })

  tags = {
    Name = "k3s-server"
    Role = "k3s-control-plane"
  }
}

resource "aws_instance" "k3s_agent" {
  count         = 3
  ami           = data.aws_ssm_parameter.ubuntu_2204_ami.value
  instance_type = "t3.small"
  depends_on    = [aws_instance.k3s_server]

  user_data = templatefile("cloud-init-agent.yaml.tpl", {
    k3s_channel = "stable"
    k3s_token   = random_password.k3s_token.result
    server_ip   = aws_instance.k3s_server.private_ip
  })
}
```

```yaml
# cloud-init-server.yaml.tpl
#cloud-config
write_files:
  - path: /etc/rancher/k3s/config.yaml
    content: |
      token: "${k3s_token}"
      cluster-init: true

runcmd:
  - curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=${k3s_channel} sh -
```

## Step 5: Post-Installation Setup in cloud-init

```yaml
#cloud-config
# cloud-init that installs K3s and then deploys applications

runcmd:
  # Install K3s
  - curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=stable sh -

  # Wait for K3s to be ready
  - |
    until kubectl get nodes 2>/dev/null | grep -q Ready; do
      echo "Waiting for K3s..."
      sleep 5
    done

  # Install Helm
  - curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

  # Install cert-manager
  - |
    helm repo add jetstack https://charts.jetstack.io --force-update
    helm install cert-manager jetstack/cert-manager \
      --namespace cert-manager \
      --create-namespace \
      --set crds.enabled=true

  # Deploy application from Git
  - kubectl apply -k https://github.com/your-org/k3s-apps//overlays/production

  # Export kubeconfig for the ubuntu user on Ubuntu cloud images
  - |
    mkdir -p /home/ubuntu/.kube
    cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
    sed -i "s/127.0.0.1/$(hostname -I | awk '{print $1}')/g" /home/ubuntu/.kube/config
    chown -R ubuntu:ubuntu /home/ubuntu/.kube
```

## Step 6: Verify cloud-init Completion

```bash
# On the provisioned node, check cloud-init status
cloud-init status

# View cloud-init logs
cat /var/log/cloud-init.log
cat /var/log/cloud-init-output.log

# Check if cloud-init ran successfully
cloud-init status --wait
echo "Exit code: $?"

# View the cloud-init execution timeline
cloud-init analyze show
```

## Conclusion

cloud-init enables fully automated, repeatable K3s deployments on any cloud or VM platform. By encoding your K3s configuration and installation steps in cloud-init user data, you eliminate manual configuration steps and ensure consistency across all nodes. This approach integrates well with infrastructure-as-code tools like Terraform, making it the standard method for provisioning K3s nodes at scale. For edge deployments, pre-bake cloud-init configurations into custom OS images (using Packer) for even faster node provisioning.
