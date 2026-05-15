# Validation Summary: How to Compare RHEL and Amazon Linux 2023 for AWS Deployments

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Amazon Linux 2023
- AWS EC2
- DNF
- RPM

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9
- Red Hat documentation, Deploying RHEL 9 on Amazon Web Services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_rhel_9_on_amazon_web_services/index
- Red Hat documentation, RHEL 9 system requirements and supported installation targets: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/system-requirements-and-supported-architectures_rhel-installer
- AWS documentation, What is Amazon Linux 2023?: https://docs.aws.amazon.com/linux/al2023/ug/what-is-amazon-linux.html
- AWS documentation, Using AL2023 on AWS: https://docs.aws.amazon.com/linux/al2023/ug/aws.html
- AWS documentation, Using Amazon Linux 2023 outside of Amazon EC2: https://docs.aws.amazon.com/linux/al2023/ug/outside-ec2.html
- AWS documentation, Relationship to Fedora: https://docs.aws.amazon.com/linux/al2023/ug/relationship-to-fedora.html
- AWS documentation, Package management tool: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- AWS documentation, Amazon Linux 2023 release cadence: https://docs.aws.amazon.com/linux/al2023/ug/release-cadence.html
- RPM documentation: https://rpm.org/docs/

## Issues Found
- The post described Amazon Linux 2023 cloud support as "AWS only." AWS documentation states that AL2023 can also run outside Amazon EC2 as a virtualized guest, with KVM, VMware, and Hyper-V images available, so the comparison table and introduction were updated.
- The original service-management commands used `<service-name>` placeholders and were unrelated to comparing RHEL and Amazon Linux 2023. They were replaced with OS and package-management checks using `/etc/os-release`, `dnf --version`, and `dnf repolist`.
- The "Base" row oversimplified AL2023 as Fedora. AWS documents AL2023 as having an independent lifecycle with components from Fedora, CentOS Stream 9, modified packages, and Amazon-developed components, so the row was corrected.
- The cost row implied AL2023 cost was "EC2 only." AWS documents AL2023 as available at no additional charge while infrastructure charges still apply, so the row was clarified.
- The prerequisites referenced CentOS Stream 9 even though the article compares RHEL and AL2023. This was corrected to RHEL 9 or Amazon Linux 2023.

## Review Notes
The corrected post remains a high-level comparison guide. It does not provide workload-specific benchmarking, support-contract analysis, or migration guidance, which would be useful future additions but were outside the scope of a technical correctness fix.
