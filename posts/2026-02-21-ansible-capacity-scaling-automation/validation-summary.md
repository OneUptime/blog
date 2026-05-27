# Validation Summary: How to Use Ansible for Capacity Scaling Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and task includes
- Ansible built-in modules: `uri`, `stat`, `set_fact`, `copy`, `wait_for`, `add_host`, `pause`
- Amazon AWS Ansible collection: `amazon.aws.ec2_instance`, `amazon.aws.ec2_instance_info`
- Prometheus HTTP API and PromQL
- Slack notifications with `community.general.slack`
- Load balancer backend API automation

## Sources Consulted
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.include_tasks` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible delegation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `ansible.builtin.stat` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible Amazon AWS `ec2_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Ansible Community General `slack` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_module.html
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The `cooldown_minutes` variable was declared and the post stated that cooldown periods should be included, but the metric-driven playbook only checked whether `/tmp/last_scale_event` existed and did not enforce the cooldown. Added an `in_cooldown` fact using `ansible_date_time.epoch` and the `stat.mtime` value, then made the scaling decision return `none` while the cooldown window is active.
- The EC2 launch task used top-level `subnet_id`, which is not the current top-level parameter for `amazon.aws.ec2_instance`. Changed it to `vpc_subnet_id`, matching the AWS collection documentation.
- The `Configure new instances` task included the configuration task file from the localhost play without applying it to each newly added host. Updated the `include_tasks` call to use `apply.delegate_to` and loop over the newly launched instances so the included tasks run against the new hosts.

## Review Notes
- The Prometheus API usage with `POST /api/v1/query` and `form-urlencoded` request bodies is consistent with the official Prometheus HTTP API.
- The Slack notification module usage is valid, assuming `slack_token` is an incoming webhook token or compatible Slack token for the configured channel.
- The load balancer API endpoints are illustrative custom endpoints, so only the Ansible `uri` syntax and request structure were validated.
