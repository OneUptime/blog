# Validation Summary: How to Deploy RHEL on AWS, Azure, and Google Cloud

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS EC2 and AWS CLI
- Azure Virtual Machines and Azure CLI
- Google Compute Engine and Google Cloud CLI
- Red Hat Update Infrastructure
- Red Hat Subscription Manager
- cloud-init

## Sources Consulted
- Red Hat Customer Portal: Red Hat Enterprise Linux Images (AMI) Available on Amazon Web Services (AWS): https://access.redhat.com/solutions/15356
- AWS CLI Command Reference: ec2 run-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS EC2 User Guide: Run commands when you launch an EC2 instance with user data input: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Microsoft Learn: Overview of Red Hat Enterprise Linux images in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Microsoft Learn: Red Hat Update Infrastructure for on-demand Red Hat Enterprise Linux VMs in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-rhui
- Microsoft Learn: Red Hat Enterprise Linux bring-your-own-subscription Gold Images in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/byos
- Azure CLI Reference: az vm: https://learn.microsoft.com/en-us/cli/azure/vm
- Google Cloud Compute Engine OS details: https://cloud.google.com/compute/docs/images/os-details
- Google Cloud SDK Reference: gcloud compute instances create: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud Compute Engine SSH documentation: https://cloud.google.com/compute/docs/instances/ssh
- cloud-init examples and module documentation: https://docs.cloud-init.io/en/latest/topics/examples.html
- Red Hat Customer Portal: Simple Content Access: https://access.redhat.com/articles/simple-content-access

## Issues Found
- The Azure RHEL 9 examples used SKU `9_3` and image URN `RedHat:RHEL:9_3:latest`. Microsoft's current RHEL image documentation lists the standard RHEL 9 SKU as `9-lvm-gen2`, so the Azure image listing and VM creation examples were updated to use `9-lvm-gen2`.
- The post said marketplace images are maintained by Red Hat. Google Cloud documentation says Google Cloud builds and supports its public RHEL images, while Azure and AWS involve provider-specific integration. The wording was changed to say the images are maintained by Red Hat and the cloud provider.
- The BYOS RHSM example unconditionally ran `subscription-manager attach --auto`. Red Hat's Simple Content Access documentation says attach commands are obsolete and no longer required for SCA accounts, so the command was marked as needed only for older entitlement-mode accounts.
- The RHUI-to-RHSM section implied that registering an on-demand image always conflicts and that Red Hat provides a one-way conversion script for that instance. Azure documentation says registering a PAYG VM with another update source can cause double billing, and Red Hat/Google guidance generally recommends creating a BYOS or Cloud Access instance and migrating when switching models. The text was corrected to advise using a provider-supported conversion or billing path.

## Review Notes
The AWS, Azure, GCP, and cloud-init command structures are otherwise consistent with current official CLI and platform documentation. Cost claims are directionally plausible but should be checked against provider calculators before publication because RHEL premium OS pricing and commitment discounts vary by provider, region, instance size, and billing program.
