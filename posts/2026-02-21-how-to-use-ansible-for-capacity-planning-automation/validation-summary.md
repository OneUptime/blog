# Validation Summary: How to Use Ansible for Capacity Planning Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible facts and magic variables
- Ansible built-in modules: `set_fact`, `command`, `copy`, `find`, `slurp`, `debug`, `uri`, `add_host`
- Amazon AWS Ansible collection: `amazon.aws.ec2_instance`
- Prometheus HTTP API and PromQL
- Linux capacity metrics from `/proc/loadavg`, `/proc/sys/fs/file-nr`, `iostat`, `ss`, and `free`
- Mermaid flow diagrams

## Sources Consulted
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- `amazon.aws.ec2_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The alerting example calculated `cpu_pct` as `ansible_processor_count / ansible_processor_vcpus * 100`, which describes CPU topology rather than current CPU pressure. I added a `/proc/loadavg` collection task and changed `cpu_pct` to use the one-minute load average divided by vCPU count, matching the earlier capacity collection example.
- The Prometheus query used `body_format: form-urlencoded` but did not set `method: POST`. The Prometheus HTTP API supports form-urlencoded request bodies with POST, and Ansible `uri` defaults to GET, so I added `method: POST`.
- The EC2 scaling example launched an instance with only a name, instance type, AMI, and state. Current `amazon.aws.ec2_instance` examples commonly include VPC placement and security group settings for launches outside a default VPC, so I added `vpc_subnet_id` and `security_group` variables.

## Review Notes
The YAML snippets parse successfully with PyYAML. `ansible-playbook` is not installed in this workspace, so I could not run an Ansible syntax check locally. The post remains Linux-focused because it relies on `/proc`, `iostat`, `ss`, and `free`.
