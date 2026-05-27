# Validation Summary: How to Use Ansible to Automate Cloud Cost Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- amazon.aws Ansible collection
- azure.azcollection Ansible collection
- AWS EC2, EBS, Elastic IP, and Cost Explorer
- AWS CLI
- Azure Virtual Machines
- AWX / Ansible Tower scheduling

## Sources Consulted
- Ansible amazon.aws.ec2_instance_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- Ansible amazon.aws.ec2_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Ansible amazon.aws.ec2_tag module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_tag_module.html
- Ansible amazon.aws.ec2_vol_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vol_info_module.html
- Ansible amazon.aws.ec2_snapshot_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_snapshot_info_module.html
- Ansible amazon.aws.ec2_eip_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_eip_info_module.html
- Ansible amazon.aws.aws_caller_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_caller_info_module.html
- Ansible azure.azcollection.azure_rm_virtualmachine module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_virtualmachine_module.html
- Ansible azure.azcollection.azure_rm_virtualmachine_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_virtualmachine_info_module.html
- Ansible playbook reuse documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_reuse.html
- AWS CLI get-cost-and-usage command reference: https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- Microsoft Azure VM states and billing documentation: https://learn.microsoft.com/azure/virtual-machines/states-billing
- AWS VPC pricing documentation for public IPv4 address charges: https://aws.amazon.com/vpc/pricing/

## Issues Found
- The tagging enforcement playbook loop overwrote `untagged_instances` for each required tag and only applied default tags when the `team` tag was missing. Changed it to collect running instances missing any required tag and loop over that collected list.
- The unused snapshots example referenced an undefined `aws_account_id` variable. Added `amazon.aws.aws_caller_info` and used its returned account ID with `owner_ids`.
- The old snapshot date comparison used `timedelta(days=90)`, which is not documented as an Ansible Jinja helper. Added a cutoff date fact using a shell date lookup and compared snapshot `start_time` against it.
- The cost report playbook used `ansible_date_time.date` while `gather_facts` was disabled. Enabled fact gathering for that playbook.
- The Azure VM cleanup example compared `item.power_state` to `VM stopped`, but `azure_rm_virtualmachine_info` returns normalized values such as `stopped`. Updated the condition to `stopped`.
- The Azure billing explanation implied deallocation stops all charges. Clarified that deallocation stops compute charges, while disks and associated resources can still incur charges.
- The master playbook used `include_tasks` to include complete playbooks. Replaced the task-level includes with top-level `import_playbook` entries.

## Review Notes
The examples are still intentionally simplified for a blog post. In production, readers should add whitelists, account and region iteration, explicit authentication handling, and provider-specific pricing logic rather than relying on the approximate cost calculations shown.
