# How to Automate Portainer Deployment with Cloud-Init - Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloud-init, Automation, DevOps, Docker, Infrastructure, Cloud

Description: Automate the full Portainer installation on any cloud VM or bare-metal server using a Cloud-Init user-data script, so new nodes are ready to manage containers from first boot.

---

Manually installing Portainer on every new server is tedious. Cloud-Init is a standard mechanism supported by virtually every cloud provider (AWS, GCP, Azure, DigitalOcean, Hetzner) and most Linux distributions for provisioning tasks on first boot. Combining Cloud-Init with Portainer means every new VM you spin up is automatically a container management node.

## How Cloud-Init Works

When a virtual machine starts for the first time, Cloud-Init reads the **user-data** script provided at instance creation, then runs it as root during the boot sequence. This is where you can install Docker, pull Portainer, and configure it - all without SSH access.

## Complete Cloud-Init Script

The following user-data script installs Docker Engine, deploys Portainer Community Edition, and leaves a ready-to-use Portainer instance:

```yaml
#cloud-config
# Cloud-Init user-data for Portainer auto-deployment

# Tested on Ubuntu 22.04 LTS and Debian 12

package_update: true
package_upgrade: true

packages:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg
  - lsb-release

runcmd:
  # 1. Install Docker Engine
  - curl -fsSL https://get.docker.com | sh

  # 2. Enable and start Docker on boot
  - systemctl enable docker
  - systemctl start docker

  # 3. Create persistent volume for Portainer data
  - docker volume create portainer_data

  # 4. Deploy Portainer CE (Community Edition)
  - >
    docker run -d
    --name portainer
    --restart=always
    -p 8000:8000
    -p 9443:9443
    -v /var/run/docker.sock:/var/run/docker.sock
    -v portainer_data:/data
    portainer/portainer-ce:lts

# Write a README to /root so operators know Portainer is ready
write_files:
  - path: /root/PORTAINER_INFO.txt
    content: |
      Portainer deployed at: https://<THIS_SERVER_IP>:9443
      Default admin setup required on first login.
      Installed by Cloud-Init on first boot.
```

## Using with AWS EC2

When launching an EC2 instance via the AWS Console or CLI, paste the user-data in the Advanced Details section and use a security group that allows inbound TCP 9443 (and 8000 only if you need Edge agents):

```bash
# Launch EC2 with user-data from a file
aws ec2 run-instances \
  --image-id ami-xxxxxxxxxxxxxxxxx \
  --instance-type t3.small \
  --count 1 \
  --key-name my-key \
  --security-group-ids sg-0abc123 \
  --user-data file://portainer-cloud-init.yaml
```

## Using with Terraform

For repeatable infrastructure, pass the Cloud-Init script via Terraform:

```hcl
# terraform/main.tf
resource "aws_instance" "portainer_node" {
  ami           = "ami-xxxxxxxxxxxxxxxxx" # Replace with a current Ubuntu or Debian AMI for your AWS Region
  instance_type = "t3.small"

  # Read the cloud-init file and pass it as user_data
  user_data = file("${path.module}/portainer-cloud-init.yaml")

  tags = {
    Name = "portainer-node"
  }
}
```

## Verifying the Deployment

After the instance boots (allow 3-5 minutes for Cloud-Init to complete), visit:

```text
https://<instance-ip>:9443
```

You will be prompted to set an admin password and configure your first environment.

## Tips for Production

- Store the admin password as a cloud provider secret and pass it to Portainer with `--admin-password-file` during first boot
- Use a private Docker registry for pulling custom images alongside Portainer
- For Swarm clusters, initialize or join the swarm with separate Cloud-Init steps, then deploy Portainer once using Portainer's Docker Swarm installation method

## Summary

Cloud-Init combined with Portainer gives you a fully automated provisioning pipeline. Any new VM you create will have Portainer running and ready for container management within minutes of first boot.
