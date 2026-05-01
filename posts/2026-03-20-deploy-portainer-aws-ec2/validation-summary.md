# Validation Summary: How to Deploy Portainer on AWS EC2

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS EC2
- AWS Security Groups
- Amazon EBS
- OpenTofu
- Terraform AWS provider
- Docker
- Portainer CE
- Amazon Linux

## Sources Consulted
- Portainer CE Docker install docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer initial setup docs: https://docs.portainer.io/start/install-ce/server/setup
- Portainer FAQ on the first-install 5-minute timeout: https://docs.portainer.io/faqs/installing/i-just-installed-portainer-but-i-cant-access-the-ui-how-do-i-fix-this
- AWS EC2 user data docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Amazon Linux 2 Extras Library: https://docs.aws.amazon.com/linux/al2/ug/al2-extras.html
- Amazon Linux 2023 package management docs: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- AWS EBS NVMe device naming docs: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- AWS provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- OpenTofu `output` command docs: https://opentofu.org/docs/cli/commands/output/

## Issues Found
- The `aws_instance.user_data` example incorrectly wrapped the script in `base64encode(...)`. The AWS provider expects plain text in `user_data`; base64-encoded content belongs in `user_data_base64`. I removed the extra encoding so the launch script is passed correctly.
- The Docker installation commands were AMI-version-specific and would fail on Amazon Linux 2023 because `amazon-linux-extras` is an Amazon Linux 2 mechanism. I changed the script to handle both Amazon Linux 2 and Amazon Linux 2023.
- The Portainer container command exposed port `9000` and used the floating `latest` image tag. Current Portainer installation docs document HTTPS on `9443`, make `9000` legacy/optional, and use a channel tag. I updated the example to expose `9443` only and use `portainer/portainer-ce:sts`.
- The instance example assumed a public IP without explicitly requesting one. I added `associate_public_ip_address = true` so the instance can be reached at the public IP as described.
- The first-login note was inaccurate. Portainer does not "lock the instance"; it stops listening until the container is restarted if no admin user is created within 5 minutes. I corrected that wording.
- The EBS section was technically incorrect because it attached a separate EBS volume but never mounted it or pointed Portainer at it, so Portainer data would still live on the root disk. I replaced it with a correct `root_block_device` example and updated the explanation to reflect that the Docker volume is stored on the instance's EBS-backed root volume.

## Review Notes
- Current Portainer install docs also expose port `8000` for Edge Agent communication, but Portainer documents that port as optional. It was intentionally not added because this post only covers direct UI access to the Portainer server.
- EC2 user data scripts run only on first launch by default. If the script changes later, existing instances will not rerun it automatically unless the instance is recreated or separately configured to rerun user data.
- The post still assumes supporting resources such as `data.aws_ami.amazon_linux`, `aws_subnet.public`, and the `portainer_ip` output are defined elsewhere in the OpenTofu configuration.
