# Validation Summary: How to Manage RHEL 9 Cloud Instances with Red Hat Satellite

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Satellite
- AWS EC2 and AWS CLI
- Azure Virtual Machines and Azure CLI
- Google Compute Engine and Google Cloud CLI
- cloud-init
- Red Hat Insights

## Sources Consulted
- Red Hat Satellite 6.17 Managing hosts: https://docs.redhat.com/en/documentation/red_hat_satellite/6.17/html/managing_hosts/registering-hosts-and-setting-up-host-integration_managing-hosts
- Red Hat Satellite 6.17 Managing content, activation keys: https://docs.redhat.com/en/documentation/red_hat_satellite/6.17/html/managing_content/managing_activation_keys_content-management
- Red Hat Enterprise Linux 9 on AWS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_rhel_9_on_amazon_web_services/index
- AWS CLI run-instances reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Azure RHEL image reference: https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-imagelist
- Azure CLI az vm reference: https://learn.microsoft.com/en-us/cli/azure/vm
- Google Cloud CLI compute instances create reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- cloud-init users and groups examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/user_groups.html
- Red Hat Insights client configuration guide: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/assembly-client-configuring-insights-client

## Issues Found
- The post claimed to manage instances with Red Hat Satellite but only showed direct Red Hat registration with `subscription-manager register --auto-attach`. Replaced it with Satellite host registration guidance using the generated command from **Hosts > Register Host** and an activation key, which matches current Satellite documentation.
- Added Satellite-specific prerequisites for an activation key and synced RHEL 9 content because they are required for Satellite registration.
- Corrected CLI tool names from `aws-cli, az-cli, or gcloud` to AWS CLI, Azure CLI, and Google Cloud CLI.
- Replaced the invalid placeholder AWS AMI ID format with a syntactically valid AMI-style placeholder and added `--count 1` to match AWS CLI examples.
- Corrected the Azure RHEL 9 image URN from `RedHat:RHEL:9:latest` to the documented RHEL 9 SKU format `RedHat:RHEL:9-lvm-gen2:latest`, and added required Linux VM login options.
- Added an explicit GCP zone to the `gcloud compute instances create` example so it works without relying on a preconfigured default zone.
- Added a sudo rule to the cloud-init user so the created `admin` user can actually administer the instance.

## Review Notes
- The Satellite registration command is intentionally shown as a generated-command pattern because Satellite produces environment-specific URLs and parameters based on the selected organization, location, host group, activation key, and integration options.
- `insights-client --register` remains valid after system registration, but Satellite environments must ensure the required repositories and client packages are available through Satellite content.
