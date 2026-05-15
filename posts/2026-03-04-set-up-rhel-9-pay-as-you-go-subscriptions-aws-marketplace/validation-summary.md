# Validation Summary: How to Set Up RHEL 9 Pay-As-You-Go Subscriptions on AWS Marketplace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS Marketplace and Amazon EC2
- AWS CLI
- Microsoft Azure Virtual Machines and Azure CLI
- Google Compute Engine and Google Cloud CLI
- cloud-init
- Red Hat Subscription Manager
- Red Hat Update Infrastructure
- Red Hat Insights

## Sources Consulted
- AWS CLI `ec2 run-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Red Hat documentation, Deploying RHEL 9 on Amazon Web Services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_rhel_9_on_amazon_web_services/assembly_deploying-a-virtual-machine-on-aws_cloud-content-aws
- Microsoft Learn, Overview of Red Hat Enterprise Linux images in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Google Cloud documentation, Compute Engine operating system details: https://cloud.google.com/compute/docs/images/os-details
- Google Cloud CLI `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- cloud-init examples and module reference: https://docs.cloud-init.io/en/latest/reference/examples.html and https://docs.cloud-init.io/en/latest/reference/modules.html
- Red Hat documentation, Getting Started with RHEL System Registration: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/
- Red Hat Insights client options: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights_with_fedramp/assembly-insights-cli-options

## Issues Found
- The prerequisites implied that a normal RHEL subscription is required for the PAYG path. Updated the wording to distinguish marketplace entitlement from BYOS/custom-image subscriptions.
- The CLI prerequisite used informal tool names. Updated it to the official product names: AWS CLI, Azure CLI, and Google Cloud CLI.
- The AWS command used `ami-rhel9-xxxxx`, which is not a valid AMI ID format. Replaced it with an AMI-shaped placeholder and added a note that the user must use the subscribed RHEL 9 Marketplace AMI ID for the target AWS Region.
- The Azure example used `RedHat:RHEL:9:latest`, but Microsoft documents the RHEL 9 standard image SKU as `9-lvm-gen2`. Updated the URN to `RedHat:RHEL:9-lvm-gen2:latest`.
- The registration step used `subscription-manager register --auto-attach`, which is misleading for AWS Marketplace PAYG images because PAYG content updates are provided through RHUI. Updated the step to explain RHUI behavior and show activation-key registration for BYOS/custom images or Red Hat service connectivity.
- The monitoring example ran `insights-client` while the comment said to register with Red Hat Insights. Updated the command to `insights-client --register`.

## Review Notes
The GCP command syntax, cloud-init YAML keys, SELinux default statement, and Red Hat Insights registration option were consistent with official documentation. The post still covers Azure and GCP examples even though the title is AWS Marketplace-specific; that is a scope issue rather than a technical correctness error.
