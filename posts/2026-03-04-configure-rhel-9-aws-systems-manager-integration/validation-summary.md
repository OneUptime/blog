# Validation Summary: How to Configure RHEL for AWS Systems Manager Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS EC2
- AWS Systems Manager / SSM Agent
- AWS IAM instance profiles
- cloud-init
- Red Hat Subscription Manager
- Red Hat Insights
- SELinux
- firewalld

## Sources Consulted
- AWS Systems Manager documentation: Install SSM Agent on RHEL 8.x, 9.x, and 10.x: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-rhel-8-9.html
- AWS Systems Manager documentation: Configure instance permissions required for Systems Manager: https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html
- AWS Systems Manager documentation: Troubleshooting SSM Agent endpoint connectivity: https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-ssm-agent.html
- AWS CLI documentation: ec2 run-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Red Hat documentation: Configuring and managing cloud-init for RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_managing_cloud-init_for_rhel_9/Red_Hat_Enterprise_Linux-9-Configuring_and_managing_cloud-init_for_RHEL_9-en-US.pdf
- Red Hat documentation: Registering RHEL by using Subscription Manager: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat documentation: Using SELinux in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- Red Hat documentation: Configuring firewalls and packet filters in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post title and description promised AWS Systems Manager integration, but the steps did not configure the two core SSM requirements for EC2: an IAM instance profile and SSM Agent. I added the `AmazonSSMManagedInstanceCore` prerequisite, included `--iam-instance-profile` in the EC2 launch command, and installed/enabled SSM Agent through cloud-init.
- The AWS AMI placeholder `ami-rhel9-xxxxx` did not match the shape of a real AMI ID and could be mistaken for a valid literal. I changed it to `ami-xxxxxxxxxxxxxxxxx`.
- The post included Azure and GCP launch examples even though the tutorial is specifically for AWS Systems Manager. I removed those commands to keep the technical procedure aligned with the title.
- The Red Hat registration section implied all RHEL cloud instances should use `subscription-manager register --auto-attach`. I clarified that AWS Marketplace RHEL images use RHUI and that Subscription Manager registration applies to bring-your-own-subscription images.
- The networking section mentioned cloud firewall concepts generically but not SSM's required outbound HTTPS connectivity. I added the Systems Manager endpoint/VPC endpoint requirement.
- The summary used lowercase "aws" and described generic cloud-platform integration. I corrected it to AWS Systems Manager and AWS-specific wording.

## Review Notes
The cloud-init SSM Agent command uses the AWS global x86_64 RPM URL documented for RHEL 8, 9, and 10. For ARM64 instances, the `linux_arm64` package URL should be used instead.
