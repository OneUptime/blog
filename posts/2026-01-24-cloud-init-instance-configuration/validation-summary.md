# Validation Summary: How to Implement Cloud-init for Instance Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- cloud-init
- Cloud-config YAML
- Multi-part MIME user data
- Bash user-data scripts
- AWS EC2 user data
- Azure VM custom data
- Google Compute Engine metadata
- Nginx
- Docker and Docker Compose
- PostgreSQL
- Ansible, Chef, and Puppet bootstrap workflows

## Sources Consulted
- cloud-init 26.1 boot stages: https://docs.cloud-init.io/en/latest/explanation/boot.html
- cloud-init 26.1 user-data formats: https://docs.cloud-init.io/en/latest/explanation/format/index.html
- cloud-init 26.1 module reference: https://docs.cloud-init.io/en/latest/reference/modules.html
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- AWS CLI `ec2 run-instances` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Azure VM custom data documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/custom-data
- Azure cloud-init bash script documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/cloudinit-bash-script
- Google Cloud SDK `gcloud compute instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Chef install script documentation: https://docs.chef.io/chef_install_script/

## Issues Found
- Updated the cloud-init stage list from the older "Generator" terminology to the current "Detect, Local, Network, Config, Final" sequence, and corrected what runs in Config versus Final. Current cloud-init documentation states that package installations and user-defined scripts run in the Final stage, while `runcmd` writes a script to be run later by `scripts_user`.
- Added `defer: true` to `write_files` examples that write package-owned paths or files whose owners/parent directories are created later. This avoids writing Nginx and Docker Compose files before package installation or before the `deploy` user exists.
- Fixed the Chef bootstrap example so it no longer uses a literal `${HOSTNAME}` as the Chef node name and so it creates the `/etc/chef/first-boot.json` file referenced by `chef-client -j`.
- Clarified the Google Cloud example comment to say it passes cloud-init user data through instance metadata, not a startup script.

## Review Notes
- All YAML examples parse successfully and validate with `cloud-init schema` using local cloud-init 25.2.
- The Python multi-part MIME generator parses and emits `text/cloud-config` and `text/x-shellscript` MIME parts.
- The Bash fenced examples pass `bash -n`.
- Some package names are distribution-specific, especially PostgreSQL 15, Docker Compose, and Puppet packages. The examples are reasonable for Ubuntu-style images with the appropriate repositories enabled, but readers may need to adjust package names on other distributions or cloud images.
