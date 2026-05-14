# Validation Summary: How to Use Terraform to Provision RHEL 9 VMs on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS EC2
- Terraform
- AWS Marketplace AMIs
- cloud-init
- Red Hat Subscription Manager
- Red Hat Insights
- SELinux
- firewalld

## Sources Consulted
- Red Hat Documentation: Deploying RHEL 9 on Amazon Web Services - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_rhel_9_on_amazon_web_services/index
- Red Hat Customer Portal: Red Hat Enterprise Linux Images (AMI) Available on Amazon Web Services (AWS) - https://access.redhat.com/solutions/15356
- Red Hat Customer Portal: How do I identify an official Red Hat Enterprise Linux AMI on Amazon EC2? - https://access.redhat.com/solutions/99333
- Terraform AWS Provider documentation: aws_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider documentation: aws_ami data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform CLI documentation: commands, init, plan, apply - https://developer.hashicorp.com/terraform/cli/commands
- Terraform provider requirements documentation - https://developer.hashicorp.com/terraform/language/providers/requirements
- Red Hat Documentation: Configuring and managing cloud-init for RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_managing_cloud-init_for_rhel_9/Red_Hat_Enterprise_Linux-9-Configuring_and_managing_cloud-init_for_RHEL_9-en-US.pdf
- Red Hat Documentation: Registering RHEL by using Subscription Manager - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat Customer Portal: Automatic updates of RHUI client RPMs in cloud environments - https://access.redhat.com/articles/6978203
- Red Hat Insights Client Configuration Guide - https://docs.redhat.com/en-us/documentation/red_hat_insights/1-latest/pdf/client_configuration_guide_for_red_hat_insights/Red_Hat_Insights-1-latest-Client_Configuration_Guide_for_Red_Hat_Insights-en-US.pdf
- Red Hat Documentation: Using SELinux on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- AWS CLI documentation: ec2 run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Microsoft Learn: Overview of Red Hat Enterprise Linux images in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Google Cloud SDK documentation: gcloud compute instances create - https://cloud.google.com/sdk/gcloud/reference/compute/instances/create

## Issues Found
- The title and description promised Terraform provisioning on AWS, but the launch section used direct AWS, Azure, and GCP CLI commands and contained no Terraform configuration. Replaced the launch instructions with a Terraform AWS provider example using `aws_ami` and `aws_instance`.
- The prerequisites referenced Azure and GCP CLI tools even though the post is AWS-specific. Narrowed the prerequisites to AWS, Terraform, and AWS CLI.
- The Azure image URN `RedHat:RHEL:9:latest` was not accurate for the documented Azure RHEL 9 marketplace image SKU, which is `9-lvm-gen2`. Removed the Azure example because it was outside the AWS Terraform scope.
- The AWS AMI placeholder `ami-rhel9-xxxxx` was not a valid AMI ID format and did not show how to select an official RHEL 9 image. Replaced it with a Terraform AMI lookup using Red Hat's official AWS owner account ID `309956199498` and RHEL 9 AMI name filters.
- The registration command used `subscription-manager register --auto-attach` without credentials or activation key details and did not distinguish AWS pay-as-you-go RHEL images from BYOS/custom images. Updated the guidance to explain that AWS Marketplace RHEL images use RHUI and to use activation-key registration for BYOS or custom images.
- The cloud-init example was standalone user-data but not wired into Terraform. Converted it into a Terraform `user_data` example while keeping the same cloud-init content.
- The networking section mentioned Azure NSGs in an AWS-focused post. Removed that provider-specific term and kept the guidance focused on AWS security groups and host firewall rules.

## Review Notes
The Terraform example assumes the default VPC and an existing EC2 key pair named `mykey`. In production, the post could be expanded later with explicit VPC, subnet, and security group resources, but the current example is syntactically valid and technically aligned with the article scope.
