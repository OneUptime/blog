# Validation Summary: How to Build Ansible AWX Workflows

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible
- AWX / Red Hat Ansible Automation Platform automation controller
- awx.awx Ansible collection
- AWX REST API
- Amazon AWS EC2 Ansible modules
- community.docker Ansible collection
- Prometheus Python client
- GitHub Actions

## Sources Consulted
- AWX project README: https://github.com/ansible/awx
- AWX workflow user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/workflows.html
- AWX inventory user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/inventories.html
- AWX API reference guide: https://docs.ansible.com/projects/awx/en/latest/rest_api/api_ref.html
- awx.awx.workflow_job_template module: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/workflow_job_template_module.html
- awx.awx.workflow_job_template_node module: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/workflow_job_template_node_module.html
- awx.awx.inventory_source module: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/inventory_source_module.html
- awx.awx.schedule module: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/schedule_module.html
- awx.awx.notification_template module: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/notification_template_module.html
- ansible.builtin.set_stats module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_stats_module.html
- amazon.aws.ec2_instance module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- amazon.aws.ec2_tag module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_tag_module.html
- community.docker.docker_container module: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- community.docker.docker_image module: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html

## Issues Found
- The AWX description said Ansible Automation Platform was formerly Ansible Tower. Updated it to match AWX's official description as one of the upstream projects for Red Hat Ansible Automation Platform.
- The provisioning playbook used `ansible_date_time.epoch` while `gather_facts: false` was set. Changed it to `gather_facts: true` so the fact exists.
- The notification template messages used unescaped `{{ job... }}` expressions. In an Ansible task that creates an AWX notification template, these must be escaped so AWX renders them at notification time rather than Ansible rendering them during configuration.
- The Prometheus active workflow gauge code said it reset gauges but did not actually clear stale label values. Added `active_workflows.clear()` before setting the current running workflow counts.

## Review Notes
- The AWX collection examples use the current `awx.awx.*` module names rather than deprecated `tower_*` redirects.
- The latest Ansible documentation notes that `awx.awx` has been removed from the bundled Ansible 14 community package, but it remains installable with `ansible-galaxy collection install awx.awx`, which the post's CI example already does.
- The workflow variable passing section correctly uses `ansible.builtin.set_stats` with run-level stats for AWX workflow artifacts.
