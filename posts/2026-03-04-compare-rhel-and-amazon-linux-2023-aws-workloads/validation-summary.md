# Validation Summary: How to Compare RHEL and Amazon Linux 2023 for AWS Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon Linux 2023
- Red Hat Enterprise Linux
- Amazon EC2
- AWS Marketplace
- AWS CLI v2
- DNF
- Red Hat Subscription Manager
- Red Hat Update Infrastructure
- AWS Nitro Enclaves
- Docker

## Sources Consulted
- Amazon Linux 2023 User Guide: What is Amazon Linux 2023? https://docs.aws.amazon.com/linux/al2023/ug/what-is-amazon-linux.html
- Amazon Linux 2023 User Guide: Relationship to Fedora. https://docs.aws.amazon.com/linux/al2023/ug/relationship-to-fedora.html
- Amazon Linux 2023 User Guide: Comparing packages installed on Amazon Linux 2023 images. https://docs.aws.amazon.com/linux/al2023/ug/image-comparison.html
- Amazon Linux 2023 User Guide: Deterministic upgrades through versioned repositories. https://docs.aws.amazon.com/linux/al2023/ug/deterministic-upgrades.html
- Amazon Linux 2023 User Guide: IMDSv2. https://docs.aws.amazon.com/linux/al2023/ug/imdsv2.html
- Amazon Linux 2023 User Guide: Using Amazon Linux 2023 outside of Amazon EC2. https://docs.aws.amazon.com/linux/al2023/ug/outside-ec2.html
- Amazon Linux 2023 User Guide: Using the AL2023 base container image. https://docs.aws.amazon.com/linux/al2023/ug/base-container.html
- AWS CLI User Guide: Installing or updating to the latest version of the AWS CLI. https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- AWS Nitro Enclaves User Guide: Install the Nitro Enclaves CLI on Linux. https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave-cli-install.html
- AWS Red Hat Enterprise Linux on Amazon EC2 FAQs. https://aws.amazon.com/partners/redhat/faqs/
- AWS Red Hat Enterprise Linux on AWS Pricing. https://aws.amazon.com/partners/redhat/rhel-pricing/
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux for SAP Solutions 9 documentation: release locking examples for RHEL 9. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/proc_completing_post-installation_tasks_configuring-rhel-9-for-sap-hana2-installation
- Red Hat Enterprise Linux 10 documentation: RHUI release version handling on public clouds. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/upgrading_from_rhel_9_to_rhel_10/preparing-for-the-upgrade

## Issues Found
- The cost section described RHEL as having a generic per-hour OS subscription fee on top of EC2. Updated it to say RHEL subscription charges are included in EC2 pricing and current RHEL pricing is based on vCPU-hour charges.
- The AL2023 launch command used a placeholder AMI ID without saying it must be replaced. Updated the comment to clarify that a regional AL2023 AMI ID is required.
- The AWS CLI section implied all RHEL images require manual AWS CLI installation. Updated it to apply only to images that do not already include AWS CLI v2.
- The Nitro Enclaves sentence implied support was built in. Updated it to the documented behavior that Nitro Enclaves CLI packages are available in AL2023 repositories.
- The AL2023 update command used `dnf install system-release-...` to lock a release. Updated it to the documented `sudo dnf upgrade --releasever=...` workflow and added `sudo` to `dnf check-release-update`.
- The RHEL release-lock example only showed `subscription-manager release --set`, which is not the right mechanism for all AWS PAYG/RHUI images. Added the RHUI `releasever` file example.
- The portability section said Amazon Linux only runs on AWS and Docker. Updated it to note official AL2023 container images and VM images for KVM, VMware, and Hyper-V.

## Review Notes
The examples are intentionally illustrative and still require a valid region-specific AMI ID, AWS credentials, and appropriate EC2 permissions before running.
