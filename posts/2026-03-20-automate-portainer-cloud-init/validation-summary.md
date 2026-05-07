# Validation Summary: How to Automate Portainer Deployment with Cloud-Init

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cloud-init
- Portainer Community Edition
- Docker Engine and Docker Compose
- AWS EC2 and AWS CLI
- AWS Systems Manager Parameter Store
- Hetzner Cloud CLI
- DigitalOcean `doctl`
- UFW

## Sources Consulted
- Cloud-init modules reference: https://docs.cloud-init.io/en/21.4/topics/modules.html
- Cloud-init reference PDF: https://cloudinit.readthedocs.io/_/downloads/en/22.1_a/pdf/
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE install on Docker/Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Edge Agent update/deployment reference: https://docs.portainer.io/start/upgrade/edge
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- AWS EC2 user data docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- AWS Systems Manager `resolve:ssm:` AMI parameter docs: https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-ec2-aliases.html
- Canonical Ubuntu AMI lookup on AWS: https://documentation.ubuntu.com/aws/en/latest/aws-how-to/instances/find-ubuntu-images/
- DigitalOcean `doctl compute droplet create` reference: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- Hetzner Cloud CLI server creation reference: https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_server_create.md
- Hetzner Cloud CLI server creation tutorial: https://github.com/hetznercloud/cli/blob/main/docs/tutorials/create-a-server.md

## Issues Found
- The Step 1 example said the extra comment line identified the file as cloud-init input. The required identifier is the `#cloud-config` header, so I corrected that wording.
- The Step 1 user example added `portainer-admin` to the `docker` group before Docker was installed. I removed `docker` from that example to avoid implying the group already exists.
- The Step 2 Compose file used the obsolete top-level `version` key, pinned an old `portainer/portainer-ce:2.19.4` image, exposed legacy HTTP port `9000` by default, and attempted to set the initial admin password with an unsupported `PORTAINER_ADMIN_PASSWORD_HASH` environment variable. I updated the example to `portainer/portainer-ce:lts`, removed the obsolete `version` key, removed port `9000`, and switched to Portainer’s supported `--admin-password-file` mechanism.
- The main cloud-init example configured UFW without installing it. I added `ufw` to the package list.
- The main cloud-init example generated no valid initial admin secret. I added `openssl` and updated `init.sh` to generate a strong initial password file before `docker compose up -d`.
- The install script printed an AWS-only metadata URL for the final access address. That was not correct for Hetzner, DigitalOcean, or AWS instances enforcing IMDSv2, so I replaced it with a provider-neutral access message.
- The firewall snippet opened `9000/tcp`, but current Portainer docs treat port `9000` as legacy and do not expose it by default. I removed that rule to match the updated deployment example.
- The `runcmd` section tried to add a hard-coded `ubuntu` user to the Docker group. That is not portable across Ubuntu and Debian cloud images, so I removed the command.
- The `runcmd` section wrote a logrotate rule for `/opt/portainer/logs/*.log`, but the example never writes logs there. Docker log rotation was already configured in the daemon and container logging settings, so I removed the incorrect rule.
- The AWS EC2 example used a hard-coded AMI ID that is stale and region-specific. I replaced it with an official public SSM parameter reference for the current Ubuntu 22.04 LTS AMI and added `--region us-east-1` to the follow-up `describe-instances` command for consistency.
- The Hetzner section ended with `hcloud server create --help`, which does not check creation status. I replaced it with `hcloud server describe portainer-server` and refreshed the example server type to the current `cpx22` style used in the official CLI tutorial.
- The Edge Agent example used outdated syntax (`-H ... --key ...`), published port `9001`, and used `portainer/agent:latest`. I replaced it with the current environment-variable-based Edge Agent deployment pattern from Portainer docs and aligned the image to `portainer/agent:lts`.

## Review Notes
- The post still uses Docker’s `get.docker.com` convenience script. Docker documents this as a convenience install path; using Docker’s apt repository directly is a better fit for stricter production controls.
- Using the `lts` tags for both Portainer Server and the Edge Agent keeps the example closer to current docs, but explicit version pinning should still keep server and agent versions aligned.
