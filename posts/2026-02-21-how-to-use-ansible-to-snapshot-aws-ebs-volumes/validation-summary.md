# Validation Summary: How to Use Ansible to Snapshot AWS EBS Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Amazon AWS collection for Ansible
- Community AWS collection for Ansible
- Amazon EBS snapshots
- Amazon EC2
- AWS IAM permissions
- Cron
- PostgreSQL snapshot preparation
- Linux filesystem freeze

## Sources Consulted
- Ansible `amazon.aws.ec2_snapshot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_snapshot_module.html
- Ansible `amazon.aws.ec2_snapshot_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_snapshot_info_module.html
- Ansible `amazon.aws.ec2_instance_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- Ansible `community.aws.ec2_snapshot_copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/ec2_snapshot_copy_module.html
- AWS EBS snapshot behavior documentation: https://docs.aws.amazon.com/ebs/latest/userguide/how_snapshots_work.html
- AWS EBS snapshot creation documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html
- AWS EBS snapshot copy documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-copy-snapshot.html
- AWS EC2 IAM actions reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS IAM examples for EBS snapshot tagging: https://docs.aws.amazon.com/ebs/latest/userguide/security_iam_id-based-policy-examples.html

## Issues Found
- The prerequisites only installed `amazon.aws`, but the snapshot copy module is currently provided as `community.aws.ec2_snapshot_copy`. I updated the prerequisites and install command to include `community.aws`, and changed the cross-region copy task to use `community.aws.ec2_snapshot_copy`.
- The examples used `ansible_date_time` while `gather_facts: false` was set. I replaced those references with command lookups so the snippets do not depend on gathered facts.
- The IAM permissions list omitted `ec2:DescribeInstances`, which is needed by the instance discovery example, and `ec2:CreateTags`, which is needed when tagging snapshots at creation. I added both permissions.

## Review Notes
- The EBS snapshot explanations are consistent with AWS documentation: snapshots are point-in-time, incremental, stored in Amazon S3-managed storage, and do not include data still cached by applications or the operating system.
- The cleanup example compares ISO-formatted `start_time` values against a UTC cutoff string. That is suitable for the returned timestamp format shown by the Ansible module, but production code could use richer date parsing for portability across non-GNU controller hosts.
