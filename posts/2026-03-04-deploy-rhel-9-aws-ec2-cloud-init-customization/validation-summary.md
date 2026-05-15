# Validation Summary: How to Deploy RHEL 9 on AWS EC2 with Cloud-Init Customization

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS EC2
- Azure Virtual Machines
- Google Compute Engine
- cloud-init
- Red Hat Subscription Manager
- Red Hat Insights

## Sources Consulted
- AWS CLI `run-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Amazon EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Microsoft Learn, Red Hat Enterprise Linux images in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Google Cloud SDK `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Red Hat RHEL 9 cloud-init documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_cloud-init_for_rhel_9/
- Red Hat Subscription Central system registration documentation: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/
- Red Hat Insights client configuration documentation: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/
- Local `cloud-init schema` validation for the cloud-config example.

## Issues Found
- The AWS `--image-id` example used `ami-rhel9-xxxxx`, which is not a valid AMI ID shape. Changed it to a syntactically valid placeholder AMI ID.
- The AWS launch command did not pass the cloud-init configuration as EC2 user data, so the customization shown later would not be applied during launch. Added `--user-data file://cloud-config.yaml`.
- The Azure image URN used `RedHat:RHEL:9:latest`, but current Microsoft documentation lists RHEL 9 marketplace images with the `9-lvm-gen2` SKU. Updated the example to `RedHat:RHEL:9-lvm-gen2:latest`.
- The post implied all cloud RHEL images should be registered with `subscription-manager`. Clarified that this applies to BYOS or custom images, while pay-as-you-go marketplace images commonly use provider Red Hat Update Infrastructure instead.

## Review Notes
The cloud-init YAML example validates successfully with `cloud-init schema`. The GCP command uses documented `gcloud compute instances create` flags and a standard RHEL image project/family pattern. The AWS AMI ID remains a placeholder; users must choose the current RHEL 9 AMI for their AWS region and entitlement.
