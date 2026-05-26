# Validation Summary: How to Configure AWX Instance Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX
- AWX instance groups
- AWX container groups
- AWX REST API
- Ansible execution nodes
- Kubernetes pods

## Sources Consulted
- AWX container and instance groups: https://docs.ansible.com/projects/awx/en/24.6.1/administration/containers_instance_groups.html
- AWX user guide for instance groups: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/instance_groups.html
- AWX managing capacity with instances: https://docs.ansible.com/projects/awx/en/24.6.1/administration/instances.html
- AWX 24.6.1 source for instance group model fields: https://github.com/ansible/awx/blob/24.6.1/awx/main/models/ha.py
- AWX 24.6.1 source for instance group serializer validation: https://github.com/ansible/awx/blob/24.6.1/awx/api/serializers.py
- AWX 24.6.1 source for job instance group preference order: https://github.com/ansible/awx/blob/24.6.1/awx/main/models/jobs.py
- AWX 24.6.1 source for scheduler capacity selection: https://github.com/ansible/awx/blob/24.6.1/awx/main/scheduler/task_manager.py

## Issues Found
- The post said a job template assigned to an instance group only runs on nodes in that group. AWX checks job template, inventory, and organization instance groups in order, with fallback behavior unless configured otherwise, so the routing explanation was corrected.
- The default instance group section described `controlplane` as a group for internal tasks such as project updates and inventory syncs. AWX documents `controlplane` as the API instance group corresponding to control-plane nodes from the `awx` group, so the description was corrected.
- The organization assignment section omitted inventory-level instance groups. AWX documents the hierarchy as job template, inventory, then organization, so the text and diagram were updated.
- The post said AWX picks the group with the most available capacity when multiple groups are assigned. AWX uses the configured preference order and starts the job in the first group with enough capacity, so that wording was corrected.
- The capacity section implied AWX always selects the instance with the most available capacity and that a job queues whenever the target group is full. The wording was softened to match AWX's capacity-based scheduler and documented fallback behavior across eligible groups.
- The container group example sent `pod_spec_override` as a nested JSON object. AWX stores and validates this field as text containing YAML or JSON, so the example was changed to send a YAML string.
- The container group section described Kubernetes scaling as near-infinite. That was changed to on-demand capacity constrained by cluster resources, namespace quotas, and scheduling.
- The monitoring command comment claimed it checked queue length, but the command only printed running jobs and capacity. The comment was corrected.

## Review Notes
The post is technically relevant and current after the fixes. The examples use the AWX REST API directly; production environments should still test payloads against their deployed AWX version because API fields and scheduler behavior can differ across AWX and downstream Automation Controller releases.
