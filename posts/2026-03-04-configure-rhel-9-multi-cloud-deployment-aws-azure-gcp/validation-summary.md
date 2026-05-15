# Validation Summary: How to Configure RHEL for Multi-Cloud Deployment Across AWS, Azure, and GCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS EC2 and AWS CLI
- Microsoft Azure Virtual Machines and Azure CLI
- Google Compute Engine and gcloud CLI
- cloud-init
- Red Hat Subscription Manager
- Red Hat Insights
- SELinux and firewalld

## Sources Consulted
- AWS CLI Command Reference for `ec2 run-instances`: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI EC2 instance launch guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-ec2-instances.html
- Microsoft Learn Azure CLI `az vm create` reference: https://learn.microsoft.com/cli/azure/vm
- Microsoft Learn overview of Red Hat Enterprise Linux images in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Google Cloud SDK `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud Compute Engine operating system image details: https://cloud.google.com/compute/docs/images/os-details
- Red Hat RHEL 9 cloud-init documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_and_managing_cloud-init_for_rhel_9
- cloud-init users and groups examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/user_groups.html
- Red Hat RHEL 9 command-line registration documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat Simple Content Access documentation: https://access.redhat.com/articles/simple-content-access
- Red Hat Insights client configuration guide: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/assembly-client-configuring-insights-client

## Issues Found
- The AWS example used `ami-rhel9-xxxxx`, which is not a valid AMI ID format. Changed it to an AMI-shaped placeholder and added `--count 1`, matching AWS CLI examples for launching one instance.
- The Azure example used `RedHat:RHEL:9:latest`, but current Azure RHEL 9 marketplace image documentation lists RHEL 9 SKUs such as `9-lvm-gen2`. Changed the URN to `RedHat:RHEL:9-lvm-gen2:latest` and added `--admin-username` plus `--generate-ssh-keys` so the command is a complete Linux VM creation example.
- The GCP example omitted `--zone`. `gcloud` can use a configured default zone, but the standalone example is clearer and directly runnable with an explicit zone, so `--zone=us-central1-a` was added.
- The Red Hat registration command used `subscription-manager register --auto-attach`. Red Hat Simple Content Access makes attach operations obsolete for many modern accounts, and current RHEL 9 documentation recommends activation key and organization registration. Changed the command to `subscription-manager register --activationkey=my-activation-key --org=123456`.

## Review Notes
Marketplace pay-as-you-go RHEL images may already use the cloud provider's Red Hat Update Infrastructure path and may not require the same subscription registration workflow as BYOS or custom images. The post remains technically valid as a high-level multi-cloud guide, but future improvements could explain provider-specific subscription and update-channel differences in more detail.
