# Validation Summary: How to Perform an In-Place Upgrade of RHEL Images on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Azure Virtual Machines
- Azure CLI
- Azure Red Hat Update Infrastructure
- Red Hat Subscription Management
- Leapp

## Sources Consulted
- Microsoft Learn: Upgrade RHEL PAYG virtual machines using Leapp - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/leapp-upgrade-process-rhel-7-and-8
- Microsoft Learn: Troubleshoot common issues involving the Leapp upgrade process - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-red-hat-os-upgrade-issues
- Red Hat Documentation: Upgrading from RHEL 7 to RHEL 8 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/upgrading_from_rhel_7_to_rhel_8/
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/
- Azure CLI documentation: az snapshot create - https://learn.microsoft.com/en-us/cli/azure/snapshot
- Azure CLI documentation: az vm show - https://learn.microsoft.com/en-us/cli/azure/vm

## Issues Found
- The post claimed to explain an in-place RHEL upgrade on Azure, but the body described generic cloud deployment across AWS, Azure, and GCP. I replaced those deployment steps with an Azure-focused Leapp upgrade flow.
- The original AWS example used a placeholder AMI ID and was unrelated to the Azure in-place upgrade topic. I removed the AWS and GCP deployment examples.
- The original Azure example created a new RHEL 9 VM instead of upgrading an existing VM. I replaced it with an OS disk snapshot workflow for the VM being upgraded.
- The original cloud-init configuration was unrelated to in-place upgrades. I replaced it with package update and reboot preparation steps.
- The original Red Hat registration and Insights commands did not distinguish Azure pay-as-you-go RHUI images from BYOS images. I updated the text to explain RHUI for PAYG and RHSM for BYOS.
- The original post did not include Leapp pre-upgrade, inhibitor review, upgrade, reboot, or post-upgrade verification commands. I added those commands using the Azure-specific `--no-rhsm` flow for PAYG images and noted when to omit it for BYOS.

## Review Notes
The guide is now technically aligned with Microsoft and Red Hat's documented Leapp process, but it remains a condensed overview. A future expansion could add separate command paths for every supported RHEL source and target version.
