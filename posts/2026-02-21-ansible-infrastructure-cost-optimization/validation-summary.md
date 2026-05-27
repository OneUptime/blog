# Validation Summary: How to Use Ansible to Automate Infrastructure Cost Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Ansible amazon.aws collection
- AWS CLI for EC2 EBS volumes and snapshots
- Prometheus HTTP API and PromQL
- Linux cron scheduling
- Shell scripting with curl

## Sources Consulted
- Ansible amazon.aws.ec2_instance module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Ansible amazon.aws.ec2_vol module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vol_module.html
- Ansible amazon.aws.ec2_snapshot module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_snapshot_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Prometheus PromQL querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- AWS CLI describe-volumes command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html
- AWS CLI filtering guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html

## Issues Found
- The low-CPU PromQL expression applied the seven-day subquery range to only part of the arithmetic expression, producing an invalid range-vector/scalar operation. Changed it to compute CPU utilization as an instant vector first, grouped by instance, then apply the `[7d:1h]` subquery inside `avg_over_time`.
- The low-memory PromQL expression placed `[7d:1h]` after the scalar literal `100`, which is invalid PromQL. Changed it so the full memory-utilization expression is evaluated as an instant query and then converted to a seven-day subquery for `avg_over_time`.
- The cleanup task said it deleted unattached volumes older than 30 days, but the audit query returned all available volumes. Changed the audit query to filter `CreateTime` against `retention_cutoff` and updated the task name to match the retention behavior.

## Review Notes
- The AWS module examples use current fully qualified collection names and valid parameters for `amazon.aws.ec2_instance`, `amazon.aws.ec2_vol`, and `amazon.aws.ec2_snapshot`.
- The AWS CLI examples use valid EC2 commands, filters, JMESPath `--query`, and JSON output options. The retention cutoff variables must be supplied in a lexicographically comparable ISO-8601/date format.
- The scheduling estimate of saving 50% or more can be true for non-production instances stopped more than half the week, but actual savings depend on instance schedules, storage charges, reservations, and other fixed costs.
