# Validation Summary: How to Deploy Portainer on AWS EC2 - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Amazon EC2
- Amazon EBS
- Amazon ECR
- AWS Systems Manager
- AWS CLI
- Docker Engine on Ubuntu

## Sources Consulted
- Portainer CE install with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Docker upgrade guidance noting HTTPS on `9443` and legacy `9000`: https://docs.portainer.io/start/upgrade/docker
- Portainer AWS ECR registry configuration: https://docs.portainer.io/admin/registries/add/ecr
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- AWS Systems Manager agent install for Ubuntu: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-ubuntu.html
- AWS Systems Manager Snap install details for Ubuntu 24.04: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-ubuntu-64-snap.html
- Amazon EBS NVMe device naming on Nitro instances: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- EC2 Instance Connect prerequisites for SSH port behavior: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-prerequisites.html
- AWS CLI `authorize-security-group-ingress` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI `associate-address` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-address.html
- EC2 stop/start behavior and public IPv4 reassignment: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html
- EC2 reboot behavior and public IPv4 retention: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-reboot.html

## Issues Found
- The Docker installation used `https://get.docker.com`, which Docker documents as a convenience script recommended for testing and development rather than production. I replaced it with the official `apt` repository workflow and kept the non-root Docker group step.
- The Portainer deployment exposed `9000` by default and used `portainer/portainer-ce:latest`. Current Portainer guidance uses HTTPS on `9443` by default, treats `9000` as legacy HTTP, and documents stable tags such as `lts` or `sts`. I updated the deploy command to use `9443` and `portainer/portainer-ce:lts`, and I left `9000` as an explicit legacy-only option.
- The EBS example treated `/dev/xvdf` as the mounted device path. AWS documents that Nitro-based instances typically expose attached EBS volumes as NVMe devices whose `/dev/nvme...` names can vary. I changed the instructions to identify the actual device with `lsblk`, use the NVMe path shown by the instance, and persist the mount by filesystem UUID instead of a mutable device name.
- The Systems Manager section was titled as if it covered EC2 Instance Connect and assumed agent installation instead of first verifying it. I narrowed the section to Systems Manager and aligned the commands with AWS’s Ubuntu SSM Agent guidance by checking for the Snap package, installing it only if needed, and then starting/verifying the agent.
- The ECR integration used a custom registry plus a manual `docker login` token flow. Current Portainer documentation provides a dedicated **AWS ECR** registry type that uses AWS credentials and region settings directly in the Portainer UI. I updated the step to match the supported Portainer workflow and noted the recommended IAM policy.
- The Elastic IP explanation said the address would otherwise change on “restart”. AWS distinguishes reboot from stop/start: reboot retains the public IPv4 address, while stop/start can assign a new one. I corrected that wording.

## Review Notes
- The `t3.medium` sizing guidance is a reasonable recommendation for a small setup, but AWS does not define it as a Portainer-specific minimum. Treat it as sizing guidance rather than a hard requirement.
- Portainer’s port `8000` is used for Edge Agent communication and is optional for a standalone local Docker environment. The post does not use Edge Agents, so leaving it closed is consistent with the revised instructions.
