# Validation Summary: How to Install Rancher on Amazon Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Amazon Linux 2023
- Docker
- Kubernetes
- Amazon EC2
- AWS Security Groups
- Amazon EBS
- IMDSv2

## Sources Consulted
- Rancher: Installing Rancher on a Single Node Using Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher: Installation Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher: Port Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/bootstrap-password
- SUSE Rancher Manager: Installing Docker - https://documentation.suse.com/cloudnative/rancher-manager/v2.12/en/installation-and-upgrade/requirements/install-docker.html
- SUSE Rancher support matrix - https://www.suse.com/suse-rancher/support-matrix/
- AWS: Installing Docker to use with the AWS SAM CLI - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-docker.html
- Amazon Linux 2023: IMDSv2 - https://docs.aws.amazon.com/linux/al2023/ug/imdsv2.html
- Amazon EC2: Access instance metadata for an EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- Amazon EBS: Make an Amazon EBS volume available for use - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html
- Amazon EBS: Map Amazon EBS volumes to NVMe device names - https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- Amazon EBS: Create a snapshot of an EBS volume - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-create-snapshot.html
- AWS CLI: create-snapshots - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshots.html
- Amazon EC2 API Reference: DescribeVolumes - https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeVolumes.html

## Issues Found
- The post presented Rancher's single-node Docker install as a general installation path for EC2, but Rancher's official docs state that Docker installs are for development and testing only. I added that limitation near the start of the post and updated the conclusion to avoid implying production suitability.
- The prerequisites and security group table incorrectly required inbound TCP `6443` on the Rancher host. Rancher's Docker port requirements only call for inbound `80/443` on the Rancher node; `6443` is an outbound dependency when Rancher talks to hosted or imported cluster APIs. I removed the inbound `6443` guidance and replaced it with the correct outbound note.
- The fallback Docker CE installation used Docker's CentOS repository on Amazon Linux 2023. Docker's official repo instructions are for supported distributions such as CentOS Stream, while AWS documents installing Docker on Amazon Linux 2023 from the AWS repositories. I removed the unsupported fallback block.
- The EBS storage example assumed `/dev/xvdf` on a `t3.medium`, but AWS Nitro-based instances typically expose attached EBS volumes as NVMe devices such as `/dev/nvme1n1`. I updated the example to identify the real device with `lsblk`, use a filesystem command that matches AWS docs, and mount by UUID in `/etc/fstab`.
- The backup example only printed the EC2 instance ID, which is not sufficient to create an EBS snapshot. I replaced it with commands that list attached volumes and then create a snapshot for the volume that holds `/opt/rancher`.
- The IMDS wording was tightened from a generic "Amazon Linux 2023 uses IMDSv2 by default" to the more precise AWS phrasing that AL2023 AMIs require IMDSv2 by default.
- The troubleshooting note claimed `checkip.amazonaws.com` could be used to verify security group access. That command only returns the instance public IP, so I corrected the explanation and replaced the DNS lookup example with `getent hosts`, which is more reliably available on Amazon Linux 2023.

## Review Notes
- The post still uses `rancher/rancher:latest`, which matches Rancher's official single-node Docker install example. Because this installation path is explicitly for development and evaluation, that is acceptable here. For repeatable environments, pinning a specific Rancher release and checking the Rancher support matrix for Docker compatibility would be safer.
