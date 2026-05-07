# Validation Summary: How to Automate Portainer Deployment with Cloud-Init - Deployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cloud-Init
- Portainer Community Edition
- Docker Engine
- AWS EC2
- AWS CLI
- Terraform

## Sources Consulted
- cloud-init documentation: Module reference (`runcmd`) - https://docs.cloud-init.io/en/latest/reference/modules.html
- cloud-init documentation: `write_files` examples - https://docs.cloud-init.io/en/latest/reference/yaml_examples/write_files.html
- Portainer documentation: Install Portainer CE with Docker on Linux - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer documentation: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer documentation: Install Portainer CE with Docker Swarm on Linux - https://docs.portainer.io/start/install-ce/server/swarm/linux
- Docker documentation: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker documentation: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Amazon EC2 User Guide: Run commands when you launch an EC2 instance with user data input - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- AWS CLI Command Reference: `ec2 run-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Terraform language documentation: `file` function - https://developer.hashicorp.com/terraform/language/functions/file

## Issues Found
- The post said the script deployed Portainer Business Edition, but the container image was Portainer CE. I corrected the description to match the actual deployment.
- The script used the floating `portainer/portainer-ce:latest` tag. I changed it to the documented `portainer/portainer-ce:lts` tag and aligned the restart flag with Portainer's documented `docker run` example.
- The script claimed to configure the firewall with UFW, but Docker's official documentation states that published container ports bypass UFW rules. I removed the UFW package and commands and updated the AWS section to rely on security group rules for exposed ports.
- The AWS CLI and Terraform examples used a stale, region-specific AMI ID. I replaced it with a placeholder AMI and added a note to use a current Ubuntu or Debian image for the target Region.
- The production tip about injecting the admin password via environment variables was misleading for Portainer's documented setup flow. I corrected it to use Portainer's `--admin-password-file` option during first boot.
- The Swarm guidance suggested running this standalone Portainer deployment on all manager nodes. I corrected that to initialize or join the swarm separately and deploy Portainer once using Portainer's Docker Swarm installation method.

## Review Notes
- Docker's `get.docker.com` convenience script still works for automated installs, but Docker's official docs recommend the repository-based installation method for production environments and more controlled upgrades.
- Portainer's port `8000` is only required if you plan to use Edge agents. The post now makes that explicit in the AWS security group guidance.
