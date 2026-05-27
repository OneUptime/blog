# Validation Summary: How to Use Ansible for Cost Optimization Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- amazon.aws Ansible collection
- community.general Ansible collection
- AWS EC2, EBS volumes, EBS snapshots, Elastic IPs, CloudWatch alarms
- Prometheus HTTP API
- Cron scheduling
- Slack notifications

## Sources Consulted
- Ansible amazon.aws.ec2_vol_info module: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vol_info_module.html
- Ansible amazon.aws.ec2_eip_info module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_eip_info_module.html
- Ansible amazon.aws.ec2_eip module: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_eip_module.html
- Ansible amazon.aws.ec2_snapshot_info module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_snapshot_info_module.html
- Ansible amazon.aws.ec2_instance and ec2_instance_info modules: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html and https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- Ansible amazon.aws.ec2_tag module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_tag_module.html
- Ansible ansible.builtin.to_datetime and strftime filters: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/to_datetime_filter.html and https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/strftime_filter.html
- Ansible now function: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_now.html
- Ansible community.general.slack module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_module.html
- AWS VPC pricing for public IPv4 addresses: https://aws.amazon.com/vpc/pricing/

## Issues Found
- The idle snapshot example used invalid Ansible/Jinja date arithmetic with `to_datetime - 'P90D'`. Replaced it with an epoch-based UTC cutoff generated with the documented `strftime` filter.
- The cleanup playbook referenced `unattached_volumes`, `unused_eips`, and `dev_instances_running` without defining them in the standalone example. Added discovery tasks for unattached EBS volumes, unattached Elastic IPs, and running development instances before the cleanup tasks.
- The cleanup playbook used the same invalid ISO-duration date arithmetic for the 30-day EBS volume cutoff. Replaced it with an epoch-based UTC cutoff.
- The right-sizing example compared Prometheus CPU values as strings via `selectattr('value.1', 'lt', '20')`, which can produce incorrect results. Changed it to build the oversized list with a numeric `float` comparison.
- The CloudWatch task was named as though it retrieved CPU metrics, but `amazon.aws.cloudwatch_metric_alarm_info` retrieves alarm data. Renamed the task to accurately describe the module behavior.
- The tag enforcement example defined three required tags but only checked for `Environment`. Updated the logic to flag running instances missing any required tag.
- The unused Elastic IP report said the total monthly estimate was "per month each." Corrected the wording and kept the estimate framed as an idle IP cost estimate.

## Review Notes
- I could not run `ansible-playbook --syntax-check` because Ansible is not installed in this workspace. I did verify the edited YAML fences parse successfully with PyYAML.
- The monthly cost estimates are intentionally rough examples. AWS public IPv4 pricing is currently hourly and can vary by region or pricing updates, so production automation should pull pricing from AWS pricing data or a maintained FinOps source.
