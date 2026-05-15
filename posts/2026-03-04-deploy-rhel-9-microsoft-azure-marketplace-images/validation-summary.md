# Validation Summary: How to Deploy RHEL 9 on Microsoft Azure with Marketplace Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Microsoft Azure Marketplace images
- Azure CLI
- AWS CLI and EC2 AMIs
- Google Cloud CLI and Compute Engine images
- cloud-init
- Red Hat subscription-manager
- Red Hat Insights
- SELinux and firewalld

## Sources Consulted
- Microsoft Learn: Overview of Red Hat Enterprise Linux images in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Microsoft Learn: Azure CLI `az vm create` reference - https://learn.microsoft.com/en-us/cli/azure/vm
- AWS CLI Command Reference: `aws ec2 run-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS Marketplace Buyer Guide: Using AMI aliases in AWS Marketplace - https://docs.aws.amazon.com/marketplace/latest/buyerguide/buyer-ami-aliases.html
- Google Cloud Documentation: Compute Engine operating system details - https://cloud.google.com/compute/docs/images/os-details
- Google Cloud SDK Documentation: `gcloud compute instances create` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Red Hat Documentation: RHEL 9 deprecated subscription management functionality - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.6_release_notes/deprecated-functionalities
- Red Hat Documentation: Getting Started with RHEL System Registration - https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/
- Red Hat Documentation: Insights client command options - https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/assembly-insights-cli-options
- Red Hat Documentation: Using SELinux in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/
- Red Hat Documentation: Configuring firewalls and packet filters in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The prerequisite listed `az-cli`, but the official command-line tool is Azure CLI. Changed the text to "Azure CLI".
- The AWS example used `ami-rhel9-xxxxx`, which is not a valid AMI ID shape. Changed it to `ami-xxxxxxxxxxxxxxxxx`, matching the documented AMI ID format while preserving it as a placeholder.
- The Azure example used `RedHat:RHEL:9:latest`, but Microsoft documents the standard RHEL 9 LVM Gen2 Marketplace SKU as `9-lvm-gen2`. Changed the image URN to `RedHat:RHEL:9-lvm-gen2:latest`.
- The registration example used `subscription-manager register --auto-attach`. Red Hat documents `auto-attach` as deprecated under current Simple Content Access subscription management. Changed the example to registration with an organization ID and activation key.

## Review Notes
- Azure Marketplace pay-as-you-go RHEL images are connected to Red Hat repositories through the cloud image entitlement model; explicit `subscription-manager` registration is mainly relevant for BYOS or Red Hat account registration workflows.
- The GCP `rhel-cloud` / `rhel-9` image family and the `gcloud compute instances create` flags are still current.
- The cloud-init snippet uses valid cloud-config keys for hostname, users, SSH authorized keys, and package installation.
