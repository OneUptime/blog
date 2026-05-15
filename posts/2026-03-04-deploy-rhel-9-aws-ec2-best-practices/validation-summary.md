# Validation Summary: How to Deploy RHEL on AWS EC2 with Best Practices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Amazon EC2
- Amazon EBS
- Amazon EFS
- AWS CLI
- EC2 Instance Metadata Service v2
- firewalld
- OpenSSH
- DNF Automatic
- Amazon CloudWatch Agent

## Sources Consulted
- AWS CLI Command Reference: run-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Amazon EC2 User Guide: Configure instance metadata options for new instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-new-instances.html
- Amazon EBS User Guide: Make an Amazon EBS volume available for use: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html
- Amazon EBS User Guide: Map Amazon EBS volumes to NVMe device names: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- Amazon CloudWatch User Guide: Download the CloudWatch agent package: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-CloudWatch-Agent-on-EC2-Instance-commandline-first.html
- Amazon CloudWatch User Guide: CloudWatch agent configuration file details: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Amazon CloudWatch User Guide: CloudWatch agent configuration examples: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-cloudwatch-agent-configuration-file-examples.html
- Red Hat Enterprise Linux 9 documentation: Automating software updates in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_automating-software-updates-in-rhel-9_managing-software-with-the-dnf-tool
- Red Hat Cloud Access FAQ: https://access.redhat.com/articles/3664231
- Red Hat documentation: Deploying RHEL 9 on Amazon Web Services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_rhel_9_on_amazon_web_services/

## Issues Found
- The architecture diagram placed EBS volumes in a data subnet and showed both instances connected to the same EBS resource. EBS volumes are attached block devices rather than subnet resources, and ordinary EBS volumes are not shared between instances. Updated the diagram to show per-instance EBS volumes and an EFS mount target in the subnet.
- The Gold Image comment said it required a RHEL subscription through RHUI. Red Hat Cloud Access Gold Images require an eligible Red Hat subscription and AWS Gold Images are configured to use RHUI by default. Updated the wording.
- The EC2 launch command required IMDSv2 but did not explicitly enable the metadata endpoint. AWS documentation states that when requiring IMDSv2 with the CLI, `HttpEndpoint=enabled` must also be set. Added it to the launch command.
- The RHEL package installation used `awscli2`, which is not the RHEL package name documented by Red Hat for AWS CLI installation. Changed it to `awscli`.
- The EBS mount example wrote `/dev/nvme1n1` directly to `/etc/fstab`. AWS recommends using stable identifiers such as UUIDs because NVMe device names can change. Updated the example to capture the filesystem UUID and use `UUID=...` with `nofail`.
- The IMDSv2 modification command did not explicitly include `--http-endpoint enabled`. Added it for consistency with AWS metadata option guidance.
- The SSH hardening `sed` commands only matched commented defaults and could silently do nothing if values were already uncommented. Updated them to match commented or uncommented directives.
- The CloudWatch agent install command used `dnf install amazon-cloudwatch-agent`, which AWS documents as a package-manager install path for Amazon Linux. Updated the RHEL example to install the Red Hat RPM from the official CloudWatch agent S3 location.
- The CloudWatch agent metric configuration used emitted metric names for `mem` and `cpu` measurements. AWS configuration examples use plugin-local names such as `used_percent` and `usage_active`. Updated those fields.

## Review Notes
- The local environment did not have the AWS CLI installed, so CLI syntax was checked against official AWS CLI documentation rather than local `aws --help` output.
- The EBS formatting command is valid for a new empty volume, but operators should inspect `lsblk -f` output before running `mkfs` because formatting an existing filesystem destroys data.
