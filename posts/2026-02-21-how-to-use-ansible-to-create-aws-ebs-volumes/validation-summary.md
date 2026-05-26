# Validation Summary: How to Use Ansible to Create AWS EBS Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws collection
- community.general collection
- ansible.posix collection
- AWS EC2
- Amazon EBS
- AWS KMS
- Linux filesystems and mounts

## Sources Consulted
- Ansible `amazon.aws.ec2_vol` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vol_module.html
- Ansible `amazon.aws` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible `community.general.filesystem` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/filesystem_module.html
- Ansible `community.general` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/index.html
- Ansible `ansible.posix.mount` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible `ansible.posix` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/index.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- AWS Amazon EBS volume types documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- AWS Amazon EBS General Purpose SSD documentation: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- AWS Amazon EBS NVMe device documentation: https://docs.aws.amazon.com/ebs/latest/userguide/nvme-ebs-volumes.html
- AWS Amazon EBS NVMe device mapping documentation: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- AWS Amazon EC2 root volume type documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/display-ami-root-device-type.html

## Issues Found
- The intro said every EC2 instance needs at least one EBS volume. Instance store-backed usage exists, so the wording was narrowed to "most EC2 instances use at least one."
- The prerequisites only mentioned `amazon.aws` and Ansible 2.9+. Current official collection docs list newer supported `ansible-core` requirements, and the mounting example also uses `community.general` and `ansible.posix`. Updated the prerequisite and install command to include all required collections and the AWS Python SDK dependencies.
- The post said `gp3` is "the default." AWS documents `gp3` as the latest General Purpose SSD volume type with baseline 3,000 IOPS and 125 MiB/s, while the Ansible `ec2_vol` module still defaults to `standard` for backward compatibility. Changed the wording to call `gp3` a strong default choice.
- The post said `zone` is required without qualification. The `ec2_vol` docs state that `zone` is needed for standalone creation, but if `instance` is set the module can use the instance's availability zone. Updated that explanation.
- The cleanup example claimed to detach and delete volumes, but the original task only used `state: absent`; deleting an attached EBS volume would fail because the volume must be available. Added an explicit detach task before the delete task.

## Review Notes
The examples are technically valid for current Ansible collections after the corrections. For production mount automation, using stable identifiers such as filesystem labels, UUIDs, or AWS NVMe mapping helpers is more robust than hard-coding `/dev/nvme1n1`, because Nitro-based NVMe device enumeration can vary.
